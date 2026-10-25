import mongoose from 'mongoose'

/** A published staff card on the Admin page, with its live status set from the panel. */
const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    portrait: { type: String, default: null }, // GridFS media id
    order: { type: Number, default: 0 },
    online: { type: Boolean, default: false },
    onDuty: { type: Boolean, default: false },
    statusUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

export const Staff = mongoose.model('Staff', staffSchema)
