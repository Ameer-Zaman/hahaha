import { useEffect, useSyncExternalStore } from 'react'

import { api, USE_API } from '../../lib/api'

/**
 * Players in the city right now, from /api/public/city (the server reads the FiveM server).
 * Shared by every indicator on the page, refreshed every 15 seconds while one is on screen (and at once when the tab comes back), and
 * kept out of the page's loading line — a slow game server never holds the page up.
 *
 * null until there is a real reading; the indicators show nothing until then, and nothing at
 * all when no server address is set in the panel ({ state: 'off' }).
 */
const REFRESH_MS = 15_000
const TIMEOUT_MS = 9000

let status = null
let users = 0
let timer = 0
let inflight = null
const listeners = new Set()

const emit = () => listeners.forEach((fn) => fn())
const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function load() {
  if (!USE_API || inflight || document.hidden) return
  inflight = api('/public/city', { timeout: TIMEOUT_MS })
    .then((data) => {
      status = data?.state === 'online' || data?.state === 'offline' ? data : null
    })
    .catch(() => {
      // keep the last reading; an API that's asleep isn't the same as the city being offline
    })
    .finally(() => {
      inflight = null
      emit()
    })
}

export function useCityStatus() {
  const value = useSyncExternalStore(subscribe, () => status)
  useEffect(() => {
    users += 1
    if (users === 1) {
      load()
      timer = setInterval(load, REFRESH_MS)
    }
    const onShow = () => !document.hidden && load()
    document.addEventListener('visibilitychange', onShow)
    return () => {
      document.removeEventListener('visibilitychange', onShow)
      users -= 1
      if (users === 0) clearInterval(timer)
    }
  }, [])
  return value
}

const nf = new Intl.NumberFormat()
export const formatCount = (n) => nf.format(n ?? 0)
