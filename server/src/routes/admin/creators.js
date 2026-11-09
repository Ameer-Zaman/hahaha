import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { Creator } from '../../models/Creator.js'
import { audit } from '../../services/audit.js'
import { liveErrors, liveSupport, refreshLive, refreshStats } from '../../services/creatorLive.js'
import { creatorManualLiveSchema, creatorSchema } from '../../validation/schemas.js'

/** Panel → Creators: the cards on the Creators page, and their live status. */
const router = Router()

const list = async () => Creator.find().sort({ order: 1, createdAt: 1 }).lean()

router.get('/', async (req, res) => {
  res.json({ creators: await list(), support: liveSupport(), errors: liveErrors() })
})

/** "Check now": run the live checks straight away. */
router.post('/check', async (req, res) => {
  await Promise.all([refreshLive({ force: true }), refreshStats({ force: true })])
  res.json({ creators: await list(), support: liveSupport(), errors: liveErrors() })
})

router.post('/', validateBody(creatorSchema), async (req, res) => {
  const creator = await Creator.create(req.body)
  await audit(req, 'creator.create', creator.id, creator.name)
  refreshLive({ force: true }).catch(() => {})
  refreshStats({ force: true }).catch(() => {})
  res.status(201).json({ creator })
})

router.put('/:id', validateBody(creatorSchema), async (req, res) => {
  const creator = await Creator.findById(req.params.id)
  if (!creator) throw new HttpError(404, 'Creator not found.')
  creator.set(req.body)
  await creator.save()
  await audit(req, 'creator.update', creator.id, creator.name)
  refreshLive({ force: true }).catch(() => {})
  refreshStats({ force: true }).catch(() => {})
  res.json({ creator })
})

router.post('/:id/live', validateBody(creatorManualLiveSchema), async (req, res) => {
  const { minutes, platform, url, title } = req.body
  const creator = await Creator.findByIdAndUpdate(
    req.params.id,
    { manual: { until: new Date(Date.now() + minutes * 60_000), platform, url, title } },
    { new: true },
  )
  if (!creator) throw new HttpError(404, 'Creator not found.')
  await audit(req, 'creator.live', creator.id, `${creator.name} → live on ${platform} for ${minutes} min`)
  res.json({ creator })
})

router.post('/:id/live/end', async (req, res) => {
  const creator = await Creator.findByIdAndUpdate(req.params.id, { 'manual.until': null }, { new: true })
  if (!creator) throw new HttpError(404, 'Creator not found.')
  await audit(req, 'creator.live.end', creator.id, creator.name)
  res.json({ creator })
})

router.delete('/:id', async (req, res) => {
  const creator = await Creator.findByIdAndDelete(req.params.id)
  if (!creator) throw new HttpError(404, 'Creator not found.')
  await audit(req, 'creator.delete', creator.id, creator.name)
  res.json({ ok: true })
})

export default router
