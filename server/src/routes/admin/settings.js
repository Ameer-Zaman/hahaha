import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { defaultSections, MEDIA_SLOTS, SECTION_KEYS, Settings } from '../../models/Settings.js'
import { audit } from '../../services/audit.js'
import { findFile } from '../../services/media.js'
import { settingsMediaSchema, settingsSiteSchema } from '../../validation/schemas.js'

const router = Router()

const VIDEO_SLOTS = new Set(['heroVideo', 'welcomeVideo'])

const getSettings = async () =>
  (await Settings.findOne({ key: 'main' })) ?? (await Settings.create({ key: 'main' }))

const siteState = (settings) => ({
  sections: { ...defaultSections(), ...(settings.sections ?? {}) },
  maintenance: {
    on: Boolean(settings.maintenance?.on),
    message: settings.maintenance?.message ?? '',
    changedAt: settings.maintenance?.changedAt ?? null,
  },
})

router.get('/', async (req, res) => {
  const settings = await getSettings()
  res.json({ slots: MEDIA_SLOTS, media: settings.media, ...siteState(settings) })
})

/** Sections on/off and maintenance mode. Each change is written to the audit log. */
router.put('/site', validateBody(settingsSiteSchema), async (req, res) => {
  const settings = await getSettings()
  const before = siteState(settings)
  const entries = [] // audit entries, written once the change is saved

  if (req.body.sections) {
    const next = { ...before.sections, ...req.body.sections }
    const changed = SECTION_KEYS.filter((key) => next[key] !== before.sections[key])
    settings.sections = next
    settings.markModified('sections')
    if (changed.length) {
      const detail = changed.map((key) => `${key} ${next[key] ? 'on' : 'off'}`).join(', ')
      entries.push(['settings.sections', detail])
    }
  }

  if (req.body.maintenance) {
    const { on, message } = req.body.maintenance
    const switched = on !== before.maintenance.on
    settings.maintenance = {
      on,
      message,
      changedAt: switched ? new Date() : (settings.maintenance?.changedAt ?? null),
    }
    if (switched) entries.push(['settings.maintenance', on ? 'on' : 'off'])
    else if (message !== before.maintenance.message) entries.push(['settings.maintenance', 'message updated'])
  }

  await settings.save()
  for (const [action, detail] of entries) await audit(req, action, 'site', detail)
  res.json(siteState(settings))
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
