import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import { HttpError } from '../../middleware/errors.js'
import { audit } from '../../services/audit.js'
import { checkBackup, makeBackup, partLabels, previewRestore, restoreBackup } from '../../services/backup.js'

/**
 * Download everything as one file, and put it back if an edit goes wrong.
 *
 * Super Admin only (mounted behind requireRole in admin/index.js): a backup is a copy of
 * the whole website, and a restore replaces what is there now.
 */
const router = Router()

// A restore replaces everything, so it is never something to do in a hurry or by accident.
const restoreLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many restores in a row. Wait a few minutes.' },
})

/** What a backup would contain, without making one. */
router.get('/', async (req, res) => {
  const file = await makeBackup({ by: req.user.email })
  res.json({ counts: file.counts, labels: partLabels(), takenAt: file.takenAt })
})

/** The file itself. */
router.get('/download', async (req, res) => {
  const file = await makeBackup({ by: req.user.email })
  const stamp = file.takenAt.slice(0, 16).replace(/[:T]/g, '-')
  await audit(req, 'backup.download', 'site', Object.entries(file.counts).map(([k, n]) => `${k} ${n}`).join(', '))
  res.set({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="rameirah-backup-${stamp}.json"`,
    'Cache-Control': 'no-store',
  })
  res.send(JSON.stringify(file, null, 2))
})

/** What restoring this file would change — nothing is touched. */
router.post('/preview', async (req, res) => {
  const problem = checkBackup(req.body?.backup)
  if (problem) throw new HttpError(400, problem)
  const file = req.body.backup
  res.json({ takenAt: file.takenAt ?? null, takenBy: file.takenBy ?? '', parts: await previewRestore(file) })
})

/**
 * Puts it back. `confirm` must be the word RESTORE, so a mis-sent request cannot replace
 * the website by accident.
 */
router.post('/restore', restoreLimiter, async (req, res) => {
  const problem = checkBackup(req.body?.backup)
  if (problem) throw new HttpError(400, problem)
  if (req.body?.confirm !== 'RESTORE') throw new HttpError(400, 'Type RESTORE to confirm.')
  const only = Array.isArray(req.body.only) && req.body.only.length ? req.body.only.map(String) : null

  // a copy of how things are now, so a restore is never a one-way door
  const rollback = await makeBackup({ by: `before restore by ${req.user.email}` })
  const done = await restoreBackup(req.body.backup, { only })
  await audit(
    req,
    'backup.restore',
    'site',
    done.map((d) => `${d.key} ${d.before}→${d.after}`).join(', ') || 'nothing to restore',
  )
  res.json({ restored: done, rollback })
})

export default router
