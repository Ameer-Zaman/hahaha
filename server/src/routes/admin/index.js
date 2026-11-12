import { Router } from 'express'

import { areaGate, requireArea } from '../../middleware/access.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { PANEL_AREAS } from '../../models/User.js'
import { twoFactorRequired } from '../../services/twoFactor.js'
import { Club } from '../../models/Club.js'
import { Event } from '../../models/Event.js'
import { Gang } from '../../models/Gang.js'
import { Settings } from '../../models/Settings.js'
import { RuleBook } from '../../models/RuleBook.js'
import { Staff } from '../../models/Staff.js'
import { War } from '../../models/War.js'
import { AuditLog } from '../../models/AuditLog.js'
import announcements from './announcements.js'
import live from './live.js'
import auditRoutes from './audit.js'
import backup from './backup.js'
import chat from './chat.js'
import clubs from './clubs.js'
import creators from './creators.js'
import events from './events.js'
import gangs from './gangs.js'
import media from './media.js'
import rules from './rules.js'
import settings from './settings.js'
import staff from './staff.js'
import store from './store.js'
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

/**
 * When a Super Admin has made two-step sign-in compulsory, an account that has not set it
 * up yet cannot do anything here. Setting it up lives under /api/auth/2fa, which is outside
 * this router, so there is always a way forward.
 */
router.use(async (req, res, next) => {
  if (req.user.totp?.enabled) return next()
  if (!(await twoFactorRequired())) return next()
  res.status(403).json({
    message: 'Set up two-step sign-in to carry on.',
    code: 'two_factor_required',
  })
})

const staffRoles = requireRole('admin', 'superadmin')
const superOnly = requireRole('superadmin')

router.get('/overview', staffRoles, async (req, res) => {
  const [gangCount, clubCount, eventCount, warCount, staffCount, online, book, recent, site] = await Promise.all([
    Gang.countDocuments(),
    Club.countDocuments(),
    Event.countDocuments({ status: 'published', startsAt: { $gte: new Date() } }),
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
    upcomingEvents: eventCount,
    players,
    wars: warCount,
    staff: staffCount,
    staffOnline: online,
    maintenance: Boolean(site?.maintenance?.on),
    sectionsOff: Object.entries(site?.sections ?? {})
      .filter(([, on]) => on === false)
      .map(([key]) => key),
    rules: { published: Boolean(book?.published), publishedAt: book?.publishedAt ?? null, draftSections: book?.draft?.length ?? 0 },
    recent: recent.map(({ _id, actor, ...e }) => ({ id: String(_id), ...e })),
  })
})

// Each part of the panel also needs the area a Super Admin opened for the account
// (Panel → Accounts → Pages). Super Admins pass every area check.
router.use('/announcements', staffRoles, requireArea('announcements'), announcements)
router.use('/live', staffRoles, requireArea('live'), live)
router.use('/gangs', staffRoles, areaGate('gangs', ['wars', 'live']), gangs) // the gang list feeds the Wars and Live pickers
router.use('/clubs', staffRoles, requireArea('clubs'), clubs)
router.use('/events', staffRoles, requireArea('events'), events)
router.use('/chat', staffRoles, requireArea('chat'), chat)
router.use('/wars', staffRoles, requireArea('wars'), wars)
router.use('/staff', staffRoles, requireArea('staff'), staff)
router.use('/creators', staffRoles, requireArea('creators'), creators)
router.use('/store', staffRoles, requireArea('store'), store)
router.use('/tdm', staffRoles, requireArea('tdm'), tdm)
router.use('/rules', staffRoles, requireArea('rules'), rules)
// choosing and uploading pictures is part of every area; deleting files is the Media library's
router.use('/media', staffRoles, requireArea(...PANEL_AREAS), (req, res, next) =>
  req.method === 'DELETE' ? requireArea('media')(req, res, next) : next(),
)
router.use('/media', media)
router.use('/settings', staffRoles, settings) // each change checks its own area (settings.js)
router.use('/backup', superOnly, backup)
router.use('/users', superOnly, users)
router.use('/audit', superOnly, auditRoutes)

export default router
