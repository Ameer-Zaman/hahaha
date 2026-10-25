import { AuditLog } from '../models/AuditLog.js'

/** Writes one audit entry. Never throws — a logging problem must not undo the change itself. */
export async function audit(req, action, target = '', summary = '') {
  try {
    await AuditLog.create({
      actor: req.user?._id ?? null,
      actorEmail: req.user?.email ?? '',
      action,
      target: String(target ?? ''),
      summary: String(summary ?? '').slice(0, 500),
      ip: req.ip ?? '',
    })
  } catch (err) {
    console.error('audit log failed', err)
  }
}
