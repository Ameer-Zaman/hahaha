import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { MediaField, Thumb } from '../media'
import { adminApi } from '../panelApi'
import { move, slugify } from '../format'
import { useAction, useResource, useToast } from '../hooks'
import { ConfirmButton, Empty, ErrorNote, Loading, PageHead, Panel, Switch, TextField } from '../ui'
import { BulkImportDialog, GangImportDialog } from './ImportPlayers'

/* ------------------------------------------------------------------ list */

export function GangList() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/gangs'))
  const gangs = data?.gangs
  const [importing, setImporting] = useState(false)

  return (
    <>
      <PageHead title="Gangs" sub="Every gang on the Gangs page, in this order. Players are listed on each gang's own page.">
        {gangs?.length > 0 && (
          <button type="button" className="pbtn pbtn--ghost" onClick={() => setImporting(true)}>
            Import players (JSON)
          </button>
        )}
        <Link to="/panel/gangs/new" className="pbtn pbtn--gold">
          New gang
        </Link>
      </PageHead>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !gangs && <Loading />}
      {gangs && (
        <BulkImportDialog
          open={importing}
          gangs={gangs}
          onClose={() => setImporting(false)}
          onDone={() => {
            setImporting(false)
            reload()
          }}
        />
      )}
      {gangs?.length === 0 && (
        <Empty>
          No gangs yet. Until you add one, the website keeps showing its demo gangs (clearly marked “Demo data”).
        </Empty>
      )}
      {gangs?.length > 0 && (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Gang</th>
                <th scope="col">Territory</th>
                <th scope="col">Players</th>
                <th scope="col">Address</th>
                <th scope="col"><span className="p-sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody>
              {gangs.map((g) => (
                <tr key={g._id}>
                  <td className="p-num">{g.order}</td>
                  <td>
                    <span className="p-cell-media">
                      <Thumb id={g.emblem ?? g.image} />
                      <strong>{g.name}</strong>
                      {g.video && <span className="p-tag">Video</span>}
                      {!g.verified && <span className="p-tag">Unverified</span>}
                    </span>
                  </td>
                  <td>{g.territory || '—'}</td>
                  <td className="p-num">{g.members?.length ?? 0}</td>
                  <td>
                    <a className="p-link" href={`/gangs/${g.slug}`} target="_blank" rel="noreferrer">
                      /gangs/{g.slug}
                    </a>
                  </td>
                  <td className="p-actions-cell">
                    <Link to={`/panel/gangs/${g._id}`} className="pbtn pbtn--ghost pbtn--sm">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

/* ---------------------------------------------------------------- editor */

const EMPTY = {
  name: '',
  slug: '',
  type: 'Gang',
  established: '',
  territory: '',
  leader: '',
  headline: '',
  description: '',
  image: null,
  emblem: null,
  video: null,
  verified: true,
  order: 0,
  members: [],
}

export function GangEditor() {
  const { id } = useParams()
  const isNew = id === 'new'
  const { data, error, loading, reload } = useResource(
    () => (isNew ? Promise.resolve({ gang: EMPTY }) : adminApi.get(`/gangs/${id}`)),
    [id],
  )

  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <GangForm key={id} initial={data.gang} isNew={isNew} />
}

function pick(gang) {
  const out = {}
  for (const key of Object.keys(EMPTY)) out[key] = gang[key] ?? EMPTY[key]
  out.members = (gang.members ?? []).map(({ name, role, since }) => ({ name, role: role ?? 'Member', since: since ?? '' }))
  return out
}

function GangForm({ initial, isNew }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(() => pick(initial))
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [run, busy] = useAction()
  const toast = useToast()
  const [importOpen, setImportOpen] = useState(false)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const setName = (name) =>
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }))

  const setMember = (index, key, value) =>
    setForm((f) => ({ ...f, members: f.members.map((m, i) => (i === index ? { ...m, [key]: value } : m)) }))

  async function save(e) {
    e.preventDefault()
    const body = {
      ...form,
      order: Number(form.order) || 0,
      members: form.members.filter((m) => m.name.trim()),
    }
    const result = await run(
      () => (isNew ? adminApi.post('/gangs', body) : adminApi.put(`/gangs/${initial._id}`, body)),
      isNew ? 'Gang created' : 'Gang saved',
    )
    if (result) {
      if (isNew) navigate(`/panel/gangs/${result.gang._id}`, { replace: true })
      else setForm(pick(result.gang))
    }
  }

  async function remove() {
    const result = await run(() => adminApi.del(`/gangs/${initial._id}`), 'Gang deleted')
    if (result) navigate('/panel/gangs')
  }

  return (
    <form onSubmit={save}>
      <PageHead title={isNew ? 'New gang' : form.name || 'Gang'} sub={<Link to="/panel/gangs" className="p-link">← All gangs</Link>}>
        {!isNew && (
          <a className="pbtn pbtn--ghost" href={`/gangs/${initial.slug}`} target="_blank" rel="noreferrer">
            View on site
          </a>
        )}
        <button type="submit" className="pbtn pbtn--gold" disabled={busy || !form.name.trim() || !form.slug}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </PageHead>

      <div className="p-grid-2 p-grid-2--wide-left">
        <Panel title="Details">
          <div className="p-form-grid">
            <TextField label="Name" value={form.name} onChange={setName} required maxLength={60} />
            <TextField
              label="Address"
              hint={`Shown as /gangs/${form.slug || '…'} — changing it breaks old links.`}
              value={form.slug}
              onChange={(v) => {
                setSlugTouched(true)
                set('slug')(slugify(v))
              }}
              required
              maxLength={60}
            />
            <TextField label="Type" value={form.type} onChange={set('type')} maxLength={40} placeholder="Gang, Cartel, MC…" />
            <TextField label="Established" value={form.established} onChange={set('established')} maxLength={40} placeholder="e.g. 2026" />
            <TextField label="Territory" value={form.territory} onChange={set('territory')} maxLength={60} />
            <TextField label="Leader" value={form.leader} onChange={set('leader')} maxLength={60} />
            <TextField label="Headline" value={form.headline} onChange={set('headline')} maxLength={160} wide />
            <TextField label="Description" value={form.description} onChange={set('description')} maxLength={2000} multiline rows={5} />
            <TextField
              label="Order"
              hint="Lower numbers come first in the reel."
              type="number"
              min={0}
              max={9999}
              value={form.order}
              onChange={set('order')}
            />
            <div className="p-field">
              <span className="p-field__label">Status</span>
              <Switch checked={form.verified} onChange={set('verified')} label={form.verified ? 'Confirmed by the administration' : 'Not confirmed yet'} />
            </div>
          </div>
        </Panel>

        <Panel title="Card media">
          <MediaField
            label="Card image"
            value={form.image}
            onChange={set('image')}
            fallback="Empty: the reel uses public/media/gangs/file-NN.jpg, or the illustrated skyline."
          />
          <MediaField
            label="Card video (5–10 s)"
            kind="video"
            value={form.video}
            onChange={set('video')}
            maxSeconds={15}
            hint="Plays muted on a loop instead of the image, on the reel and the gang's page. Keep it short and small (under ~8 MB, 1080p)."
            fallback="Optional. The card image shows while it loads, and for visitors who turn off motion."
          />
          <MediaField label="Emblem" value={form.emblem} onChange={set('emblem')} fallback="Optional square logo." />
        </Panel>
      </div>

      <Panel
        title={`Players (${form.members.length})`}
        actions={
          <span className="p-row">
            <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => setImportOpen(true)}>
              Import JSON
            </button>
            <button
              type="button"
              className="pbtn pbtn--ghost pbtn--sm"
              onClick={() => setForm((f) => ({ ...f, members: [...f.members, { name: '', role: 'Member', since: '' }] }))}
              disabled={form.members.length >= 200}
            >
              Add player
            </button>
          </span>
        }
      >
        <GangImportDialog
          open={importOpen}
          gang={form}
          members={form.members.filter((m) => m.name.trim())}
          onClose={() => setImportOpen(false)}
          onImport={({ list, added, updated }) => {
            setForm((f) => ({ ...f, members: list }))
            setImportOpen(false)
            toast(`${added} added${updated ? `, ${updated} updated` : ''} — press Save to publish`)
          }}
        />
        {form.members.length === 0 ? (
          <p className="p-text">No players listed. The gang page says so until you add some.</p>
        ) : (
          <ol className="p-rows" role="list">
            {form.members.map((m, i) => (
              <li key={i} className="p-rows__item p-rows__item--member">
                <span className="p-rows__num">{i + 1}</span>
                <input className="p-input" aria-label={`Player ${i + 1} name`} placeholder="Character name" value={m.name} maxLength={60} onChange={(e) => setMember(i, 'name', e.target.value)} />
                <input className="p-input" aria-label={`Player ${i + 1} role`} placeholder="Role" value={m.role} maxLength={40} onChange={(e) => setMember(i, 'role', e.target.value)} />
                <input className="p-input" aria-label={`Player ${i + 1} member since`} placeholder="Since" value={m.since} maxLength={20} onChange={(e) => setMember(i, 'since', e.target.value)} />
                <RowTools
                  index={i}
                  count={form.members.length}
                  label={m.name || `player ${i + 1}`}
                  onMove={(d) => setForm((f) => ({ ...f, members: move(f.members, i, d) }))}
                  onRemove={() => setForm((f) => ({ ...f, members: f.members.filter((_, j) => j !== i) }))}
                />
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {!isNew && (
        <Panel title="Delete gang" className="p-card--danger">
          <p className="p-text">Removes the gang, its player list and every war record it is part of. This can't be undone.</p>
          <ConfirmButton onConfirm={remove} disabled={busy}>
            Delete {initial.name}
          </ConfirmButton>
        </Panel>
      )}
    </form>
  )
}

/** Up / down / remove buttons for an editable row. */
export function RowTools({ index, count, label, onMove, onRemove }) {
  return (
    <span className="p-rowtools">
      <button type="button" className="p-icon-btn" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${label} up`}>
        ↑
      </button>
      <button type="button" className="p-icon-btn" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move ${label} down`}>
        ↓
      </button>
      <button type="button" className="p-icon-btn p-icon-btn--danger" onClick={onRemove} aria-label={`Remove ${label}`}>
        ×
      </button>
    </span>
  )
}
