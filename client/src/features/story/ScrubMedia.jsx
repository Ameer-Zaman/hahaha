import { useEffect, useRef, useState } from 'react'

import Plate from '../../components/media/Plate'
import { gsap } from '../../lib/gsap'

/**
 * A full-frame scene whose video is driven by the scroll: `progress.current` (0 → 1) maps
 * to the video's timeline, eased so it glides rather than jumps. The illustrated skyline (or
 * `image`) sits underneath and stays if the video is missing or can't play.
 */
export default function ScrubMedia({ video, image, scene, progress, className = '' }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const v = ref.current
    if (!v || !video || failed) return undefined
    let current = 0
    const tick = () => {
      if (!v.duration || Number.isNaN(v.duration)) return
      const target = Math.min(1, Math.max(0, progress.current)) * (v.duration - 0.05)
      current += (target - current) * 0.18
      if (Math.abs(v.currentTime - current) > 1 / 40 && !v.seeking) v.currentTime = current
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [video, failed, progress])

  return (
    <div className={`scrub ${scene?.tint ? `scrub--${scene.tint}` : ''} ${className}`}>
      <Plate image={image} seed={scene?.seed} horizon={scene?.horizon} className="scrub__plate" />
      {video && !failed && (
        <video
          ref={ref}
          className={`scrub__video ${ready ? 'is-ready' : ''}`}
          src={video}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          onLoadedData={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      )}
      <div className="scrub__grade" aria-hidden="true" />
    </div>
  )
}
