import { Router } from 'express'

import { authenticate, requireRole } from '../../middleware/auth.js'
import { Club } from '../../models/Club.js'
import { Gang } from '../../models/Gang.js'
import { Settings } from '../../models/Settings.js'
import { RuleBook } from '../../models/RuleBook.js'
import { Staff } from '../../models/Staff.js'
import { War } from '../../models/War.js'
import { AuditLog } from '../../models/AuditLog.js'
import auditRoutes from './audit.js'
import chat from './chat.js'
import clubs from './clubs.js'
import gangs from './gangs.js'
import media from './media.js'
import rules from './rules.js'
import settings from './settings.js'
import staff from './staff.js'
import tdm from './tdm.js'
import users from './users.js'
import wars from './wars.js'

/**
 * Everything under /api/admin. Deny by default: a valid session is required, and every
 * route needs an explicit role. The in-game rank of a player never grants access here —
 * only website accounts created by a Super Admin can sign in.
 */
const router = Router()

router.use(authenticate)
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

const staffRoles = requireRole('admin', 'superadmin')
const superOnly = requireRole('superadmin')

router.get('/overview', staffRoles, async (req, res) => {
  const [gangCount, clubCount, warCount, staffCount, online, book, recent, site] = await Promise.all([
    Gang.countDocuments(),
    Club.countDocuments(),
    War.countDocuments(),
    Staff.countDocuments(),
    Staff.countDocuments({ online: true }),
    RuleBook.findOne({ key: 'main' }).lean(),
    req.user.role === 'superadmin' ? AuditLog.find().sort({ at: -1 }).limit(6).lean() : [],
    Settings.findOne({ key: 'main' }, 'maintenance sections').lean(),
  ])
  const rosters = await Gang.find({}, 'members').lean()
  const players = rosters.reduce((n, g) => n + (g.members?.length ?? 0), 0)
  res.json({
    gangs: gangCount,
    clubs: clubCount,
    players,
    wars: warCount,
    staff: staffCount,
    staffOnline: online,
    maintenance: Boolean(site?.maintenance?.on),
    sectionsOff: Object.entries(site?.sections ?? {}).filter(([, on]) => on === false).map(([key]) => key),
    rules: { published: Boolean(book?.published), publishedAt: book?.publishedAt ?? null, draftSections: book?.draft?.length ?? 0 },
    recent: recent.map(({ _id, actor, ...e }) => ({ id: String(_id), ...e })),
  })
})

router.use('/gangs', staffRoles, gangs)
router.use('/clubs', staffRoles, clubs)
router.use('/chat', staffRoles, chat)
router.use('/wars', staffRoles, wars)
router.use('/staff', staffRoles, staff)
router.use('/tdm', staffRoles, tdm)
router.use('/rules', staffRoles, rules)
router.use('/media', staffRoles, media)
router.use('/settings', staffRoles, settings)
router.use('/users', superOnly, users)
router.use('/audit', superOnly, auditRoutes)

export default router
