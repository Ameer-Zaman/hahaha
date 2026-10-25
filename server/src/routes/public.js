import { Router } from 'express'

import { Gang } from '../models/Gang.js'
import { RuleBook } from '../models/RuleBook.js'
import { MEDIA_SLOTS, readSections, Settings } from '../models/Settings.js'
import { Staff } from '../models/Staff.js'
import { War } from '../models/War.js'
import { mediaUrl } from '../services/media.js'

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

router.get('/staff', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=15')
  const staff = await Staff.find().sort({ order: 1, createdAt: 1 }).lean()
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

router.get('/rules', async (req, res) => {
  const book = await RuleBook.findOne({ key: 'main' }).lean()
  if (!book?.published) return res.json({ status: 'draft', categories: null, lastUpdated: null })
  res.json({ status: 'published', categories: book.published, lastUpdated: book.publishedAt })
})

router.get('/site', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=10') // maintenance and sections should land quickly
  const settings = await Settings.findOne({ key: 'main' }).lean()
  const media = Object.fromEntries(MEDIA_SLOTS.map((slot) => [slot, mediaUrl(settings?.media?.[slot] ?? null)]))
  res.json({
    media,
    sections: readSections(settings),
    maintenance: { on: Boolean(settings?.maintenance?.on), message: settings?.maintenance?.message ?? '' },
  })
})

export default router
