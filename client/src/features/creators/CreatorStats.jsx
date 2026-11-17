import { useEffect, useId, useMemo, useRef, useState } from 'react'

/*
 * A creator's stats, in their pop-up on the Creators page: headline numbers and graphs drawn
 * from what the site has recorded since it began keeping history (the platforms don't give old
 * numbers, so new creators start with little and it fills in as days and streams go by).
 *
 *   numbers      subscribers / followers (with the change over 30 days), YouTube views,
 *                streams, hours, peak and average viewers over the last 30 days
 *   graphs       viewers over the live (or last) stream · average viewers per stream ·
 *                hours streamed per week · YouTube subscribers and Kick followers by day
 *
 * Every graph has a hover tooltip and a "Show as table" view. One measure per graph, in gold.
 */

const nf = new Intl.NumberFormat('en-IN')
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const fullDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const PLATFORM_NAME = { twitch: 'Twitch', kick: 'Kick', youtube: 'YouTube' }
const hours = (min) => (min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m` : `${min}m`)

export default function CreatorStats({ id }) {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')

  useEffect(() => {
    let gone = false // (the pop-up mounts this afresh for each creator, so it starts as 'loading')
    fetch(`/api/public/creators/${id}/stats`, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (gone) return
        setData(d)
        setState('ok')
      })
      .catch(() => !gone && setState('error'))
    return () => {
      gone = true
    }
  }, [id])

  const view = useMemo(() => (data ? summarise(data) : null), [data])

  return (
    <section className="crp__section crs" aria-labelledby="crs-title" aria-busy={state === 'loading'}>
      <h3 id="crs-title" className="crp__h">
        Stats
      </h3>
      {state === 'loading' && <div className="crs__loading" aria-label="Loading stats" />}
      {state === 'error' && <p className="crs__note">The stats can’t be loaded right now.</p>}
      {state === 'ok' && view && <StatsBody view={view} />}
    </section>
  )
}

/** The numbers and series the graphs need, worked out once. */
function summarise({ since, days, streams, curve }) {
  const month = Date.now() - 30 * 864e5
  const recent = streams.filter((s) => new Date(s.startedAt) >= month)
  const minutes = recent.reduce((n, s) => n + s.minutes, 0)
  const weighted = recent.reduce((n, s) => n + s.average * s.minutes, 0)
  const lastDay = days.at(-1) ?? {}
  // the change over about 30 days, from the first reading in that window
  const monthAgo = new Date(month).toISOString().slice(0, 10)
  const base = (key) => days.find((d) => d.day >= monthAgo && d[key] !== null)?.[key] ?? null
  const change = (key) => (lastDay[key] !== null && lastDay[key] !== undefined && base(key) !== null ? lastDay[key] - base(key) : null)

  const series = (key) =>
    days.filter((d) => d[key] !== null && d[key] !== undefined).map((d) => ({ x: new Date(`${d.day}T12:00:00`), y: d[key] }))

  // hours per week, the last 8 weeks (Monday starts)
  const weeks = []
  const monday = (d) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
    return x
  }
  const thisWeek = monday(new Date())
  // weeks that ended before the site began recording are left out, so they don't read as "streamed nothing"
  const firstWeek = since ? monday(since).getTime() : 0
  for (let i = 7; i >= 0; i--) {
    const start = new Date(thisWeek)
    start.setDate(start.getDate() - i * 7)
    if (start.getTime() >= firstWeek) weeks.push({ start, minutes: 0, streams: 0 })
  }
  for (const s of streams) {
    const w = weeks.find((wk) => wk.start.getTime() === monday(s.startedAt).getTime())
    if (w) {
      w.minutes += s.minutes
      w.streams += 1
    }
  }

  return {
    since: since ? new Date(since) : null,
    tiles: [
      lastDay.ytSubs != null && { label: 'YouTube subscribers', value: lastDay.ytSubs, change: change('ytSubs') },
      lastDay.kickFollowers != null && { label: 'Kick followers', value: lastDay.kickFollowers, change: change('kickFollowers') },
      lastDay.ytViews != null && { label: 'YouTube views', value: lastDay.ytViews, change: change('ytViews') },
      { label: 'Streams · 30 days', value: recent.length },
      { label: 'Hours streamed · 30 days', value: Math.round(minutes / 6) / 10, plain: true },
      recent.length > 0 && { label: 'Peak viewers · 30 days', value: Math.max(...recent.map((s) => s.peak)) },
      recent.length > 0 && { label: 'Average viewers · 30 days', value: minutes ? Math.round(weighted / minutes) : 0 },
    ].filter(Boolean),
    curve: curve && curve.points.length > 1 ? curve : null,
    perStream: [...streams]
      .slice(0, 12)
      .reverse()
      .map((s) => ({
        label: dayFmt.format(new Date(s.startedAt)),
        value: s.average,
        tip: [
          `${fullDay.format(new Date(s.startedAt))} · ${PLATFORM_NAME[s.platform] ?? s.platform}${s.live ? ' · live now' : ''}`,
          `Average ${nf.format(s.average)} · peak ${nf.format(s.peak)}`,
          `${hours(s.minutes)}${s.title ? ` · ${s.title}` : ''}`,
        ],
        row: [
          fullDay.format(new Date(s.startedAt)),
          PLATFORM_NAME[s.platform] ?? s.platform,
          hours(s.minutes),
          nf.format(s.average),
          nf.format(s.peak),
        ],
      })),
    weekly: weeks.map((w) => ({
      label: dayFmt.format(w.start),
      value: Math.round(w.minutes / 6) / 10,
      tip: [`Week of ${fullDay.format(w.start)}`, `${hours(w.minutes)} streamed · ${w.streams} ${w.streams === 1 ? 'stream' : 'streams'}`],
      row: [fullDay.format(w.start), hours(w.minutes), String(w.streams)],
    })),
    anyStreams: streams.length > 0,
    ytSubs: series('ytSubs'),
    kick: series('kickFollowers'),
  }
}

function StatsBody({ view: v }) {
  return (
    <div className="crs__body">
      <dl className="crs__tiles">
        {v.tiles.map((t) => (
          <div key={t.label} className="crs__tile">
            <dt>{t.label}</dt>
            <dd>
              {t.plain ? t.value : t.value >= 100_000 ? compact.format(t.value) : nf.format(t.value)}
              {t.change ? (
                <span className={`crs__change ${t.change > 0 ? 'is-up' : 'is-down'}`}>
                  {t.change > 0 ? '▲' : '▼'} {compact.format(Math.abs(t.change))}
                  <span className="visually-hidden"> in 30 days</span>
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      {v.curve && (
        <Chart
          title={v.curve.live ? 'Viewers right now' : 'Viewers, last stream'}
          sub={`${PLATFORM_NAME[v.curve.platform] ?? v.curve.platform} · started ${fullDay.format(new Date(v.curve.startedAt))}, ${timeFmt.format(new Date(v.curve.startedAt))}`}
          table={{
            head: ['Time', 'Viewers'],
            rows: v.curve.points
              .filter((_, i, a) => a.length < 40 || i % Math.ceil(a.length / 40) === 0)
              .map(([t, n]) => [timeFmt.format(new Date(t)), nf.format(n)]),
          }}
        >
          <LineChart
            points={v.curve.points.map(([t, n]) => ({ x: new Date(t), y: n }))}
            xLabel={(d) => timeFmt.format(d)}
            tip={(p) => [timeFmt.format(p.x), `${nf.format(p.y)} watching`]}
            area
          />
        </Chart>
      )}

      {v.perStream.length > 1 && (
        <Chart
          title="Average viewers per stream"
          sub="The last streams, oldest on the left"
          table={{ head: ['Date', 'Platform', 'Length', 'Average', 'Peak'], rows: v.perStream.map((b) => b.row) }}
        >
          <BarChart bars={v.perStream} format={(n) => nf.format(n)} />
        </Chart>
      )}

      {v.anyStreams && (
        <Chart
          title="Hours streamed per week"
          sub={
            v.weekly.length < 8
              ? `Since recording began · ${v.weekly.length} ${v.weekly.length === 1 ? 'week' : 'weeks'}`
              : 'The last 8 weeks'
          }
          table={{ head: ['Week of', 'Streamed', 'Streams'], rows: v.weekly.map((b) => b.row) }}
        >
          <BarChart bars={v.weekly} format={(n) => `${n}h`} />
        </Chart>
      )}

      {v.ytSubs.length > 1 && (
        <Chart
          title="YouTube subscribers"
          sub="By day, the last 90 days"
          table={{ head: ['Day', 'Subscribers'], rows: v.ytSubs.map((p) => [fullDay.format(p.x), nf.format(p.y)]) }}
        >
          <LineChart
            points={v.ytSubs}
            xLabel={(d) => dayFmt.format(d)}
            tip={(p) => [fullDay.format(p.x), `${nf.format(p.y)} subscribers`]}
          />
        </Chart>
      )}
      {v.kick.length > 1 && (
        <Chart
          title="Kick followers"
          sub="By day, the last 90 days"
          table={{ head: ['Day', 'Followers'], rows: v.kick.map((p) => [fullDay.format(p.x), nf.format(p.y)]) }}
        >
          <LineChart points={v.kick} xLabel={(d) => dayFmt.format(d)} tip={(p) => [fullDay.format(p.x), `${nf.format(p.y)} followers`]} />
        </Chart>
      )}

      <p className="crs__note">
        {v.since
          ? `Recorded by the site since ${fullDay.format(v.since)}. Graphs fill in as days and streams go by.`
          : 'The site starts recording this creator’s numbers from their next stream and channel check. Graphs appear as they come in.'}
      </p>
    </div>
  )
}

/** A graph's frame: title, a line under it, the plot, and its numbers as a table on request. */
function Chart({ title, sub, table, children }) {
  return (
    <figure className="crs__chart">
      <figcaption>
        <span className="crs__chart-title">{title}</span>
        {sub && <span className="crs__chart-sub">{sub}</span>}
      </figcaption>
      {children}
      <details className="crs__table">
        <summary>Show as table</summary>
        <div className="crs__table-scroll">
          <table>
            <thead>
              <tr>
                {table.head.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}

const W = 320
const H = 120
const PAD = { l: 34, r: 8, t: 8, b: 20 }

/** A rounded-up top for the y axis: 0 … nice. */
function niceMax(v) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((n) => n >= v)
}

/** A hover tooltip that follows the pointer inside the chart. */
function useTip() {
  const [tip, setTip] = useState(null) // { x, y, lines }
  const node = tip ? (
    <div className="crs__tip" style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }} role="status">
      {tip.lines.map((l, i) => (
        <span key={i} className={i === 0 ? 'crs__tip-head' : undefined}>
          {l}
        </span>
      ))}
    </div>
  ) : null
  return [node, setTip]
}

/** One measure over time: a 2px line (with a faint area under it when asked), crosshair on hover. */
function LineChart({ points, xLabel, tip, area = false }) {
  const gid = useId().replace(/:/g, '')
  const svg = useRef(null)
  const [tipNode, setTip] = useTip()
  const [hover, setHover] = useState(null)
  const x0 = points[0].x.getTime()
  const x1 = points.at(-1).x.getTime()
  const lo = Math.min(...points.map((p) => p.y))
  const hi = Math.max(...points.map((p) => p.y))
  // viewers start at zero; follower counts zoom in on their range so growth shows
  const yMin = area ? 0 : Math.max(0, lo - (hi - lo || hi * 0.05 || 1) * 0.4)
  const yMax = area ? niceMax(hi) : hi + (hi - lo || hi * 0.05 || 1) * 0.3
  const X = (t) => PAD.l + ((t - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r)
  const Y = (v) => PAD.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD.t - PAD.b)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x.getTime()).toFixed(1)},${Y(p.y).toFixed(1)}`).join('')
  const ticks = [yMin, (yMin + yMax) / 2, yMax]

  const onMove = (e) => {
    const r = svg.current.getBoundingClientRect()
    const sx = ((e.clientX - r.left) / r.width) * W
    let best = 0
    for (let i = 1; i < points.length; i++)
      if (Math.abs(X(points[i].x.getTime()) - sx) < Math.abs(X(points[best].x.getTime()) - sx)) best = i
    const p = points[best]
    setHover(best)
    setTip({ x: X(p.x.getTime()), y: Y(p.y), lines: tip(p) })
  }
  const off = () => {
    setHover(null)
    setTip(null)
  }
  const h = hover !== null ? points[hover] : null

  return (
    <div className="crs__plot">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="crs__svg" onPointerMove={onMove} onPointerLeave={off} aria-hidden="true">
        <defs>
          <linearGradient id={`${gid}a`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--c-gold)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--c-gold)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line className="crs__grid" x1={PAD.l} x2={W - PAD.r} y1={Y(t)} y2={Y(t)} />
            <text className="crs__axis" x={PAD.l - 6} y={Y(t) + 3} textAnchor="end">
              {compact.format(Math.round(t))}
            </text>
          </g>
        ))}
        <text className="crs__axis" x={PAD.l} y={H - 4}>
          {xLabel(points[0].x)}
        </text>
        <text className="crs__axis" x={W - PAD.r} y={H - 4} textAnchor="end">
          {xLabel(points.at(-1).x)}
        </text>
        {area && <path d={`${line}L${X(x1)},${Y(yMin)}L${X(x0)},${Y(yMin)}Z`} fill={`url(#${gid}a)`} />}
        <path d={line} className="crs__line" />
        {h && (
          <g>
            <line className="crs__cross" x1={X(h.x.getTime())} x2={X(h.x.getTime())} y1={PAD.t} y2={H - PAD.b} />
            <circle className="crs__dot" cx={X(h.x.getTime())} cy={Y(h.y)} r="4" />
          </g>
        )}
        {/* a wide invisible target so the whole plot answers the pointer */}
        <rect x={PAD.l} y={0} width={W - PAD.l - PAD.r} height={H} fill="transparent" />
      </svg>
      {tipNode}
    </div>
  )
}

/** One measure across a few periods: thin rounded bars with a 2px gap, tooltip per bar. */
function BarChart({ bars, format }) {
  const [tipNode, setTip] = useTip()
  const [hover, setHover] = useState(null)
  const max = niceMax(Math.max(...bars.map((b) => b.value), 0))
  const inner = W - PAD.l - PAD.r
  const slot = inner / bars.length
  const bw = Math.max(4, Math.min(26, slot - 2))
  const Y = (v) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b)
  const base = Y(0)
  const ticks = [0, max / 2, max]
  const every = Math.ceil(bars.length / 6) // label at most ~6 bars

  return (
    <div className="crs__plot">
      <svg viewBox={`0 0 ${W} ${H}`} className="crs__svg" onPointerLeave={() => (setHover(null), setTip(null))} aria-hidden="true">
        {ticks.map((t, i) => (
          <g key={i}>
            <line className="crs__grid" x1={PAD.l} x2={W - PAD.r} y1={Y(t)} y2={Y(t)} />
            <text className="crs__axis" x={PAD.l - 6} y={Y(t) + 3} textAnchor="end">
              {format(Math.round(t * 10) / 10)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const cx = PAD.l + slot * i + slot / 2
          const top = Y(b.value)
          const hgt = Math.max(0, base - top)
          const r = Math.min(4, bw / 2, hgt)
          return (
            <g
              key={i}
              onPointerEnter={() => {
                setHover(i)
                setTip({ x: cx, y: Math.min(top, base - 6), lines: b.tip })
              }}
            >
              {/* rounded top, square foot on the baseline */}
              {hgt > 0 && (
                <path
                  className={`crs__bar ${hover === i ? 'is-hover' : ''}`}
                  d={`M${cx - bw / 2},${base}V${top + r}Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top}H${cx + bw / 2 - r}Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r}V${base}Z`}
                />
              )}
              <rect x={cx - slot / 2} y={PAD.t} width={slot} height={H - PAD.t - PAD.b} fill="transparent" />
              {i % every === 0 && (
                <text className="crs__axis" x={cx} y={H - 4} textAnchor="middle">
                  {b.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {tipNode}
    </div>
  )
}
