import { useState } from 'react'

import { MediaField, Thumb } from '../media'
import { adminApi } from '../panelApi'
import { formatWhen } from '../format'
import { useAction, useResource } from '../hooks'
import { ConfirmButton, Empty, ErrorNote, Loading, PageHead, Panel, Switch, TextField } from '../ui'

const blank = () => ({ name: '', role: '', portrait: null, order: 0 })

/**
 * Staff cards on the Admin page. The Online / On duty switches are what visitors see as the
 * live status — flip them as people come and go.
 */
export default function Staff() {
  const { data, error, loading, reload, setData } = useResource(() => adminApi.get('/staff'))
  const [form, setForm] = useState(null) // null = closed; { id?, ...fields }
  const [run, busy] = useAction()

  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading && !data) return <Loading />
  const staff = data.staff
  const replace = (member) => setData((d) => ({ staff: d.staff.map((s) => (s._id === member._id ? member : s)) }))

  async function setStatus(member, change) {
    const next = { online: member.online, onDuty: member.onDuty, ...change }
    if (change.onDuty) next.online = true // on duty implies online
    if (change.online === false) next.onDuty = false
    replace({ ...member, ...next }) // instant feedback; rolled back below if it fails
    const result = await run(() => adminApi.patch(`/staff/${member._id}/status`, next))
    replace(result ? result.member : member)
  }

  async function save(e) {
    e.preventDefault()
    const existing = form.id ? staff.find((s) => s._id === form.id) : null
    const body = {
      name: form.name,
      role: form.role,
      portrait: form.portrait,
      order: Number(form.order) || 0,
      online: existing?.online ?? false,
      onDuty: existing?.onDuty ?? false,
    }
    const result = await run(
      () => (form.id ? adminApi.put(`/staff/${form.id}`, body) : adminApi.post('/staff', body)),
      form.id ? 'Staff card saved' : 'Staff card added',
    )
    if (!result) return
    setData((d) => {
      const list = form.id ? d.staff.map((s) => (s._id === form.id ? result.member : s)) : [...d.staff, result.member]
      return { staff: list.sort((a, b) => a.order - b.order) }
    })
    setForm(null)
  }

  async function remove(id) {
    const ok = await run(() => adminApi.del(`/staff/${id}`), 'Staff card removed')
    if (ok) {
      setData((d) => ({ staff: d.staff.filter((s) => s._id !== id) }))
      setForm(null)
    }
  }

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <>
      <PageHead title="Staff" sub="The cards on the Admin page. Their status updates on the site within 30 seconds.">
        <button type="button" className="pbtn pbtn--gold" onClick={() => setForm(blank())}>
          Add staff card
        </button>
      </PageHead>

      {form && (
        <Panel title={form.id ? `Edit ${form.name || 'card'}` : 'New staff card'}>
          <form onSubmit={save}>
            <div className="p-grid-2">
              <div className="p-form-grid">
                <TextField label="Name" value={form.name} onChange={set('name')} required maxLength={60} />
                <TextField label="Role" value={form.role} onChange={set('role')} required maxLength={60} placeholder="Founder, Head Admin, Moderator…" />
                <TextField label="Order" type="number" min={0} max={9999} value={form.order} onChange={set('order')} hint="Lower numbers come first." />
              </div>
              <MediaField label="Photo" value={form.portrait} onChange={set('portrait')} fallback="Empty: the card shows their initials." />
            </div>
            <div className="p-row">
              <button type="submit" className="pbtn pbtn--gold" disabled={busy || !form.name.trim() || !form.role.trim()}>
                {form.id ? 'Save' : 'Add'}
              </button>
              <button type="button" className="pbtn pbtn--ghost" onClick={() => setForm(null)}>
                Cancel
              </button>
              {form.id && (
                <ConfirmButton className="pbtn pbtn--danger p-push" onConfirm={() => remove(form.id)}>
                  Remove card
                </ConfirmButton>
              )}
            </div>
          </form>
        </Panel>
      )}

      {staff.length === 0 ? (
        <Empty>No staff cards yet. Until you add one, the Admin page shows anonymous placeholders.</Empty>
      ) : (
        <ul className="p-staff" role="list">
          {staff.map((m) => {
            const tone = m.onDuty ? 'duty' : m.online ? 'online' : 'offline'
            return (
              <li key={m._id} className={`p-staff__card is-${tone}`}>
                <Thumb id={m.portrait} alt={m.name} className="p-staff__photo" />
                <div className="p-staff__text">
                  <p className="p-staff__name">{m.name}</p>
                  <p className="p-staff__role">{m.role}</p>
                  <p className="p-staff__when">Status changed {formatWhen(m.statusUpdatedAt)}</p>
                </div>
                <div className="p-staff__switches">
                  <Switch checked={m.online} onChange={(v) => setStatus(m, { online: v })} label="Online" tone="green" />
                  <Switch checked={m.onDuty} onChange={(v) => setStatus(m, { onDuty: v })} label="On duty" />
                </div>
                <button
                  type="button"
                  className="pbtn pbtn--ghost pbtn--sm"
                  onClick={() => setForm({ id: m._id, name: m.name, role: m.role, portrait: m.portrait, order: m.order })}
                >
                  Edit
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
