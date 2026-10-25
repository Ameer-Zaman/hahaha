import { toggleMusic, useMusic } from '../../lib/music'
import { media } from '../../config/site'
import './music-button.css'

/** Header control for the background music: three gold bars that dance while it plays. */
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
      <span className="music-btn__bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
    </button>
  )
}
