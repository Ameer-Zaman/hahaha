import { useState } from 'react'

import { loadBuiltInRules } from '../../../lib/ruleBook'
import { BOOK_ICONS, SEVERITIES, levelOf, severityLabel, severityOf } from '../../rules/bookMeta'
import { adminApi } from '../panelApi'
import { formatWhen, move, slugify } from '../format'
import { useAction, useResource } from '../hooks'
import { ConfirmButton, ErrorNote, Loading, PageHead, Panel, Switch, TextField } from '../ui'
import { RowTools } from './Gangs'

/**
 * The rule book. Edits are saved as a draft that only the team sees; "Publish" puts the
 * draft on the public Rules page. Until something is published there, the site shows the
 * built-in book from content/rules.js (the Rameirah Empire Codex rules), which can be
 * imported here with one click.
 *
 * A book has a title, description, icon, optional divisions with sections, and can be locked
 * (only its title and description show). A rule has a number (HON-01), title, short summary,
 * the full text (Markdown: **bold**, - lists, | tables |), severity, tags, and where it sits
 * (division › section).
 */
export default function Rules() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/rules'))
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <RuleEditor book={data} />
}

const list = (v) => (Array.isArray(v) ? v : [])
const strip = (cats) =>
  cats.map((c) => ({
    id: c.id,
    title: c.title,
    summary: c.summary ?? '',
    icon: c.icon ?? '',
    locked: c.locked === true,
    lockedDivisions: list(c.lockedDivisions),
    divisions: list(c.divisions).map((d) => ({ name: d.name, sections: list(d.sections) })),
    updated: c.updated ?? '',
    rules: list(c.rules).map((r) => ({
      id: r.id,
      number: r.number ?? '',
      title: r.title,
      summary: r.summary ?? '',
      text: r.text,
      severity: severityOf(r),
      level: levelOf(severityOf(r)),
      penalty: r.penalty ?? '',
      tags: list(r.tags),
      division: r.division ?? '',
      section: r.section ?? '',
      effective: r.effective ?? '',
      updated: r.updated ?? '',
      version: r.version ?? 1,
    })),
  }))

const NO_EXTRAS = { notice: '', penalties: [], appeals: '', glossary: [] }
const stripExtras = (x) => ({
  notice: x?.notice ?? '',
  penalties: (x?.penalties ?? []).map(({ title, text }) => ({ title, text: text ?? '' })),
  appeals: x?.appeals ?? '',
  glossary: (x?.glossary ?? []).map(({ term, meaning }) => ({ term, meaning })),
})

const today = () => new Date().toISOString().slice(0, 10)
const NEW_RULE = () => ({
  id: '',
  number: '',
  title: '',
  summary: '',
  text: '',
  severity: 'medium',
  level: 'standard',
  penalty: '',
  tags: [],
  division: '',
  section: '',
  effective: today(),
  updated: today(),
  version: 1,
})
const NEW_BOOK = () => ({
  id: '',
  title: '',
  summary: '',
  icon: 'BookOpen',
  locked: false,
  lockedDivisions: [],
  divisions: [],
  updated: '',
  rules: [],
})

/** Gives every book and rule a stable, unique address (#hon-01) before saving. */
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
      rules: c.rules.map((r, i) => ({ ...r, id: unique(r.id || slugify(r.number) || `${cid}-${i + 1}`) })),
    }
  })
}

/** "Police: Dealing with Officers; Traffic Stops" per line ⇄ [{ name, sections }] */
const divisionsToText = (divs) => divs.map((d) => (d.sections.length ? `${d.name}: ${d.sections.join('; ')}` : d.name)).join('\n')
const textToDivisions = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf(':')
      if (at < 0) return { name: line.slice(0, 80), sections: [] }
      return {
        name: line.slice(0, at).trim().slice(0, 80),
        sections: line
          .slice(at + 1)
          .split(';')
          .map((s) => s.trim().slice(0, 120))
          .filter(Boolean),
      }
    })
    .filter((d) => d.name)

/** A text box that only hands its value over when you leave it (for lists typed as text). */
function LazyText({ value, onCommit, multiline, ...rest }) {
  const [draft, setDraft] = useState(null)
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <Tag
      {...rest}
      className={`p-input ${multiline ? 'p-input--area' : ''}`}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null) onCommit(draft)
        setDraft(null)
      }}
    />
  )
}

function RuleEditor({ book: initialBook }) {
  const [book, setBook] = useState(initialBook)
  const [cats, setCats] = useState(() => strip(initialBook.draft ?? []))
  const [extras, setExtras] = useState(() => stripExtras(initialBook.draftExtras ?? NO_EXTRAS))
  const [run, busy] = useAction()
  const [importing, setImporting] = useState(false)

  const saved = JSON.stringify([strip(book.draft ?? []), stripExtras(book.draftExtras)])
  const dirty = JSON.stringify([cats, extras]) !== saved
  const unpublishedChanges = book.published ? saved !== JSON.stringify([strip(book.published), stripExtras(book.publishedExtras)]) : true
  const ruleCount = cats.reduce((n, c) => n + c.rules.length, 0)
  const incomplete =
    cats.some((c) => !c.title.trim() || c.rules.some((r) => !r.title.trim() || !r.text.trim())) ||
    extras.penalties.some((p) => !p.title.trim()) ||
    extras.glossary.some((g) => !g.term.trim() || !g.meaning.trim())
  const setX = (change) => setExtras((x) => ({ ...x, ...change }))

  const updateCat = (ci, change) => setCats((all) => all.map((c, i) => (i === ci ? { ...c, ...change } : c)))
  const updateRule = (ci, ri, change) =>
    setCats((all) =>
      all.map((c, i) =>
        i === ci
          ? {
              ...c,
              rules: c.rules.map((r, j) => {
                if (j !== ri) return r
                const next = { ...r, ...change }
                if (change.severity) next.level = levelOf(change.severity)
                return next
              }),
            }
          : c,
      ),
    )

  async function importBuiltIn() {
    setImporting(true)
    try {
      const b = await loadBuiltInRules()
      setCats(strip(b.categories))
    } finally {
      setImporting(false)
    }
  }

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
    const result = await run(() => adminApi.post('/rules/unpublish'), 'Rules taken down — the site shows the built-in rule book')
    if (result) setBook(result)
  }

  return (
    <>
      <PageHead
        title="Rules"
        sub={
          book.published
            ? `Published ${formatWhen(book.publishedAt)}${unpublishedChanges || dirty ? ' · there are changes not published yet' : ''}`
            : 'Not published from the panel yet — the website shows its built-in rule book (the Codex rules).'
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
          Every book needs a title, every rule a title and text, every penalty step a title and every glossary entry a term and meaning,
          before saving.
        </p>
      )}

      <Panel title={cats.length === 0 ? 'Start the rule book' : 'The Codex rule book'}>
        <p className="p-text">
          The website ships with the full Rameirah Empire Codex rule book (9 books, 129 rules). Load it here, check it, then press Publish.
          {cats.length > 0 &&
            ' Loading it replaces everything in the editor below (nothing changes on the website until you save or publish).'}
        </p>
        <div className="p-row">
          {cats.length === 0 ? (
            <button type="button" className="pbtn pbtn--gold" onClick={importBuiltIn} disabled={importing}>
              {importing ? 'Loading…' : 'Import the Codex rule book'}
            </button>
          ) : (
            <ConfirmButton
              className="pbtn pbtn--ghost"
              onConfirm={importBuiltIn}
              disabled={importing}
              confirmLabel="Click again to replace"
            >
              {importing ? 'Loading…' : 'Replace with the Codex rule book'}
            </ConfirmButton>
          )}
          {cats.length === 0 && (
            <button type="button" className="pbtn pbtn--ghost" onClick={() => setCats([NEW_BOOK()])}>
              Start empty
            </button>
          )}
        </div>
      </Panel>

      <Extras extras={extras} setX={setX} />

      {cats.map((cat, ci) => (
        <BookEditor
          key={ci}
          cat={cat}
          ci={ci}
          count={cats.length}
          onChange={(change) => updateCat(ci, change)}
          onRule={(ri, change) => updateRule(ci, ri, change)}
          onMove={(d) => setCats((all) => move(all, ci, d))}
          onRemove={() => setCats((all) => all.filter((_, i) => i !== ci))}
        />
      ))}

      {cats.length > 0 && (
        <div className="p-row p-row--between">
          <button type="button" className="pbtn pbtn--ghost" onClick={() => setCats((all) => [...all, NEW_BOOK()])}>
            Add book
          </button>
          <span className="p-muted">
            {cats.length} books · {ruleCount} rules
          </span>
        </div>
      )}

      {book.published && (
        <Panel title="Take the rules down" className="p-card--danger">
          <p className="p-text">The public Rules page goes back to the built-in rule book. Your draft here is kept.</p>
          <ConfirmButton onConfirm={unpublish} disabled={busy}>
            Unpublish
          </ConfirmButton>
        </Panel>
      )}
    </>
  )
}

/** A rule folded to one line (number, title, severity); opens to edit. New rules start open. */
function Fold({ startOpen, summary, children }) {
  const [open, setOpen] = useState(startOpen)
  return (
    <details className="p-rule" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="p-rule__sum">{summary}</summary>
      {open && children}
    </details>
  )
}

/** One book: its details, divisions, lock, and its rules (each folds open). */
function BookEditor({ cat, ci, count, onChange, onRule, onMove, onRemove }) {
  const divisionNames = cat.divisions.map((d) => d.name)
  const sectionsOf = (division) => cat.divisions.find((d) => d.name === division)?.sections ?? []
  return (
    <Panel
      className="p-rulecat"
      title={`${ci + 1}. ${cat.title || 'Untitled book'}${cat.locked ? ' · locked' : ''} · ${cat.rules.length} rules`}
      actions={<RowTools index={ci} count={count} label={cat.title || `book ${ci + 1}`} onMove={onMove} onRemove={onRemove} />}
    >
      <div className="p-form-grid">
        <div className="p-field">
          <label className="p-field__label" htmlFor={`cat-${ci}-title`}>
            Book title
          </label>
          <input
            id={`cat-${ci}-title`}
            className="p-input"
            value={cat.title}
            maxLength={80}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>
        <div className="p-field">
          <label className="p-field__label" htmlFor={`cat-${ci}-icon`}>
            Icon
          </label>
          <select id={`cat-${ci}-icon`} className="p-input p-select" value={cat.icon} onChange={(e) => onChange({ icon: e.target.value })}>
            <option value="">Open book (default)</option>
            {BOOK_ICONS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </div>
        <div className="p-field p-field--wide">
          <label className="p-field__label" htmlFor={`cat-${ci}-summary`}>
            Description
          </label>
          <textarea
            id={`cat-${ci}-summary`}
            className="p-input p-input--area"
            rows={2}
            value={cat.summary}
            maxLength={800}
            onChange={(e) => onChange({ summary: e.target.value })}
          />
        </div>
        <div className="p-field p-field--wide">
          <label className="p-field__label" htmlFor={`cat-${ci}-divs`}>
            Divisions and sections (optional)
          </label>
          <LazyText
            id={`cat-${ci}-divs`}
            multiline
            rows={Math.max(2, cat.divisions.length)}
            placeholder={'One division per line, sections after a colon, split by ;\nPolice: Dealing with Officers; Traffic Stops'}
            value={divisionsToText(cat.divisions)}
            onCommit={(t) => {
              const divisions = textToDivisions(t)
              onChange({ divisions, lockedDivisions: cat.lockedDivisions.filter((n) => divisions.some((d) => d.name === n)) })
            }}
          />
        </div>
      </div>

      <div className="p-row p-rulecat__locks">
        <Switch
          checked={cat.locked}
          onChange={(locked) => onChange({ locked })}
          label="Lock this book (show only its title and description)"
        />
        {divisionNames.map((name) => (
          <Switch
            key={name}
            checked={cat.lockedDivisions.includes(name)}
            onChange={(on) =>
              onChange({ lockedDivisions: on ? [...cat.lockedDivisions, name] : cat.lockedDivisions.filter((n) => n !== name) })
            }
            label={`Lock ${name}`}
          />
        ))}
      </div>

      <ol className="p-rules" role="list">
        {cat.rules.map((rule, ri) => {
          const label = rule.number || `${ci + 1}.${ri + 1}`
          const set = (change) => onRule(ri, change)
          return (
            <li key={ri} className="p-rules__item">
              <span className="p-rows__num">{ri + 1}</span>
              <Fold
                startOpen={!rule.title}
                summary={
                  <>
                    <span className="p-rule__num">{label}</span>
                    <span className="p-rule__title">{rule.title || 'New rule'}</span>
                    <span className={`p-rule__sev p-rule__sev--${severityOf(rule)}`}>{severityLabel(rule)}</span>
                  </>
                }
              >
                <div className="p-rules__fields">
                  <div className="p-rule__row">
                    <input
                      className="p-input"
                      aria-label={`Rule ${label} number`}
                      placeholder="Number, e.g. HON-01"
                      value={rule.number}
                      maxLength={20}
                      onChange={(e) => set({ number: e.target.value })}
                    />
                    <input
                      className="p-input"
                      aria-label={`Rule ${label} title`}
                      placeholder="Rule title"
                      value={rule.title}
                      maxLength={120}
                      onChange={(e) => set({ title: e.target.value })}
                    />
                    <select
                      className="p-input p-select"
                      aria-label={`Rule ${label} severity`}
                      value={rule.severity}
                      onChange={(e) => set({ severity: e.target.value })}
                    >
                      {SEVERITIES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    className="p-input"
                    aria-label={`Rule ${label} summary`}
                    placeholder="In short: the rule in one or two sentences"
                    value={rule.summary}
                    maxLength={400}
                    onChange={(e) => set({ summary: e.target.value })}
                  />
                  <textarea
                    className="p-input p-input--area"
                    aria-label={`Rule ${label} text`}
                    placeholder={
                      'The full rule. **bold**, - for a list, 1. for numbered steps, | a | table |. Write a rule number (HON-06) to link to it.'
                    }
                    rows={Math.min(14, Math.max(4, rule.text.split('\n').length + 1))}
                    value={rule.text}
                    maxLength={6000}
                    onChange={(e) => set({ text: e.target.value })}
                  />
                  <div className="p-rule__row">
                    <LazyText
                      aria-label={`Rule ${label} tags`}
                      placeholder="Tags, split by commas"
                      value={rule.tags.join(', ')}
                      onCommit={(t) =>
                        set({
                          tags: t
                            .split(',')
                            .map((s) => s.trim().slice(0, 40))
                            .filter(Boolean)
                            .slice(0, 12),
                        })
                      }
                    />
                    {divisionNames.length > 0 && (
                      <select
                        className="p-input p-select"
                        aria-label={`Rule ${label} division`}
                        value={rule.division}
                        onChange={(e) => set({ division: e.target.value, section: '' })}
                      >
                        <option value="">No division</option>
                        {divisionNames.map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    )}
                    {sectionsOf(rule.division).length > 0 && (
                      <select
                        className="p-input p-select"
                        aria-label={`Rule ${label} section`}
                        value={rule.section}
                        onChange={(e) => set({ section: e.target.value })}
                      >
                        <option value="">No section</option>
                        {sectionsOf(rule.division).map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="p-rule__row">
                    <input
                      className="p-input"
                      aria-label={`Rule ${label} penalty`}
                      placeholder="Penalty (optional, if not already in the text)"
                      value={rule.penalty}
                      maxLength={160}
                      onChange={(e) => set({ penalty: e.target.value })}
                    />
                    <label className="p-rule__mini">
                      In force from
                      <input type="date" className="p-input" value={rule.effective} onChange={(e) => set({ effective: e.target.value })} />
                    </label>
                    <label className="p-rule__mini">
                      Version
                      <input
                        type="number"
                        min={1}
                        max={999}
                        className="p-input"
                        value={rule.version}
                        onChange={(e) => set({ version: Math.max(1, Math.min(999, Number(e.target.value) || 1)), updated: today() })}
                      />
                    </label>
                  </div>
                </div>
              </Fold>
              <RowTools
                index={ri}
                count={cat.rules.length}
                label={rule.title || `rule ${label}`}
                onMove={(d) => onChange({ rules: move(cat.rules, ri, d) })}
                onRemove={() => onChange({ rules: cat.rules.filter((_, j) => j !== ri) })}
              />
            </li>
          )
        })}
      </ol>
      <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => onChange({ rules: [...cat.rules, NEW_RULE()] })}>
        Add rule
      </button>
    </Panel>
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
