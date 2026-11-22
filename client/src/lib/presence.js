import { useEffect } from 'react'

import { USE_API } from './api'

/**
 * Lets the panel count how many people have the website open right now. This tab makes up a
 * random code for itself (kept for the tab's life, so a reload isn't counted twice) and checks
 * in every 30 seconds with that code and the page's path. Nothing else is sent: no name, no
 * cookie, no fingerprint; the server keeps it in memory only and forgets the tab once it stops
 * checking in. When the tab closes it says goodbye, so it drops off at once.
 */
const EVERY_MS = 30 * 1000
const KEY = 'presence-tab'

function tabCode() {
  const make = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, '0')).join('')
  try {
    let code = sessionStorage.getItem(KEY)
    if (!code || !/^[a-z0-9]{12,40}$/.test(code)) {
      code = make()
      sessionStorage.setItem(KEY, code)
    }
    return code
  } catch {
    return (tabCode.code ??= make())
  }
}

function send(body) {
  fetch('/api/public/presence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true, // still delivered while the tab is closing
    credentials: 'omit',
  }).catch(() => {})
}

/** Checks this tab in while the public website is open, on `path`. */
export function usePresence(path) {
  useEffect(() => {
    if (!USE_API) return undefined
    const id = tabCode()
    const ping = () => send({ id, path })
    ping()
    const timer = setInterval(ping, EVERY_MS)
    const leave = () => send({ id, path, leave: true })
    // back from the background (or from the back/forward cache): check in again at once
    const back = () => document.visibilityState === 'visible' && ping()
    window.addEventListener('pagehide', leave)
    window.addEventListener('pageshow', back)
    document.addEventListener('visibilitychange', back)
    return () => {
      clearInterval(timer)
      window.removeEventListener('pagehide', leave)
      window.removeEventListener('pageshow', back)
      document.removeEventListener('visibilitychange', back)
    }
  }, [path])
}
