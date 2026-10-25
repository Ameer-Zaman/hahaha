import mongoose from 'mongoose'

/** Media slots used around the site. Each value is a GridFS media id or null. */
export const MEDIA_SLOTS = [
  'heroVideo',
  'welcomeVideo',
  'posterAdministration',
  'posterGangs',
  'posterWars',
  'posterRules',
  'joinImage',
]

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    media: {
      type: Object,
      default: () => Object.fromEntries(MEDIA_SLOTS.map((slot) => [slot, null])),
    },
  },
  { timestamps: true, minimize: false },
)

export const Settings = mongoose.model('Settings', settingsSchema)
