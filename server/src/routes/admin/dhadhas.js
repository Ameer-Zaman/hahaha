import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { Settings, readDhadhas } from '../../models/Settings.js'
import { audit } from '../../services/audit.js'
import { findFile } from '../../services/media.js'
import { dhadhasSchema } from '../../validation/schemas.js'

/** Panel → Dhadhas: the clan page (seal, motto, oath, ranks, members, joining). Every save is audited. */
const router = Router()

const getSettings = async () => (await Settings.findOne({ key: 'main' })) ?? (await Settings.create({ key: 'main' }))

router.get('/', async (req, res) => {
  const settings = await Settings.findOne({ key: 'main' }, 'dhadhas').lean()
  res.json(readDhadhas(settings))
})

router.put('/', validateBody(dhadhasSchema), async (req, res) => {
  const next = { ...req.body, crest: req.body.crest ?? null, members: req.body.members.map((m) => ({ ...m, photo: m.photo ?? null })) }

  // every picture must be a picture that is still in the media library
  const pictures = [['The seal', next.crest], ...next.members.map((m) => [`${m.name}'s photo`, m.photo])].filter(([, id]) => id)
  for (const [what, id] of pictures) {
    const file = await findFile(id)
    if (!file) throw new HttpError(400, `${what} is no longer in the media library — choose it again.`)
    if (file.kind !== 'image') throw new HttpError(400, `${what} is a video. Use a picture.`)
  }
  const names = next.members.map((m) => m.name.toLowerCase())
  const twice = names.find((n, i) => names.indexOf(n) !== i)
  if (twice) throw new HttpError(400, `${next.members.find((m) => m.name.toLowerCase() === twice).name} is on the list twice.`)

  const settings = await getSettings()
  const before = readDhadhas(settings)
  settings.dhadhas = next
  settings.markModified('dhadhas')
  await settings.save()

  const changed = Object.keys(next).filter((k) => JSON.stringify(next[k]) !== JSON.stringify(before[k]))
  await audit(req, 'dhadhas.update', 'dhadhas', changed.length ? `changed: ${changed.join(', ')}` : 'saved without changes')
  res.json(readDhadhas(settings))
})

export default router
