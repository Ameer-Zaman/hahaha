import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton'
import { SOCIAL_PLATFORMS } from '../../components/ui/socialPlatforms'
import usePageTitle from '../../hooks/usePageTitle'
import { usePublic } from '../../lib/publicData'
import { useCommunityLinks } from '../../lib/siteSettings'
import { formatPrice, isSoon } from './price'
import { STORE_TREE, isVip, pathLabels, planOf } from './taxonomy'
import './store.css'

/**
 * Store — game assets for other server owners (scripts, maps, vehicles …) and in-game items
 * for players. Nothing is paid for on the website: Buy opens the store's Discord ticket link (or
 * a product's own link, e.g. Tebex), and staff handle payment and delivery there.
 */

const PLANS = [{ id: 'all', label: 'All', subs: [] }, ...STORE_TREE]
const BADGE = { new: 'New', popular: 'Popular', limited: 'Limited', sale: 'Sale' }
const DISCORD_ICON = SOCIAL_PLATFORMS.find((p) => p.id === 'discord')?.icon

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const discountOf = (p) => (p.oldPrice && p.price !== null && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0)

/** Where Buy goes and what it says: the product's own link, the store's, or the community Discord. */
function buyFor(product, storeLink, discord) {
  const url = product.buyUrl || storeLink || discord || null
  let host = ''
  try {
    host = url ? new URL(url).hostname.replace(/^www\./, '') : ''
  } catch {
    return { url: null, label: 'Not on sale yet', discord: false }
  }
  const isDiscord = /(^|\.)(discord\.com|discord\.gg|discordapp\.com)$/.test(host)
  if (product.soldOut) return { url: null, label: 'Sold out', discord: false }
  if (isSoon(product)) return { url: null, label: 'Coming soon', discord: false }
  if (!url) return { url: null, label: 'Not on sale yet', discord: false }
  return {
    url,
    discord: isDiscord,
    label: isDiscord ? 'Buy on Discord' : /(^|\.)tebex\.io$/.test(host) ? 'Buy on Tebex' : 'Buy now',
  }
}

export default function StorePage() {
  const entry = usePublic('/store')
  const discord = useCommunityLinks().find((l) => l.id === 'discord')?.url ?? ''
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [plan, setPlan] = useState('all')
  const [sub, setSub] = useState('all') // second level, e.g. 'custom-vehicle'
  const [leaf, setLeaf] = useState('all') // third level, e.g. 'car'
  const pick = (p, s = 'all', l = 'all') => {
    setPlan(p)
    setSub(s)
    setLeaf(l)
  }

  const products = useMemo(() => (entry.status === 'ok' ? (entry.data?.products ?? []) : []), [entry])
  const store = entry.status === 'ok' ? (entry.data?.store ?? {}) : {}
  // "Coming soon" until the team switches it off in Panel → Store (also while the store can't be reached)
  // the store is open; "Coming soon" only when it's switched on in Panel → Store
  const soon = entry.status === 'ok' && store.comingSoon === true
  const open = slug && entry.status === 'ok' && !soon ? (products.find((p) => p.id === slug) ?? null) : null
  usePageTitle(slug ? (open?.name ?? 'Store') : 'Store')

  const top = PLANS.find((t) => t.id === plan)
  const subNode = top?.subs.find((n) => n.id === sub) ?? null
  const inPlan = (p) => plan === 'all' || planOf(p) === plan
  const inSub = (p, s) => s === 'all' || p.sub === s || (p.sub ?? '').startsWith(`${s}/`)
  const inLeaf = (p, l) => l === 'all' || p.sub === `${sub}/${l}`
  const shown = products.filter((p) => inPlan(p) && inSub(p, sub) && inLeaf(p, leaf))
  const spotlight = shown.find((p) => p.featured) ?? null
  const grid = spotlight ? shown.filter((p) => p !== spotlight) : shown

  // opened from the list: step back to it (so Back also closes it); from a shared link: go to the list
  const close = () => (location.state?.fromList ? navigate(-1) : navigate('/store', { replace: true }))

  return (
    <>
      <div className={`st st--top theme-black ${plan === 'vip' ? 'is-vip-view' : ''}`}>
        <h1 className="visually-hidden">Store</h1>
        <div className="container">
          {entry.status === 'loading' && <StoreSkeleton />}
          {soon && <ComingSoon discord={discord} />}
          {(entry.status === 'error' || entry.status === 'off') && (
            <p className="st-note" role="status">
              The store can’t be loaded right now. Try again in a moment.
            </p>
          )}
          {entry.status === 'missing' && (
            <div className="st-empty">
              <p className="st-empty__title">The store is being stocked</p>
              <p className="st-note">Scripts, maps and in-game items will show up here once the team lists them.</p>
            </div>
          )}

          {entry.status === 'ok' && !soon && (
            <>
              <div className="st-bar">
                <div className="st-kinds st-plans" role="group" aria-label="Category">
                  {PLANS.map((c) => {
                    const count = c.id === 'all' ? products.length : products.filter((p) => planOf(p) === c.id).length
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`st-kind st-plan st-plan--${c.id} ${plan === c.id ? 'is-active' : ''}`}
                        aria-pressed={plan === c.id}
                        onClick={() => pick(c.id)}
                      >
                        <span className="st-kind__word">
                          {c.id === 'vip' && <Crown />}
                          {c.label}
                          <sup className="st-kind__count">{String(count).padStart(2, '0')}</sup>
                        </span>
                      </button>
                    )
                  })}
                </div>

                {top && top.subs.length > 0 && (
                  <div className={`st-subs ${plan === 'vip' ? 'st-subs--vip' : ''}`} role="group" aria-label={`${top.label}: choose`}>
                    {[{ id: 'all', label: `All ${top.label}` }, ...top.subs].map((n) => {
                      const count = products.filter((p) => inPlan(p) && inSub(p, n.id)).length
                      return (
                        <button
                          key={n.id}
                          type="button"
                          className={`st-sub ${sub === n.id ? 'is-active' : ''}`}
                          aria-pressed={sub === n.id}
                          onClick={() => pick(plan, n.id)}
                        >
                          {n.label}
                          <span className="st-sub__count">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {subNode?.subs?.length > 0 && (
                  <div className="st-leaves" role="group" aria-label={`${subNode.label}: choose`}>
                    <span className="st-leaves__from" aria-hidden="true">
                      {subNode.label}
                    </span>
                    {[{ id: 'all', label: 'All' }, ...subNode.subs].map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={`st-leaf ${leaf === n.id ? 'is-active' : ''}`}
                        aria-pressed={leaf === n.id}
                        onClick={() => setLeaf(n.id)}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {plan === 'vip' && (
                <div className="st-vip-head" aria-hidden="true">
                  <Crown />
                  <span>{subNode ? subNode.label : 'VIP'}</span>
                </div>
              )}

              {spotlight && <Spotlight product={spotlight} />}

              {shown.length === 0 && (
                <p className="st-note st-none" role="status">
                  {products.length === 0
                    ? 'The store is being stocked — products will show up here soon.'
                    : 'Nothing in this category yet — '}
                  {products.length > 0 && (
                    <>
                      try another, or{' '}
                      <button type="button" className="st-none__reset" onClick={() => pick('all')}>
                        show everything
                      </button>
                      .
                    </>
                  )}
                </p>
              )}

              {grid.length > 0 && (
                <ul className="st-grid" role="list">
                  {grid.map((p, i) => (
                    <li key={p.id} style={{ '--i': Math.min(i, 12) }}>
                      <ProductCard product={p} index={shown.indexOf(p) + 1} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      <ProductSheet
        open={Boolean(slug) && entry.status !== 'loading' && !soon}
        product={open}
        buy={open ? buyFor(open, store.buyUrl, discord) : null}
        onClose={close}
      />
    </>
  )
}

/* ------------------------------------------------------------ coming soon */

const SOON_SHELVES = [
  { word: 'Assets', hint: 'For server owners', items: ['Scripts', 'MLO', 'Vehicles', 'Clothing'] },
  { word: 'In-game', hint: 'For players in the city', items: ['VIP', 'Vehicles', 'Properties', 'Perks'] },
]

/** The store isn't open yet: what it will hold, and where to hear when it opens. */
function ComingSoon({ discord }) {
  return (
    <section className="st-soon" aria-labelledby="st-soon-title">
      <p className="st-soon__eyebrow">
        <span className="st-spot__star" aria-hidden="true" />
        Opening soon
      </p>
      <h2 id="st-soon-title" className="st-soon__title">
        Coming soon
      </h2>
      <p className="st-soon__text">
        The shelves are being stocked. Scripts, maps and vehicles for server owners — and perks for players in the city.
      </p>

      <ul className="st-soon__shelves" role="list">
        {SOON_SHELVES.map((s, i) => (
          <li key={s.word} className="st-soon__shelf" style={{ '--i': i }}>
            <span className="st-soon__no" aria-hidden="true">
              N°{String(i + 1).padStart(2, '0')}
            </span>
            <span className="st-soon__word">{s.word}</span>
            <span className="st-soon__hint">{s.hint}</span>
            <span className="st-soon__items">{s.items.join(' · ')}</span>
          </li>
        ))}
      </ul>

      {discord && (
        <a className="st-soon__cta" href={discord} target="_blank" rel="noopener noreferrer">
          {DISCORD_ICON && (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d={DISCORD_ICON.path} fill="currentColor" />
            </svg>
          )}
          Get notified on Discord
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ pieces */

/** The light that follows the pointer around a card's edge. */
function trackPointer(e) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

function Price({ product: p, size = 'md' }) {
  const off = discountOf(p)
  return (
    <span className={`st-price st-price--${size} ${p.price === null ? 'is-ask' : ''} ${isSoon(p) ? 'is-soon' : ''}`}>
      <span className="st-price__now">{formatPrice(p.price, p.currency)}</span>
      {off > 0 && (
        <s className="st-price__was">
          <span className="visually-hidden">was </span>
          {formatPrice(p.oldPrice, p.currency)}
        </s>
      )}
      {p.priceNote && p.price !== null && <span className="st-price__note">{p.priceNote}</span>}
    </span>
  )
}

function Crown() {
  return (
    <svg className="st-crown" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path d="M2 12.5h12l1-7.5-4 3.2L8 3 5 8.2 1 5z" fill="currentColor" />
    </svg>
  )
}

/** The VIP tag, next to the other tags on the picture. */
function VipTag({ product: p }) {
  if (!isVip(p)) return null
  return (
    <span className="st-badge st-badge--vip">
      <Crown />
      VIP
    </span>
  )
}

function Badge({ product: p }) {
  if (p.soldOut) return <span className="st-badge st-badge--out">Sold out</span>
  const off = discountOf(p)
  if (p.badge) return <span className={`st-badge st-badge--${p.badge}`}>{p.badge === 'sale' && off ? `−${off}%` : BADGE[p.badge]}</span>
  if (off) return <span className="st-badge st-badge--sale">−{off}%</span>
  return null
}

/**
 * No picture yet: a living, colourful "Coming soon" — soft colour blobs drifting like a slow
 * video, a grain over them and the words in the middle. Each product gets its own colours.
 */
const SOON_PALETTES = [
  ['#ff3d77', '#7a5cff', '#00d4ff'],
  ['#ffb347', '#ff5e62', '#8e54e9'],
  ['#00f5a0', '#00d9f5', '#7a5cff'],
  ['#f9d423', '#ff4e50', '#c471ed'],
  ['#43e97b', '#38f9d7', '#4facfe'],
  ['#fa709a', '#fee140', '#a18cd1'],
]
function SoonArt({ seed = '', big = false }) {
  let h = 0
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const [a, b, c] = SOON_PALETTES.at(h % SOON_PALETTES.length)
  return (
    <span className={`st-soonart ${big ? 'st-soonart--big' : ''}`} style={{ '--a': a, '--b': b, '--c': c, '--d': `${-(h % 9)}s` }}>
      <span className="st-soonart__blob st-soonart__blob--a" />
      <span className="st-soonart__blob st-soonart__blob--b" />
      <span className="st-soonart__blob st-soonart__blob--c" />
      <span className="st-soonart__grain" />
      <span className="st-soonart__words">
        <span className="st-soonart__dot" aria-hidden="true" />
        Coming soon
      </span>
    </span>
  )
}

/** The picture, and the preview clip while the pointer is over it (never with reduced motion). */
function Media({ product: p, playing, eager = false }) {
  const video = useRef(null)
  const [wanted, setWanted] = useState(false)
  // the clip is only fetched the first time someone points at the card
  if (playing && p.video && !wanted && !reducedMotion()) setWanted(true)
  useEffect(() => {
    const v = video.current
    if (!v) return
    if (playing) v.play().catch(() => {})
    else v.pause()
  }, [playing, wanted])

  return (
    <div className={`st-media ${p.soldOut ? 'is-out' : ''}`}>
      {p.cover ? <img src={p.cover} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" /> : <SoonArt seed={p.id} />}
      {wanted && (
        <video ref={video} src={p.video} muted loop playsInline preload="auto" className={playing ? 'is-on' : ''} aria-hidden="true" />
      )}
    </div>
  )
}

export function ProductCard({ product: p, index }) {
  const [hover, setHover] = useState(false)
  return (
    <Link
      to={`/store/${p.id}`}
      state={{ fromList: true }}
      className={`st-card ${p.soldOut ? 'is-out' : ''} ${isVip(p) ? 'is-vip' : ''}`}
      onPointerMove={trackPointer}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <div className="st-card__frame">
        <Media product={p} playing={hover} />
        <span className="st-card__no" aria-hidden="true">
          N°{String(index).padStart(2, '0')}
        </span>
        <span className="st-card__tags">
          <VipTag product={p} />
          <Badge product={p} />
        </span>
      </div>
      <div className="st-card__body">
        <p className="st-card__meta">
          {pathLabels(planOf(p), p.sub).join(' · ')}
          {p.category && <> · {p.category}</>}
        </p>
        <h2 className="st-card__name">{p.name}</h2>
        {p.tagline && <p className="st-card__tag">{p.tagline}</p>}
        <div className="st-card__foot">
          <Price product={p} />
          <span className="st-card__view" aria-hidden="true">
            View
          </span>
        </div>
      </div>
    </Link>
  )
}

/** The first featured product of what's shown, as a wide card. */
function Spotlight({ product: p }) {
  const [hover, setHover] = useState(false)
  return (
    <Link
      to={`/store/${p.id}`}
      state={{ fromList: true }}
      className={`st-spot ${p.soldOut ? 'is-out' : ''} ${isVip(p) ? 'is-vip' : ''}`}
      onPointerMove={trackPointer}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <div className="st-spot__frame">
        <Media product={p} playing={hover} eager />
        <span className="st-card__tags">
          <VipTag product={p} />
          <Badge product={p} />
        </span>
      </div>
      <div className="st-spot__body">
        <p className="st-spot__eyebrow">
          <span className="st-spot__star" aria-hidden="true" />
          Featured · {pathLabels(planOf(p), p.sub).join(' · ')}
          {p.category && <> · {p.category}</>}
        </p>
        <h2 className="st-spot__name">{p.name}</h2>
        {p.tagline && <p className="st-spot__tag">{p.tagline}</p>}
        <div className="st-spot__foot">
          <Price product={p} size="lg" />
          <span className="st-spot__view">View details</span>
        </div>
      </div>
    </Link>
  )
}

/* ------------------------------------------------------------- the sheet */

const paragraphs = (text) =>
  (text || '')
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean)

function ProductSheet({ open, product: p, buy, onClose }) {
  const ref = useRef(null)
  const [closing, setClosing] = useState(false)
  const [pick, setPick] = useState({ id: null, shot: 0 }) // the picture chosen, for this product
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return undefined
    if (open && !d.open) {
      setClosing(false)
      d.showModal()
      const prev = document.documentElement.style.overflow
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.documentElement.style.overflow = prev
      }
    }
    if (!open && d.open) d.close()
    return undefined
  }, [open])

  // a different product starts on its first picture
  const shot = pick.id === p?.id ? pick.shot : 0
  const copied = Boolean(p) && copiedId === p.id

  function close() {
    if (closing) return
    if (reducedMotion()) return onClose()
    setClosing(true)
    window.setTimeout(onClose, 220) // let the slide-out play
  }

  const shots = p
    ? [
        ...(p.video ? [{ type: 'video', src: p.video }] : []),
        ...[p.cover, ...p.gallery].filter(Boolean).map((src) => ({ type: 'image', src })),
      ].filter((s, i, all) => all.findIndex((o) => o.src === s.src) === i)
    : []
  const current = shots[Math.min(shot, shots.length - 1)]

  async function copyOrder() {
    const line = `Order: ${p.name} — ${formatPrice(p.price, p.currency)}${p.priceNote && p.price !== null ? ` ${p.priceNote}` : ''} — ${window.location.origin}/store/${p.id}`
    try {
      await navigator.clipboard.writeText(line)
      setCopiedId(p.id)
      window.setTimeout(() => setCopiedId(null), 2200)
    } catch {
      setCopiedId(null)
    }
  }

  return (
    <dialog
      ref={ref}
      className={`st-sheet ${closing ? 'is-closing' : ''}`}
      aria-labelledby="st-sheet-name"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === ref.current) close()
      }}
    >
      <div className="st-sheet__panel">
        <button type="button" className="st-sheet__close" onClick={close} aria-label="Close">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M3.5 3.5l9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        {!p && open && (
          <div className="st-sheet__missing">
            <h2 id="st-sheet-name" className="st-sheet__name">
              Not in the store
            </h2>
            <p className="st-note">This product isn’t listed any more. Have a look at what is.</p>
            <button type="button" className="st-buy" onClick={close}>
              Back to the store
            </button>
          </div>
        )}

        {p && (
          <>
            <div className="st-sheet__scroll">
              <div className="st-gallery">
                <div className="st-gallery__main">
                  {current?.type === 'video' ? (
                    <video
                      key={current.src}
                      src={current.src}
                      poster={p.cover ?? undefined}
                      muted
                      loop
                      playsInline
                      autoPlay={!reducedMotion()}
                      controls={reducedMotion()}
                    />
                  ) : current ? (
                    <img key={current.src} src={current.src} alt={p.name} />
                  ) : (
                    <SoonArt seed={p.id} big />
                  )}
                  <span className="st-card__tags">
                    <VipTag product={p} />
                    <Badge product={p} />
                  </span>
                </div>
                {shots.length > 1 && (
                  <div className="st-gallery__thumbs" role="group" aria-label="Pictures">
                    {shots.map((s, i) => (
                      <button
                        key={s.src}
                        type="button"
                        className={`st-thumb ${i === shot ? 'is-active' : ''}`}
                        aria-pressed={i === shot}
                        aria-label={s.type === 'video' ? 'Preview clip' : `Picture ${i + 1}`}
                        onClick={() => setPick({ id: p.id, shot: i })}
                      >
                        {s.type === 'video' ? (
                          <span className="st-thumb__play" aria-hidden="true">
                            <svg viewBox="0 0 16 16" width="14" height="14">
                              <path d="M5 3.5v9l7-4.5z" fill="currentColor" />
                            </svg>
                          </span>
                        ) : (
                          <img src={s.src} alt="" loading="lazy" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="st-sheet__body">
                <p className="st-card__meta">
                  {pathLabels(planOf(p), p.sub).join(' · ')}
                  {p.category && <> · {p.category}</>}
                </p>
                <h2 id="st-sheet-name" className="st-sheet__name">
                  {p.name}
                </h2>
                {p.tagline && <p className="st-sheet__tag">{p.tagline}</p>}

                {paragraphs(p.description).length > 0 && (
                  <div className="st-sheet__text">
                    {paragraphs(p.description).map((t, i) => (
                      <p key={i}>{t}</p>
                    ))}
                  </div>
                )}

                {p.features.length > 0 && (
                  <section className="st-sec" aria-labelledby="st-feat">
                    <h3 id="st-feat" className="st-sec__h">
                      What you get
                    </h3>
                    <ul className="st-feats" role="list">
                      {p.features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {p.specs.length > 0 && (
                  <section className="st-sec" aria-labelledby="st-specs">
                    <h3 id="st-specs" className="st-sec__h">
                      Details
                    </h3>
                    <dl className="st-specs">
                      {p.specs.map((s, i) => (
                        <div key={i} className="st-specs__row">
                          <dt>{s.label}</dt>
                          <dd>{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}
              </div>
            </div>

            <div className="st-sheet__buy">
              <Price product={p} size="lg" />
              <div className="st-sheet__actions">
                {buy?.url ? (
                  <a className="st-buy" href={buy.url} target="_blank" rel="noopener noreferrer">
                    {buy.discord && DISCORD_ICON && (
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path d={DISCORD_ICON.path} fill="currentColor" />
                      </svg>
                    )}
                    {buy.label}
                  </a>
                ) : (
                  <span className="st-buy is-off" aria-disabled="true">
                    {buy?.label ?? 'Not on sale yet'}
                  </span>
                )}
                {buy?.url && (
                  <button type="button" className="st-copy" onClick={copyOrder} aria-live="polite">
                    {copied ? 'Copied — paste it in your ticket' : 'Copy order details'}
                  </button>
                )}
              </div>
              {buy?.url && (
                <p className="st-sheet__how">
                  {buy.discord
                    ? 'Opens our Discord: open a ticket, paste your order and staff will take care of payment and delivery.'
                    : 'Opens in a new tab. Payment and delivery are handled there, not on this website.'}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}

function StoreSkeleton() {
  return (
    <SkeletonGroup label="Loading the store" className="st-grid st-grid--skeleton">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="st-skel">
          <Skeleton h="auto" radius={12} className="st-skel__media" />
          <Skeleton w="40%" h="0.7rem" />
          <Skeleton w="70%" h="1.3rem" />
          <Skeleton w="30%" h="0.9rem" />
        </div>
      ))}
    </SkeletonGroup>
  )
}
