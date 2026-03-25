import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

const COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];
const RANGES = { '7d': 7, '30d': 30, all: Infinity };

export default function StatsDashboard({ callLogs, aiObjections, tree }) {
  const [range, setRange] = useState('all');

  const filteredLogs = useMemo(() => {
    if (range === 'all') return callLogs;
    const cutoff = Date.now() - RANGES[range] * 86400000;
    return callLogs.filter(l => l.timestamp >= cutoff);
  }, [callLogs, range]);

  const outcomeData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(l => { counts[l.outcome] = (counts[l.outcome] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredLogs]);

  const conversionRate = useMemo(() => {
    if (filteredLogs.length === 0) return 0;
    const successes = filteredLogs.filter(l => l.outcome === 'Booked meeting' || l.outcome === 'Got referral').length;
    return Math.round((successes / filteredLogs.length) * 100);
  }, [filteredLogs]);

  const commonPaths = useMemo(() => {
    const pathCounts = {};
    filteredLogs.forEach(l => {
      const key = l.path.map(id => tree[id]?.label || id).join(' › ');
      pathCounts[key] = (pathCounts[key] || 0) + 1;
    });
    return Object.entries(pathCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }));
  }, [filteredLogs, tree]);

  const commonObjections = useMemo(() => {
    const objCounts = {};
    const filtered = range === 'all' ? aiObjections : aiObjections.filter(o => o.timestamp >= Date.now() - RANGES[range] * 86400000);
    filtered.forEach(o => {
      const normalized = o.objection.toLowerCase().trim();
      objCounts[normalized] = (objCounts[normalized] || 0) + 1;
    });
    return Object.entries(objCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([objection, count]) => ({ objection, count }));
  }, [aiObjections, range]);

  const callsOverTime = useMemo(() => {
    const dayCounts = {};
    filteredLogs.forEach(l => {
      const day = new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    return Object.entries(dayCounts).map(([date, count]) => ({ date, count }));
  }, [filteredLogs]);

  const exportCSV = () => {
    const headers = ['Company', 'Contact', 'Outcome', 'Notes', 'Path', 'Date'];
    const rows = callLogs.map(l => [
      l.companyName,
      l.contactName || '',
      l.outcome,
      (l.notes || '').replace(/"/g, '""'),
      l.path.map(id => tree[id]?.label || id).join(' > '),
      new Date(l.timestamp).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stats-container">
      <div className="stats-header">
        <h2>Dashboard</h2>
        <div className="stats-controls">
          <div className="range-picker">
            {Object.entries({ '7d': '7 days', '30d': '30 days', all: 'All time' }).map(([key, label]) => (
              <button
                key={key}
                className={`range-btn ${range === key ? 'range-active' : ''}`}
                onClick={() => setRange(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <button className="export-btn" onClick={exportCSV} disabled={callLogs.length === 0}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{filteredLogs.length}</div>
          <div className="stat-label">Total calls</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#16a34a' }}>{conversionRate}%</div>
          <div className="stat-label">Conversion rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{filteredLogs.filter(l => l.outcome === 'Booked meeting').length}</div>
          <div className="stat-label">Meetings booked</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{filteredLogs.filter(l => l.outcome === 'Got referral').length}</div>
          <div className="stat-label">Referrals</div>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="stats-empty">
          <p>No call data yet. Start making calls to see stats here.</p>
        </div>
      ) : (
        <div className="stats-charts">
          <div className="chart-card">
            <h3>Outcome breakdown</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={outcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {outcomeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Calls over time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={callsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {commonPaths.length > 0 && (
            <div className="chart-card full-width">
              <h3>Most common paths</h3>
              <div className="common-paths">
                {commonPaths.map((p, i) => (
                  <div key={i} className="path-row">
                    <span className="path-count">{p.count}×</span>
                    <span className="path-trail">{p.path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {commonObjections.length > 0 && (
            <div className="chart-card full-width">
              <h3>Most common objections (AI assist)</h3>
              <div className="common-paths">
                {commonObjections.map((o, i) => (
                  <div key={i} className="path-row">
                    <span className="path-count">{o.count}×</span>
                    <span className="path-trail">{o.objection}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
