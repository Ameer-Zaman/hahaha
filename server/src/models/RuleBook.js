import mongoose from 'mongoose'

const ruleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    /** How much it matters: 'standard', 'serious' or 'zero' (zero tolerance). */
    level: { type: String, enum: ['standard', 'serious', 'zero'], default: 'standard' },
    /** What breaking it leads to, in the team's words (optional). */
    penalty: { type: String, trim: true, default: '' },
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

const stepSchema = new mongoose.Schema(
  { title: { type: String, trim: true }, text: { type: String, trim: true, default: '' } },
  { _id: false },
)
const termSchema = new mongoose.Schema({ term: { type: String, trim: true }, meaning: { type: String, trim: true } }, { _id: false })

/** Everything on the Rules page around the rules themselves. All optional; empty parts are hidden. */
const extrasSchema = new mongoose.Schema(
  {
    notice: { type: String, trim: true, default: '' }, // the important note at the top
    penalties: { type: [stepSchema], default: [] }, // how breaking the rules is handled, step by step
    appeals: { type: String, trim: true, default: '' }, // how to appeal a decision
    glossary: { type: [termSchema], default: [] }, // RP terms used in the rules
  },
  { _id: false },
)

/** The single rule book. Edits are saved as a draft; publishing makes them public. */
const ruleBookSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    draft: { type: [categorySchema], default: [] },
    published: { type: [categorySchema], default: null },
    draftExtras: { type: extrasSchema, default: () => ({}) },
    publishedExtras: { type: extrasSchema, default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

export const RuleBook = mongoose.model('RuleBook', ruleBookSchema)
