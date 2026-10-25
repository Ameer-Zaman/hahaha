import mongoose from 'mongoose'

const warSchema = new mongoose.Schema(
  {
    /** Calendar date, YYYY-MM-DD. */
    date: { type: String, required: true },
    sides: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Gang' }],
      validate: [(v) => v.length === 2 && String(v[0]) !== String(v[1]), 'A war needs two different gangs'],
    },
    /** null = draw / ceasefire */
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Gang', default: null },
    result: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

export const War = mongoose.model('War', warSchema)
