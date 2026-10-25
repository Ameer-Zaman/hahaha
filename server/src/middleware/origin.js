import { env } from '../config/env.js'

/**
 * CSRF guard for state-changing requests: the browser's Origin (or Referer) must be one of
 * the website's own origins. Together with SameSite cookies, a page on another site cannot
 * make changes on an admin's behalf.
 */
export function checkOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  let origin = req.get('origin') ?? null
  if (!origin && req.get('referer')) {
    try {
      origin = new URL(req.get('referer')).origin
    } catch {
      origin = null
    }
  }
  if (!origin || !env.allowedOrigins.includes(origin.replace(/\/$/, ''))) {
    return res.status(403).json({ message: 'Request blocked: unknown origin.' })
  }
  next()
}
