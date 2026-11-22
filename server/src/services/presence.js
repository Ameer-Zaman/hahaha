/**
 * How many people have the website open right now, for the panel's dashboard.
 *
 * Each open tab of the public website makes up a random code for itself and checks in every
 * 30 seconds with that code and the page it's on. That's all that's kept, and only in memory:
 * no name, no address, no cookie, nothing written to the database. A tab that stops checking
 * in (closed, or asleep in the background) drops off after TTL_MS. A restart starts from zero.
 */
const TTL_MS = 90 * 1000
const MAX_TABS = 5000 // a ceiling, so a flood of made-up codes can't eat the server's memory
const DAY_MS = 24 * 60 * 60 * 1000

const tabs = new Map() // code → { path, seen }
const startedAt = Date.now()
const minutes = [] // [{ at, count }] the highest count of each minute, for the last day

function sweep(now = Date.now()) {
  for (const [id, t] of tabs) if (now - t.seen > TTL_MS) tabs.delete(id)
}

function record(now = Date.now()) {
  const count = tabs.size
  const minute = Math.floor(now / 60000) * 60000
  const last = minutes[minutes.length - 1]
  if (last?.at === minute) last.count = Math.max(last.count, count)
  else minutes.push({ at: minute, count })
  while (minutes.length && now - minutes[0].at > DAY_MS) minutes.shift()
}

/** A tab checking in (or saying goodbye, with leave). */
export function checkIn(id, path, leave = false) {
  const now = Date.now()
  if (leave) tabs.delete(id)
  else if (tabs.has(id) || tabs.size < MAX_TABS) tabs.set(id, { path, seen: now })
  sweep(now)
  record(now)
}

/** The panel's view: how many now, on which pages, and the busiest moment of the last day. */
export function snapshot() {
  const now = Date.now()
  sweep(now)
  record(now)
  const byPath = new Map()
  for (const t of tabs.values()) byPath.set(t.path, (byPath.get(t.path) ?? 0) + 1)
  const pages = [...byPath]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path))
    .slice(0, 8)
  // the last hour, minute by minute (minutes nobody checked in count as zero)
  const hour = []
  const thisMinute = Math.floor(now / 60000) * 60000
  const seen = new Map(minutes.map((m) => [m.at, m.count]))
  for (let i = 59; i >= 0; i--) hour.push(seen.get(thisMinute - i * 60000) ?? 0)
  const peak = minutes.reduce((best, m) => (m.count >= best.count ? m : best), { count: 0, at: 0 })
  return {
    now: tabs.size,
    pages,
    peak: peak.count ? { count: peak.count, at: peak.at } : null, // the busiest minute of the last day
    lastHour: hour,
    since: startedAt, // counting started when the server last started (it keeps nothing across restarts)
    at: now,
  }
}
