import { useEffect, useRef, useState } from 'react'

import { BrandIcon, SocialLinks } from '../../components/ui/BrandIcons'
import ParallaxScope from '../../components/ui/ParallaxScope'
import ParallaxWord from '../../components/ui/ParallaxWord'
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton'
import { SOCIAL_PLATFORMS } from '../../components/ui/socialPlatforms'
import usePageTitle from '../../hooks/usePageTitle'
import { usePublic } from '../../lib/publicData'
import { useNow } from '../events/eventsModel'
import CardFrame from './CardFrame'
import WatchEye from './WatchEye'
import './creators.css'

// streaming channels first, Discord last
const CHANNEL_ORDER = ['youtube', 'kick', 'twitch', 'tiktok', 'instagram', 'x', 'facebook', 'discord']
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
                      <CreatorCard creator={c} onOpen={() => setOpenId(c.id)} />
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

/** Effects that are drawn as little pieces over the banner, and how many of each. */
const FX_PIECES = { sparkles: 12, embers: 16, snow: 22, confetti: 18, hearts: 10 }

/** A small seeded random generator, so each creator's pieces always fall the same way. */
function seeded(text) {
  let h = 1779033703
  for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353)
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

/** Sparkles, embers, snow, confetti or hearts over the top of the card (the rest are CSS on the card itself). */
function CardFx({ effect, seed, count = 1 }) {
  const n = Math.round((FX_PIECES[effect] ?? 0) * count)
  if (!n) return null
  const r = seeded(seed)
  return (
    <span className={`cr-fx cr-fx--${effect}`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i
          key={i}
          style={{
            '--x': `${(r() * 100).toFixed(1)}%`,
            '--y': `${(r() * 100).toFixed(1)}%`,
            '--d': `${(-r() * 8).toFixed(2)}s`,
            '--t': `${(3 + r() * 4).toFixed(2)}s`,
            '--s': (0.6 + r() * 0.9).toFixed(2),
            '--h': Math.floor(r() * 360),
            '--w': `${((r() - 0.5) * 40).toFixed(0)}px`,
          }}
        />
      ))}
    </span>
  )
}

/** The logo with a status dot cut into its corner: red while live, grey when (checked and) offline. */
function Avatar({ creator: c, size = 'md' }) {
  const status = c.live.on ? 'live' : c.tracked.length > 0 ? 'off' : null
  const deco = c.look?.decoration ?? 'none'
  return (
    <div className={`cr-avatar cr-avatar--${size} ${deco !== 'none' ? `deco-${deco}` : ''}`}>
      {deco !== 'none' && (
        <span className="cr-deco" aria-hidden="true">
          {deco === 'orbit' && (
            <>
              <i />
              <i />
            </>
          )}
          {deco === 'ripple' && (
            <>
              <i />
              <i />
              <i />
            </>
          )}
        </span>
      )}
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
export function CreatorCard({ creator: c, onOpen }) {
  const open = (e) => {
    if (e.target.closest('a, button')) return // the card's own links and buttons do their own thing
    onOpen?.()
  }
  const effect = c.look?.effect ?? 'none'
  return (
    <article
      className={`cr-card ${c.live.on ? 'is-live' : ''} ${effect !== 'none' ? `fx-${effect}` : ''} ${c.look?.frame && c.look.frame !== 'none' ? `has-frame frame-${c.look.frame}` : ''}`}
      style={{ '--fx': c.look?.accent || '#e3b55a' }}
      aria-labelledby={`cr-${c.id}`}
      onClick={open}
    >
      <div className="cr-card__banner" aria-hidden="true">
        <Pic src={c.banner} still={c.bannerStill} />
        <CardFx effect={effect} seed={c.id} />
        {c.live.on ? (
          <>
            <span className="cr-live">
              <span className="cr-dot" aria-hidden="true" /> Live
            </span>
            {c.live.viewers > 0 && (
              <span className="cr-views">
                <WatchEye />
                <strong>{compact(c.live.viewers)}</strong>
                <span className="visually-hidden"> watching</span>
              </span>
            )}
          </>
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

        <div className="cr-card__now">{c.live.on ? <WatchButton live={c.live} /> : <NotLiveButton creator={c} />}</div>

        <SocialLinks links={c.links} name={c.name} className="cr-card__links" order={CHANNEL_ORDER} />
      </div>
      <CardFrame frame={c.look?.frame} image={c.look?.frameImage} />
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

/**
 * "Watch on Kick": the button wears the colours and logo of the platform they're streaming on
 * (Kick green, Twitch purple, YouTube red …); an unknown platform gets the plain red "Watch live".
 */
function WatchButton({ live, wide = false }) {
  const p = PLATFORM[live.platform]
  return (
    <a
      className={`cr-watch ${wide ? 'cr-watch--wide' : ''} ${p ? `cr-watch--brand` : ''}`}
      data-platform={p?.id}
      style={p ? { '--brand': p.color } : undefined}
      href={live.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      {p ? <BrandIcon platform={p} size={16} /> : <span className="cr-dot" aria-hidden="true" />}
      {p ? `Watch on ${p.label}` : 'Watch live'}
      <span className="cr-watch__live" aria-hidden="true">
        <span className="cr-dot" /> Live
      </span>
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  )
}

/**
 * The same spot as Watch, greyed out when they're not live. "Not live right now" only when one
 * of their channels is actually checked; otherwise it says the live status isn't tracked.
 */
function NotLiveButton({ creator: c }) {
  const main = c.tracked[0] ? PLATFORM[c.tracked[0]] : null
  return (
    <span className="cr-watch cr-watch--off" aria-disabled="true">
      {main && <BrandIcon platform={main} size={16} />}
      {c.tracked.length ? 'Not live right now' : 'Live status not tracked'}
    </span>
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

  const links = c
    ? CHANNEL_ORDER.map((id) => PLATFORM[id]).filter(
        (p) => p && typeof c.links?.[p.id] === 'string' && c.links[p.id].startsWith('https://'),
      )
    : []

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
        <div className={`crp__panel ${c.live.on ? 'is-live' : ''}`} style={{ '--fx': c.look?.accent || '#e3b55a' }}>
          <div className="crp__banner" aria-hidden="true">
            <Pic src={c.banner} still={null} />
            <CardFx effect={c.look?.effect} seed={`${c.id}-big`} count={1.5} />
          </div>
          <CardFrame frame={c.look?.frame} image={c.look?.frameImage} />
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
                        {c.live.viewers > 0 && (
                          <>
                            {' '}
                            ·{' '}
                            <span className="cr-watching">
                              <WatchEye className="watch-eye--muted" /> {compact(c.live.viewers)} watching
                            </span>
                          </>
                        )}
                        {c.live.since && <> · {liveFor(c.live.since, now)}</>}
                      </p>
                    </div>
                  </div>
                  <WatchButton live={c.live} wide />
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
