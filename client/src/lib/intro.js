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

/**
 * The welcome screen shows every time the homepage is opened or refreshed. Moving between
 * pages inside the site never replays it: the layout decides once, on the first load.
 * Automated tests can skip it by setting sessionStorage 'shyastha:welcome-skip' to '1'.
 */
export function shouldShowIntro(pathname) {
  if (pathname !== '/') return false
  try {
    return window.sessionStorage.getItem('shyastha:welcome-skip') !== '1'
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

const HELLO_KEY = 'shyastha:hello-seen'

/** The "hello" intro greets each visitor once, on their very first visit. */
export function shouldShowHello() {
  try {
    return window.localStorage.getItem(HELLO_KEY) !== '1'
  } catch {
    return false // storage blocked: don't risk showing it on every visit
  }
}

export function markHelloSeen() {
  try {
    window.localStorage.setItem(HELLO_KEY, '1')
  } catch {
    /* fine */
  }
}
