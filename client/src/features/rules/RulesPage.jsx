import { useEffect, useMemo, useState } from 'react'

import ApplyLink from '../../components/ui/ApplyLink'
import Arrow from '../../components/ui/Arrow'
import ParallaxScope from '../../components/ui/ParallaxScope'
import ParallaxWord from '../../components/ui/ParallaxWord'
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton'
import usePageTitle from '../../hooks/usePageTitle'
import { useRuleBook } from '../../lib/ruleBook'
import { useCommunityLinks } from '../../lib/siteSettings'
import './rules.css'

/*
 * The Rules page — mandatory reading, and it looks it. Everything here comes from the rule
 * book in Panel → Rules (or the built-in draft until one is published): the rules with their
 * importance and penalty, and the optional note, penalty steps, appeals and glossary. Parts
 * the team hasn't filled in are simply not shown — nothing is made up here.
 */

const LEVEL = {
  serious: { label: 'Serious', short: 'Serious' },
  zero: { label: 'Zero tolerance', short: 'Zero tolerance' },
}
const ACK_KEY = 'rules:read'

function formatDay(value) {
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Text with every match of the search wrapped in <mark>. */
function Hl({ text, q }) {
  if (!q) return text
  const parts = String(text).split(new RegExp(`(${escapeRe(q)})`, 'ig'))
  return parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))
}

/** Tracks which section is being read, for the index highlight. */
function useActiveSection(ids) {
  const [active, setActive] = useState(null)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length) setActive(visible[0].target.id)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [ids])
  return active ?? ids[0]
}

const readAck = () => {
  try {
    return JSON.parse(localStorage.getItem(ACK_KEY) ?? 'null')
  } catch {
    return null
  }
}

export default function RulesPage() {
  usePageTitle('Rules')
  const book = useRuleBook()
  const { categories, extras } = book
  const isDraft = !book.loading && book.status !== 'published'
  const [query, setQuery] = useState('')
  const [importantOnly, setImportantOnly] = useState(false)
  const q = query.trim()

  // every rule keeps its real number (2.3) whatever the filter shows
  const numbered = useMemo(
    () =>
      categories.map((c, ci) => ({
        ...c,
        n: ci + 1,
        rules: c.rules.map((r, ri) => ({ ...r, ref: `${ci + 1}.${ri + 1}`, level: r.level ?? 'standard' })),
      })),
    [categories],
  )
  const allRules = useMemo(() => numbered.flatMap((c) => c.rules.map((r) => ({ ...r, category: c }))), [numbered])
  const zero = allRules.filter((r) => r.level === 'zero')
  const minutes = Math.max(1, Math.round(allRules.reduce((n, r) => n + `${r.title} ${r.text}`.split(/\s+/).length, 0) / 200))

  const shown = useMemo(() => {
    const ql = q.toLowerCase()
    return numbered
      .map((c) => {
        const catHit = ql && `${c.title} ${c.summary}`.toLowerCase().includes(ql)
        const rules = c.rules.filter(
          (r) =>
            (!importantOnly || r.level !== 'standard') &&
            (!ql || catHit || `${r.title} ${r.text} ${r.penalty ?? ''}`.toLowerCase().includes(ql)),
        )
        return { ...c, rules }
      })
      .filter((c) => c.rules.length > 0)
  }, [numbered, q, importantOnly])
  const filtering = Boolean(q) || importantOnly
  const matchCount = shown.reduce((n, c) => n + c.rules.length, 0)

  const hasSteps = extras.penalties.length > 0
  const hasAppeals = Boolean(extras.appeals.trim())
  const hasGlossary = extras.glossary.length > 0
  const extraLinks = [
    hasSteps && { id: 'rules-penalties', title: 'Penalties' },
    hasAppeals && { id: 'rules-appeals', title: 'Appeals' },
    hasGlossary && { id: 'rules-glossary', title: 'Glossary' },
  ].filter(Boolean)
  const ids = useMemo(
    () => [...shown.map((c) => c.id), ...(filtering ? [] : extraLinks.map((l) => l.id))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, filtering, hasSteps, hasAppeals, hasGlossary],
  )
  const active = useActiveSection(ids)

  return (
    <>
      <ParallaxScope as="section" className="page-head page-head--word theme-dark rules-hero" aria-labelledby="rules-title">
        <ParallaxWord text="Rules" motion="x:6%:-10%" className="page-head__word" />
        <div className="container rules-head">
          <div>
            <p className="rules-kicker">
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                <path d="M10 2 1.5 17h17L10 2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M10 8v4.2M10 14.6v.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
              Mandatory reading
            </p>
            <h1 id="rules-title" className="page-head__title">
              Rules
            </h1>
            <p className="lede">
              Every player is expected to know these rules before joining the city. Read them in full before you play — staff act on them.
            </p>
          </div>

          <aside className="rules-card" aria-label="About this rule book">
            <p className={`rules-card__status ${isDraft ? 'is-draft' : ''}`}>
              <span aria-hidden="true" />
              {book.loading ? 'Loading…' : isDraft ? 'Draft — not yet in force' : 'In force'}
            </p>
            {!book.loading && (
              <dl className="rules-card__facts">
                <div>
                  <dt>Sections</dt>
                  <dd>{categories.length}</dd>
                </div>
                <div>
                  <dt>Rules</dt>
                  <dd>{allRules.length}</dd>
                </div>
                <div>
                  <dt>Reading time</dt>
                  <dd>~{minutes} min</dd>
                </div>
              </dl>
            )}
            {!isDraft && book.lastUpdated && (
              <p className="rules-card__line">
                Last updated <time dateTime={book.lastUpdated}>{formatDay(book.lastUpdated)}</time>
              </p>
            )}
            <div className="rules-card__actions">
              {zero.length > 0 && (
                <a className="btn btn--primary btn--small" href="#zero-tolerance">
                  Zero tolerance ({zero.length})
                </a>
              )}
              <button type="button" className="btn btn--ghost btn--small" onClick={() => window.print()}>
                Print / save as PDF
              </button>
            </div>
          </aside>
        </div>
      </ParallaxScope>

      <div className="rules-body theme-black">
        <div className="container">
          {isDraft && (
            <div className="rules-alert rules-alert--draft" role="note">
              <p className="rules-alert__title">Draft — not yet published</p>
              <p className="rules-alert__body">
                These rules are a working draft and may change before launch. The final version will be marked as in force, with the date it
                took effect.
              </p>
            </div>
          )}
          {extras.notice.trim() && (
            <div className="rules-alert" role="note">
              <p className="rules-alert__title">
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                  <circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M10 5.6v5.2M10 13.8v.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
                Important
              </p>
              {extras.notice
                .split(/\n+/)
                .filter(Boolean)
                .map((line, i) => (
                  <p key={i} className="rules-alert__body">
                    {line}
                  </p>
                ))}
            </div>
          )}

          {zero.length > 0 && (
            <section id="zero-tolerance" className="rules-zero" aria-labelledby="zero-title">
              <div className="rules-zero__head">
                <h2 id="zero-title" className="rules-zero__title">
                  Zero tolerance
                </h2>
                <p className="rules-zero__sub">The rules the team treats most seriously. Read these first.</p>
              </div>
              <ol role="list" className="rules-zero__list">
                {zero.map((r) => (
                  <li key={r.id}>
                    <a href={`#${r.id}`} className="rules-zero__item">
                      <span className="rules-zero__ref">{r.ref}</span>
                      <span className="rules-zero__name">{r.title}</span>
                      <Arrow />
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* find a rule: search, or only the serious ones */}
          <div className="rules-tools" role="search">
            <label className="rules-search">
              <span className="visually-hidden">Search the rules</span>
              <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
                <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.7" />
                <path d="M13.5 13.5 18 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                placeholder="Search the rules — e.g. combat, vehicles, NLR"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={`rules-toggle ${importantOnly ? 'is-on' : ''}`}
              aria-pressed={importantOnly}
              onClick={() => setImportantOnly((v) => !v)}
            >
              <span className="rules-toggle__dot" aria-hidden="true" />
              Serious &amp; zero tolerance only
            </button>
            {filtering && (
              <p className="rules-tools__count" role="status">
                {matchCount} {matchCount === 1 ? 'rule' : 'rules'} shown
              </p>
            )}
          </div>

          <div className="rules-layout">
            <nav className="rules-index" aria-label="Rule sections">
              <details className="rules-index__mobile">
                <summary>Jump to a section</summary>
                <IndexList active={active} sections={shown} extra={filtering ? [] : extraLinks} />
              </details>
              <div className="rules-index__desktop">
                <p className="rules-index__label">Contents</p>
                <IndexList active={active} sections={shown} extra={filtering ? [] : extraLinks} />
              </div>
            </nav>

            <div className="rules-content">
              {book.loading && <RulesSkeleton />}

              {!book.loading && filtering && shown.length === 0 && (
                <div className="rules-none">
                  <p className="rules-none__title">No rule matches that</p>
                  <p>Try other words, or clear the search. If you can’t find what you need, ask the staff on Discord before you act.</p>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => {
                      setQuery('')
                      setImportantOnly(false)
                    }}
                  >
                    Clear search
                  </button>
                </div>
              )}

              {shown.map((category) => (
                <section key={category.id} id={category.id} className="rule-cat" aria-labelledby={`${category.id}-title`}>
                  <header className="rule-cat__head">
                    <span className="rule-cat__num" aria-hidden="true">
                      {String(category.n).padStart(2, '0')}
                    </span>
                    <div>
                      <h2 id={`${category.id}-title`} className="rule-cat__title">
                        <Hl text={category.title} q={q} />
                      </h2>
                      {category.summary && (
                        <p className="rule-cat__summary">
                          <Hl text={category.summary} q={q} />
                        </p>
                      )}
                    </div>
                  </header>
                  <ol role="list" className="rule-list">
                    {category.rules.map((rule) => (
                      <Rule key={rule.id} rule={rule} q={q} />
                    ))}
                  </ol>
                </section>
              ))}

              {!filtering && hasSteps && (
                <section id="rules-penalties" className="rules-extra" aria-labelledby="rules-penalties-title">
                  <h2 id="rules-penalties-title" className="rules-extra__title">
                    Penalties
                  </h2>
                  <p className="rules-extra__lede">
                    How breaking the rules is handled. Staff may skip steps for serious or zero-tolerance breaches.
                  </p>
                  <ol role="list" className="rules-ladder">
                    {extras.penalties.map((step, i) => (
                      <li key={i} className="rules-ladder__step" style={{ '--i': i, '--n': extras.penalties.length }}>
                        <span className="rules-ladder__num">{i + 1}</span>
                        <span className="rules-ladder__title">{step.title}</span>
                        {step.text && <span className="rules-ladder__text">{step.text}</span>}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {!filtering && hasAppeals && <Appeals text={extras.appeals} />}

              {!filtering && hasGlossary && (
                <section id="rules-glossary" className="rules-extra" aria-labelledby="rules-glossary-title">
                  <h2 id="rules-glossary-title" className="rules-extra__title">
                    Glossary
                  </h2>
                  <dl className="rules-glossary">
                    {extras.glossary.map((g, i) => (
                      <div key={i}>
                        <dt>{g.term}</dt>
                        <dd>{g.meaning}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {!book.loading && !filtering && <Acknowledge version={book.lastUpdated ?? 'draft'} />}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** One rule: its number (a link to it), title, importance, text, penalty, and a copy-link button. */
function Rule({ rule, q }) {
  const [copied, setCopied] = useState(false)
  const level = LEVEL[rule.level]
  const copy = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${rule.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.hash = rule.id
    }
  }
  return (
    <li id={rule.id} className={`rule rule--${rule.level}`}>
      <a className="rule__ref" href={`#${rule.id}`} aria-label={`Rule ${rule.ref}`}>
        {rule.ref}
      </a>
      <div className="rule__body">
        <div className="rule__top">
          <h3 className="rule__title">
            <Hl text={rule.title} q={q} />
          </h3>
          {level && <span className={`rule__badge rule__badge--${rule.level}`}>{level.label}</span>}
        </div>
        <p className="rule__text">
          <Hl text={rule.text} q={q} />
        </p>
        {rule.penalty && (
          <p className="rule__penalty">
            <span>Penalty</span> <Hl text={rule.penalty} q={q} />
          </p>
        )}
      </div>
      <button type="button" className="rule__copy" onClick={copy} aria-label={`Copy a link to rule ${rule.ref}`}>
        {copied ? (
          <span className="rule__copied">Copied</span>
        ) : (
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path
              d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </li>
  )
}

function Appeals({ text }) {
  const discord = useCommunityLinks().find((l) => l.id === 'discord')?.url
  return (
    <section id="rules-appeals" className="rules-extra" aria-labelledby="rules-appeals-title">
      <h2 id="rules-appeals-title" className="rules-extra__title">
        Appeals
      </h2>
      {text
        .split(/\n\s*\n|\n/)
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="rules-extra__text">
            {p}
          </p>
        ))}
      {discord && (
        <a className="btn btn--ghost btn--small rules-extra__btn" href={discord} target="_blank" rel="noopener noreferrer">
          Go to the Discord <Arrow />
        </a>
      )}
    </section>
  )
}

/** "I've read the rules": remembered in this browser for this version of the rules. */
function Acknowledge({ version }) {
  const [ack, setAck] = useState(readAck)
  const done = ack?.version === version
  const toggle = (on) => {
    const next = on ? { version, at: new Date().toISOString() } : null
    try {
      if (next) localStorage.setItem(ACK_KEY, JSON.stringify(next))
      else localStorage.removeItem(ACK_KEY)
    } catch {
      /* private window: just for this visit */
    }
    setAck(next)
  }
  return (
    <section className={`rules-ack ${done ? 'is-done' : ''}`} aria-labelledby="rules-ack-title">
      <h2 id="rules-ack-title" className="rules-ack__title">
        {done ? 'You’re ready' : 'Before you play'}
      </h2>
      <label className="rules-ack__check">
        <input type="checkbox" checked={done} onChange={(e) => toggle(e.target.checked)} />
        <span className="rules-ack__box" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14">
            <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span>I have read and understood the rules, and I agree to follow them.</span>
      </label>
      {done ? (
        <p className="rules-ack__note">Confirmed on {formatDay(ack.at)}. If the rules change, you’ll be asked to read them again.</p>
      ) : (
        <p className="rules-ack__note">Your application asks you to confirm this too.</p>
      )}
      <ApplyLink className="btn btn--primary btn--large">
        Apply now <Arrow />
      </ApplyLink>
    </section>
  )
}

function IndexList({ active, sections, extra }) {
  return (
    <ol role="list" className="rules-index__list">
      {sections.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="rules-index__link" aria-current={active === s.id ? 'location' : undefined}>
            <span className="rules-index__num">{String(s.n).padStart(2, '0')}</span>
            <span>{s.title}</span>
            {s.rules.some((r) => r.level === 'zero') && <span className="rules-index__flag" title="Has zero-tolerance rules" />}
          </a>
        </li>
      ))}
      {extra.map((l) => (
        <li key={l.id}>
          <a
            href={`#${l.id}`}
            className="rules-index__link rules-index__link--extra"
            aria-current={active === l.id ? 'location' : undefined}
          >
            <span className="rules-index__num">—</span>
            <span>{l.title}</span>
          </a>
        </li>
      ))}
    </ol>
  )
}

/** While the rule book loads: two sections of headings and lines, shimmering. */
function RulesSkeleton() {
  return (
    <SkeletonGroup label="Loading the rules">
      {[0, 1].map((k) => (
        <div key={k} className="rule-cat">
          <Skeleton w="55%" h="2.6rem" style={{ marginBottom: 'var(--sp-3)' }} />
          <Skeleton w="35%" h="1rem" style={{ marginBottom: 'var(--sp-6)' }} />
          {[0, 1, 2].map((r) => (
            <div key={r} style={{ display: 'grid', gap: '0.6rem', marginBottom: 'var(--sp-6)' }}>
              <Skeleton w="40%" h="1.1rem" />
              <Skeleton w="92%" h="0.9rem" />
              <Skeleton w="78%" h="0.9rem" />
            </div>
          ))}
        </div>
      ))}
    </SkeletonGroup>
  )
}
