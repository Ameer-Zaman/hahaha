/**
 * Environment configuration. Read once at start-up and fail fast on anything missing or
 * unsafe, so the server never runs half-configured.
 */
const isProd = process.env.NODE_ENV === 'production'

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable ${name} (see server/.env.example)`)
  return value
}

const jwtSecret = required('JWT_SECRET')
if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long')

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required('MONGODB_URI'),
  jwtSecret,
  /** How long a login lasts. */
  sessionHours: Number(process.env.SESSION_HOURS ?? 12),
  /** Website origins allowed to call the API (comma-separated), e.g. https://shyastha.netlify.app */
  allowedOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
  /** Number of proxies in front of the server (Render = 1, Netlify proxy → Render = 2). */
  trustProxy: Number(process.env.TRUST_PROXY ?? 1),
  /** Only used once, to create the first Super Admin when the database has no accounts. */
  bootstrap: {
    email: process.env.SUPERADMIN_EMAIL ?? '',
    password: process.env.SUPERADMIN_PASSWORD ?? '',
    name: process.env.SUPERADMIN_NAME ?? 'Super Admin',
  },
  uploads: {
    imageMaxBytes: Number(process.env.IMAGE_MAX_MB ?? 5) * 1024 * 1024,
    videoMaxBytes: Number(process.env.VIDEO_MAX_MB ?? 60) * 1024 * 1024,
  },
}
