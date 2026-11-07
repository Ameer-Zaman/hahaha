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

/**
 * Cloudinary (optional): CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>,
 * or the three CLOUDINARY_* variables. When set, uploads go to Cloudinary; otherwise they
 * are stored in the database (GridFS) as before.
 */
function cloudinaryConfig() {
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? ''
  let apiKey = process.env.CLOUDINARY_API_KEY ?? ''
  let apiSecret = process.env.CLOUDINARY_API_SECRET ?? ''
  const url = process.env.CLOUDINARY_URL
  if (url) {
    const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url.trim())
    if (!m) throw new Error('CLOUDINARY_URL must look like cloudinary://<api_key>:<api_secret>@<cloud_name>')
    ;[, apiKey, apiSecret, cloudName] = m
  }
  const enabled = Boolean(cloudName && apiKey && apiSecret)
  return {
    enabled,
    cloudName,
    apiKey,
    apiSecret,
    folder: (process.env.CLOUDINARY_FOLDER ?? 'shyastha').replace(/^\/+|\/+$/g, ''),
    // overridable for tests only
    apiBase: (process.env.CLOUDINARY_API_BASE ?? 'https://api.cloudinary.com').replace(/\/$/, ''),
    deliveryBase: (process.env.CLOUDINARY_DELIVERY_BASE ?? 'https://res.cloudinary.com').replace(/\/$/, ''),
  }
}
const cloudinary = cloudinaryConfig()

const jwtSecret = required('JWT_SECRET')
if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long')

export const env = {
  isProd,
  /** Shown in an authenticator app next to the six digits, so the entry is recognisable. */
  siteName: process.env.SITE_NAME ?? 'Rameirah Empire',
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
  cloudinary,
  /**
   * Website chat → Discord (optional): when a visitor can't find a rule, "Ask staff" opens a
   * thread in a Discord channel. Needs DISCORD_BOT_TOKEN + DISCORD_CHAT_CHANNEL_ID.
   */
  chat: {
    discordInvite: process.env.PUBLIC_DISCORD_INVITE ?? 'https://discord.gg/Dtd3DSej6',
    discordToken: process.env.DISCORD_BOT_TOKEN ?? '',
    discordChannelId: process.env.DISCORD_CHAT_CHANNEL_ID ?? '',
    discordStaffRoleId: process.env.DISCORD_STAFF_ROLE_ID ?? '',
  },

  /**
   * Rules helper AI (optional): with GROQ_API_KEY set, the website chat answers rule questions
   * in plain words, using only the published rule book. When Groq is down or its free daily
   * limit is used up, the chat goes back to the normal rule search by itself.
   */
  ai: {
    groqKey: process.env.GROQ_API_KEY ?? '',
    model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b',
    fallbackModel: process.env.GROQ_FALLBACK_MODEL ?? 'llama-3.1-8b-instant',
    // overridable for tests only
    apiBase: (process.env.GROQ_API_BASE ?? 'https://api.groq.com/openai/v1').replace(/\/$/, ''),
  },

  /**
   * Admin-panel sign-in alerts to Discord (optional): a message in a staff channel every time
   * someone signs into /panel, and on failed attempts, with the IP, rough location and device.
   * Needs the Discord bot above. Posts to DISCORD_SECURITY_CHANNEL_ID, or the chat channel when
   * that is unset. Turn the whole thing off with LOGIN_ALERTS=off, or the IP location lookup
   * (a call to a free geo service) with IP_GEO_LOOKUP=off.
   */
  security: {
    alertChannelId: process.env.DISCORD_SECURITY_CHANNEL_ID ?? '',
    loginAlerts: (process.env.LOGIN_ALERTS ?? 'on').toLowerCase() !== 'off',
    geoLookup: (process.env.IP_GEO_LOOKUP ?? 'on').toLowerCase() !== 'off',
  },
  uploads: {
    // Cloudinary's free plan allows 10 MB images and 100 MB videos; the database is smaller
    imageMaxBytes: Number(process.env.IMAGE_MAX_MB ?? (cloudinary.enabled ? 10 : 5)) * 1024 * 1024,
    videoMaxBytes: Number(process.env.VIDEO_MAX_MB ?? (cloudinary.enabled ? 100 : 60)) * 1024 * 1024,
  },
}
