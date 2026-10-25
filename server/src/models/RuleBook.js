import mongoose from 'mongoose'

const ruleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const categorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, trim: true, default: '' },
    rules: { type: [ruleSchema], default: [] },
  },
  { _id: false },
)

/** The single rule book. Edits are saved as a draft; publishing makes them public. */
const ruleBookSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    draft: { type: [categorySchema], default: [] },
    published: { type: [categorySchema], default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

export const RuleBook = mongoose.model('RuleBook', ruleBookSchema)
