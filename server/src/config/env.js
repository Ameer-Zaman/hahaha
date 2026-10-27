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
   * Website chat (optional). AI answers with ANTHROPIC_API_KEY; "Talk to staff" opens a thread
   * in a Discord channel with DISCORD_BOT_TOKEN + DISCORD_CHAT_CHANNEL_ID. Without them the chat
   * still works, it just says that part isn't available.
   */
  chat: {
    siteName: process.env.SITE_NAME ?? 'Rameirah Empire',
    discordInvite: process.env.PUBLIC_DISCORD_INVITE ?? 'https://discord.gg/Dtd3DSej6',
    aiKey: process.env.ANTHROPIC_API_KEY ?? '',
    aiModel: process.env.CHAT_AI_MODEL ?? 'claude-haiku-5-5',
    aiDailyLimit: Number(process.env.CHAT_AI_DAILY_LIMIT ?? 600),
    // overridable for tests only
    aiBase: (process.env.CHAT_AI_BASE ?? 'https://api.anthropic.com').replace(/\/$/, ''),
    discordToken: process.env.DISCORD_BOT_TOKEN ?? '',
    discordChannelId: process.env.DISCORD_CHAT_CHANNEL_ID ?? '',
    discordStaffRoleId: process.env.DISCORD_STAFF_ROLE_ID ?? '',
  },
  uploads: {
    // Cloudinary's free plan allows 10 MB images and 100 MB videos; the database is smaller
    imageMaxBytes: Number(process.env.IMAGE_MAX_MB ?? (cloudinary.enabled ? 10 : 5)) * 1024 * 1024,
    videoMaxBytes: Number(process.env.VIDEO_MAX_MB ?? (cloudinary.enabled ? 100 : 60)) * 1024 * 1024,
  },
}
