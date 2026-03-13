import { useMemo, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// Custom node
function PersonNode({ data }) {
  return (
    <div
      style={{
        background: data.isMe ? 'var(--accent)' : 'var(--bg-card)',
        border: `2px solid ${data.isMe ? 'var(--accent)' : data.highlighted ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '50%',
        width: '56px',
        height: '56px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: data.isMe
          ? '0 0 20px var(--accent-glow)'
          : data.highlighted
          ? '0 0 14px var(--accent-glow)'
          : 'none',
        transition: 'all 0.2s',
        position: 'relative',
      }}
    >
      <span
        style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 700,
          fontSize: '13px',
          color: data.isMe ? '#fff' : 'var(--accent)',
        }}
      >
        {data.avatar}
      </span>
      <div
        style={{
          position: 'absolute',
          top: '58px',
          whiteSpace: 'nowrap',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          fontWeight: 600,
          color: data.isMe ? 'var(--text-primary)' : 'var(--text-secondary)',
          pointerEvents: 'none',
          textAlign: 'center',
        }}
      >
        {data.label}
      </div>
    </div>
  )
}

const NODE_TYPES = { person: PersonNode }

// Arrange people in a rough circle layout + center
function buildLayout(people, highlightedPath = []) {
  const me = people[0]
  const others = people.slice(1)
  const radius = 220
  const cx = 350
  const cy = 250

  const nodes = [
    {
      id: String(me.id),
      type: 'person',
      position: { x: cx - 28, y: cy - 28 },
      data: {
        label: me.first_name,
        avatar: me.avatar,
        isMe: true,
        highlighted: highlightedPath.includes(me.id),
      },
    },
    ...others.map((p, i) => {
      const angle = (i / others.length) * 2 * Math.PI - Math.PI / 2
      return {
        id: String(p.id),
        type: 'person',
        position: {
          x: cx + radius * Math.cos(angle) - 28,
          y: cy + radius * Math.sin(angle) - 28,
        },
        data: {
          label: p.first_name,
          avatar: p.avatar,
          isMe: false,
          highlighted: highlightedPath.includes(p.id),
        },
      }
    }),
  ]

  return nodes
}

function buildEdges(edges, highlightedPath = []) {
  const pathEdges = new Set()
  for (let i = 0; i < highlightedPath.length - 1; i++) {
    const key = `${Math.min(highlightedPath[i], highlightedPath[i + 1])}-${Math.max(highlightedPath[i], highlightedPath[i + 1])}`
    pathEdges.add(key)
  }

  return edges.map((e) => {
    const key = `${Math.min(e.from_person_id, e.to_person_id)}-${Math.max(e.from_person_id, e.to_person_id)}`
    const isHighlighted = pathEdges.has(key)
    return {
      id: `e${e.id}`,
      source: String(e.from_person_id),
      target: String(e.to_person_id),
      style: {
        stroke: isHighlighted ? 'var(--accent)' : 'var(--border)',
        strokeWidth: isHighlighted ? 2.5 : 1.5,
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
    () => buildLayout(people, highlightedPath),
    [people, highlightedPath]
  )
  const initialEdges = useMemo(
    () => buildEdges(edges, highlightedPath),
    [edges, highlightedPath]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const handleNodeClick = useCallback(
    (_, node) => {
      const person = people.find((p) => String(p.id) === node.id)
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
        fitViewOptions={{ padding: 0.2 }}
        style={{ background: 'var(--bg-card)' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="var(--border)"
          gap={28}
          size={1}
          style={{ opacity: 0.4 }}
        />
        <Controls
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
        />
        <MiniMap
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
          nodeColor={(node) =>
            node.data?.isMe ? 'var(--accent)' : 'var(--border)'
          }
          maskColor="rgba(8,11,17,0.6)"
        />
      </ReactFlow>
    </div>
  )
}
