import bcrypt from 'bcryptjs'

import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { AuditLog } from '../models/AuditLog.js'

/**
 * Creates the first Super Admin from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD — but only when the
 * database has no accounts at all. After that these variables are ignored (and can be removed),
 * so there is no way to create a Super Admin from outside once the site is set up.
 */
export async function bootstrapSuperAdmin() {
  const count = await User.estimatedDocumentCount()
  if (count > 0) return null
  const { email, password, name } = env.bootstrap
  if (!email || !password) {
    console.warn('No accounts yet. Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD to create the first Super Admin.')
    return null
  }
  if (password.length < 10) throw new Error('SUPERADMIN_PASSWORD must be at least 10 characters long')
  const user = await User.create({
    email,
    name,
    role: 'superadmin',
    passwordHash: await bcrypt.hash(password, 12),
  })
  await AuditLog.create({ action: 'user.bootstrap', target: user.email, summary: 'First Super Admin created from environment' })
  console.log(`Created the first Super Admin: ${user.email}`)
  return user
}
