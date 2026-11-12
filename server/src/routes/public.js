import { Router } from 'express'

import { Announcement, isLive } from '../models/Announcement.js'
import { Club } from '../models/Club.js'
import { Creator, manualOn } from '../models/Creator.js'
import { endOf, Event, eventState } from '../models/Event.js'
import { Gang } from '../models/Gang.js'
import { LiveAlert } from '../models/LiveAlert.js'
import { RuleBook } from '../models/RuleBook.js'
import { Product } from '../models/Product.js'
import { MEDIA_SLOTS, Settings, readBrandLogo, readChatBot, readSections, readSocials, readStore } from '../models/Settings.js'
import { Staff } from '../models/Staff.js'
import { TdmBoard } from '../models/TdmBoard.js'
import { War } from '../models/War.js'
import { resolveMediaUrls, resolveStillUrls } from '../services/media.js'
import { channelOf, liveSupport, refreshLive, refreshStats } from '../services/creatorLive.js'

/**
 * Read-only data for the public website. Responses are small and briefly cacheable.
 */
const router = Router()

router.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=30')
  next()
})

router.get('/gangs', async (req, res) => {
  const [gangs, wars] = await Promise.all([Gang.find().sort({ order: 1, createdAt: 1 }).lean(), War.find().sort({ date: -1 }).lean()])
  const slugById = new Map(gangs.map((g) => [String(g._id), g.slug]))
  const mediaUrl = await resolveMediaUrls(gangs.flatMap((g) => [g.image, g.emblem, g.video]))
  res.json({
    gangs: gangs.map((g) => ({
      id: g.slug,
      name: g.name,
      type: g.type || 'Gang',
      established: g.established || undefined,
      territory: g.territory || undefined,
      leader: g.leader || undefined,
      coLeaders: (g.coLeaders || '')
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean),
      igl: g.igl || undefined,
      color: /^#[0-9a-f]{6}$/i.test(g.color || '') ? g.color : null,
      suspendedUntil: g.suspendedUntil ? new Date(g.suspendedUntil).toISOString() : null,
      headline: g.headline || '',
      description: g.description || '',
      image: mediaUrl(g.image),
      emblem: mediaUrl(g.emblem),
      video: mediaUrl(g.video),
      verified: g.verified,
      members: g.members ?? [],
    })),
    wars: wars
      .filter((w) => w.sides.every((s) => slugById.has(String(s))))
      .map((w) => ({
        id: String(w._id),
        date: w.date,
        sides: w.sides.map((s) => slugById.get(String(s))),
        winner: w.winner ? (slugById.get(String(w.winner)) ?? null) : null,
        result: w.result,
      })),
  })
})

/**
 * Live gang situations happening right now (Panel → Live): both gangs with their name,
 * colour and emblem, the stream link, and when it ends. Ended or expired ones never leave
 * the server. Short cache so a new one shows within about half a minute.
 */
router.get('/live', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=20')
  const now = new Date()
  const items = await LiveAlert.find({ endedAt: null, endsAt: { $gt: now } })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()
  const slugs = [...new Set(items.flatMap((a) => [a.gangA, a.gangB]))]
  const gangs = slugs.length ? await Gang.find({ slug: { $in: slugs } }, 'slug name color emblem').lean() : []
  const bySlug = Object.fromEntries(gangs.map((g) => [g.slug, g]))
  const side = (slug) => {
    const g = bySlug[slug]
    return g
      ? { id: g.slug, name: g.name, color: /^#[0-9a-f]{6}$/i.test(g.color || '') ? g.color : null, emblem: g.emblem || null }
      : { id: slug, name: slug, color: null, emblem: null }
  }
  const alerts = items.map((a) => ({
    id: String(a._id),
    a: side(a.gangA),
    b: side(a.gangB),
    title: a.title,
    url: a.url,
    note: a.note,
    startedAt: a.createdAt,
    endsAt: a.endsAt,
  }))
  const mediaUrl = await resolveMediaUrls(alerts.flatMap((x) => [x.a.emblem, x.b.emblem]))
  for (const x of alerts) {
    x.a.emblem = mediaUrl(x.a.emblem)
    x.b.emblem = mediaUrl(x.b.emblem)
  }
  res.json({ alerts })
})

/**
 * The announcements a visitor should see right now. Drafts, ones not started and ones that
 * have finished never leave the server, so nothing unpublished can be read from the website.
 */
router.get('/announcements', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=30')
  const now = new Date()
  const items = await Announcement.find({ status: 'published' }).sort({ pinned: -1, createdAt: -1 }).limit(60).lean()
  res.json({
    announcements: items
      .filter((a) => isLive(a, now))
      .slice(0, 20)
      .map((a) => ({
        id: String(a._id),
        title: a.title,
        body: a.body,
        tone: a.tone,
        pinned: a.pinned,
        at: a.startsAt ?? a.createdAt,
        link: a.linkUrl ? { url: a.linkUrl, label: a.linkLabel || 'Read more' } : null,
      })),
  })
})

router.get('/clubs', async (req, res) => {
  const clubs = await Club.find().sort({ order: 1, createdAt: 1 }).lean()
  const mediaUrl = await resolveMediaUrls(clubs.map((c) => c.emblem))
  res.json({
    clubs: clubs.map((c) => ({
      id: c.slug,
      name: c.name,
      type: c.type || 'Club',
      owner: c.owner || '',
      location: c.location || '',
      description: c.description || '',
      emblem: mediaUrl(c.emblem),
    })),
  })
})

/**
 * Events: published and cancelled ones only — a draft never leaves the server. Everything
 * still to come or running now, then the most recent that have finished.
 */
const PAST_SHOWN = 24

function publicEvent(e, mediaUrl, now) {
  return {
    id: e.slug,
    title: e.title,
    category: e.category || 'Event',
    state: eventState(e, now),
    statusNote: e.status === 'cancelled' ? e.statusNote || '' : '',
    startsAt: e.startsAt,
    endsAt: e.endsAt ?? null,
    endsBy: endOf(e),
    location: e.location || '',
    host: e.host || '',
    summary: e.summary || '',
    description: e.description || '',
    schedule: (e.schedule ?? []).map(({ time, item }) => ({ time, item })),
    requirements: e.requirements ?? [],
    prizes: (e.prizes ?? []).map(({ place, prize }) => ({ place, prize })),
    capacity: e.capacity || 0,
    signup: e.signupUrl ? { url: e.signupUrl, label: e.signupLabel || 'Sign up' } : null,
    image: mediaUrl(e.image),
    featured: Boolean(e.featured),
  }
}

router.get('/events', async (req, res) => {
  const now = new Date()
  const all = await Event.find({ status: { $in: ['published', 'cancelled'] } })
    .sort({ startsAt: 1 })
    .lean()
  const ahead = all.filter((e) => endOf(e) > now)
  const past = all
    .filter((e) => endOf(e) <= now)
    .reverse()
    .slice(0, PAST_SHOWN)
  const shown = [...ahead, ...past]
  const mediaUrl = await resolveMediaUrls(shown.map((e) => e.image))
  res.json({ events: shown.map((e) => publicEvent(e, mediaUrl, now)) })
})

router.get('/events/:slug', async (req, res) => {
  const e = await Event.findOne({ slug: String(req.params.slug).toLowerCase(), status: { $in: ['published', 'cancelled'] } }).lean()
  if (!e) return res.status(404).json({ message: 'No event by that name.' })
  const mediaUrl = await resolveMediaUrls([e.image])
  res.json({ event: publicEvent(e, mediaUrl, new Date()) })
})

/**
 * The Creators page: each creator, their links, and whether they're live — from the last
 * Twitch / Kick / YouTube check, or set by staff by hand. `tracked` says which of a creator's
 * channels are actually checked, so the page never claims "offline" for one that isn't.
 */
const num = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v))

/**
 * A creator's logo and banner, from where the panel says: their upload, one platform, or
 * 'auto' — the upload if there is one, else their own channel pictures (logo: YouTube, Kick,
 * Twitch; banner: Kick, YouTube, Twitch). Uploaded GIFs also get a still frame for until hover.
 */
function pictures(c, st, mediaUrl, stillOf) {
  const fromPlatform = (kind, order) => order.map((p) => st[p]?.[kind]).find(Boolean) || null
  const pick = (source, upload, kind, autoOrder) => {
    const uploaded = upload ? mediaUrl(upload) : null
    if (source === 'upload' && uploaded) return { url: uploaded, still: stillOf(upload) }
    if (['youtube', 'kick', 'twitch'].includes(source)) {
      const url = st[source]?.[kind] || null
      if (url) return { url, still: null }
    }
    // automatic (also when the chosen picture isn't there any more): the upload, else their channels
    if (uploaded && (source === 'auto' || !source || source === 'upload')) return { url: uploaded, still: stillOf(upload) }
    const url = fromPlatform(kind, autoOrder) || uploaded
    return { url, still: url && url === uploaded ? stillOf(upload) : null }
  }
  const photo = pick(c.photoSource, c.photo, 'avatar', ['youtube', 'kick', 'twitch'])
  const banner = pick(c.bannerSource, c.banner, 'banner', ['kick', 'youtube', 'twitch'])
  return { photo: photo.url, photoStill: photo.still, banner: banner.url, bannerStill: banner.still }
}

router.get('/creators', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=20')
  // the server may have been asleep: bring the live status up to date first (briefly)
  await Promise.race([
    Promise.all([refreshLive().catch(() => {}), refreshStats().catch(() => {})]),
    new Promise((r) => setTimeout(r, 5000)),
  ])
  const now = new Date()
  const support = liveSupport()
  const creators = await Creator.find({ visible: true }).sort({ order: 1, createdAt: 1 }).lean()
  const mediaUrl = await resolveMediaUrls(creators.flatMap((c) => [c.photo, c.banner, c.look?.frameImage]))
  const stillOf = await resolveStillUrls(creators.flatMap((c) => [c.photo, c.banner]))
  res.json({
    creators: creators.map((c) => {
      const links = c.links ?? {}
      const tracked = ['twitch', 'kick', 'youtube'].filter(
        (p) => support[p] && (p === 'youtube' ? Boolean(links.youtube) : Boolean(channelOf(p, links[p]))),
      )
      const manual = manualOn(c, now)
      const live = manual
        ? { on: true, platform: c.manual.platform, title: c.manual.title, viewers: 0, url: c.manual.url, since: null, source: 'staff' }
        : c.live?.on && tracked.includes(c.live.platform)
          ? {
              on: true,
              platform: c.live.platform,
              title: c.live.title,
              viewers: c.live.viewers,
              url: c.live.url,
              since: c.live.startedAt,
              source: 'auto',
            }
          : { on: false }
      const st = c.stats ?? {}
      const counts = [
        links.kick && num(st.kick?.followers) !== null && { platform: 'kick', label: 'followers', value: st.kick.followers },
        links.youtube &&
          num(st.youtube?.subscribers) !== null && { platform: 'youtube', label: 'subscribers', value: st.youtube.subscribers },
      ].filter(Boolean)
      return {
        id: String(c._id),
        name: c.name,
        tagline: c.tagline,
        ...pictures(c, st, mediaUrl, stillOf),
        look: {
          effect: c.look?.effect ?? 'none',
          decoration: c.look?.decoration ?? 'none',
          accent: c.look?.accent ?? '#e3b55a',
          frame: c.look?.frame === 'custom' && !c.look?.frameImage ? 'none' : (c.look?.frame ?? 'none'),
          frameImage: c.look?.frame === 'custom' ? mediaUrl(c.look?.frameImage) : null,
        },
        counts,
        links,
        tracked,
        live,
        checkedAt: tracked.length ? (c.live?.checkedAt ?? null) : null,
      }
    }),
  })
})

/**
 * The Store: visible products, and where Buy goes. A product's own link wins, then the store's
 * link from the panel, then the community Discord. Nothing is paid for on the website.
 */
router.get('/store', async (req, res) => {
  const settings = await Settings.findOne({ key: 'main' }, 'store socials').lean()
  const store = readStore(settings)
  // coming soon: nothing is listed yet, not even to someone reading the API
  const products = store.comingSoon ? [] : await Product.find({ visible: true }).sort({ order: 1, createdAt: 1 }).lean()
  const discord = readSocials(settings)?.find((l) => l.platform === 'discord')?.url ?? ''
  const mediaUrl = await resolveMediaUrls(products.flatMap((p) => [p.cover, p.video, ...(p.gallery ?? [])]))
  res.json({
    store: { comingSoon: store.comingSoon, note: store.note, buyUrl: store.buyUrl || discord || null },
    products: products.map((p) => ({
      id: p.slug,
      name: p.name,
      kind: p.kind,
      tier: p.tier === 'vip' ? 'vip' : 'normal',
      category: p.category,
      tagline: p.tagline,
      description: p.description,
      features: p.features ?? [],
      specs: (p.specs ?? []).map(({ label, value }) => ({ label, value })),
      price: p.price ?? null,
      oldPrice: p.oldPrice ?? null,
      currency: p.currency || 'USD',
      priceNote: p.priceNote,
      noPrice: p.noPrice === 'soon' ? 'soon' : 'request',
      badge: p.badge || '',
      cover: mediaUrl(p.cover),
      gallery: (p.gallery ?? []).map((id) => mediaUrl(id)).filter(Boolean),
      video: mediaUrl(p.video),
      buyUrl: p.buyUrl || null,
      featured: Boolean(p.featured),
      soldOut: Boolean(p.soldOut),
    })),
  })
})

router.get('/staff', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=15')
  const staff = await Staff.find().sort({ order: 1, createdAt: 1 }).lean()
  const mediaUrl = await resolveMediaUrls(staff.map((s) => s.portrait))
  const updatedAt = staff.reduce((max, s) => (s.statusUpdatedAt && s.statusUpdatedAt > max ? s.statusUpdatedAt : max), new Date(0))
  res.json({
    updatedAt: updatedAt.getTime() ? updatedAt.toISOString() : null,
    staff: staff.map((s) => ({
      id: String(s._id),
      name: s.name,
      role: s.role,
      department: s.department || '',
      socials: s.socials ?? {},
      portrait: mediaUrl(s.portrait),
      online: s.online,
      onDuty: s.onDuty,
    })),
  })
})

router.get('/tdm', async (req, res) => {
  const board = await TdmBoard.findOne({ key: 'main' }).lean()
  res.json({
    season: board?.season ?? '',
    updatedAt: board?.updatedAt ?? null,
    players: (board?.players ?? []).map(({ name, kills, deaths, wins, matches }) => ({ name, kills, deaths, wins, matches })),
  })
})

router.get('/rules', async (req, res) => {
  const book = await RuleBook.findOne({ key: 'main' }).lean()
  if (!book?.published) return res.json({ status: 'draft', categories: null, extras: null, lastUpdated: null })
  const x = book.publishedExtras ?? {}
  res.json({
    status: 'published',
    categories: book.published.map((c) => ({
      ...c,
      rules: c.rules.map((r) => ({ id: r.id, title: r.title, text: r.text, level: r.level ?? 'standard', penalty: r.penalty ?? '' })),
    })),
    extras: { notice: x.notice ?? '', penalties: x.penalties ?? [], appeals: x.appeals ?? '', glossary: x.glossary ?? [] },
    lastUpdated: book.publishedAt,
  })
})

router.get('/site', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=10') // maintenance and sections should land quickly
  const settings = await Settings.findOne({ key: 'main' }).lean()
  const bot = readChatBot(settings)
  const logo = readBrandLogo(settings)
  const mediaUrl = await resolveMediaUrls([...Object.values(settings?.media ?? {}), bot.avatar, logo])
  const media = Object.fromEntries(MEDIA_SLOTS.map((slot) => [slot, mediaUrl(settings?.media?.[slot] ?? null)]))
  res.json({
    media,
    sections: readSections(settings),
    chatBot: { name: bot.name, avatar: mediaUrl(bot.avatar) },
    brand: { logo: logo ? mediaUrl(logo) : null },
    socials: readSocials(settings),
    maintenance: { on: Boolean(settings?.maintenance?.on), message: settings?.maintenance?.message ?? '' },
  })
})

export default router
