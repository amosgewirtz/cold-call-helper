import { useState, useMemo } from 'react';

const OUTCOMES = [
  'All',
  'Booked meeting',
  'Got referral',
  'Sent email/follow up',
  'Not interested',
  'No answer/voicemail',
  'Gatekeeper blocked',
];

export default function CallLogViewer({ callLogs, tree }) {
  const [filterOutcome, setFilterOutcome] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    return callLogs.filter(l => {
      if (filterOutcome !== 'All' && l.outcome !== filterOutcome) return false;
      if (search && !l.companyName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [callLogs, filterOutcome, search]);

  const outcomeColor = (outcome) => {
    if (outcome === 'Booked meeting' || outcome === 'Got referral') return '#16a34a';
    if (outcome === 'Sent email/follow up') return '#2563eb';
    if (outcome === 'Not interested') return '#ef4444';
    return '#6b7280';
  };

  return (
    <div className="log-container">
      <div className="log-header">
        <h2>Call Log</h2>
        <span className="log-count">{filtered.length} calls</span>
      </div>

      <div className="log-filters">
        <input
          type="text"
          placeholder="Search by company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input log-search"
        />
        <select
          value={filterOutcome}
          onChange={e => setFilterOutcome(e.target.value)}
          className="form-select"
        >
          {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="stats-empty">
          <p>{callLogs.length === 0 ? 'No calls logged yet.' : 'No calls match your filters.'}</p>
        </div>
      ) : (
        <div className="log-list">
          {filtered.map(log => (
            <div
              key={log.id}
              className={`log-entry ${expandedId === log.id ? 'log-entry-expanded' : ''}`}
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
            >
              <div className="log-entry-header">
                <div className="log-entry-left">
                  <span className="log-company">{log.companyName}</span>
                  {log.contactName && <span className="log-contact">{log.contactName}</span>}
                </div>
                <div className="log-entry-right">
                  <span className="log-outcome" style={{ color: outcomeColor(log.outcome) }}>
                    {log.outcome}
                  </span>
                  <span className="log-date">
                    {new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              {expandedId === log.id && (
                <div className="log-entry-detail">
                  {log.notes && <div className="log-notes"><strong>Notes:</strong> {log.notes}</div>}
                  <div className="log-path-detail">
                    <strong>Path:</strong>{' '}
                    {log.path.map((id, i) => (
                      <span key={i}>
                        {i > 0 && ' › '}
                        {tree[id]?.label || id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
