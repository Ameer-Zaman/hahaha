import bcrypt from 'bcryptjs'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import { env } from '../config/env.js'

import { authenticate, clearSession, issueSession } from '../middleware/auth.js'
import { HttpError } from '../middleware/errors.js'
import { validateBody } from '../middleware/validate.js'
import { User } from '../models/User.js'
import { audit } from '../services/audit.js'
import { newSecret, otpauthUrl, verifyTotp } from '../services/totp.js'
import { issueTicket, makeRecoveryCodes, readTicket, recoveryCodesLeft, twoFactorRequired, useSecondFactor } from '../services/twoFactor.js'
import { changePasswordSchema, loginSchema, twoFactorCodeSchema, twoFactorLoginSchema, twoFactorOffSchema } from '../validation/schemas.js'

const router = Router()

// Slow down password guessing: 10 attempts per 15 minutes per IP.
const LOGIN_TRIES = Number(process.env.LOGIN_ATTEMPTS_PER_15_MIN ?? 10)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: LOGIN_TRIES,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Try again in a few minutes.' },
})

// …and 10 attempts per 15 minutes per account, whatever the IP.
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: LOGIN_TRIES,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req) => `acct:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  validate: { keyGeneratorIpFallback: false },
  message: { message: 'Too many sign-in attempts. Try again in a few minutes.' },
})

// A real hash to compare against when the email doesn't exist, so timing doesn't reveal accounts.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12)

/** Finishes a sign-in: records it, sets the cookie, and says if setup is still owed. */
async function signIn(req, res, user, how = 'auth.login') {
  user.lastLoginAt = new Date()
  await user.save()
  issueSession(res, user)
  req.user = user
  await audit(req, how, user.email)
  res.json({
    user: user.toSafeJSON(),
    // a Super Admin can require two-step sign-in; the panel then asks for it before anything else
    mustSetUpTwoFactor: !user.totp?.enabled && (await twoFactorRequired()),
  })
}

router.post('/login', loginLimiter, accountLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email }).select('+passwordHash')
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !ok || !user.active) {
    await audit({ ip: req.ip }, 'auth.login_failed', email)
    return res.status(401).json({ message: 'Wrong email or password.' })
  }
  // The password alone is not a way in for an account with two-step sign-in: the ticket
  // only says the password was right a moment ago, and opens nothing on its own.
  if (user.totp?.enabled) {
    return res.json({ twoFactor: true, ticket: issueTicket(user) })
  }
  await signIn(req, res, user)
})

/** The second step: the six digits from the app, or a recovery code. */
router.post('/login/2fa', loginLimiter, validateBody(twoFactorLoginSchema), async (req, res) => {
  const user = await readTicket(req.body.ticket)
  if (!user) throw new HttpError(401, 'That took too long. Please sign in again.')
  const used = await useSecondFactor(user, req.body.code)
  if (!used) {
    await audit({ ip: req.ip }, 'auth.2fa_failed', user.email)
    throw new HttpError(401, 'That code is not right. Check the app and try again.')
  }
  if (used === 'recovery') {
    await audit({ ip: req.ip, user }, 'auth.2fa_recovery', user.email, `${recoveryCodesLeft(user)} recovery codes left`)
  }
  await signIn(req, res, user, used === 'recovery' ? 'auth.login_recovery' : 'auth.login')
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

/* ------------------------------------------------- two-step sign-in, on your own account */

/** Where two-step sign-in stands for the signed-in account. */
router.get('/2fa', authenticate, async (req, res) => {
  const user = await User.findById(req.user._id).select('+recoveryCodes')
  res.json({
    enabled: Boolean(user.totp?.enabled),
    confirmedAt: user.totp?.confirmedAt ?? null,
    recoveryCodesLeft: recoveryCodesLeft(user),
    required: await twoFactorRequired(),
  })
})

/**
 * Step one: a new secret and the address an authenticator app reads from a QR code.
 * Nothing changes until the next step proves the app is set up, so starting this and
 * walking away leaves the account exactly as it was.
 */
router.post('/2fa/setup', authenticate, async (req, res) => {
  const user = await User.findById(req.user._id).select('+totp.secret')
  if (user.totp?.enabled) throw new HttpError(409, 'Two-step sign-in is already on for this account.')
  const secret = newSecret()
  user.totp.secret = secret
  user.totp.enabled = false
  await user.save()
  res.json({ secret, otpauth: otpauthUrl({ secret, account: user.email, issuer: env.siteName }) })
})

/** Step two: the first code from the app turns it on, and the recovery codes are shown once. */
router.post('/2fa/enable', authenticate, validateBody(twoFactorCodeSchema), async (req, res) => {
  const user = await User.findById(req.user._id).select('+totp.secret +totp.lastStep +recoveryCodes')
  if (user.totp?.enabled) throw new HttpError(409, 'Two-step sign-in is already on for this account.')
  if (!user.totp?.secret) throw new HttpError(409, 'Start again: no setup is in progress.')
  const step = verifyTotp(user.totp.secret, req.body.code)
  if (!step) throw new HttpError(400, 'That code is not right. Check the app and try again.')
  const { codes, stored } = await makeRecoveryCodes()
  user.totp.enabled = true
  user.totp.confirmedAt = new Date()
  user.totp.lastStep = step
  user.recoveryCodes = stored
  await user.save()
  await audit(req, 'auth.2fa_on', user.email)
  res.json({ ok: true, recoveryCodes: codes })
})

/** Turning it off needs the password and a current code, so a borrowed screen cannot. */
router.post('/2fa/disable', authenticate, validateBody(twoFactorOffSchema), async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash +totp.secret +totp.lastStep +recoveryCodes')
  if (!user.totp?.enabled) throw new HttpError(409, 'Two-step sign-in is not on for this account.')
  if (await twoFactorRequired()) throw new HttpError(403, 'Two-step sign-in is required for every account here.')
  if (!(await bcrypt.compare(req.body.password, user.passwordHash))) {
    throw new HttpError(400, 'Your password is not correct.')
  }
  if (!(await useSecondFactor(user, req.body.code))) throw new HttpError(400, 'That code is not right.')
  user.totp = { secret: '', enabled: false, confirmedAt: null, lastStep: 0 }
  user.recoveryCodes = []
  await user.save()
  await audit(req, 'auth.2fa_off', user.email)
  res.json({ ok: true })
})

/** A fresh set of recovery codes; the old ones stop working. */
router.post('/2fa/recovery-codes', authenticate, validateBody(twoFactorCodeSchema), async (req, res) => {
  const user = await User.findById(req.user._id).select('+totp.secret +totp.lastStep +recoveryCodes')
  if (!user.totp?.enabled) throw new HttpError(409, 'Two-step sign-in is not on for this account.')
  if (!(await useSecondFactor(user, req.body.code))) throw new HttpError(400, 'That code is not right.')
  const { codes, stored } = await makeRecoveryCodes()
  user.recoveryCodes = stored
  await user.save()
  await audit(req, 'auth.2fa_recovery_new', user.email)
  res.json({ ok: true, recoveryCodes: codes })
})

export default router
