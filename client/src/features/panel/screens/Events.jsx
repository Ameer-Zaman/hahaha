import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { formatWhen, move, slugify } from '../format'
import { MediaField, Thumb } from '../mediaKit'
import { adminApi } from '../panelApi'
import { useAction, useResource } from '../hooks'
import { ConfirmButton, Empty, ErrorNote, ListTable, Loading, PageHead, Panel, SelectField, Switch, TextField } from '../ui'
import { RowTools } from './Gangs'

/** Where an event stands, in words (the server works it out: see models/Event.js). */
const STATE = {
  draft: { label: 'Draft', tone: '' },
  upcoming: { label: 'Coming up', tone: 'p-tag--ok' },
  live: { label: 'On now', tone: 'p-tag--ok' },
  ended: { label: 'Finished', tone: '' },
  cancelled: { label: 'Cancelled', tone: 'p-tag--warn' },
}

const STATUSES = [
  { value: 'draft', label: 'Draft — only the team can see it' },
  { value: 'published', label: 'Published — on the Events page' },
  {
    value: 'cancelled',
    label: 'Cancelled — stays on the page, marked cancelled',
  },
]

/* ------------------------------------------------------------------ list */

export function EventList() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/events'))
  const events = data?.events

  return (
    <>
      <PageHead title="Events" sub="What the server is hosting. Coming up first; finished ones at the end.">
        <Link to="/panel/events/new" className="pbtn pbtn--gold">
          New event
        </Link>
      </PageHead>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !events && <Loading />}
      {events?.length === 0 && <Empty>No events yet. Until you publish one, the Events page says nothing is announced.</Empty>}
      {events?.length > 0 && (
        <div className="p-table-wrap">
          <ListTable>
            <thead>
              <tr>
                <th scope="col">Starts</th>
                <th scope="col">Event</th>
                <th scope="col">Category</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="p-sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const state = STATE[e.state] ?? STATE.draft
                return (
                  <tr key={e._id}>
                    <td className="p-nowrap">{formatWhen(e.startsAt)}</td>
                    <td>
                      <span className="p-cell-media">
                        <Thumb id={e.image} />
                        <strong>{e.title}</strong>
                        {e.featured && <span className="p-tag">Featured</span>}
                      </span>
                    </td>
                    <td>{e.category || '—'}</td>
                    <td>
                      <span className={`p-tag ${state.tone}`}>{state.label}</span>
                    </td>
                    <td className="p-actions-cell">
                      <Link to={`/panel/events/${e._id}`} className="pbtn pbtn--ghost pbtn--sm">
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

const EMPTY = {
  title: '',
  slug: '',
  category: '',
  status: 'draft',
  statusNote: '',
  startsAt: '',
  endsAt: '',
  location: '',
  host: '',
  summary: '',
  description: '',
  schedule: [],
  requirements: [],
  prizes: [],
  capacity: 0,
  signupUrl: '',
  signupLabel: '',
  image: null,
  featured: false,
}

/** A date for <input type="datetime-local">, in the editor's own time. */
function forInput(value) {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function pick(event) {
  const out = {}
  for (const key of Object.keys(EMPTY)) out[key] = event[key] ?? EMPTY[key]
  out.startsAt = forInput(event.startsAt)
  out.endsAt = forInput(event.endsAt)
  out.requirements = (event.requirements ?? []).map((text) => ({ text }))
  return out
}

/** The form back into what the API takes: real dates, and no half-filled rows. */
function toBody(form) {
  return {
    ...form,
    category: form.category.trim() || 'Event',
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    capacity: Number(form.capacity) || 0,
    schedule: form.schedule.filter((r) => r.item.trim()),
    prizes: form.prizes.filter((r) => r.prize.trim()),
    requirements: form.requirements.map((r) => r.text.trim()).filter(Boolean),
    statusNote: form.status === 'cancelled' ? form.statusNote : '',
  }
}

export function EventEditor() {
  const { id } = useParams()
  const isNew = id === 'new'
  const { data, error, loading, reload } = useResource(
    () => (isNew ? Promise.resolve({ event: EMPTY }) : adminApi.get(`/events/${id}`)),
    [id],
  )
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <EventForm key={id} initial={data.event} isNew={isNew} />
}

function EventForm({ initial, isNew }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(() => pick(initial))
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [run, busy] = useAction()
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const setTitle = (title) =>
    setForm((f) => ({
      ...f,
      title,
      slug: slugTouched ? f.slug : slugify(title),
    }))

  // the three repeating lists share one set of helpers
  const rows = (key) => ({
    add: (blank) => setForm((f) => ({ ...f, [key]: [...f[key], blank] })),
    edit: (i, field, value) =>
      setForm((f) => ({
        ...f,
        [key]: f[key].map((r, j) => (j === i ? { ...r, [field]: value } : r)),
      })),
    move: (i, d) => setForm((f) => ({ ...f, [key]: move(f[key], i, d) })),
    remove: (i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, j) => j !== i) })),
  })
  const schedule = rows('schedule')
  const prizes = rows('prizes')
  const requirements = rows('requirements')

  async function save(e) {
    e.preventDefault()
    const body = toBody(form)
    const result = await run(
      () => (isNew ? adminApi.post('/events', body) : adminApi.put(`/events/${initial._id}`, body)),
      body.status === 'published'
        ? 'Saved — it is on the Events page'
        : body.status === 'cancelled'
          ? 'Saved as cancelled'
          : 'Saved as a draft',
    )
    if (result) {
      if (isNew) navigate(`/panel/events/${result.event._id}`, { replace: true })
      else setForm(pick(result.event))
    }
  }

  async function remove() {
    const result = await run(() => adminApi.del(`/events/${initial._id}`), 'Event deleted')
    if (result) navigate('/panel/events')
  }

  const ready = form.title.trim() && form.slug && form.startsAt

  return (
    <form onSubmit={save}>
      <PageHead
        title={isNew ? 'New event' : form.title || 'Event'}
        sub={
          <Link to="/panel/events" className="p-link">
            ← All events
          </Link>
        }
      >
        {!isNew && initial.status !== 'draft' && (
          <a className="pbtn pbtn--ghost" href={`/events/${initial.slug}`} target="_blank" rel="noreferrer">
            View on site
          </a>
        )}
        <button type="submit" className="pbtn pbtn--gold" disabled={busy || !ready}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </PageHead>

      <div className="p-grid-2 p-grid-2--wide-left">
        <div className="p-stack">
          <Panel title="The event">
            <div className="p-form-grid">
              <TextField label="Title" value={form.title} onChange={setTitle} required maxLength={100} wide />
              <TextField
                label="Short name"
                hint="Its address: /events/short-name (letters, numbers and dashes)."
                value={form.slug}
                onChange={(v) => {
                  setSlugTouched(true)
                  set('slug')(slugify(v))
                }}
                required
                maxLength={60}
              />
              <TextField
                label="Category"
                value={form.category}
                onChange={set('category')}
                maxLength={40}
                placeholder="Race, Heist, Tournament, Car meet…"
              />
              <TextField
                label="Hosted by"
                value={form.host}
                onChange={set('host')}
                maxLength={80}
                placeholder="Optional, e.g. the Events team"
              />
              <TextField
                label="Where"
                value={form.location}
                onChange={set('location')}
                maxLength={80}
                placeholder="Optional, e.g. Vinewood Bowl"
              />
              <TextField
                label="Summary"
                hint="One or two sentences for the event's card on the Events page."
                value={form.summary}
                onChange={set('summary')}
                maxLength={240}
                multiline
                rows={2}
                wide
              />
              <TextField
                label="Full description"
                hint="Everything else people should know. Blank lines start a new paragraph."
                value={form.description}
                onChange={set('description')}
                maxLength={4000}
                multiline
                rows={7}
                wide
              />
            </div>
          </Panel>

          <Panel title="When">
            <div className="p-form-grid">
              <TextField
                label="Starts"
                type="datetime-local"
                value={form.startsAt}
                onChange={set('startsAt')}
                required
                hint="In your own time; visitors see it in theirs."
              />
              <TextField
                label="Finishes"
                type="datetime-local"
                value={form.endsAt}
                onChange={set('endsAt')}
                hint="Optional. Without it the event counts as 3 hours long."
              />
            </div>
          </Panel>

          <Panel
            title="Programme"
            actions={
              <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => schedule.add({ time: '', item: '' })}>
                Add a step
              </button>
            }
          >
            {form.schedule.length === 0 ? (
              <p className="p-text">Optional. A timetable for the night: "20:00 — Grid forms at the pier", "20:30 — Race 1".</p>
            ) : (
              <ol className="p-rows" role="list">
                {form.schedule.map((r, i) => (
                  <li key={i} className="p-rows__item p-rows__item--pair">
                    <span className="p-rows__num">{i + 1}</span>
                    <input
                      className="p-input"
                      aria-label={`Step ${i + 1} time`}
                      placeholder="20:00"
                      value={r.time}
                      maxLength={20}
                      onChange={(e) => schedule.edit(i, 'time', e.target.value)}
                    />
                    <input
                      className="p-input"
                      aria-label={`Step ${i + 1}`}
                      placeholder="What happens"
                      value={r.item}
                      maxLength={160}
                      onChange={(e) => schedule.edit(i, 'item', e.target.value)}
                    />
                    <RowTools
                      index={i}
                      count={form.schedule.length}
                      label={`step ${i + 1}`}
                      onMove={(d) => schedule.move(i, d)}
                      onRemove={() => schedule.remove(i)}
                    />
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel
            title="Taking part"
            actions={
              <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => requirements.add({ text: '' })}>
                Add a requirement
              </button>
            }
          >
            {form.requirements.length === 0 ? (
              <p className="p-text">Optional. What people need: "A whitelisted character", "Your own car", "Be in the city by 19:45".</p>
            ) : (
              <ol className="p-rows" role="list">
                {form.requirements.map((r, i) => (
                  <li key={i} className="p-rows__item p-rows__item--single">
                    <span className="p-rows__num">{i + 1}</span>
                    <input
                      className="p-input"
                      aria-label={`Requirement ${i + 1}`}
                      placeholder="What people need"
                      value={r.text}
                      maxLength={160}
                      onChange={(e) => requirements.edit(i, 'text', e.target.value)}
                    />
                    <RowTools
                      index={i}
                      count={form.requirements.length}
                      label={`requirement ${i + 1}`}
                      onMove={(d) => requirements.move(i, d)}
                      onRemove={() => requirements.remove(i)}
                    />
                  </li>
                ))}
              </ol>
            )}
            <div className="p-form-grid p-form-grid--spaced">
              <TextField
                label="Places"
                type="number"
                min={0}
                max={10000}
                value={form.capacity}
                onChange={set('capacity')}
                hint="0 = no limit."
              />
              <TextField
                label="Sign-up link"
                type="url"
                value={form.signupUrl}
                onChange={set('signupUrl')}
                maxLength={500}
                placeholder="https://discord.gg/…"
                hint="Optional. Where people sign up, e.g. the Discord event."
              />
              <TextField label="Button text" value={form.signupLabel} onChange={set('signupLabel')} maxLength={40} placeholder="Sign up" />
            </div>
          </Panel>

          <Panel
            title="Prizes"
            actions={
              <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => prizes.add({ place: '', prize: '' })}>
                Add a prize
              </button>
            }
          >
            {form.prizes.length === 0 ? (
              <p className="p-text">Optional. "1st — $250,000 and a custom plate", "Best dressed — VIP table".</p>
            ) : (
              <ol className="p-rows" role="list">
                {form.prizes.map((r, i) => (
                  <li key={i} className="p-rows__item p-rows__item--pair">
                    <span className="p-rows__num">{i + 1}</span>
                    <input
                      className="p-input"
                      aria-label={`Prize ${i + 1} place`}
                      placeholder="1st"
                      value={r.place}
                      maxLength={30}
                      onChange={(e) => prizes.edit(i, 'place', e.target.value)}
                    />
                    <input
                      className="p-input"
                      aria-label={`Prize ${i + 1}`}
                      placeholder="The prize"
                      value={r.prize}
                      maxLength={160}
                      onChange={(e) => prizes.edit(i, 'prize', e.target.value)}
                    />
                    <RowTools
                      index={i}
                      count={form.prizes.length}
                      label={`prize ${i + 1}`}
                      onMove={(d) => prizes.move(i, d)}
                      onRemove={() => prizes.remove(i)}
                    />
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="p-stack">
          <Panel title="Who can see it">
            <div className="p-form-grid">
              <SelectField label="Status" value={form.status} onChange={set('status')} options={STATUSES} wide />
              {form.status === 'cancelled' && (
                <TextField
                  label="Note with the cancellation"
                  value={form.statusNote}
                  onChange={set('statusNote')}
                  maxLength={200}
                  placeholder="Optional, e.g. Moved to next Saturday"
                  wide
                />
              )}
              <div className="p-setting p-field--wide">
                <div className="p-setting__text">
                  <p className="p-setting__name">Feature it</p>
                  <p className="p-setting__note">Leads the Events page while it is still to come. Only one event can be featured.</p>
                </div>
                <Switch checked={form.featured} onChange={set('featured')} label={form.featured ? 'Featured' : 'Not featured'} />
              </div>
            </div>
          </Panel>

          <Panel title="Picture">
            <MediaField
              label="Event picture"
              value={form.image}
              onChange={set('image')}
              fallback="Optional. A wide picture (16:9) works best. Without one, the event shows the city skyline."
            />
          </Panel>
        </div>
      </div>

      {!isNew && (
        <Panel title="Delete event" className="p-card--danger">
          <p className="p-text">
            Removes the event from the website completely. To keep it visible but called off, set it to Cancelled instead.
          </p>
          <ConfirmButton onConfirm={remove} disabled={busy}>
            Delete {initial.title}
          </ConfirmButton>
        </Panel>
      )}
    </form>
  )
}
