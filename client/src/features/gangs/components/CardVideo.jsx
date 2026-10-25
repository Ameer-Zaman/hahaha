import { useEffect, useRef, useState } from 'react'

/** Motion and data preferences: no autoplaying video for visitors who asked for less. */
function videoAllowed() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  if (navigator.connection?.saveData) return false
  return true
}

/**
 * A gang's short looping clip, laid over its card image. It only loads and plays while
 * `playing` is true (the card in focus), after a short pause so cards spinning past never
 * start downloading. It fades in once frames are actually showing; until then — or if the
 * file can't play — the image underneath stays.
 */
export default function CardVideo({ src, playing, delay = 350 }) {
  const ref = useRef(null)
  const [allowed] = useState(videoAllowed)
  const [armed, setArmed] = useState(false) // true once it has been asked to load
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const video = ref.current
    if (!video || !allowed || failed) return undefined
    if (!playing) {
      video.pause()
      return undefined
    }
    const timer = setTimeout(() => {
      setArmed(true)
      video.play().catch(() => {})
    }, delay)
    return () => clearTimeout(timer)
  }, [playing, allowed, failed, delay])

  if (!allowed || !src || failed) return null
  return (
    <video
      ref={ref}
      className={`card-video ${visible ? 'is-visible' : ''}`}
      src={src}
      muted
      loop
      playsInline
      preload={armed ? 'auto' : 'none'}
      aria-hidden="true"
      tabIndex={-1}
      onPlaying={() => setVisible(true)}
      onError={() => setFailed(true)}
    />
  )
}
