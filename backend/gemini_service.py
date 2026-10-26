import os
import json
import logging
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=ENV_PATH)

logger = logging.getLogger("omni-doc")

def get_api_key(custom_key: Optional[str] = None) -> Optional[str]:
    """Retrieve API key from request header or environment variable."""
    if custom_key and custom_key.strip():
        return custom_key.strip()
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    load_dotenv(override=True)
    env_key = os.getenv("GEMINI_API_KEY")
    if env_key and env_key.strip():
        return env_key.strip()
    return None

def get_client(api_key: str):
    """Instantiate Google GenAI client."""
    from google import genai
    from google.genai import types
    return genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=25000))

# Active Gemini Flash models prioritized for responsiveness
PREFERRED_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest"
]

async def analyze_document(file_bytes: bytes, mime_type: str, filename: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """Perform initial visual and semantic analysis on an image or PDF."""
    key = get_api_key(api_key)
    if not key:
        return get_demo_analysis(filename, mime_type)

    try:
        from google.genai import types
        client = get_client(key)
        
        file_part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
        
        prompt = """
        You are an expert AI document and image analyst. Analyze the attached document or image thoroughly.
        Return ONLY valid JSON with this exact schema (no markdown, no backticks):
        {
          "document_type": "string describing type (e.g. Invoice, Research Paper, Flowchart, Medical Report, Receipt, Diagram, Photo)",
          "summary": "2-3 comprehensive sentences summarizing the core content, purpose, and key takeaways.",
          "key_points": [
            "Bullet point highlighting critical finding or data point",
            "Bullet point 2",
            "Bullet point 3",
            "Bullet point 4"
          ],
          "suggested_questions": [
            "Insightful question a user might want to ask about this document?",
            "Question 2?",
            "Question 3?"
          ],
          "tags": ["tag1", "tag2", "tag3"]
        }
        """

        response = None
        last_error = None
        for model in PREFERRED_MODELS:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=[file_part, prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                if response and response.text:
                    break
            except Exception as e:
                last_error = e
                logger.warning(f"Failed with model {model}: {e}")
                continue

        if not response or not response.text:
            raise last_error or Exception("No response generated from Gemini")

        # Parse JSON
        text = response.text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        data = json.loads(text)
        data["is_demo"] = False
        return data

    except Exception as e:
        logger.error(f"Error analyzing document: {e}")
        demo = get_demo_analysis(filename, mime_type)
        demo["warning"] = f"Gemini API error ({str(e)}). Falling back to sample analysis. Please verify your free API key."
        return demo

async def chat_with_document(
    file_bytes: bytes,
    mime_type: str,
    message: str,
    history: List[Dict[str, str]],
    api_key: Optional[str] = None
) -> str:
    """Chat about the uploaded document/image with visual context."""
    key = get_api_key(api_key)
    if not key:
        return (
            "⚠️ **API Key Missing**: Please set your free `GEMINI_API_KEY` in the top-right Settings menu or in `backend/.env`. "
            "You can get one for free in 30 seconds at [Google AI Studio](https://aistudio.google.com/).\n\n"
            f"*Echoing your question:* \"{message}\""
        )

    try:
        from google.genai import types
        client = get_client(key)
        
        file_part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
        
        # Build prompt with history
        history_context = ""
        if history:
            history_context = "Conversation history:\n"
            for turn in history[-6:]:  # Keep recent context
                role = "User" if turn.get("role") == "user" else "Assistant"
                history_context += f"{role}: {turn.get('content', '')}\n"
            history_context += "\n"

        prompt = f"""
        You are an intelligent multimodal document and image intelligence assistant.
        The user has asked a question about the attached file.
        
        {history_context}
        User's question: {message}

        BREVITY & STRUCTURAL RULES (MANDATORY):
        1. **Be Extremely Concise**: Keep output brief, high-density, and direct (< 150 words). Avoid conversational filler.
        2. **Structured Format**: Use a compact Markdown Table or short bullet points.
        3. **Key Highlights**: Highlight key metrics or numbers in **bold**.
        4. If not present in the document, state: "Not mentioned in document."
        """

        response = None
        last_error = None
        for model in PREFERRED_MODELS:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=[file_part, prompt],
                    config=types.GenerateContentConfig(
                        max_output_tokens=500
                    )
                )
                if response and response.text:
                    break
            except Exception as e:
                last_error = e
                continue

        if not response or not response.text:
            raise last_error or Exception("No response generated")

        return response.text

    except Exception as e:
        logger.error(f"Error during chat: {e}")
        return f"❌ Error communicating with Gemini API: {str(e)}\n\nPlease ensure your API key is valid and has access to Gemini Flash models."

async def extract_structured_data(
    file_bytes: bytes,
    mime_type: str,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Extract tables, line items, and key-value pairs from document/image."""
    key = get_api_key(api_key)
    if not key:
        return {
            "tables": [
                {
                    "title": "Sample Extracted Table (Demo)",
                    "headers": ["Item / Description", "Category", "Quantity", "Unit Price", "Total"],
                    "rows": [
                        ["Cloud Hosting - Free Tier", "Infrastructure", "1", "$0.00", "$0.00"],
                        ["Gemini Multimodal Flash API", "AI Services", "1", "$0.00", "$0.00"],
                        ["Vite + React UI Bundle", "Frontend", "1", "$0.00", "$0.00"],
                        ["FastAPI Async Server", "Backend", "1", "$0.00", "$0.00"]
                    ]
                }
            ],
            "key_values": {
                "Document Status": "Demo Mode (Add your Gemini API key in settings)",
                "Extracted Date": "2026-10-25",
                "Total Items": "4",
                "Currency": "USD"
            },
            "is_demo": True
        }

    try:
        from google.genai import types
        client = get_client(key)
        
        file_part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
        
        prompt = """
        Scan the attached document or image for any tables, lists, invoices, receipt items, or structured key-value data.
        Return ONLY valid JSON matching this schema:
        {
          "tables": [
            {
              "title": "Descriptive title for this table or section",
              "headers": ["Column 1", "Column 2", "..."],
              "rows": [
                ["Row 1 Col 1", "Row 1 Col 2", "..."],
                ["Row 2 Col 1", "Row 2 Col 2", "..."]
              ]
            }
          ],
          "key_values": {
            "Key 1": "Value 1",
            "Key 2": "Value 2"
          }
        }
        If no explicit table exists, extract key structured entities (dates, names, metrics, monetary amounts) into key_values and create a summary table.
        """

        response = None
        last_error = None
        for model in PREFERRED_MODELS:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=[file_part, prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                if response and response.text:
                    break
            except Exception as e:
                last_error = e
                continue

        if not response or not response.text:
            raise last_error or Exception("Extraction failed")

        text = response.text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        data = json.loads(text)
        data["is_demo"] = False
        return data

    except Exception as e:
        logger.error(f"Error extracting data: {e}")
        return {
            "error": str(e),
            "tables": [],
            "key_values": {}
        }

def get_demo_analysis(filename: str, mime_type: str) -> Dict[str, Any]:
    """Generates informative demo analysis when API key is not configured."""
    is_pdf = "pdf" in mime_type.lower()
    return {
        "document_type": "PDF Document" if is_pdf else "Visual Image",
        "summary": f"Uploaded '{filename}'. OmniDoc AI is ready to inspect, summarize, and answer questions. To enable real-time Gemini AI vision processing, enter your free API key in the top bar.",
        "key_points": [
            f"Successfully processed file: {filename}",
            f"Detected MIME Type: {mime_type}",
            "Visual preview rendered on the left split-panel",
            "Full Q&A chat and table extraction ready upon API key configuration"
        ],
        "suggested_questions": [
            "What are the main points in this document?",
            "Can you explain any charts or diagrams shown?",
            "Extract all numbers and dates from this file."
        ],
        "tags": ["Preview Mode", "OmniDoc", "Multimodal"],
        "is_demo": True
    }
