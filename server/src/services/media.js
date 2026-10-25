import mongoose from 'mongoose'
import { Readable } from 'node:stream'

import { env } from '../config/env.js'
import { mediaBucket } from '../db.js'
import { HttpError } from '../middleware/errors.js'

/**
 * Accepted upload types, recognised by their first bytes (not just the file name), so a
 * renamed file can't slip through. SVG is deliberately not accepted (it can carry scripts).
 */
const SIGNATURES = [
  { type: 'image/jpeg', kind: 'image', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/png', kind: 'image', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: 'image/gif', kind: 'image', test: (b) => b.subarray(0, 4).toString('ascii') === 'GIF8' },
  { type: 'image/webp', kind: 'image', test: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
  { type: 'video/mp4', kind: 'video', test: (b) => b.subarray(4, 8).toString('ascii') === 'ftyp' },
  { type: 'video/webm', kind: 'video', test: (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
]

export function detectType(buffer) {
  return SIGNATURES.find((sig) => buffer.length >= 12 && sig.test(buffer)) ?? null
}

const cleanName = (name) => String(name || 'upload').replace(/[^\w.\- ]+/g, '').slice(0, 120) || 'upload'

/** Stores one uploaded file in GridFS and returns its public description. */
export async function storeUpload(file, user) {
  if (!file?.buffer?.length) throw new HttpError(400, 'No file received.')
  const sig = detectType(file.buffer)
  if (!sig) throw new HttpError(415, 'Only JPG, PNG, WebP, GIF images and MP4 or WebM videos can be uploaded.')
  const limit = sig.kind === 'image' ? env.uploads.imageMaxBytes : env.uploads.videoMaxBytes
  if (file.buffer.length > limit) {
    throw new HttpError(413, `That ${sig.kind} is too large (max ${Math.round(limit / 1024 / 1024)} MB).`)
  }
  const id = new mongoose.Types.ObjectId()
  await new Promise((resolve, reject) => {
    Readable.from(file.buffer)
      .pipe(
        mediaBucket().openUploadStreamWithId(id, cleanName(file.originalname), {
          metadata: { contentType: sig.type, kind: sig.kind, uploadedBy: user?.email ?? '' },
        }),
      )
      .on('finish', resolve)
      .on('error', reject)
  })
  return describe(await findFile(id))
}

export async function findFile(id) {
  if (!mongoose.isValidObjectId(id)) return null
  const files = await mediaBucket().find({ _id: new mongoose.Types.ObjectId(String(id)) }).limit(1).toArray()
  return files[0] ?? null
}

export async function listFiles() {
  const files = await mediaBucket().find({}).sort({ uploadDate: -1 }).limit(500).toArray()
  return files.map(describe)
}

export async function deleteFile(id) {
  const file = await findFile(id)
  if (!file) throw new HttpError(404, 'File not found.')
  await mediaBucket().delete(file._id)
  return describe(file)
}

export function describe(file) {
  return {
    id: file._id.toString(),
    name: file.filename,
    kind: file.metadata?.kind ?? 'image',
    contentType: file.metadata?.contentType ?? 'application/octet-stream',
    size: file.length,
    uploadedAt: file.uploadDate,
    uploadedBy: file.metadata?.uploadedBy ?? '',
    url: mediaUrl(file._id),
  }
}

export const mediaUrl = (id) => (id ? `/api/media/${id}` : null)
