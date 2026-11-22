import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ApplyLink from '../../components/ui/ApplyLink'
import FactionState from '../../components/ui/FactionState'
import Arrow from '../../components/ui/Arrow'
import { PageLoader } from '../../components/ui/Skeleton'
import { clubs as staticClubs, suits } from '../../content/clubs'
import usePageTitle from '../../hooks/usePageTitle'
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { loadPublic, usePublic } from '../../lib/publicData'
import CardBack from './CardBack'
import ClubDetail from './ClubDetail'
import CardFace from './CardFace'
import './clubs.css'

/** The cards on the table: the confirmed clubs, or one "to be announced" card per suit. */
const dealDeck = (clubs) =>
  (clubs.length ? clubs : suits.map(() => null)).map((club, i) => ({
    key: club?.id ?? `tba-${i}`,
    club,
    suit: suits[i % suits.length],
    number: i + 1,
  }))

/**
 * Phones and portrait tablets get a grid instead of the fan: a fan narrow enough to fit a
 * phone hides most of every card behind the next. Keep in step with clubs.css.
 */
const GRID = '(max-width: 900px)'

/** Where card `i` of `n` sits in the fan: spread sideways along a gentle arc, tilted outwards. */
function fanPose(i, n, width) {
  const mid = (n - 1) / 2
  const off = n > 1 ? (i - mid) / mid : 0 // -1 … 1
  const narrow = width < 640
  const spread = (narrow ? width * 0.135 : Math.min(width * 0.2, 230)) * (n > 4 ? 4 / n : 1)
  return {
    x: (i - mid) * spread,
    y: Math.abs(off) ** 2 * (narrow ? 22 : 34),
    rotation: off * (narrow ? 12 : 16),
  }
}

/**
 * Clubs — a deck of cards.
 * Scrolling deals it: the stacked deck fans out, then each card flips over to show its club.
 * With reduced motion the cards are simply shown face up.
 */
export default function ClubsPage() {
  // clubs added in the admin panel; the built-in list (content/clubs.js) when there are none
  const entry = usePublic('/clubs')
  const { slug } = useParams()
  const navigate = useNavigate()
  const clubsNow = entry.status === 'ok' && entry.data?.clubs?.length ? entry.data.clubs : staticClubs
  const openClub = slug ? clubsNow.find((c) => c.id === slug) : null
  usePageTitle(openClub ? `${openClub.name} · Clubs` : 'Clubs')

  // a link to a club that isn't there (any more): just show the table
  useEffect(() => {
    if (slug && entry.status !== 'loading' && !openClub) navigate('/clubs', { replace: true })
  }, [slug, entry.status, openClub, navigate])

  if (entry.status === 'loading')
    return (
      <div className="route-loading">
        <PageLoader label="Loading clubs" />
      </div>
    )
  const clubs = entry.status === 'ok' && entry.data?.clubs?.length ? entry.data.clubs : staticClubs
  // nothing to deal: say whether none have been added yet, or the server couldn't be reached
  if (clubs.length === 0) {
    const reached = entry.status === 'ok' || entry.status === 'off'
    return reached ? (
      <FactionState kind="empty" faction="clubs" />
    ) : (
      <FactionState kind="error" faction="clubs" onRetry={() => loadPublic('/clubs', { force: true })} />
    )
  }
  return <ClubsDeck key={clubs.map((c) => c.id).join('|')} clubs={clubs} openId={openClub?.id ?? null} />
}

function ClubsDeck({ clubs, openId }) {
  const deck = dealDeck(clubs)
  const root = useRef(null)
  const navigate = useNavigate()
  const source = useRef(null) // the table card that was clicked, for the flight up to the screen
  const openedHere = useRef(false) // opened from the table (not arrived on its address)

  // a club has its own address (/clubs/<club>), so it can be shared; opening one keeps the table
  // where it is underneath
  const open = (key, el) => {
    source.current = el
    openedHere.current = true
    navigate(`/clubs/${key}`, { preventScrollReset: true })
  }
  const real = deck.filter((d) => d.club)
  const move = useCallback(
    (step) => {
      const at = real.findIndex((d) => d.key === openId)
      if (at < 0 || real.length < 2) return
      source.current = null
      navigate(`/clubs/${real[(at + step + real.length) % real.length].key}`, { replace: true, preventScrollReset: true })
    },
    [real, openId, navigate],
  )
  const [motion] = useState(() => window.matchMedia(MOTION_OK).matches)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add({ grid: GRID, motion: MOTION_OK }, (ctx) => {
        const { grid, motion: moving } = ctx.conditions
        if (!moving) return
        const cards = gsap.utils.toArray('.club-card')
        const inners = gsap.utils.toArray('.club-card__inner')
        const n = cards.length

        if (grid) {
          // the grid: once the table is in view, the cards are dealt in and turned over in turn
          gsap.set(inners, { rotationY: 0 })
          gsap.set(cards, { y: 36, opacity: 0 })
          gsap
            .timeline({ scrollTrigger: { trigger: '.clubs-deck__table', start: 'top 85%', once: true } })
            .to(cards, { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: 'power3.out' })
            .to(inners, { rotationY: 180, duration: 0.55, stagger: 0.1, ease: 'power3.inOut' })
          return () => ScrollTrigger.refresh()
        }

        // the stacked deck: slightly offset, a touch untidy
        cards.forEach((card, i) =>
          gsap.set(card, { x: (i - (n - 1) / 2) * 3, y: -i * 3, rotation: (i % 2 ? 1 : -1) * (1 + i * 0.6), zIndex: i }),
        )
        gsap.set(inners, { rotationY: 0 })

        const tl = gsap.timeline({
          defaults: { ease: 'power2.inOut' },
          scrollTrigger: {
            trigger: '.clubs-deck',
            start: 'top top',
            end: () => `+=${window.innerHeight * 2.6}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        })

        // 1 · the deck rises a little and fans out
        tl.to(
          cards,
          {
            x: (i) => fanPose(i, n, window.innerWidth).x,
            y: (i) => fanPose(i, n, window.innerWidth).y,
            rotation: (i) => fanPose(i, n, window.innerWidth).rotation,
            duration: 1,
            stagger: 0.04,
          },
          0,
        )
          .to('.clubs-deck__title', { yPercent: -18, opacity: 0.18, duration: 1 }, 0)
          .to('.clubs-deck__hint', { opacity: 0, duration: 0.25 }, 0)
          // 2 · each card flips over, one after another
          .to(inners, { rotationY: 180, duration: 0.6, stagger: 0.22, ease: 'power3.inOut' }, 1.05)
          .to(cards, { y: (i) => fanPose(i, n, window.innerWidth).y - 18, duration: 0.6, stagger: 0.22 }, 1.05)
          // 3 · settle, and the line underneath appears
          .to(cards, { y: (i) => fanPose(i, n, window.innerWidth).y, duration: 0.4 }, '>-0.1')
          .fromTo('.clubs-deck__foot', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4 }, '<')

        return () => ScrollTrigger.refresh()
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <div ref={root} className="clubs">
      <section className={`clubs-deck ${motion ? 'is-animated' : 'is-static'}`} aria-labelledby="clubs-title">
        <div className="clubs-deck__title">
          <p className="eyebrow">Factions</p>
          <h1 id="clubs-title" className="clubs-deck__h1">
            Clubs
          </h1>
        </div>

        <ul role="list" className="clubs-deck__table" aria-label="Clubs">
          {deck.map(({ key, club, suit, number }, i) => (
            <li key={key} className={`club-card ${club ? 'is-real' : ''}`} style={{ '--i': i, '--n': deck.length }} data-club-key={key}>
              <div className="club-card__lift">
                <div className="club-card__inner">
                  <div className="club-card__side club-card__side--back" aria-hidden="true">
                    <CardBack />
                  </div>
                  <div className="club-card__side club-card__side--face">
                    <CardFace club={club} suit={suit} number={number} />
                  </div>
                </div>
              </div>
              {club && (
                <button
                  type="button"
                  className="club-card__open"
                  aria-label={`Open ${club.name}`}
                  onClick={(e) => open(key, e.currentTarget.closest('.club-card'))}
                />
              )}
            </li>
          ))}
        </ul>

        <div className="clubs-deck__foot">
          <ApplyLink className="btn btn--primary btn--large">
            Apply now <Arrow />
          </ApplyLink>
        </div>

        {motion && (
          <p className="clubs-deck__hint" aria-hidden="true">
            Scroll to deal
          </p>
        )}
      </section>

      <ClubDetail
        deck={deck}
        openKey={openId}
        getSource={() => source.current}
        onClose={() => {
          // back to where the visitor was, so the browser's back button doesn't reopen it
          if (openedHere.current) navigate(-1)
          else navigate('/clubs', { replace: true, preventScrollReset: true })
          openedHere.current = false
        }}
        onMove={move}
      />
    </div>
  )
}
