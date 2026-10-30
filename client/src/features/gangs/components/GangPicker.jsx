import { useEffect, useRef, useState } from 'react'

import Plate from '../../../components/media/Plate'
import { formatFileNumber } from '../gangsModel'

/**
 * "Choose a gang": a dropdown in the corner of the reel listing every gang with its picture.
 * Picking one turns the reel to that gang (the card's Explore button opens its page).
 */
export default function GangPicker({ files, active, onPick }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const current = files[active]

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    // focus the current gang in the list
    requestAnimationFrame(() => listRef.current?.querySelector('[aria-current="true"]')?.focus())
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // ↑ / ↓ move between gangs in the open list
  const onListKey = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    e.stopPropagation()
    const items = [...listRef.current.querySelectorAll('button')]
    const i = items.indexOf(document.activeElement)
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }

  const pick = (i) => {
    setOpen(false)
    onPick(i)
    buttonRef.current?.focus()
  }

  return (
    <div ref={root} className={`gpick ${open ? 'is-open' : ''}`}>
      <button ref={buttonRef} type="button" className="gpick__button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="gpick__label">Choose gang</span>
        <span className="gpick__current">{current?.title}</span>
        <svg className="gpick__chev" viewBox="0 0 12 8" width="12" height="8" aria-hidden="true">
          <path d="M1 1.5 6 6.5l5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul ref={listRef} className="gpick__list" role="list" aria-label="Gangs" onKeyDown={onListKey}>
          {files.map((file, i) => (
            <li key={file.key}>
              <button type="button" className={`gpick__item ${i === active ? 'is-current' : ''}`} aria-current={i === active} onClick={() => pick(i)}>
                <span className="gpick__thumb" aria-hidden="true">
                  <Plate image={file.emblem ?? file.image} seed={file.scene.seed} horizon={file.scene.horizon} />
                </span>
                <span className="gpick__text">
                  <span className="gpick__name">{file.title}</span>
                  <span className="gpick__meta">
                    {formatFileNumber(file.number)} · {file.type}
                    {file.members.length > 0 ? ` · ${file.members.length} players` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
