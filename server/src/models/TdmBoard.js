import mongoose from 'mongoose'

/**
 * The TDM leaderboard: one list of players and their stats, entered or imported in the
 * panel. The website ranks it (kills, then K/D, then wins).
 */
const tdmPlayerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    kills: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    matches: { type: Number, default: 0 },
  },
  { _id: false },
)

const tdmBoardSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    /** Optional label shown above the board, e.g. "Season 1". */
    season: { type: String, default: '', trim: true },
    players: { type: [tdmPlayerSchema], default: [] },
  },
  { timestamps: true },
)

export const TdmBoard = mongoose.model('TdmBoard', tdmBoardSchema)
