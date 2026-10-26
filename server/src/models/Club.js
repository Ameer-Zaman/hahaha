import mongoose from 'mongoose'

/** A club of the city (nightclub, bar, social club …), shown as a card on the Clubs page. */
const clubSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, trim: true, default: 'Club' },
    owner: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    /** Media id of the logo shown on the card face (optional). */
    emblem: { type: String, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export const Club = mongoose.model('Club', clubSchema)
