import { useLayoutEffect, useRef } from 'react'

/**
 * A gang's name as a neon sign, always on one line: when a long name doesn't fit the space it
 * has, the text gets just small enough to fit (re-checked when the screen or the font changes).
 */
export default function NeonName({ as: Tag = 'h2', id, className = '', text }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const heading = ref.current
    const sign = heading?.firstElementChild
    const space = heading?.parentElement
    if (!sign || !space) return undefined
    const fit = () => {
      sign.style.setProperty('--fit', '1')
      const pad = parseFloat(getComputedStyle(heading).paddingLeft) + parseFloat(getComputedStyle(heading).paddingRight)
      const room = (space.clientWidth - pad) * 0.96 // a little spare for the slant and the glow
      const need = sign.offsetWidth
      if (need > 0 && room > 0) sign.style.setProperty('--fit', Math.min(1, room / need).toFixed(3))
    }
    fit()
    const watch = new ResizeObserver(fit)
    watch.observe(space)
    document.fonts?.ready.then(fit)
    return () => watch.disconnect()
  }, [text])

  return (
    <Tag ref={ref} id={id} className={`neon-name ${className}`}>
      <span className="neon-name__text">{text}</span>
    </Tag>
  )
}
