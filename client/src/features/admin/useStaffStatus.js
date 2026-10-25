import { staff as staticStaff } from '../../content/staff'
import { usePublic } from '../../lib/publicData'

const REFRESH_MS = 30_000

/**
 * Staff cards and their status, as set by the team in the admin panel.
 *
 * Returns { staff, state, byId, updatedAt } where state is:
 *   'not-connected' — the site runs without the API; no status is shown
 *   'loading'       — first request in flight
 *   'ok'            — status is fresh from the API
 *   'error'         — the API did not answer; status is shown as unavailable
 * While the API has no staff cards yet, the built-in list (content/staff.js) is used.
 */
export default function useStaffStatus() {
  const entry = usePublic('/staff', { refreshMs: REFRESH_MS })

  if (entry.status === 'ok') {
    const list = entry.data?.staff ?? []
    if (list.length === 0) return { staff: staticStaff, state: 'not-connected', byId: {}, updatedAt: null }
    return {
      staff: list,
      state: 'ok',
      byId: Object.fromEntries(list.map((s) => [String(s.id), { online: Boolean(s.online), onDuty: Boolean(s.onDuty) }])),
      updatedAt: entry.data.updatedAt ?? null,
    }
  }
  const state = entry.status === 'off' ? 'not-connected' : entry.status === 'loading' ? 'loading' : 'error'
  return { staff: staticStaff, state, byId: {}, updatedAt: null }
}
