import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw, 
  Download, RefreshCw, Sparkles, FileSearch 
} from 'lucide-react';

export default function DocumentViewer({ session, isUploading, onFileUpload, onReset, onLoadSample }) {
  const [zoom, setZoom] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // If no document is currently loaded
  if (!session) {
    return (
      <div className="viewer-panel">
        <div className="dropzone-container" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          <div className={`dropzone ${isDragOver ? 'drag-active' : ''}`} onClick={() => fileInputRef.current?.click()}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
            />
            <div className="dropzone-icon">
              {isUploading ? <RefreshCw className="pulse" size={32} /> : <Upload size={32} />}
            </div>
            <div>
              <h3 className="dropzone-title">
                {isUploading ? 'Analyzing Document with AI...' : 'Drag & Drop PDF or Image'}
              </h3>
              <p className="dropzone-desc">
                {isUploading 
                  ? 'Extracting visual layout, text, tables, and insights...' 
                  : 'or click to browse from your computer'}
              </p>
            </div>
            <div className="supported-chips">
              <span className="supported-chip">PDF</span>
              <span className="supported-chip">PNG</span>
              <span className="supported-chip">JPG</span>
              <span className="supported-chip">WEBP</span>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Want to test immediately?</span>
            <button className="btn btn-secondary btn-sm" onClick={onLoadSample} disabled={isUploading}>
              <Sparkles size={14} color="var(--primary)" /> Load Sample Document
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPdf = session.mime_type?.includes('pdf');
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const fileUrl = session.local_url || (apiBase ? `${apiBase}/api/file/${session.session_id}` : `/api/file/${session.session_id}`);

  return (
    <div className="viewer-panel">
      <div className="viewer-header">
        <div className="file-info" title={session.filename}>
          {isPdf ? <FileText size={16} color="var(--accent-rose)" /> : <ImageIcon size={16} color="var(--secondary)" />}
          <strong>{session.filename}</strong>
          <span>({formatBytes(session.size_bytes)})</span>
        </div>

        <div className="viewer-controls">
          {!isPdf && (
            <>
              <button className="btn-icon-only btn-sm" onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))} title="Zoom In">
                <ZoomIn size={14} />
              </button>
              <button className="btn-icon-only btn-sm" onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))} title="Zoom Out">
                <ZoomOut size={14} />
              </button>
              <button className="btn-icon-only btn-sm" onClick={() => setZoom(1)} title="Reset Zoom">
                <RotateCcw size={14} />
              </button>
            </>
          )}

          <a href={fileUrl} download={session.filename} className="btn-icon-only btn-sm" title="Download Original">
            <Download size={14} />
          </a>

          <button className="btn btn-secondary btn-sm" onClick={onReset} title="Upload New File">
            <Upload size={14} /> New File
          </button>
        </div>
      </div>

      <div className="viewer-content">
        {isPdf ? (
          <iframe 
            src={fileUrl} 
            title={session.filename}
          />
        ) : (
          <div className="image-preview-wrapper" style={{ transform: `scale(${zoom})` }}>
            <img 
              src={fileUrl} 
              alt={session.filename} 
              className="image-preview" 
            />
          </div>
        )}
      </div>
    </div>
  );
}
