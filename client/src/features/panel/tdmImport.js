/**
 * Reads TDM results pasted as JSON or CSV (e.g. copied from a spreadsheet).
 *
 * JSON:  [ { "name": "Mara", "kills": 12, "deaths": 4, "wins": 3, "matches": 5 }, … ]
 *        or { "players": [ … ] }
 * CSV:   name,kills,deaths,wins,matches        (header optional; tabs or ; work too)
 *        Mara,12,4,3,5
 *
 * Field names are forgiving: player/ign/username for the name, k/kill for kills,
 * d/death for deaths, w/win for wins, games/played/m for matches.
 */
const FIELDS = {
  name: ['name', 'player', 'playername', 'ign', 'username', 'character'],
  kills: ['kills', 'kill', 'k'],
  deaths: ['deaths', 'death', 'd'],
  wins: ['wins', 'win', 'w'],
  matches: ['matches', 'match', 'games', 'played', 'm'],
}
const ORDER = ['name', 'kills', 'deaths', 'wins', 'matches']
const norm = (k) => String(k).toLowerCase().replace(/[\s_-]/g, '')
const fieldOf = (key) => Object.keys(FIELDS).find((f) => FIELDS[f].includes(norm(key)))
const toInt = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, '').trim())
  return Number.isFinite(n) && n >= 0 ? Math.min(1_000_000, Math.floor(n)) : 0
}

function fromObject(obj) {
  const row = { name: '', kills: 0, deaths: 0, wins: 0, matches: 0 }
  for (const [k, v] of Object.entries(obj ?? {})) {
    const f = fieldOf(k)
    if (!f) continue
    row[f] = f === 'name' ? String(v ?? '').trim().slice(0, 60) : toInt(v)
  }
  return row.name ? row : null
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ','
  const cells = lines.map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, '')))
  const header = cells[0].map(fieldOf)
  const hasHeader = header.includes('name')
  const columns = hasHeader ? header : ORDER
  return cells.slice(hasHeader ? 1 : 0).map((row) => fromObject(Object.fromEntries(columns.map((f, i) => [f ?? `x${i}`, row[i]]))))
}

/** Returns { players, skipped }. Duplicate names: the last one wins. */
export function parseTdm(text) {
  const trimmed = text.trim()
  if (!trimmed) return { players: [], skipped: 0 }
  let rows
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    let data
    try {
      data = JSON.parse(trimmed)
    } catch (err) {
      throw new Error(`That isn't valid JSON: ${err.message}`)
    }
    const list = Array.isArray(data) ? data : Array.isArray(data?.players) ? data.players : null
    if (!list) throw new Error('Expected a list of players, or { "players": [ … ] }.')
    rows = list.map((item) => (typeof item === 'string' ? fromObject({ name: item }) : fromObject(item)))
  } else {
    rows = parseCsv(trimmed)
  }
  const byName = new Map()
  let skipped = 0
  for (const r of rows) {
    if (!r) skipped += 1
    else byName.set(r.name.toLowerCase(), r)
  }
  return { players: [...byName.values()], skipped }
}

/** Merges imported rows into the current list: same name (any case) is updated, new names added. */
export function mergeTdm(current, incoming) {
  const out = current.map((p) => ({ ...p }))
  for (const row of incoming) {
    const i = out.findIndex((p) => p.name.toLowerCase() === row.name.toLowerCase())
    if (i >= 0) out[i] = { ...out[i], ...row }
    else out.push(row)
  }
  return out
}
