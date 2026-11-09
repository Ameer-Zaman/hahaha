import { useId } from 'react'

/*
 * Frames laid over the top of a creator card, drawn here as SVG (original artwork, in the
 * card's accent colour): thorny vines, gold filigree, chains, a crown. 'custom' lays an
 * uploaded transparent PNG / GIF over the whole card instead, like a Discord profile effect.
 * The drawings use a 300 × 115 canvas stretched over the banner.
 */

const W = 300

/** Points along a wavy line, as an SVG path. */
function wave(from, to, axis, base, amp, period, phase) {
  const pts = []
  for (let t = from; t <= to; t += 3) {
    const off = base + amp * Math.sin(t / period + phase)
    pts.push(axis === 'x' ? `${t},${off.toFixed(2)}` : `${off.toFixed(2)},${t}`)
  }
  return `M${pts.join(' L')}`
}

/** Little thorns along a wavy line: alternate up / down, each with a slight tilt. */
function thorns(from, to, axis, base, amp, period, phase, every, side = 1) {
  const out = []
  let i = 0
  for (let t = from + every / 2; t < to; t += every, i += 1) {
    const off = base + amp * Math.sin(t / period + phase)
    const dir = (i % 2 ? 1 : -1) * side
    const len = 4 + ((i * 7) % 3)
    const tilt = ((i * 13) % 5) - 2
    if (axis === 'x') out.push(`M${t - 2},${off} L${t + tilt},${off + dir * len} L${t + 2},${off} Z`)
    else out.push(`M${off},${t - 2} L${off + dir * len},${t + tilt} L${off},${t + 2} Z`)
  }
  return out.join(' ')
}

function Thorns() {
  return (
    <>
      {/* top: two strands twisting round each other */}
      <path d={wave(0, W, 'x', 7, 3.2, 16, 0)} className="frame__stroke" strokeWidth="3.4" />
      <path d={wave(0, W, 'x', 7, 3.2, 16, Math.PI)} className="frame__stroke frame__stroke--dark" strokeWidth="2.2" />
      <path d={thorns(4, W - 4, 'x', 7, 3.2, 16, 0, 13)} className="frame__fill" />
      {/* sides: strands climbing down, thinning out */}
      {[6, W - 6].map((x, k) => (
        <g key={x} className="frame__side">
          <path d={wave(4, 104, 'y', x, 2.6, 13, k ? 1 : 0)} className="frame__stroke" strokeWidth="3" />
          <path d={wave(4, 92, 'y', x, 2.6, 13, (k ? 1 : 0) + Math.PI)} className="frame__stroke frame__stroke--dark" strokeWidth="1.8" />
          <path d={thorns(10, 100, 'y', x, 2.6, 13, k ? 1 : 0, 12, k ? -1 : 1)} className="frame__fill" />
        </g>
      ))}
      {/* knots where top and sides meet */}
      {[9, W - 9].map((x) => (
        <g key={x}>
          <circle cx={x} cy="9" r="7" className="frame__stroke" strokeWidth="2.6" />
          <circle cx={x} cy="9" r="3.2" className="frame__stroke frame__stroke--dark" strokeWidth="1.6" />
        </g>
      ))}
    </>
  )
}

function Filigree() {
  const corner = (
    <g>
      <path d="M2 46 L2 14 Q2 2 14 2 L46 2" className="frame__stroke" strokeWidth="2.4" />
      <path d="M8 40 L8 18 Q8 8 18 8 L40 8" className="frame__stroke frame__stroke--dark" strokeWidth="1.2" />
      {/* the scroll: a curl that turns in on itself */}
      <path d="M14 8 C30 6 36 20 26 24 C18 27 14 18 21 16 C25 15 26 19 23 20" className="frame__stroke" strokeWidth="1.8" />
      <path d="M8 14 C6 30 20 36 24 26" className="frame__stroke" strokeWidth="1.8" />
      <circle cx="14" cy="14" r="2.4" className="frame__fill" />
      <path d="M46 2 C54 2 58 6 62 2" className="frame__stroke" strokeWidth="1.6" />
      <path d="M2 46 C2 54 6 58 2 62" className="frame__stroke" strokeWidth="1.6" />
    </g>
  )
  return (
    <>
      {corner}
      <g transform={`translate(${W} 0) scale(-1 1)`}>{corner}</g>
      <path d={`M64 3 L${W / 2 - 20} 3 M${W / 2 + 20} 3 L${W - 64} 3`} className="frame__stroke frame__stroke--dark" strokeWidth="1.2" />
      {/* the centre ornament */}
      <g transform={`translate(${W / 2} 4)`}>
        <path d="M-18 0 C-10 0 -8 9 0 9 C8 9 10 0 18 0" className="frame__stroke" strokeWidth="1.8" />
        <path d="M0 -2 L5 4 L0 10 L-5 4 Z" className="frame__fill" />
        <circle cx="-14" cy="5" r="1.6" className="frame__fill" />
        <circle cx="14" cy="5" r="1.6" className="frame__fill" />
      </g>
    </>
  )
}

function Chains() {
  const links = []
  for (let i = 0, x = 4; x < W - 4; i += 1, x += 10) {
    links.push(
      i % 2 ? (
        <rect
          key={`t${i}`}
          x={x - 1}
          y="4.5"
          width="12"
          height="5"
          rx="2.5"
          className="frame__stroke frame__stroke--dark"
          strokeWidth="1.6"
        />
      ) : (
        <rect key={`t${i}`} x={x - 2} y="2" width="14" height="10" rx="5" className="frame__stroke" strokeWidth="2.4" />
      ),
    )
  }
  for (const [k, x] of [
    [0, 3],
    [1, W - 13],
  ]) {
    for (let i = 0, y = 14; y < 84; i += 1, y += 10) {
      links.push(
        i % 2 ? (
          <rect
            key={`s${k}${i}`}
            x={x + 2.5}
            y={y - 1}
            width="5"
            height="12"
            rx="2.5"
            className="frame__stroke frame__stroke--dark frame__fade"
            strokeWidth="1.6"
            style={{ opacity: 1 - i / 8 }}
          />
        ) : (
          <rect
            key={`s${k}${i}`}
            x={x}
            y={y - 2}
            width="10"
            height="14"
            rx="5"
            className="frame__stroke frame__fade"
            strokeWidth="2.4"
            style={{ opacity: 1 - i / 8 }}
          />
        ),
      )
    }
  }
  return <>{links}</>
}

function Crown() {
  const c = W / 2
  return (
    <>
      <path d={`M2 3 L${c - 34} 3 M${c + 34} 3 L${W - 2} 3`} className="frame__stroke" strokeWidth="2" />
      {[24, 60, 96, W - 24, W - 60, W - 96].map((x) => (
        <circle key={x} cx={x} cy="3" r="2.2" className="frame__fill" />
      ))}
      <g transform={`translate(${c} 0)`}>
        <path d="M-30 30 L-34 6 L-17 18 L0 -1 L17 18 L34 6 L30 30 Z" className="frame__crown" />
        <path d="M-30 30 L-34 6 L-17 18 L0 -1 L17 18 L34 6 L30 30 Z" className="frame__stroke" strokeWidth="1.6" />
        <rect x="-31" y="29" width="62" height="6" rx="1.5" className="frame__crown" />
        <rect x="-31" y="29" width="62" height="6" rx="1.5" className="frame__stroke" strokeWidth="1.2" />
        <circle cx="0" cy="18" r="3.4" className="frame__gem" />
        <circle cx="-17" cy="22" r="2.4" className="frame__gem" />
        <circle cx="17" cy="22" r="2.4" className="frame__gem" />
        <circle cx="-34" cy="6" r="2.2" className="frame__fill" />
        <circle cx="0" cy="-1" r="2.4" className="frame__fill" />
        <circle cx="34" cy="6" r="2.2" className="frame__fill" />
      </g>
    </>
  )
}

const DRAW = { thorns: Thorns, filigree: Filigree, chains: Chains, crown: Crown }

export default function CardFrame({ frame, image }) {
  const id = useId().replace(/:/g, '')
  if (!frame || frame === 'none') return null
  if (frame === 'custom') return image ? <img className="cr-frame-img" src={image} alt="" aria-hidden="true" /> : null
  const Draw = DRAW[frame]
  if (!Draw) return null
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return (
    <svg
      className={`cr-frame cr-frame--${frame}`}
      viewBox={`0 0 ${W} 115`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ '--frame-grad': `url(#${id})` }}
    >
      <defs>
        {/* metal in the accent colour, with a glint that passes across now and then */}
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="var(--frame-lo)" />
          <stop offset="0.45" stopColor="var(--frame-mid)" />
          <stop offset="0.5" stopColor="var(--frame-hi)">
            {!still && <animate attributeName="offset" values="-0.2;1.2;1.2" keyTimes="0;0.35;1" dur="5s" repeatCount="indefinite" />}
          </stop>
          <stop offset="0.55" stopColor="var(--frame-mid)" />
          <stop offset="1" stopColor="var(--frame-lo)" />
        </linearGradient>
      </defs>
      <Draw />
    </svg>
  )
}
