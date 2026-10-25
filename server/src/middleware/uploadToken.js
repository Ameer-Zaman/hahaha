import jwt from 'jsonwebtoken'

import { env } from '../config/env.js'
import { User } from '../models/User.js'

/**
 * Large files can go straight to the API server instead of through the website's /api proxy
 * (Netlify cuts proxied requests off after 26 seconds). The signed-in panel asks for a
 * short-lived upload token, then sends the file with it. The token only allows uploading.
 */
const PURPOSE = 'upload'
const TTL_SECONDS = 10 * 60

export function issueUploadToken(user) {
  const token = jwt.sign({ sub: user._id.toString(), tv: user.tokenVersion, purpose: PURPOSE }, env.jwtSecret, {
    expiresIn: TTL_SECONDS,
  })
  return { token, expiresIn: TTL_SECONDS }
}

export async function authenticateUpload(req, res, next) {
  const header = req.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  let payload
  try {
    payload = jwt.verify(token, env.jwtSecret)
  } catch {
    return res.status(401).json({ message: 'Upload link expired. Try again.' })
  }
  if (payload.purpose !== PURPOSE) return res.status(401).json({ message: 'Invalid upload token.' })
  const user = await User.findById(payload.sub)
  if (!user || !user.active || user.tokenVersion !== payload.tv || !['admin', 'superadmin'].includes(user.role)) {
    return res.status(401).json({ message: 'Please sign in again.' })
  }
  req.user = user
  next()
}
