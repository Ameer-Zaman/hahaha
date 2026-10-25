import { Link } from 'react-router-dom'

import Plate from '../../../components/media/Plate'
import RollText from '../../../components/ui/RollText'
import { formatFileNumber } from '../gangsModel'
import CardVideo from './CardVideo'

const PENDING = 'To be confirmed'

/**
 * One gang, set like a film's poster card: backdrop, a rolling title over a credits table
 * bottom-left, and Explore bottom-right.
 */
export default function ReelCard({ file, active, total }) {
  return (
    <article
      className={`reel-card reel-card--${file.scene.tint} ${active ? 'is-active' : ''} ${file.reserved ? 'is-reserved' : ''}`}
      aria-labelledby={`gang-${file.slug}-title`}
      data-reel-card
    >
      <div className="reel-card__frame">
        <div className="reel-card__media" aria-hidden="true">
          <Plate image={file.image} seed={file.scene.seed} horizon={file.scene.horizon}>
            {file.video && <CardVideo src={file.video} playing={active} />}
          </Plate>
        </div>
        <div className="reel-card__tint" aria-hidden="true" />
        <div className="reel-card__shade" aria-hidden="true" />
        {file.demo && <span className="demo-tag">Demo data</span>}

        <div className="reel-card__body">
          {/* top left, like a festival credit: founding year, turf and emblem */}
          {!file.reserved && file.established !== PENDING && (
            <div className="reel-card__topline">
              <p className="reel-card__year">{file.established}</p>
              <p className="reel-card__turf">{file.territory !== PENDING ? file.territory : file.type}</p>
              {file.emblem && <img className="reel-card__emblem" src={file.emblem} alt="" loading="lazy" />}
            </div>
          )}
          <div className="reel-card__left">
            <div className="reel-card__titleblock">
              {!file.reserved && <p className="reel-card__category">{file.type}</p>}
              <h2 id={`gang-${file.slug}-title`} className="reel-card__title">
                <RollText text={file.title} rolled={active} />
              </h2>
              <dl className="reel-card__credits">
                <div>
                  <dt>Leader</dt>
                  <dd>{file.leader}</dd>
                </div>
                <div>
                  <dt>Territory</dt>
                  <dd>{file.territory}</dd>
                </div>
                <div>
                  <dt>File</dt>
                  <dd>
                    {formatFileNumber(file.number)} / {formatFileNumber(total)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="reel-card__right">
            {/* Explore: a glowing map marker, like the start of a mission */}
            <Link to={`/gangs/${file.slug}`} className="blip" aria-label={`Explore ${file.title}: war record and players`}>
              <span className="blip__marker" aria-hidden="true">
                <span className="blip__pulse" />
                <span className="blip__core">
                  <svg viewBox="0 0 16 16" width="16" height="16">
                    <path d="M3.5 3.5 8 8l-4.5 4.5M8.5 3.5 13 8l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </span>
              <span className="blip__text" aria-hidden="true">
                <span className="blip__label">Explore gang</span>
                <span className="blip__sub">War record · Players</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
