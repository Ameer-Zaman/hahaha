import bcrypt from 'bcryptjs'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import { authenticate, clearSession, issueSession } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { User } from '../models/User.js'
import { audit } from '../services/audit.js'
import { changePasswordSchema, loginSchema } from '../validation/schemas.js'

const router = Router()

// Slow down password guessing: 10 attempts per 15 minutes per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Try again in a few minutes.' },
})

// …and 10 attempts per 15 minutes per account, whatever the IP.
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req) => `acct:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  validate: { keyGeneratorIpFallback: false },
  message: { message: 'Too many sign-in attempts. Try again in a few minutes.' },
})

// A real hash to compare against when the email doesn't exist, so timing doesn't reveal accounts.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12)

router.post('/login', loginLimiter, accountLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email }).select('+passwordHash')
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !ok || !user.active) {
    await audit({ ip: req.ip }, 'auth.login_failed', email)
    return res.status(401).json({ message: 'Wrong email or password.' })
  }
  user.lastLoginAt = new Date()
  await user.save()
  issueSession(res, user)
  req.user = user
  await audit(req, 'auth.login', user.email)
  res.json({ user: user.toSafeJSON() })
})

router.post('/logout', (req, res) => {
  clearSession(res)
  res.json({ ok: true })
})

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user.toSafeJSON() })
})

router.post('/password', authenticate, validateBody(changePasswordSchema), async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash')
  const ok = await bcrypt.compare(req.body.currentPassword, user.passwordHash)
  if (!ok) return res.status(400).json({ message: 'Your current password is not correct.' })
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12)
  user.tokenVersion += 1 // signs out every other session
  await user.save()
  issueSession(res, user)
  await audit(req, 'auth.password_change', user.email)
  res.json({ ok: true })
})

export default router
