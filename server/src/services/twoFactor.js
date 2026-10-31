import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { env } from '../config/env.js'
import { Settings } from '../models/Settings.js'
import { User } from '../models/User.js'
import { newRecoveryCodes, verifyTotp } from './totp.js'

/**
 * The pieces of two-step sign-in that both the sign-in route and the account screen need.
 *
 * The password proves who you are; the code proves you have the phone. Between the two a
 * short "half signed in" ticket is issued — it cannot open anything, it only says which
 * account passed the password a moment ago.
 */
const TICKET_PURPOSE = '2fa'
const TICKET_SECONDS = 5 * 60

export function issueTicket(user) {
  return jwt.sign({ sub: user._id.toString(), tv: user.tokenVersion, purpose: TICKET_PURPOSE }, env.jwtSecret, {
    expiresIn: TICKET_SECONDS,
  })
}

/** The account a ticket belongs to, or null if it is expired, forged or for something else. */
export async function readTicket(ticket) {
  let payload
  try {
    payload = jwt.verify(String(ticket ?? ''), env.jwtSecret)
  } catch {
    return null
  }
  if (payload.purpose !== TICKET_PURPOSE) return null
  const user = await User.findById(payload.sub).select('+totp.secret +totp.lastStep +recoveryCodes')
  if (!user || !user.active || user.tokenVersion !== payload.tv) return null
  return user
}

/**
 * Checks a six-digit code, or a recovery code, against an account. The account must have
 * been loaded with its secret (`.select('+totp.secret +totp.lastStep +recoveryCodes')`).
 *
 * Saves the account when a code is used, so neither a code nor a recovery code works twice.
 * Returns 'code', 'recovery', or null.
 */
export async function useSecondFactor(user, code) {
  const entered = String(code ?? '').trim()
  if (!entered) return null

  const step = user.totp?.secret ? verifyTotp(user.totp.secret, entered) : null
  if (step) {
    // a code already used is not a second factor any more
    if (step <= (user.totp.lastStep ?? 0)) return null
    user.totp.lastStep = step
    await user.save()
    return 'code'
  }

  // recovery codes are typed with or without the dash, in any case
  const tidy = entered.toUpperCase().replace(/[^0-9A-F]/g, '')
  if (tidy.length !== 10) return null
  for (const entry of user.recoveryCodes ?? []) {
    if (entry.usedAt) continue
    if (await bcrypt.compare(tidy, entry.hash)) {
      entry.usedAt = new Date()
      await user.save()
      return 'recovery'
    }
  }
  return null
}

/** Ten fresh recovery codes: the plain ones to show once, the hashes to keep. */
export async function makeRecoveryCodes() {
  const codes = newRecoveryCodes()
  const stored = await Promise.all(
    codes.map(async (c) => ({ hash: await bcrypt.hash(c.replace('-', ''), 10), usedAt: null })),
  )
  return { codes, stored }
}

/** How many recovery codes an account has left. */
export const recoveryCodesLeft = (user) => (user.recoveryCodes ?? []).filter((c) => !c.usedAt).length

/** Has a Super Admin said every account must use two-step sign-in? */
export async function twoFactorRequired() {
  const s = await Settings.findOne({ key: 'main' }, 'security').lean()
  return Boolean(s?.security?.requireTwoFactor)
}
