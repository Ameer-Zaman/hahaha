import { useEffect, useMemo, useRef, useState } from 'react'

import { useAction, useToast } from '../hooks'
import { adminApi } from '../panelApi'
import { EXAMPLE_JSON, matchGang, MAX_PLAYERS, mergePlayers, parsePlayerJson } from '../playerImport'

const EXAMPLE_HREF = `data:application/json;charset=utf-8,${encodeURIComponent(EXAMPLE_JSON)}`

/** A modal <dialog> that is open while `open` is true (Esc and the backdrop close it). */
function Modal({ open, onClose, labelledBy, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])
  return (
    <dialog ref={ref} className="p-dialog p-dialog--import" onClose={onClose} aria-labelledby={labelledBy}>
      {open && children}
    </dialog>
  )
}

/** Paste box + "choose a .json file", parsed live. */
function JsonSource({ text, setText }) {
  const file = useRef(null)
  const toast = useToast()
  async function load(f) {
    if (!f) return
    if (f.size > 1024 * 1024) return toast('That file is over 1 MB — is it really a player list?', 'error')
    setText(await f.text())
    if (file.current) file.current.value = ''
  }
  return (
    <div className="p-import__source">
      <div className="p-row p-row--between">
        <label className="p-field__label" htmlFor="import-json">
          Paste JSON
        </label>
        <span className="p-row">
          <input ref={file} type="file" accept=".json,application/json,text/plain" className="p-sr-only" tabIndex={-1} onChange={(e) => load(e.target.files[0])} />
          <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => file.current?.click()}>
            Choose .json file
          </button>
          <a className="pbtn pbtn--quiet pbtn--sm" href={EXAMPLE_HREF} download="players-example.json">
            Example file
          </a>
        </span>
      </div>
      <textarea
        id="import-json"
        className="p-input p-input--area p-input--code"
        rows={9}
        spellCheck={false}
        placeholder={EXAMPLE_JSON}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  )
}

function ModePicker({ mode, setMode }) {
  return (
    <fieldset className="p-import__mode">
      <legend className="p-field__label">How</legend>
      <label>
        <input type="radio" name="import-mode" checked={mode === 'append'} onChange={() => setMode('append')} />
        <span>
          <strong>Add to the list</strong> — new names are added, names already listed get their role / since updated
        </span>
      </label>
      <label>
        <input type="radio" name="import-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
        <span>
          <strong>Replace the list</strong> — the imported players become the whole list
        </span>
      </label>
    </fieldset>
  )
}

function usePreview(text) {
  return useMemo(() => {
    if (!text.trim()) return { groups: null, error: null }
    try {
      return { ...parsePlayerJson(text), error: null }
    } catch (err) {
      return { groups: null, error: err.message }
    }
  }, [text])
}

function PlayerSample({ players }) {
  const shown = players.slice(0, 6)
  return (
    <ul className="p-import__sample" role="list">
      {shown.map((p) => (
        <li key={p.name}>
          <span>{p.name}</span>
          <span className="p-muted">
            {p.role}
            {p.since ? ` · ${p.since}` : ''}
          </span>
        </li>
      ))}
      {players.length > shown.length && <li className="p-muted">…and {players.length - shown.length} more</li>}
    </ul>
  )
}

/* ------------------------------------------------- one gang (gang editor) */

/**
 * Imports into the gang being edited. The players land in the form; Save publishes them.
 */
export function GangImportDialog({ open, onClose, gang, members, onImport }) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState('append')
  const preview = usePreview(text)

  // Which group of the file belongs to this gang.
  let players = null
  let problem = preview.error
  if (preview.groups) {
    const own = preview.groups.find((g) => g.gang && matchGang(g.gang, [gang]))
    const unnamed = preview.groups.filter((g) => !g.gang)
    if (own) players = own.players
    else if (preview.groups.length === 1) players = preview.groups[0].players
    else if (unnamed.length === 1) players = unnamed[0].players
    else problem = `This file lists several gangs and none is “${gang.name || 'this gang'}”. Use “Import players” on the Gangs page for multi-gang files.`
  }
  const merged = players ? mergePlayers(members, players, mode) : null
  if (merged && merged.list.length > MAX_PLAYERS) problem = `That would make ${merged.list.length} players — the limit is ${MAX_PLAYERS}.`

  return (
    <Modal open={open} onClose={onClose} labelledBy="gang-import-title">
      <div className="p-dialog__head">
        <h2 id="gang-import-title" className="p-card__title">
          Import players{gang.name ? ` · ${gang.name}` : ''}
        </h2>
        <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={onClose}>
          Close
        </button>
      </div>
      <JsonSource text={text} setText={setText} />
      <ModePicker mode={mode} setMode={setMode} />
      {problem && <p className="p-form-error" role="alert">{problem}</p>}
      {!problem && players && (
        <div className="p-import__preview" role="status">
          <p className="p-text">
            {players.length} players found
            {mode === 'append' ? ` — ${merged.added} new, ${merged.updated} updated` : ` — replaces the current ${members.length}`}.
          </p>
          <PlayerSample players={players} />
        </div>
      )}
      <div className="p-row">
        <button
          type="button"
          className="pbtn pbtn--gold"
          disabled={!players || Boolean(problem)}
          onClick={() => {
            onImport(merged)
            setText('')
          }}
        >
          Import {players ? players.length : ''} players
        </button>
        <span className="p-muted p-import__note">Then press Save to publish them.</span>
      </div>
    </Modal>
  )
}

/* ------------------------------------------- many gangs (Gangs list page) */

/**
 * Imports players into several gangs at once, straight to the server.
 * Each group in the file is matched to a gang by its address or name.
 */
export function BulkImportDialog({ open, onClose, gangs, onDone }) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState('append')
  const [run, busy] = useAction()
  const preview = usePreview(text)

  const rows = (preview.groups ?? []).map((g) => ({ ...g, match: matchGang(g.gang, gangs) }))
  const unmatched = rows.filter((r) => !r.match)
  const ready = rows.length > 0 && unmatched.length === 0
  const total = rows.reduce((n, r) => n + r.players.length, 0)

  async function submit() {
    const body = { mode, gangs: {} }
    for (const r of rows) body.gangs[r.match.slug] = [...(body.gangs[r.match.slug] ?? []), ...r.players]
    const result = await run(() => adminApi.post('/gangs/import-players', body), `Imported ${total} players into ${Object.keys(body.gangs).length} gangs`)
    if (result) {
      setText('')
      onDone(result)
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="bulk-import-title">
      <div className="p-dialog__head">
        <h2 id="bulk-import-title" className="p-card__title">
          Import players into gangs
        </h2>
        <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="p-text">
        Group players by gang — use each gang's address (e.g. <code>harbor-wolves</code>) or its exact name. The gangs must already exist.
      </p>
      <JsonSource text={text} setText={setText} />
      <ModePicker mode={mode} setMode={setMode} />
      {preview.error && <p className="p-form-error" role="alert">{preview.error}</p>}
      {rows.length > 0 && (
        <div className="p-table-wrap">
          <table className="p-table p-table--dense">
            <thead>
              <tr>
                <th scope="col">In the file</th>
                <th scope="col">Gang on the site</th>
                <th scope="col">Players</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={r.match ? '' : 'is-warn'}>
                  <td>{r.gang ?? <span className="p-muted">no gang given</span>}</td>
                  <td>{r.match ? r.match.name : <span className="p-form-error">Not found</span>}</td>
                  <td className="p-num">
                    {r.players.length}
                    {r.duplicates > 0 && <span className="p-muted"> ({r.duplicates} duplicates merged)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {unmatched.length > 0 && (
        <p className="p-form-error">
          {unmatched.some((r) => !r.gang)
            ? 'Some players have no gang. Add a "gang" field, or import them from that gang’s own page.'
            : 'Some gangs weren’t found. Create them first or fix the names.'}
        </p>
      )}
      <div className="p-row">
        <button type="button" className="pbtn pbtn--gold" disabled={!ready || busy} onClick={submit}>
          {busy ? 'Importing…' : `Import ${total || ''} players`}
        </button>
        {preview.skipped > 0 && <span className="p-muted">{preview.skipped} {preview.skipped === 1 ? 'entry' : 'entries'} without a name skipped.</span>}
      </div>
    </Modal>
  )
}
