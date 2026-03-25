import { useState } from 'react';

export default function SettingsModal({ apiKey, setApiKey, onClose }) {
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
          <div className="settings-actions">
            <button className="save-btn" onClick={handleSave}>Save</button>
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
