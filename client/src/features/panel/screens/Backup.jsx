import { useRef, useState } from 'react'

import { formatWhen } from '../format'
import { useAction, useResource } from '../hooks'
import { adminApi } from '../panelApi'
import { ErrorNote, Loading, PageHead, Panel, TextField } from '../ui'

/**
 * Download everything as one file, and put it back if an edit goes wrong.
 *
 * A restore replaces each part wholesale rather than merging, because the point is to get
 * back to exactly how things were. The panel shows what would change first, and the copy
 * taken just before is offered as a way back.
 */
export default function Backup() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/backup'))
  const [run, busy] = useAction()
  const [file, setFile] = useState(null) // the chosen backup, read in the browser
  const [preview, setPreview] = useState(null)
  const [confirm, setConfirm] = useState('')
  const [rollback, setRollback] = useState(null)
  const input = useRef(null)

  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />

  async function download() {
    await run(async () => {
      const res = await fetch('/api/admin/backup/download', { credentials: 'same-origin' })
      if (!res.ok) throw new Error('The backup could not be made.')
      save(await res.blob(), fileNameFrom(res) ?? 'rameirah-backup.json')
    }, 'Backup downloaded')
  }

  async function choose(e) {
    const picked = e.target.files?.[0]
    setPreview(null)
    setConfirm('')
    setFile(null)
    if (!picked) return
    let parsed
    try {
      parsed = JSON.parse(await picked.text())
    } catch {
      await run(() => Promise.reject(new Error('That file is not readable — pick the .json file you downloaded.')))
      return
    }
    const res = await run(() => adminApi.post('/backup/preview', { backup: parsed }))
    if (res) {
      setFile(parsed)
      setPreview(res)
    }
  }

  async function restore() {
    const res = await run(
      () => adminApi.post('/backup/restore', { backup: file, confirm }),
      'Restored — the website is back to how the backup had it',
    )
    if (res) {
      setRollback(res.rollback)
      setFile(null)
      setPreview(null)
      setConfirm('')
      if (input.current) input.current.value = ''
      reload()
    }
  }

  const labels = data.labels ?? {}
  return (
    <>
      <PageHead
        title="Backup"
        sub="A copy of everything the team has written. Worth taking before a big change, and before launch."
      />

      <Panel title="Download a backup">
        <p className="p-note">
          One file with the gangs, wars, clubs, staff, announcements, rules, the leaderboard and the site settings in it.
          Accounts, the audit log and chat threads are deliberately left out — they are the record of who did what, and
          putting an old copy back would quietly undo a staff change. Pictures and videos stay in the media library; the
          backup refers to them, so restoring next to the same library puts every picture back in place.
        </p>
        <ul className="p-counts">
          {Object.entries(data.counts).map(([key, n]) => (
            <li key={key}>
              <span className="p-counts__n">{n}</span>
              <span className="p-counts__label">{labels[key] ?? key}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="pbtn pbtn--gold" onClick={download} disabled={busy}>
          Download backup
        </button>
      </Panel>

      <Panel title="Put a backup back" sub="Choose a file you downloaded earlier. Nothing changes until you confirm.">
        <input ref={input} type="file" accept="application/json,.json" className="p-file" onChange={choose} disabled={busy} />

        {preview && (
          <div className="p-restore">
            <p className="p-note">
              Taken {preview.takenAt ? formatWhen(preview.takenAt) : 'at an unknown time'}
              {preview.takenBy ? ` by ${preview.takenBy}` : ''}. Restoring replaces each part below with what the file holds —
              anything added since is removed.
            </p>
            <table className="p-table">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Now</th>
                  <th>After restoring</th>
                </tr>
              </thead>
              <tbody>
                {preview.parts.map((p) => (
                  <tr key={p.key}>
                    <td>{p.label}</td>
                    <td>{p.now}</td>
                    <td className={p.after < p.now ? 'p-warn' : undefined}>
                      {p.after}
                      {p.after < p.now && <span className="p-muted"> ({p.now - p.after} removed)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <TextField
              label="Type RESTORE to confirm"
              hint="This replaces what is on the website now."
              value={confirm}
              onChange={setConfirm}
              placeholder="RESTORE"
              wide
            />
            <div className="p-row">
              <button type="button" className="pbtn pbtn--danger" onClick={restore} disabled={busy || confirm !== 'RESTORE'}>
                Restore this backup
              </button>
              <button
                type="button"
                className="pbtn pbtn--ghost"
                disabled={busy}
                onClick={() => {
                  setFile(null)
                  setPreview(null)
                  setConfirm('')
                  if (input.current) input.current.value = ''
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Panel>

      {rollback && (
        <Panel title="The way back">
          <p className="p-note">
            This is how the website was a moment before that restore. Save it: if the restore was a mistake, this file puts
            everything back as it was.
          </p>
          <button
            type="button"
            className="pbtn pbtn--gold"
            onClick={() => save(new Blob([JSON.stringify(rollback, null, 2)], { type: 'application/json' }), 'rameirah-before-restore.json')}
          >
            Download the copy from before
          </button>
        </Panel>
      )}
    </>
  )
}

function fileNameFrom(res) {
  const header = res.headers.get('content-disposition') ?? ''
  return /filename="([^"]+)"/.exec(header)?.[1] ?? null
}

function save(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
