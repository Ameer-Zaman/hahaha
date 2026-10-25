import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { MEDIA_SLOTS, Settings } from '../../models/Settings.js'
import { audit } from '../../services/audit.js'
import { findFile } from '../../services/media.js'
import { settingsMediaSchema } from '../../validation/schemas.js'

const router = Router()

const VIDEO_SLOTS = new Set(['heroVideo', 'welcomeVideo'])

const getSettings = async () =>
  (await Settings.findOne({ key: 'main' })) ?? (await Settings.create({ key: 'main' }))

router.get('/', async (req, res) => {
  const settings = await getSettings()
  res.json({ slots: MEDIA_SLOTS, media: settings.media })
})

router.put('/media', validateBody(settingsMediaSchema), async (req, res) => {
  const settings = await getSettings()
  const next = { ...settings.media }
  const changed = []
  for (const [slot, id] of Object.entries(req.body.media)) {
    if (!MEDIA_SLOTS.includes(slot)) throw new HttpError(400, `Unknown slot: ${slot}`)
    if (id) {
      const file = await findFile(id)
      if (!file) throw new HttpError(400, `${slot}: file not found.`)
      const kind = file.metadata?.kind
      if (VIDEO_SLOTS.has(slot) ? kind !== 'video' : kind !== 'image') {
        throw new HttpError(400, `${slot} needs ${VIDEO_SLOTS.has(slot) ? 'a video' : 'an image'}.`)
      }
    }
    if ((next[slot] ?? null) !== id) changed.push(slot)
    next[slot] = id
  }
  settings.media = next
  settings.markModified('media')
  await settings.save()
  if (changed.length) await audit(req, 'settings.media', 'site', changed.join(', '))
  res.json({ slots: MEDIA_SLOTS, media: settings.media })
})

export default router
