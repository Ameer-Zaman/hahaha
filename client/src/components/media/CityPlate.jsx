import { useMemo } from 'react'
import './plate.css'

/**
 * An original, procedurally drawn night-city plate used wherever no photograph has been
 * supplied. Deterministic per `seed`, so a section always gets the same skyline.
 *
 * It is a single lightweight SVG: no network request, no layout shift, scales to any frame.
 *
 * With `parallax`, the far, mid and near layers carry `data-parallax` depths and move at
 * different speeds as the plate scrolls (animated by the enclosing <Plate>'s scope).
 */

/** Depth of each layer in SVG units: far lags behind, near runs ahead. */
const DEPTH = {
  far: 'y:-26:26',
  mid: 'y:-10:10',
  near: 'y:34:-34',
}

/** Extra length below each building so a moving layer never reveals its base. */
const BLEED = 220

function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const W = 1600
const H = 900

function buildLayer(rand, { baseline, minH, maxH, minW, maxW, windowDensity }) {
  const buildings = []
  const windows = []
  let x = -20
  while (x < W + 20) {
    const w = minW + rand() * (maxW - minW)
    // occasional towers break the rhythm
    const tower = rand() > 0.86
    const h = (minH + rand() * (maxH - minH)) * (tower ? 1.55 : 1)
    const top = baseline - h
    buildings.push({ x, y: top, w, h: h + (H - baseline) + BLEED })

    if (windowDensity > 0) {
      const cols = Math.max(1, Math.floor(w / 11))
      const rows = Math.floor(h / 15)
      for (let r = 1; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rand() < windowDensity) {
            windows.push({
              x: x + 4 + c * 11,
              y: top + 6 + r * 15,
              o: 0.25 + rand() * 0.6,
            })
          }
        }
      }
    }
    x += w + (rand() > 0.7 ? rand() * 14 : 1)
  }
  return { buildings, windows }
}

export default function CityPlate({ seed = 7, horizon = 0.72, parallax = false, className = '' }) {
  const depth = (layer) => (parallax ? DEPTH[layer] : undefined)
  const scene = useMemo(() => {
    const rand = mulberry32(seed)
    const baseline = H * horizon
    return {
      baseline,
      far: buildLayer(rand, {
        baseline: baseline - 6,
        minH: 60,
        maxH: 190,
        minW: 30,
        maxW: 80,
        windowDensity: 0,
      }),
      mid: buildLayer(rand, {
        baseline,
        minH: 90,
        maxH: 300,
        minW: 46,
        maxW: 120,
        windowDensity: 0.09,
      }),
      near: buildLayer(rand, {
        baseline: baseline + 46,
        minH: 18,
        maxH: 70,
        minW: 90,
        maxW: 220,
        windowDensity: 0.03,
      }),
      lights: Array.from({ length: 34 }, (_, i) => ({
        x: (i / 33) * W + (rand() - 0.5) * 30,
        y: baseline + 8 + rand() * 6,
        r: 1 + rand() * 1.6,
      })),
    }
  }, [seed, horizon])

  const id = `plate-${seed}`

  return (
    <svg
      className={`city-plate ${className}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#03050b" />
          <stop offset={horizon * 0.55} stopColor="#0a1122" />
          <stop offset={horizon * 0.85} stopColor="#1d1a22" />
          <stop offset={horizon} stopColor="#4a3313" />
          <stop offset="1" stopColor="#020306" />
        </linearGradient>
        <radialGradient id={`${id}-haze`} cx="0.5" cy={horizon} r="0.6">
          <stop offset="0" stopColor="#e3b55a" stopOpacity="0.34" />
          <stop offset="1" stopColor="#e3b55a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#fff0c4" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e3b55a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <rect width={W} height={H} fill={`url(#${id}-haze)`} />

      <g fill="#161d2b" data-parallax={depth('far')}>
        {scene.far.buildings.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} />
        ))}
      </g>

      <g data-parallax={depth('mid')}>
      <g fill="#0b1019">
        {scene.mid.buildings.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} />
        ))}
      </g>
      {/* rim light: a hairline of gold catching each rooftop */}
      <g stroke="#f2cf80" strokeOpacity="0.38" strokeWidth="1">
        {scene.mid.buildings.map((b, i) => (
          <line key={i} x1={b.x} x2={b.x + b.w} y1={b.y + 0.5} y2={b.y + 0.5} />
        ))}
      </g>
      <g fill="#f6d68f">
        {scene.mid.windows.map((w, i) => (
          <rect key={i} x={w.x} y={w.y} width="5" height="7" opacity={w.o} />
        ))}
      </g>

      {/* the horizon: a single gold hairline of street light */}
      <line
        x1="0"
        x2={W}
        y1={scene.baseline + 10}
        y2={scene.baseline + 10}
        stroke="#f2cf80"
        strokeOpacity="0.45"
        strokeWidth="1"
      />
      <g>
        {scene.lights.map((l, i) => (
          <circle key={i} cx={l.x} cy={l.y} r={l.r * 6} fill={`url(#${id}-glow)`} opacity="0.55" />
        ))}
      </g>
      </g>

      <g data-parallax={depth('near')}>
      <g fill="#020306">
        {scene.near.buildings.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} />
        ))}
      </g>
      <g fill="#f6d68f">
        {scene.near.windows.map((w, i) => (
          <rect key={i} x={w.x} y={w.y} width="5" height="7" opacity={w.o * 0.7} />
        ))}
      </g>
      </g>
    </svg>
  )
}
