import React, { useState } from 'react';
import { Key, ExternalLink, CheckCircle, AlertCircle, X, Sparkles } from 'lucide-react';

export default function ApiKeyModal({ isOpen, onClose, currentKey, onSaveKey }) {
  const [keyInput, setKeyInput] = useState(currentKey || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!keyInput.trim()) {
      setTestResult({ valid: false, message: 'Please enter a key to test.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const endpoint = apiBase ? `${apiBase}/api/verify-key` : '/api/verify-key';
      let res;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: keyInput.trim() })
        });
      } catch (err) {
        if (!apiBase) {
          res = await fetch('http://127.0.0.1:8000/api/verify-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: keyInput.trim() })
          });
        } else {
          throw err;
        }
      }
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ valid: false, message: 'Failed to connect to verification endpoint.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveKey(keyInput.trim());
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="card-title">
            <Key size={20} color="var(--primary)" />
            <span>Google Gemini Free API Key</span>
          </div>
          <button className="btn-icon-only btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p>
            OmniDoc AI uses Google Gemini Flash models to provide instant, multimodal visual understanding for PDFs and images for <strong>100% free</strong>.
          </p>

          <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-accent)' }}>
                Don't have a free key yet?
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: 'none' }}
              >
                Get Key Free <ExternalLink size={13} />
              </a>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              No credit card required. Free tier includes up to 15 requests per minute and 1M tokens/min.
            </p>
          </div>

          <div className="api-input-group">
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Enter Gemini API Key:
            </label>
            <input
              type="password"
              className="api-input"
              placeholder="AIzaSy..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
          </div>

          {testResult && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              background: testResult.valid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              color: testResult.valid ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              border: `1px solid ${testResult.valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
            }}>
              {testResult.valid ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="modal-actions">
            <button className="btn btn-outline" onClick={handleTest} disabled={testing || !keyInput}>
              {testing ? 'Verifying...' : 'Test Key'}
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
