# ⚡ OmniDoc AI — Multimodal Document & Image Studio

A full-stack intelligence workspace powered by **Google Gemini Multimodal Flash Models** (using a **100% Free API Key**). Drag & drop any **PDF document** or **Image** to extract insights, chat visually, and export tables to CSV or JSON.

---

## 🌟 Features

- **Split-Screen Workspace**:
  - **Left Panel**: In-browser document & image viewer with interactive zoom, pan, and file reset controls.
  - **Right Panel**: Tabbed AI studio featuring Overview & Summary, Visual Chat Q&A, and Extracted Tables.
- **Multimodal Visual Understanding**:
  - Direct PDF parsing (no local OCR installation or Tesseract required).
  - Understands charts, infographics, diagrams, handwritten receipts, and multi-page tables.
- **Visual Q&A (Chat with your Document)**:
  - Ask targeted questions like *"What does the graph on page 2 show?"* or *"Summarize the payment terms"*.
- **Structured Table Extractor & CSV Export**:
  - Extracts visual tables and line items into interactive web tables with a 1-click **Export to CSV** button.
- **In-App API Key Manager**:
  - Configure and verify your free Gemini API key right in the UI (or via `backend/.env`).

---

## 🔑 Getting Your Free API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API Key** (completely free, no credit card required).
3. Either:
   - Paste it into the **API Key** button in the app's top bar, OR
   - Add it to `backend/.env`:
     ```env
     GEMINI_API_KEY=your_key_here
     ```

---

## 🚀 Running the Project

### 1. Start Backend (FastAPI)
```powershell
cd backend
.\.venv\Scripts\uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
API docs available at: `http://127.0.0.1:8000/docs`

### 2. Start Frontend (React + Vite)
```powershell
cd frontend
npm run dev
```
Open your browser at: `http://localhost:5173/`

---

## 🛠️ Tech Stack

- **Backend**: Python 3.11, FastAPI, `google-genai` SDK, Uvicorn, Pydantic
- **Frontend**: React 19, Vite, Lucide Icons, Vanilla CSS Design System
- **AI Model**: `gemini-2.5-flash` / `gemini-2.0-flash`
