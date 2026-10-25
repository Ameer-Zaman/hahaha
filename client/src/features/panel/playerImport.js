import { slugify } from './format'

/**
 * Reads a player list from JSON. Accepted shapes (field names are forgiving):
 *
 *   [ { "name": "Mara Voss", "role": "Leader", "since": "2026" }, "Dex Hollow", … ]
 *   { "players": [ … ] }
 *   [ { "gang": "harbor-wolves", "name": "Mara Voss", "role": "Leader" }, … ]
 *   { "harbor-wolves": [ … ], "Ash Kings": [ … ] }
 *   { "gangs": [ { "gang": "Harbor Wolves", "players": [ … ] }, … ] }
 *
 * name  ← name | player | playerName | character | characterName | ign | username
 * role  ← role | rank | position | title         (default "Member")
 * since ← since | joined | joinedAt | date | year
 * gang  ← gang | gangName | gangSlug | slug | crew | family
 */
const NAME_KEYS = ['name', 'player', 'playername', 'character', 'charactername', 'ign', 'username']
const ROLE_KEYS = ['role', 'rank', 'position', 'title']
const SINCE_KEYS = ['since', 'joined', 'joinedat', 'date', 'year']
const GANG_KEYS = ['gang', 'gangname', 'gangslug', 'slug', 'crew', 'family']
const LIST_KEYS = ['players', 'members', 'roster', 'list']

export const MAX_PLAYERS = 200

const pickField = (obj, keys) => {
  for (const [k, v] of Object.entries(obj)) {
    if (keys.includes(k.toLowerCase().replace(/[\s_-]/g, '')) && v != null && v !== '') return String(v).trim()
  }
  return ''
}

const clip = (text, max) => text.slice(0, max)

function toPlayer(item) {
  if (typeof item === 'string' || typeof item === 'number') {
    const name = String(item).trim()
    return name ? { name: clip(name, 60), role: 'Member', since: '' } : null
  }
  if (!item || typeof item !== 'object') return null
  const name = pickField(item, NAME_KEYS)
  if (!name) return null
  return {
    name: clip(name, 60),
    role: clip(pickField(item, ROLE_KEYS) || 'Member', 40),
    since: clip(pickField(item, SINCE_KEYS), 20),
  }
}

function listOf(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (LIST_KEYS.includes(k.toLowerCase()) && Array.isArray(v)) return v
  }
  return null
}

/**
 * Parses JSON text into groups: [{ gang: string | null, players: [...] }] plus warnings.
 * `gang` is null when the file doesn't say which gang the players belong to.
 */
export function parsePlayerJson(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch (err) {
    throw new Error(`That isn't valid JSON: ${err.message}`)
  }

  const groups = new Map() // gang label (or '') → players
  let skipped = 0
  const add = (gang, item) => {
    const player = toPlayer(item)
    if (!player) {
      skipped += 1
      return
    }
    const key = gang ?? ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(player)
  }

  const topList = listOf(data)
  if (topList) {
    // a flat list — each entry may name its own gang
    for (const item of topList) add(item && typeof item === 'object' ? pickField(item, GANG_KEYS) || null : null, item)
  } else if (data && typeof data === 'object' && Array.isArray(data.gangs)) {
    for (const g of data.gangs) {
      const label = g && typeof g === 'object' ? pickField(g, [...GANG_KEYS, 'name']) : ''
      const list = listOf(g) ?? []
      for (const item of list) add(label || null, item)
    }
  } else if (data && typeof data === 'object') {
    // { "gang name or slug": [ players ] }
    for (const [label, value] of Object.entries(data)) {
      const list = listOf(value)
      if (!list) continue
      for (const item of list) add(label, item)
    }
  }

  if (groups.size === 0) throw new Error('No players found. See the example for the expected format.')

  // drop duplicate names inside each group (last one wins)
  const result = [...groups.entries()].map(([gang, players]) => {
    const byName = new Map()
    for (const p of players) byName.set(p.name.toLowerCase(), p)
    return { gang: gang || null, players: [...byName.values()], duplicates: players.length - byName.size }
  })
  return { groups: result, skipped }
}

/** Finds the gang a label refers to, by address (slug) or by name. */
export function matchGang(label, gangs) {
  if (!label) return null
  const key = slugify(label)
  return gangs.find((g) => g.slug === key || slugify(g.name) === key || g.name.toLowerCase() === label.toLowerCase()) ?? null
}

/** Merges imported players into a list: same name → updated, new name → added. */
export function mergePlayers(current, incoming, mode) {
  if (mode === 'replace') return { list: incoming, added: incoming.length, updated: 0 }
  const list = current.map((m) => ({ ...m }))
  const index = new Map(list.map((m, i) => [m.name.trim().toLowerCase(), i]))
  let added = 0
  let updated = 0
  for (const p of incoming) {
    const key = p.name.trim().toLowerCase()
    if (index.has(key)) {
      list[index.get(key)] = { ...list[index.get(key)], ...p }
      updated += 1
    } else {
      index.set(key, list.length)
      list.push(p)
      added += 1
    }
  }
  return { list, added, updated }
}

export const EXAMPLE_JSON = JSON.stringify(
  {
    'harbor-wolves': [
      { name: 'Mara Voss', role: 'Leader', since: '2026' },
      { name: 'Dex Hollow', role: 'Enforcer', since: '2026' },
      'Juno Park',
    ],
    'Ash Kings': [{ player: 'Theo Grant', rank: 'Boss' }],
  },
  null,
  2,
)
