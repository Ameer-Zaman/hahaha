import { useRef, useState } from 'react'

import { useParallax } from '../../lib/parallax'
import CityPlate from './CityPlate'
import './plate.css'

/**
 * A media frame. Shows the supplied photograph or video when one is configured,
 * otherwise the illustrated city plate — so a section is never empty or broken.
 *
 * - A missing or broken photo falls back to the illustrated plate, so drop-in image slots
 *   can point at files that haven't been added yet.
 * - `priority` images load eagerly (hero); everything else is lazy.
 * - Video only plays when the visitor allows motion; the image/plate is always underneath.
 * - `parallax` gives the frame depth while scrolling: the skyline's layers move at different
 *   speeds, or a photograph drifts inside the frame. Off for reduced motion.
 */
export default function Plate({
  image = null,
  video = null,
  alt = '',
  seed,
  horizon,
  priority = false,
  parallax = false,
  className = '',
  children,
}) {
  const root = useRef(null)
  // If the photo is missing or broken, quietly fall back to the illustrated city plate.
  const [failedSrc, setFailedSrc] = useState(null)
  const photo = image && image !== failedSrc ? image : null
  useParallax(root)
  const drift = parallax ? 'y:-7%:7%' : undefined

  return (
    <div
      ref={root}
      className={`plate ${parallax ? 'plate--parallax' : ''} ${className}`}
      data-parallax-scope={parallax ? '' : undefined}
    >
      {photo ? (
        <img
          className="plate__media plate__photo"
          src={photo}
          alt={alt}
          onError={() => setFailedSrc(photo)}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          data-parallax={drift}
        />
      ) : (
        <CityPlate seed={seed} horizon={horizon} parallax={parallax} className="plate__media" />
      )}
      {video && (
        <video
          className="plate__media plate__video plate__photo"
          src={video}
          poster={photo ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          data-parallax={drift}
        />
      )}
      <div className="plate__grain" aria-hidden="true" />
      {children}
    </div>
  )
}
