import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: 'Member' },
    since: { type: String, trim: true, default: '' },
  },
  { _id: false },
)

const gangSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, trim: true, default: 'Gang' },
    established: { type: String, trim: true, default: '' },
    territory: { type: String, trim: true, default: '' },
    leader: { type: String, trim: true, default: '' },
    headline: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    /** GridFS media ids (strings) for the backdrop and emblem. */
    image: { type: String, default: null },
    emblem: { type: String, default: null },
    /** Optional short looping clip (5–10 s) shown instead of the still on the card. */
    video: { type: String, default: null },
    verified: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true },
)

export const Gang = mongoose.model('Gang', gangSchema)
