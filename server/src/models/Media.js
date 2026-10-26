import mongoose from 'mongoose'

/**
 * A file stored on Cloudinary. Its _id is the media id used everywhere on the site (gang
 * cards, staff photos, homepage slots), exactly like the database-stored (GridFS) files.
 */
const mediaSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['cloudinary'], default: 'cloudinary' },
    publicId: { type: String, required: true, unique: true },
    resourceType: { type: String, enum: ['image', 'video'], required: true },
    format: { type: String, default: '' },
    version: { type: Number, required: true },
    bytes: { type: Number, default: 0 },
    width: Number,
    height: Number,
    duration: Number,
    name: { type: String, default: '' },
    uploadedBy: { type: String, default: '' },
  },
  { timestamps: true },
)

export const Media = mongoose.model('Media', mediaSchema)
