import mongoose from 'mongoose'

/** How a fight ended, for the player it is listed under. */
export const FIGHT_RESULTS = ['win', 'loss', 'draw']

/** The most players in one Dhadha's crew. */
export const CREW_MAX = 10

const fightSchema = new mongoose.Schema(
  {
    date: { type: String, default: '' }, // YYYY-MM-DD
    opponent: { type: String, required: true, trim: true },
    result: { type: String, enum: FIGHT_RESULTS, required: true },
    note: { type: String, trim: true, default: '' },
  },
  { _id: false },
)

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    photo: { type: String, default: null },
    /** Rank position in the crew, 1 first; null = not ranked yet. */
    rank: { type: Number, default: null },
    coins: { type: Number, default: 0, min: 0 },
    fights: { type: [fightSchema], default: [] },
  },
  { _id: false },
)

/**
 * A Dhadha: one leader and his crew of up to 10 players, shown as a card on the Dhadhas page.
 * Opening the card shows each player's rank position, coins and fight history.
 */
const dhadhaSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    title: { type: String, trim: true, default: '' },
    line: { type: String, trim: true, default: '' },
    /** Media id of his photo (optional). */
    photo: { type: String, default: null },
    order: { type: Number, default: 0 },
    members: {
      type: [playerSchema],
      default: [],
      validate: [(v) => v.length <= CREW_MAX, `a crew is ${CREW_MAX} players at most`],
    },
  },
  { timestamps: true },
)

export const Dhadha = mongoose.model('Dhadha', dhadhaSchema)
