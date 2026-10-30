import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import Plate from '../../../components/media/Plate'
import { formatFileNumber } from '../gangsModel'

/**
 * "Choose a gang": a drawer hidden off the left edge of the screen. Only a small arrow tab
 * shows; clicking it slides the gang list out. Picking a gang turns the reel to it and
 * slides the drawer back in, so it never covers the gang on screen.
 */
export default function GangPicker({ files, active, onPick }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const tabRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        tabRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    // focus the current gang in the list once the drawer is out
    const t = window.setTimeout(() => listRef.current?.querySelector('[aria-current="true"]')?.focus({ preventScroll: true }), 60)
    return () => {
      window.clearTimeout(t)
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
    tabRef.current?.focus({ preventScroll: true })
  }

  return createPortal(
    <div ref={root} className={`gpick ${open ? 'is-open' : ''}`}>
      <div className="gpick__panel" id="gang-drawer" aria-hidden={!open} inert={!open}>
        <p className="gpick__label">Choose gang</p>
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
      </div>

      <button
        ref={tabRef}
        type="button"
        className="gpick__tab"
        aria-controls="gang-drawer"
        aria-expanded={open}
        aria-label={open ? 'Hide gang list' : 'Choose a gang'}
        onClick={() => setOpen((v) => !v)}
      >
        <svg className="gpick__arrow" viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
          <path d="M2 2l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="gpick__tabtext" aria-hidden="true">Gangs</span>
      </button>
    </div>,
    document.body,
  )
}
