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
    /** Its number in the rule book, e.g. HON-01 or PD-1.01 ('' = numbered by position). */
    number: { type: String, trim: true, default: '' },
    /** The rule in one or two sentences. */
    summary: { type: String, trim: true, default: '' },
    /** Critical, high, medium or low ('' = not set; older books only have `level`). */
    severity: { type: String, enum: ['', 'critical', 'high', 'medium', 'low'], default: '' },
    tags: { type: [String], default: [] },
    /** Where it sits inside its book, e.g. division "Police", section "Traffic Stops". */
    division: { type: String, trim: true, default: '' },
    section: { type: String, trim: true, default: '' },
    /** In force from / last changed (YYYY-MM-DD), and which version of the rule this is. */
    effective: { type: String, default: '' },
    updated: { type: String, default: '' },
    version: { type: Number, default: 1 },
  },
  { _id: false },
)

const divisionSchema = new mongoose.Schema(
  { name: { type: String, trim: true }, sections: { type: [String], default: [] } },
  { _id: false },
)

const categorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, trim: true, default: '' },
    /** The book's icon on the Rules page (users, scroll, book, shield-alert, shield-check, gavel, video, heart-handshake). */
    icon: { type: String, default: '' },
    /** A locked book shows only its title and description: "its rules will be published when the staff unlock it". */
    locked: { type: Boolean, default: false },
    /** Divisions of this book that are still locked (e.g. "Gang"). */
    lockedDivisions: { type: [String], default: [] },
    /** The divisions and their sections, in order (e.g. Police → Dealing with Officers, Traffic Stops …). */
    divisions: { type: [divisionSchema], default: [] },
    /** When the book last changed (YYYY-MM-DD). */
    updated: { type: String, default: '' },
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
