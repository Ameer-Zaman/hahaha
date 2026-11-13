import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import ApplyLink from '../../components/ui/ApplyLink'
import Arrow from '../../components/ui/Arrow'
import ParallaxScope from '../../components/ui/ParallaxScope'
import ParallaxWord from '../../components/ui/ParallaxWord'
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton'
import usePageTitle from '../../hooks/usePageTitle'
import { useRuleBook } from '../../lib/ruleBook'
import { useCommunityLinks, useSiteSettings } from '../../lib/siteSettings'
import { severityLabel, severityOf } from './bookMeta'
import Markdown, { Hl } from './Markdown'
import { plainText } from './markdownText'
import RuleIcon from './RuleIcon'
import './rules.css'

/*
 * The Rules page — the whole rule book, laid out like the Rameirah Empire Codex: books down the
 * side (with their divisions and sections), one book at a time, every rule with its number,
 * severity and tags, the full text (lists, tables, links between rules), locked books and
 * divisions, a search across everything, and each rule on its own page (/rules/hon-01).
 * Everything comes from the rule book in Panel → Rules, or the built-in Codex book until one is
 * published there. Nothing here is made up.
 */

const ACK_KEY = 'rules:read'
const EXTRA_VIEWS = ['critical', 'penalties', 'appeals', 'glossary']

function formatDay(value) {
  if (!value) return ''
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** "HON-01" → "1", "PD-1.01" → "1.01"; no number → its place in the book. */
function shortRef(number, index) {
  const m = String(number || '').match(/-(\d+)(\.\d+)?$/)
  if (!m) return String(index + 1)
  return `${Number(m[1])}${m[2] ?? ''}`
}

const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const andList = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`)

const readAck = () => {
  try {
    return JSON.parse(localStorage.getItem(ACK_KEY) ?? 'null')
  } catch {
    return null
  }
}

/** Opens the rules helper chat (components/chat/ChatWidget.jsx listens for this). */
const openHelper = () => window.dispatchEvent(new CustomEvent('rules-helper:open'))

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** The rule book, ready to show: numbers, severities, which book each rule is in. */
function useShelf(categories) {
  return useMemo(() => {
    const books = categories.map((c) => {
      const locked = c.locked === true
      const lockedDivisions = c.lockedDivisions ?? []
      const rules = locked
        ? []
        : (c.rules ?? [])
            .filter((r) => !lockedDivisions.includes(r.division))
            .map((r, i) => ({
              ...r,
              ref: shortRef(r.number, i),
              label: r.number || shortRef(r.number, i),
              severity: severityOf(r),
              tags: r.tags ?? [],
              bookId: c.id,
            }))
      const divisions = locked ? [] : (c.divisions ?? []).filter((d) => !lockedDivisions.includes(d.name))
      return { ...c, locked, lockedDivisions, divisions, rules }
    })
    const all = books.flatMap((b) => b.rules.map((r) => ({ rule: r, book: b })))
    const byId = new Map(all.map((e) => [e.rule.id, e]))
    const byNumber = new Map(all.filter((e) => e.rule.number).map((e) => [e.rule.number, e]))
    const updated =
      books
        .map((b) => b.updated || b.rules.reduce((m, r) => (r.updated > m ? r.updated : m), ''))
        .sort()
        .pop() || ''
    return { books, all, byId, byNumber, updated }
  }, [categories])
}

export default function RulesPage() {
  const { ruleId } = useParams()
  const book = useRuleBook()
  const shelf = useShelf(book.categories)
  const isDraft = !book.loading && book.status !== 'published'
  const refTo = (number) => {
    const e = shelf.byNumber.get(number)
    return e ? `/rules?book=${e.book.id}#${e.rule.id}` : null
  }

  return (
    <>
      <ParallaxScope as="section" className="page-head page-head--word theme-dark rules-hero" aria-labelledby="rules-title">
        <ParallaxWord text="Rules" motion="x:6%:-10%" className="page-head__word" />
        <div className="container rules-head">
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
            Every citizen of the Empire is expected to know these rules. Read the rule books before you play — staff act on them.
          </p>
          {!book.loading && shelf.all.length > 0 && (
            <p className="rules-head__facts">
              <span>{shelf.books.length} rule books</span>
              <span>{shelf.all.length} rules</span>
              {shelf.updated && <span>Last updated {formatDay(shelf.updated)}</span>}
            </p>
          )}
        </div>
      </ParallaxScope>

      <div className="rules-body theme-black">
        <div className="container">
          {isDraft && (
            <div className="rules-alert rules-alert--draft" role="note">
              <p className="rules-alert__title">Draft — not yet published</p>
              <p className="rules-alert__body">
                These rules are a working draft and may change. The final version will be marked as in force.
              </p>
            </div>
          )}
          {book.extras.notice.trim() && (
            <div className="rules-alert" role="note">
              <p className="rules-alert__title">
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                  <circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M10 5.6v5.2M10 13.8v.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
                Important
              </p>
              {book.extras.notice
                .split(/\n+/)
                .filter(Boolean)
                .map((line, i) => (
                  <p key={i} className="rules-alert__body">
                    {line}
                  </p>
                ))}
            </div>
          )}

          {book.loading ? (
            <RulesSkeleton />
          ) : ruleId ? (
            <SingleRule shelf={shelf} ruleId={ruleId} refTo={refTo} extras={book.extras} />
          ) : (
            <Browser shelf={shelf} refTo={refTo} extras={book.extras} version={book.lastUpdated ?? shelf.updated ?? 'draft'} />
          )}
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ the books */

function Browser({ shelf, refTo, extras, version }) {
  const [params] = useSearchParams()
  const { hash } = useLocation()
  const [query, setQuery] = useState('')
  const q = query.trim()
  const searchRef = useRef(null)

  // which book: the one holding the rule in the address (#hon-06), else ?book=, else the first
  const hashRule = shelf.byId.get(decodeURIComponent(hash.slice(1)))
  const asked = params.get('book')
  const view = hashRule?.book.id ?? (EXTRA_VIEWS.includes(asked) || shelf.books.some((b) => b.id === asked) ? asked : shelf.books[0]?.id)
  const current = shelf.books.find((b) => b.id === view)
  const critical = shelf.all.filter((e) => e.rule.severity === 'critical')
  const chatOn = useSiteSettings().sections.chat !== false

  usePageTitle(current ? `${current.title} · Rules` : 'Rules')

  // phones: the book chips scroll sideways, so bring the open book's chip into view
  const navRef = useRef(null)
  useEffect(() => {
    const nav = navRef.current
    const chip = nav?.querySelector('.rb-nav__book[aria-current]')
    if (!nav || !chip || nav.scrollWidth <= nav.clientWidth) return
    nav.scrollLeft = chip.offsetLeft - (nav.clientWidth - chip.offsetWidth) / 2
  }, [view, q])

  // "/" jumps to the search, like the Codex
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const navigate = useNavigate()
  const go = (id) => {
    setQuery('')
    navigate(`/rules?book=${id}#books`)
  }

  const more = [
    critical.length > 0 && { id: 'critical', title: 'Critical rules', count: critical.length },
    extras.penalties.length > 0 && { id: 'penalties', title: 'Penalties' },
    extras.appeals.trim() && { id: 'appeals', title: 'Appeals' },
    extras.glossary.length > 0 && { id: 'glossary', title: 'Glossary', count: extras.glossary.length },
  ].filter(Boolean)

  return (
    <div className="rb" id="books">
      <aside className="rb-side" aria-label="Rule books">
        <label className="rb-search">
          <span className="visually-hidden">Search every rule</span>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path d="M13.5 13.5 18 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <input ref={searchRef} type="search" placeholder="Search every rule" value={query} onChange={(e) => setQuery(e.target.value)} />
          <kbd aria-hidden="true">/</kbd>
        </label>

        <nav className="rb-nav" aria-label="Rule books" ref={navRef}>
          <p className="rb-nav__label">Rulebooks</p>
          <ul role="list" className="rb-nav__list">
            {shelf.books.map((b) => {
              const on = !q && b.id === view
              return (
                <li key={b.id}>
                  <Link
                    to={`/rules?book=${b.id}#books`}
                    className="rb-nav__book"
                    aria-current={on ? 'page' : undefined}
                    onClick={() => setQuery('')}
                  >
                    <RuleIcon name={b.icon} size={17} />
                    <span className="rb-nav__name">{b.title}</span>
                    {b.locked ? <LockIcon label="Locked" /> : <span className="rb-nav__count">{b.rules.length}</span>}
                  </Link>
                  {on && b.divisions.length > 0 && (
                    <div className="rb-nav__divs">
                      {b.divisions.map((d) => (
                        <div key={d.name}>
                          <a className="rb-nav__div" href={`#div-${slug(d.name)}`}>
                            {d.name}
                          </a>
                          <ul role="list">
                            {d.sections
                              .filter((s) => b.rules.some((r) => r.division === d.name && r.section === s))
                              .map((s) => (
                                <li key={s}>
                                  <a className="rb-nav__sec" href={`#sec-${slug(`${d.name} ${s}`)}`}>
                                    {s}
                                  </a>
                                </li>
                              ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {more.length > 0 && (
            <>
              <p className="rb-nav__label">More</p>
              <ul role="list" className="rb-nav__list">
                {more.map((m) => (
                  <li key={m.id}>
                    <Link
                      to={`/rules?book=${m.id}#books`}
                      className={`rb-nav__book ${m.id === 'critical' ? 'rb-nav__book--critical' : ''}`}
                      aria-current={!q && view === m.id ? 'page' : undefined}
                      onClick={() => setQuery('')}
                    >
                      <span className="rb-nav__dot" aria-hidden="true" />
                      <span className="rb-nav__name">{m.title}</span>
                      {m.count ? <span className="rb-nav__count">{m.count}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {chatOn && <p className="rb-nav__label">Help</p>}
          {chatOn && (
            <button type="button" className="rb-nav__book rb-nav__ask" onClick={openHelper}>
              <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
                <path d="M3.5 4.5h13v9h-7l-4 3v-3h-2v-9Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              <span className="rb-nav__name">Ask about a scene</span>
            </button>
          )}
        </nav>
      </aside>

      <div className="rb-main rules-content" aria-live="polite">
        {q ? (
          <SearchResults shelf={shelf} q={q} chatOn={chatOn} onPick={() => setQuery('')} onClear={() => setQuery('')} />
        ) : view === 'critical' ? (
          <CriticalList critical={critical} />
        ) : view === 'penalties' ? (
          <Penalties steps={extras.penalties} />
        ) : view === 'appeals' ? (
          <Appeals text={extras.appeals} />
        ) : view === 'glossary' ? (
          <Glossary terms={extras.glossary} />
        ) : current ? (
          <BookView key={current.id} book={current} shelf={shelf} refTo={refTo} onGo={go} />
        ) : (
          <div className="rules-none">
            <p className="rules-none__title">No rules yet</p>
          </div>
        )}

        {!q && <Acknowledge version={version} />}
      </div>
    </div>
  )
}

function LockIcon({ label }) {
  return (
    <svg className="rb-lock" viewBox="0 0 20 20" width="14" height="14" role="img" aria-label={label}>
      <rect x="4" y="9" width="12" height="8.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

/** One book: its heading, description, notes about locked parts, then its rules grouped by division and section. */
function BookView({ book, shelf, refTo, onGo }) {
  const index = shelf.books.findIndex((b) => b.id === book.id)
  const prev = shelf.books[index - 1]
  const next = shelf.books[index + 1]

  // rules in runs of the same division › section, each run with its heading
  const groups = []
  for (const r of book.rules) {
    const key = `${r.division}|${r.section}`
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.rules.push(r)
    else groups.push({ key, division: r.division, section: r.section, rules: [r] })
  }
  const firstOfDivision = new Set()
  const seen = new Set()
  for (const g of groups) {
    if (g.division && !seen.has(g.division)) {
      seen.add(g.division)
      firstOfDivision.add(g)
    }
  }

  return (
    <article className="rb-book" aria-labelledby={`book-${book.id}`}>
      <p className="rb-crumb">Rulebooks</p>
      <header className="rb-book__head">
        <span className="rb-book__icon">
          <RuleIcon name={book.icon} size={22} />
        </span>
        <h2 id={`book-${book.id}`} className="rb-book__title">
          {book.title}
        </h2>
        {!book.locked && book.rules.length > 0 && <CopyBook book={book} />}
      </header>
      {book.summary && <p className="rb-book__desc">{book.summary}</p>}
      {!book.locked && (
        <p className="rb-book__facts">
          {book.rules.length} {book.rules.length === 1 ? 'rule' : 'rules'}
          {book.updated && ` · last updated ${formatDay(book.updated)}`}
        </p>
      )}

      {!book.locked && book.lockedDivisions.length > 0 && (
        <p className="rb-note" role="note">
          <LockIcon label="" />
          The {andList(book.lockedDivisions)} {book.lockedDivisions.length === 1 ? 'section is' : 'sections are'} locked. Those rules will
          be published here when the staff unlock them.
        </p>
      )}

      {book.locked ? (
        <div className="rb-locked" role="note">
          <span className="rb-locked__icon">
            <LockIcon label="" />
          </span>
          <div>
            <p className="rb-locked__title">This book is locked</p>
            <p className="rb-locked__text">Its rules will be published here when the staff unlock it.</p>
          </div>
        </div>
      ) : (
        groups.map((g) => (
          <section
            key={g.key + g.rules[0].id}
            className="rb-group"
            id={g.section ? `sec-${slug(`${g.division} ${g.section}`)}` : undefined}
            aria-label={[g.division, g.section].filter(Boolean).join(' · ') || undefined}
          >
            {firstOfDivision.has(g) && <span id={`div-${slug(g.division)}`} className="rb-anchor" />}
            {(g.division || g.section) && (
              <h3 className="rb-group__title">
                {g.division && <span>{g.division}</span>}
                {g.division && g.section && <span aria-hidden="true"> · </span>}
                {g.section && <span className="rb-group__sec">{g.section}</span>}
              </h3>
            )}
            <ol role="list" className="rb-rules">
              {g.rules.map((r) => (
                <RuleItem key={r.id} rule={r} refTo={refTo} />
              ))}
            </ol>
          </section>
        ))
      )}

      <nav className="rb-pager" aria-label="Other rule books">
        {prev ? (
          <button type="button" className="rb-pager__link" onClick={() => onGo(prev.id)}>
            <span className="rb-pager__dir">← Previous</span>
            <span className="rb-pager__name">{prev.title}</span>
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button type="button" className="rb-pager__link rb-pager__link--next" onClick={() => onGo(next.id)}>
            <span className="rb-pager__dir">Next →</span>
            <span className="rb-pager__name">{next.title}</span>
          </button>
        )}
      </nav>
    </article>
  )
}

/** Copy the whole book as text; the arrow offers Markdown or a link instead. */
function CopyBook({ book }) {
  const [done, setDone] = useState('')
  const [menu, setMenu] = useState(false)
  const wrap = useRef(null)
  useEffect(() => {
    if (!menu) return undefined
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !wrap.current?.contains(e.target)) setMenu(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [menu])

  const asText = () =>
    [
      book.title,
      book.summary,
      ...book.rules.map(
        (r) =>
          `${r.label} · ${r.title}${r.division ? ` (${[r.division, r.section].filter(Boolean).join(' › ')})` : ''}\n${plainText(r.text)}${r.penalty ? `\nPenalty: ${r.penalty}` : ''}`,
      ),
    ]
      .filter(Boolean)
      .join('\n\n')
  const asMarkdown = () =>
    [
      `# ${book.title}`,
      book.summary,
      ...book.rules.map((r) => `## ${r.label} · ${r.title}\n\n${r.text}${r.penalty ? `\n\n**Penalty:** ${r.penalty}` : ''}`),
    ]
      .filter(Boolean)
      .join('\n\n')
  const link = () => `${window.location.origin}/rules?book=${book.id}`

  const run = async (make, what) => {
    setMenu(false)
    setDone((await copyText(make())) ? what : 'Could not copy')
    window.setTimeout(() => setDone(''), 1800)
  }

  return (
    <div className="rb-copy" ref={wrap}>
      <button type="button" className="rb-copy__main" onClick={() => run(asText, 'Copied')}>
        <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
          <rect x="6.5" y="6.5" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M13.5 6.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v7A1.5 1.5 0 0 0 5 13.5h1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
        <span role="status">{done || 'Copy'}</span>
      </button>
      <button
        type="button"
        className="rb-copy__more"
        aria-expanded={menu}
        aria-label="More ways to copy"
        onClick={() => setMenu((v) => !v)}
      >
        <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
          <path
            d="m5.5 8 4.5 4.5L14.5 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {menu && (
        <div className="rb-copy__menu" role="menu">
          <button type="button" role="menuitem" onClick={() => run(asText, 'Copied')}>
            Copy as text
          </button>
          <button type="button" role="menuitem" onClick={() => run(asMarkdown, 'Copied')}>
            Copy as Markdown
          </button>
          <button type="button" role="menuitem" onClick={() => run(link, 'Link copied')}>
            Copy link to this book
          </button>
        </div>
      )}
    </div>
  )
}

/** One rule in a book: number and title, its meta line (number · severity · tags · open on its own), the text. */
function RuleItem({ rule, refTo }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (await copyText(`${window.location.origin}/rules/${rule.id}`)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }
  return (
    <li id={rule.id} className={`rb-rule rb-rule--${rule.severity}`}>
      <h3 className="rb-rule__title">
        <a href={`#${rule.id}`} className="rb-rule__ref">
          {rule.ref}.
        </a>{' '}
        {rule.title}
      </h3>
      <p className="rb-rule__meta">
        {rule.number && <span className="rb-rule__num">{rule.number}</span>}
        <span className={`rb-sev rb-sev--${rule.severity}`}>{severityLabel(rule)}</span>
        {rule.tags.length > 0 && <span className="rb-rule__tags">{rule.tags.join(', ')}</span>}
        <Link to={`/rules/${rule.id}`} className="rb-rule__open">
          Open on its own
        </Link>
      </p>
      <Markdown text={rule.text} refTo={refTo} />
      {rule.penalty && (
        <p className="md-penalty">
          <strong>Penalty:</strong> {rule.penalty}
        </p>
      )}
      <button type="button" className="rb-rule__copy" onClick={copy} aria-label={`Copy a link to rule ${rule.label}`}>
        {copied ? (
          <span className="rb-rule__copied">Copied</span>
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

/* ------------------------------------------------------------------ search */

function SearchResults({ shelf, q, chatOn, onPick, onClear }) {
  const ql = q.toLowerCase()
  const hits = useMemo(
    () =>
      shelf.all
        .map(({ rule, book }) => {
          const text = plainText(rule.text)
          const fields = [rule.number, rule.title, rule.summary, rule.tags.join(' '), rule.division, rule.section, book.title]
          const inMeta = fields.some((f) =>
            String(f ?? '')
              .toLowerCase()
              .includes(ql),
          )
          const at = text.toLowerCase().indexOf(ql)
          if (!inMeta && at < 0 && !(rule.penalty ?? '').toLowerCase().includes(ql)) return null
          const titleHit = `${rule.number} ${rule.title}`.toLowerCase().includes(ql)
          let snippet = rule.summary || text.slice(0, 180)
          if (at >= 0 && !String(rule.summary).toLowerCase().includes(ql)) {
            const from = Math.max(0, at - 70)
            snippet = `${from > 0 ? '…' : ''}${text.slice(from, at + q.length + 110).replace(/\s+/g, ' ')}…`
          }
          return { rule, book, snippet, score: titleHit ? 0 : inMeta ? 1 : 2 }
        })
        .filter(Boolean)
        .sort((a, b) => a.score - b.score),
    [shelf, ql, q.length],
  )

  return (
    <section className="rb-results" aria-labelledby="rb-results-title">
      <p className="rb-crumb">Search</p>
      <h2 id="rb-results-title" className="rb-book__title">
        {hits.length} {hits.length === 1 ? 'rule matches' : 'rules match'} “{q}”
      </h2>
      {hits.length === 0 ? (
        <div className="rules-none">
          <p className="rules-none__title">No rule matches that</p>
          <p>
            Try other words, or ask the rules helper about your scene. If you can’t find what you need, ask the staff on Discord before you
            act.
          </p>
          <div className="rb-row">
            <button type="button" className="btn btn--ghost btn--small" onClick={onClear}>
              Clear search
            </button>
            {chatOn && (
              <button type="button" className="btn btn--primary btn--small" onClick={openHelper}>
                Ask about a scene
              </button>
            )}
          </div>
        </div>
      ) : (
        <ul role="list" className="rb-cards">
          {hits.map(({ rule, book, snippet }) => (
            <li key={rule.id}>
              <Link to={`/rules?book=${book.id}#${rule.id}`} className="rb-card" onClick={onPick}>
                <span className="rb-card__top">
                  <span className="rb-rule__num">{rule.label}</span>
                  <span className={`rb-sev rb-sev--${rule.severity}`}>{severityLabel(rule)}</span>
                  <span className="rb-card__book">{[book.title, rule.division, rule.section].filter(Boolean).join(' › ')}</span>
                </span>
                <span className="rb-card__title">
                  <Hl text={rule.title} q={q} />
                </span>
                <span className="rb-card__text">
                  <Hl text={snippet} q={q} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CriticalList({ critical }) {
  return (
    <section className="rb-results" aria-labelledby="rb-critical-title">
      <p className="rb-crumb">More</p>
      <h2 id="rb-critical-title" className="rb-book__title">
        Critical rules
      </h2>
      <p className="rb-book__desc">The rules marked Critical across every book — the ones staff treat most seriously. Read these first.</p>
      <ul role="list" className="rb-cards">
        {critical.map(({ rule, book }) => (
          <li key={rule.id}>
            <Link to={`/rules?book=${book.id}#${rule.id}`} className="rb-card rb-card--critical">
              <span className="rb-card__top">
                <span className="rb-rule__num">{rule.label}</span>
                <span className="rb-card__book">{book.title}</span>
              </span>
              <span className="rb-card__title">{rule.title}</span>
              {rule.summary && <span className="rb-card__text">{rule.summary}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------ a rule on its own page */

function SingleRule({ shelf, ruleId, refTo, extras }) {
  const navigate = useNavigate()
  const entry = shelf.byId.get(ruleId)
  usePageTitle(entry ? `${entry.rule.label} ${entry.rule.title} · Rules` : 'Rules')
  const [copied, setCopied] = useState(false)
  const chatOn = useSiteSettings().sections.chat !== false

  const rules = entry?.book.rules ?? []
  const at = rules.findIndex((r) => r.id === ruleId)
  const prev = rules[at - 1]
  const next = rules[at + 1]

  // ← and → turn the page
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (e.key === 'ArrowLeft' && prev) navigate(`/rules/${prev.id}`)
      if (e.key === 'ArrowRight' && next) navigate(`/rules/${next.id}`)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [prev, next, navigate])

  if (!entry) {
    return (
      <div className="rules-none rb-single__missing">
        <p className="rules-none__title">That rule isn’t in the rule book</p>
        <p>It may have been renumbered, or it’s in a part that’s still locked.</p>
        <Link className="btn btn--ghost btn--small" to="/rules">
          All rules
        </Link>
      </div>
    )
  }
  const { rule, book } = entry

  // more from the same book: same section first, then rules that share tags, then the rest
  const others = rules
    .filter((r) => r.id !== rule.id && r.id !== prev?.id && r.id !== next?.id)
    .map((r) => ({
      r,
      score: (r.section && r.section === rule.section ? 3 : 0) + r.tags.filter((t) => t !== book.title && rule.tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.r)

  const copy = async () => {
    if (await copyText(`${window.location.origin}/rules/${rule.id}`)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <article className={`rb-single rb-rule--${rule.severity}`} aria-labelledby="rb-single-title">
      <Link to={`/rules?book=${book.id}#${rule.id}`} className="rb-single__back">
        ← All rules
      </Link>

      <div className="rb-single__card">
        <dl className="rb-single__facts">
          <div className="rb-single__number">
            <dt className="visually-hidden">Rule</dt>
            <dd>{rule.label}</dd>
          </div>
          <div>
            <dt>Severity</dt>
            <dd>
              <span className={`rb-sev rb-sev--${rule.severity}`}>{severityLabel(rule)}</span>
            </dd>
          </div>
          <div>
            <dt>Book</dt>
            <dd>
              <Link to={`/rules?book=${book.id}#books`}>{book.title}</Link>
            </dd>
          </div>
          {(rule.division || rule.section) && (
            <div>
              <dt>Part</dt>
              <dd>{[rule.division, rule.section].filter(Boolean).join(' › ')}</dd>
            </div>
          )}
          {rule.effective && (
            <div>
              <dt>In force</dt>
              <dd>{formatDay(rule.effective)}</dd>
            </div>
          )}
          {rule.version ? (
            <div>
              <dt>Version</dt>
              <dd>{rule.version}</dd>
            </div>
          ) : null}
        </dl>

        <h2 id="rb-single-title" className="rb-single__title">
          {rule.title}
        </h2>
        {rule.summary && <p className="rb-single__summary">{rule.summary}</p>}

        <div className="rb-single__tools">
          <button type="button" className="btn btn--ghost btn--small" onClick={copy}>
            <span role="status">{copied ? 'Link copied' : 'Copy link to this rule'}</span>
          </button>
          {rule.tags.length > 0 && (
            <ul role="list" className="rb-tags" aria-label="Tags">
              {rule.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </div>

        <Markdown text={rule.text} refTo={refTo} className="md md--single" />
        {rule.penalty && (
          <p className="md-penalty">
            <strong>Penalty:</strong> {rule.penalty}
          </p>
        )}

        <p className="rb-single__where">
          Rule {at + 1} of {rules.length} in {book.title} · the ← and → keys turn the page
        </p>
      </div>

      <nav className="rb-pager" aria-label="Previous and next rule">
        {prev ? (
          <Link to={`/rules/${prev.id}`} className="rb-pager__link">
            <span className="rb-pager__dir">← Previous · {prev.label}</span>
            <span className="rb-pager__name">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/rules/${next.id}`} className="rb-pager__link rb-pager__link--next">
            <span className="rb-pager__dir">Next · {next.label} →</span>
            <span className="rb-pager__name">{next.title}</span>
          </Link>
        )}
      </nav>

      {others.length > 0 && (
        <section className="rb-more" aria-labelledby="rb-more-title">
          <h3 id="rb-more-title" className="rb-more__title">
            More from {book.title}
          </h3>
          <ul role="list" className="rb-cards rb-cards--grid">
            {others.map((r) => (
              <li key={r.id}>
                <Link to={`/rules/${r.id}`} className="rb-card">
                  <span className="rb-card__top">
                    <span className="rb-rule__num">{r.label}</span>
                  </span>
                  <span className="rb-card__title">{r.title}</span>
                  {r.summary && <span className="rb-card__text">{r.summary}</span>}
                  <span className={`rb-sev rb-sev--${r.severity}`}>{severityLabel(r)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {chatOn && (
        <section className="rb-help" aria-labelledby="rb-help-title">
          <div>
            <h3 id="rb-help-title" className="rb-help__title">
              Not sure which rule covers it?
            </h3>
            <p className="rb-help__text">
              Describe the scene in your own words. The rules helper answers with the rule that applies, by number.
            </p>
          </div>
          <button type="button" className="btn btn--primary btn--small" onClick={openHelper}>
            Ask about a scene
          </button>
        </section>
      )}
      {extras.appeals.trim() && (
        <p className="rb-single__appeal">
          Think a decision was wrong? <Link to="/rules?book=appeals#books">How to appeal</Link>
        </p>
      )}
    </article>
  )
}

/* ------------------------------------------------------------------ penalties, appeals, glossary, the pledge */

function Penalties({ steps }) {
  return (
    <section className="rules-extra" aria-labelledby="rules-penalties-title">
      <p className="rb-crumb">More</p>
      <h2 id="rules-penalties-title" className="rb-book__title">
        Penalties
      </h2>
      <p className="rules-extra__lede">How breaking the rules is handled. Staff may skip steps for serious or critical breaches.</p>
      <ol role="list" className="rules-ladder">
        {steps.map((step, i) => (
          <li key={i} className="rules-ladder__step" style={{ '--i': i, '--n': steps.length }}>
            <span className="rules-ladder__num">{i + 1}</span>
            <span className="rules-ladder__title">{step.title}</span>
            {step.text && <span className="rules-ladder__text">{step.text}</span>}
          </li>
        ))}
      </ol>
    </section>
  )
}

function Appeals({ text }) {
  const discord = useCommunityLinks().find((l) => l.id === 'discord')?.url
  return (
    <section className="rules-extra" aria-labelledby="rules-appeals-title">
      <p className="rb-crumb">More</p>
      <h2 id="rules-appeals-title" className="rb-book__title">
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

function Glossary({ terms }) {
  return (
    <section className="rules-extra" aria-labelledby="rules-glossary-title">
      <p className="rb-crumb">More</p>
      <h2 id="rules-glossary-title" className="rb-book__title">
        Glossary
      </h2>
      <dl className="rules-glossary">
        {terms.map((g, i) => (
          <div key={i}>
            <dt>{g.term}</dt>
            <dd>{g.meaning}</dd>
          </div>
        ))}
      </dl>
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
        <span>I have read and understood every rule book, and I agree to follow them.</span>
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

/** While the rule book loads: the side list and a book of lines, shimmering. */
function RulesSkeleton() {
  return (
    <SkeletonGroup label="Loading the rules">
      <div className="rb">
        <div className="rb-side">
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <Skeleton key={k} w="85%" h="1.1rem" style={{ marginBottom: 'var(--sp-3)' }} />
          ))}
        </div>
        <div className="rb-main">
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
      </div>
    </SkeletonGroup>
  )
}
