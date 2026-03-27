import { useState, useMemo, useRef, memo, useCallback } from 'react';
import {
  ReactFlow,
  Handle,
  Position,
} from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const OUTCOME_COLORS = {
  'Booked meeting': '#16a34a',
  'Got referral': '#22c55e',
  'Sent email/follow up': '#2563eb',
  'Not interested': '#ef4444',
  'Left voicemail': '#f59e0b',
  'No answer': '#6b7280',
  'Wrong number': '#9ca3af',
  'Gatekeeper blocked': '#6b7280',
};
const FALLBACK_COLORS = ['#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
const OPENER_IDS = ['opener_a', 'opener_b', 'opener_c'];
const SUCCESS_OUTCOMES = ['Booked meeting', 'Got referral'];
const POSITIVE_OUTCOMES = ['Booked meeting', 'Got referral', 'Sent email/follow up', 'Follow up later'];
const RANGES = { '7d': 7, '30d': 30, all: Infinity };

const DAGRE_NODE_W = 162;
const DAGRE_NODE_H = 58;

function isSuccess(o) { return SUCCESS_OUTCOMES.includes(o); }
function isPositive(o) { return POSITIVE_OUTCOMES.includes(o); }
function pct(n, t) { return t === 0 ? 0 : Math.round((n / t) * 100); }
function getOpenerFromPath(p) { return p?.find(id => OPENER_IDS.includes(id)) || null; }

function outcomeColor(name, idx) {
  return OUTCOME_COLORS[name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

/* ─── Legacy path migration ─── */

const NEW_PITCH_IDS = new Set([
  'pitch_rm', 'pitch_accounting', 'pitch_spend', 'pitch_bundle', 'pitch_antibank',
]);

const LEGACY_OUTCOME_MAP = {
  book_meeting: 'book_meeting',
  got_referral: 'got_referral',
  follow_up_later: 'follow_up',
  send_something: 'send_email',
  hard_no: 'not_interested',
  call_over: 'not_interested',
  dont_use_cards: 'not_interested',
};

const LEGACY_NO_PITCH_IDS = new Set([
  'hard_no', 'gatekeeper', 'call_over', 'not_my_area',
]);

function mapLegacyPath(path) {
  if (!path || path.length === 0) return path;
  if (path.some(id => NEW_PITCH_IDS.has(id) || id === 'choose_pitch' || id === 'no_pitch')) {
    return path;
  }

  const opener = path.find(id => OPENER_IDS.includes(id));
  if (!opener) return path;

  const reachedPitch = path.includes('pitch');
  const lastStep = path[path.length - 1];
  const mappedOutcome = LEGACY_OUTCOME_MAP[lastStep] || 'not_interested';

  const newPath = ['choose_opener', opener];

  if (reachedPitch) {
    newPath.push('choose_pitch', 'pitch_legacy', mappedOutcome);
  } else {
    newPath.push('no_pitch');
  }

  return newPath;
}

function centerHeavyReorder(items) {
  const n = items.length;
  if (n <= 1) return items;
  const result = new Array(n);
  let li = 0, ri = n - 1;
  for (let i = n - 1; i >= 0; i--) {
    if ((n - 1 - i) % 2 === 0) result[li++] = items[i];
    else result[ri--] = items[i];
  }
  return result;
}

/* ─── React Flow custom node ─── */

const StatsNode = memo(function StatsNode({ data }) {
  let cls = 'flow-node';
  if (data.isRoot) cls += ' flow-node-root';
  else if (data.endState) {
    cls += data.endType === 'success' ? ' flow-node-success'
         : data.endType === 'neutral' ? ' flow-node-neutral'
         : ' flow-node-dead';
  } else if (data.label === 'Pre-update pitch') cls += ' flow-node-legacy';
  else if (data.hasCalls && data.total === 0) cls += ' flow-node-zero';
  else if (data.convRate >= 20) cls += ' flow-node-hot';
  else if (data.convRate > 0) cls += ' flow-node-warm';

  if (data.dimmed) cls += ' flow-node-dimmed';

  return (
    <div className={cls}>
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <div className="flow-node-label">{data.label}</div>
      {data.hasCalls && (
        <div className="flow-node-stats">
          {data.total > 0 ? `${data.total}` : '\u2014'}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
});

const nodeTypes = { stats: StatsNode };

/* ─── Build React Flow elements — aggregated funnel ─── */

const STATS_LABELS = {
  choose_pitch: 'Reached pitch',
  no_pitch: "Didn't reach pitch",
  pitch_legacy: 'Legacy pitch',
};

function buildFlowElements(tree, logs) {
  if (logs.length === 0) return null;

  // Translate all paths once, keep them for hover filtering
  const mappedPaths = [];
  const globalNodeCounts = {};
  const globalEdgeCounts = {};

  logs.forEach(log => {
    if (!log.path || log.path.length === 0) return;
    const mapped = mapLegacyPath(log.path);
    mappedPaths.push(mapped);

    for (const id of mapped) {
      globalNodeCounts[id] = (globalNodeCounts[id] || 0) + 1;
    }
    for (let i = 0; i < mapped.length - 1; i++) {
      const key = `${mapped[i]}__${mapped[i + 1]}`;
      globalEdgeCounts[key] = (globalEdgeCounts[key] || 0) + 1;
    }
  });

  // Compute max edge flow for thickness scaling
  let maxFlow = 1;
  for (const flow of Object.values(globalEdgeCounts)) {
    if (flow > maxFlow) maxFlow = flow;
  }

  // One React Flow node per unique funnel stage (layout shell — counts applied later)
  const nodeShells = [];
  for (const id of Object.keys(globalNodeCounts)) {
    const tn = tree[id];
    nodeShells.push({
      id,
      type: 'stats',
      position: { x: 0, y: 0 },
      data: {
        label: STATS_LABELS[id] || tn?.label || id,
        total: globalNodeCounts[id],
        endState: !!tn?.endState,
        endType: tn?.endType,
        isRoot: !!tn?.isOpenerChoice,
        hasCalls: true,
        dimmed: false,
      },
    });
  }

  // One edge per unique transition
  const edgeShells = [];
  for (const [key, flow] of Object.entries(globalEdgeCounts)) {
    const [source, target] = key.split('__');
    if (!globalNodeCounts[source] || !globalNodeCounts[target]) continue;
    edgeShells.push({
      id: `e-${source}-${target}`,
      source,
      target,
      flow,
      type: 'smoothstep',
      style: {
        strokeWidth: 1.5 + (flow / maxFlow) * 4,
        stroke: '#64748b',
        opacity: 0.55,
      },
    });
  }

  // --- Dagre layout ---
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 70, marginx: 20, marginy: 20 });

  nodeShells.forEach(node => {
    g.setNode(node.id, { width: DAGRE_NODE_W, height: DAGRE_NODE_H });
  });
  edgeShells.forEach(edge => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  // Force openers to the same rank
  const root = Object.values(tree).find(n => n.isOpenerChoice);
  if (root) {
    const opIds = (root.options || []).map(o => o.targetNodeId).filter(id => globalNodeCounts[id]);
    if (opIds.length > 1) {
      const minY = Math.min(...opIds.map(id => g.node(id).y));
      opIds.forEach(id => { g.node(id).y = minY; });
    }
  }

  // Reorder siblings within each rank: heaviest nodes near center
  const rankGroups = {};
  nodeShells.forEach(node => {
    const pos = g.node(node.id);
    const rankKey = Math.round(pos.y);
    if (!rankGroups[rankKey]) rankGroups[rankKey] = [];
    rankGroups[rankKey].push({ id: node.id, total: node.data.total, x: pos.x });
  });
  Object.values(rankGroups).forEach(group => {
    if (group.length <= 1) return;
    const sorted = [...group].sort((a, b) => b.total - a.total);
    const reordered = centerHeavyReorder(sorted);
    const xSlots = group.map(n => n.x).sort((a, b) => a - b);
    reordered.forEach((item, i) => { g.node(item.id).x = xSlots[i]; });
  });

  // Bake positions into nodes
  const layoutedNodes = nodeShells.map(node => {
    const pos = g.node(node.id);
    return {
      ...node,
      targetPosition: 'top',
      sourcePosition: 'bottom',
      position: {
        x: pos.x - DAGRE_NODE_W / 2,
        y: pos.y - DAGRE_NODE_H / 2,
      },
    };
  });

  return {
    layoutedNodes, edgeShells, mappedPaths,
    globalNodeCounts, globalEdgeCounts, maxFlow,
  };
}

/* ─── Flow diagram component ─── */

function FlowDiagram({ tree, filteredLogs }) {
  const [hoveredId, setHoveredId] = useState(null);
  const hoveredRef = useRef(null);
  const leaveTimer = useRef(null);

  const flowData = useMemo(
    () => buildFlowElements(tree, filteredLogs),
    [tree, filteredLogs]
  );

  const handleNodeEnter = useCallback((_, node) => {
    clearTimeout(leaveTimer.current);
    hoveredRef.current = node.id;
    setHoveredId(node.id);
  }, []);

  const handleNodeLeave = useCallback(() => {
    hoveredRef.current = null;
    leaveTimer.current = setTimeout(() => {
      if (hoveredRef.current === null) setHoveredId(null);
    }, 60);
  }, []);

  // Recompute node counts and edge styles when a node is hovered
  const { displayNodes, displayEdges } = useMemo(() => {
    if (!flowData) return { displayNodes: [], displayEdges: [] };
    const {
      layoutedNodes, edgeShells, mappedPaths,
      globalNodeCounts, globalEdgeCounts, maxFlow,
    } = flowData;

    if (!hoveredId) {
      const nodes = layoutedNodes.map(n => ({
        ...n,
        data: { ...n.data, total: globalNodeCounts[n.id] || 0, dimmed: false },
      }));
      const edges = edgeShells.map(e => ({
        ...e,
        style: {
          strokeWidth: 1.5 + (e.flow / maxFlow) * 4,
          stroke: '#64748b',
          opacity: 0.55,
        },
      }));
      return { displayNodes: nodes, displayEdges: edges };
    }

    // Filter to only paths that pass through the hovered node
    const filtered = mappedPaths.filter(p => p.includes(hoveredId));
    const filtNC = {};
    const filtEC = {};
    filtered.forEach(p => {
      for (const id of p) filtNC[id] = (filtNC[id] || 0) + 1;
      for (let i = 0; i < p.length - 1; i++) {
        const k = `${p[i]}__${p[i + 1]}`;
        filtEC[k] = (filtEC[k] || 0) + 1;
      }
    });

    const onPath = new Set(Object.keys(filtNC));
    const nodes = layoutedNodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        total: filtNC[n.id] || 0,
        dimmed: !onPath.has(n.id),
      },
    }));

    const edges = edgeShells.map(e => {
      const key = `${e.source}__${e.target}`;
      const flow = filtEC[key] || 0;
      return {
        ...e,
        style: {
          strokeWidth: flow > 0 ? 1.5 + (flow / maxFlow) * 4 : 1,
          stroke: flow > 0 ? '#64748b' : '#d1d5db',
          opacity: flow > 0 ? 0.85 : 0.06,
          transition: 'opacity 0.15s, stroke-width 0.15s',
        },
      };
    });

    return { displayNodes: nodes, displayEdges: edges };
  }, [flowData, hoveredId]);

  if (!flowData) {
    return (
      <div className="flow-container flow-empty">
        <p>No call data yet. Start making calls to see the flow diagram.</p>
      </div>
    );
  }

  return (
    <div className="flow-container">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={true}
        panOnDrag={true}
        minZoom={0.3}
        maxZoom={1.5}
        onNodeMouseEnter={handleNodeEnter}
        onNodeMouseLeave={handleNodeLeave}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
}

/* ─── Main dashboard ─── */

export default function StatsDashboard({ callLogs, aiObjections, tree }) {
  const [range, setRange] = useState('all');

  const filteredLogs = useMemo(() => {
    if (range === 'all') return callLogs;
    const cutoff = Date.now() - RANGES[range] * 86400000;
    return callLogs.filter(l => l.timestamp >= cutoff);
  }, [callLogs, range]);

  const totalCalls = filteredLogs.length;
  const meetings = useMemo(() => filteredLogs.filter(l => l.outcome === 'Booked meeting').length, [filteredLogs]);
  const referrals = useMemo(() => filteredLogs.filter(l => l.outcome === 'Got referral').length, [filteredLogs]);
  const conversionRate = pct(meetings + referrals, totalCalls);

  const openerStats = useMemo(() => {
    const s = {};
    OPENER_IDS.forEach(id => { s[id] = { total: 0, success: 0, positive: 0 }; });
    filteredLogs.forEach(l => {
      const op = getOpenerFromPath(l.path);
      if (!op || !s[op]) return;
      s[op].total++;
      if (isSuccess(l.outcome)) s[op].success++;
      if (isPositive(l.outcome)) s[op].positive++;
    });
    return OPENER_IDS
      .map(id => ({
        id,
        name: tree[id]?.label || id,
        total: s[id].total,
        convRate: pct(s[id].success, s[id].total),
        posRate: pct(s[id].positive, s[id].total),
      }))
      .filter(o => o.total > 0)
      .sort((a, b) => b.convRate - a.convRate || b.posRate - a.posRate);
  }, [filteredLogs, tree]);

  const outcomeData = useMemo(() => {
    const c = {};
    filteredLogs.forEach(l => { c[l.outcome] = (c[l.outcome] || 0) + 1; });
    return Object.entries(c)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLogs]);

  const callsOverTime = useMemo(() => {
    const dc = {};
    filteredLogs.forEach(l => {
      const day = new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dc[day] = (dc[day] || 0) + 1;
    });
    return Object.entries(dc).map(([date, count]) => ({ date, count }));
  }, [filteredLogs]);

  const commonObjections = useMemo(() => {
    const oc = {};
    const filtered = range === 'all'
      ? aiObjections
      : aiObjections.filter(o => o.timestamp >= Date.now() - RANGES[range] * 86400000);
    filtered.forEach(o => {
      const n = o.objection.toLowerCase().trim();
      oc[n] = (oc[n] || 0) + 1;
    });
    return Object.entries(oc)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([objection, count]) => ({ objection, count }));
  }, [aiObjections, range]);

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
      {/* Header */}
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

      {/* KPI Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{totalCalls}</div>
          <div className="stat-label">Total calls</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{
            color: conversionRate > 0 ? '#16a34a' : totalCalls > 0 ? '#ef4444' : undefined,
          }}>
            {conversionRate}%
          </div>
          <div className="stat-label">Conversion rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: meetings > 0 ? '#16a34a' : undefined }}>
            {meetings}
          </div>
          <div className="stat-label">Meetings booked</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: referrals > 0 ? '#16a34a' : undefined }}>
            {referrals}
          </div>
          <div className="stat-label">Referrals</div>
        </div>
      </div>

      {/* Flow Diagram — always visible */}
      <div className="chart-card stats-flow-card">
        <h3>Call flow</h3>
        <p className="flow-subtitle">
          Hover a node to highlight its edges. Thicker edges = more calls. Scroll to zoom, drag to pan.
        </p>
        <FlowDiagram tree={tree} filteredLogs={filteredLogs} />
      </div>

      {totalCalls > 0 && (
        <>
          {/* Opener comparison + Outcome breakdown */}
          <div className="stats-row">
            {openerStats.length > 0 && (
              <div className="chart-card">
                <h3>Opener comparison</h3>
                <div className="opener-table">
                  {openerStats.map(o => (
                    <div key={o.id} className="opener-row">
                      <div className="opener-name">{o.name}</div>
                      <div className="opener-meta">
                        <span>{o.total} calls</span>
                        <span
                          className="opener-conv"
                          style={{ color: o.convRate > 0 ? '#16a34a' : '#6b7280' }}
                        >
                          {o.convRate}% conv
                        </span>
                      </div>
                      <div className="opener-bar-bg">
                        <div className="opener-bar-s" style={{ width: `${o.convRate}%` }} />
                        <div className="opener-bar-p" style={{ width: `${Math.max(0, o.posRate - o.convRate)}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="opener-legend">
                    <span><span className="legend-dot" style={{ background: '#16a34a' }} /> Meeting / referral</span>
                    <span><span className="legend-dot" style={{ background: '#2563eb' }} /> Follow-up</span>
                  </div>
                </div>
              </div>
            )}

            {outcomeData.length > 0 && (
              <div className="chart-card">
                <h3>Outcomes</h3>
                <div className="outcome-list">
                  {outcomeData.map((o, i) => (
                    <div key={o.name} className="outcome-row">
                      <div className="outcome-label">
                        <span className="outcome-dot" style={{ background: outcomeColor(o.name, i) }} />
                        {o.name}
                      </div>
                      <div className="outcome-bar-bg">
                        <div
                          className="outcome-bar-fill"
                          style={{
                            width: `${pct(o.value, totalCalls)}%`,
                            background: outcomeColor(o.name, i),
                          }}
                        />
                      </div>
                      <span className="outcome-count">{o.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Calls over time + Top objections */}
          <div className="stats-row">
            {callsOverTime.length > 0 && (
              <div className="chart-card">
                <h3>Calls over time</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={callsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" fontSize={11} tick={{ fill: '#6b7280' }} />
                    <YAxis allowDecimals={false} fontSize={11} tick={{ fill: '#6b7280' }} width={24} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563eb" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {commonObjections.length > 0 && (
              <div className="chart-card">
                <h3>Top objections (AI assist)</h3>
                <div className="objection-list">
                  {commonObjections.map((o, i) => (
                    <div key={i} className="objection-row">
                      <span className="objection-count">{o.count}&times;</span>
                      <span className="objection-text">{o.objection}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
