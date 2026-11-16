import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { Dhadha } from '../../models/Dhadha.js'
import { audit } from '../../services/audit.js'
import { findFile } from '../../services/media.js'
import { dhadhaSchema } from '../../validation/schemas.js'

/** Panel → Dhadhas: every Dhadha and his crew — list, create, edit, delete (every change is audited). */
const router = Router()

/** Every picture must still be in the media library, and be a picture; no player twice. */
async function check(body) {
  const pictures = [[`${body.name}'s photo`, body.photo], ...body.members.map((m) => [`${m.name}'s photo`, m.photo])].filter(([, id]) => id)
  for (const [what, id] of pictures) {
    const file = await findFile(id)
    if (!file) throw new HttpError(400, `${what} is no longer in the media library — choose it again.`)
    if (file.kind !== 'image') throw new HttpError(400, `${what} is a video. Use a picture.`)
  }
  const names = body.members.map((m) => m.name.toLowerCase())
  const twice = names.find((n, i) => names.indexOf(n) !== i)
  if (twice) throw new HttpError(400, `${body.members.find((m) => m.name.toLowerCase() === twice).name} is in the crew twice.`)
  return { ...body, photo: body.photo ?? null, members: body.members.map((m) => ({ ...m, photo: m.photo ?? null })) }
}

/** A short, readable record of what changed in the crew. */
function crewChanges(before, after) {
  const was = new Map((before ?? []).map((m) => [m.name.toLowerCase(), m]))
  const now = new Set(after.map((m) => m.name.toLowerCase()))
  const added = after.filter((m) => !was.has(m.name.toLowerCase())).map((m) => m.name)
  const removed = (before ?? []).filter((m) => !now.has(m.name.toLowerCase())).map((m) => m.name)
  const plain = (m) => JSON.stringify({ ...m, photo: m.photo ?? null })
  const edited = after.filter((m) => was.has(m.name.toLowerCase()) && plain(was.get(m.name.toLowerCase())) !== plain(m)).map((m) => m.name)
  return [
    added.length && `added ${added.join(', ')}`,
    removed.length && `removed ${removed.join(', ')}`,
    edited.length && `updated ${edited.join(', ')}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

router.get('/', async (req, res) => {
  const dhadhas = await Dhadha.find().sort({ order: 1, createdAt: 1 }).lean()
  res.json({ dhadhas })
})

router.get('/:id', async (req, res) => {
  const dhadha = await Dhadha.findById(req.params.id).lean()
  if (!dhadha) throw new HttpError(404, 'Dhadha not found.')
  res.json({ dhadha })
})

router.post('/', validateBody(dhadhaSchema), async (req, res) => {
  const dhadha = await Dhadha.create(await check(req.body))
  await audit(req, 'dhadha.create', dhadha.slug, `${dhadha.name} · ${dhadha.members.length} players`)
  res.status(201).json({ dhadha })
})

router.put('/:id', validateBody(dhadhaSchema), async (req, res) => {
  const body = await check(req.body)
  const before = await Dhadha.findById(req.params.id).lean()
  if (!before) throw new HttpError(404, 'Dhadha not found.')
  const dhadha = await Dhadha.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true })
  await audit(req, 'dhadha.update', dhadha.slug, [dhadha.name, crewChanges(before.members, body.members)].filter(Boolean).join(' · '))
  res.json({ dhadha })
})

router.delete('/:id', async (req, res) => {
  const dhadha = await Dhadha.findByIdAndDelete(req.params.id)
  if (!dhadha) throw new HttpError(404, 'Dhadha not found.')
  await audit(req, 'dhadha.delete', dhadha.slug, dhadha.name)
  res.json({ ok: true })
})

export default router
