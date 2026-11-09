import { useState } from 'react'

import { BrandIcon, SocialLinks } from '../../components/ui/BrandIcons'
import ParallaxScope from '../../components/ui/ParallaxScope'
import ParallaxWord from '../../components/ui/ParallaxWord'
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton'
import { SOCIAL_PLATFORMS } from '../../components/ui/socialPlatforms'
import usePageTitle from '../../hooks/usePageTitle'
import { usePublic } from '../../lib/publicData'
import { useNow } from '../events/eventsModel'
import './creators.css'

const PLATFORM = Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p.id, p]))
const platformName = (id) => PLATFORM[id]?.label ?? 'their stream'

/** 1234 → "1.2K" */
const compact = (n) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)

/** "live for 1 h 20 min" */
function liveFor(since, now) {
  if (!since) return ''
  const mins = Math.max(1, Math.round((now - new Date(since).getTime()) / 60_000))
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60 ? `${mins % 60} min` : ''}`.trim()
}

/**
 * Creators — the community's streamers and content creators. Whether each one is live comes
 * from Twitch, Kick and YouTube themselves (checked every minute or two by the server), or from
 * staff for platforms that can't be checked. Live creators come first.
 */
export default function CreatorsPage() {
  usePageTitle('Creators')
  const entry = usePublic('/creators', { refreshMs: 60_000 })
  const [filter, setFilter] = useState('all')
  const creators = entry.status === 'ok' ? (entry.data?.creators ?? []) : []
  const live = creators.filter((c) => c.live.on)
  const sorted = [...live, ...creators.filter((c) => !c.live.on)]
  const shown = filter === 'live' ? live : sorted
  const now = useNow(60_000)

  return (
    <>
      <ParallaxScope as="section" className="page-head page-head--word theme-dark" aria-labelledby="creators-title">
        <ParallaxWord text="Creators" motion="x:6%:-10%" className="page-head__word" />
        <div className="container">
          <h1 id="creators-title" className="page-head__title">
            Creators
          </h1>
          <p className="lede">The streamers and creators of the city — see who’s live right now and jump straight into their stream.</p>
        </div>
      </ParallaxScope>

      <div className="cr theme-black">
        <div className="container">
          {entry.status === 'loading' && <CreatorsSkeleton />}
          {(entry.status === 'error' || entry.status === 'off' || entry.status === 'missing') && (
            <p className="cr-note" role="status">
              The creators list can’t be loaded right now. Try again in a moment.
            </p>
          )}
          {entry.status === 'ok' && creators.length === 0 && (
            <div className="cr-empty">
              <p className="cr-empty__title">No creators listed yet</p>
              <p className="cr-note">The community’s streamers will show up here once the team adds them.</p>
            </div>
          )}
          {entry.status === 'ok' && creators.length > 0 && (
            <>
              <div className="cr-head">
                <p className="cr-head__count" aria-live="polite">
                  {live.length > 0 ? (
                    <>
                      <span className="cr-dot" aria-hidden="true" /> {live.length} live now
                    </>
                  ) : (
                    'Nobody is live right now'
                  )}
                </p>
                <div className="cr-filters" role="group" aria-label="Show creators">
                  {[
                    { id: 'all', label: `All (${creators.length})` },
                    { id: 'live', label: `Live (${live.length})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`cr-filter ${filter === f.id ? 'is-active' : ''}`}
                      aria-pressed={filter === f.id}
                      onClick={() => setFilter(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {shown.length === 0 ? (
                <p className="cr-note">Nobody is live right now — check back later, or follow them below to get notified.</p>
              ) : (
                <ul className="cr-grid" role="list">
                  {shown.map((c) => (
                    <li key={c.id}>
                      <CreatorCard creator={c} now={now} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

/**
 * One creator as a simple profile card: their banner across the top (a GIF plays), their logo
 * overlapping it, name and short line, their Kick followers / YouTube subscribers, what they're
 * streaming if they're live, and their channels.
 */
function CreatorCard({ creator: c, now }) {
  const initials = c.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <article className={`cr-card ${c.live.on ? 'is-live' : ''}`} aria-labelledby={`cr-${c.id}`}>
      <div className="cr-card__banner" aria-hidden="true">
        {c.banner && <img src={c.banner} alt="" loading="lazy" decoding="async" />}
        {c.live.on ? (
          <span className="cr-live">
            <span className="cr-dot" aria-hidden="true" /> Live
            {c.live.viewers > 0 && <span className="cr-live__viewers">{compact(c.live.viewers)}</span>}
          </span>
        ) : c.tracked.length > 0 ? (
          <span className="cr-off">Offline</span>
        ) : null}
      </div>

      <div className="cr-card__body">
        <div className="cr-card__avatar">
          {c.photo ? <img src={c.photo} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">{initials}</span>}
        </div>

        <h2 id={`cr-${c.id}`} className="cr-card__name">
          {c.name}
        </h2>
        {c.tagline && <p className="cr-card__tagline">{c.tagline}</p>}

        {c.counts.length > 0 && (
          <ul className="cr-counts" role="list">
            {c.counts.map((n) => (
              <li key={n.platform} className="cr-count">
                {PLATFORM[n.platform] && <BrandIcon platform={PLATFORM[n.platform]} size={14} />}
                <strong>{compact(n.value)}</strong>
                <span>{n.label}</span>
              </li>
            ))}
          </ul>
        )}

        {c.live.on && (
          <div className="cr-card__now">
            {c.live.title && <p className="cr-card__title">{c.live.title}</p>}
            <p className="cr-card__meta">
              {c.live.viewers > 0 && <>{compact(c.live.viewers)} watching · </>}
              {platformName(c.live.platform)}
              {c.live.since && <> · {liveFor(c.live.since, now)}</>}
            </p>
            <a className="cr-watch" href={c.live.url} target="_blank" rel="noopener noreferrer nofollow">
              <span className="cr-dot" aria-hidden="true" /> Watch live
            </a>
          </div>
        )}

        <SocialLinks links={c.links} name={c.name} className="cr-card__links" />
      </div>
    </article>
  )
}

function CreatorsSkeleton() {
  return (
    <SkeletonGroup label="Loading creators">
      <div className="cr-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="cr-skel">
            <Skeleton w="100%" h="7rem" radius={10} />
            <Skeleton w="4.5rem" h="4.5rem" radius={999} />
            <Skeleton w="60%" h="1.2rem" />
            <Skeleton w="40%" h="0.9rem" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  )
}
