import mongoose from 'mongoose'

/**
 * A content creator on the Creators page. Their channel links come from the panel; whether
 * they are live is checked with Twitch, Kick and YouTube's own APIs (services/creatorLive.js)
 * when those keys are set, or switched on by staff by hand ("live now", with a time limit).
 */
const creatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    /** One short line under the name, e.g. "Plays Marcus, Ballas OG". */
    tagline: { type: String, default: '', trim: true },
    photo: { type: String, default: null }, // media id
    /** Channel links: { twitch, kick, youtube, tiktok, instagram, x, facebook, discord } */
    links: { type: Object, default: () => ({}) },
    order: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
    /** What the last automatic check found. */
    live: {
      on: { type: Boolean, default: false },
      platform: { type: String, default: '' },
      title: { type: String, default: '' },
      viewers: { type: Number, default: 0 },
      url: { type: String, default: '' },
      startedAt: { type: Date, default: null },
      checkedAt: { type: Date, default: null },
    },
    /** Set by staff by hand, for platforms that can't be checked (TikTok, Instagram …). */
    manual: {
      until: { type: Date, default: null },
      platform: { type: String, default: '' },
      url: { type: String, default: '' },
      title: { type: String, default: '' },
    },
    /** YouTube channel id and uploads list, looked up once from the channel link. */
    youtube: {
      source: { type: String, default: '' }, // the link these were found from
      channelId: { type: String, default: '' },
      uploads: { type: String, default: '' },
    },
  },
  { timestamps: true, minimize: false },
)

export const Creator = mongoose.model('Creator', creatorSchema)

/** Is the manual "live now" still on? */
export const manualOn = (c, now = new Date()) => Boolean(c.manual?.until && new Date(c.manual.until) > now)
