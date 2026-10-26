import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { MediaField, Thumb } from '../mediaKit'
import { adminApi } from '../panelApi'
import { slugify } from '../format'
import { useAction, useResource } from '../hooks'
import { ConfirmButton, Empty, ErrorNote, Loading, PageHead, Panel, TextField } from '../ui'

/* ------------------------------------------------------------------ list */

export function ClubList() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/clubs'))
  const clubs = data?.clubs

  return (
    <>
      <PageHead title="Clubs" sub="Every club on the Clubs page, one card each, in this order.">
        <Link to="/panel/clubs/new" className="pbtn pbtn--gold">
          New club
        </Link>
      </PageHead>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !clubs && <Loading />}
      {clubs?.length === 0 && (
        <Empty>No clubs yet. Until you add one, the Clubs page shows face-down “to be announced” cards.</Empty>
      )}
      {clubs?.length > 0 && (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Club</th>
                <th scope="col">Type</th>
                <th scope="col">Owner</th>
                <th scope="col">Location</th>
                <th scope="col">
                  <span className="p-sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((c) => (
                <tr key={c._id}>
                  <td className="p-num">{c.order}</td>
                  <td>
                    <span className="p-cell-media">
                      <Thumb id={c.emblem} />
                      <strong>{c.name}</strong>
                    </span>
                  </td>
                  <td>{c.type || '—'}</td>
                  <td>{c.owner || '—'}</td>
                  <td>{c.location || '—'}</td>
                  <td className="p-actions-cell">
                    <Link to={`/panel/clubs/${c._id}`} className="pbtn pbtn--ghost pbtn--sm">
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

const EMPTY = { name: '', slug: '', type: 'Nightclub', owner: '', location: '', description: '', emblem: null, order: 0 }

export function ClubEditor() {
  const { id } = useParams()
  const isNew = id === 'new'
  const { data, error, loading, reload } = useResource(
    () => (isNew ? Promise.resolve({ club: EMPTY }) : adminApi.get(`/clubs/${id}`)),
    [id],
  )
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <ClubForm key={id} initial={data.club} isNew={isNew} />
}

function pick(club) {
  const out = {}
  for (const key of Object.keys(EMPTY)) out[key] = club[key] ?? EMPTY[key]
  return out
}

function ClubForm({ initial, isNew }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(() => pick(initial))
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [run, busy] = useAction()
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const setName = (name) => setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }))

  async function save(e) {
    e.preventDefault()
    const body = { ...form, order: Number(form.order) || 0 }
    const result = await run(
      () => (isNew ? adminApi.post('/clubs', body) : adminApi.put(`/clubs/${initial._id}`, body)),
      isNew ? 'Club created' : 'Club saved',
    )
    if (result) {
      if (isNew) navigate(`/panel/clubs/${result.club._id}`, { replace: true })
      else setForm(pick(result.club))
    }
  }

  async function remove() {
    const result = await run(() => adminApi.del(`/clubs/${initial._id}`), 'Club deleted')
    if (result) navigate('/panel/clubs')
  }

  return (
    <form onSubmit={save}>
      <PageHead
        title={isNew ? 'New club' : form.name || 'Club'}
        sub={
          <Link to="/panel/clubs" className="p-link">
            ← All clubs
          </Link>
        }
      >
        {!isNew && (
          <a className="pbtn pbtn--ghost" href="/clubs" target="_blank" rel="noreferrer">
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
              label="Short name"
              hint="Used to tell clubs apart (letters, numbers and dashes)."
              value={form.slug}
              onChange={(v) => {
                setSlugTouched(true)
                set('slug')(slugify(v))
              }}
              required
              maxLength={60}
            />
            <TextField label="Type" value={form.type} onChange={set('type')} maxLength={40} placeholder="Nightclub, Bar, Social club…" />
            <TextField label="Owner" value={form.owner} onChange={set('owner')} maxLength={60} placeholder="Optional" />
            <TextField label="Location" value={form.location} onChange={set('location')} maxLength={60} placeholder="Optional, e.g. Vespucci Beach" />
            <TextField
              label="Order"
              hint="Lower numbers are dealt first."
              type="number"
              min={0}
              max={9999}
              value={form.order}
              onChange={set('order')}
            />
            <TextField label="Description" value={form.description} onChange={set('description')} maxLength={600} multiline rows={4} />
          </div>
        </Panel>

        <Panel title="Card">
          <MediaField
            label="Logo"
            value={form.emblem}
            onChange={set('emblem')}
            fallback="Optional square logo (PNG with a transparent background looks best). Without one, the card shows its suit."
          />
        </Panel>
      </div>

      {!isNew && (
        <Panel title="Delete club" className="p-card--danger">
          <p className="p-text">Removes the club's card from the Clubs page. This can't be undone.</p>
          <ConfirmButton onConfirm={remove} disabled={busy}>
            Delete {initial.name}
          </ConfirmButton>
        </Panel>
      )}
    </form>
  )
}
