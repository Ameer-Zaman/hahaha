import mongoose from 'mongoose'
import { Readable } from 'node:stream'

import { env } from '../config/env.js'
import { mediaBucket } from '../db.js'
import { HttpError } from '../middleware/errors.js'
import { Media } from '../models/Media.js'
import { ALLOWED_FORMATS, deliveryUrl, destroy, fetchResource, verifyUploadSignature } from './cloudinary.js'

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
  return describe(await findGridFile(id))
}

/** The raw GridFS file (database storage), for streaming. */
export async function findGridFile(id) {
  if (!mongoose.isValidObjectId(id)) return null
  const files = await mediaBucket().find({ _id: new mongoose.Types.ObjectId(String(id)) }).limit(1).toArray()
  return files[0] ?? null
}

export async function findCloudFile(id) {
  if (!mongoose.isValidObjectId(id)) return null
  return Media.findById(id).lean()
}

/** Any stored file, wherever it lives, described the same way (or null). */
export async function findFile(id) {
  const cloud = await findCloudFile(id)
  if (cloud) return describeCloud(cloud)
  const grid = await findGridFile(id)
  return grid ? describe(grid) : null
}

export async function listFiles() {
  const [cloud, grid] = await Promise.all([
    Media.find().sort({ createdAt: -1 }).limit(500).lean(),
    mediaBucket().find({}).sort({ uploadDate: -1 }).limit(500).toArray(),
  ])
  return [...cloud.map(describeCloud), ...grid.map(describe)].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
}

export async function deleteFile(id) {
  const cloud = await findCloudFile(id)
  if (cloud) {
    await destroy(cloud.resourceType, cloud.publicId)
    await Media.deleteOne({ _id: cloud._id })
    return describeCloud(cloud)
  }
  const file = await findGridFile(id)
  if (!file) throw new HttpError(404, 'File not found.')
  await mediaBucket().delete(file._id)
  return describe(file)
}

/**
 * Records a file the panel uploaded straight to Cloudinary — after checking Cloudinary's
 * signature on the upload answer and reading the file's real type and size from Cloudinary.
 */
export async function registerCloudUpload({ publicId, version, signature, resourceType, name }, user) {
  if (!env.cloudinary.enabled) throw new HttpError(409, 'Cloudinary is not configured on the server.')
  if (!['image', 'video'].includes(resourceType)) throw new HttpError(400, 'Unknown file type.')
  if (typeof publicId !== 'string' || !publicId.startsWith(`${env.cloudinary.folder}/`) || publicId.includes('..')) {
    throw new HttpError(400, 'That file is not in this site\'s Cloudinary folder.')
  }
  if (!verifyUploadSignature({ publicId, version, signature })) throw new HttpError(400, 'The upload could not be verified.')

  const info = await fetchResource(resourceType, publicId)
  const format = String(info.format ?? '').toLowerCase()
  const limit = resourceType === 'image' ? env.uploads.imageMaxBytes : env.uploads.videoMaxBytes
  const reject = async (message, status) => {
    await destroy(resourceType, publicId).catch(() => {})
    throw new HttpError(status, message)
  }
  if (!ALLOWED_FORMATS[resourceType].includes(format)) await reject('Only JPG, PNG, WebP, GIF images and MP4, WebM or MOV videos can be uploaded.', 415)
  if (Number(info.bytes) > limit) await reject(`That ${resourceType} is too large (max ${Math.round(limit / 1024 / 1024)} MB).`, 413)

  const doc = await Media.findOneAndUpdate(
    { publicId },
    {
      publicId,
      resourceType,
      format,
      version: Number(info.version ?? version),
      bytes: Number(info.bytes) || 0,
      width: info.width,
      height: info.height,
      duration: info.duration,
      name: cleanName(name || info.original_filename || publicId.split('/').pop()),
      uploadedBy: user?.email ?? '',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()
  return describeCloud(doc)
}

export function describeCloud(m) {
  return {
    id: m._id.toString(),
    name: m.name,
    kind: m.resourceType,
    contentType: `${m.resourceType}/${m.format === 'jpg' ? 'jpeg' : m.format === 'mov' ? 'quicktime' : m.format}`,
    size: m.bytes,
    uploadedAt: m.createdAt,
    uploadedBy: m.uploadedBy,
    provider: 'cloudinary',
    url: deliveryUrl(m),
    thumb: deliveryUrl(m, { thumb: true }),
  }
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
    provider: 'database',
    url: mediaUrl(file._id),
    thumb: mediaUrl(file._id),
  }
}

export const mediaUrl = (id) => (id ? `/api/media/${id}` : null)

/**
 * Public addresses for a set of media ids in one database read: Cloudinary files get their
 * direct (optimised) Cloudinary address, database files their /api/media address.
 */
export async function resolveMediaUrls(ids) {
  const wanted = [...new Set(ids.filter((id) => id && mongoose.isValidObjectId(id)).map(String))]
  const map = new Map()
  if (wanted.length) {
    const docs = await Media.find({ _id: { $in: wanted } }).lean()
    for (const d of docs) map.set(d._id.toString(), deliveryUrl(d))
  }
  return (id) => (id ? (map.get(String(id)) ?? mediaUrl(id)) : null)
}
