import { useState } from 'react'

import { ruleCategories as builtInRules } from '../../../content/rules'
import { adminApi } from '../panelApi'
import { formatWhen, move, slugify } from '../format'
import { useAction, useResource } from '../hooks'
import { ConfirmButton, ErrorNote, Loading, PageHead, Panel, TextField } from '../ui'
import { RowTools } from './Gangs'

/**
 * The rule book. Edits are saved as a draft that only the team sees; "Publish" puts the
 * draft on the public Rules page. Until something is published there, the site shows the
 * built-in draft from content/rules.js.
 */
export default function Rules() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/rules'))
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <RuleEditor book={data} />
}

const strip = (cats) =>
  cats.map(({ id, title, summary, rules }) => ({
    id,
    title,
    summary: summary ?? '',
    rules: rules.map(({ id: rid, title: rt, text, level, penalty }) => ({
      id: rid,
      title: rt,
      text,
      level: level ?? 'standard',
      penalty: penalty ?? '',
    })),
  }))

const NO_EXTRAS = { notice: '', penalties: [], appeals: '', glossary: [] }
const stripExtras = (x) => ({
  notice: x?.notice ?? '',
  penalties: (x?.penalties ?? []).map(({ title, text }) => ({ title, text: text ?? '' })),
  appeals: x?.appeals ?? '',
  glossary: (x?.glossary ?? []).map(({ term, meaning }) => ({ term, meaning })),
})

const LEVELS = [
  { value: 'standard', label: 'Standard' },
  { value: 'serious', label: 'Serious' },
  { value: 'zero', label: 'Zero tolerance' },
]

/** Gives every section and rule a stable, unique address (#general-1) before saving. */
function withIds(cats) {
  const used = new Set()
  const unique = (base) => {
    let id = base || 'section'
    for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`
    used.add(id)
    return id
  }
  return cats.map((c) => {
    const cid = unique(c.id || slugify(c.title))
    return {
      ...c,
      id: cid,
      rules: c.rules.map((r, i) => ({ ...r, id: unique(r.id || `${cid}-${i + 1}`) })),
    }
  })
}

function RuleEditor({ book: initialBook }) {
  const [book, setBook] = useState(initialBook)
  const [cats, setCats] = useState(() => strip(initialBook.draft ?? []))
  const [extras, setExtras] = useState(() => stripExtras(initialBook.draftExtras ?? NO_EXTRAS))
  const [run, busy] = useAction()

  const saved = JSON.stringify([strip(book.draft ?? []), stripExtras(book.draftExtras)])
  const dirty = JSON.stringify([cats, extras]) !== saved
  const unpublishedChanges = book.published ? saved !== JSON.stringify([strip(book.published), stripExtras(book.publishedExtras)]) : true
  const ruleCount = cats.reduce((n, c) => n + c.rules.length, 0)
  const incomplete =
    cats.some((c) => !c.title.trim() || c.rules.some((r) => !r.title.trim() || !r.text.trim())) ||
    extras.penalties.some((p) => !p.title.trim()) ||
    extras.glossary.some((g) => !g.term.trim() || !g.meaning.trim())
  const setX = (change) => setExtras((x) => ({ ...x, ...change }))

  const updateCat = (ci, change) => setCats((list) => list.map((c, i) => (i === ci ? { ...c, ...change } : c)))
  const updateRule = (ci, ri, change) =>
    setCats((list) => list.map((c, i) => (i === ci ? { ...c, rules: c.rules.map((r, j) => (j === ri ? { ...r, ...change } : r)) } : c)))

  async function saveDraft() {
    const categories = withIds(cats)
    const result = await run(() => adminApi.put('/rules/draft', { categories, extras }), 'Draft saved')
    if (result) {
      setBook(result)
      setCats(strip(result.draft))
      setExtras(stripExtras(result.draftExtras))
    }
    return result
  }

  async function publish() {
    if (dirty && !(await saveDraft())) return
    const result = await run(() => adminApi.post('/rules/publish'), 'Rules published on the website')
    if (result) setBook(result)
  }

  async function unpublish() {
    const result = await run(() => adminApi.post('/rules/unpublish'), 'Rules taken down — the site shows the built-in draft')
    if (result) setBook(result)
  }

  return (
    <>
      <PageHead
        title="Rules"
        sub={
          book.published
            ? `Published ${formatWhen(book.publishedAt)}${unpublishedChanges || dirty ? ' · there are changes not published yet' : ''}`
            : 'Not published from the panel yet — the website shows its built-in draft.'
        }
      >
        <button type="button" className="pbtn pbtn--ghost" onClick={saveDraft} disabled={busy || !dirty || incomplete}>
          Save draft
        </button>
        <button
          type="button"
          className="pbtn pbtn--gold"
          onClick={publish}
          disabled={busy || incomplete || cats.length === 0 || (!dirty && !unpublishedChanges)}
        >
          Publish
        </button>
      </PageHead>

      {incomplete && (
        <p className="p-form-note">
          Every section needs a title, every rule a title and text, every penalty step a title and every glossary entry a term and meaning,
          before saving.
        </p>
      )}

      <Extras extras={extras} setX={setX} />

      {cats.length === 0 && (
        <Panel title="Start the rule book">
          <p className="p-text">Begin from the draft that ships with the website, or start empty.</p>
          <div className="p-row">
            <button type="button" className="pbtn pbtn--gold" onClick={() => setCats(strip(builtInRules))}>
              Import the built-in draft ({builtInRules.length} sections)
            </button>
            <button type="button" className="pbtn pbtn--ghost" onClick={() => setCats([{ id: '', title: '', summary: '', rules: [] }])}>
              Start empty
            </button>
          </div>
        </Panel>
      )}

      {cats.map((cat, ci) => (
        <Panel
          key={ci}
          className="p-rulecat"
          title={`${ci + 1}. ${cat.title || 'Untitled section'}`}
          actions={
            <RowTools
              index={ci}
              count={cats.length}
              label={cat.title || `section ${ci + 1}`}
              onMove={(d) => setCats((list) => move(list, ci, d))}
              onRemove={() => setCats((list) => list.filter((_, i) => i !== ci))}
            />
          }
        >
          <div className="p-form-grid">
            <div className="p-field">
              <label className="p-field__label" htmlFor={`cat-${ci}-title`}>
                Section title
              </label>
              <input
                id={`cat-${ci}-title`}
                className="p-input"
                value={cat.title}
                maxLength={80}
                onChange={(e) => updateCat(ci, { title: e.target.value })}
              />
            </div>
            <div className="p-field">
              <label className="p-field__label" htmlFor={`cat-${ci}-summary`}>
                Summary
              </label>
              <input
                id={`cat-${ci}-summary`}
                className="p-input"
                value={cat.summary}
                maxLength={240}
                onChange={(e) => updateCat(ci, { summary: e.target.value })}
              />
            </div>
          </div>

          <ol className="p-rules" role="list">
            {cat.rules.map((rule, ri) => (
              <li key={ri} className="p-rules__item">
                <span className="p-rows__num">
                  {ci + 1}.{ri + 1}
                </span>
                <div className="p-rules__fields">
                  <input
                    className="p-input"
                    aria-label={`Rule ${ci + 1}.${ri + 1} title`}
                    placeholder="Rule title"
                    value={rule.title}
                    maxLength={120}
                    onChange={(e) => updateRule(ci, ri, { title: e.target.value })}
                  />
                  <textarea
                    className="p-input p-input--area"
                    aria-label={`Rule ${ci + 1}.${ri + 1} text`}
                    placeholder="What the rule says"
                    rows={3}
                    value={rule.text}
                    maxLength={2000}
                    onChange={(e) => updateRule(ci, ri, { text: e.target.value })}
                  />
                  <div className="p-rules__meta">
                    <select
                      className="p-input p-select"
                      aria-label={`Rule ${ci + 1}.${ri + 1} importance`}
                      value={rule.level}
                      onChange={(e) => updateRule(ci, ri, { level: e.target.value })}
                    >
                      {LEVELS.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="p-input"
                      aria-label={`Rule ${ci + 1}.${ri + 1} penalty`}
                      placeholder="Penalty (optional), e.g. Warning, then a 3-day ban"
                      value={rule.penalty}
                      maxLength={160}
                      onChange={(e) => updateRule(ci, ri, { penalty: e.target.value })}
                    />
                  </div>
                </div>
                <RowTools
                  index={ri}
                  count={cat.rules.length}
                  label={rule.title || `rule ${ci + 1}.${ri + 1}`}
                  onMove={(d) => updateCat(ci, { rules: move(cat.rules, ri, d) })}
                  onRemove={() => updateCat(ci, { rules: cat.rules.filter((_, j) => j !== ri) })}
                />
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="pbtn pbtn--ghost pbtn--sm"
            onClick={() => updateCat(ci, { rules: [...cat.rules, { id: '', title: '', text: '', level: 'standard', penalty: '' }] })}
          >
            Add rule
          </button>
        </Panel>
      ))}

      {cats.length > 0 && (
        <div className="p-row p-row--between">
          <button
            type="button"
            className="pbtn pbtn--ghost"
            onClick={() => setCats((list) => [...list, { id: '', title: '', summary: '', rules: [] }])}
          >
            Add section
          </button>
          <span className="p-muted">
            {cats.length} sections · {ruleCount} rules
          </span>
        </div>
      )}

      {book.published && (
        <Panel title="Take the rules down" className="p-card--danger">
          <p className="p-text">The public Rules page goes back to the built-in draft. Your draft here is kept.</p>
          <ConfirmButton onConfirm={unpublish} disabled={busy}>
            Unpublish
          </ConfirmButton>
        </Panel>
      )}
    </>
  )
}

/**
 * The parts of the Rules page around the rules: the important note at the top, how breaking
 * the rules is handled, how to appeal, and the terms the rules use. Each is optional — an
 * empty one simply doesn't show on the page.
 */
function Extras({ extras, setX }) {
  const setStep = (i, change) => setX({ penalties: extras.penalties.map((p, j) => (j === i ? { ...p, ...change } : p)) })
  const setTerm = (i, change) => setX({ glossary: extras.glossary.map((g, j) => (j === i ? { ...g, ...change } : g)) })
  return (
    <>
      <Panel title="Rules page: important note and appeals">
        <div className="p-form-grid">
          <TextField
            label="Important note"
            hint="Shown in a highlighted box at the top of the Rules page. Leave empty to hide it."
            value={extras.notice}
            onChange={(notice) => setX({ notice })}
            maxLength={600}
            multiline
            rows={3}
          />
          <TextField
            label="Appeals"
            hint="How a player can appeal a decision (where to go, what to include, how long it takes). Leave empty to hide."
            value={extras.appeals}
            onChange={(appeals) => setX({ appeals })}
            maxLength={1200}
            multiline
            rows={4}
          />
        </div>
      </Panel>

      <Panel title={`Rules page: penalty steps (${extras.penalties.length})`}>
        <p className="p-text">
          How breaking the rules is handled, in order — e.g. Verbal warning → Written warning → Temporary ban → Permanent ban. Shown as a
          ladder on the Rules page. Mark each rule’s own importance and penalty in its section below.
        </p>
        <ol className="p-rules" role="list">
          {extras.penalties.map((step, i) => (
            <li key={i} className="p-rules__item">
              <span className="p-rows__num">{i + 1}</span>
              <div className="p-rules__fields">
                <input
                  className="p-input"
                  aria-label={`Step ${i + 1} title`}
                  placeholder="Step, e.g. Written warning"
                  value={step.title}
                  maxLength={60}
                  onChange={(e) => setStep(i, { title: e.target.value })}
                />
                <input
                  className="p-input"
                  aria-label={`Step ${i + 1} details`}
                  placeholder="Details (optional)"
                  value={step.text}
                  maxLength={300}
                  onChange={(e) => setStep(i, { text: e.target.value })}
                />
              </div>
              <RowTools
                index={i}
                count={extras.penalties.length}
                label={step.title || `step ${i + 1}`}
                onMove={(d) => setX({ penalties: move(extras.penalties, i, d) })}
                onRemove={() => setX({ penalties: extras.penalties.filter((_, j) => j !== i) })}
              />
            </li>
          ))}
        </ol>
        {extras.penalties.length < 8 && (
          <button
            type="button"
            className="pbtn pbtn--ghost pbtn--sm"
            onClick={() => setX({ penalties: [...extras.penalties, { title: '', text: '' }] })}
          >
            Add step
          </button>
        )}
      </Panel>

      <Panel title={`Rules page: glossary (${extras.glossary.length})`}>
        <p className="p-text">Roleplay terms the rules use (RDM, NLR, metagaming …) with what they mean on this server.</p>
        <ol className="p-rules" role="list">
          {extras.glossary.map((g, i) => (
            <li key={i} className="p-rules__item">
              <span className="p-rows__num">{i + 1}</span>
              <div className="p-rules__fields">
                <input
                  className="p-input"
                  aria-label={`Term ${i + 1}`}
                  placeholder="Term, e.g. NLR"
                  value={g.term}
                  maxLength={40}
                  onChange={(e) => setTerm(i, { term: e.target.value })}
                />
                <textarea
                  className="p-input p-input--area"
                  aria-label={`Term ${i + 1} meaning`}
                  placeholder="What it means here"
                  rows={2}
                  value={g.meaning}
                  maxLength={300}
                  onChange={(e) => setTerm(i, { meaning: e.target.value })}
                />
              </div>
              <RowTools
                index={i}
                count={extras.glossary.length}
                label={g.term || `term ${i + 1}`}
                onMove={(d) => setX({ glossary: move(extras.glossary, i, d) })}
                onRemove={() => setX({ glossary: extras.glossary.filter((_, j) => j !== i) })}
              />
            </li>
          ))}
        </ol>
        {extras.glossary.length < 40 && (
          <button
            type="button"
            className="pbtn pbtn--ghost pbtn--sm"
            onClick={() => setX({ glossary: [...extras.glossary, { term: '', meaning: '' }] })}
          >
            Add term
          </button>
        )}
      </Panel>
    </>
  )
}
