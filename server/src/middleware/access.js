import { PANEL_AREAS } from '../models/User.js'

/**
 * Which panel areas an account may open. Super Admins: all of them. Admins: the ones a Super
 * Admin ticked for them in Panel → Accounts (an account that has never been set: all, so
 * nobody was locked out when this arrived). Checked on the server for every request — the
 * panel only hides what the server would refuse anyway.
 */
export function canOpen(user, area) {
  if (!user) return false
  if (user.role === 'superadmin') return true
  if (!Array.isArray(user.access)) return true
  return user.access.includes(area)
}

const refuse = (res) =>
  res.status(403).json({ message: 'A Super Admin has not given your account this part of the panel.', code: 'area_closed' })

/** Lets the request through when the account may open any one of these areas. */
export function requireArea(...areas) {
  for (const a of areas) if (!PANEL_AREAS.includes(a)) throw new Error(`Unknown panel area: ${a}`)
  return (req, res, next) => (areas.some((a) => canOpen(req.user, a)) ? next() : refuse(res))
}

/**
 * Reading is open to more areas than changing: e.g. the gang list feeds the Wars and Live
 * screens' pickers. `read` areas may only GET; everything else needs `write`.
 */
export function areaGate(write, read = []) {
  const all = [write, ...read]
  for (const a of all) if (!PANEL_AREAS.includes(a)) throw new Error(`Unknown panel area: ${a}`)
  return (req, res, next) => {
    if (canOpen(req.user, write)) return next()
    if (req.method === 'GET' && read.some((a) => canOpen(req.user, a))) return next()
    return refuse(res)
  }
}
