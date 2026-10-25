import './plate.css'

/**
 * An original, procedurally drawn night-city plate used wherever no photograph has been
 * supplied. Deterministic per `seed`, so a section always gets the same skyline.
 *
 * Each layer (sky, far, mid, near) is drawn once as an SVG image and shown with an <img>,
 * so the browser rasterises it once and parallax only slides finished pictures around —
 * no repainting of hundreds of shapes on every scroll frame. Built images are cached and
 * shared by every plate with the same seed.
 *
 * With `parallax`, the far, mid and near layers carry `data-parallax` depths and move at
 * different speeds as the plate scrolls (animated by the enclosing <Plate>'s scope).
 */

/** Depth of each layer: far lags behind, near runs ahead (percent of the layer's height). */
const DEPTH = {
  far: 'y:-2.6%:2.6%',
  mid: 'y:-1%:1%',
  near: 'y:3%:-3%',
}

const W = 1600
const H = 900
/** Each layer image extends below the frame, so a layer moving up never shows an edge. */
const BLEED = 108 // = 12% of H; the CSS gives the layers the same 12% of extra height
const VH = H + BLEED

function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

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
    buildings.push({ x, y: top, w, h: VH - top + 10 })

    if (windowDensity > 0) {
      const cols = Math.max(1, Math.floor(w / 11))
      const rows = Math.floor(h / 15)
      for (let r = 1; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rand() < windowDensity) windows.push({ x: x + 4 + c * 11, y: top + 6 + r * 15, o: 0.25 + rand() * 0.6 })
        }
      }
    }
    x += w + (rand() > 0.7 ? rand() * 14 : 1)
  }
  return { buildings, windows }
}

const n = (v) => Math.round(v * 10) / 10
/** All rectangles as one path (one shape to draw instead of hundreds). */
const rectsPath = (list, w, h) => list.map((r) => `M${n(r.x)} ${n(r.y)}h${n(w ?? r.w)}v${n(h ?? r.h)}h${-n(w ?? r.w)}z`).join('')
/** Windows grouped into a few brightness levels, each one path. */
function windowPaths(list, scale = 1) {
  const buckets = [[], [], [], []]
  for (const w of list) buckets[Math.min(3, Math.floor(((w.o - 0.25) / 0.6) * 4))].push(w)
  return buckets
    .map((b, i) => (b.length ? `<path fill="#f6d68f" opacity="${n((0.32 + i * 0.16) * scale)}" d="${rectsPath(b, 5, 7)}"/>` : ''))
    .join('')
}

const svgUrl = (body, defs = '') =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${VH}" preserveAspectRatio="xMidYMax slice"><defs>${defs}</defs>${body}</svg>`,
  )}`

const cache = new Map()

function buildPlate(seed, horizon) {
  const key = `${seed}:${horizon}`
  if (cache.has(key)) return cache.get(key)
  const rand = mulberry32(seed)
  const baseline = H * horizon
  const far = buildLayer(rand, { baseline: baseline - 6, minH: 60, maxH: 190, minW: 30, maxW: 80, windowDensity: 0 })
  const mid = buildLayer(rand, { baseline, minH: 90, maxH: 300, minW: 46, maxW: 120, windowDensity: 0.09 })
  const near = buildLayer(rand, { baseline: baseline + 46, minH: 18, maxH: 70, minW: 90, maxW: 220, windowDensity: 0.03 })
  const lights = Array.from({ length: 34 }, (_, i) => ({
    x: (i / 33) * W + (rand() - 0.5) * 30,
    y: baseline + 8 + rand() * 6,
    r: 1 + rand() * 1.6,
  }))
  const h = horizon * (H / VH) // horizon as a fraction of the taller image

  const urls = {
    sky: svgUrl(
      `<rect width="${W}" height="${VH}" fill="url(#s)"/><rect width="${W}" height="${VH}" fill="url(#h)"/>`,
      `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03050b"/><stop offset="${n(h * 0.55)}" stop-color="#0a1122"/><stop offset="${n(h * 0.85)}" stop-color="#1d1a22"/><stop offset="${n(h)}" stop-color="#4a3313"/><stop offset="1" stop-color="#020306"/></linearGradient>` +
        `<radialGradient id="h" cx="0.5" cy="${n(h)}" r="0.6"><stop offset="0" stop-color="#e3b55a" stop-opacity="0.34"/><stop offset="1" stop-color="#e3b55a" stop-opacity="0"/></radialGradient>`,
    ),
    far: svgUrl(`<path fill="#161d2b" d="${rectsPath(far.buildings)}"/>`),
    mid: svgUrl(
      `<path fill="#0b1019" d="${rectsPath(mid.buildings)}"/>` +
        `<path stroke="#f2cf80" stroke-opacity="0.38" stroke-width="1" d="${mid.buildings.map((b) => `M${n(b.x)} ${n(b.y + 0.5)}h${n(b.w)}`).join('')}"/>` +
        windowPaths(mid.windows) +
        `<line x1="0" x2="${W}" y1="${n(baseline + 10)}" y2="${n(baseline + 10)}" stroke="#f2cf80" stroke-opacity="0.45" stroke-width="1"/>` +
        lights.map((l) => `<circle cx="${n(l.x)}" cy="${n(l.y)}" r="${n(l.r * 6)}" fill="url(#g)" opacity="0.55"/>`).join(''),
      `<radialGradient id="g"><stop offset="0" stop-color="#fff0c4" stop-opacity="0.95"/><stop offset="1" stop-color="#e3b55a" stop-opacity="0"/></radialGradient>`,
    ),
    near: svgUrl(`<path fill="#020306" d="${rectsPath(near.buildings)}"/>` + windowPaths(near.windows, 0.7)),
  }
  cache.set(key, urls)
  return urls
}

export default function CityPlate({ seed = 7, horizon = 0.72, parallax = false, className = '' }) {
  const urls = buildPlate(seed, horizon)
  const depth = (layer) => (parallax ? DEPTH[layer] : undefined)
  return (
    <div className={`city-plate ${className}`} aria-hidden="true">
      <img className="city-plate__layer" src={urls.sky} alt="" decoding="async" draggable="false" />
      <img className="city-plate__layer" src={urls.far} alt="" decoding="async" draggable="false" data-parallax={depth('far')} />
      <img className="city-plate__layer" src={urls.mid} alt="" decoding="async" draggable="false" data-parallax={depth('mid')} />
      <img className="city-plate__layer" src={urls.near} alt="" decoding="async" draggable="false" data-parallax={depth('near')} />
    </div>
  )
}
