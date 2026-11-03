import mongoose from 'mongoose'

/**
 * Something the server hosts: a race, a heist night, a tournament, a car meet.
 *
 * `status` decides who sees it: a draft is for the team only; published shows on the
 * Events page; cancelled stays on the page, marked as cancelled, so people who planned for
 * it find out rather than wondering where it went.
 */
const scheduleItem = new mongoose.Schema(
  {
    /** "20:00", "Doors", "Round 2" — whatever reads best in a timetable. */
    time: { type: String, trim: true, default: '', maxlength: 20 },
    item: { type: String, trim: true, required: true, maxlength: 160 },
  },
  { _id: false },
)

const prize = new mongoose.Schema(
  {
    place: { type: String, trim: true, default: '', maxlength: 30 },
    prize: { type: String, trim: true, required: true, maxlength: 160 },
  },
  { _id: false },
)

const eventSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, trim: true, default: 'Event', maxlength: 40 },
    status: { type: String, enum: ['draft', 'published', 'cancelled'], default: 'draft' },
    /** Shown with the cancelled badge, e.g. "Moved to next Saturday". */
    statusNote: { type: String, trim: true, default: '', maxlength: 200 },
    startsAt: { type: Date, required: true },
    /** Optional; without it the event counts as running for DEFAULT_HOURS after it starts. */
    endsAt: { type: Date, default: null },
    location: { type: String, trim: true, default: '', maxlength: 80 },
    host: { type: String, trim: true, default: '', maxlength: 80 },
    summary: { type: String, trim: true, default: '', maxlength: 240 },
    description: { type: String, trim: true, default: '', maxlength: 4000 },
    schedule: { type: [scheduleItem], default: [] },
    requirements: { type: [String], default: [] },
    prizes: { type: [prize], default: [] },
    /** 0 = no limit. */
    capacity: { type: Number, default: 0, min: 0 },
    signupUrl: { type: String, default: '', maxlength: 500 },
    signupLabel: { type: String, default: '', maxlength: 40 },
    /** Media id of the event picture. */
    image: { type: String, default: null },
    /** The one to lead the Events page with, while it is still to come. */
    featured: { type: Boolean, default: false },
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true },
)

eventSchema.index({ startsAt: 1 })

/** An event with no finish time is treated as lasting this long. */
export const DEFAULT_HOURS = 3

export function endOf(e) {
  return e.endsAt ? new Date(e.endsAt) : new Date(new Date(e.startsAt).getTime() + DEFAULT_HOURS * 3600_000)
}

/** Where an event stands now — the same rule for the website and the panel. */
export function eventState(e, now = new Date()) {
  if (e.status === 'draft') return 'draft'
  if (e.status === 'cancelled') return 'cancelled'
  if (new Date(e.startsAt) > now) return 'upcoming'
  if (endOf(e) > now) return 'live'
  return 'ended'
}

export const Event = mongoose.model('Event', eventSchema)
