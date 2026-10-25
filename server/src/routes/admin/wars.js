import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { Gang } from '../../models/Gang.js'
import { War } from '../../models/War.js'
import { audit } from '../../services/audit.js'
import { warSchema } from '../../validation/schemas.js'

const router = Router()

async function assertGangsExist(sides) {
  const count = await Gang.countDocuments({ _id: { $in: sides } })
  if (count !== 2) throw new HttpError(400, 'Both gangs must exist.')
}

router.get('/', async (req, res) => {
  const wars = await War.find().sort({ date: -1, createdAt: -1 }).lean()
  res.json({ wars })
})

router.post('/', validateBody(warSchema), async (req, res) => {
  await assertGangsExist(req.body.sides)
  const war = await War.create(req.body)
  await audit(req, 'war.create', war.id, `${war.date} · ${war.result}`)
  res.status(201).json({ war })
})

router.put('/:id', validateBody(warSchema), async (req, res) => {
  await assertGangsExist(req.body.sides)
  const war = await War.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!war) throw new HttpError(404, 'War record not found.')
  await audit(req, 'war.update', war.id, `${war.date} · ${war.result}`)
  res.json({ war })
})

router.delete('/:id', async (req, res) => {
  const war = await War.findByIdAndDelete(req.params.id)
  if (!war) throw new HttpError(404, 'War record not found.')
  await audit(req, 'war.delete', war.id, `${war.date} · ${war.result}`)
  res.json({ ok: true })
})

export default router
