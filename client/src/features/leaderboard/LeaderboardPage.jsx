import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import ParallaxScope from '../../components/ui/ParallaxScope'
import ParallaxWord from '../../components/ui/ParallaxWord'
import usePageTitle from '../../hooks/usePageTitle'
import { usePublic } from '../../lib/publicData'
import { useGangFiles } from '../gangs/gangsModel'
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton'
import { formatKd, rankTdm, rankWars } from './ranking'
import './leaderboard.css'

const TABS = [
  { id: 'tdm', label: 'TDM' },
  { id: 'war', label: 'War' },
]

/**
 * Leaderboard: TDM (players, entered in the panel) and War (gangs, worked out from the war
 * records). The tab lives in the address (?tab=war) so either board can be linked directly.
 */
export default function LeaderboardPage() {
  usePageTitle('Leaderboard')
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'war' ? 'war' : 'tdm'
  const tabRefs = useRef({})

  const select = (id, focus = false) => {
    setParams(id === 'tdm' ? {} : { tab: id }, { replace: true })
    if (focus) requestAnimationFrame(() => tabRefs.current[id]?.focus())
  }
  const onTabKey = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const i = TABS.findIndex((t) => t.id === tab)
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? TABS.length - 1
          : (i + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length
    select(TABS[next].id, true)
  }

  return (
    <>
      <ParallaxScope as="section" className="page-head page-head--word theme-dark" aria-labelledby="lb-title">
        <ParallaxWord text="Ranks" motion="x:6%:-10%" className="page-head__word" />
        <div className="container">
          <h1 id="lb-title" className="page-head__title">
            Leaderboard
          </h1>
          <p className="lede">
            Who runs the arena and who runs the streets: TDM players ranked by kills, gangs ranked by their war record.
          </p>
        </div>
      </ParallaxScope>

      <section className="lb theme-black section" aria-label="Leaderboards">
        <div className="container">
          <div className="lb-tabs" role="tablist" aria-label="Leaderboard">
            {TABS.map((t) => (
              <button
                key={t.id}
                ref={(el) => (tabRefs.current[t.id] = el)}
                type="button"
                role="tab"
                id={`lb-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`lb-panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                className={`lb-tab ${tab === t.id ? 'is-active' : ''}`}
                onClick={() => select(t.id)}
                onKeyDown={onTabKey}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`lb-panel-${tab}`} aria-labelledby={`lb-tab-${tab}`} tabIndex={0} className="lb-panel">
            {tab === 'tdm' ? <TdmBoard /> : <WarBoard />}
          </div>
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------------------- TDM */

const TDM_COLUMNS = [
  { key: 'kills', label: 'Kills' },
  { key: 'ratio', label: 'K/D', format: (r) => formatKd(r.kills, r.deaths) },
]

function TdmBoard() {
  const entry = usePublic('/tdm', { refreshMs: 60_000 })
  const [query, setQuery] = useState('')
  const ranked = useMemo(() => rankTdm(entry.data?.players), [entry.data])

  if (entry.status === 'loading') return <BoardSkeleton label="Loading the TDM board" />
  if (ranked.length === 0) {
    return (
      <Empty title="No TDM results yet" action={{ to: '/gangs', label: 'See the gangs' }}>
        The board fills in once the team posts the first match results.
      </Empty>
    )
  }

  const columns = TDM_COLUMNS
  const q = query.trim().toLowerCase()
  const shown = q ? ranked.filter((r) => r.name.toLowerCase().includes(q)) : ranked

  return (
    <div className="reveal-stagger">
      {!q && (
        <Podium
          rows={ranked.slice(0, 3)}
          rankedRows={ranked}
          stats={(r) => [
            { label: 'Kills', value: r.kills },
            { label: 'K/D', value: formatKd(r.kills, r.deaths) },
          ]}
        />
      )}
      <div className="lb-tools">
        <label className="lb-search">
          <span className="visually-hidden">Find a player</span>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M13.5 13.5 18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input type="search" placeholder="Find a player" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      <RankTable
        caption="TDM leaderboard"
        rows={shown}
        rowKey={(r) => r.name}
        nameHeader="Player"
        renderName={(r) => <span className="lb-name">{r.name}</span>}
        columns={columns}
        empty={`No player matches “${query}”.`}
      />
    </div>
  )
}

/* ------------------------------------------------------------------- War */

/**
 * War standings: one precise row per gang — rank, last result, wins and losses in their own
 * columns, wars played and the last five wars. No podium: the top three are marked by their
 * rank badge, so the whole table reads at one level.
 */
function WarBoard() {
  const { files, ready } = useGangFiles()
  const ranked = useMemo(() => rankWars(files), [files])
  const totals = useMemo(() => warTotals(files), [files])
  const [sort, setSort] = useState({ key: 'rank', dir: 'asc' })
  const rows = useMemo(() => {
    if (sort.key === 'rank') return ranked
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...ranked].sort((a, b) => (a[sort.key] - b[sort.key]) * dir || a.rank - b.rank)
  }, [ranked, sort])

  if (!ready) return <BoardSkeleton label="Loading the war record" podium={false} />
  if (ranked.length === 0) {
    return (
      <Empty title="No wars on the record yet" action={{ to: '/gangs', label: 'See the gangs' }}>
        Standings appear here as soon as the first war between gangs is logged.
      </Empty>
    )
  }
  const demo = ranked.some((r) => r.demo)
  const toggle = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'rank' ? 'asc' : 'desc' }))
  const ariaSort = (key) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none')

  return (
    <div className="reveal-stagger">
      {demo && (
        <p className="lb-demo" role="note">
          Demo data — example gangs and wars, shown until the real ones are published.
        </p>
      )}

      <dl className="wb-totals" aria-label="The war record in numbers">
        <div>
          <dt>Wars logged</dt>
          <dd>{totals.wars}</dd>
        </div>
        <div>
          <dt>Gangs ranked</dt>
          <dd>{ranked.length}</dd>
        </div>
      </dl>

      <table className="wb">
        <caption className="visually-hidden">War standings</caption>
        <thead>
          <tr>
            <th scope="col" className="wb__rank" aria-sort={ariaSort('rank')}>
              <SortButton active={sort.key === 'rank'} dir={sort.dir} onClick={() => toggle('rank')}>
                #
              </SortButton>
            </th>
            <th scope="col" className="wb__gang">
              Gang
            </th>
            <th scope="col" className="wb__num wb__num--win" aria-sort={ariaSort('wins')} title="Wins">
              <SortButton active={sort.key === 'wins'} dir={sort.dir} onClick={() => toggle('wins')}>
                W
              </SortButton>
            </th>
            <th scope="col" className="wb__num wb__num--loss" aria-sort={ariaSort('losses')} title="Losses">
              <SortButton active={sort.key === 'losses'} dir={sort.dir} onClick={() => toggle('losses')}>
                L
              </SortButton>
            </th>
            <th scope="col" className="wb__num wb__num--played" aria-sort={ariaSort('played')} title="Wars played">
              <SortButton active={sort.key === 'played'} dir={sort.dir} onClick={() => toggle('played')}>
                Wars
              </SortButton>
            </th>
            <th scope="col" className="wb__form">
              <span className="wb__form-head--5">Last 5</span>
              <span className="wb__form-head--3">Last 3</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className={r.rank <= 3 ? `is-top is-top-${r.rank}` : ''}>
              <td className="wb__rank">
                <span className="lb-rank">{r.rank}</span>
              </td>
              <th scope="row" className="wb__gang">
                <Link to={`/gangs/${r.slug}`} className="wb__name">
                  <Emblem src={r.emblem} name={r.name} />
                  <span className="wb__name-text">{r.name}</span>
                </Link>
                {r.last && <LastWar war={r.last} />}
              </th>
              <td className="wb__num wb__num--win" data-label="W">
                <span className="visually-hidden">Wins: </span>
                {r.wins}
              </td>
              <td className="wb__num wb__num--loss" data-label="L">
                <span className="visually-hidden">Losses: </span>
                {r.losses}
              </td>
              <td className="wb__num wb__num--played" data-label="Wars">
                <span className="visually-hidden">Wars played: </span>
                {r.played}
              </td>
              <td className="wb__form">
                <Form outcomes={r.form} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="lb-note">Ranked by most wins, then fewest losses, then most wars.</p>
    </div>
  )
}

/** Every war counted once (each one appears in both gangs' records). */
function warTotals(files = []) {
  const seen = new Map()
  for (const f of files) for (const w of f.record?.wars ?? []) seen.set(w.id ?? `${w.date}|${w.opponent}|${f.slug}`, w.outcome)
  return { wars: seen.size }
}

const LAST_VERB = { win: 'Beat', loss: 'Lost to', draw: 'Drew with' }

function LastWar({ war }) {
  return (
    <span className="wb__last">
      <span className={`wb__last-dot wb__last-dot--${war.outcome}`} aria-hidden="true" />
      <span>
        Last: {LAST_VERB[war.outcome]} {war.opponent}
        {war.date && (
          <>
            {' · '}
            <time dateTime={war.date}>{formatWarDate(war.date)}</time>
          </>
        )}
      </span>
    </span>
  )
}

function formatWarDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
}

/* ---------------------------------------------------------------- shared */

/** While a board loads: a podium and a few table rows, shimmering. */
function BoardSkeleton({ label, podium = true }) {
  return (
    <SkeletonGroup label={label}>
      {podium && (
        <div className="lb-podium lb-podium--skeleton">
          {[2, 1, 3].map((p) => (
            <div key={p} className={`lb-podium__card lb-podium__card--pos${p}`}>
              <Skeleton w="100%" h="100%" radius={16} />
            </div>
          ))}
        </div>
      )}
      <div className="lb-table-wrap lb-table-wrap--skeleton">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="lb-skel-row">
            <Skeleton w="2rem" h="2rem" radius={999} />
            <Skeleton w={`${40 - i * 4}%`} h="1rem" />
            <Skeleton w="18%" h="1rem" style={{ marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  )
}

const MEDAL = ['gold', 'silver', 'bronze']
const PLACE = ['1st', '2nd', '3rd']

const CROWN = (
  <svg viewBox="0 0 24 16" width="26" height="18" aria-hidden="true" className="lb-podium__crown">
    <path d="M2 14h20l1.5-11-6.5 5L12 1 7 8 .5 3z" fill="currentColor" />
  </svg>
)

/**
 * The top three as trophy cards: second, first, third on wide screens (first raised, with a
 * crown); first to third on phones. Each card: a metal medal with the place, the name, and
 * its numbers on a strip along the bottom.
 */
function Podium({ rows, stats, link, rankedRows = rows }) {
  if (rows.length === 0) return null
  return (
    <ol className="lb-podium" aria-label="Top three">
      {rows.map((r, i) => {
        const medal = MEDAL[Math.min(r.rank, 3) - 1] ?? MEDAL[i]
        // several can share a place, so say so rather than printing the same number twice
        const joint = rankedRows.filter((o) => o.rank === r.rank).length > 1
        const place = PLACE[r.rank - 1] ?? `${r.rank}th`
        const body = (
          <>
            <span className="lb-podium__top">
              {r.rank === 1 && CROWN}
              <span className="lb-podium__medal" aria-hidden="true">
                <span>{r.rank}</span>
              </span>
              <span className="lb-podium__place">
                {joint && <span className="lb-podium__joint">Joint</span>}
                {place}
              </span>
            </span>
            <span className="lb-podium__name">{r.name}</span>
            <span className="lb-podium__stats">
              {stats(r).map((s) => (
                <span key={s.label} className="lb-podium__stat">
                  <b>{s.value}</b>
                  <small>{s.label}</small>
                </span>
              ))}
            </span>
          </>
        )
        return (
          <li key={r.name} className={`lb-podium__card lb-podium__card--${medal} lb-podium__card--pos${i + 1}`}>
            <span className="visually-hidden">
              {joint ? 'Joint ' : ''}rank {r.rank}:{' '}
            </span>
            {link ? (
              <Link to={link(r)} className="lb-podium__body lb-podium__body--link">
                {body}
              </Link>
            ) : (
              <div className="lb-podium__body">{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** The full table. Column headers sort the view; the rank number always stays the real rank. */
function RankTable({ caption, rows, rowKey, nameHeader, renderName, columns, empty }) {
  const [sort, setSort] = useState({ key: 'rank', dir: 'asc' })
  const sorted = useMemo(() => {
    if (sort.key === 'rank') return rows
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => (a[sort.key] - b[sort.key]) * dir || a.rank - b.rank)
  }, [rows, sort])

  const toggle = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'rank' ? 'asc' : 'desc' }))
  const ariaSort = (key) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none')

  return (
    <div className="lb-table-wrap">
      <table className="lb-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" aria-sort={ariaSort('rank')} className="lb-col-rank">
              <SortButton active={sort.key === 'rank'} dir={sort.dir} onClick={() => toggle('rank')}>
                #
              </SortButton>
            </th>
            <th scope="col" className="lb-col-name">
              {nameHeader}
            </th>
            {columns.map((c) => (
              <th key={c.key} scope="col" aria-sort={c.sortable === false ? undefined : ariaSort(c.key)} title={c.title}>
                {c.sortable === false ? (
                  c.label
                ) : (
                  <SortButton active={sort.key === c.key} dir={sort.dir} onClick={() => toggle(c.key)}>
                    {c.label}
                  </SortButton>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 2} className="lb-table__empty">
                {empty}
              </td>
            </tr>
          ) : (
            sorted.map((r) => (
              <tr key={rowKey(r)} className={r.rank <= 3 ? `is-top is-top-${r.rank}` : ''}>
                <td className="lb-col-rank">
                  <span className="lb-rank">{r.rank}</span>
                </td>
                <th scope="row" className="lb-col-name">
                  {renderName(r)}
                </th>
                {columns.map((c) => (
                  <td key={c.key} data-label={c.label.length <= 2 ? (c.title ?? c.label) : c.label}>
                    <span className="lb-cell">{c.format ? c.format(r) : r[c.key]}</span>
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function SortButton({ active, dir, onClick, children }) {
  return (
    <button type="button" className={`lb-sort ${active ? 'is-active' : ''}`} onClick={onClick}>
      {children}
      <svg
        viewBox="0 0 10 10"
        width="9"
        height="9"
        aria-hidden="true"
        className={`lb-sort__icon ${active && dir === 'asc' ? 'is-up' : ''}`}
      >
        <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

const FORM_LABEL = { win: 'W', loss: 'L', draw: '–' } // a war with no winner: a plain dash
const FORM_TITLE = { win: 'Win', loss: 'Loss', draw: 'No winner' }

function Form({ outcomes }) {
  return (
    <span className="lb-form" aria-label={outcomes.map((o) => FORM_TITLE[o]).join(', ')}>
      {outcomes.map((o, i) => (
        <span key={i} className={`lb-form__dot lb-form__dot--${o}`} aria-hidden="true">
          {FORM_LABEL[o]}
        </span>
      ))}
    </span>
  )
}

function Emblem({ src, name, className = '' }) {
  if (src) return <img className={`lb-emblem ${className}`} src={src} alt="" loading="lazy" />
  return (
    <span className={`lb-emblem lb-emblem--initial ${className}`} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  )
}

function Empty({ title, children, action }) {
  return (
    <div className="lb-empty">
      <p className="lb-empty__title">{title}</p>
      <p className="lb-empty__body">{children}</p>
      {action && (
        <Link to={action.to} className="btn btn--ghost lb-empty__action">
          {action.label}
        </Link>
      )}
    </div>
  )
}
