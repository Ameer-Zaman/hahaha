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

/** "a, b ,c" → ['a', 'b', 'c'] */
const list = (value) =>
  String(value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

/**
 * The free AI services for the rules helper, all speaking the same (OpenAI-style) language.
 * Models can be changed with <NAME>_MODELS (comma-separated, tried in order) when a service
 * renames them. *_API_BASE overrides are for tests only.
 */
function aiProviders() {
  const env = process.env
  const cfAccount = env.CLOUDFLARE_ACCOUNT_ID ?? ''
  const all = [
    {
      id: 'groq',
      name: 'Groq',
      keyName: 'GROQ_API_KEY',
      key: env.GROQ_API_KEY ?? '',
      base: env.GROQ_API_BASE ?? 'https://api.groq.com/openai/v1',
      // GROQ_MODEL / GROQ_FALLBACK_MODEL still work
      models: list(
        env.GROQ_MODELS ?? [env.GROQ_MODEL ?? 'openai/gpt-oss-120b', env.GROQ_FALLBACK_MODEL ?? 'llama-3.1-8b-instant'].join(','),
      ),
    },
    {
      id: 'cerebras',
      name: 'Cerebras',
      keyName: 'CEREBRAS_API_KEY',
      key: env.CEREBRAS_API_KEY ?? '',
      base: env.CEREBRAS_API_BASE ?? 'https://api.cerebras.ai/v1',
      models: list(env.CEREBRAS_MODELS ?? 'gpt-oss-120b,llama3.1-8b'),
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      keyName: 'OPENROUTER_API_KEY',
      key: env.OPENROUTER_API_KEY ?? '',
      base: env.OPENROUTER_API_BASE ?? 'https://openrouter.ai/api/v1',
      models: list(env.OPENROUTER_MODELS ?? 'openrouter/free'),
      headers: { 'X-Title': env.SITE_NAME ?? 'Rameirah Empire' },
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare Workers AI',
      keyName: 'CLOUDFLARE_AI_TOKEN',
      key: cfAccount ? (env.CLOUDFLARE_AI_TOKEN ?? '') : '',
      base: env.CLOUDFLARE_AI_BASE ?? `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/v1`,
      models: list(env.CLOUDFLARE_AI_MODELS ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
    },
    {
      id: 'mistral',
      name: 'Mistral',
      keyName: 'MISTRAL_API_KEY',
      key: env.MISTRAL_API_KEY ?? '',
      base: env.MISTRAL_API_BASE ?? 'https://api.mistral.ai/v1',
      models: list(env.MISTRAL_MODELS ?? 'mistral-small-latest'),
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      keyName: 'GEMINI_API_KEY',
      key: env.GEMINI_API_KEY ?? '',
      base: env.GEMINI_API_BASE ?? 'https://generativelanguage.googleapis.com/v1beta/openai',
      models: list(env.GEMINI_MODELS ?? 'gemini-flash-latest'),
    },
  ].map((p) => ({ headers: {}, ...p, base: p.base.replace(/\/$/, '') }))
  const order = list(env.AI_ORDER).map((o) => o.toLowerCase())
  if (!order.length) return all
  return [...order.map((id) => all.find((p) => p.id === id)).filter(Boolean), ...all.filter((p) => !order.includes(p.id))]
}

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
   * Rules helper AI (optional, free): the website chat answers rule questions in plain words,
   * using only the published rule book. Each service below is used only when its key is set,
   * in this order (or AI_ORDER); when one runs out of free uses the next one answers, and when
   * all are out the chat goes back to the normal rule search by itself.
   */
  ai: { providers: aiProviders() },

  /**
   * Creators page live checks (optional, all free). A platform without its keys isn't checked.
   * *_BASE overrides are for tests only.
   */
  creators: {
    twitchId: process.env.TWITCH_CLIENT_ID ?? '',
    twitchSecret: process.env.TWITCH_CLIENT_SECRET ?? '',
    kickId: process.env.KICK_CLIENT_ID ?? '',
    kickSecret: process.env.KICK_CLIENT_SECRET ?? '',
    youtubeKey: process.env.YOUTUBE_API_KEY ?? '',
    twitchAuthBase: process.env.TWITCH_AUTH_BASE ?? 'https://id.twitch.tv',
    twitchApiBase: process.env.TWITCH_API_BASE ?? 'https://api.twitch.tv',
    kickAuthBase: process.env.KICK_AUTH_BASE ?? 'https://id.kick.com',
    kickApiBase: process.env.KICK_API_BASE ?? 'https://api.kick.com',
    youtubeApiBase: process.env.YOUTUBE_API_BASE ?? 'https://www.googleapis.com/youtube/v3',
    kickSiteBase: process.env.KICK_SITE_BASE ?? 'https://kick.com',
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
