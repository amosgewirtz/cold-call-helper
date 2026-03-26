import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280', '#ec4899', '#14b8a6'];
const OPENER_IDS = ['opener_a', 'opener_b', 'opener_c', 'opener_d'];
const SUCCESS_OUTCOMES = ['Booked meeting', 'Got referral'];
const POSITIVE_OUTCOMES = ['Booked meeting', 'Got referral', 'Sent email/follow up'];
const RANGES = { '7d': 7, '30d': 30, all: Infinity };

function isSuccess(outcome) {
  return SUCCESS_OUTCOMES.includes(outcome);
}

function isPositive(outcome) {
  return POSITIVE_OUTCOMES.includes(outcome);
}

function getOpenerFromPath(path) {
  return path?.find(id => OPENER_IDS.includes(id)) || null;
}

function pct(n, total) {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

export default function StatsDashboard({ callLogs, aiObjections, tree }) {
  const [range, setRange] = useState('all');

  const filteredLogs = useMemo(() => {
    if (range === 'all') return callLogs;
    const cutoff = Date.now() - RANGES[range] * 86400000;
    return callLogs.filter(l => l.timestamp >= cutoff);
  }, [callLogs, range]);

  const conversionRate = useMemo(() => {
    if (filteredLogs.length === 0) return 0;
    return pct(filteredLogs.filter(l => isSuccess(l.outcome)).length, filteredLogs.length);
  }, [filteredLogs]);

  // --- Opener performance ---
  const openerStats = useMemo(() => {
    const stats = {};
    OPENER_IDS.forEach(id => { stats[id] = { total: 0, success: 0, positive: 0 }; });

    filteredLogs.forEach(l => {
      const opener = getOpenerFromPath(l.path);
      if (!opener || !stats[opener]) return;
      stats[opener].total++;
      if (isSuccess(l.outcome)) stats[opener].success++;
      if (isPositive(l.outcome)) stats[opener].positive++;
    });

    return OPENER_IDS
      .map(id => ({
        id,
        name: tree[id]?.label?.replace('Opener ', '') || id,
        shortName: tree[id]?.label?.replace('Opener ', '').split(':')[0] || id,
        total: stats[id].total,
        successRate: pct(stats[id].success, stats[id].total),
        positiveRate: pct(stats[id].positive, stats[id].total),
        meetings: stats[id].success,
        positive: stats[id].positive,
      }))
      .filter(o => o.total > 0);
  }, [filteredLogs, tree]);

  const openerChartData = useMemo(() => {
    return openerStats.map(o => ({
      name: o.shortName,
      'Conversion %': o.successRate,
      'Positive %': o.positiveRate,
      calls: o.total,
    }));
  }, [openerStats]);

  // --- Node-level conversion (which branches succeed vs fail) ---
  const branchStats = useMemo(() => {
    const stats = {};

    filteredLogs.forEach(l => {
      l.path.forEach(nodeId => {
        if (nodeId === 'choose_opener') return;
        if (!stats[nodeId]) stats[nodeId] = { total: 0, success: 0, positive: 0 };
        stats[nodeId].total++;
        if (isSuccess(l.outcome)) stats[nodeId].success++;
        if (isPositive(l.outcome)) stats[nodeId].positive++;
      });
    });

    return Object.entries(stats)
      .filter(([, s]) => s.total >= 2)
      .map(([id, s]) => ({
        id,
        label: tree[id]?.label || id,
        total: s.total,
        successRate: pct(s.success, s.total),
        positiveRate: pct(s.positive, s.total),
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredLogs, tree]);

  // --- Winning vs losing full paths ---
  const pathAnalysis = useMemo(() => {
    const pathMap = {};
    filteredLogs.forEach(l => {
      const key = l.path.map(id => tree[id]?.label || id).join(' › ');
      if (!pathMap[key]) pathMap[key] = { path: key, total: 0, success: 0, positive: 0, outcomes: {} };
      pathMap[key].total++;
      if (isSuccess(l.outcome)) pathMap[key].success++;
      if (isPositive(l.outcome)) pathMap[key].positive++;
      pathMap[key].outcomes[l.outcome] = (pathMap[key].outcomes[l.outcome] || 0) + 1;
    });

    const paths = Object.values(pathMap)
      .filter(p => p.total >= 1)
      .map(p => ({
        ...p,
        successRate: pct(p.success, p.total),
        positiveRate: pct(p.positive, p.total),
        topOutcome: Object.entries(p.outcomes).sort((a, b) => b[1] - a[1])[0]?.[0],
      }));

    const winning = [...paths].sort((a, b) => b.successRate - a.successRate || b.total - a.total).slice(0, 5);
    const losing = [...paths]
      .filter(p => p.successRate === 0 && p.total >= 1)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { winning, losing };
  }, [filteredLogs, tree]);

  // --- Outcome breakdown ---
  const outcomeData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(l => { counts[l.outcome] = (counts[l.outcome] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredLogs]);

  // --- Common objections ---
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

  // --- Calls over time ---
  const callsOverTime = useMemo(() => {
    const dayCounts = {};
    filteredLogs.forEach(l => {
      const day = new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    return Object.entries(dayCounts).map(([date, count]) => ({ date, count }));
  }, [filteredLogs]);

  const exportCSV = () => {
    const headers = ['Company', 'Contact', 'Outcome', 'Notes', 'Opener', 'Path', 'Date'];
    const rows = callLogs.map(l => {
      const opener = getOpenerFromPath(l.path);
      return [
        l.companyName,
        l.contactName || '',
        l.outcome,
        (l.notes || '').replace(/"/g, '""'),
        tree[opener]?.label || '',
        l.path.map(id => tree[id]?.label || id).join(' > '),
        new Date(l.timestamp).toLocaleString(),
      ];
    });
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

          {/* Opener performance — the hero chart */}
          {openerStats.length > 0 && (
            <div className="chart-card full-width">
              <h3>Opener performance</h3>
              <div className="opener-stats-row">
                <div className="opener-chart-area">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={openerChartData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis unit="%" domain={[0, 100]} fontSize={12} />
                      <Tooltip
                        formatter={(val, name) => [`${val}%`, name]}
                        labelFormatter={(label) => {
                          const match = openerChartData.find(d => d.name === label);
                          return `${label} (${match?.calls || 0} calls)`;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Conversion %" fill="#16a34a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Positive %" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="opener-breakdown">
                  {openerStats.map(o => (
                    <div key={o.id} className="opener-stat-row">
                      <div className="opener-stat-name">{o.name}</div>
                      <div className="opener-stat-nums">
                        <span className="opener-stat-calls">{o.total} calls</span>
                        <span className="opener-stat-rate" style={{ color: o.successRate >= 20 ? '#16a34a' : o.successRate > 0 ? '#f59e0b' : '#ef4444' }}>
                          {o.successRate}% conv
                        </span>
                      </div>
                      <div className="opener-stat-bar">
                        <div className="opener-bar-fill opener-bar-success" style={{ width: `${o.successRate}%` }} />
                        <div className="opener-bar-fill opener-bar-positive" style={{ width: `${o.positiveRate - o.successRate}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="opener-legend">
                    <span><span className="legend-dot" style={{ background: '#16a34a' }} /> Meeting/referral</span>
                    <span><span className="legend-dot" style={{ background: '#2563eb' }} /> Follow-up</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Winning paths */}
          {pathAnalysis.winning.length > 0 && (
            <div className="chart-card full-width">
              <h3>Top converting paths</h3>
              <div className="path-analysis-list">
                {pathAnalysis.winning.map((p, i) => (
                  <div key={i} className="path-analysis-row">
                    <div className="path-analysis-header">
                      <span className="path-analysis-rate" style={{ color: p.successRate > 0 ? '#16a34a' : '#6b7280' }}>
                        {p.successRate}%
                      </span>
                      <span className="path-analysis-count">{p.total} call{p.total !== 1 ? 's' : ''}</span>
                      <span className={`path-analysis-outcome ${isSuccess(p.topOutcome) ? 'outcome-success' : isPositive(p.topOutcome) ? 'outcome-positive' : 'outcome-negative'}`}>
                        {p.topOutcome}
                      </span>
                    </div>
                    <div className="path-analysis-trail">{p.path}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Losing paths */}
          {pathAnalysis.losing.length > 0 && (
            <div className="chart-card full-width">
              <h3>Paths that never convert</h3>
              <div className="path-analysis-list">
                {pathAnalysis.losing.map((p, i) => (
                  <div key={i} className="path-analysis-row path-analysis-losing">
                    <div className="path-analysis-header">
                      <span className="path-analysis-rate" style={{ color: '#ef4444' }}>0%</span>
                      <span className="path-analysis-count">{p.total} call{p.total !== 1 ? 's' : ''}</span>
                      <span className="path-analysis-outcome outcome-negative">{p.topOutcome}</span>
                    </div>
                    <div className="path-analysis-trail">{p.path}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Branch conversion — which nodes appear in successful calls */}
          {branchStats.length > 0 && (
            <div className="chart-card full-width">
              <h3>Branch conversion rates</h3>
              <p className="chart-subtitle">How often calls passing through each node end in a meeting or referral</p>
              <div className="branch-stats-list">
                {branchStats.map(b => (
                  <div key={b.id} className="branch-stat-row">
                    <div className="branch-stat-label">{b.label}</div>
                    <div className="branch-stat-bar-wrap">
                      <div className="branch-stat-bar">
                        <div className="branch-bar-success" style={{ width: `${b.successRate}%` }} />
                        <div className="branch-bar-positive" style={{ width: `${b.positiveRate - b.successRate}%` }} />
                      </div>
                    </div>
                    <div className="branch-stat-nums">
                      <span style={{ color: b.successRate >= 20 ? '#16a34a' : '#6b7280' }}>{b.successRate}%</span>
                      <span className="branch-stat-total">{b.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
