import { Router } from 'express'

import { mediaBucket } from '../db.js'
import { deliveryUrl } from '../services/cloudinary.js'
import { findCloudFile, findGridFile } from '../services/media.js'

/**
 * Serves uploaded images and videos. Supports byte ranges, so videos can stream and seek.
 * Files never change once uploaded (a new upload gets a new id), so they cache forever.
 */
const router = Router()

router.get('/:id', async (req, res) => {
  // Cloudinary files: send the browser to Cloudinary (ids never change, so cache the answer)
  const cloud = await findCloudFile(req.params.id)
  if (cloud) {
    res.set('Cache-Control', 'public, max-age=86400')
    return res.redirect(301, deliveryUrl(cloud))
  }
  const file = await findGridFile(req.params.id)
  if (!file) return res.status(404).json({ message: 'Not found.' })

  const size = file.length
  res.set({
    'Content-Type': file.metadata?.contentType ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  })

  const range = req.get('range')
  const match = range && /^bytes=(\d*)-(\d*)$/.exec(range)
  if (match) {
    let start = match[1] === '' ? size - Number(match[2]) : Number(match[1])
    let end = match[1] !== '' && match[2] !== '' ? Number(match[2]) : size - 1
    start = Math.max(0, start)
    end = Math.min(end, size - 1)
    if (start > end) {
      res.set('Content-Range', `bytes */${size}`)
      return res.status(416).end()
    }
    res.status(206).set({ 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 })
    return mediaBucket().openDownloadStream(file._id, { start, end: end + 1 }).pipe(res)
  }

  res.set('Content-Length', size)
  mediaBucket().openDownloadStream(file._id).pipe(res)
})

export default router
