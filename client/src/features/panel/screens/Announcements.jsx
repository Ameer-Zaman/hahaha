import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { formatWhen } from '../format'
import { useAction, useResource } from '../hooks'
import { adminApi } from '../panelApi'
import { ConfirmButton, ErrorNote, Loading, PageHead, Panel, SelectField, Switch, TextField } from '../ui'

const TONES = [
  { value: 'news', label: 'News — an ordinary update' },
  { value: 'good', label: 'Good news — a launch, an event' },
  { value: 'warning', label: 'Warning — downtime, something broken' },
]

const STATE_LABEL = {
  live: 'Live',
  draft: 'Draft',
  scheduled: 'Scheduled',
  finished: 'Finished',
}

const blank = {
  title: '',
  body: '',
  tone: 'news',
  status: 'draft',
  pinned: false,
  startsAt: '',
  endsAt: '',
  linkUrl: '',
  linkLabel: '',
}

/** A date for <input type="datetime-local">, in the reader's own time. */
const forInput = (value) => {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** What the team has posted, and what visitors can see right now. */
export function AnnouncementList() {
  const { data, error, loading, reload, setData } = useResource(() => adminApi.get('/announcements'))
  const [run, busy] = useAction()
  const navigate = useNavigate()

  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />

  async function remove(a) {
    const ok = await run(() => adminApi.del(`/announcements/${a.id}`), `Deleted “${a.title}”`)
    if (ok) setData((d) => ({ announcements: d.announcements.filter((x) => x.id !== a.id) }))
  }

  async function toggle(a) {
    const next = a.status === 'published' ? 'draft' : 'published'
    const res = await run(
      () => adminApi.put(`/announcements/${a.id}`, { ...strip(a), status: next }),
      next === 'published' ? `“${a.title}” is live` : `“${a.title}” is back to a draft`,
    )
    if (res) setData((d) => ({ announcements: d.announcements.map((x) => (x.id === a.id ? res.announcement : x)) }))
  }

  const items = data.announcements
  return (
    <>
      <PageHead
        title="Announcements"
        sub="Notes that show on the website. A pinned one sits in the strip across the top of every page."
      >
        <button type="button" className="pbtn pbtn--gold" onClick={() => navigate('/panel/announcements/new')}>
          Write an announcement
        </button>
      </PageHead>

      <Panel title={`${items.length} ${items.length === 1 ? 'announcement' : 'announcements'}`}>
        {items.length === 0 ? (
          <p className="p-note">Nothing posted yet. The first one you publish appears on the website within a minute.</p>
        ) : (
          <table className="p-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Showing</th>
                <th>When</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.title}</strong>
                    {a.pinned && <span className="p-tag p-tag--ok">Pinned</span>}
                    <br />
                    <span className="p-muted">{a.body ? `${a.body.slice(0, 90)}${a.body.length > 90 ? '…' : ''}` : 'No text'}</span>
                  </td>
                  <td>
                    <span className={`p-state p-state--${a.state}`}>{STATE_LABEL[a.state]}</span>
                  </td>
                  <td className="p-nowrap">
                    {a.startsAt ? `From ${formatWhen(a.startsAt)}` : formatWhen(a.createdAt)}
                    {a.endsAt && (
                      <>
                        <br />
                        <span className="p-muted">until {formatWhen(a.endsAt)}</span>
                      </>
                    )}
                  </td>
                  <td className="p-actions-cell">
                    <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => navigate(`/panel/announcements/${a.id}`)}>
                      Edit
                    </button>
                    <button type="button" className="pbtn pbtn--ghost pbtn--sm" disabled={busy} onClick={() => toggle(a)}>
                      {a.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <ConfirmButton className="pbtn pbtn--quiet pbtn--sm" confirmLabel="Confirm delete" onConfirm={() => remove(a)}>
                      Delete
                    </ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  )
}

/** Only the fields the server accepts, so an edit never sends back its own id or state. */
const strip = (a) => ({
  title: a.title,
  body: a.body ?? '',
  tone: a.tone,
  status: a.status,
  pinned: Boolean(a.pinned),
  startsAt: a.startsAt ?? null,
  endsAt: a.endsAt ?? null,
  linkUrl: a.linkUrl ?? '',
  linkLabel: a.linkLabel ?? '',
})

export function AnnouncementEditor() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { data, error, loading, reload } = useResource(
    () => (isNew ? Promise.resolve({ announcement: blank }) : adminApi.get(`/announcements/${id}`)),
    [id],
  )
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <Form key={id} initial={data.announcement} isNew={isNew} onDone={() => navigate('/panel/announcements')} />
}

function Form({ initial, isNew, onDone }) {
  const [form, setForm] = useState({
    ...blank,
    ...initial,
    startsAt: forInput(initial.startsAt),
    endsAt: forInput(initial.endsAt),
  })
  const [run, busy] = useAction()
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  async function save(status) {
    const body = {
      ...strip(form),
      status,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    }
    const ok = await run(
      () => (isNew ? adminApi.post('/announcements', body) : adminApi.put(`/announcements/${initial.id}`, body)),
      status === 'published' ? 'Published — it is on the website now' : 'Saved as a draft',
    )
    if (ok) onDone()
  }

  return (
    <>
      <PageHead
        title={isNew ? 'Write an announcement' : 'Edit announcement'}
        sub="A draft is only visible here. Publishing puts it on the website within about a minute."
      />
      <Panel title="What it says">
        <div className="p-form-grid">
          <TextField label="Title" value={form.title} onChange={set('title')} maxLength={120} required wide />
          <TextField
            label="Text"
            hint="Optional. Keep it short — a pinned one shows as a single strip across the top."
            value={form.body}
            onChange={set('body')}
            multiline
            rows={5}
            maxLength={4000}
            wide
          />
          <SelectField label="Kind" value={form.tone} onChange={set('tone')} options={TONES} wide />
        </div>
      </Panel>

      <Panel title="A link (optional)" sub="Where the headline points — a Discord event, a rules page, a form.">
        <div className="p-form-grid">
          <TextField label="Address" placeholder="https://…" value={form.linkUrl} onChange={set('linkUrl')} maxLength={500} />
          <TextField label="Link text" placeholder="Read more" value={form.linkLabel} onChange={set('linkLabel')} maxLength={60} />
        </div>
      </Panel>

      <Panel title="When it shows" sub="Leave the dates empty to show it from the moment you publish until you unpublish it.">
        <div className="p-form-grid">
          <TextField label="Start showing" type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
          <TextField label="Stop showing" type="datetime-local" value={form.endsAt} onChange={set('endsAt')} />
          <div className="p-setting p-field--wide">
            <div className="p-setting__text">
              <p className="p-setting__name">Pin to the top of every page</p>
              <p className="p-setting__note">
                For things people need to see now — downtime, a launch time. Visitors can close it, and it comes back if you
                change it.
              </p>
            </div>
            <Switch checked={form.pinned} onChange={set('pinned')} label={form.pinned ? 'Pinned' : 'Not pinned'} />
          </div>
        </div>
      </Panel>

      <div className="p-row">
        <button type="button" className="pbtn pbtn--gold" disabled={busy || !form.title.trim()} onClick={() => save('published')}>
          {form.status === 'published' ? 'Save and keep it live' : 'Publish'}
        </button>
        <button type="button" className="pbtn" disabled={busy || !form.title.trim()} onClick={() => save('draft')}>
          Save as a draft
        </button>
        <button type="button" className="pbtn pbtn--ghost" onClick={onDone} disabled={busy}>
          Cancel
        </button>
      </div>
    </>
  )
}
