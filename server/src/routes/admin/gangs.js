import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { Gang } from '../../models/Gang.js'
import { War } from '../../models/War.js'
import { audit } from '../../services/audit.js'
import { gangSchema, importPlayersSchema } from '../../validation/schemas.js'

const router = Router()

router.get('/', async (req, res) => {
  const gangs = await Gang.find().sort({ order: 1, createdAt: 1 }).lean()
  res.json({ gangs })
})

/**
 * Import players into one or more gangs at once (from the panel's JSON import).
 * All gangs must exist; nothing is changed if any slug is unknown.
 */
router.post('/import-players', validateBody(importPlayersSchema), async (req, res) => {
  const { mode, gangs: bySlug } = req.body
  const slugs = Object.keys(bySlug)
  const gangs = await Gang.find({ slug: { $in: slugs } })
  const found = new Set(gangs.map((g) => g.slug))
  const missing = slugs.filter((s) => !found.has(s))
  if (missing.length) throw new HttpError(400, `Unknown gang: ${missing.join(', ')}. Create it first or fix the name.`)

  const results = []
  for (const gang of gangs) {
    const incoming = bySlug[gang.slug]
    let added = 0
    let updated = 0
    if (mode === 'replace') {
      gang.members = incoming
      added = incoming.length
    } else {
      const list = gang.members.map((m) => ({ name: m.name, role: m.role, since: m.since }))
      const index = new Map(list.map((m, i) => [m.name.trim().toLowerCase(), i]))
      for (const player of incoming) {
        const key = player.name.trim().toLowerCase()
        if (index.has(key)) {
          list[index.get(key)] = { ...list[index.get(key)], ...player }
          updated += 1
        } else {
          index.set(key, list.length)
          list.push(player)
          added += 1
        }
      }
      if (list.length > 200) throw new HttpError(400, `${gang.name} would have more than 200 players.`)
      gang.members = list
    }
    await gang.save()
    results.push({ slug: gang.slug, name: gang.name, added, updated, total: gang.members.length })
  }
  const summary = results.map((r) => `${r.name}: ${r.total}`).join(', ')
  await audit(req, 'gang.import_players', slugs.join(','), `${mode} · ${summary}`)
  res.json({ mode, results })
})

router.get('/:id', async (req, res) => {
  const gang = await Gang.findById(req.params.id).lean()
  if (!gang) throw new HttpError(404, 'Gang not found.')
  res.json({ gang })
})

router.post('/', validateBody(gangSchema), async (req, res) => {
  const gang = await Gang.create(req.body)
  await audit(req, 'gang.create', gang.slug, gang.name)
  res.status(201).json({ gang })
})

router.put('/:id', validateBody(gangSchema), async (req, res) => {
  const gang = await Gang.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!gang) throw new HttpError(404, 'Gang not found.')
  await audit(req, 'gang.update', gang.slug, `${gang.name} · ${gang.members.length} players`)
  res.json({ gang })
})

router.delete('/:id', async (req, res) => {
  const gang = await Gang.findByIdAndDelete(req.params.id)
  if (!gang) throw new HttpError(404, 'Gang not found.')
  const { deletedCount } = await War.deleteMany({ sides: gang._id })
  await audit(req, 'gang.delete', gang.slug, `${gang.name} (and ${deletedCount} war records)`)
  res.json({ ok: true, removedWars: deletedCount })
})

export default router
