import { useState } from 'react'

import { ruleCategories as builtInRules } from '../../../content/rules'
import { adminApi } from '../panelApi'
import { formatWhen, move, slugify } from '../format'
import { useAction, useResource } from '../hooks'
import { ConfirmButton, ErrorNote, Loading, PageHead, Panel } from '../ui'
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
    rules: rules.map(({ id: rid, title: rt, text }) => ({ id: rid, title: rt, text })),
  }))

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
  const [run, busy] = useAction()

  const saved = JSON.stringify(strip(book.draft ?? []))
  const dirty = JSON.stringify(cats) !== saved
  const unpublishedChanges = book.published ? saved !== JSON.stringify(strip(book.published)) : true
  const ruleCount = cats.reduce((n, c) => n + c.rules.length, 0)
  const incomplete = cats.some((c) => !c.title.trim() || c.rules.some((r) => !r.title.trim() || !r.text.trim()))

  const updateCat = (ci, change) => setCats((list) => list.map((c, i) => (i === ci ? { ...c, ...change } : c)))
  const updateRule = (ci, ri, change) =>
    setCats((list) => list.map((c, i) => (i === ci ? { ...c, rules: c.rules.map((r, j) => (j === ri ? { ...r, ...change } : r)) } : c)))

  async function saveDraft() {
    const categories = withIds(cats)
    const result = await run(() => adminApi.put('/rules/draft', { categories }), 'Draft saved')
    if (result) {
      setBook(result)
      setCats(strip(result.draft))
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

      {incomplete && <p className="p-form-note">Every section needs a title, and every rule a title and text, before saving.</p>}

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
              <input id={`cat-${ci}-title`} className="p-input" value={cat.title} maxLength={80} onChange={(e) => updateCat(ci, { title: e.target.value })} />
            </div>
            <div className="p-field">
              <label className="p-field__label" htmlFor={`cat-${ci}-summary`}>
                Summary
              </label>
              <input id={`cat-${ci}-summary`} className="p-input" value={cat.summary} maxLength={240} onChange={(e) => updateCat(ci, { summary: e.target.value })} />
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
          <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => updateCat(ci, { rules: [...cat.rules, { id: '', title: '', text: '' }] })}>
            Add rule
          </button>
        </Panel>
      ))}

      {cats.length > 0 && (
        <div className="p-row p-row--between">
          <button type="button" className="pbtn pbtn--ghost" onClick={() => setCats((list) => [...list, { id: '', title: '', summary: '', rules: [] }])}>
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
