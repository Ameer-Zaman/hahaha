import { useEffect, useState } from 'react'

import { communityLinks, navigation } from '../config/site'
import { SOCIAL_PLATFORMS } from '../components/ui/socialPlatforms'
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
const ALL_ON = {
  story: true,
  staff: true,
  creators: true,
  gangs: true,
  clubs: true,
  dhadhas: true,
  events: true,
  leaderboard: true,
  rules: true,
  store: true,
  chat: true,
}
/** The chat assistant, until the panel says otherwise (Panel → Rules help chat → The bot). */
export const DEFAULT_BOT = { name: 'Vexy', avatar: null }
const DEFAULTS = { sections: ALL_ON, maintenance: { on: false, message: '' }, chatBot: DEFAULT_BOT, socials: null, logo: null }

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
    chatBot: { name: data?.chatBot?.name?.trim() || DEFAULT_BOT.name, avatar: data?.chatBot?.avatar ?? null },
    // null = never set in the panel: the links in config/site.js are used instead
    socials: Array.isArray(data?.socials) ? data.socials : null,
    // the community logo from Panel → Site settings; null = the placeholder mark
    logo: typeof data?.logo === 'string' ? data.logo : (data?.brand?.logo ?? null),
  }
}

/** `watch` re-checks every minute (used once, by the layout), so a switch lands without a reload. */
export function useSiteSettings({ watch = false } = {}) {
  const entry = usePublic('/site', { refreshMs: watch ? 60_000 : 0 })
  const live = entry.status === 'ok' && entry.data?.sections ? normalise(entry.data) : null

  // remember the last answer (as text, so the effect only runs when something changed)
  const liveKey = live ? JSON.stringify(live) : ''
  useEffect(() => {
    if (!liveKey) return
    try {
      localStorage.setItem(STORAGE_KEY, liveKey)
    } catch {
      /* storage unavailable: fine */
    }
  }, [liveKey])

  if (!USE_API) return DEFAULTS
  if (live) return live
  if (entry.status === 'loading') return normalise(readStored() ?? DEFAULTS)
  return DEFAULTS // API unreachable: keep the whole site open
}

/** The browser-tab icon follows the site logo (back to the built-in icon when there is none). */
export function useLogoFavicon(logo) {
  useEffect(() => {
    const link = document.querySelector('link[rel="icon"]')
    if (!link) return
    if (!link.dataset.original) {
      link.dataset.original = link.getAttribute('href') ?? ''
      link.dataset.originalType = link.getAttribute('type') ?? ''
    }
    if (logo) {
      link.setAttribute('href', logo)
      link.removeAttribute('type')
    } else {
      link.setAttribute('href', link.dataset.original)
      if (link.dataset.originalType) link.setAttribute('type', link.dataset.originalType)
    }
  }, [logo])
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

/**
 * The community's links (Discord, YouTube …) as set in Panel → Sections & maintenance →
 * Community links, in that order; until the panel saves a list, the ones in config/site.js.
 */
export function useCommunityLinks() {
  const { socials } = useSiteSettings()
  const list = socials ?? communityLinks.filter((l) => l.url).map((l) => ({ platform: l.id, url: l.url }))
  return list.map((l) => ({ id: l.platform, url: l.url, label: SOCIAL_PLATFORMS.find((p) => p.id === l.platform)?.label ?? l.platform }))
}
