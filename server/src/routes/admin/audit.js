import { Router } from 'express'

import { AuditLog } from '../../models/AuditLog.js'

/** Read-only audit trail. Mounted behind requireRole('superadmin'). */
const router = Router()

router.get('/', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)
  const before = req.query.before ? new Date(String(req.query.before)) : null
  const filter = before && !Number.isNaN(before.getTime()) ? { at: { $lt: before } } : {}
  const entries = await AuditLog.find(filter).sort({ at: -1 }).limit(limit).lean()
  res.json({
    entries: entries.map(({ _id, actor, ...e }) => ({ id: String(_id), ...e })),
    next: entries.length === limit ? entries.at(-1).at : null,
  })
})

export default router
