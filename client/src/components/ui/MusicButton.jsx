import { toggleMusic, useMusic } from '../../lib/music'
import { media } from '../../config/site'
import './music-button.css'

/** Header control for the background music: a thin line that waves while it plays and lies flat when it's off. */
export default function MusicButton({ className = '' }) {
  const { playing } = useMusic()
  if (!media.music) return null
  return (
    <button
      type="button"
      className={`music-btn ${playing ? 'is-playing' : ''} ${className}`}
      aria-pressed={playing}
      aria-label={playing ? 'Music on — turn off' : 'Music off — turn on'}
      title={playing ? 'Music on' : 'Music off'}
      onClick={toggleMusic}
    >
      <svg className="music-btn__wave" viewBox="0 0 24 12" width="24" height="12" aria-hidden="true">
        <g className="music-btn__amp">
          <path className="music-btn__line" d="M0 6 Q3 1 6 6 T12 6 T18 6 T24 6 T30 6 T36 6 T42 6 T48 6" />
        </g>
      </svg>
    </button>
  )
}
