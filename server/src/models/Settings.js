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

/**
 * Story page media, set in Panel → Story media. Each place in a chapter (the big scene, the two
 * small cards, the quote) has a video and an image slot: the video plays (the image shows while
 * it loads), or the image alone. Names: story<Chapter><Place><Video|Image>, e.g. storyCitySceneVideo.
 * The chapters match client/src/content/story.js.
 */
const STORY_PLACES = {
  City: ['Scene', 'CardA', 'CardB', 'Quote'],
  Streets: ['Scene', 'CardA', 'CardB', 'Quote'],
  Night: ['Scene', 'CardA', 'CardB'],
}
export const STORY_SLOTS = Object.entries(STORY_PLACES).flatMap(([chapter, places]) =>
  places.flatMap((place) => [`story${chapter}${place}Video`, `story${chapter}${place}Image`]),
)
MEDIA_SLOTS.push(...STORY_SLOTS)

/** Website sections that can be switched off from the panel (Home is always on). */
export const SECTION_KEYS = ['story', 'staff', 'gangs', 'clubs', 'dhadhas', 'leaderboard', 'rules', 'chat']

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
