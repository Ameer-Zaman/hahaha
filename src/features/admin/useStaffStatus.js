import { useEffect, useState } from 'react'

import { integrations } from '../../config/site'

const REFRESH_MS = 60_000

/**
 * Live staff status from the (future) FiveM integration.
 *
 * Expected response shape from `integrations.staffStatusEndpoint`:
 *   { updatedAt: ISO string, staff: [{ id, online: boolean, onDuty: boolean }] }
 *
 * States:
 *   'not-connected' — no endpoint configured; the UI must not show any live state
 *   'loading'       — first request in flight
 *   'ok'            — data is fresh from the integration
 *   'error'         — the integration did not answer; show status as unavailable
 */
export default function useStaffStatus() {
  const endpoint = integrations.staffStatusEndpoint
  const [result, setResult] = useState(() => ({
    state: endpoint ? 'loading' : 'not-connected',
    byId: {},
    updatedAt: null,
  }))

  useEffect(() => {
    if (!endpoint) return undefined
    let controller = new AbortController()

    const load = async () => {
      controller.abort()
      controller = new AbortController()
      try {
        const res = await fetch(endpoint, { signal: controller.signal, headers: { Accept: 'application/json' } })
        if (!res.ok) throw new Error(`Status ${res.status}`)
        const body = await res.json()
        if (!Array.isArray(body?.staff)) throw new Error('Unexpected response')
        const byId = Object.fromEntries(
          body.staff.map((s) => [String(s.id), { online: Boolean(s.online), onDuty: Boolean(s.onDuty) }]),
        )
        setResult({ state: 'ok', byId, updatedAt: body.updatedAt ?? new Date().toISOString() })
      } catch (error) {
        if (error.name === 'AbortError') return
        setResult((prev) => ({ ...prev, state: 'error' }))
      }
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      clearInterval(timer)
      controller.abort()
    }
  }, [endpoint])

  return result
}
