import React from 'react';
import { Sparkles, CheckCircle2, HelpCircle, Copy, AlertTriangle, Layers, Tag } from 'lucide-react';

export default function OverviewTab({ analysis, onSelectQuestion, onCopyText }) {
  if (!analysis) {
    return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>No analysis available.</div>;
  }

  const { document_type, summary, key_points, suggested_questions, tags, warning, is_demo } = analysis;

  return (
    <div className="overview-grid">
      {/* Warning / Demo notification if applicable */}
      {warning && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.84rem',
          color: 'var(--accent-amber)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={18} flexShrink={0} />
          <span>{warning}</span>
        </div>
      )}

      {/* Document Type & Tags */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Classified Type:</span>
          <span className="brand-badge" style={{ fontSize: '0.78rem', background: 'rgba(99, 102, 241, 0.2)', color: '#fff', borderColor: 'var(--primary)' }}>
            <Layers size={12} style={{ display: 'inline', marginRight: '4px' }} />
            {document_type || 'General Document'}
          </span>
        </div>

        {tags && tags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {tags.map((tag, i) => (
              <span key={i} className="supported-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={10} /> {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Executive Summary Card */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <Sparkles size={18} color="var(--primary)" />
            <span>Executive Summary</span>
          </div>
          <button 
            className="btn-icon-only btn-sm" 
            onClick={() => onCopyText(summary, 'Executive summary copied!')}
            title="Copy Summary"
          >
            <Copy size={14} />
          </button>
        </div>
        <p className="summary-text">{summary || 'No summary generated.'}</p>
      </div>

      {/* Key Findings Card */}
      {key_points && key_points.length > 0 && (
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <CheckCircle2 size={18} color="var(--accent-emerald)" />
              <span>Key Insights & Data Points</span>
            </div>
            <button 
              className="btn-icon-only btn-sm" 
              onClick={() => onCopyText(key_points.join('\n• '), 'Key points copied!')}
              title="Copy All Points"
            >
              <Copy size={14} />
            </button>
          </div>
          <div className="key-points-list">
            {key_points.map((pt, idx) => (
              <div key={idx} className="key-point-item">
                <span>{pt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Questions */}
      {suggested_questions && suggested_questions.length > 0 && (
        <div className="glass-card">
          <div className="card-header">
            <div className="card-title">
              <HelpCircle size={18} color="var(--secondary)" />
              <span>Suggested Follow-up Questions</span>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Click any question to instantly ask the AI assistant:
          </p>
          <div className="suggested-chips">
            {suggested_questions.map((q, idx) => (
              <button key={idx} className="suggested-chip" onClick={() => onSelectQuestion(q)}>
                💬 {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
