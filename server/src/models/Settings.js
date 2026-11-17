import mongoose from 'mongoose'

/** Media slots used around the site. Each value is a GridFS media id or null. */
export const MEDIA_SLOTS = [
  'welcomeImage',
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
/**
 * The places on the Story page that can show a picture or a video. The quotes between the
 * chapters are words on their own — they carry no picture, so they take no slot.
 */
const STORY_PLACES = {
  City: ['Scene', 'CardA', 'CardB'],
  Streets: ['Scene', 'CardA', 'CardB'],
  Night: ['Scene', 'CardA', 'CardB'],
}
export const STORY_SLOTS = Object.entries(STORY_PLACES).flatMap(([chapter, places]) =>
  places.flatMap((place) => [`story${chapter}${place}Video`, `story${chapter}${place}Image`]),
)
MEDIA_SLOTS.push(...STORY_SLOTS)

/** Website sections that can be switched off from the panel (Home is always on). */
export const SECTION_KEYS = [
  'story',
  'staff',
  'creators',
  'gangs',
  'clubs',
  'dhadhas',
  'events',
  'leaderboard',
  'gallery',
  'rules',
  'store',
  'chat',
]

/** The saved community links, or null when the panel has never set them. */
export const readSocials = (settings) =>
  Array.isArray(settings?.socials) ? settings.socials.map(({ platform, url }) => ({ platform, url })) : null

/** The chat assistant's name until the team picks another in the panel. */
export const DEFAULT_BOT_NAME = 'Vexy'

/**
 * The bot's answer to "how do I join / get whitelisted?" until staff write their own.
 * The website keeps the same text in client/src/content/joinGuide.js.
 */
export const DEFAULT_JOIN_GUIDE = `**How to get whitelisted — Rameirah Empire**

1. **Apply for the whitelist.** Apply on Discord in **🔱・ᴡʜɪᴛᴇʟɪꜱᴛ-ᴀᴘᴘʟʏ** (press **Whitelist Form**) or through the website. Fill in your real character name, age and details.
2. **Wait for staff review.** Our staff will review your application. When your application is pending, join the **Resident Waiting** voice channel and wait there until the final verification.
3. **Interview questions.** After you are verified, go to the website and fill in your interview questions. Log in with Discord, read the rules first, and answer the questions yourself.
4. **IP whitelist.** Whitelist your IP on the website.

Once everything is done you get your **Resident** role, and you can join the city.

⚠️ **Fake details and alt accounts are not allowed. One account per person.**`

/** The saved bot settings, with the defaults filled in. */
export const readChatBot = (settings) => ({
  name: settings?.chatBot?.name?.trim() || DEFAULT_BOT_NAME,
  avatar: settings?.chatBot?.avatar ?? null,
  joinGuide: settings?.chatBot?.joinGuide?.trim() || DEFAULT_JOIN_GUIDE,
})

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
    /**
     * The community's own links (Discord, YouTube …), shown in the header, footer and phone
     * menu. null = never set: the website keeps the links in its config file.
     */
    socials: { type: [{ _id: false, platform: String, url: String }], default: undefined },
    /** The website chat's assistant: what it is called and its picture (a media id). */
    chatBot: {
      name: { type: String, default: DEFAULT_BOT_NAME, maxlength: 30 },
      avatar: { type: String, default: null },
      /** Its answer to "how do I join / get whitelisted?" (markdown). Empty = the default guide. */
      joinGuide: { type: String, default: '' },
    },
    /** The community's logo (a media id): header, footer, maintenance screen and browser tab. */
    brand: {
      logo: { type: String, default: null },
    },
    /** The Store: where Buy buttons go unless a product has its own link, and a line under the title. */
    store: {
      /** "Coming soon": the Store page shows no products until this is switched off. */
      comingSoon: { type: Boolean, default: false },
      buyUrl: { type: String, default: '' },
      note: { type: String, default: '' },
    },
    /** The Gallery page: photos from the city, in order, each with an optional caption and credit. */
    gallery: {
      type: [{ _id: false, media: String, caption: { type: String, default: '' }, credit: { type: String, default: '' } }],
      default: [],
    },
    /** The songs visitors can pick from the header's music menu (empty = the site's own theme only). */
    music: {
      tracks: { type: [{ _id: false, title: String, media: String }], default: [] },
    },
    /** The FiveM server, for the "players in the city" indicator: a cfx.re join code or IP:port. Empty = no indicator. */
    gameServer: {
      address: { type: String, default: '', maxlength: 120 },
    },
    /** Rules for every panel account, set by a Super Admin. Never sent to the website. */
    security: {
      /** Everyone must finish setting up two-step sign-in before they can use the panel. */
      requireTwoFactor: { type: Boolean, default: false },
    },
  },
  { timestamps: true, minimize: false },
)

export const Settings = mongoose.model('Settings', settingsSchema)

/** The site logo's media id, or null (the website then shows its placeholder mark). */
export const readBrandLogo = (settings) => settings?.brand?.logo ?? null

/** The Store's settings, with the defaults filled in. */
export const readStore = (settings) => ({
  comingSoon: settings?.store?.comingSoon === true, // open unless a Super Admin/Admin switched it on
  buyUrl: settings?.store?.buyUrl ?? '',
  note: settings?.store?.note ?? '',
})

/** The music player's songs as saved. */
export const readMusic = (settings) => ({
  tracks: (settings?.music?.tracks ?? []).filter((t) => t?.media).map((t) => ({ title: t.title ?? '', media: t.media })),
})
