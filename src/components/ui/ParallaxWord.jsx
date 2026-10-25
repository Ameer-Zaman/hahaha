import './parallax-word.css'

/**
 * An oversized, outlined word that drifts behind a section's content. Purely decorative:
 * hidden from assistive technology, never interactive, and still when motion is reduced.
 * Must sit inside a <ParallaxScope> (or another data-parallax-scope) to move.
 */
export default function ParallaxWord({ text, motion = 'x:-6%:6%', className = '' }) {
  return (
    <span className={`parallax-word ${className}`} aria-hidden="true" data-parallax={motion}>
      {text}
    </span>
  )
}
