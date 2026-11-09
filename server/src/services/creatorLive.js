import { env } from '../config/env.js'
import { Creator } from '../models/Creator.js'

/**
 * Live checks for the Creators page, with each platform's own free API:
 *   Twitch  — TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET (dev.twitch.tv → Console → Applications)
 *   Kick    — KICK_CLIENT_ID + KICK_CLIENT_SECRET (kick.com → Settings → Developer)
 *   YouTube — YOUTUBE_API_KEY (Google Cloud → YouTube Data API v3)
 * A platform without keys is simply not checked, and the website says so; nothing is guessed.
 * Twitch and Kick are checked every 90 seconds, YouTube every 5 minutes (its daily quota).
 */

const FAST_MS = 90_000
const YOUTUBE_MS = 5 * 60_000
const TIMEOUT_MS = 8_000

const tokens = {} // platform → { value, expires }
const lastRun = { fast: 0, youtube: 0 }
let running = null

export function liveSupport() {
  return {
    twitch: Boolean(env.creators.twitchId && env.creators.twitchSecret),
    kick: Boolean(env.creators.kickId && env.creators.kickSecret),
    youtube: Boolean(env.creators.youtubeKey),
  }
}

/** The channel name in a link: twitch.tv/<name>, kick.com/<name>, youtube.com/@name or /channel/UC… */
export function channelOf(platform, link) {
  if (!link) return ''
  try {
    const url = new URL(link)
    const parts = url.pathname.split('/').filter(Boolean)
    if (platform === 'twitch' || platform === 'kick') return (parts[0] ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (platform === 'youtube') {
      if (parts[0]?.startsWith('@')) return parts[0]
      if (parts[0] === 'channel' && parts[1]) return parts[1]
      if ((parts[0] === 'c' || parts[0] === 'user') && parts[1]) return `@${parts[1]}`
      return ''
    }
  } catch {
    /* not a link */
  }
  return ''
}

async function getJson(url, init = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok) {
      const err = new Error(`${res.status}`)
      err.status = res.status
      throw err
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

async function appToken(platform, url, id, secret) {
  const t = tokens[platform]
  if (t && t.expires > Date.now() + 60_000) return t.value
  const body = new URLSearchParams({ client_id: id, client_secret: secret, grant_type: 'client_credentials' })
  const data = await getJson(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body })
  tokens[platform] = { value: data.access_token, expires: Date.now() + (Number(data.expires_in) || 3600) * 1000 }
  return data.access_token
}

/** Twitch: who of these is live (up to 100 per call). */
async function twitchLive(logins) {
  const found = new Map()
  if (!logins.length) return found
  const { twitchId, twitchSecret } = env.creators
  const token = await appToken('twitch', `${env.creators.twitchAuthBase}/oauth2/token`, twitchId, twitchSecret)
  for (let i = 0; i < logins.length; i += 100) {
    const q = logins
      .slice(i, i + 100)
      .map((l) => `user_login=${encodeURIComponent(l)}`)
      .join('&')
    const data = await getJson(`${env.creators.twitchApiBase}/helix/streams?${q}`, {
      headers: { 'Client-Id': twitchId, authorization: `Bearer ${token}` },
    })
    for (const s of data.data ?? []) {
      if (s.type !== 'live') continue
      found.set(String(s.user_login).toLowerCase(), {
        title: s.title ?? '',
        viewers: Number(s.viewer_count) || 0,
        startedAt: s.started_at ? new Date(s.started_at) : null,
        url: `https://www.twitch.tv/${s.user_login}`,
      })
    }
  }
  return found
}

/** Kick (official public API): one channel at a time. */
async function kickLive(slugs) {
  const found = new Map()
  if (!slugs.length) return found
  const { kickId, kickSecret } = env.creators
  const token = await appToken('kick', `${env.creators.kickAuthBase}/oauth/token`, kickId, kickSecret)
  for (const slug of slugs) {
    try {
      const data = await getJson(`${env.creators.kickApiBase}/public/v1/channels?slug=${encodeURIComponent(slug)}`, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      })
      const ch = (data.data ?? [])[0]
      const stream = ch?.stream
      if (stream?.is_live) {
        found.set(slug, {
          title: ch.stream_title ?? '',
          viewers: Number(stream.viewer_count) || 0,
          startedAt: stream.start_time ? new Date(stream.start_time) : null,
          url: `https://kick.com/${ch.slug ?? slug}`,
        })
      }
    } catch (err) {
      if (err.status === 401) delete tokens.kick
      throw err
    }
  }
  return found
}

/** YouTube: find each channel's uploads list once, then look at its newest videos for one that's live. */
async function youtubeLive(creators) {
  const found = new Map()
  const key = env.creators.youtubeKey
  const base = env.creators.youtubeApiBase
  const latest = [] // { creatorId, videoId }
  for (const c of creators) {
    const link = c.links.youtube
    let { channelId, uploads, source } = c.youtube ?? {}
    if (source !== link || !uploads) {
      const ref = channelOf('youtube', link)
      if (!ref) continue
      const q = ref.startsWith('@') ? `forHandle=${encodeURIComponent(ref)}` : `id=${encodeURIComponent(ref)}`
      const data = await getJson(`${base}/channels?part=contentDetails&${q}&key=${key}`)
      const item = (data.items ?? [])[0]
      channelId = item?.id ?? ''
      uploads = item?.contentDetails?.relatedPlaylists?.uploads ?? ''
      await Creator.updateOne({ _id: c._id }, { youtube: { source: link, channelId, uploads } })
      if (!uploads) continue
    }
    const list = await getJson(
      `${base}/playlistItems?part=contentDetails&maxResults=3&playlistId=${encodeURIComponent(uploads)}&key=${key}`,
    )
    for (const it of list.items ?? []) latest.push({ creatorId: String(c._id), videoId: it.contentDetails?.videoId })
  }
  const ids = latest.filter((l) => l.videoId)
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50)
    const data = await getJson(`${base}/videos?part=snippet,liveStreamingDetails&id=${chunk.map((l) => l.videoId).join(',')}&key=${key}`)
    for (const v of data.items ?? []) {
      if (v.snippet?.liveBroadcastContent !== 'live') continue
      const owner = chunk.find((l) => l.videoId === v.id)
      if (!owner || found.has(owner.creatorId)) continue
      found.set(owner.creatorId, {
        title: v.snippet.title ?? '',
        viewers: Number(v.liveStreamingDetails?.concurrentViewers) || 0,
        startedAt: v.liveStreamingDetails?.actualStartTime ? new Date(v.liveStreamingDetails.actualStartTime) : null,
        url: `https://www.youtube.com/watch?v=${v.id}`,
      })
    }
  }
  return found
}

const lastErrors = {} // platform → message, for the panel

/**
 * Checks everyone who's due and saves what it finds. Safe to call often: it does nothing until
 * a check is due, and runs one at a time.
 */
export function refreshLive({ force = false } = {}) {
  if (running) return running
  running = run(force).finally(() => {
    running = null
  })
  return running
}

async function run(force) {
  const now = Date.now()
  const support = liveSupport()
  const doFast = force || now - lastRun.fast >= FAST_MS
  const doYoutube = support.youtube && (force || now - lastRun.youtube >= YOUTUBE_MS)
  if (!doFast && !doYoutube) return
  const creators = await Creator.find({ visible: true }, 'links youtube live').lean()
  if (!creators.length) return

  const results = { twitch: null, kick: null, youtube: null } // null = not checked this time
  const tasks = []
  if (doFast) {
    lastRun.fast = now
    if (support.twitch) {
      const logins = [...new Set(creators.map((c) => channelOf('twitch', c.links?.twitch)).filter(Boolean))]
      tasks.push(
        twitchLive(logins)
          .then((m) => ((results.twitch = m), delete lastErrors.twitch))
          .catch((e) => (lastErrors.twitch = `Twitch check failed (${e.message})`)),
      )
    }
    if (support.kick) {
      const slugs = [...new Set(creators.map((c) => channelOf('kick', c.links?.kick)).filter(Boolean))]
      tasks.push(
        kickLive(slugs)
          .then((m) => ((results.kick = m), delete lastErrors.kick))
          .catch((e) => (lastErrors.kick = `Kick check failed (${e.message})`)),
      )
    }
  }
  if (doYoutube) {
    lastRun.youtube = now
    tasks.push(
      youtubeLive(creators.filter((c) => c.links?.youtube))
        .then((m) => ((results.youtube = m), delete lastErrors.youtube))
        .catch((e) => (lastErrors.youtube = `YouTube check failed (${e.message})`)),
    )
  }
  await Promise.all(tasks)

  const checkedAt = new Date()
  const writes = []
  for (const c of creators) {
    const hits = []
    const tw = channelOf('twitch', c.links?.twitch)
    const kk = channelOf('kick', c.links?.kick)
    // a platform not checked this round keeps what it last said
    const keep = (platform) => (c.live?.on && c.live.platform === platform ? { ...c.live } : null)
    if (tw && support.twitch)
      hits.push(results.twitch ? results.twitch.get(tw) && { platform: 'twitch', ...results.twitch.get(tw) } : keep('twitch'))
    if (kk && support.kick) hits.push(results.kick ? results.kick.get(kk) && { platform: 'kick', ...results.kick.get(kk) } : keep('kick'))
    if (c.links?.youtube && support.youtube) {
      const y = results.youtube ? results.youtube.get(String(c._id)) : undefined
      hits.push(results.youtube ? y && { platform: 'youtube', ...y } : keep('youtube'))
    }
    const best = hits.filter(Boolean).sort((a, b) => (b.viewers ?? 0) - (a.viewers ?? 0))[0]
    const live = best
      ? {
          on: true,
          platform: best.platform,
          title: String(best.title).slice(0, 200),
          viewers: best.viewers ?? 0,
          url: best.url,
          startedAt: best.startedAt ?? null,
          checkedAt,
        }
      : { on: false, platform: '', title: '', viewers: 0, url: '', startedAt: null, checkedAt }
    writes.push({ updateOne: { filter: { _id: c._id }, update: { live } } })
  }
  if (writes.length) await Creator.bulkWrite(writes)
}

/* ---------------- channel numbers and pictures (every 10 minutes) ---------------- */

const STATS_MS = 10 * 60_000
let statsRun = 0
let statsRunning = null

const num = (v) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

/** YouTube: subscribers (YouTube's own rounded public number), profile picture and banner. */
async function youtubeStats(creators) {
  const key = env.creators.youtubeKey
  const base = env.creators.youtubeApiBase
  const out = new Map() // creator id → stats
  const byChannel = new Map() // channel id → creator ids
  for (const c of creators) {
    const link = c.links.youtube
    let channelId = c.youtube?.source === link ? c.youtube.channelId : ''
    if (!channelId) {
      const ref = channelOf('youtube', link)
      if (!ref) continue
      const q = ref.startsWith('@') ? `forHandle=${encodeURIComponent(ref)}` : `id=${encodeURIComponent(ref)}`
      const data = await getJson(`${base}/channels?part=contentDetails&${q}&key=${key}`)
      const item = (data.items ?? [])[0]
      channelId = item?.id ?? ''
      await Creator.updateOne(
        { _id: c._id },
        { youtube: { source: link, channelId, uploads: item?.contentDetails?.relatedPlaylists?.uploads ?? '' } },
      )
    }
    if (channelId) byChannel.set(channelId, [...(byChannel.get(channelId) ?? []), String(c._id)])
  }
  const ids = [...byChannel.keys()]
  for (let i = 0; i < ids.length; i += 50) {
    const data = await getJson(`${base}/channels?part=snippet,statistics,brandingSettings&id=${ids.slice(i, i + 50).join(',')}&key=${key}`)
    for (const item of data.items ?? []) {
      const banner = item.brandingSettings?.image?.bannerExternalUrl
      const stats = {
        subscribers: item.statistics?.hiddenSubscriberCount ? null : num(item.statistics?.subscriberCount),
        avatar: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
        // the middle strip of the banner (the part every device shows), at a sensible size
        banner: banner ? `${banner}=w1280-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj` : '',
      }
      for (const id of byChannel.get(item.id) ?? []) out.set(id, stats)
    }
  }
  return out
}

/**
 * Kick: the banner from the official API (with keys), and the follower count and profile
 * picture from Kick's public channel page data (no keys; Kick may refuse it from some servers,
 * in which case no number is shown — never a made-up one).
 */
async function kickStats(slugs) {
  const out = new Map()
  const support = liveSupport()
  let token = null
  if (support.kick) {
    try {
      token = await appToken('kick', `${env.creators.kickAuthBase}/oauth/token`, env.creators.kickId, env.creators.kickSecret)
    } catch {
      token = null
    }
  }
  let refused = 0
  for (const slug of slugs) {
    const stats = { followers: null, avatar: '', banner: '' }
    if (token) {
      try {
        const data = await getJson(`${env.creators.kickApiBase}/public/v1/channels?slug=${encodeURIComponent(slug)}`, {
          headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
        })
        stats.banner = (data.data ?? [])[0]?.banner_picture ?? ''
      } catch {
        /* keep going */
      }
    }
    try {
      const ch = await getJson(`${env.creators.kickSiteBase}/api/v2/channels/${encodeURIComponent(slug)}`, {
        headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0 (compatible; RameirahEmpireSite/1.0)' },
      })
      stats.followers = num(ch.followers_count ?? ch.followersCount)
      stats.avatar = ch.user?.profile_pic ?? ''
      if (!stats.banner) stats.banner = ch.banner_image?.url ?? ''
    } catch {
      refused += 1
    }
    out.set(slug, stats)
  }
  if (refused && refused === slugs.length)
    lastErrors.kickFollowers = 'Kick refused the follower-count lookup from the server, so Kick follower numbers are hidden for now.'
  else delete lastErrors.kickFollowers
  return out
}

/** Twitch: profile picture and offline banner (follower counts need the streamer's own login, so none). */
async function twitchStats(logins) {
  const out = new Map()
  if (!logins.length) return out
  const { twitchId, twitchSecret } = env.creators
  const token = await appToken('twitch', `${env.creators.twitchAuthBase}/oauth2/token`, twitchId, twitchSecret)
  for (let i = 0; i < logins.length; i += 100) {
    const q = logins
      .slice(i, i + 100)
      .map((l) => `login=${encodeURIComponent(l)}`)
      .join('&')
    const data = await getJson(`${env.creators.twitchApiBase}/helix/users?${q}`, {
      headers: { 'Client-Id': twitchId, authorization: `Bearer ${token}` },
    })
    for (const u of data.data ?? []) {
      out.set(String(u.login).toLowerCase(), { avatar: u.profile_image_url ?? '', banner: u.offline_image_url ?? '' })
    }
  }
  return out
}

export function refreshStats({ force = false } = {}) {
  if (statsRunning) return statsRunning
  if (!force && Date.now() - statsRun < STATS_MS) return Promise.resolve()
  statsRun = Date.now()
  statsRunning = runStats().finally(() => {
    statsRunning = null
  })
  return statsRunning
}

async function runStats() {
  const support = liveSupport()
  const creators = await Creator.find({ visible: true }, 'links youtube stats').lean()
  if (!creators.length) return
  const [yt, kk, tw] = await Promise.all([
    support.youtube
      ? youtubeStats(creators.filter((c) => c.links?.youtube)).catch(
          (e) => ((lastErrors.youtubeStats = `YouTube numbers failed (${e.message})`), null),
        )
      : null,
    kickStats([...new Set(creators.map((c) => channelOf('kick', c.links?.kick)).filter(Boolean))]).catch(() => null),
    support.twitch
      ? twitchStats([...new Set(creators.map((c) => channelOf('twitch', c.links?.twitch)).filter(Boolean))]).catch(() => null)
      : null,
  ])
  if (yt) delete lastErrors.youtubeStats
  const empty = {
    youtube: { subscribers: null, avatar: '', banner: '' },
    kick: { followers: null, avatar: '', banner: '' },
    twitch: { avatar: '', banner: '' },
  }
  const writes = creators.map((c) => {
    const prev = c.stats ?? empty
    const kSlug = channelOf('kick', c.links?.kick)
    const tLogin = channelOf('twitch', c.links?.twitch)
    const stats = {
      // a failed round keeps the last good numbers; a removed link clears them
      youtube: !c.links?.youtube ? empty.youtube : yt ? (yt.get(String(c._id)) ?? empty.youtube) : (prev.youtube ?? empty.youtube),
      kick: !kSlug ? empty.kick : kk ? { ...(prev.kick ?? {}), ...pickKnown(kk.get(kSlug)) } : (prev.kick ?? empty.kick),
      twitch: !tLogin ? empty.twitch : tw ? (tw.get(tLogin) ?? empty.twitch) : (prev.twitch ?? empty.twitch),
      checkedAt: new Date(),
    }
    return { updateOne: { filter: { _id: c._id }, update: { stats } } }
  })
  await Creator.bulkWrite(writes)
}

/** Kick fields that came back this time (a refused lookup leaves the old follower count). */
function pickKnown(s) {
  if (!s) return {}
  return Object.fromEntries(Object.entries(s).filter(([, v]) => v !== null && v !== ''))
}

export const liveErrors = () => ({ ...lastErrors })

/** Keeps checking while the server is awake. */
export function startLiveChecks() {
  const tick = () => {
    refreshLive().catch(() => {})
    refreshStats().catch(() => {})
  }
  setTimeout(tick, 5_000).unref?.()
  setInterval(tick, 30_000).unref?.()
}
