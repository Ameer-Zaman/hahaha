import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { Settings } from '../../models/Settings.js'
import { audit } from '../../services/audit.js'
import { findFile } from '../../services/media.js'
import { gallerySchema } from '../../validation/schemas.js'

/** Panel → Gallery: the photos on the Gallery page. Saved as one ordered list; every save is audited. */
const router = Router()

const getSettings = async () => (await Settings.findOne({ key: 'main' })) ?? (await Settings.create({ key: 'main' }))
const plain = (items) => (items ?? []).map(({ media, caption, credit }) => ({ media, caption: caption ?? '', credit: credit ?? '' }))

router.get('/', async (req, res) => {
  const settings = await Settings.findOne({ key: 'main' }, 'gallery').lean()
  res.json({ items: plain(settings?.gallery) })
})

router.put('/', validateBody(gallerySchema), async (req, res) => {
  const items = req.body.items
  const ids = [...new Set(items.map((i) => i.media))]
  if (ids.length !== items.length) throw new HttpError(400, 'The same photo is in the gallery twice — remove one.')
  for (const id of ids) {
    const file = await findFile(id)
    if (!file) throw new HttpError(400, 'A photo is no longer in the media library — remove it and add it again.')
    if (file.kind !== 'image') throw new HttpError(400, `${file.name} is a video. The gallery takes pictures only.`)
  }
  const settings = await getSettings()
  const before = plain(settings.gallery)
  settings.gallery = items
  settings.markModified('gallery')
  await settings.save()
  const added = ids.filter((id) => !before.some((b) => b.media === id)).length
  const removed = before.filter((b) => !ids.includes(b.media)).length
  const parts = [added && `${added} added`, removed && `${removed} removed`, !added && !removed && 'captions or order changed'].filter(
    Boolean,
  )
  await audit(req, 'gallery.update', 'gallery', `${items.length} photos · ${parts.join(', ')}`)
  res.json({ items: plain(settings.gallery) })
})

export default router
