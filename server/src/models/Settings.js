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

/** Website sections that can be switched off from the panel (Home is always on). */
export const SECTION_KEYS = ['story', 'staff', 'gangs', 'clubs', 'dhadhas', 'leaderboard', 'rules']

export const defaultSections = () => Object.fromEntries(SECTION_KEYS.map((key) => [key, true]))

/** Saved switches over the defaults. ("admin" is the old name of the Staffs section.) */
export function readSections(settings) {
  const saved = { ...(settings?.sections ?? {}) }
  if (saved.staff === undefined && saved.admin !== undefined) saved.staff = saved.admin
  return Object.fromEntries(SECTION_KEYS.map((key) => [key, saved[key] !== false]))
}

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    media: {
      type: Object,
      default: () => Object.fromEntries(MEDIA_SLOTS.map((slot) => [slot, null])),
    },
    /** Which sections show in the menu and can be opened (missing key = on). */
    sections: { type: Object, default: defaultSections },
    /** Maintenance mode: visitors see a "be right back" screen; the panel keeps working. */
    maintenance: {
      on: { type: Boolean, default: false },
      message: { type: String, default: '', maxlength: 300 },
      changedAt: { type: Date, default: null },
    },
  },
  { timestamps: true, minimize: false },
)

export const Settings = mongoose.model('Settings', settingsSchema)
