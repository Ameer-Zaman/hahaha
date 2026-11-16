import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { Settings, readMusic } from '../../models/Settings.js'
import { audit } from '../../services/audit.js'
import { findFile } from '../../services/media.js'
import { musicSchema } from '../../validation/schemas.js'

/** Panel → Music: the songs visitors can choose from the header's music menu. Every save is audited. */
const router = Router()

router.get('/', async (req, res) => {
  const settings = await Settings.findOne({ key: 'main' }, 'music').lean()
  res.json(readMusic(settings))
})

router.put('/', validateBody(musicSchema), async (req, res) => {
  const { tracks } = req.body
  for (const t of tracks) {
    const file = await findFile(t.media)
    if (!file) throw new HttpError(400, `The file for “${t.title}” is no longer in the media library — choose it again.`)
    if (file.kind !== 'audio') throw new HttpError(400, `“${t.title}” isn't a song file. Choose an MP3, OGG, WAV or M4A.`)
  }
  const settings = (await Settings.findOne({ key: 'main' })) ?? (await Settings.create({ key: 'main' }))
  const before = readMusic(settings).tracks.map((t) => t.title)
  settings.music = { tracks }
  settings.markModified('music')
  await settings.save()
  const now = tracks.map((t) => t.title)
  const added = now.filter((t) => !before.includes(t))
  const removed = before.filter((t) => !now.includes(t))
  const note = [added.length && `added ${added.join(', ')}`, removed.length && `removed ${removed.join(', ')}`].filter(Boolean).join(' · ')
  await audit(req, 'music.update', 'music', note || `${tracks.length} songs`)
  res.json(readMusic(settings))
})

export default router
