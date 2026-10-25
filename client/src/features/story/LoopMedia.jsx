import { useEffect, useRef, useState } from 'react'

import Plate from '../../components/media/Plate'

/** A card's media: a muted loop that plays only while on screen; the skyline/image underneath. */
export default function LoopMedia({ video, image, scene }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [allowed] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const v = ref.current
    if (!v || failed || !allowed) return undefined
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) v.play().catch(() => {})
      else v.pause()
    })
    io.observe(v)
    return () => io.disconnect()
  }, [failed, allowed])

  return (
    <div className={`loop ${scene?.tint ? `scrub--${scene.tint}` : ''}`}>
      <Plate image={image} seed={scene?.seed} horizon={scene?.horizon} className="scrub__plate" />
      {video && !failed && allowed && (
        <video
          ref={ref}
          className={`scrub__video ${ready ? 'is-ready' : ''}`}
          src={video}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      )}
      <div className="scrub__grade" aria-hidden="true" />
    </div>
  )
}
