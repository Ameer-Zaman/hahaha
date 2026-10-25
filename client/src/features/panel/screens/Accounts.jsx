import { useState } from 'react'

import { useAuth } from '../authContext'
import { adminApi, authApi } from '../panelApi'
import { formatWhen } from '../format'
import { useAction, useResource } from '../hooks'
import { ConfirmButton, ErrorNote, Loading, PageHead, Panel, SelectField, TextField } from '../ui'

const ROLE_LABEL = { admin: 'Admin', superadmin: 'Super Admin' }
const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin — manages content' },
  { value: 'superadmin', label: 'Super Admin — also accounts & audit log' },
]

/** A readable random password for new accounts (the person changes it after signing in). */
function generatePassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join('')
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}-${chars.slice(12)}`
}

/* --------------------------------------------------------------- accounts */

export function Accounts() {
  const { user: me } = useAuth()
  const { data, error, loading, reload, setData } = useResource(() => adminApi.get('/users'))
  const [form, setForm] = useState(null)
  const [reset, setReset] = useState(null) // { id, password }
  const [run, busy] = useAction()

  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading && !data) return <Loading />
  const replace = (user) => setData((d) => ({ users: d.users.map((u) => (u.id === user.id ? user : u)) }))

  async function create(e) {
    e.preventDefault()
    const result = await run(() => adminApi.post('/users', form), `Account created for ${form.email}`)
    if (result) {
      setData((d) => ({ users: [...d.users, result.user] }))
      setForm(null)
    }
  }

  async function update(user, change, message) {
    const result = await run(() => adminApi.patch(`/users/${user.id}`, change), message)
    if (result) replace(result.user)
    return result
  }

  async function remove(user) {
    const ok = await run(() => adminApi.del(`/users/${user.id}`), `Deleted ${user.email}`)
    if (ok) setData((d) => ({ users: d.users.filter((u) => u.id !== user.id) }))
  }

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <>
      <PageHead
        title="Accounts"
        sub="Website accounts for the panel. There is no public sign-up, and in-game ranks never grant access here."
      >
        <button type="button" className="pbtn pbtn--gold" onClick={() => setForm({ name: '', email: '', role: 'admin', password: generatePassword() })}>
          New account
        </button>
      </PageHead>

      {form && (
        <Panel title="New account">
          <form className="p-form-grid" onSubmit={create}>
            <TextField label="Name" value={form.name} onChange={set('name')} required maxLength={80} />
            <TextField label="Email" type="email" value={form.email} onChange={set('email')} required maxLength={200} autoComplete="off" />
            <SelectField label="Role" value={form.role} onChange={set('role')} options={ROLE_OPTIONS} />
            <TextField
              label="First password"
              hint="Share it privately (not in a public channel). They should change it under Account after signing in."
              value={form.password}
              onChange={set('password')}
              minLength={10}
              required
              autoComplete="new-password"
            />
            <div className="p-row p-field--wide">
              <button type="submit" className="pbtn pbtn--gold" disabled={busy || !form.name || !form.email || form.password.length < 10}>
                Create account
              </button>
              <button type="button" className="pbtn pbtn--ghost" onClick={() => setForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Panel>
      )}

      <div className="p-table-wrap">
        <table className="p-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Last sign-in</th>
              <th scope="col"><span className="p-sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u) => {
              const self = u.id === me.id
              return (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong> {self && <span className="p-tag">You</span>}
                    <br />
                    <span className="p-muted">{u.email}</span>
                  </td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>{u.active ? 'Active' : <span className="p-muted">Disabled</span>}</td>
                  <td className="p-nowrap">{formatWhen(u.lastLoginAt)}</td>
                  <td className="p-actions-cell">
                    {!self && (
                      <>
                        <button
                          type="button"
                          className="pbtn pbtn--ghost pbtn--sm"
                          disabled={busy}
                          onClick={() =>
                            update(u, { role: u.role === 'admin' ? 'superadmin' : 'admin' }, `${u.name} is now ${u.role === 'admin' ? 'a Super Admin' : 'an Admin'}`)
                          }
                        >
                          Make {u.role === 'admin' ? 'Super Admin' : 'Admin'}
                        </button>
                        <button
                          type="button"
                          className="pbtn pbtn--ghost pbtn--sm"
                          disabled={busy}
                          onClick={() => update(u, { active: !u.active }, u.active ? `${u.name} disabled and signed out` : `${u.name} enabled`)}
                        >
                          {u.active ? 'Disable' : 'Enable'}
                        </button>
                        <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => setReset({ id: u.id, name: u.name, password: generatePassword() })}>
                          Reset password
                        </button>
                        <ConfirmButton className="pbtn pbtn--quiet pbtn--sm" confirmLabel="Confirm delete" onConfirm={() => remove(u)}>
                          Delete
                        </ConfirmButton>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {reset && (
        <Panel title={`New password for ${reset.name}`}>
          <form
            className="p-form-grid"
            onSubmit={async (e) => {
              e.preventDefault()
              const user = data.users.find((u) => u.id === reset.id)
              if (await update(user, { password: reset.password }, `Password reset — ${reset.name} was signed out everywhere`)) setReset(null)
            }}
          >
            <TextField label="New password" value={reset.password} onChange={(v) => setReset((r) => ({ ...r, password: v }))} minLength={10} required autoComplete="new-password" />
            <div className="p-row p-field--wide">
              <button type="submit" className="pbtn pbtn--gold" disabled={busy || reset.password.length < 10}>
                Set password
              </button>
              <button type="button" className="pbtn pbtn--ghost" onClick={() => setReset(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Panel>
      )}
    </>
  )
}

/* -------------------------------------------------------------- audit log */

export function AuditLog() {
  const { data, error, loading, reload, setData } = useResource(() => adminApi.get('/audit?limit=50'))
  const [run, busy] = useAction()

  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading && !data) return <Loading />

  async function more() {
    const page = await run(() => adminApi.get(`/audit?limit=50&before=${encodeURIComponent(data.next)}`))
    if (page) setData((d) => ({ entries: [...d.entries, ...page.entries], next: page.next }))
  }

  return (
    <>
      <PageHead title="Audit log" sub="Every sign-in and every change made through the panel. Entries can't be edited or removed." />
      <div className="p-table-wrap">
        <table className="p-table p-table--dense">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Who</th>
              <th scope="col">Action</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((e) => (
              <tr key={e.id} className={e.action === 'auth.login_failed' ? 'is-warn' : ''}>
                <td className="p-nowrap">{formatWhen(e.at)}</td>
                <td>
                  {e.actorEmail || <span className="p-muted">—</span>}
                  {e.ip && <span className="p-muted p-ip"> · {e.ip}</span>}
                </td>
                <td>
                  <code>{e.action}</code>
                </td>
                <td>{[e.target, e.summary].filter(Boolean).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.next && (
        <button type="button" className="pbtn pbtn--ghost" onClick={more} disabled={busy}>
          Load older entries
        </button>
      )}
    </>
  )
}

/* ---------------------------------------------------------------- account */

export function Account() {
  const { user } = useAuth()
  const [fields, setFields] = useState({ current: '', next: '', confirm: '' })
  const [run, busy] = useAction()
  const set = (key) => (value) => setFields((f) => ({ ...f, [key]: value }))
  const mismatch = fields.confirm && fields.next !== fields.confirm

  async function submit(e) {
    e.preventDefault()
    const ok = await run(() => authApi.changePassword(fields.current, fields.next), 'Password changed — other devices were signed out')
    if (ok) setFields({ current: '', next: '', confirm: '' })
  }

  return (
    <>
      <PageHead title="Your account" sub={`${user.name} · ${user.email} · ${ROLE_LABEL[user.role]}`} />
      <Panel title="Change password">
        <form className="p-form-grid p-form-grid--narrow" onSubmit={submit}>
          <TextField label="Current password" type="password" value={fields.current} onChange={set('current')} autoComplete="current-password" required wide />
          <TextField label="New password" hint="At least 10 characters." type="password" value={fields.next} onChange={set('next')} autoComplete="new-password" minLength={10} required />
          <TextField label="Repeat new password" type="password" value={fields.confirm} onChange={set('confirm')} autoComplete="new-password" required />
          {mismatch && <p className="p-form-error">The new passwords don't match.</p>}
          <div className="p-row p-field--wide">
            <button type="submit" className="pbtn pbtn--gold" disabled={busy || !fields.current || fields.next.length < 10 || fields.next !== fields.confirm}>
              Change password
            </button>
          </div>
        </form>
      </Panel>
    </>
  )
}
