import { createHash } from 'node:crypto'

import { env } from '../config/env.js'
import { HttpError } from '../middleware/errors.js'

/**
 * Talks to Cloudinary with plain HTTPS (no SDK): signs browser uploads, verifies what
 * Cloudinary says was uploaded, reads a file's real details, deletes files, and builds
 * delivery addresses.
 */
const c = () => env.cloudinary

export const ALLOWED_FORMATS = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  video: ['mp4', 'webm', 'mov'],
}

/** Cloudinary's signature: params sorted by name, "k=v" joined with &, plus the secret, SHA-1. */
export function signParams(params, secret = c().apiSecret) {
  const base = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return createHash('sha1').update(base + secret).digest('hex')
}

/** What the panel needs to upload one file straight to Cloudinary (valid for ~1 hour). */
export function uploadTicket(kind) {
  const params = {
    timestamp: Math.floor(Date.now() / 1000),
    folder: c().folder,
    allowed_formats: ALLOWED_FORMATS[kind].join(','),
  }
  return {
    uploadUrl: `${c().apiBase}/v1_1/${c().cloudName}/${kind}/upload`,
    apiKey: c().apiKey,
    ...params,
    signature: signParams(params),
  }
}

/** Cloudinary signs its upload answer with public_id + version; check it really came from it. */
export function verifyUploadSignature({ publicId, version, signature }) {
  const expected = createHash('sha1').update(`public_id=${publicId}&version=${version}${c().apiSecret}`).digest('hex')
  return typeof signature === 'string' && signature.length === expected.length && signature === expected
}

const basicAuth = () => `Basic ${Buffer.from(`${c().apiKey}:${c().apiSecret}`).toString('base64')}`

/** The file's real details, straight from Cloudinary's Admin API. */
export async function fetchResource(resourceType, publicId) {
  const url = `${c().apiBase}/v1_1/${c().cloudName}/resources/${resourceType}/upload/${publicId.split('/').map(encodeURIComponent).join('/')}`
  const res = await fetch(url, { headers: { Authorization: basicAuth() } })
  if (res.status === 404) throw new HttpError(400, 'Cloudinary has no such file.')
  if (!res.ok) throw new HttpError(502, `Cloudinary answered ${res.status}.`)
  return res.json()
}

export async function destroy(resourceType, publicId) {
  const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000), invalidate: 'true' }
  const body = new URLSearchParams({ ...params, api_key: c().apiKey, signature: signParams(params) })
  const res = await fetch(`${c().apiBase}/v1_1/${c().cloudName}/${resourceType}/destroy`, { method: 'POST', body })
  if (!res.ok) throw new HttpError(502, `Cloudinary couldn't delete the file (${res.status}).`)
  const data = await res.json().catch(() => ({}))
  if (data.result && !['ok', 'not found'].includes(data.result)) throw new HttpError(502, `Cloudinary: ${data.result}`)
}

/**
 * The address visitors load. Images get automatic format (AVIF/WebP) and quality, capped at
 * 2400 px wide; videos are delivered as uploaded (instant, no processing wait).
 */
export function deliveryUrl(m, { thumb = false } = {}) {
  const base = `${c().deliveryBase}/${c().cloudName}/${m.resourceType}/upload`
  const file = `v${m.version}/${m.publicId}`
  if (m.resourceType === 'image') return `${base}/${thumb ? 'f_auto,q_auto,c_limit,w_480' : 'f_auto,q_auto,c_limit,w_2400'}/${file}`
  if (thumb) return `${base}/so_0,c_limit,w_480/${file}.jpg` // a still from the first frame
  return `${base}/${file}.${m.format || 'mp4'}`
}
