/** The first-visit tour (components/intro/SiteTour.jsx) listens for this to play again. */
export const SITE_TOUR_EVENT = 'site-tour:start'

/** Plays the site tour again (the footer's "Site tour" button). */
export function startSiteTour() {
  window.dispatchEvent(new Event(SITE_TOUR_EVENT))
}
