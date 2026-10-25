import bcrypt from 'bcryptjs'
import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { User } from '../../models/User.js'
import { audit } from '../../services/audit.js'
import { createUserSchema, updateUserSchema } from '../../validation/schemas.js'

/** Account management. Mounted behind requireRole('superadmin'). */
const router = Router()

router.get('/', async (req, res) => {
  const users = await User.find().sort({ createdAt: 1 })
  res.json({ users: users.map((u) => u.toSafeJSON()) })
})

router.post('/', validateBody(createUserSchema), async (req, res) => {
  const { password, ...rest } = req.body
  const user = await User.create({ ...rest, passwordHash: await bcrypt.hash(password, 12) })
  await audit(req, 'user.create', user.email, `${user.name} · ${user.role}`)
  res.status(201).json({ user: user.toSafeJSON() })
})

router.patch('/:id', validateBody(updateUserSchema), async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) throw new HttpError(404, 'Account not found.')
  const isSelf = user.id === req.user.id
  const { password, ...changes } = req.body

  if (isSelf && changes.active === false) throw new HttpError(400, "You can't disable your own account.")
  if (isSelf && changes.role && changes.role !== user.role) throw new HttpError(400, "You can't change your own role.")

  const losingSuper =
    user.role === 'superadmin' && user.active && (changes.role === 'admin' || changes.active === false)
  if (losingSuper) {
    const supers = await User.countDocuments({ role: 'superadmin', active: true })
    if (supers <= 1) throw new HttpError(400, 'Keep at least one active Super Admin.')
  }

  const notes = []
  user.set(changes)
  if (changes.role) notes.push(`role ${changes.role}`)
  if (changes.active !== undefined) notes.push(changes.active ? 'enabled' : 'disabled')
  if (password) {
    user.passwordHash = await bcrypt.hash(password, 12)
    notes.push('password reset')
  }
  // Any change to access signs the account out everywhere.
  if (password || changes.role || changes.active === false) user.tokenVersion += 1
  await user.save()
  await audit(req, 'user.update', user.email, notes.join(', ') || 'details updated')
  res.json({ user: user.toSafeJSON() })
})

router.delete('/:id', async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) throw new HttpError(404, 'Account not found.')
  if (user.id === req.user.id) throw new HttpError(400, "You can't delete your own account.")
  if (user.role === 'superadmin' && user.active) {
    const supers = await User.countDocuments({ role: 'superadmin', active: true })
    if (supers <= 1) throw new HttpError(400, 'Keep at least one active Super Admin.')
  }
  await user.deleteOne()
  await audit(req, 'user.delete', user.email, user.name)
  res.json({ ok: true })
})

export default router
