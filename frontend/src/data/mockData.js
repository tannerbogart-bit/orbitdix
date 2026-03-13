// Mock data layer — swap these functions for real API calls in client.js

export const currentUser = {
  id: 1,
  first_name: 'Jordan',
  last_name: 'Blake',
  title: 'Product Manager',
  company: 'Acme Corp',
  avatar: 'JB',
  connections: 312,
  paths_found: 47,
  messages_sent: 23,
}

export const mockPeople = [
  { id: 1,  first_name: 'Jordan',   last_name: 'Blake',     title: 'Product Manager',    company: 'Acme Corp',        mutual: 0,  avatar: 'JB' },
  { id: 2,  first_name: 'Priya',    last_name: 'Sharma',    title: 'VP Engineering',      company: 'TechFlow',         mutual: 8,  avatar: 'PS' },
  { id: 3,  first_name: 'Marcus',   last_name: 'Chen',      title: 'Founder & CEO',       company: 'Launchpad AI',     mutual: 12, avatar: 'MC' },
  { id: 4,  first_name: 'Sofia',    last_name: 'Reyes',     title: 'Head of Growth',      company: 'ScaleUp',          mutual: 5,  avatar: 'SR' },
  { id: 5,  first_name: 'Tobias',   last_name: 'Müller',    title: 'Senior Engineer',     company: 'BuildFast',        mutual: 3,  avatar: 'TM' },
  { id: 6,  first_name: 'Aisha',    last_name: 'Okonkwo',   title: 'Design Lead',         company: 'Craft Studio',     mutual: 7,  avatar: 'AO' },
  { id: 7,  first_name: 'James',    last_name: 'Park',      title: 'Angel Investor',      company: 'Horizon Ventures', mutual: 15, avatar: 'JP' },
  { id: 8,  first_name: 'Elena',    last_name: 'Vasquez',   title: 'GTM Strategy',        company: 'GrowthOS',         mutual: 4,  avatar: 'EV' },
  { id: 9,  first_name: 'Noel',     last_name: 'Adeyemi',   title: 'CTO',                 company: 'DataStack',        mutual: 9,  avatar: 'NA' },
  { id: 10, first_name: 'Cassidy',  last_name: 'Wells',     title: 'Partner',             company: 'First Round',      mutual: 21, avatar: 'CW' },
]

export const mockEdges = [
  { id: 1, from_person_id: 1, to_person_id: 2 },
  { id: 2, from_person_id: 1, to_person_id: 5 },
  { id: 3, from_person_id: 2, to_person_id: 3 },
  { id: 4, from_person_id: 2, to_person_id: 7 },
  { id: 5, from_person_id: 3, to_person_id: 4 },
  { id: 6, from_person_id: 3, to_person_id: 10 },
  { id: 7, from_person_id: 4, to_person_id: 6 },
  { id: 8, from_person_id: 5, to_person_id: 8 },
  { id: 9, from_person_id: 6, to_person_id: 9 },
  { id: 10, from_person_id: 7, to_person_id: 10 },
  { id: 11, from_person_id: 8, to_person_id: 9 },
]

export const mockPaths = [
  {
    id: 1,
    from: mockPeople[0],
    to: mockPeople[9],
    path: [1, 2, 3, 10],
    degrees: 3,
    saved: true,
    label: 'Jordan → Cassidy via Marcus',
  },
  {
    id: 2,
    from: mockPeople[0],
    to: mockPeople[3],
    path: [1, 2, 3, 4],
    degrees: 3,
    saved: true,
    label: 'Jordan → Sofia via Priya & Marcus',
  },
]

export const mockActivity = [
  { id: 1, type: 'path_found',    text: 'Found a 3-degree path to Cassidy Wells',  time: '2 hours ago' },
  { id: 2, type: 'message_sent',  text: 'Sent intro message to Marcus Chen',         time: '5 hours ago' },
  { id: 3, type: 'connection',    text: 'Priya Sharma connected with you',           time: '1 day ago'   },
  { id: 4, type: 'path_found',    text: 'Found a 2-degree path to James Park',      time: '2 days ago'  },
  { id: 5, type: 'message_sent',  text: 'Sent intro message to Elena Vasquez',      time: '3 days ago'  },
]

// BFS path finder on mock data
export function findPath(fromId, toId) {
  if (fromId === toId) return { path: [fromId], degrees: 0 }

  const graph = {}
  for (const e of mockEdges) {
    ;(graph[e.from_person_id] ||= []).push(e.to_person_id)
    ;(graph[e.to_person_id]   ||= []).push(e.from_person_id)
  }

  const queue = [[fromId]]
  const visited = new Set([fromId])

  while (queue.length) {
    const path = queue.shift()
    const node = path[path.length - 1]
    for (const neighbor of graph[node] || []) {
      if (neighbor === toId) return { path: [...path, neighbor], degrees: path.length }
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push([...path, neighbor])
      }
    }
  }
  return { path: null, degrees: null }
}

export function getPersonById(id) {
  return mockPeople.find(p => p.id === id) || null
}
