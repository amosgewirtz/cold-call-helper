import { useState } from 'react';

export default function VersionHistory({ versions, setVersions, restoreVersion, onClose }) {
  const [previewIdx, setPreviewIdx] = useState(null);
  const [previewNodeId, setPreviewNodeId] = useState('choose_opener');

  const handleRestore = (version, idx) => {
    if (!confirm('Restore this version? This will replace the current script tree.')) return;
    restoreVersion(version);
    onClose();
  };

  const handleDelete = (idx) => {
    if (!confirm('Delete this version?')) return;
    setVersions(prev => prev.filter((_, i) => i !== idx));
  };

  const previewTree = previewIdx !== null ? versions[previewIdx]?.tree : null;
  const previewNode = previewTree ? previewTree[previewNodeId] : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content version-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Version History</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {previewIdx !== null ? (
          <div className="version-preview">
            <div className="preview-bar">
              <span>Previewing version from {new Date(versions[previewIdx].timestamp).toLocaleString()}</span>
              <button onClick={() => { setPreviewIdx(null); setPreviewNodeId('choose_opener'); }}>Back to list</button>
            </div>
            <div className="preview-nodes">
              <div className="edit-node-list">
                {Object.keys(previewTree).map(id => (
                  <button
                    key={id}
                    className={`edit-node-item ${id === previewNodeId ? 'edit-node-active' : ''}`}
                    onClick={() => setPreviewNodeId(id)}
                  >
                    {previewTree[id].label}
                  </button>
                ))}
              </div>
              <div className="script-card" style={{ marginTop: '1rem' }}>
                <p className="script-text">{previewNode?.scriptText}</p>
              </div>
              {previewNode?.options?.map((opt, i) => (
                <div key={i} className="edit-option-row" style={{ marginTop: '0.5rem' }}>
                  <span className="option-arrow">→</span> {opt.buttonLabel}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="version-list">
            {(!versions || versions.length === 0) ? (
              <p className="stats-empty">No versions saved yet.</p>
            ) : (
              versions.map((v, i) => (
                <div key={i} className="version-item">
                  <div className="version-info">
                    <span className="version-date">
                      {new Date(v.timestamp).toLocaleString()}
                    </span>
                    {v.label && <span className="version-label">{v.label}</span>}
                  </div>
                  <div className="version-actions">
                    <button className="version-btn" onClick={() => { setPreviewIdx(i); setPreviewNodeId('choose_opener'); }}>Preview</button>
                    <button className="version-btn version-restore" onClick={() => handleRestore(v, i)}>Restore</button>
                    {i > 0 && <button className="version-btn version-delete" onClick={() => handleDelete(i)}>Delete</button>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
