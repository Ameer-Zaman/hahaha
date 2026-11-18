import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { formatDay, move, slugify } from '../format'
import { useAction, useResource } from '../hooks'
import { MediaField, Thumb } from '../mediaKit'
import { adminApi } from '../panelApi'
import { ConfirmButton, Empty, ErrorNote, ListTable, Loading, PageHead, Panel, SelectField, TextField } from '../ui'
import { RowTools } from './Gangs'

const CHANGES_MAX = 80
const KINDS = [
  { value: 'new', label: 'New' },
  { value: 'changed', label: 'Changed' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'removed', label: 'Removed' },
]
const STATUSES = [
  { value: 'draft', label: 'Draft (team only)' },
  { value: 'published', label: 'Published' },
]
const today = () => new Date().toISOString().slice(0, 10)
const dayOf = (value) => (value ? new Date(value).toISOString().slice(0, 10) : today())

/** Where an update stands, in a word, for the list. */
function stateOf(u) {
  if (u.status !== 'published') return { label: 'Draft', tone: 'muted' }
  if (new Date(u.date) > new Date()) return { label: 'Scheduled', tone: 'gold' }
  return { label: 'Live', tone: 'ok' }
}

/* ------------------------------------------------------------------ list */

/** Panel → City updates: the city's patch notes, newest first. */
export function UpdateList() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/updates'))
  const list = data?.updates

  return (
    <>
      <PageHead title="City updates" sub="Patch notes for the Updates page: what’s new in the city and what changed. Newest first.">
        <Link to="/panel/updates/new" className="pbtn pbtn--gold">
          New update
        </Link>
      </PageHead>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !list && <Loading />}
      {list?.length === 0 && <Empty>No updates yet. Until you publish one, the Updates page says none have been posted.</Empty>}
      {list?.length > 0 && (
        <div className="p-table-wrap">
          <ListTable>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Update</th>
                <th scope="col">Changes</th>
                <th scope="col">State</th>
                <th scope="col">
                  <span className="p-sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => {
                const state = stateOf(u)
                return (
                  <tr key={u._id}>
                    <td className="p-num">{formatDay(u.date)}</td>
                    <td>
                      <span className="p-cell-media">
                        {u.image && <Thumb id={u.image} />}
                        <strong>{u.title}</strong>
                        {u.version && <span className="p-muted"> · {u.version}</span>}
                      </span>
                    </td>
                    <td>{u.changes.length}</td>
                    <td>
                      <span className={`p-up-state p-up-state--${state.tone}`}>{state.label}</span>
                    </td>
                    <td className="p-actions-cell">
                      <Link to={`/panel/updates/${u._id}`} className="pbtn pbtn--ghost pbtn--sm">
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </ListTable>
        </div>
      )}
    </>
  )
}

/* ---------------------------------------------------------------- editor */

const EMPTY = { title: '', slug: '', version: '', status: 'draft', date: '', summary: '', image: null, changes: [], notes: '' }

export function UpdateEditor() {
  const { id } = useParams()
  const isNew = id === 'new'
  const { data, error, loading, reload } = useResource(
    () => (isNew ? Promise.resolve({ update: { ...EMPTY, date: today() } }) : adminApi.get(`/updates/${id}`)),
    [id],
  )
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <UpdateForm key={id} initial={data.update} isNew={isNew} />
}

function pick(u) {
  const out = {}
  for (const key of Object.keys(EMPTY)) out[key] = u[key] ?? EMPTY[key]
  out.date = dayOf(u.date)
  out.changes = (u.changes ?? []).map((c) => ({ kind: c.kind ?? 'new', text: c.text ?? '' }))
  return out
}

function UpdateForm({ initial, isNew }) {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(() => pick(initial))
  const [form, setForm] = useState(() => pick(initial))
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [paste, setPaste] = useState({ kind: 'new', text: '' })
  const [run, busy] = useAction()
  const [now] = useState(today) // today's day, fixed while the form is open
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const setTitle = (title) => setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }))
  const setChanges = (changes) => setForm((f) => ({ ...f, changes }))
  const setChange = (i, change) => setChanges(form.changes.map((c, j) => (j === i ? { ...c, ...change } : c)))
  const room = CHANGES_MAX - form.changes.length

  // several lines at once: one change per line, bullets and dashes at the start dropped
  const pasted = paste.text
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•–]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .map((text) => text.slice(0, 200))
  function addPasted() {
    setChanges([...form.changes, ...pasted.slice(0, room).map((text) => ({ kind: paste.kind, text }))])
    setPaste({ ...paste, text: '' })
  }

  async function save(e) {
    e.preventDefault()
    const body = { ...form, changes: form.changes.filter((c) => c.text.trim()) }
    const result = await run(
      () => (isNew ? adminApi.post('/updates', body) : adminApi.put(`/updates/${initial._id}`, body)),
      isNew ? 'Update created' : 'Update saved',
    )
    if (result) {
      if (isNew) navigate(`/panel/updates/${result.update._id}`, { replace: true })
      else {
        setSaved(pick(result.update))
        setForm(pick(result.update))
      }
    }
  }

  async function remove() {
    const result = await run(() => adminApi.del(`/updates/${initial._id}`), 'Update deleted')
    if (result) navigate('/panel/updates')
  }

  const live = saved.status === 'published' && saved.date <= now

  return (
    <form onSubmit={save}>
      <PageHead
        title={isNew ? 'New update' : form.title || 'Update'}
        sub={
          <>
            <Link to="/panel/updates" className="p-link">
              ← All updates
            </Link>
            {dirty && !isNew && ' · changes not saved yet'}
          </>
        }
      >
        {!isNew && live && (
          <a className="pbtn pbtn--ghost" href={`/updates/${saved.slug}`} target="_blank" rel="noreferrer">
            View on site
          </a>
        )}
        <button
          type="submit"
          className="pbtn pbtn--gold"
          disabled={busy || !form.title.trim() || !form.slug || !form.date || (!isNew && !dirty)}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </PageHead>

      <div className="p-grid-2 p-grid-2--wide-left">
        <Panel title="The update" sub="How it reads at the top of its entry on the Updates page.">
          <div className="p-form-grid">
            <TextField
              label="Title"
              value={form.title}
              onChange={setTitle}
              required
              maxLength={100}
              placeholder="e.g. Winter update"
              wide
            />
            <TextField
              label="Short name"
              hint="Used in its page address (letters, numbers and dashes)."
              value={form.slug}
              onChange={(v) => {
                setSlugTouched(true)
                set('slug')(slugify(v))
              }}
              required
              maxLength={60}
            />
            <TextField label="Version" hint="Optional, e.g. v2.4." value={form.version} onChange={set('version')} maxLength={20} />
            <TextField
              label="Day"
              hint="When it went (or goes) live in the city."
              type="date"
              value={form.date}
              onChange={set('date')}
              required
            />
            <SelectField
              label="Status"
              hint="Published updates show on the page from their day."
              value={form.status}
              onChange={set('status')}
              options={STATUSES}
            />
            <TextField
              label="Summary"
              hint="Optional, up to 240 characters — the line under the title."
              value={form.summary}
              onChange={set('summary')}
              maxLength={240}
              multiline
              rows={2}
            />
          </div>
          {form.status === 'published' && form.date > now && (
            <p className="p-note">Scheduled: it appears on the Updates page on {formatDay(form.date)}.</p>
          )}
        </Panel>
        <Panel title="Picture">
          <MediaField label="Picture" value={form.image} onChange={set('image')} fallback="Optional. A wide (16:9) picture looks best." />
        </Panel>
      </div>

      <Panel
        title={`Changes · ${form.changes.length}/${CHANGES_MAX}`}
        sub="Each line is tagged New, Changed, Fixed or Removed on the page, in this order."
      >
        {form.changes.length === 0 && <Empty>No changes yet. Add them one by one, or paste a list below.</Empty>}
        <ol role="list" className="p-up-changes">
          {form.changes.map((c, i) => (
            <li key={i} className="p-up-change">
              <select
                className={`p-input p-select p-up-kind p-up-kind--${c.kind}`}
                aria-label={`Change ${i + 1} kind`}
                value={c.kind}
                onChange={(e) => setChange(i, { kind: e.target.value })}
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
              <input
                className="p-input"
                aria-label={`Change ${i + 1}`}
                placeholder="What changed"
                value={c.text}
                maxLength={200}
                onChange={(e) => setChange(i, { text: e.target.value })}
              />
              <RowTools
                index={i}
                count={form.changes.length}
                label={`change ${i + 1}`}
                onMove={(d) => setChanges(move(form.changes, i, d))}
                onRemove={() => setChanges(form.changes.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="pbtn pbtn--ghost"
          disabled={room <= 0}
          onClick={() => setChanges([...form.changes, { kind: form.changes.at(-1)?.kind ?? 'new', text: '' }])}
        >
          {room <= 0 ? `Full (${CHANGES_MAX})` : 'Add a change'}
        </button>

        <details className="p-up-paste">
          <summary>Paste a list</summary>
          <p className="p-text">One change per line; bullets and numbers at the start are dropped. They’re added with the tag you pick.</p>
          <div className="p-up-paste__row">
            <SelectField label="Tag" value={paste.kind} onChange={(kind) => setPaste({ ...paste, kind })} options={KINDS} />
            <TextField
              label="Lines"
              value={paste.text}
              onChange={(text) => setPaste({ ...paste, text })}
              multiline
              rows={5}
              placeholder={'New garage at the pier\nPolice cars handle better\nFixed doors at the bank'}
            />
          </div>
          <button type="button" className="pbtn pbtn--ghost pbtn--sm" disabled={!pasted.length || room <= 0} onClick={addPasted}>
            {pasted.length ? `Add ${Math.min(pasted.length, room)} ${Math.min(pasted.length, room) === 1 ? 'change' : 'changes'}` : 'Add'}
          </button>
        </details>
      </Panel>

      <Panel title="Note from the team" sub="Optional. Shown under the changes. Leave a blank line between paragraphs.">
        <TextField label="Note" value={form.notes} onChange={set('notes')} maxLength={4000} multiline rows={5} />
      </Panel>

      {!isNew && (
        <Panel title="Delete update" className="p-card--danger">
          <p className="p-text">Removes it from the Updates page. This can't be undone.</p>
          <ConfirmButton onConfirm={remove} disabled={busy}>
            Delete {initial.title}
          </ConfirmButton>
        </Panel>
      )}
    </form>
  )
}
