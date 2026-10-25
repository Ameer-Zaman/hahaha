import mongoose from 'mongoose'

/** A published staff card on the Staffs page, with its live status set from the panel. */
const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    /** Department the card is listed under, e.g. Management, PD, EMS (free text). */
    department: { type: String, default: '', trim: true },
    /** Profile links shown on the card: { discord, youtube, twitch, kick, tiktok, instagram, x, facebook } */
    socials: { type: Object, default: () => ({}) },
    portrait: { type: String, default: null }, // GridFS media id
    order: { type: Number, default: 0 },
    online: { type: Boolean, default: false },
    onDuty: { type: Boolean, default: false },
    statusUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false },
)

export const Staff = mongoose.model('Staff', staffSchema)
