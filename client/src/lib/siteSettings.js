import { useEffect, useState } from 'react'

import { navigation } from '../config/site'
import { api, USE_API } from './api'
import { usePublic } from './publicData'

/**
 * Site switches set in the admin panel (Panel → Site settings):
 *   sections     which pages show in the menu and can be opened (Home is always on)
 *   maintenance  { on, message }: visitors see a "be right back" screen instead of the site
 *
 * The last answer is remembered in the browser, so a returning visitor gets the right menu
 * straight away. If the API can't be reached, everything stays on (the site never locks
 * itself out because the server is asleep).
 */
const STORAGE_KEY = 'shy-site-settings'
const ALL_ON = { story: true, staff: true, gangs: true, clubs: true, dhadhas: true, leaderboard: true, rules: true }
const DEFAULTS = { sections: ALL_ON, maintenance: { on: false, message: '' } }

/** The section a path belongs to, or null for pages that are always on. */
export function sectionOf(path = '') {
  const first = path.split(/[?#]/)[0].split('/')[1] ?? ''
  return Object.hasOwn(ALL_ON, first) ? first : null
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function normalise(data) {
  const saved = { ...(data?.sections ?? {}) }
  if (saved.staff === undefined && saved.admin !== undefined) saved.staff = saved.admin // old name
  delete saved.admin
  return {
    sections: { ...ALL_ON, ...saved },
    maintenance: { on: Boolean(data?.maintenance?.on), message: data?.maintenance?.message ?? '' },
  }
}

/** `watch` re-checks every minute (used once, by the layout), so a switch lands without a reload. */
export function useSiteSettings({ watch = false } = {}) {
  const entry = usePublic('/site', { refreshMs: watch ? 60_000 : 0 })
  const live = entry.status === 'ok' && entry.data?.sections ? normalise(entry.data) : null

  useEffect(() => {
    if (!live) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(live))
    } catch {
      /* storage unavailable: fine */
    }
  }, [live?.maintenance.on, live?.maintenance.message, JSON.stringify(live?.sections)]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!USE_API) return DEFAULTS
  if (live) return live
  if (entry.status === 'loading') return normalise(readStored() ?? DEFAULTS)
  return DEFAULTS // API unreachable: keep the whole site open
}

/** Is the section for this path switched on? (Paths outside any section are always on.) */
export function useSectionOn(path) {
  const { sections } = useSiteSettings()
  const key = sectionOf(path)
  return !key || sections[key] !== false
}

/** The navigation with switched-off sections removed (a dropdown left with one link becomes that link). */
export function useNavigation() {
  const { sections } = useSiteSettings()
  const on = (item) => {
    const key = sectionOf(item.to)
    return !key || sections[key] !== false
  }
  const items = navigation
    .map((item) => {
      if (!item.children) return on(item) ? item : null
      const children = item.children.filter(on)
      if (children.length === 0) return null
      if (children.length === 1) return children[0]
      return { ...item, children }
    })
    .filter(Boolean)
  return { navigation: items, links: items.flatMap((item) => item.children ?? [item]) }
}

/**
 * During maintenance, a signed-in panel account still sees the site (with a notice), so the
 * team can check things before reopening. Only asked while maintenance is on.
 */
export function useStaffPreview(maintenanceOn) {
  const [state, setState] = useState({ for: false, ok: false })
  useEffect(() => {
    if (!maintenanceOn || !USE_API) return undefined
    let alive = true
    api('/auth/me', { timeout: 8000 })
      .then(() => alive && setState({ for: true, ok: true }))
      .catch(() => alive && setState({ for: true, ok: false }))
    return () => {
      alive = false
    }
  }, [maintenanceOn])
  return { checked: !maintenanceOn || state.for, staff: maintenanceOn && state.ok }
}
