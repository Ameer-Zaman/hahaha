import { useState } from 'react'
import { Link } from 'react-router-dom'

import { formatKd, rankTdm } from '../../leaderboard/ranking'
import { formatWhen } from '../format'
import { useAction, useResource } from '../hooks'
import { adminApi } from '../panelApi'
import { mergeTdm, parseTdm } from '../tdmImport'
import { ConfirmButton, ErrorNote, Loading, PageHead, Panel, TextField } from '../ui'

const STATS = ['kills', 'deaths', 'wins', 'matches']
const MAX = 500
const EXAMPLE = 'name,kills,deaths,wins,matches\nPlayer One,24,9,4,6\nPlayer Two,18,11,3,6'

/**
 * TDM leaderboard: the players and their stats. The website ranks them (kills, then K/D,
 * then wins). The War leaderboard needs nothing here — it comes from Wars.
 */
export default function Tdm() {
  const { data, error, loading, reload, setData } = useResource(() => adminApi.get('/tdm'))
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <TdmForm key={data.updatedAt ?? 'new'} data={data} setData={setData} />
}

function TdmForm({ data, setData }) {
  const [run, busy] = useAction()
  const [season, setSeason] = useState(data.season ?? '')
  const [players, setPlayers] = useState(() => data.players.map((p) => ({ ...p })))
  const [importText, setImportText] = useState('')
  const [importNote, setImportNote] = useState(null)

  const dirty = season !== (data.season ?? '') || JSON.stringify(players) !== JSON.stringify(data.players)
  const names = players.map((p) => p.name.trim().toLowerCase())
  const dupes = new Set(names.filter((n, i) => n && names.indexOf(n) !== i))
  const blanks = players.some((p) => !p.name.trim())
  const ranks = new Map(rankTdm(players).map((r) => [r.name, r.rank]))

  const setField = (index, field, value) =>
    setPlayers((list) =>
      list.map((p, i) => (i === index ? { ...p, [field]: field === 'name' ? value : Math.max(0, Math.min(1_000_000, Math.floor(Number(value) || 0))) } : p)),
    )

  function runImport(mode) {
    try {
      const { players: incoming, skipped } = parseTdm(importText)
      if (incoming.length === 0) {
        setImportNote({ tone: 'error', text: 'No players found. Check the format below.' })
        return
      }
      const next = mode === 'replace' ? incoming : mergeTdm(players, incoming)
      setPlayers(next.slice(0, MAX))
      setImportText('')
      setImportNote({
        tone: 'ok',
        text: `${incoming.length} player${incoming.length === 1 ? '' : 's'} ${mode === 'replace' ? 'loaded' : 'added or updated'}${skipped ? ` · ${skipped} row${skipped === 1 ? '' : 's'} skipped (no name)` : ''}. Press Save to publish.`,
      })
    } catch (err) {
      setImportNote({ tone: 'error', text: err.message })
    }
  }

  async function save() {
    const body = {
      season: season.trim(),
      players: players.map((p) => ({ name: p.name.trim(), kills: p.kills, deaths: p.deaths, wins: p.wins, matches: p.matches })),
    }
    const result = await run(() => adminApi.put('/tdm', body), 'Leaderboard saved')
    if (result) setData(result)
  }

  return (
    <>
      <PageHead
        title="TDM leaderboard"
        sub="Players are ranked on the website by kills, then K/D, then wins. The War leaderboard is worked out from Wars automatically."
      >
        <a className="pbtn pbtn--ghost" href="/leaderboard" target="_blank" rel="noreferrer">
          View on website ↗
        </a>
      </PageHead>

      <Panel
        title={`Players (${players.length})`}
        actions={data.updatedAt && <span className="p-muted">Last saved {formatWhen(data.updatedAt)}</span>}
      >
        <div className="p-form-grid p-form-grid--narrow">
          <TextField label="Season / title" value={season} onChange={setSeason} maxLength={60} placeholder="Season 1" hint="Optional. Shown above the board." />
        </div>

        {players.length === 0 ? (
          <p className="p-text">No players yet. Add them one by one, or paste a list below.</p>
        ) : (
          <div className="p-table-wrap">
            <table className="p-table p-table--dense p-tdm">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Player</th>
                  <th scope="col">Kills</th>
                  <th scope="col">Deaths</th>
                  <th scope="col">K/D</th>
                  <th scope="col">Wins</th>
                  <th scope="col">Matches</th>
                  <th scope="col">
                    <span className="p-sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => {
                  const dupe = dupes.has(p.name.trim().toLowerCase())
                  return (
                    <tr key={i}>
                      <td className="p-num">{ranks.get(p.name) ?? '—'}</td>
                      <td>
                        <input
                          className={`p-input p-input--cell ${dupe || !p.name.trim() ? 'is-invalid' : ''}`}
                          value={p.name}
                          maxLength={60}
                          aria-label={`Player ${i + 1} name`}
                          aria-invalid={dupe || !p.name.trim()}
                          onChange={(e) => setField(i, 'name', e.target.value)}
                        />
                      </td>
                      {STATS.slice(0, 2).map((f) => (
                        <td key={f}>
                          <input className="p-input p-input--cell p-input--num" type="number" min={0} value={p[f]} aria-label={`${p.name || `Player ${i + 1}`} ${f}`} onChange={(e) => setField(i, f, e.target.value)} />
                        </td>
                      ))}
                      <td className="p-num">{formatKd(p.kills, p.deaths)}</td>
                      {STATS.slice(2).map((f) => (
                        <td key={f}>
                          <input className="p-input p-input--cell p-input--num" type="number" min={0} value={p[f]} aria-label={`${p.name || `Player ${i + 1}`} ${f}`} onChange={(e) => setField(i, f, e.target.value)} />
                        </td>
                      ))}
                      <td className="p-actions-cell">
                        <button type="button" className="p-icon-btn p-icon-btn--danger" aria-label={`Remove ${p.name || `player ${i + 1}`}`} onClick={() => setPlayers((list) => list.filter((_, j) => j !== i))}>
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {(dupes.size > 0 || blanks) && (
          <p className="p-form-error" role="alert">
            {dupes.size > 0 ? 'Each player can only be listed once. ' : ''}
            {blanks ? 'Every row needs a player name.' : ''}
          </p>
        )}

        <div className="p-row">
          <button
            type="button"
            className="pbtn pbtn--ghost"
            disabled={players.length >= MAX}
            onClick={() => setPlayers((list) => [...list, { name: '', kills: 0, deaths: 0, wins: 0, matches: 0 }])}
          >
            Add player
          </button>
          {players.length > 1 && (
            <button type="button" className="pbtn pbtn--ghost" onClick={() => setPlayers((list) => rankTdm(list).map(({ name, kills, deaths, wins, matches }) => ({ name, kills, deaths, wins, matches })))}>
              Sort by rank
            </button>
          )}
          <button type="button" className="pbtn pbtn--gold p-push" disabled={busy || !dirty || dupes.size > 0 || blanks} onClick={save}>
            Save
          </button>
          {dirty && (
            <button type="button" className="pbtn pbtn--ghost" onClick={() => { setPlayers(data.players.map((p) => ({ ...p }))); setSeason(data.season ?? '') }}>
              Undo changes
            </button>
          )}
        </div>
      </Panel>

      <Panel title="Paste results">
        <p className="p-text">
          Paste from a spreadsheet (CSV: <code>name, kills, deaths, wins, matches</code>) or JSON. <strong>Add / update</strong> keeps the current
          list and updates players with the same name; <strong>Replace</strong> starts a new board (for example a new season).
        </p>
        <TextField label="Results" value={importText} onChange={(v) => { setImportText(v); setImportNote(null) }} multiline rows={6} placeholder={EXAMPLE} spellCheck={false} />
        {importNote && (
          <p className={importNote.tone === 'error' ? 'p-form-error' : 'p-form-note'} role="status">
            {importNote.text}
          </p>
        )}
        <div className="p-row">
          <button type="button" className="pbtn pbtn--gold" disabled={!importText.trim()} onClick={() => runImport('merge')}>
            Add / update
          </button>
          <ConfirmButton className="pbtn pbtn--ghost" confirmLabel="Click again to replace the list" disabled={!importText.trim()} onConfirm={() => runImport('replace')}>
            Replace list
          </ConfirmButton>
          <button type="button" className="pbtn pbtn--ghost p-push" onClick={() => setImportText(EXAMPLE)}>
            Example
          </button>
        </div>
      </Panel>

      <Panel title="War leaderboard">
        <p className="p-text">
          Worked out from the war records: wins, losses, draws, win rate and recent form for every gang. To change it, log or edit wars in{' '}
          <Link to="/panel/wars" className="p-link">
            Wars
          </Link>
          .
        </p>
      </Panel>
    </>
  )
}
