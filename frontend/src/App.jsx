import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText, Sparkles, MessageSquare, Table, Code,
  Check, AlertCircle, FilePlus2, ScanSearch, Zap
} from 'lucide-react';
import DocumentViewer from './components/DocumentViewer';
import OverviewTab from './components/OverviewTab';
import ChatTab from './components/ChatTab';
import ExtractTab from './components/ExtractTab';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Sparkles },
  { id: 'chat', label: 'Chat Q&A', icon: MessageSquare },
  { id: 'extract', label: 'Extracted Data', icon: Table },
  { id: 'json', label: 'Raw JSON', icon: Code },
];

// Parse an error body safely (backend may return HTML/plain text, e.g. a proxy 502)
const readError = async (res, fallback) => {
  try {
    const data = await res.json();
    return data.detail || fallback;
  } catch {
    return `${fallback} (HTTP ${res.status})`;
  }
};

export default function App() {
  // Document & session state
  const [session, setSession] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Chat & extraction state
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  const apiFetch = async (path, options = {}) => {
    const url = API_BASE ? `${API_BASE}${path}` : path;
    try {
      return await fetch(url, options);
    } catch (err) {
      if (!API_BASE) {
        return await fetch(`http://127.0.0.1:8000${path}`, options);
      }
      throw err;
    }
  };

  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const resetSession = () => {
    setSession(null);
    setChatMessages([]);
    setExtractedData(null);
    setActiveTab('overview');
  };

  // Upload file to backend
  const handleFileUpload = async (file) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to upload document'));
      }

      const data = await response.json();
      setSession(data);
      setExtractedData(null);
      setChatMessages([]);
      setActiveTab('overview');
      showToast('Document analyzed successfully!');
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Chat with document
  const handleSendMessage = async (userMessage) => {
    if (!session) return;

    const newMessages = [...chatMessages, { role: 'user', content: userMessage }];
    setChatMessages(newMessages);
    setIsTyping(true);

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.session_id,
          message: userMessage,
          history: chatMessages,
        }),
      });

      if (!res.ok) {
        throw new Error(await readError(res, 'Chat request failed'));
      }

      const data = await res.json();
      setChatMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setChatMessages([
        ...newMessages,
        { role: 'assistant', content: `❌ Error: ${err.message}` },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Extract structured tables & data
  const handleExtractData = async () => {
    if (!session) return;
    setIsExtracting(true);

    try {
      const res = await apiFetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.session_id }),
      });

      if (!res.ok) {
        throw new Error(await readError(res, 'Extraction failed'));
      }

      const data = await res.json();
      setExtractedData(data);
      showToast('Structured data extracted!');
    } catch (err) {
      showToast(err.message || 'Extraction failed', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleTabClick = (id) => {
    setActiveTab(id);
    if (id === 'extract' && !extractedData && session && !isExtracting) {
      handleExtractData();
    }
  };

  const handleSelectQuestion = (question) => {
    setActiveTab('chat');
    handleSendMessage(question);
  };

  const handleCopyText = async (text, successMsg) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMsg || 'Copied to clipboard!');
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  // Generate a sample document canvas and upload it
  const handleLoadSample = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header bar
    ctx.fillStyle = '#4f46e5';
    ctx.fillRect(0, 0, canvas.width, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('INVOICE & SERVICE STATEMENT', 40, 60);

    ctx.fillStyle = '#1e293b';
    ctx.font = '16px sans-serif';
    ctx.fillText('Invoice #: INV-2026-9842', 40, 150);
    ctx.fillText('Date: October 25, 2026', 40, 180);
    ctx.fillText('Billed To: Acme Global Tech Corp', 40, 210);

    // Table header
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(40, 260, 720, 40);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Item Description', 60, 286);
    ctx.fillText('Hours / Qty', 380, 286);
    ctx.fillText('Rate', 530, 286);
    ctx.fillText('Subtotal', 670, 286);

    // Rows
    const items = [
      ['Multimodal AI Vision Integration', '40 hrs', '$120.00', '$4,800.00'],
      ['PDF Layout Parser & OCR Pipeline', '25 hrs', '$110.00', '$2,750.00'],
      ['React High-Performance UI Workspace', '30 hrs', '$105.00', '$3,150.00'],
      ['Cloud Deployment & API Architecture', '15 hrs', '$130.00', '$1,950.00'],
    ];

    ctx.font = '14px sans-serif';
    items.forEach((item, idx) => {
      const y = 340 + idx * 45;
      ctx.fillStyle = '#475569';
      ctx.fillText(item[0], 60, y);
      ctx.fillText(item[1], 400, y);
      ctx.fillText(item[2], 530, y);
      ctx.fillText(item[3], 670, y);

      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(40, y + 15);
      ctx.lineTo(760, y + 15);
      ctx.stroke();
    });

    // Total box
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(460, 560, 300, 120);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(460, 560, 300, 120);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Total Amount Due:', 480, 610);
    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('$12,650.00 USD', 480, 650);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'sample_tech_invoice.png', { type: 'image/png' });
        handleFileUpload(file);
      }
    }, 'image/png');
  };

  return (
    <div className="app-container">
      {/* Navbar */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={18} color="#fff" />
          </div>
          <span className="brand-title">OmniDoc AI</span>
          <span className="brand-badge">Multimodal</span>
        </div>

        <div className="nav-actions">
          {isUploading && (
            <span className="file-info">
              <span className="spinner" /> Analyzing…
            </span>
          )}
          {session && (
            <button className="btn btn-outline btn-sm" onClick={resetSession}>
              <FilePlus2 size={14} /> New document
            </button>
          )}
        </div>
      </header>

      {/* Main split workspace */}
      <main className="workspace-split">
        {/* Left: PDF / image viewer */}
        <DocumentViewer
          session={session}
          isUploading={isUploading}
          onFileUpload={handleFileUpload}
          onReset={resetSession}
          onLoadSample={handleLoadSample}
        />

        {/* Right: AI studio */}
        <section className="studio-panel">
          <div className="studio-tabs" role="tablist" aria-label="AI Studio">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                className={`tab-btn ${activeTab === id ? 'active' : ''}`}
                onClick={() => handleTabClick(id)}
                disabled={!session}
              >
                <Icon size={14} /> {label}
                {id === 'chat' && chatMessages.length > 0 && (
                  <span className="tab-badge">{chatMessages.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="studio-body" key={`${session ? 'doc' : 'empty'}-${activeTab}`}>
            {!session ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <FileText size={34} />
                </div>
                <h3>AI Studio is ready</h3>
                <p>
                  Upload a PDF or image on the left to get an instant summary,
                  chat with your document, and pull out structured tables.
                </p>
                <div className="empty-features">
                  <span className="empty-feature"><Zap size={12} /> Instant summary</span>
                  <span className="empty-feature"><MessageSquare size={12} /> Visual Q&amp;A</span>
                  <span className="empty-feature"><ScanSearch size={12} /> Table extraction</span>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <OverviewTab
                    analysis={session.analysis}
                    onSelectQuestion={handleSelectQuestion}
                    onCopyText={handleCopyText}
                  />
                )}

                {activeTab === 'chat' && (
                  <ChatTab
                    messages={chatMessages}
                    isTyping={isTyping}
                    onSendMessage={handleSendMessage}
                  />
                )}

                {activeTab === 'extract' && (
                  <ExtractTab
                    extractedData={extractedData}
                    isExtracting={isExtracting}
                    onExtract={handleExtractData}
                    onCopyText={handleCopyText}
                  />
                )}

                {activeTab === 'json' && (
                  <div className="glass-card">
                    <div className="card-header">
                      <div className="card-title">
                        <Code size={16} color="var(--primary)" />
                        <span>Document Session Metadata</span>
                      </div>
                      <button
                        className="btn-icon-only"
                        onClick={() => handleCopyText(JSON.stringify(session, null, 2), 'JSON copied!')}
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="json-view">{JSON.stringify(session, null, 2)}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`} role="status" aria-live="polite">
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
