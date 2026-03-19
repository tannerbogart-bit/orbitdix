import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const STEP_LABEL = {
  start:  { text: 'You',    bg: 'var(--accent)',        color: '#fff' },
  middle: { text: 'Ask',    bg: 'rgba(124,110,224,0.15)', color: 'var(--accent)' },
  end:    { text: 'Target', bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa' },
}

const TYPE_ICON = {
  work:      '🏢',
  school:    '🎓',
  community: '🌐',
  family:    '👥',
  linkedin:  '💼',
  other:     '🔗',
}

export function getHopLabel(edge, personA, personB) {
  if (edge?.relationship_note) return `${TYPE_ICON[edge.relationship_type] || '🔗'} ${edge.relationship_note}`
  if (edge?.relationship_type && edge.relationship_type !== 'linkedin') {
    const icon = TYPE_ICON[edge.relationship_type] || '🔗'
    const labels = { work: 'Work connection', school: 'School connection', community: 'Community', family: 'Family', other: 'Connection' }
    return `${icon} ${labels[edge.relationship_type]}`
  }
  // Auto-infer from shared company
  if (personA?.company && personB?.company && personA.company === personB.company) {
    return `🏢 Both at ${personA.company}`
  }
  return null
}

function PathNode({ data }) {
  const { person, role } = data
  const label = STEP_LABEL[role]
  const initials = ((person.first_name?.[0] || '') + (person.last_name?.[0] || '')).toUpperCase() || '?'
  const isStart = role === 'start'
  const isEnd   = role === 'end'

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1.5px solid ${isStart || isEnd ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '14px',
        padding: '14px 18px',
        width: '220px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: isStart || isEnd
          ? '0 0 20px rgba(124,110,224,0.2)'
          : '0 2px 12px rgba(0,0,0,0.3)',
        position: 'relative',
      }}
    >
      {/* Top handle (for incoming edge) */}
      {role !== 'start' && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: 'var(--accent)', border: 'none', width: 8, height: 8 }}
        />
      )}

      {/* Avatar */}
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
        background: isStart ? 'var(--accent)' : 'var(--accent-dim)',
        border: `2px solid ${isStart || isEnd ? 'var(--accent)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
        color: isStart ? '#fff' : 'var(--accent)',
        boxShadow: isStart ? '0 0 12px var(--accent-glow)' : 'none',
      }}>
        {initials}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {person.first_name} {person.last_name}
        </div>
        {(person.title || person.company) && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {person.title || ''}{person.company ? ` · ${person.company}` : ''}
          </div>
        )}
      </div>

      {/* Role badge */}
      <div style={{
        position: 'absolute', top: '-10px', right: '12px',
        background: label.bg, color: label.color,
        fontSize: '10px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
        padding: '2px 8px', borderRadius: '20px',
        border: `1px solid ${isStart || isEnd ? 'var(--accent)' : 'var(--border)'}`,
        letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>
        {label.text}
      </div>

      {/* Bottom handle (for outgoing edge) */}
      {role !== 'end' && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ background: 'var(--accent)', border: 'none', width: 8, height: 8 }}
        />
      )}
    </div>
  )
}

const NODE_TYPES = { pathNode: PathNode }

function buildFlow(pathPeople, allEdges = []) {
  const NODE_H = 80
  const GAP    = 80
  const x      = 0

  // Build a lookup: canonical key → edge object
  const edgeMap = {}
  for (const e of allEdges) {
    const key = `${Math.min(e.from_person_id, e.to_person_id)}-${Math.max(e.from_person_id, e.to_person_id)}`
    edgeMap[key] = e
  }

  const nodes = pathPeople.map((person, i) => {
    const role = i === 0 ? 'start' : i === pathPeople.length - 1 ? 'end' : 'middle'
    return {
      id: `pn-${i}`,
      type: 'pathNode',
      position: { x, y: i * (NODE_H + GAP) },
      data: { person, role },
      draggable: false,
    }
  })

  const flowEdges = pathPeople.slice(0, -1).map((person, i) => {
    const next  = pathPeople[i + 1]
    const key   = `${Math.min(person.id, next.id)}-${Math.max(person.id, next.id)}`
    const edge  = edgeMap[key]
    const label = getHopLabel(edge, person, next)
    const hasLabel = !!label
    return {
      id: `pe-${i}`,
      source: `pn-${i}`,
      target: `pn-${i + 1}`,
      animated: true,
      style: { stroke: 'var(--accent)', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent)', width: 14, height: 14 },
      label: label || (i === 0 ? 'ask for intro' : 'who knows'),
      labelStyle: {
        fill: hasLabel ? 'var(--text-primary)' : 'var(--text-muted)',
        fontSize: hasLabel ? 12 : 11,
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: hasLabel ? 600 : 400,
      },
      labelBgStyle: {
        fill: hasLabel ? 'rgba(124,110,224,0.12)' : 'var(--bg-card)',
        fillOpacity: 0.95,
      },
      labelBgPadding: [8, 5],
      labelBgBorderRadius: 6,
    }
  })

  return { nodes, edges: flowEdges }
}

export default function PathFlowGraph({ pathPeople, edges = [] }) {
  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildFlow(pathPeople, edges),
    [pathPeople, edges]
  )

  const [nodes, , onNodesChange] = useNodesState(initNodes)
  const [rfEdges, , onEdgesChange] = useEdgesState(initEdges)

  const height = pathPeople.length * 80 + (pathPeople.length - 1) * 80 + 60

  return (
    <div style={{ width: '100%', height: Math.max(height, 200), borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        style={{ background: 'transparent' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border)" gap={24} size={1} style={{ opacity: 0.25 }} />
      </ReactFlow>
    </div>
  )
}
