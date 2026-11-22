import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../authContext'
import { adminApi } from '../panelApi'
import { formatWhen } from '../format'
import { useResource } from '../hooks'
import { ErrorNote, Loading, PageHead, Panel } from '../ui'

export default function Dashboard() {
  const { user, isSuper } = useAuth()
  const { data, error, loading, reload } = useResource(() => adminApi.get('/overview'))

  return (
    <>
      <PageHead
        title={`Welcome, ${user.name.split(' ')[0]}`}
        sub="Everything you change here shows on the public website within a minute."
      />
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          {(data.maintenance || data.sectionsOff?.length > 0) && (
            <Panel className={data.maintenance ? 'p-maint is-on' : ''}>
              <p className="p-text">
                {data.maintenance ? 'Maintenance mode is on: visitors see the “We’ll be right back” screen. ' : ''}
                {data.sectionsOff?.length > 0 ? `Switched off: ${data.sectionsOff.join(', ')}. ` : ''}
                <Link to="/panel/site" className="p-link">
                  Sections & maintenance
                </Link>
              </p>
            </Panel>
          )}
          <LiveVisitors />

          <ul className="p-stats" role="list">
            <Stat to="/panel/gangs" label="Gangs" value={data.gangs} />
            <Stat to="/panel/gangs" label="Players listed" value={data.players} />
            <Stat to="/panel/wars" label="War records" value={data.wars} />
            <Stat to="/panel/clubs" label="Clubs" value={data.clubs ?? 0} />
            <Stat to="/panel/events" label="Events coming up" value={data.upcomingEvents ?? 0} />
            <Stat
              to="/panel/staff"
              label="Staff online"
              value={`${data.staffOnline} / ${data.staff}`}
              hint="Online out of all staff cards"
            />
          </ul>

          <div className="p-grid-2">
            <Panel title="Rule book">
              <p className="p-text">
                {data.rules.published
                  ? `Published ${formatWhen(data.rules.publishedAt)}.`
                  : 'Not published from the panel yet — the website shows its built-in draft.'}
              </p>
              <Link to="/panel/rules" className="pbtn pbtn--ghost pbtn--sm">
                Open the rule book
              </Link>
            </Panel>
            <Panel title="Quick start">
              <ol className="p-steps">
                <li>
                  Upload photos and videos in <Link to="/panel/media">Media library</Link>.
                </li>
                <li>
                  Add each gang, its players and emblem in <Link to="/panel/gangs">Gangs</Link>.
                </li>
                <li>
                  Log fights between gangs in <Link to="/panel/wars">Wars</Link>.
                </li>
                <li>
                  Add staff cards and flip their status in <Link to="/panel/staff">Staff</Link>.
                </li>
              </ol>
            </Panel>
          </div>

          {isSuper && (
            <Panel
              title="Recent activity"
              actions={
                <Link to="/panel/audit" className="p-link">
                  Full audit log
                </Link>
              }
            >
              {data.recent.length === 0 ? (
                <p className="p-text">Nothing yet.</p>
              ) : (
                <ul className="p-activity" role="list">
                  {data.recent.map((e) => (
                    <li key={e.id}>
                      <span className="p-activity__what">
                        <code>{e.action}</code> {e.summary || e.target}
                      </span>
                      <span className="p-activity__who">
                        {e.actorEmail || 'system'} · {formatWhen(e.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </>
      )}
    </>
  )
}

function Stat({ to, label, value, hint }) {
  return (
    <li>
      <Link to={to} className="p-stat" title={hint}>
        <span className="p-stat__value">{value}</span>
        <span className="p-stat__label">{label}</span>
      </Link>
    </li>
  )
}

/* ------------------------------------------------------------ live visitors */

const REFRESH_MS = 15 * 1000

/** "/gangs/red-dragons" → "Gangs · red-dragons", "/" → "Home". */
function pageName(path) {
  if (!path || path === '/') return 'Home'
  const [first, ...rest] = path.split('/').filter(Boolean)
  const title = first.charAt(0).toUpperCase() + first.slice(1).replace(/-/g, ' ')
  return rest.length ? `${title} · ${rest.join('/')}` : title
}

const clock = (at) => new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

/**
 * How many people have the public website open right now, refreshed every 15 seconds while
 * the panel is on screen. Counts are anonymous: each open tab of the website checks in with a
 * random code, and nothing about who they are is sent or kept.
 */
function LiveVisitors() {
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    let timer = 0
    const load = async () => {
      clearTimeout(timer)
      try {
        const next = await adminApi.get('/visitors', { timeout: 15_000 })
        if (alive) {
          setData(next)
          setFailed(false)
        }
      } catch {
        if (alive) setFailed(true)
      }
      if (alive && document.visibilityState === 'visible') timer = setTimeout(load, REFRESH_MS)
    }
    const back = () => document.visibilityState === 'visible' && load()
    load()
    document.addEventListener('visibilitychange', back)
    return () => {
      alive = false
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', back)
    }
  }, [])

  const fresh = data && !failed
  const recentStart = data && data.at - data.since < 24 * 60 * 60 * 1000
  return (
    <Panel className="p-live">
      <div className="p-live__top">
        <div className="p-live__now">
          <p className="p-live__label">
            <span className={`p-live__dot ${fresh ? 'is-on' : ''}`} aria-hidden="true" />
            On the website now
          </p>
          <p className="p-live__value" aria-live="polite">
            {data ? data.now : '—'}
            <span>{data?.now === 1 ? 'person' : 'people'}</span>
          </p>
          <p className="p-live__note">
            {failed
              ? 'Can’t reach the server right now — trying again.'
              : data
                ? `Updated ${clock(data.at)} · refreshes every 15 seconds`
                : 'Counting…'}
          </p>
        </div>
        {data && <HourChart values={data.lastHour} />}
      </div>

      {data && (
        <div className="p-live__more">
          <div>
            <p className="p-live__label">Which pages</p>
            {data.pages.length === 0 ? (
              <p className="p-text">Nobody on the website at the moment.</p>
            ) : (
              <ul className="p-live__pages" role="list">
                {data.pages.map((p) => (
                  <li key={p.path}>
                    <span className="p-live__page">{pageName(p.path)}</span>
                    <span className="p-live__bar" aria-hidden="true">
                      <i style={{ transform: `scaleX(${p.count / Math.max(1, data.pages[0].count)})` }} />
                    </span>
                    <span className="p-live__count">{p.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="p-live__label">{recentStart ? 'Busiest since the server started' : 'Busiest in the last 24 hours'}</p>
            <p className="p-text">
              {data.peak ? (
                <>
                  <strong className="p-live__peak">{data.peak.count}</strong> at {clock(data.peak.at)}
                  {new Date(data.peak.at).toDateString() !== new Date(data.at).toDateString() ? ' yesterday' : ''}
                </>
              ) : (
                'Nobody yet.'
              )}
            </p>
            <p className="p-live__note">
              Each open browser tab counts once; a tab left in the background drops off after a minute or two. Anonymous: no names or
              addresses are kept.
              {recentStart ? ` The server last started at ${clock(data.since)}, and counts start again from zero when it restarts.` : ''}
            </p>
          </div>
        </div>
      )}
    </Panel>
  )
}

/** The last hour, minute by minute, as a small line. */
function HourChart({ values }) {
  const W = 240
  const H = 64
  const max = Math.max(1, ...values)
  const x = (i) => (i / (values.length - 1)) * W
  const y = (v) => H - 4 - (v / max) * (H - 12)
  const line = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const [hover, setHover] = useState(null)
  return (
    <figure className="p-live__chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`People on the website over the last hour: highest ${Math.max(...values)}, now ${values[values.length - 1]}.`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect()
          setHover(Math.max(0, Math.min(values.length - 1, Math.round(((e.clientX - box.left) / box.width) * (values.length - 1)))))
        }}
      >
        <line x1="0" x2={W} y1={H - 4} y2={H - 4} className="p-live__base" />
        <polygon points={`0,${H - 4} ${line} ${W},${H - 4}`} className="p-live__area" />
        <polyline points={line} className="p-live__line" />
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1="0" y2={H - 4} className="p-live__cross" />
            <circle cx={x(hover)} cy={y(values[hover])} r="3.5" className="p-live__point" />
          </>
        )}
      </svg>
      <figcaption>
        {hover !== null ? (
          <>
            <strong>{values[hover]}</strong> {hover === values.length - 1 ? 'this minute' : `${values.length - 1 - hover} min ago`}
          </>
        ) : (
          'Last hour'
        )}
      </figcaption>
    </figure>
  )
}
