import { useState } from 'react'

import { move } from '../format'
import { useAction, useResource } from '../hooks'
import { MediaField, MediaPicker, Thumb } from '../mediaKit'
import { adminApi } from '../panelApi'
import { Empty, ErrorNote, Loading, PageHead, Panel, TextField } from '../ui'
import { RowTools } from './Gangs'

const CREW_MAX = 10
const FIGHTS_MAX = 60
const RESULTS = [
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
  { value: 'draw', label: 'Draw' },
]
const today = () => new Date().toISOString().slice(0, 10)

/**
 * Panel → Dhadhas: the Dhadha (the crew's leader) and his crew of up to 10 players. On the
 * website the Dhadha is a card; opening it shows every player with their rank position, coins
 * and fight history. Nothing changes on the website until you press Save.
 */
export default function Dhadhas() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/dhadhas'))
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <DhadhasEditor initial={data} />
}

function DhadhasEditor({ initial }) {
  const [saved, setSaved] = useState(initial)
  const [form, setForm] = useState(initial)
  const [open, setOpen] = useState(null) // which player's details are unfolded
  const [run, busy] = useAction()
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const setLeader = (key) => (value) => setForm((f) => ({ ...f, leader: { ...f.leader, [key]: value } }))
  const setMembers = (members) => setForm((f) => ({ ...f, members }))
  const updateMember = (i, change) => setMembers(form.members.map((m, j) => (j === i ? { ...m, ...change } : m)))

  async function save() {
    const result = await run(() => adminApi.put('/dhadhas', form), 'Dhadhas saved')
    if (result) {
      setSaved(result)
      setForm(result)
    }
  }

  return (
    <>
      <PageHead
        title="Dhadhas"
        sub={`The Dhadha and his crew · ${form.members.length}/${CREW_MAX} players${dirty ? ' · changes not saved yet' : ''}`}
      >
        <a className="pbtn pbtn--ghost" href="/dhadhas" target="_blank" rel="noreferrer">
          View page
        </a>
        <button type="button" className="pbtn pbtn--gold" onClick={save} disabled={busy || !dirty}>
          Save
        </button>
      </PageHead>

      <Panel title="The Dhadha" sub="The crew's leader. He is the big card on the page; opening the card shows his crew.">
        <div className="p-grid-2 p-grid-2--wide-left">
          <div className="p-form-grid">
            <TextField label="Name" value={form.leader.name} onChange={setLeader('name')} maxLength={40} placeholder="His in-game name" />
            <TextField
              label="Title"
              hint="A word or two under the name. Empty = “The Dhadha”."
              value={form.leader.title}
              onChange={setLeader('title')}
              maxLength={40}
            />
            <TextField
              label="Line"
              hint="Optional, up to 160 characters."
              value={form.leader.line}
              onChange={setLeader('line')}
              maxLength={160}
              wide
            />
          </div>
          <MediaField
            label="Photo"
            value={form.leader.photo}
            onChange={setLeader('photo')}
            hint="A tall picture (portrait) looks best on the card."
          />
        </div>
      </Panel>

      <Panel
        title="The crew"
        sub={`Up to ${CREW_MAX} players. On the page they're listed by rank position (1 first); players without one come after, in this order.`}
      >
        {form.members.length === 0 && <Empty>No players yet.</Empty>}
        <ol role="list" className="p-dh-crew">
          {form.members.map((m, i) => (
            <Player
              key={i}
              member={m}
              index={i}
              count={form.members.length}
              open={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
              onChange={(change) => updateMember(i, change)}
              onMove={(d) => {
                setMembers(move(form.members, i, d))
                setOpen(null)
              }}
              onRemove={() => {
                setMembers(form.members.filter((_, j) => j !== i))
                setOpen(null)
              }}
            />
          ))}
        </ol>
        <button
          type="button"
          className="pbtn pbtn--ghost p-dh-add"
          disabled={form.members.length >= CREW_MAX}
          onClick={() => {
            setMembers([...form.members, { name: '', photo: null, rank: null, coins: 0, fights: [] }])
            setOpen(form.members.length)
          }}
        >
          {form.members.length >= CREW_MAX ? `The crew is full (${CREW_MAX})` : 'Add a player'}
        </button>
      </Panel>
    </>
  )
}

function Player({ member: m, index: i, count, open, onToggle, onChange, onMove, onRemove }) {
  const [picking, setPicking] = useState(false)
  const label = m.name || `player ${i + 1}`
  const wins = m.fights.filter((f) => f.result === 'win').length
  const losses = m.fights.filter((f) => f.result === 'loss').length
  const setFight = (k, change) => onChange({ fights: m.fights.map((f, j) => (j === k ? { ...f, ...change } : f)) })
  const num = (value) => (value === '' ? null : Math.max(0, Math.floor(Number(value))))

  return (
    <li className={`p-dh-player ${open ? 'is-open' : ''}`}>
      <div className="p-dh-player__head">
        <button
          type="button"
          className="p-dh-photo"
          onClick={() => setPicking(true)}
          aria-label={`${m.photo ? 'Change' : 'Choose'} ${label}'s photo`}
        >
          {m.photo ? <Thumb id={m.photo} alt="" className="p-dh-photo__img" /> : <span>Photo</span>}
        </button>
        <div className="p-dh-player__fields">
          <input
            className="p-input"
            aria-label={`Player ${i + 1} name`}
            placeholder="Name"
            value={m.name}
            maxLength={40}
            onChange={(e) => onChange({ name: e.target.value })}
          />
          <div className="p-dh-nums">
            <label className="p-dh-num">
              <span>Rank position</span>
              <input
                className="p-input"
                type="number"
                inputMode="numeric"
                min="1"
                max="9999"
                placeholder="—"
                value={m.rank ?? ''}
                onChange={(e) => onChange({ rank: e.target.value === '' ? null : Math.max(1, num(e.target.value) || 1) })}
              />
            </label>
            <label className="p-dh-num">
              <span>Coins</span>
              <input
                className="p-input"
                type="number"
                inputMode="numeric"
                min="0"
                value={m.coins}
                onChange={(e) => onChange({ coins: num(e.target.value) ?? 0 })}
              />
            </label>
            <button type="button" className="pbtn pbtn--ghost pbtn--sm p-dh-fights-btn" onClick={onToggle} aria-expanded={open}>
              Fights · {wins}W {losses}L{open ? ' ▲' : ' ▼'}
            </button>
          </div>
        </div>
        <RowTools index={i} count={count} label={label} onMove={onMove} onRemove={onRemove} />
      </div>

      {open && (
        <div className="p-dh-fights">
          <div className="p-dh-fights__top">
            <strong>Fight history</strong>
            <span className="p-dh-fights__hint">Newest first on the page. Up to {FIGHTS_MAX}.</span>
            {m.photo && (
              <button type="button" className="pbtn pbtn--quiet pbtn--sm" onClick={() => onChange({ photo: null })}>
                Remove photo
              </button>
            )}
          </div>
          {m.fights.length === 0 && <Empty>No fights recorded yet.</Empty>}
          <ul role="list" className="p-dh-fights__list">
            {m.fights.map((f, k) => (
              <li key={k} className="p-dh-fight">
                <input
                  className="p-input"
                  type="date"
                  aria-label={`Fight ${k + 1} date`}
                  value={f.date}
                  onChange={(e) => setFight(k, { date: e.target.value })}
                />
                <input
                  className="p-input"
                  aria-label={`Fight ${k + 1} opponent`}
                  placeholder="Against (player or crew)"
                  value={f.opponent}
                  maxLength={60}
                  onChange={(e) => setFight(k, { opponent: e.target.value })}
                />
                <select
                  className={`p-input p-select p-dh-result p-dh-result--${f.result}`}
                  aria-label={`Fight ${k + 1} result`}
                  value={f.result}
                  onChange={(e) => setFight(k, { result: e.target.value })}
                >
                  {RESULTS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <input
                  className="p-input"
                  aria-label={`Fight ${k + 1} note`}
                  placeholder="Note (optional), e.g. 1v1 at the docks"
                  value={f.note}
                  maxLength={120}
                  onChange={(e) => setFight(k, { note: e.target.value })}
                />
                <button
                  type="button"
                  className="p-icon-btn p-icon-btn--danger"
                  aria-label={`Remove fight ${k + 1}`}
                  onClick={() => onChange({ fights: m.fights.filter((_, j) => j !== k) })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="pbtn pbtn--ghost pbtn--sm"
            disabled={m.fights.length >= FIGHTS_MAX}
            onClick={() => onChange({ fights: [{ date: today(), opponent: '', result: 'win', note: '' }, ...m.fights] })}
          >
            Add a fight
          </button>
        </div>
      )}

      <MediaPicker
        open={picking}
        kind="image"
        onClose={() => setPicking(false)}
        onPick={(file) => {
          onChange({ photo: file.id })
          setPicking(false)
        }}
      />
    </li>
  )
}
