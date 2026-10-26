import React from 'react';
import { Table, Download, Copy, RefreshCw, KeyRound, Sparkles } from 'lucide-react';

export default function ExtractTab({ extractedData, isExtracting, onExtract, onCopyText }) {
  const downloadCSV = (table) => {
    if (!table || !table.headers || !table.rows) return;
    const headerLine = table.headers.map(h => `"${(h || '').replace(/"/g, '""')}"`).join(',');
    const rowLines = table.rows.map(row => 
      row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headerLine, ...rowLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(table.title || 'extracted_table').toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Structured Data Extraction</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Automatically parse tables, line items, and key-value fields from the visual document.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onExtract} disabled={isExtracting}>
          <RefreshCw size={14} className={isExtracting ? 'pulse' : ''} />
          {isExtracting ? 'Extracting...' : 'Re-extract Data'}
        </button>
      </div>

      {isExtracting && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Sparkles size={32} color="var(--primary)" className="pulse" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.9rem' }}>Gemini is scanning document visuals for tables and structures...</p>
        </div>
      )}

      {!isExtracting && (!extractedData || (extractedData.tables?.length === 0 && Object.keys(extractedData.key_values || {}).length === 0)) && (
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '12px' }}>
          <Table size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: '14px' }}>
            No extracted tables yet. Click below to extract structured data from this document.
          </p>
          <button className="btn btn-primary btn-sm" onClick={onExtract}>
            <Sparkles size={14} /> Extract Tables & Key-Values
          </button>
        </div>
      )}

      {!isExtracting && extractedData && (
        <>
          {/* Key-Value Entities */}
          {extractedData.key_values && Object.keys(extractedData.key_values).length > 0 && (
            <div className="glass-card">
              <div className="card-header">
                <div className="card-title">
                  <KeyRound size={17} color="var(--secondary)" />
                  <span>Key Entities & Metrics</span>
                </div>
                <button
                  className="btn-icon-only btn-sm"
                  onClick={() => onCopyText(JSON.stringify(extractedData.key_values, null, 2), 'Key-values copied!')}
                  title="Copy Key Values"
                >
                  <Copy size={13} />
                </button>
              </div>
              <div className="key-value-grid">
                {Object.entries(extractedData.key_values).map(([k, v], idx) => (
                  <div key={idx} className="kv-item">
                    <div className="kv-key">{k}</div>
                    <div className="kv-val">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tables */}
          {extractedData.tables && extractedData.tables.map((table, tIndex) => (
            <div key={tIndex} className="glass-card table-card">
              <div className="card-header">
                <div className="card-title">
                  <Table size={17} color="var(--primary)" />
                  <span>{table.title || `Extracted Table ${tIndex + 1}`}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => downloadCSV(table)}
                    title="Download as CSV"
                  >
                    <Download size={13} /> Export CSV
                  </button>
                  <button
                    className="btn-icon-only btn-sm"
                    onClick={() => onCopyText(JSON.stringify(table, null, 2), 'Table JSON copied!')}
                    title="Copy Table JSON"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="extracted-table">
                  <thead>
                    <tr>
                      {table.headers && table.headers.map((h, hIdx) => (
                        <th key={hIdx}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows && table.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
