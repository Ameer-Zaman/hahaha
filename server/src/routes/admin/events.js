import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { Event, eventState } from '../../models/Event.js'
import { audit } from '../../services/audit.js'
import { eventSchema } from '../../validation/schemas.js'

/** Events the server hosts: list, create, edit, delete (every change is audited). */
const router = Router()

const withState = (e, now) => ({ ...e, state: eventState(e, now) })

/** Soonest first; anything already over goes to the end, most recent first. */
router.get('/', async (req, res) => {
  const now = new Date()
  const events = (await Event.find().lean()).map((e) => withState(e, now))
  const over = (e) => e.state === 'ended'
  events.sort((a, b) => over(a) - over(b) || (over(a) ? b.startsAt - a.startsAt : a.startsAt - b.startsAt))
  res.json({ events })
})

router.get('/:id', async (req, res) => {
  const event = await Event.findById(req.params.id).lean()
  if (!event) throw new HttpError(404, 'Event not found.')
  res.json({ event: withState(event, new Date()) })
})

/** Only one event leads the page at a time: featuring one un-features the others. */
async function keepOneFeatured(event) {
  if (event.featured) await Event.updateMany({ _id: { $ne: event._id }, featured: true }, { featured: false })
}

router.post('/', validateBody(eventSchema), async (req, res) => {
  const event = await Event.create({ ...req.body, createdBy: req.user.email, updatedBy: req.user.email })
  await keepOneFeatured(event)
  await audit(req, 'event.create', event.slug, `${event.title} (${event.status})`)
  res.status(201).json({ event })
})

router.put('/:id', validateBody(eventSchema), async (req, res) => {
  const event = await Event.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user.email }, { new: true, runValidators: true })
  if (!event) throw new HttpError(404, 'Event not found.')
  await keepOneFeatured(event)
  await audit(req, 'event.update', event.slug, `${event.title} (${event.status})`)
  res.json({ event })
})

router.delete('/:id', async (req, res) => {
  const event = await Event.findByIdAndDelete(req.params.id)
  if (!event) throw new HttpError(404, 'Event not found.')
  await audit(req, 'event.delete', event.slug, event.title)
  res.json({ ok: true })
})

export default router
