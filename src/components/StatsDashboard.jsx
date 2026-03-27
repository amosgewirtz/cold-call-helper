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

const OPENER_IDS = ['opener_a', 'opener_b', 'opener_c'];
const SUCCESS_OUTCOMES = ['Booked meeting', 'Got referral'];
const RANGES = { '7d': 7, '30d': 30, all: Infinity };

const DAGRE_NODE_W = 162;
const DAGRE_NODE_H = 58;

function isSuccess(o) { return SUCCESS_OUTCOMES.includes(o); }
function pct(n, t) { return t === 0 ? 0 : Math.round((n / t) * 100); }
function getOpenerFromPath(p) { return p?.find(id => OPENER_IDS.includes(id)) || null; }

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

/* ─── React Flow custom node ─── */

const StatsNode = memo(function StatsNode({ data }) {
  let cls = 'flow-node';
  if (data.isRoot) cls += ' flow-node-root';
  else if (data.endState) {
    cls += data.endType === 'success' ? ' flow-node-success'
         : data.endType === 'neutral' ? ' flow-node-neutral'
         : ' flow-node-dead';
  } else if (data.isExit) cls += ' flow-node-exit';
  else if (data.label === 'Pre-update pitch') cls += ' flow-node-legacy';
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
  choose_opener: 'Call answered',
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

  const EXIT_IDS = new Set(['no_pitch', 'not_interested']);

  // One React Flow node per unique funnel stage, skip choose_opener (openers are the top row)
  const nodeShells = [];
  for (const id of Object.keys(globalNodeCounts)) {
    if (id === 'choose_opener') continue;
    const tn = tree[id];
    const isExit = EXIT_IDS.has(id);
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
        isExit,
        hasCalls: true,
        dimmed: false,
      },
    });
  }

  // One edge per unique transition (only between rendered nodes), uniform thickness
  const nodeIdSet = new Set(nodeShells.map(n => n.id));
  const edgeShells = [];
  for (const [key, flow] of Object.entries(globalEdgeCounts)) {
    const [source, target] = key.split('__');
    if (!nodeIdSet.has(source) || !nodeIdSet.has(target)) continue;
    const isExitEdge = EXIT_IDS.has(target);
    edgeShells.push({
      id: `e-${source}-${target}`,
      source,
      target,
      flow,
      type: 'smoothstep',
      style: {
        strokeWidth: 2,
        stroke: isExitEdge ? '#c0c4cc' : '#64748b',
        opacity: isExitEdge ? 0.35 : 0.55,
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

  // Force openers to the same rank, ordered by their position in the tree
  const root = Object.values(tree).find(n => n.isOpenerChoice);
  if (root) {
    const opIds = (root.options || []).map(o => o.targetNodeId).filter(id => globalNodeCounts[id]);
    if (opIds.length > 1) {
      const minY = Math.min(...opIds.map(id => g.node(id).y));
      const xSlots = opIds.map(id => g.node(id).x).sort((a, b) => a - b);
      opIds.forEach((id, i) => {
        g.node(id).y = minY;
        g.node(id).x = xSlots[i];
      });
    }
  }

  // Center the main funnel spine under the middle opener
  const root2 = Object.values(tree).find(n => n.isOpenerChoice);
  const opIds2 = root2 ? (root2.options || []).map(o => o.targetNodeId).filter(id => globalNodeCounts[id]) : [];
  const midOpener = opIds2.length > 0 ? g.node(opIds2[Math.floor(opIds2.length / 2)]) : null;
  const centerX = midOpener ? midOpener.x : 0;
  const ranksep = 70;

  const reachedNode = g.node('choose_pitch');
  if (reachedNode) {
    reachedNode.x = centerX;
  }

  const legacyNode = g.node('pitch_legacy');
  if (legacyNode && reachedNode) {
    legacyNode.x = centerX;
    legacyNode.y = reachedNode.y + DAGRE_NODE_H + ranksep;
  }

  const exitNode = g.node('no_pitch');
  if (exitNode && reachedNode) {
    exitNode.y = reachedNode.y;
    exitNode.x = centerX + DAGRE_NODE_W + 120;
  }

  // Position outcome nodes: non-exit centered below legacy pitch, exits to the right
  const outcomeY = (legacyNode ? legacyNode.y : reachedNode ? reachedNode.y : 0) + DAGRE_NODE_H + ranksep;
  const outcomeIds = nodeShells
    .filter(n => n.data.endState && !EXIT_IDS.has(n.id))
    .map(n => n.id)
    .filter(id => g.node(id));
  const exitOutcomeIds = nodeShells
    .filter(n => n.data.endState && EXIT_IDS.has(n.id))
    .map(n => n.id)
    .filter(id => g.node(id));

  if (outcomeIds.length > 0) {
    const totalW = outcomeIds.length * DAGRE_NODE_W + (outcomeIds.length - 1) * 40;
    const startX = centerX - totalW / 2 + DAGRE_NODE_W / 2;
    outcomeIds.forEach((id, i) => {
      const node = g.node(id);
      node.y = outcomeY;
      node.x = startX + i * (DAGRE_NODE_W + 40);
    });
  }

  const exitX = centerX + DAGRE_NODE_W + 120;
  exitOutcomeIds.forEach((id, i) => {
    const node = g.node(id);
    node.y = outcomeY;
    node.x = exitX + i * (DAGRE_NODE_W + 30);
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

    const EXIT_SET = new Set(['no_pitch']);

    if (!hoveredId) {
      const nodes = layoutedNodes.map(n => ({
        ...n,
        data: { ...n.data, total: globalNodeCounts[n.id] || 0, dimmed: false },
      }));
      const edges = edgeShells.map(e => ({
        ...e,
        style: {
          strokeWidth: 2,
          stroke: EXIT_SET.has(e.target) ? '#c0c4cc' : '#64748b',
          opacity: EXIT_SET.has(e.target) ? 0.35 : 0.55,
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
          strokeWidth: 2,
          stroke: flow > 0 ? '#64748b' : '#d1d5db',
          opacity: flow > 0 ? 0.85 : 0.06,
          transition: 'opacity 0.15s',
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
  const conversionRate = pct(meetings, totalCalls);

  const callsOverTime = useMemo(() => {
    const dc = {};
    filteredLogs.forEach(l => {
      const day = new Date(l.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dc[day]) dc[day] = { date: day, booked: 0, other: 0 };
      if (l.outcome === 'Booked meeting') dc[day].booked++;
      else dc[day].other++;
    });
    return Object.values(dc);
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
          <div className="stat-label">Total calls answered</div>
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
      </div>

      {/* Flow Diagram — always visible */}
      <div className="chart-card stats-flow-card">
        <h3>Call flow</h3>
        <FlowDiagram tree={tree} filteredLogs={filteredLogs} />
      </div>

      {totalCalls > 0 && callsOverTime.length > 0 && (
        <div className="chart-card">
          <h3>Call performance over time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={callsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" fontSize={11} tick={{ fill: '#6b7280' }} />
              <YAxis allowDecimals={false} fontSize={11} tick={{ fill: '#6b7280' }} width={24} />
              <Tooltip cursor={false} contentStyle={{ fontSize: '0.8rem', borderRadius: 6, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="booked" name="Meeting booked" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="other" name="Not booked" stackId="a" fill="#d1d5db" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
