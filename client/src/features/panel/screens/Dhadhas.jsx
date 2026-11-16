import { useState } from 'react'

import { move } from '../format'
import { useAction, useResource } from '../hooks'
import { MediaField, MediaPicker, Thumb } from '../mediaKit'
import { adminApi } from '../panelApi'
import { Empty, ErrorNote, Loading, PageHead, Panel, SelectField, TextField } from '../ui'
import { RowTools } from './Gangs'

const STATUSES = [
  { value: 'soon', label: 'Recruiting soon' },
  { value: 'open', label: 'Recruiting now' },
  { value: 'invite', label: 'By invitation only' },
  { value: 'closed', label: 'Not recruiting' },
]

/**
 * Panel → Dhadhas: everything on the Dhadhas clan page. Fill in what you have; parts left
 * empty don't show. With nothing filled in at all the page stays a "coming soon" teaser.
 * Nothing changes on the website until you press Save.
 */
export default function Dhadhas() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/dhadhas'))
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <DhadhasEditor initial={data} />
}

function DhadhasEditor({ initial }) {
  const [saved, setSaved] = useState(initial)
  const [form, setForm] = useState(initial)
  const [run, busy] = useAction()
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  async function save() {
    const result = await run(() => adminApi.put('/dhadhas', form), 'Dhadhas page saved')
    if (result) {
      setSaved(result)
      setForm(result)
    }
  }

  const rankOptions = [
    { value: '', label: 'No rank' },
    ...form.ranks.filter((r) => r.title.trim()).map((r) => ({ value: r.title, label: r.title })),
  ]

  return (
    <>
      <PageHead title="Dhadhas" sub={`The clan page${dirty ? ' · changes not saved yet' : ''}`}>
        <a className="pbtn pbtn--ghost" href="/dhadhas" target="_blank" rel="noreferrer">
          View page
        </a>
        <button type="button" className="pbtn pbtn--gold" onClick={save} disabled={busy || !dirty}>
          Save
        </button>
      </PageHead>

      <div className="p-grid-2 p-grid-2--wide-left">
        <Panel
          title="The clan"
          sub="The top of the page. The motto sits under the name; the story is a short paragraph about who the Dhadhas are."
        >
          <div className="p-form-grid">
            <TextField label="Motto" hint="One line, up to 90 characters." value={form.motto} onChange={set('motto')} maxLength={90} wide />
            <TextField
              label="Who we are"
              hint="Up to 1,200 characters."
              value={form.about}
              onChange={set('about')}
              maxLength={1200}
              multiline
              rows={5}
            />
            <SelectField label="Recruitment" value={form.status} onChange={set('status')} options={STATUSES} />
            <TextField
              label="Where to apply"
              hint="An https:// link (a form or a Discord invite). Empty = the community Discord."
              value={form.applyUrl}
              onChange={set('applyUrl')}
              maxLength={500}
              placeholder="https://"
            />
          </div>
        </Panel>
        <Panel
          title="The seal"
          sub="The clan's emblem, shown in the middle of the gold seal. A square picture with a transparent background works best."
        >
          <MediaField label="Emblem" value={form.crest} onChange={set('crest')} fallback="Empty = the built-in Dhadhas seal." />
        </Panel>
      </div>

      <Panel title="The oath" sub="The clan's code, one line each (up to 10). Shown numbered I, II, III…">
        <LineList
          items={form.creed}
          onChange={set('creed')}
          max={10}
          maxLength={180}
          noun="line"
          placeholder="e.g. Family first, always."
        />
      </Panel>

      <Panel title="Ranks" sub="From the top down (up to 10). Members are grouped by these ranks on the page.">
        {form.ranks.length === 0 && <Empty>No ranks yet.</Empty>}
        <ol role="list" className="p-gal">
          {form.ranks.map((r, i) => (
            <li key={i} className="p-gal__item p-dh-row">
              <span className="p-gal__num">{i + 1}</span>
              <div className="p-gal__fields">
                <input
                  className="p-input"
                  aria-label={`Rank ${i + 1} name`}
                  placeholder="Rank name"
                  value={r.title}
                  maxLength={40}
                  onChange={(e) => set('ranks')(form.ranks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                />
                <input
                  className="p-input"
                  aria-label={`Rank ${i + 1} description`}
                  placeholder="What this rank does (optional)"
                  value={r.line}
                  maxLength={160}
                  onChange={(e) => set('ranks')(form.ranks.map((x, j) => (j === i ? { ...x, line: e.target.value } : x)))}
                />
              </div>
              <RowTools
                index={i}
                count={form.ranks.length}
                label={r.title || `rank ${i + 1}`}
                onMove={(d) => set('ranks')(move(form.ranks, i, d))}
                onRemove={() => set('ranks')(form.ranks.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="pbtn pbtn--ghost p-dh-add"
          disabled={form.ranks.length >= 10}
          onClick={() => set('ranks')([...form.ranks, { title: '', line: '' }])}
        >
          Add a rank
        </button>
      </Panel>

      <Panel title="Members" sub="Everyone in the clan (up to 80), each with a photo, a rank and an optional line. In-game names are fine.">
        {form.members.length === 0 && <Empty>No members yet.</Empty>}
        <ol role="list" className="p-gal">
          {form.members.map((m, i) => (
            <Member
              key={i}
              member={m}
              index={i}
              count={form.members.length}
              rankOptions={rankOptions}
              onChange={(change) => set('members')(form.members.map((x, j) => (j === i ? { ...x, ...change } : x)))}
              onMove={(d) => set('members')(move(form.members, i, d))}
              onRemove={() => set('members')(form.members.filter((_, j) => j !== i))}
            />
          ))}
        </ol>
        <button
          type="button"
          className="pbtn pbtn--ghost p-dh-add"
          disabled={form.members.length >= 80}
          onClick={() => set('members')([...form.members, { name: '', rank: '', line: '', photo: null }])}
        >
          Add a member
        </button>
      </Panel>

      <Panel title="Joining" sub="What it takes to join, one line each (up to 10). Shown with the apply button.">
        <LineList
          items={form.requirements}
          onChange={set('requirements')}
          max={10}
          maxLength={160}
          noun="requirement"
          placeholder="e.g. Active in the city for at least two weeks"
        />
      </Panel>
    </>
  )
}

function Member({ member: m, index: i, count, rankOptions, onChange, onMove, onRemove }) {
  const [picking, setPicking] = useState(false)
  const label = m.name || `member ${i + 1}`
  const options =
    m.rank && !rankOptions.some((o) => o.value === m.rank)
      ? [...rankOptions, { value: m.rank, label: `${m.rank} (not in Ranks)` }]
      : rankOptions
  return (
    <li className="p-gal__item p-dh-member">
      <button
        type="button"
        className="p-dh-photo"
        onClick={() => setPicking(true)}
        aria-label={`${m.photo ? 'Change' : 'Choose'} ${label}'s photo`}
      >
        {m.photo ? <Thumb id={m.photo} alt="" className="p-dh-photo__img" /> : <span>Photo</span>}
      </button>
      <div className="p-gal__fields">
        <input
          className="p-input"
          aria-label={`Member ${i + 1} name`}
          placeholder="Name"
          value={m.name}
          maxLength={40}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <div className="p-dh-pair">
          <select
            className="p-input p-select"
            aria-label={`${label}'s rank`}
            value={m.rank}
            onChange={(e) => onChange({ rank: e.target.value })}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            className="p-input"
            aria-label={`${label}'s line`}
            placeholder="A line about them (optional)"
            value={m.line}
            maxLength={120}
            onChange={(e) => onChange({ line: e.target.value })}
          />
        </div>
        {m.photo && (
          <button type="button" className="pbtn pbtn--quiet pbtn--sm p-dh-unphoto" onClick={() => onChange({ photo: null })}>
            Remove photo
          </button>
        )}
      </div>
      <RowTools index={i} count={count} label={label} onMove={onMove} onRemove={onRemove} />
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

/** An ordered list of single lines: add, edit, move, remove. */
function LineList({ items, onChange, max, maxLength, noun, placeholder }) {
  return (
    <>
      {items.length === 0 && <Empty>Nothing yet.</Empty>}
      <ol role="list" className="p-gal">
        {items.map((line, i) => (
          <li key={i} className="p-gal__item p-dh-row">
            <span className="p-gal__num">{i + 1}</span>
            <input
              className="p-input"
              aria-label={`${noun} ${i + 1}`}
              placeholder={placeholder}
              value={line}
              maxLength={maxLength}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <RowTools
              index={i}
              count={items.length}
              label={`${noun} ${i + 1}`}
              onMove={(d) => onChange(move(items, i, d))}
              onRemove={() => onChange(items.filter((_, j) => j !== i))}
            />
          </li>
        ))}
      </ol>
      <button type="button" className="pbtn pbtn--ghost p-dh-add" disabled={items.length >= max} onClick={() => onChange([...items, ''])}>
        Add a {noun}
      </button>
    </>
  )
}
