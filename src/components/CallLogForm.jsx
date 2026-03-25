import { useState } from 'react';

const OUTCOMES = [
  'Booked meeting',
  'Got referral',
  'Sent email/follow up',
  'Not interested',
  'No answer/voicemail',
  'Gatekeeper blocked',
];

export default function CallLogForm({ path, tree, endType, onSubmit, onSkip }) {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [outcome, setOutcome] = useState(() => {
    const lastNode = tree[path[path.length - 1]];
    if (lastNode?.endType === 'success') {
      return lastNode.id === 'book_meeting' ? 'Booked meeting' : 'Got referral';
    }
    if (lastNode?.endType === 'neutral') return 'Sent email/follow up';
    return 'Not interested';
  });
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    onSubmit({ companyName: companyName.trim(), contactName: contactName.trim(), outcome, notes });
  };

  const endColor = endType === 'success' ? '#16a34a' : endType === 'neutral' ? '#2563eb' : '#6b7280';

  return (
    <div className="log-form-wrapper">
      <div className="log-form-header" style={{ borderLeft: `4px solid ${endColor}` }}>
        <h3>Log this call</h3>
        <div className="log-path">
          {path.map((nodeId, i) => (
            <span key={i}>
              {i > 0 && ' › '}
              {tree[nodeId]?.label || nodeId}
            </span>
          ))}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="log-form">
        <label className="form-label">
          Company name *
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            className="form-input"
            required
            autoFocus
          />
        </label>
        <label className="form-label">
          Contact name
          <input
            type="text"
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            className="form-input"
          />
        </label>
        <label className="form-label">
          Outcome
          <select value={outcome} onChange={e => setOutcome(e.target.value)} className="form-select">
            {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label className="form-label">
          Notes
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="form-textarea"
            rows={3}
          />
        </label>
        <div className="log-form-actions">
          <button type="submit" className="log-submit-btn" disabled={!companyName.trim()}>Save log</button>
          <button type="button" className="log-skip-btn" onClick={onSkip}>Skip</button>
        </div>
      </form>
    </div>
  );
}
