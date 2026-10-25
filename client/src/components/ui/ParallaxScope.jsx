import { useRef } from 'react'

import { useParallax } from '../../lib/parallax'

/**
 * Any element that owns parallax layers: renders `as` (section, li, div…) with
 * `data-parallax-scope` and animates the `data-parallax` layers directly inside it.
 */
export default function ParallaxScope({ as: Tag = 'div', options, children, ...props }) {
  const ref = useRef(null)
  useParallax(ref, options)
  return (
    <Tag ref={ref} data-parallax-scope="" {...props}>
      {children}
    </Tag>
  )
}
