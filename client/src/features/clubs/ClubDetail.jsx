import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { gsap } from '../../lib/gsap'
import CardFace from './CardFace'

/**
 * A club's card brought up to the screen: the card lifts off the table and flies to the front,
 * growing as it comes, and the club's details slide out beside it (under it on a phone). Closing
 * sends the card back to its place on the table. The arrows (or ← →) move to the next club,
 * turning the card over to the next one.
 *
 * `getSource()` gives the card on the table it came from (none when the page was opened on a
 * club's own address: then it simply rises into view).
 */
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const two = (n) => String(n).padStart(2, '0')
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const tableCard = (key) => document.querySelector(`[data-club-key="${CSS.escape(key)}"]`)
/** Hides the table card that is up on the screen (and shows all the others). */
const hideOnTable = (key) =>
  document.querySelectorAll('[data-club-key]').forEach((c) => (c.style.visibility = key && c.dataset.clubKey === key ? 'hidden' : ''))

/** Where the card on the table is, as a starting (or ending) pose for the big card. */
function poseFrom(source, target) {
  if (!source?.isConnected) return null
  const from = source.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  if (!from.width || !to.width) return null
  // the table card is turned (the fan): its box is bigger than the card, so size it by its own width
  const width = source.offsetWidth || from.width
  const rotation = Number(gsap.getProperty(source, 'rotation')) || 0
  const dx = from.left + from.width / 2 - (to.left + to.width / 2)
  const dy = from.top + from.height / 2 - (to.top + to.height / 2)
  return `translate(${dx}px, ${dy}px) rotate(${rotation}deg) scale(${width / to.width})`
}

export default function ClubDetail({ deck, openKey, getSource, onClose, onMove }) {
  const dialog = useRef(null)
  const card = useRef(null)
  const [closing, setClosing] = useState(false)
  const index = deck.findIndex((d) => d.key === openKey)
  const [kept, setKept] = useState(index) // keeps showing the club while the card flies back
  if (index >= 0 && index !== kept) setKept(index)
  const shown = deck[index >= 0 ? index : kept]
  const opened = useRef(false)
  const lastKey = useRef(null)

  // open: show the dialog, hide the table card it came from, and fly the big card in from it
  useLayoutEffect(() => {
    const el = dialog.current
    if (!el || index < 0 || el.open) return undefined
    setClosing(false)
    el.showModal()
    opened.current = true
    lastKey.current = openKey
    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    hideOnTable(openKey)
    if (!reduced()) {
      const from = poseFrom(getSource?.(), card.current)
      card.current.animate(
        from
          ? [{ transform: from }, { transform: 'translate(0, -4%) rotate(-4deg) scale(1.04)', offset: 0.72 }, { transform: 'none' }]
          : [
              { transform: 'translateY(12%) scale(0.86)', opacity: 0 },
              { transform: 'none', opacity: 1 },
            ],
        { duration: from ? 700 : 520, easing: EASE, fill: 'backwards' },
      )
    }
    return () => {
      document.documentElement.style.overflow = prevOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index >= 0])

  // the arrows: the card turns over to the next club
  useEffect(() => {
    if (index < 0 || !opened.current || lastKey.current === openKey) return
    const dir = deck.findIndex((d) => d.key === lastKey.current) < index ? 1 : -1
    lastKey.current = openKey
    hideOnTable(openKey)
    if (!reduced())
      card.current?.animate([{ transform: `rotateY(${dir * -90}deg) scale(0.96)` }, { transform: 'none' }], {
        duration: 420,
        easing: EASE,
      })
  }, [openKey, index, deck])

  // closing: the card flies back to its place on the table, then the dialog goes. With the
  // close button / Escape / a click outside, the address goes back to /clubs afterwards; with
  // the browser's back button the address has already changed, so it only plays the flight.
  function dismiss(fromRoute = false) {
    if (closing || !dialog.current?.open) return
    const finish = () => {
      dialog.current?.close()
      hideOnTable(null)
      opened.current = false
      setClosing(false)
      if (!fromRoute) onClose()
    }
    if (reduced()) return finish()
    setClosing(true)
    const to = poseFrom(tableCard(shown.key), card.current)
    const flight = card.current.animate(
      to
        ? [{ transform: 'none' }, { transform: to }]
        : [
            { transform: 'none', opacity: 1 },
            { transform: 'translateY(10%) scale(0.86)', opacity: 0 },
          ],
      { duration: to ? 520 : 260, easing: 'cubic-bezier(0.55, 0, 0.25, 1)', fill: 'forwards' },
    )
    flight.onfinish = finish
  }
  const close = () => dismiss(false)

  // the address left the club (the browser's back button): put the card back
  useEffect(() => {
    if (index < 0 && opened.current) dismiss(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // ← → move between clubs while one is open
  useEffect(() => {
    if (index < 0) return undefined
    const onKey = (e) => {
      if (e.key === 'ArrowRight') onMove(1)
      if (e.key === 'ArrowLeft') onMove(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, onMove])

  const club = shown?.club
  const real = deck.filter((d) => d.club)
  const pos = real.findIndex((d) => d.key === shown?.key)

  return (
    <dialog
      ref={dialog}
      className={`club-detail ${closing ? 'is-closing' : ''}`}
      aria-labelledby="club-detail-name"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === dialog.current || e.target.classList.contains('club-detail__stage')) close()
      }}
    >
      {shown && club && (
        <div className="club-detail__stage">
          <div className="club-detail__card" ref={card}>
            <div className="club-detail__face">
              <CardFace club={club} suit={shown.suit} number={shown.number} />
            </div>
          </div>

          <div className="club-detail__info" key={shown.key}>
            <p className="club-detail__eyebrow">
              <span className={shown.suit.red ? 'is-red' : ''}>{shown.suit.glyph}</span>
              Card {two(shown.number)} · {shown.suit.label}
            </p>
            <p className="club-detail__type">{club.type || 'Club'}</p>
            <h2 id="club-detail-name" className="club-detail__name">
              {club.name}
            </h2>
            {(club.owner || club.location) && (
              <dl className="club-detail__facts">
                {club.owner && (
                  <div>
                    <dt>Owner</dt>
                    <dd>{club.owner}</dd>
                  </div>
                )}
                {club.location && (
                  <div>
                    <dt>Location</dt>
                    <dd>{club.location}</dd>
                  </div>
                )}
              </dl>
            )}
            {club.description ? (
              <p className="club-detail__about">{club.description}</p>
            ) : (
              <p className="club-detail__about is-empty">More about this club will be added soon.</p>
            )}

            <div className="club-detail__nav">
              {real.length > 1 && (
                <>
                  <button type="button" className="club-detail__step" onClick={() => onMove(-1)} aria-label="Previous club">
                    ←
                  </button>
                  <span className="club-detail__count">
                    {two(pos + 1)} / {two(real.length)}
                  </span>
                  <button type="button" className="club-detail__step" onClick={() => onMove(1)} aria-label="Next club">
                    →
                  </button>
                </>
              )}
              <button type="button" className="btn btn--ghost club-detail__back" onClick={close}>
                Back to the table
              </button>
            </div>
          </div>

          <button type="button" className="club-detail__close" onClick={close} aria-label="Close">
            ×
          </button>
        </div>
      )}
    </dialog>
  )
}
