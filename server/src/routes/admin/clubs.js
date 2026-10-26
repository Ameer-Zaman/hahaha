import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { Club } from '../../models/Club.js'
import { audit } from '../../services/audit.js'
import { clubSchema } from '../../validation/schemas.js'

/** Clubs on the Clubs page: list, create, edit, delete (every change is audited). */
const router = Router()

router.get('/', async (req, res) => {
  const clubs = await Club.find().sort({ order: 1, createdAt: 1 }).lean()
  res.json({ clubs })
})

router.get('/:id', async (req, res) => {
  const club = await Club.findById(req.params.id).lean()
  if (!club) throw new HttpError(404, 'Club not found.')
  res.json({ club })
})

router.post('/', validateBody(clubSchema), async (req, res) => {
  const club = await Club.create(req.body)
  await audit(req, 'club.create', club.slug, club.name)
  res.status(201).json({ club })
})

router.put('/:id', validateBody(clubSchema), async (req, res) => {
  const club = await Club.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!club) throw new HttpError(404, 'Club not found.')
  await audit(req, 'club.update', club.slug, club.name)
  res.json({ club })
})

router.delete('/:id', async (req, res) => {
  const club = await Club.findByIdAndDelete(req.params.id)
  if (!club) throw new HttpError(404, 'Club not found.')
  await audit(req, 'club.delete', club.slug, club.name)
  res.json({ ok: true })
})

export default router
