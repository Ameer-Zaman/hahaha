import { Router } from 'express'

import { Announcement, isLive } from '../models/Announcement.js'
import { Club } from '../models/Club.js'
import { Gang } from '../models/Gang.js'
import { RuleBook } from '../models/RuleBook.js'
import { MEDIA_SLOTS, readSections, Settings } from '../models/Settings.js'
import { Staff } from '../models/Staff.js'
import { TdmBoard } from '../models/TdmBoard.js'
import { War } from '../models/War.js'
import { resolveMediaUrls } from '../services/media.js'

/**
 * Read-only data for the public website. Responses are small and briefly cacheable.
 */
const router = Router()

router.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=30')
  next()
})

router.get('/gangs', async (req, res) => {
  const [gangs, wars] = await Promise.all([
    Gang.find().sort({ order: 1, createdAt: 1 }).lean(),
    War.find().sort({ date: -1 }).lean(),
  ])
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
  if (!book?.published) return res.json({ status: 'draft', categories: null, lastUpdated: null })
  res.json({ status: 'published', categories: book.published, lastUpdated: book.publishedAt })
})

router.get('/site', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=10') // maintenance and sections should land quickly
  const settings = await Settings.findOne({ key: 'main' }).lean()
  const mediaUrl = await resolveMediaUrls(Object.values(settings?.media ?? {}))
  const media = Object.fromEntries(MEDIA_SLOTS.map((slot) => [slot, mediaUrl(settings?.media?.[slot] ?? null)]))
  res.json({
    media,
    sections: readSections(settings),
    maintenance: { on: Boolean(settings?.maintenance?.on), message: settings?.maintenance?.message ?? '' },
  })
})

export default router
