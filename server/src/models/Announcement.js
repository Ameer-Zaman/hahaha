import mongoose from 'mongoose'

/**
 * A note from the team that shows on the website: a launch date, an event, a warning that
 * the server is down for an hour.
 *
 * `status` is the only thing that decides whether visitors see it. A draft is for the
 * team; published means live, within whatever dates are set. Pinning puts it in the strip
 * across the top of every page — reserved for things people need to see now.
 */
const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, default: '', maxlength: 4000 },
    /** Changes the colour and the icon: ordinary news, something good, or a warning. */
    tone: { type: String, enum: ['news', 'good', 'warning'], default: 'news' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    /** Shown in the strip at the top of every page, not only on the news list. */
    pinned: { type: Boolean, default: false },
    /** Published, but not before this moment (empty = as soon as it is published). */
    startsAt: { type: Date, default: null },
    /** Stops showing itself after this moment (empty = until it is unpublished). */
    endsAt: { type: Date, default: null },
    /** A link the headline points at, e.g. the Discord event. */
    linkUrl: { type: String, default: '', maxlength: 500 },
    linkLabel: { type: String, default: '', maxlength: 60 },
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true },
)

/** Newest first, with pinned ones above the rest. */
announcementSchema.index({ pinned: -1, startsAt: -1, createdAt: -1 })

/** Is this one live right now? The same rule the public route and the panel both use. */
export function isLive(a, now = new Date()) {
  if (a.status !== 'published') return false
  if (a.startsAt && new Date(a.startsAt) > now) return false
  if (a.endsAt && new Date(a.endsAt) <= now) return false
  return true
}

/** Why it isn't showing, in words, for the panel's list. */
export function liveState(a, now = new Date()) {
  if (a.status !== 'published') return 'draft'
  if (a.startsAt && new Date(a.startsAt) > now) return 'scheduled'
  if (a.endsAt && new Date(a.endsAt) <= now) return 'finished'
  return 'live'
}

export const Announcement = mongoose.model('Announcement', announcementSchema)
