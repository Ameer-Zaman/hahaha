import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { CityUpdate } from '../../models/CityUpdate.js'
import { audit } from '../../services/audit.js'
import { findFile } from '../../services/media.js'
import { cityUpdateSchema } from '../../validation/schemas.js'

/** Panel → Updates: the city's patch notes — list, create, edit, delete (every change is audited). */
const router = Router()

/** The picture must still be in the media library, and be a picture. */
async function check(body) {
  if (body.image) {
    const file = await findFile(body.image)
    if (!file) throw new HttpError(400, 'The picture is no longer in the media library — choose it again.')
    if (file.kind !== 'image') throw new HttpError(400, 'The picture is a video. Use a picture.')
  }
  return { ...body, image: body.image ?? null }
}

const describe = (u) => `${u.title}${u.version ? ` (${u.version})` : ''} · ${u.status} · ${u.changes.length} changes`

router.get('/', async (req, res) => {
  const updates = await CityUpdate.find().sort({ date: -1, createdAt: -1 }).lean()
  res.json({ updates })
})

router.get('/:id', async (req, res) => {
  const update = await CityUpdate.findById(req.params.id).lean()
  if (!update) throw new HttpError(404, 'Update not found.')
  res.json({ update })
})

router.post('/', validateBody(cityUpdateSchema), async (req, res) => {
  if (await CityUpdate.exists({ slug: req.body.slug })) throw new HttpError(409, 'Another update already uses that short name.')
  const update = await CityUpdate.create({ ...(await check(req.body)), createdBy: req.user.email, updatedBy: req.user.email })
  await audit(req, 'update.create', update.slug, describe(update))
  res.status(201).json({ update })
})

router.put('/:id', validateBody(cityUpdateSchema), async (req, res) => {
  if (await CityUpdate.exists({ slug: req.body.slug, _id: { $ne: req.params.id } }))
    throw new HttpError(409, 'Another update already uses that short name.')
  const body = await check(req.body)
  const update = await CityUpdate.findByIdAndUpdate(
    req.params.id,
    { ...body, updatedBy: req.user.email },
    { new: true, runValidators: true },
  )
  if (!update) throw new HttpError(404, 'Update not found.')
  await audit(req, 'update.update', update.slug, describe(update))
  res.json({ update })
})

router.delete('/:id', async (req, res) => {
  const update = await CityUpdate.findByIdAndDelete(req.params.id)
  if (!update) throw new HttpError(404, 'Update not found.')
  await audit(req, 'update.delete', update.slug, update.title)
  res.json({ ok: true })
})

export default router
