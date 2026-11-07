import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { Gang } from '../../models/Gang.js'
import { isOn, LiveAlert } from '../../models/LiveAlert.js'
import { audit } from '../../services/audit.js'
import { liveAlertSchema } from '../../validation/schemas.js'

/** Panel → Live: send a live gang situation to every visitor, end it, or remove it. Audited. */
const router = Router()

const view = (a, now = new Date()) => ({
  id: String(a._id),
  gangA: a.gangA,
  gangB: a.gangB,
  title: a.title,
  url: a.url,
  note: a.note,
  endsAt: a.endsAt,
  endedAt: a.endedAt,
  createdBy: a.createdBy,
  createdAt: a.createdAt,
  on: isOn(a, now),
})

router.get('/', async (req, res) => {
  const items = await LiveAlert.find().sort({ createdAt: -1 }).limit(30).lean()
  res.json({ alerts: items.map((a) => view(a)) })
})

router.post('/', validateBody(liveAlertSchema), async (req, res) => {
  const { minutes, ...body } = req.body
  const found = await Gang.find({ slug: { $in: [body.gangA, body.gangB] } }, 'slug name').lean()
  if (found.length < 2) throw new HttpError(400, 'Both gangs must be gangs from Panel → Gangs.')
  const a = await LiveAlert.create({ ...body, endsAt: new Date(Date.now() + minutes * 60_000), createdBy: req.user.email })
  const names = Object.fromEntries(found.map((g) => [g.slug, g.name]))
  await audit(req, 'live.start', `${names[a.gangA]} vs ${names[a.gangB]}`, `${minutes} min · ${a.url}`)
  res.status(201).json({ alert: view(a.toObject()) })
})

router.post('/:id/end', async (req, res) => {
  const a = await LiveAlert.findById(req.params.id)
  if (!a) throw new HttpError(404, 'Live notification not found.')
  if (!a.endedAt) {
    a.endedAt = new Date()
    await a.save()
    await audit(req, 'live.end', `${a.gangA} vs ${a.gangB}`, 'ended early')
  }
  res.json({ alert: view(a.toObject()) })
})

router.delete('/:id', async (req, res) => {
  const a = await LiveAlert.findByIdAndDelete(req.params.id)
  if (!a) throw new HttpError(404, 'Live notification not found.')
  await audit(req, 'live.delete', `${a.gangA} vs ${a.gangB}`, a.url)
  res.json({ ok: true })
})

export default router
