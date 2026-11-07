import mongoose from 'mongoose'

/**
 * A live gang situation: "Gang A vs Gang B is happening now — watch it here". Admins send one
 * from Panel → Live; every visitor sees it as a notification until it ends — either an admin
 * ends it, or its time runs out (so a forgotten one never stays up for days).
 */
const liveAlertSchema = new mongoose.Schema(
  {
    /** The two sides, as gang slugs from Panel → Gangs. */
    gangA: { type: String, required: true, trim: true, lowercase: true },
    gangB: { type: String, required: true, trim: true, lowercase: true },
    /** Optional headline, e.g. "Turf war at Grove Street". */
    title: { type: String, default: '', trim: true, maxlength: 80 },
    /** The live stream (Twitch, YouTube, Kick …). Always an http(s) address. */
    url: { type: String, required: true, trim: true, maxlength: 500 },
    note: { type: String, default: '', trim: true, maxlength: 200 },
    endsAt: { type: Date, required: true },
    /** Set when an admin ends it early. */
    endedAt: { type: Date, default: null },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true },
)

liveAlertSchema.index({ endsAt: -1 })

export const isOn = (a, now = new Date()) => !a.endedAt && new Date(a.endsAt) > now

export const LiveAlert = mongoose.model('LiveAlert', liveAlertSchema)
