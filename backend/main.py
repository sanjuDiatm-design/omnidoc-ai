import os
import uuid
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Header, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel

from gemini_service import (
    analyze_document,
    chat_with_document,
    extract_structured_data,
    get_api_key,
    get_client,
    PREFERRED_MODELS
)

app = FastAPI(title="OmniDoc AI - Multimodal Document & Image Studio", version="1.0.0")

# Enable CORS for React frontend (Vite default is 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory document storage for sessions
SESSION_STORE: Dict[str, Dict[str, Any]] = {}

class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: Optional[List[Dict[str, str]]] = []

class ExtractRequest(BaseModel):
    session_id: str

class VerifyKeyRequest(BaseModel):
    api_key: str

@app.get("/api/health")
async def health_check():
    """Health check endpoint and check if default API key is set."""
    env_key = get_api_key()
    return {
        "status": "healthy",
        "has_server_api_key": bool(env_key and len(env_key) > 5),
        "supported_formats": ["PDF", "PNG", "JPEG", "WEBP", "GIF"]
    }

@app.post("/api/verify-key")
async def verify_key(payload: VerifyKeyRequest):
    """Test if a user-supplied Gemini API key works."""
    key = payload.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API key is empty")
    try:
        client = get_client(key)
        # Test a minimal prompt with gemini-2.5-flash or gemini-2.0-flash
        res = None
        for model in PREFERRED_MODELS:
            try:
                res = client.models.generate_content(
                    model=model,
                    contents="Reply with 'OK'"
                )
                if res and res.text:
                    return {"valid": True, "model": model, "message": "API key verified successfully!"}
            except Exception:
                continue
        return {"valid": False, "message": "Key failed to authenticate with Gemini models."}
    except Exception as e:
        return {"valid": False, "message": str(e)}

@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    x_gemini_api_key: Optional[str] = Header(None)
):
    """Accepts PDF or Image upload and triggers initial AI analysis."""
    filename = file.filename or "uploaded_file"
    content_type = file.content_type or ""

    # Supported MIME types
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]
    if content_type not in allowed_types:
        # Fallback check on file extension
        ext = filename.split(".")[-1].lower()
        if ext == "pdf":
            content_type = "application/pdf"
        elif ext in ["jpg", "jpeg"]:
            content_type = "image/jpeg"
        elif ext == "png":
            content_type = "image/png"
        elif ext == "webp":
            content_type = "image/webp"
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{content_type}'. Please upload a PDF, PNG, JPG, or WEBP file."
            )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    session_id = str(uuid.uuid4())
    
    # Run analysis with safety fallback
    try:
        analysis_result = await analyze_document(
            file_bytes=content,
            mime_type=content_type,
            filename=filename,
            api_key=x_gemini_api_key
        )
    except Exception as e:
        from gemini_service import get_demo_analysis
        analysis_result = get_demo_analysis(filename, content_type)
        analysis_result["warning"] = f"Analysis error: {str(e)}"

    # Store in session
    SESSION_STORE[session_id] = {
        "bytes": content,
        "mime_type": content_type,
        "filename": filename,
        "size": len(content),
        "analysis": analysis_result
    }

    return {
        "session_id": session_id,
        "filename": filename,
        "mime_type": content_type,
        "size_bytes": len(content),
        "analysis": analysis_result
    }

@app.get("/api/file/{session_id}")
async def get_file_content(session_id: str):
    """Serves the uploaded file for in-browser PDF or Image display."""
    doc = SESSION_STORE.get(session_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found or file expired.")
    
    return Response(
        content=doc["bytes"],
        media_type=doc["mime_type"],
        headers={"Content-Disposition": f"inline; filename=\"{doc['filename']}\""}
    )

@app.post("/api/chat")
async def chat_endpoint(
    req: ChatRequest,
    x_gemini_api_key: Optional[str] = Header(None)
):
    """Conversational endpoint referencing the document visually."""
    doc = SESSION_STORE.get(req.session_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document session not found. Please re-upload.")

    reply = await chat_with_document(
        file_bytes=doc["bytes"],
        mime_type=doc["mime_type"],
        message=req.message,
        history=req.history or [],
        api_key=x_gemini_api_key
    )

    return {"reply": reply}

@app.post("/api/extract")
async def extract_endpoint(
    req: ExtractRequest,
    x_gemini_api_key: Optional[str] = Header(None)
):
    """Extract structured tables and data from the document."""
    doc = SESSION_STORE.get(req.session_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document session not found. Please re-upload.")

    data = await extract_structured_data(
        file_bytes=doc["bytes"],
        mime_type=doc["mime_type"],
        api_key=x_gemini_api_key
    )

    return data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
