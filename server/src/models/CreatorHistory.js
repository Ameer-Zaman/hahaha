import mongoose from 'mongoose'

/*
 * A creator's history, for the graphs in their pop-up on the Creators page. Recorded by the
 * live and stats checks (services/creatorLive.js) from the moment this was added: the platforms
 * don't give old numbers, so the graphs fill in as days and streams go by.
 */

/** One day's channel numbers (the last reading of that day). */
const daySchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },
    day: { type: String, required: true }, // YYYY-MM-DD (UTC)
    ytSubs: { type: Number, default: null },
    ytViews: { type: Number, default: null },
    ytVideos: { type: Number, default: null },
    kickFollowers: { type: Number, default: null },
  },
  { versionKey: false },
)
daySchema.index({ creator: 1, day: 1 }, { unique: true })

/** One stream: when, where, how long, and its viewer count over time. */
const streamSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },
    platform: { type: String, required: true },
    title: { type: String, default: '' },
    startedAt: { type: Date, required: true },
    lastSeen: { type: Date, required: true },
    endedAt: { type: Date, default: null }, // null while live
    peak: { type: Number, default: 0 },
    sum: { type: Number, default: 0 }, // viewer readings added up, for the average
    samples: { type: Number, default: 0 },
    /** Viewers over time (one reading per check, thinned out on long streams). */
    points: { type: [{ _id: false, t: Date, v: Number }], default: [] },
  },
  { versionKey: false },
)
streamSchema.index({ creator: 1, startedAt: -1 })
streamSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 400 * 24 * 3600 }) // a year and a bit

export const CreatorDay = mongoose.model('CreatorDay', daySchema)
export const CreatorStream = mongoose.model('CreatorStream', streamSchema)

/** How many viewer readings a stream keeps before every other one is dropped. */
export const MAX_POINTS = 240
