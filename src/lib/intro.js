/**
 * Coordination between the welcome screen and the page behind it.
 *
 * While the welcome screen is up, the hero holds its entrance animation and the hero video
 * waits; the moment the visitor enters, `enterSite()` notifies them (synchronously, inside
 * the click, so "Enter with sound" counts as the user gesture browsers require for audio).
 */
const EVENT = 'shyastha:enter'
let active = false

export const isIntroActive = () => active

export function setIntroActive(value) {
  active = value
}

/** Run `callback(detail)` once the visitor has entered — immediately if there is no intro. */
export function whenEntered(callback) {
  if (!active) {
    callback({ sound: false, immediate: true })
    return () => {}
  }
  const handler = (event) => callback(event.detail)
  window.addEventListener(EVENT, handler, { once: true })
  return () => window.removeEventListener(EVENT, handler)
}

export function enterSite({ sound = false } = {}) {
  active = false
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { sound } }))
}

const SEEN_KEY = 'shyastha:welcome-seen'

/** The welcome screen shows once per browser session, and only when landing on the homepage. */
export function shouldShowIntro(pathname) {
  if (pathname !== '/') return false
  try {
    return window.sessionStorage.getItem(SEEN_KEY) !== '1'
  } catch {
    return true
  }
}

export function markIntroSeen() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* storage unavailable: the intro may show again next visit, which is harmless */
  }
}
