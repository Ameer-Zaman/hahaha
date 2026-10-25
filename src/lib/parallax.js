import { gsap, MOTION_OK, useGSAP } from './gsap'

/**
 * Declarative scroll parallax.
 *
 * Mark the container with `data-parallax-scope` (and pass its ref here), then mark any
 * decorative layer inside it with `data-parallax="<axis>:<from>:<to>"`:
 *
 *   data-parallax="y:60:-60"      moves 60px → -60px while the scope crosses the viewport
 *   data-parallax="x:0%:-30%"     percentages use xPercent / yPercent (relative to the element)
 *
 * Rules this follows (see the motion guidance in README):
 * - Only decorative layers move — never body copy or controls.
 * - Scrubbed to scroll position; nothing is pinned and scrolling is never hijacked.
 * - Each scope only animates its own layers, so nested scopes (a plate inside a section)
 *   never double-animate the same element.
 * - Skipped entirely when the visitor prefers reduced motion; layers render at rest.
 */
export function useParallax(scopeRef, { start = 'top bottom', end = 'bottom top', scrub = 0.5 } = {}) {
  useGSAP(
    () => {
      const scope = scopeRef.current
      if (!scope) return undefined
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        const layers = [...scope.querySelectorAll('[data-parallax]')].filter(
          (el) => el.parentElement?.closest('[data-parallax-scope]') === scope,
        )
        layers.forEach((el) => {
          const spec = parseSpec(el.dataset.parallax)
          if (!spec) return
          gsap.fromTo(
            el,
            { [spec.prop]: spec.from },
            {
              [spec.prop]: spec.to,
              ease: 'none',
              scrollTrigger: { trigger: scope, start, end, scrub },
            },
          )
        })
      })
      return () => mm.revert()
    },
    { scope: scopeRef },
  )
}

function parseSpec(raw) {
  const [axis, from, to] = String(raw ?? '').split(':')
  if (!['x', 'y'].includes(axis) || from === undefined || to === undefined) return null
  const percent = from.endsWith('%') || to.endsWith('%')
  return {
    prop: percent ? `${axis}Percent` : axis,
    from: parseFloat(from),
    to: parseFloat(to),
  }
}
