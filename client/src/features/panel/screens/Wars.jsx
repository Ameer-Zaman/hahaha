import { useState } from 'react'
import { Link } from 'react-router-dom'

import { adminApi } from '../panelApi'
import { formatDay } from '../format'
import { useAction, useResource } from '../hooks'
import { ConfirmButton, Empty, ErrorNote, Loading, PageHead, Panel, SelectField, TextField } from '../ui'

const today = () => new Date().toISOString().slice(0, 10)
const blank = () => ({ date: today(), a: '', b: '', winner: 'draw', result: '' })

export default function Wars() {
  const { data, error, loading, reload, setData } = useResource(async () => {
    const [{ gangs }, { wars }] = await Promise.all([adminApi.get('/gangs'), adminApi.get('/wars')])
    return { gangs, wars }
  })
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [run, busy] = useAction()

  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading && !data) return <Loading />

  const { gangs, wars } = data
  const nameOf = (id) => gangs.find((g) => g._id === id)?.name ?? 'Deleted gang'
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const options = [{ value: '', label: 'Choose a gang…', disabled: true }, ...gangs.map((g) => ({ value: g._id, label: g.name }))]
  const winnerOptions = [
    { value: 'draw', label: 'Draw / no winner' },
    ...(form.a ? [{ value: form.a, label: nameOf(form.a) }] : []),
    ...(form.b ? [{ value: form.b, label: nameOf(form.b) }] : []),
  ]

  async function save(e) {
    e.preventDefault()
    const body = {
      date: form.date,
      sides: [form.a, form.b],
      winner: form.winner === 'draw' ? null : form.winner,
      result: form.result,
    }
    const result = await run(
      () => (editing ? adminApi.put(`/wars/${editing}`, body) : adminApi.post('/wars', body)),
      editing ? 'War record saved' : 'War record added',
    )
    if (!result) return
    setData((d) => ({
      ...d,
      wars: (editing ? d.wars.map((w) => (w._id === editing ? result.war : w)) : [result.war, ...d.wars]).sort((x, y) =>
        String(y.date).localeCompare(String(x.date)),
      ),
    }))
    setEditing(null)
    setForm(blank())
  }

  function edit(war) {
    setEditing(war._id)
    setForm({ date: war.date, a: war.sides[0], b: war.sides[1], winner: war.winner ?? 'draw', result: war.result ?? '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function remove(id) {
    const ok = await run(() => adminApi.del(`/wars/${id}`), 'War record deleted')
    if (ok) setData((d) => ({ ...d, wars: d.wars.filter((w) => w._id !== id) }))
  }

  const valid = form.date && form.a && form.b && form.a !== form.b

  return (
    <>
      <PageHead title="Wars" sub="Fights between gangs. Each one appears in the war record of both gangs." />

      {gangs.length < 2 ? (
        <Empty>
          Add at least two gangs in <Link to="/panel/gangs">Gangs</Link> before logging a war.
        </Empty>
      ) : (
        <Panel title={editing ? 'Edit war record' : 'Log a war'}>
          <form className="p-form-grid" onSubmit={save}>
            <TextField label="Date" type="date" value={form.date} onChange={set('date')} required />
            <SelectField label="Gang" value={form.a} onChange={(v) => setForm((f) => ({ ...f, a: v, winner: f.winner === f.a ? 'draw' : f.winner }))} options={options} />
            <SelectField label="Against" value={form.b} onChange={(v) => setForm((f) => ({ ...f, b: v, winner: f.winner === f.b ? 'draw' : f.winner }))} options={options} />
            <SelectField label="Winner" value={form.winner} onChange={set('winner')} options={winnerOptions} />
            <TextField label="Result" hint="One line, e.g. “Took the docks after a three-day standoff”." value={form.result} onChange={set('result')} maxLength={120} wide />
            {form.a && form.a === form.b && <p className="p-form-error">Pick two different gangs.</p>}
            <div className="p-row p-field--wide">
              <button type="submit" className="pbtn pbtn--gold" disabled={busy || !valid}>
                {editing ? 'Save changes' : 'Add war record'}
              </button>
              {editing && (
                <button type="button" className="pbtn pbtn--ghost" onClick={() => (setEditing(null), setForm(blank()))}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </Panel>
      )}

      <Panel title={`Records (${wars.length})`}>
        {wars.length === 0 ? (
          <p className="p-text">No wars logged yet.</p>
        ) : (
          <div className="p-table-wrap">
            <table className="p-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Gangs</th>
                  <th scope="col">Winner</th>
                  <th scope="col">Result</th>
                  <th scope="col"><span className="p-sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {wars.map((w) => (
                  <tr key={w._id} className={editing === w._id ? 'is-editing' : ''}>
                    <td className="p-nowrap">{formatDay(w.date)}</td>
                    <td>
                      {nameOf(w.sides[0])} <span className="p-vs">vs</span> {nameOf(w.sides[1])}
                    </td>
                    <td>{w.winner ? nameOf(w.winner) : <span className="p-muted">Draw</span>}</td>
                    <td>{w.result || '—'}</td>
                    <td className="p-actions-cell">
                      <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => edit(w)}>
                        Edit
                      </button>
                      <ConfirmButton className="pbtn pbtn--quiet pbtn--sm" confirmLabel="Confirm" onConfirm={() => remove(w._id)}>
                        Delete
                      </ConfirmButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  )
}
