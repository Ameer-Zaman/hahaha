import mongoose from 'mongoose'

/** What kind of change a line in an update is; the page tags each line with it. */
export const CHANGE_KINDS = ['new', 'changed', 'fixed', 'removed']
export const CHANGES_MAX = 80

/**
 * A city update: what changed in the city, for the Updates page (patch notes).
 *
 * `status` decides who sees it: a draft is for the team only. A published update shows from
 * its `date` on, so one can be written ahead and appear on the day.
 */
const change = new mongoose.Schema(
  {
    kind: { type: String, enum: CHANGE_KINDS, default: 'new' },
    text: { type: String, trim: true, required: true, maxlength: 200 },
  },
  { _id: false },
)

const cityUpdateSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    /** Optional, e.g. "v2.4" or "Season 3". */
    version: { type: String, trim: true, default: '', maxlength: 20 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    /** The day the update went (or goes) live in the city. */
    date: { type: Date, required: true },
    summary: { type: String, trim: true, default: '', maxlength: 240 },
    /** Media id of a picture for the update. */
    image: { type: String, default: null },
    changes: { type: [change], default: [] },
    /** Anything longer: a note from the team. Plain text; blank lines start new paragraphs. */
    notes: { type: String, trim: true, default: '', maxlength: 4000 },
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true },
)

cityUpdateSchema.index({ date: -1 })

export const CityUpdate = mongoose.model('CityUpdate', cityUpdateSchema)
