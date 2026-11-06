/**
 * The colour of the cursor smoke. Gold by default; a page can tint it (a gang's page uses the
 * gang's colour) and put it back when it closes. Kept apart from fluid.js so pages can set it
 * without loading the smoke itself.
 */
const GOLD = [
  [0.89, 0.71, 0.35],
  [0.95, 0.81, 0.5],
  [0.71, 0.52, 0.18],
  [1.0, 0.9, 0.66],
]

let palette = GOLD

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
const mix = (c, to, t) => c.map((v, i) => v + (to[i] - v) * t)

/** The four shades the smoke cycles through, built from one colour (#rrggbb), or gold. */
export function setSmokeColor(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex ?? '')) {
    palette = GOLD
    return
  }
  const c = toRgb(hex)
  palette = [c, mix(c, [1, 1, 1], 0.25), mix(c, [0, 0, 0], 0.25), mix(c, [1, 1, 1], 0.45)]
}

export const smokePalette = () => palette
