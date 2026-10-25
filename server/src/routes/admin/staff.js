import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { Staff } from '../../models/Staff.js'
import { audit } from '../../services/audit.js'
import { staffSchema, staffStatusSchema } from '../../validation/schemas.js'

const router = Router()

router.get('/', async (req, res) => {
  const staff = await Staff.find().sort({ order: 1, createdAt: 1 }).lean()
  res.json({ staff })
})

router.post('/', validateBody(staffSchema), async (req, res) => {
  const member = await Staff.create({ ...req.body, statusUpdatedAt: new Date() })
  await audit(req, 'staff.create', member.id, `${member.name} · ${member.role}`)
  res.status(201).json({ member })
})

router.put('/:id', validateBody(staffSchema), async (req, res) => {
  const before = await Staff.findById(req.params.id)
  if (!before) throw new HttpError(404, 'Staff card not found.')
  const statusChanged = before.online !== req.body.online || before.onDuty !== req.body.onDuty
  before.set({ ...req.body, ...(statusChanged ? { statusUpdatedAt: new Date() } : {}) })
  await before.save()
  await audit(req, 'staff.update', before.id, `${before.name} · ${before.role}`)
  res.json({ member: before })
})

/** Quick status toggle used by the panel's on/off switches. */
router.patch('/:id/status', validateBody(staffStatusSchema), async (req, res) => {
  const member = await Staff.findByIdAndUpdate(
    req.params.id,
    { ...req.body, statusUpdatedAt: new Date() },
    { new: true },
  )
  if (!member) throw new HttpError(404, 'Staff card not found.')
  const label = member.onDuty ? 'on duty' : member.online ? 'online' : 'offline'
  await audit(req, 'staff.status', member.id, `${member.name} → ${label}`)
  res.json({ member })
})

router.delete('/:id', async (req, res) => {
  const member = await Staff.findByIdAndDelete(req.params.id)
  if (!member) throw new HttpError(404, 'Staff card not found.')
  await audit(req, 'staff.delete', member.id, member.name)
  res.json({ ok: true })
})

export default router
