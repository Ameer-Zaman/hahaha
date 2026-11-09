import { useEffect, useRef, useState } from 'react'

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
  const [openId, setOpenId] = useState(null) // the creator whose profile pop-out is open
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
                  {shown.map((c, i) => (
                    <li key={c.id} style={{ '--i': Math.min(i, 12) }}>
                      <CreatorCard creator={c} now={now} onOpen={() => setOpenId(c.id)} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      <ProfilePopout creator={creators.find((c) => c.id === openId) ?? null} now={now} onClose={() => setOpenId(null)} />
    </>
  )
}

const initialsOf = (name) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/**
 * A picture that may be animated. Like Discord, an uploaded GIF shows its first frame and only
 * plays while the card is hovered (or in the open profile; always on touch screens).
 */
function Pic({ src, still, className = '' }) {
  if (!src) return null
  return (
    <span className={`cr-pic ${still ? 'has-still' : ''} ${className}`}>
      <img className="cr-pic__live" src={src} alt="" loading="lazy" decoding="async" />
      {still && <img className="cr-pic__still" src={still} alt="" loading="lazy" decoding="async" />}
    </span>
  )
}

/** The logo with a status dot cut into its corner: red while live, grey when (checked and) offline. */
function Avatar({ creator: c, size = 'md' }) {
  const status = c.live.on ? 'live' : c.tracked.length > 0 ? 'off' : null
  return (
    <div className={`cr-avatar cr-avatar--${size}`}>
      <div className="cr-avatar__img">
        {c.photo ? <Pic src={c.photo} still={c.photoStill} /> : <span className="cr-avatar__initials">{initialsOf(c.name)}</span>}
      </div>
      {status && <span className={`cr-status cr-status--${status}`} role="img" aria-label={status === 'live' ? 'Live now' : 'Offline'} />}
    </div>
  )
}

/**
 * One creator as a simple profile card: their banner across the top, their logo overlapping
 * it, name and short line, their Kick followers / YouTube subscribers, what they're streaming
 * if they're live, and their channels. Clicking the card opens their profile, like Discord.
 */
function CreatorCard({ creator: c, now, onOpen }) {
  const open = (e) => {
    if (e.target.closest('a, button')) return // the card's own links and buttons do their own thing
    onOpen()
  }
  return (
    <article className={`cr-card ${c.live.on ? 'is-live' : ''}`} aria-labelledby={`cr-${c.id}`} onClick={open}>
      <div className="cr-card__banner" aria-hidden="true">
        <Pic src={c.banner} still={c.bannerStill} />
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
        <Avatar creator={c} />

        <h2 id={`cr-${c.id}`} className="cr-card__name">
          <button type="button" className="cr-card__open" onClick={onOpen}>
            {c.name}
          </button>
        </h2>
        {c.tagline && <p className="cr-card__tagline">{c.tagline}</p>}

        <Counts counts={c.counts} />

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

function Counts({ counts }) {
  if (!counts.length) return null
  return (
    <ul className="cr-counts" role="list">
      {counts.map((n) => (
        <li key={n.platform} className="cr-count">
          {PLATFORM[n.platform] && <BrandIcon platform={PLATFORM[n.platform]} size={14} />}
          <strong>{compact(n.value)}</strong>
          <span>{n.label}</span>
        </li>
      ))}
    </ul>
  )
}

/** "twitch.tv/shuku" → "shuku", "youtube.com/@shuku" → "@shuku" */
function handleOf(url) {
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/').filter(Boolean)
    const last = parts[0] === 'channel' || parts[0] === 'c' || parts[0] === 'user' ? parts[1] : parts[0]
    return decodeURIComponent(last ?? u.hostname.replace(/^www\./, ''))
  } catch {
    return url
  }
}

/**
 * The full profile, opened from a card — laid out like Discord's profile pop-out: a big banner,
 * the logo with its status, name, numbers, a "Live now" activity block, and their connections.
 * It springs open; Esc, the × or a click outside closes it.
 */
function ProfilePopout({ creator: c, now, onClose }) {
  const ref = useRef(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return undefined
    if (c && !d.open) {
      setClosing(false)
      d.showModal()
      const prev = document.documentElement.style.overflow
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.documentElement.style.overflow = prev
      }
    }
    if (!c && d.open) d.close()
    return undefined
  }, [c])

  function close() {
    if (closing) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onClose()
    setClosing(true)
    window.setTimeout(onClose, 160) // let the close animation play
  }

  const links = c ? SOCIAL_PLATFORMS.filter((p) => typeof c.links?.[p.id] === 'string' && c.links[p.id].startsWith('https://')) : []

  return (
    <dialog
      ref={ref}
      className={`crp ${closing ? 'is-closing' : ''}`}
      aria-labelledby="crp-name"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === ref.current) close()
      }}
    >
      {c && (
        <div className={`crp__panel ${c.live.on ? 'is-live' : ''}`}>
          <div className="crp__banner" aria-hidden="true">
            <Pic src={c.banner} still={null} />
          </div>
          <button type="button" className="crp__close" onClick={close} aria-label="Close">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M3.5 3.5l9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          <div className="crp__body">
            <Avatar creator={{ ...c, photoStill: null }} size="lg" />
            <div className="crp__card">
              <h2 id="crp-name" className="crp__name">
                {c.name}
              </h2>
              {c.tagline && <p className="crp__tagline">{c.tagline}</p>}
              <Counts counts={c.counts} />

              {c.live.on && (
                <section className="crp__section" aria-labelledby="crp-live">
                  <h3 id="crp-live" className="crp__h">
                    Live now
                  </h3>
                  <div className="crp__activity">
                    <span className="crp__activity-icon" aria-hidden="true">
                      {PLATFORM[c.live.platform] ? (
                        <BrandIcon platform={PLATFORM[c.live.platform]} size={26} />
                      ) : (
                        <span className="cr-dot" />
                      )}
                    </span>
                    <div className="crp__activity-text">
                      <p className="crp__activity-title">{c.live.title || `Streaming on ${platformName(c.live.platform)}`}</p>
                      <p className="crp__activity-meta">
                        Streaming on {platformName(c.live.platform)}
                        {c.live.viewers > 0 && <> · {compact(c.live.viewers)} watching</>}
                        {c.live.since && <> · {liveFor(c.live.since, now)}</>}
                      </p>
                    </div>
                  </div>
                  <a className="cr-watch cr-watch--wide" href={c.live.url} target="_blank" rel="noopener noreferrer nofollow">
                    <span className="cr-dot" aria-hidden="true" /> Watch live
                  </a>
                </section>
              )}

              {links.length > 0 && (
                <section className="crp__section" aria-labelledby="crp-connections">
                  <h3 id="crp-connections" className="crp__h">
                    Connections
                  </h3>
                  <ul className="crp__connections" role="list">
                    {links.map((p) => (
                      <li key={p.id}>
                        <a className="crp__conn" href={c.links[p.id]} target="_blank" rel="noopener noreferrer nofollow">
                          <BrandIcon platform={p} size={20} />
                          <span className="crp__conn-text">
                            <span className="crp__conn-name">{handleOf(c.links[p.id])}</span>
                            <span className="crp__conn-site">{p.label}</span>
                          </span>
                          <svg className="crp__conn-out" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                            <path d="M6 3h7v7M13 3 5 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          <span className="visually-hidden"> (opens in a new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </dialog>
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
