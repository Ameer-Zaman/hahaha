import { env } from '../config/env.js'

export function notFound(req, res) {
  res.status(404).json({ message: 'Not found.' })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'value'
    return res.status(409).json({ message: `That ${field} is already in use.` })
  }
  if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id.' })
  if (err?.name === 'ValidationError') return res.status(400).json({ message: err.message })
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'That file is too large.' })
  if (err?.status && err.status < 500) return res.status(err.status).json({ message: err.message })
  console.error(err)
  res.status(500).json({ message: env.isProd ? 'Something went wrong.' : String(err?.message ?? err) })
}

/** Throw from a handler to answer with a 4xx and a readable message. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
