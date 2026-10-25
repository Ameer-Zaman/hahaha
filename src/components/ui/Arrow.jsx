/** Double chevron, like a street-race direction sign; drawn so it stays crisp at any size. */
const Glyph = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 3.5 8 8l-4.5 4.5M8.5 3.5 13 8l-4.5 4.5" />
  </svg>
)

/**
 * The trailing arrow used on calls to action. Decorative — the label carries the meaning.
 * Two copies sit side by side in a clipped window: on hover the strip slides, so one arrow
 * leaves to the right as the next one arrives from the left.
 */
export default function Arrow() {
  return (
    <span className="btn__arrow" aria-hidden="true">
      <span className="btn__arrow-track">
        <Glyph />
        <Glyph />
      </span>
    </span>
  )
}
