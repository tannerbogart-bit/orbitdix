import { useMemo, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// Degree ring config: radius and node color per degree
const RING = [
  { radius: 0,   color: 'var(--accent)',        glow: '0 0 20px var(--accent-glow)' },  // self
  { radius: 190, color: 'var(--accent)',        glow: '0 0 12px var(--accent-glow)' },  // 1st
  { radius: 360, color: 'rgba(124,110,224,0.6)', glow: 'none' },                         // 2nd
  { radius: 520, color: 'var(--border)',         glow: 'none' },                         // 3rd+
]

function PersonNode({ data }) {
  const ring = RING[Math.min(data.degree, 3)]
  const isHighlighted = data.highlighted
  return (
    <div
      style={{
        background: data.isMe ? 'var(--accent)' : 'var(--bg-card)',
        border: `2px solid ${isHighlighted ? 'var(--accent)' : data.isMe ? 'var(--accent)' : ring.color}`,
        borderRadius: '50%',
        width: data.isMe ? '64px' : '52px',
        height: data.isMe ? '64px' : '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: isHighlighted ? '0 0 16px var(--accent-glow)' : ring.glow,
        transition: 'all 0.2s',
        position: 'relative',
      }}
    >
      <span style={{
        fontFamily: 'Syne, sans-serif',
        fontWeight: 700,
        fontSize: data.isMe ? '14px' : '12px',
        color: data.isMe ? '#fff' : isHighlighted ? 'var(--accent)' : ring.color,
      }}>
        {data.avatar}
      </span>
      <div style={{
        position: 'absolute',
        top: data.isMe ? '66px' : '54px',
        whiteSpace: 'nowrap',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '11px',
        fontWeight: data.isMe ? 700 : 500,
        color: data.isMe ? 'var(--text-primary)' : 'var(--text-secondary)',
        pointerEvents: 'none',
        textAlign: 'center',
      }}>
        {data.label}
      </div>
    </div>
  )
}

const NODE_TYPES = { person: PersonNode }

/**
 * BFS-radial layout: self at center, direct connections at ring 1,
 * 2nd degree at ring 2, 3rd+ at ring 3.
 * Nodes with no connection to self end up in the outermost ring.
 */
function buildLayout(people, edges, highlightedPath = []) {
  const me = people.find(p => p.is_self) || people[0]
  const cx = 0
  const cy = 0

  // Build adjacency map
  const adj = {}
  for (const e of edges) {
    ;(adj[e.from_person_id] = adj[e.from_person_id] || []).push(e.to_person_id)
    ;(adj[e.to_person_id]   = adj[e.to_person_id]   || []).push(e.from_person_id)
  }

  // BFS from self to assign degrees
  const degree = { [me.id]: 0 }
  const queue = [me.id]
  while (queue.length) {
    const cur = queue.shift()
    const d = degree[cur]
    if (d >= 3) continue
    for (const nb of (adj[cur] || [])) {
      if (degree[nb] === undefined) {
        degree[nb] = d + 1
        queue.push(nb)
      }
    }
  }

  // Group people by degree
  const byDegree = [[], [], [], []]
  for (const p of people) {
    if (p.id === me.id) continue
    const d = degree[p.id] ?? 3
    byDegree[Math.min(d, 3)].push(p)
  }

  // Place nodes on rings
  const initials = p => ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '?'

  const nodes = [{
    id: String(me.id),
    type: 'person',
    position: { x: cx - 32, y: cy - 32 },
    data: { label: me.first_name, avatar: initials(me), isMe: true, degree: 0, highlighted: highlightedPath.includes(me.id) },
  }]

  for (let d = 1; d <= 3; d++) {
    const ring = byDegree[d]
    const r = RING[d].radius
    ring.forEach((p, i) => {
      const angle = (i / ring.length) * 2 * Math.PI - Math.PI / 2
      nodes.push({
        id: String(p.id),
        type: 'person',
        position: { x: cx + r * Math.cos(angle) - 26, y: cy + r * Math.sin(angle) - 26 },
        data: { label: p.first_name, avatar: initials(p), isMe: false, degree: d, highlighted: highlightedPath.includes(p.id) },
      })
    })
  }

  return nodes
}

function buildEdges(edges, highlightedPath = []) {
  const pathEdges = new Set()
  for (let i = 0; i < highlightedPath.length - 1; i++) {
    const a = highlightedPath[i], b = highlightedPath[i + 1]
    pathEdges.add(`${Math.min(a, b)}-${Math.max(a, b)}`)
  }

  return edges.map(e => {
    const key = `${Math.min(e.from_person_id, e.to_person_id)}-${Math.max(e.from_person_id, e.to_person_id)}`
    const isHighlighted = pathEdges.has(key)
    return {
      id: `e${e.id}`,
      source: String(e.from_person_id),
      target: String(e.to_person_id),
      style: {
        stroke: isHighlighted ? 'var(--accent)' : 'var(--border)',
        strokeWidth: isHighlighted ? 2.5 : 1,
        opacity: isHighlighted ? 1 : 0.4,
      },
      markerEnd: isHighlighted
        ? { type: MarkerType.ArrowClosed, color: 'var(--accent)', width: 12, height: 12 }
        : undefined,
      animated: isHighlighted,
    }
  })
}

export default function NetworkGraph({ people, edges, highlightedPath = [], onNodeClick }) {
  const initialNodes = useMemo(
    () => people.length ? buildLayout(people, edges, highlightedPath) : [],
    [people, edges, highlightedPath]
  )
  const initialEdges = useMemo(
    () => buildEdges(edges, highlightedPath),
    [edges, highlightedPath]
  )

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [rfEdges, , onEdgesChange] = useEdgesState(initialEdges)

  const handleNodeClick = useCallback(
    (_, node) => {
      const person = people.find(p => String(p.id) === node.id)
      if (person && onNodeClick) onNodeClick(person)
    },
    [people, onNodeClick]
  )

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        style={{ background: 'var(--bg-card)' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border)" gap={28} size={1} style={{ opacity: 0.3 }} />
        <Controls style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px' }} />
        <MiniMap
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px' }}
          nodeColor={node => {
            const d = node.data?.degree ?? 3
            return d === 0 ? '#7c6ee0' : d === 1 ? '#7c6ee0' : d === 2 ? 'rgba(124,110,224,0.5)' : 'var(--border)'
          }}
          maskColor="rgba(8,11,17,0.6)"
        />
      </ReactFlow>
    </div>
  )
}

/**
 * Exported helper: compute degree counts from people + edges.
 * Returns { direct, second, thirdPlus }
 */
export function computeDegreeCounts(people, edges) {
  const me = people.find(p => p.is_self)
  if (!me) return { direct: 0, second: 0, thirdPlus: 0 }

  const adj = {}
  for (const e of edges) {
    ;(adj[e.from_person_id] = adj[e.from_person_id] || []).push(e.to_person_id)
    ;(adj[e.to_person_id]   = adj[e.to_person_id]   || []).push(e.from_person_id)
  }

  const degree = { [me.id]: 0 }
  const queue = [me.id]
  while (queue.length) {
    const cur = queue.shift()
    const d = degree[cur]
    for (const nb of (adj[cur] || [])) {
      if (degree[nb] === undefined) {
        degree[nb] = d + 1
        queue.push(nb)
      }
    }
  }

  let direct = 0, second = 0, thirdPlus = 0
  for (const p of people) {
    if (p.is_self) continue
    const d = degree[p.id]
    if (d === 1) direct++
    else if (d === 2) second++
    else thirdPlus++
  }
  return { direct, second, thirdPlus }
}
