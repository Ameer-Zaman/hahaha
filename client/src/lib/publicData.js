import { useEffect, useSyncExternalStore } from 'react'

import { api, USE_API } from './api'

/**
 * Cached reads of the public API (/api/public/*). Each entry is
 *   { status: 'loading' | 'ok' | 'error' | 'off', data }
 * Pages use the data when it is 'ok' and their built-in content otherwise, so the site never
 * breaks — or waits long — when the API is asleep or unreachable.
 */
const TIMEOUT_MS = 5000
const RETRY_AFTER_MS = 30_000

const OFF = Object.freeze({ status: 'off', data: null })
const LOADING = Object.freeze({ status: 'loading', data: null })

const cache = new Map()
const inflight = new Map()
const listeners = new Set()

const emit = () => listeners.forEach((fn) => fn())
const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function loadPublic(path, { force = false } = {}) {
  if (!USE_API) return Promise.resolve(OFF)
  const current = cache.get(path)
  const fresh = current && (current.status === 'ok' || Date.now() - current.at < RETRY_AFTER_MS)
  if (!force && fresh) return Promise.resolve(current)
  if (inflight.has(path)) return inflight.get(path)

  const request = api(`/public${path}`, { timeout: TIMEOUT_MS })
    .then((data) => ({ status: 'ok', data, at: Date.now() }))
    .catch(() => (current?.status === 'ok' ? current : { status: 'error', data: null, at: Date.now() }))
    .then((entry) => {
      cache.set(path, entry)
      inflight.delete(path)
      emit()
      return entry
    })
  inflight.set(path, request)
  return request
}

/** Read one public endpoint. `refreshMs` re-fetches it on an interval (e.g. live staff status). */
export function usePublic(path, { refreshMs = 0 } = {}) {
  const entry = useSyncExternalStore(subscribe, () => (USE_API ? (cache.get(path) ?? LOADING) : OFF))
  useEffect(() => {
    if (!USE_API) return undefined
    loadPublic(path)
    if (!refreshMs) return undefined
    const timer = setInterval(() => loadPublic(path, { force: true }), refreshMs)
    return () => clearInterval(timer)
  }, [path, refreshMs])
  return entry
}

/**
 * Media chosen in the admin panel (hero video, posters, join image …). Each value is a URL,
 * or null to keep the file from public/ that the site ships with.
 */
export function useSiteMedia() {
  const entry = usePublic('/site')
  return entry.status === 'ok' ? (entry.data?.media ?? {}) : {}
}
