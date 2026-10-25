import jwt from 'jsonwebtoken'

import { env } from '../config/env.js'
import { User } from '../models/User.js'

export const SESSION_COOKIE = 'shy_session'

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: env.sessionHours * 60 * 60 * 1000,
  }
}

export function issueSession(res, user) {
  const token = jwt.sign({ sub: user._id.toString(), tv: user.tokenVersion }, env.jwtSecret, {
    expiresIn: `${env.sessionHours}h`,
  })
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions())
}

export function clearSession(res) {
  const { maxAge: _maxAge, ...opts } = sessionCookieOptions()
  res.clearCookie(SESSION_COOKIE, opts)
}

/**
 * Loads the signed-in account from the session cookie. The account is re-read from the
 * database on every request, so disabling an account or changing its role or password takes
 * effect immediately.
 */
export async function authenticate(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!token) return res.status(401).json({ message: 'Please sign in.' })
  let payload
  try {
    payload = jwt.verify(token, env.jwtSecret)
  } catch {
    clearSession(res)
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
  }
  const user = await User.findById(payload.sub)
  if (!user || !user.active || user.tokenVersion !== payload.tv) {
    clearSession(res)
    return res.status(401).json({ message: 'Please sign in.' })
  }
  req.user = user
  next()
}

/** Deny by default: only the listed roles get through. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do that.' })
    }
    next()
  }
}
