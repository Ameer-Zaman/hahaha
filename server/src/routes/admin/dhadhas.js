import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { Settings, readDhadhas } from '../../models/Settings.js'
import { audit } from '../../services/audit.js'
import { findFile } from '../../services/media.js'
import { dhadhasSchema } from '../../validation/schemas.js'

/** Panel → Dhadhas: the Dhadha and his crew (rank, coins, fights). Every save is audited. */
const router = Router()

const getSettings = async () => (await Settings.findOne({ key: 'main' })) ?? (await Settings.create({ key: 'main' }))

router.get('/', async (req, res) => {
  const settings = await Settings.findOne({ key: 'main' }, 'dhadhas').lean()
  res.json(readDhadhas(settings))
})

router.put('/', validateBody(dhadhasSchema), async (req, res) => {
  const next = {
    leader: { ...req.body.leader, photo: req.body.leader.photo ?? null },
    members: req.body.members.map((m) => ({ ...m, photo: m.photo ?? null })),
  }

  // every picture must be a picture that is still in the media library
  const pictures = [
    [`${next.leader.name || 'The Dhadha'}'s photo`, next.leader.photo],
    ...next.members.map((m) => [`${m.name}'s photo`, m.photo]),
  ].filter(([, id]) => id)
  for (const [what, id] of pictures) {
    const file = await findFile(id)
    if (!file) throw new HttpError(400, `${what} is no longer in the media library — choose it again.`)
    if (file.kind !== 'image') throw new HttpError(400, `${what} is a video. Use a picture.`)
  }
  const names = next.members.map((m) => m.name.toLowerCase())
  const twice = names.find((n, i) => names.indexOf(n) !== i)
  if (twice) throw new HttpError(400, `${next.members.find((m) => m.name.toLowerCase() === twice).name} is in the crew twice.`)

  const settings = await getSettings()
  const before = readDhadhas(settings)
  settings.dhadhas = next
  settings.markModified('dhadhas')
  await settings.save()

  // a short, readable record of what changed
  const parts = []
  if (JSON.stringify(before.leader) !== JSON.stringify(next.leader)) parts.push('the Dhadha')
  const was = new Map(before.members.map((m) => [m.name.toLowerCase(), m]))
  const added = next.members.filter((m) => !was.has(m.name.toLowerCase())).map((m) => m.name)
  const removed = before.members.filter((m) => !names.includes(m.name.toLowerCase())).map((m) => m.name)
  const edited = next.members
    .filter((m) => was.has(m.name.toLowerCase()) && JSON.stringify(was.get(m.name.toLowerCase())) !== JSON.stringify(m))
    .map((m) => m.name)
  if (added.length) parts.push(`added ${added.join(', ')}`)
  if (removed.length) parts.push(`removed ${removed.join(', ')}`)
  if (edited.length) parts.push(`updated ${edited.join(', ')}`)
  await audit(req, 'dhadhas.update', 'dhadhas', parts.join(' · ') || 'saved without changes')
  res.json(readDhadhas(settings))
})

export default router
