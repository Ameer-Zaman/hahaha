import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { Announcement, liveState } from '../../models/Announcement.js'
import { audit } from '../../services/audit.js'
import { announcementSchema } from '../../validation/schemas.js'

/** Announcements shown on the website: list, write, publish, delete. Every change is audited. */
const router = Router()

const withState = (a) => ({ ...a, id: String(a._id), state: liveState(a) })

router.get('/', async (req, res) => {
  const items = await Announcement.find().sort({ pinned: -1, createdAt: -1 }).lean()
  res.json({ announcements: items.map(withState) })
})

router.get('/:id', async (req, res) => {
  const a = await Announcement.findById(req.params.id).lean()
  if (!a) throw new HttpError(404, 'Announcement not found.')
  res.json({ announcement: withState(a) })
})

router.post('/', validateBody(announcementSchema), async (req, res) => {
  const a = await Announcement.create({ ...req.body, createdBy: req.user.email, updatedBy: req.user.email })
  await audit(req, 'announcement.create', a.title, a.status)
  res.status(201).json({ announcement: withState(a.toObject()) })
})

router.put('/:id', validateBody(announcementSchema), async (req, res) => {
  const before = await Announcement.findById(req.params.id)
  if (!before) throw new HttpError(404, 'Announcement not found.')
  const wasLive = before.status
  const a = await Announcement.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedBy: req.user.email },
    { new: true, runValidators: true },
  )
  // "published" is the change worth spotting in the audit log later
  const detail = wasLive !== a.status ? `${wasLive} → ${a.status}` : 'edited'
  await audit(req, 'announcement.update', a.title, detail)
  res.json({ announcement: withState(a.toObject()) })
})

router.delete('/:id', async (req, res) => {
  const a = await Announcement.findByIdAndDelete(req.params.id)
  if (!a) throw new HttpError(404, 'Announcement not found.')
  await audit(req, 'announcement.delete', a.title, a.status)
  res.json({ ok: true })
})

export default router
