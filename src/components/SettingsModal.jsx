import { useState } from 'react';

export default function SettingsModal({ apiKey, setApiKey, onResetTree, onClose }) {
  const [key, setKey] = useState(apiKey);

  const handleSave = () => {
    setApiKey(key);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="settings-body">
          <label className="form-label">
            Anthropic API Key
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              className="form-input"
              placeholder="sk-ant-..."
            />
            <span className="form-hint">Required for AI assist. Your key is stored locally and never sent to any server except Anthropic's API.</span>
          </label>
          {onResetTree && (
            <label className="form-label" style={{ marginTop: '1rem' }}>
              Script tree
              <span className="form-hint">Replace the current script tree with the built-in default (new funnel with pitch variants).</span>
              <button
                type="button"
                className="cancel-btn"
                style={{ marginTop: '0.5rem', color: '#ef4444', borderColor: '#ef4444' }}
                onClick={() => { if (window.confirm('Reset script to the default tree? This cannot be undone.')) { onResetTree(); onClose(); } }}
              >
                Reset script to default
              </button>
            </label>
          )}
          <div className="settings-actions">
            <button className="save-btn" onClick={handleSave}>Save</button>
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
