import { useState } from 'react'

import { formatWhen } from '../format'
import { useAction, useResource } from '../hooks'
import { adminApi } from '../panelApi'
import { ConfirmButton, Empty, ErrorNote, Loading, PageHead, Panel, SelectField, TextField } from '../ui'

const DURATIONS = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '360', label: '6 hours' },
  { value: '720', label: '12 hours' },
]

const EMPTY = { gangA: '', gangB: '', title: '', url: '', note: '', minutes: '120' }

/**
 * Panel → Live: tell everyone on the website that a gang situation is happening right now —
 * Gang A vs Gang B, with the link to watch it live. It shows as a notification on every page
 * until you end it or its time runs out.
 */
export default function Live() {
  const gangs = useResource(() => adminApi.get('/gangs'))
  const list = useResource(() => adminApi.get('/live'))
  if (gangs.error) return <ErrorNote message={gangs.error} onRetry={gangs.reload} />
  if (list.error) return <ErrorNote message={list.error} onRetry={list.reload} />
  if (gangs.loading || list.loading || !gangs.data || !list.data) return <Loading />
  return <LiveScreen gangs={gangs.data.gangs ?? []} alerts={list.data.alerts} reload={list.reload} />
}

function LiveScreen({ gangs, alerts, reload }) {
  const [form, setForm] = useState(EMPTY)
  const [run, busy] = useAction()
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const name = (slug) => gangs.find((g) => g.slug === slug)?.name ?? slug
  const options = [{ value: '', label: 'Choose a gang…' }, ...gangs.map((g) => ({ value: g.slug, label: g.name }))]
  const ready = form.gangA && form.gangB && form.gangA !== form.gangB && /^https?:\/\/\S+\.\S+/i.test(form.url.trim())
  const on = alerts.filter((a) => a.on)
  const past = alerts.filter((a) => !a.on)

  async function send(e) {
    e.preventDefault()
    const res = await run(
      () => adminApi.post('/live', { ...form, url: form.url.trim(), minutes: Number(form.minutes) }),
      'Sent — it shows on the website within about half a minute',
    )
    if (res) {
      setForm(EMPTY)
      reload()
    }
  }
  async function end(id) {
    if (await run(() => adminApi.post(`/live/${id}/end`), 'Ended — it leaves the website within about half a minute')) reload()
  }
  async function remove(id) {
    if (await run(() => adminApi.del(`/live/${id}`), 'Removed')) reload()
  }

  return (
    <>
      <PageHead
        title="Live"
        sub="A gang situation going on right now? Send it here: everyone on the website sees a LIVE notification with both gangs and a button to watch the stream. It ends by itself when its time is up, or when you end it."
      />

      <Panel title="Send a live notification">
        {gangs.length < 2 ? (
          <Empty>Add at least two gangs in Gangs & players first.</Empty>
        ) : (
          <form className="p-live-form" onSubmit={send}>
            <div className="p-form-grid">
              <SelectField label="Gang A" value={form.gangA} onChange={set('gangA')} options={options} required />
              <SelectField
                label="Gang B"
                value={form.gangB}
                onChange={set('gangB')}
                options={options.map((o) => (o.value && o.value === form.gangA ? { ...o, disabled: true } : o))}
                required
              />
              <TextField
                label="Live link"
                type="url"
                inputMode="url"
                placeholder="https://www.twitch.tv/…"
                hint="The stream to watch — Twitch, YouTube, Kick or any https link."
                value={form.url}
                onChange={set('url')}
                maxLength={500}
                required
                wide
              />
              <TextField
                label="Title (optional)"
                placeholder="e.g. Turf war at Grove Street"
                value={form.title}
                onChange={set('title')}
                maxLength={80}
              />
              <SelectField label="Show it for" value={form.minutes} onChange={set('minutes')} options={DURATIONS} />
              <TextField
                label="Note (optional)"
                placeholder="e.g. Streamed by the Ballas leader"
                value={form.note}
                onChange={set('note')}
                maxLength={200}
                wide
              />
            </div>
            {form.gangA && form.gangB && (
              <p className="p-live-preview" aria-live="polite">
                <span className="p-live-dot" aria-hidden="true" /> LIVE · {name(form.gangA)} <em>vs</em> {name(form.gangB)}
                {form.title.trim() && <> — {form.title.trim()}</>}
              </p>
            )}
            <div className="p-row">
              <button type="submit" className="pbtn pbtn--gold" disabled={busy || !ready}>
                {busy ? 'Sending…' : 'Send to the website'}
              </button>
            </div>
          </form>
        )}
      </Panel>

      <Panel title={`On the website now (${on.length})`}>
        {on.length === 0 ? (
          <Empty>Nothing live right now.</Empty>
        ) : (
          <ul className="p-live-list" role="list">
            {on.map((a) => (
              <li key={a.id} className="p-live-item is-on">
                <div className="p-live-item__main">
                  <strong>
                    <span className="p-live-dot" aria-hidden="true" /> {name(a.gangA)} vs {name(a.gangB)}
                  </strong>
                  {a.title && <span>{a.title}</span>}
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="p-link p-live-item__url">
                    {a.url}
                  </a>
                  <span className="p-live-item__meta">
                    Sent {formatWhen(a.createdAt)} by {a.createdBy || 'an admin'} · ends {formatWhen(a.endsAt)}
                  </span>
                </div>
                <button type="button" className="pbtn pbtn--ghost" onClick={() => end(a.id)} disabled={busy}>
                  End now
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {past.length > 0 && (
        <Panel title="Recent">
          <ul className="p-live-list" role="list">
            {past.map((a) => (
              <li key={a.id} className="p-live-item">
                <div className="p-live-item__main">
                  <strong>
                    {name(a.gangA)} vs {name(a.gangB)}
                  </strong>
                  {a.title && <span>{a.title}</span>}
                  <span className="p-live-item__meta">
                    {formatWhen(a.createdAt)} · {a.endedAt ? 'ended early' : 'time ran out'}
                  </span>
                </div>
                <ConfirmButton onConfirm={() => remove(a.id)} className="pbtn pbtn--danger" disabled={busy}>
                  Delete
                </ConfirmButton>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  )
}
