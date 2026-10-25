import mongoose from 'mongoose'

/** Append-only record of every change made through the admin panel. */
const auditSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorEmail: { type: String, default: '' },
  action: { type: String, required: true }, // e.g. 'gang.update'
  target: { type: String, default: '' }, // e.g. gang slug or id
  summary: { type: String, default: '' },
  ip: { type: String, default: '' },
})

export const AuditLog = mongoose.model('AuditLog', auditSchema)
