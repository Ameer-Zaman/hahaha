import { env } from '../config/env.js'
import { AuditLog } from '../models/AuditLog.js'
import { postSecurityAlert } from './discordBridge.js'

/**
 * Admin-panel sign-in alerts. When someone signs into the panel — or fails to — this posts a
 * message to the Discord security channel with the IP address, a rough location and the
 * browser/device, so the owner knows straight away if it wasn't them.
 *
 * It is deliberately only for the panel (the people signing in are the owner and staff, into
 * their own tool). The MAC address is not here because a server never receives one — it never
 * leaves the visitor's own network. Everything here is best-effort: it never throws and never
 * holds up a sign-in.
 */

/** A short, readable "Browser on OS" from the user-agent (no dependency, best-effort). */
export function describeDevice(ua = '') {
  if (!ua) return 'Unknown device'
  const os =
    /Windows NT 10/.test(ua) ? 'Windows' :
    /Windows/.test(ua) ? 'Windows' :
    /iPhone|iPad|iPod/.test(ua) ? 'iOS' :
    /Android/.test(ua) ? 'Android' :
    /Mac OS X/.test(ua) ? 'macOS' :
    /Linux/.test(ua) ? 'Linux' :
    'an unknown OS'
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /OPR\/|Opera/.test(ua) ? 'Opera' :
    /SamsungBrowser/.test(ua) ? 'Samsung Internet' :
    /Chrome\//.test(ua) && !/Chromium/.test(ua) ? 'Chrome' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Version\/.*Safari/.test(ua) ? 'Safari' :
    'an unknown browser'
  const mobile = /Mobi|Android|iPhone|iPad/.test(ua) ? ' · mobile' : ''
  return `${browser} on ${os}${mobile}`
}

const isLookupable = (ip) =>
  ip && !/^(127\.|10\.|192\.168\.|169\.254\.|::1|fc|fd|::ffff:127\.)/i.test(ip) && !/^172\.(1[6-9]|2\d|3[01])\./.test(ip)

/** A rough "City, Region, Country" from a free geo service. null on anything unexpected. */
async function lookupLocation(ip) {
  if (!env.security.geoLookup || !isLookupable(ip)) return null
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,region,country`, {
      signal: AbortSignal.timeout(2500),
      headers: { Accept: 'application/json' },
    })
    const data = await res.json()
    if (!data?.success) return null
    return [data.city, data.region, data.country].filter(Boolean).join(', ') || null
  } catch {
    return null
  }
}

const COLOR = { success: 0x4ccf8a, failed: 0xe2596b, locked: 0xe2a33b }

/**
 * Posts one sign-in alert. `outcome` is 'success' | 'failed' | 'twofactor_failed'. Never
 * throws; call it without awaiting from the request path.
 */
export async function reportLogin({ ip = '', ua = '', email = '', role = '', outcome = 'success' }) {
  try {
    if (!env.security.loginAlerts) return
    const address = ip || 'unknown'

    // for a failure, say how many there have been from this IP recently — a run of them matters
    let recentFails = 0
    if (outcome !== 'success' && address !== 'unknown') {
      recentFails = await AuditLog.countDocuments({
        action: { $in: ['auth.login_failed', 'auth.2fa_failed'] },
        ip: address,
        at: { $gte: new Date(Date.now() - 15 * 60_000) },
      }).catch(() => 0)
    }

    const location = await lookupLocation(address)
    const field = (name, value) => ({ name, value: String(value || '—').slice(0, 1024), inline: true })

    const title =
      outcome === 'success' ? '✅ Admin panel sign-in' : outcome === 'twofactor_failed' ? '⚠️ Failed two-step code' : '⚠️ Failed sign-in attempt'
    const fields = [
      field('Account', email),
      ...(role ? [field('Role', role === 'superadmin' ? 'Super Admin' : 'Admin')] : []),
      field('IP address', address),
      field('Location', location ?? (isLookupable(address) ? 'Unknown' : 'Local network')),
      field('Device', describeDevice(ua)),
    ]
    if (recentFails > 1) fields.push(field('Recent failures', `${recentFails} from this IP in 15 min`))

    const embed = {
      title,
      color: recentFails >= 5 ? COLOR.locked : COLOR[outcome === 'success' ? 'success' : 'failed'],
      fields,
      footer: { text: 'Panel security · reply here to no one — this is a notice' },
      timestamp: new Date().toISOString(),
    }
    // ping staff on a run of failures (possible break-in attempt), not on normal sign-ins
    await postSecurityAlert(embed, { pingStaff: outcome !== 'success' && recentFails >= 3 })
  } catch (err) {
    console.error('login alert failed:', err.message)
  }
}
