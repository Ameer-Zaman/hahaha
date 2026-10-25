import { Router } from 'express'
import multer from 'multer'

import { env } from '../../config/env.js'
import { HttpError } from '../../middleware/errors.js'
import { Gang } from '../../models/Gang.js'
import { Settings } from '../../models/Settings.js'
import { Staff } from '../../models/Staff.js'
import { issueUploadToken } from '../../middleware/uploadToken.js'
import { audit } from '../../services/audit.js'
import { deleteFile, listFiles, storeUpload } from '../../services/media.js'

const router = Router()

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Math.max(env.uploads.imageMaxBytes, env.uploads.videoMaxBytes), files: 1 },
})

export async function handleUpload(req, res) {
  const file = await storeUpload(req.file, req.user)
  await audit(req, 'media.upload', file.id, `${file.name} · ${Math.round(file.size / 1024)} KB`)
  res.status(201).json({ file })
}

/** Where a file is used, so the panel can warn before deleting it. */
async function usageOf(id) {
  const [gangs, staff, settings] = await Promise.all([
    Gang.find({ $or: [{ image: id }, { emblem: id }, { video: id }] }, 'name').lean(),
    Staff.find({ portrait: id }, 'name').lean(),
    Settings.findOne({ key: 'main' }).lean(),
  ])
  const slots = Object.entries(settings?.media ?? {})
    .filter(([, value]) => value === id)
    .map(([slot]) => slot)
  return [...gangs.map((g) => `Gang: ${g.name}`), ...staff.map((s) => `Staff: ${s.name}`), ...slots.map((s) => `Site: ${s}`)]
}

router.get('/', async (req, res) => {
  res.json({ files: await listFiles() })
})

router.post('/', upload.single('file'), handleUpload)

/** A short-lived token for sending a large file straight to the API server. */
router.post('/upload-token', (req, res) => {
  res.json(issueUploadToken(req.user))
})

router.delete('/:id', async (req, res) => {
  const usedBy = await usageOf(req.params.id)
  if (usedBy.length && req.query.force !== '1') {
    throw new HttpError(409, `This file is still used by ${usedBy.join(', ')}. Remove it there first.`)
  }
  const file = await deleteFile(req.params.id)
  await audit(req, 'media.delete', file.id, file.name)
  res.json({ ok: true })
})

export default router
