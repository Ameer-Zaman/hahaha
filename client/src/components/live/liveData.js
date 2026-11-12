import { useEffect, useState } from 'react'

import { usePublic } from '../../lib/publicData'

/** The live gang situations from Panel → Live now, checked every 30 seconds, and a ticking clock. */
export function useLiveAlerts() {
  const entry = usePublic('/live', { refreshMs: 30_000 })
  const alerts = entry.status === 'ok' ? (entry.data?.alerts ?? []) : []
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (alerts.length === 0) return undefined
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [alerts.length])
  return { alerts, now, ready: entry.status !== 'loading' }
}

const HOSTS = [
  [/(^|\.)twitch\.tv$/i, 'Twitch'],
  [/(^|\.)(youtube\.com|youtu\.be)$/i, 'YouTube'],
  [/(^|\.)kick\.com$/i, 'Kick'],
  [/(^|\.)tiktok\.com$/i, 'TikTok'],
  [/(^|\.)(facebook\.com|fb\.gg)$/i, 'Facebook'],
]

/** "Watch on Twitch", or just "Watch live" for any other site. */
export function watchLabel(url) {
  try {
    const host = new URL(url).hostname
    const hit = HOSTS.find(([re]) => re.test(host))
    return hit ? `Watch on ${hit[1]}` : 'Watch live'
  } catch {
    return 'Watch live'
  }
}

export function ago(iso, now) {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (min < 1) return 'Just started'
  if (min < 60) return `Started ${min} min ago`
  const h = Math.floor(min / 60)
  return `Started ${h} h ${min % 60} min ago`
}

/** "Now", "12 min", "1 h 4 min" — how long it has been live, for the small timer. */
export function liveFor(iso, now) {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (min < 1) return 'Now'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return min % 60 ? `${h} h ${min % 60} min` : `${h} h`
}
