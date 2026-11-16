import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { move, slugify } from '../format'
import { useAction, useResource } from '../hooks'
import { MediaField, MediaPicker, Thumb } from '../mediaKit'
import { adminApi } from '../panelApi'
import { ConfirmButton, Empty, ErrorNote, ListTable, Loading, PageHead, Panel, TextField } from '../ui'
import { RowTools } from './Gangs'

const CREW_MAX = 10
const FIGHTS_MAX = 60
const RESULTS = [
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
  { value: 'draw', label: 'Draw' },
]
const today = () => new Date().toISOString().slice(0, 10)
const coins = new Intl.NumberFormat('en-IN')

/* ------------------------------------------------------------------ list */

/**
 * Panel → Dhadhas: every Dhadha on the Dhadhas page, one card each, in this order. Each has a
 * crew of up to 10 players with a rank position, coins and fight history.
 */
export function DhadhaList() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/dhadhas'))
  const list = data?.dhadhas

  return (
    <>
      <PageHead title="Dhadhas" sub="Every Dhadha on the Dhadhas page, one card each, in this order.">
        <Link to="/panel/dhadhas/new" className="pbtn pbtn--gold">
          New Dhadha
        </Link>
      </PageHead>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !list && <Loading />}
      {list?.length === 0 && <Empty>No Dhadhas yet. Until you add one, the Dhadhas page says they’re coming soon.</Empty>}
      {list?.length > 0 && (
        <div className="p-table-wrap">
          <ListTable>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Dhadha</th>
                <th scope="col">Crew</th>
                <th scope="col">Coins</th>
                <th scope="col">
                  <span className="p-sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d._id}>
                  <td className="p-num">{d.order}</td>
                  <td>
                    <span className="p-cell-media">
                      <Thumb id={d.photo} />
                      <strong>{d.name}</strong>
                    </span>
                  </td>
                  <td>
                    {d.members.length}/{CREW_MAX}
                  </td>
                  <td>{coins.format(d.members.reduce((sum, m) => sum + (m.coins || 0), 0))}</td>
                  <td className="p-actions-cell">
                    <Link to={`/panel/dhadhas/${d._id}`} className="pbtn pbtn--ghost pbtn--sm">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </ListTable>
        </div>
      )}
    </>
  )
}

/* ---------------------------------------------------------------- editor */

const EMPTY = { name: '', slug: '', title: '', line: '', photo: null, order: 0, members: [] }

export function DhadhaEditor() {
  const { id } = useParams()
  const isNew = id === 'new'
  const { data, error, loading, reload } = useResource(
    () => (isNew ? Promise.resolve({ dhadha: EMPTY }) : adminApi.get(`/dhadhas/${id}`)),
    [id],
  )
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <DhadhaForm key={id} initial={data.dhadha} isNew={isNew} />
}

function pick(d) {
  const out = {}
  for (const key of Object.keys(EMPTY)) out[key] = d[key] ?? EMPTY[key]
  out.members = (d.members ?? []).map((m) => ({
    name: m.name ?? '',
    photo: m.photo ?? null,
    rank: Number.isInteger(m.rank) ? m.rank : null,
    coins: m.coins ?? 0,
    fights: (m.fights ?? []).map((f) => ({
      date: f.date ?? '',
      opponent: f.opponent ?? '',
      result: f.result ?? 'win',
      note: f.note ?? '',
    })),
  }))
  return out
}

function DhadhaForm({ initial, isNew }) {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(() => pick(initial))
  const [form, setForm] = useState(() => pick(initial))
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [open, setOpen] = useState(null) // which player's fights are unfolded
  const [run, busy] = useAction()
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const setName = (name) => setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }))
  const setMembers = (members) => setForm((f) => ({ ...f, members }))
  const updateMember = (i, change) => setMembers(form.members.map((m, j) => (j === i ? { ...m, ...change } : m)))

  async function save(e) {
    e.preventDefault()
    const body = { ...form, order: Number(form.order) || 0 }
    const result = await run(
      () => (isNew ? adminApi.post('/dhadhas', body) : adminApi.put(`/dhadhas/${initial._id}`, body)),
      isNew ? 'Dhadha created' : 'Dhadha saved',
    )
    if (result) {
      if (isNew) navigate(`/panel/dhadhas/${result.dhadha._id}`, { replace: true })
      else {
        setSaved(pick(result.dhadha))
        setForm(pick(result.dhadha))
      }
    }
  }

  async function remove() {
    const result = await run(() => adminApi.del(`/dhadhas/${initial._id}`), 'Dhadha deleted')
    if (result) navigate('/panel/dhadhas')
  }

  return (
    <form onSubmit={save}>
      <PageHead
        title={isNew ? 'New Dhadha' : form.name || 'Dhadha'}
        sub={
          <>
            <Link to="/panel/dhadhas" className="p-link">
              ← All Dhadhas
            </Link>
            {dirty && !isNew && ' · changes not saved yet'}
          </>
        }
      >
        {!isNew && (
          <a className="pbtn pbtn--ghost" href={`/dhadhas/${saved.slug}`} target="_blank" rel="noreferrer">
            View on site
          </a>
        )}
        <button type="submit" className="pbtn pbtn--gold" disabled={busy || !form.name.trim() || !form.slug || (!isNew && !dirty)}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </PageHead>

      <div className="p-grid-2 p-grid-2--wide-left">
        <Panel title="The Dhadha" sub="His card on the Dhadhas page. Opening the card shows his crew.">
          <div className="p-form-grid">
            <TextField label="Name" value={form.name} onChange={setName} required maxLength={40} placeholder="His in-game name" />
            <TextField
              label="Short name"
              hint="Used in his page address (letters, numbers and dashes)."
              value={form.slug}
              onChange={(v) => {
                setSlugTouched(true)
                set('slug')(slugify(v))
              }}
              required
              maxLength={60}
            />
            <TextField label="Title" hint="Optional. Empty = “Dhadha”." value={form.title} onChange={set('title')} maxLength={40} />
            <TextField
              label="Order"
              hint="Lower numbers come first."
              type="number"
              min={0}
              max={9999}
              value={form.order}
              onChange={set('order')}
            />
            <TextField label="Line" hint="Optional, up to 160 characters." value={form.line} onChange={set('line')} maxLength={160} wide />
          </div>
        </Panel>
        <Panel title="Photo">
          <MediaField
            label="Photo"
            value={form.photo}
            onChange={set('photo')}
            fallback="A tall picture (portrait) looks best on the card."
          />
        </Panel>
      </div>

      <Panel
        title={`The crew · ${form.members.length}/${CREW_MAX}`}
        sub="On the page the crew is listed by rank position (1 first); players without one come after, in this order."
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

      {!isNew && (
        <Panel title="Delete Dhadha" className="p-card--danger">
          <p className="p-text">Removes his card and his crew from the Dhadhas page. This can't be undone.</p>
          <ConfirmButton onConfirm={remove} disabled={busy}>
            Delete {initial.name}
          </ConfirmButton>
        </Panel>
      )}
    </form>
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
