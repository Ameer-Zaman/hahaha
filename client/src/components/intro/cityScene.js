/**
 * The loading screen's moving picture, drawn on one canvas with no files to download (so it is
 * on screen at once, while everything else loads):
 *
 *   a dusk sky running from night violet to a burning gold horizon, a few stars, a striped
 *   setting sun with its glow and thin clouds drifting across it; two layers of skyline (a hazy
 *   far one and a black near one with windows switching on and red beacons blinking); the sea
 *   below with the sun's reflection shimmering in broken lines; a coast road where headlights
 *   and tail lights streak past; palm trees swaying in the corners; grain and a vignette.
 *
 * Everything is generated from a fixed seed, so it is the same city on every visit. With
 * `still`, one frame is drawn and nothing moves.
 */

function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SKY = [
  [0, '#07060f'],
  [0.3, '#1d0b2e'],
  [0.55, '#5a1645'],
  [0.75, '#c2384f'],
  [0.9, '#f2793a'],
  [1, '#ffc65c'],
]

export function startCityScene(canvas, { still = false } = {}) {
  const ctx = canvas.getContext('2d')
  let W = 0
  let H = 0
  let horizon = 0
  let scene = null
  let raf = 0
  let start = performance.now()

  function skyline(rand, { count, minH, maxH, color, windows, beacons, gapAt = -1e9, gapW = 0 }) {
    const layer = document.createElement('canvas')
    layer.width = W
    layer.height = horizon
    const g = layer.getContext('2d')
    const lights = []
    let x = -20
    while (x < W + 20) {
      const w = 18 + rand() * (W / count)
      // lower buildings in front of the sun, so it shows over the city
      const nearSun = Math.abs(x + w / 2 - gapAt) < gapW
      const h = (minH + Math.pow(rand(), 1.6) * (maxH - minH)) * (nearSun ? 0.45 : 1)
      const top = horizon - h
      g.fillStyle = color
      g.fillRect(x, top, w, h + 1)
      // a stepped roof or a spire now and then
      if (rand() < 0.3) g.fillRect(x + w * 0.25, top - h * 0.08, w * 0.5, h * 0.08 + 1)
      if (rand() < 0.18) {
        g.fillRect(x + w / 2 - 1, top - h * 0.22, 2, h * 0.22)
        if (beacons) lights.push({ kind: 'beacon', x: x + w / 2, y: top - h * 0.22, phase: rand() * 6 })
      }
      if (windows) {
        for (let wy = top + 6; wy < horizon - 6; wy += 7) {
          for (let wx = x + 4; wx < x + w - 4; wx += 6) {
            if (rand() < 0.16) lights.push({ kind: 'window', x: wx, y: wy, on: rand() * 2.2, warm: rand() < 0.8 })
          }
        }
      }
      x += w + rand() * 4
    }
    return { layer, lights }
  }

  function palm(rand, x, base, height, lean) {
    const fronds = []
    const n = 8 + Math.floor(rand() * 3)
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * Math.PI * 1.25 + (rand() - 0.5) * 0.25
      fronds.push({ a, len: height * (0.32 + rand() * 0.14), droop: 0.5 + rand() * 0.5 })
    }
    return { x, base, height, lean, fronds, phase: rand() * 6 }
  }

  function build() {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1)
    W = Math.max(1, Math.round(canvas.clientWidth * dpr))
    H = Math.max(1, Math.round(canvas.clientHeight * dpr))
    canvas.width = W
    canvas.height = H
    horizon = Math.round(H * 0.64)
    const rand = seeded(1977)
    const unit = Math.min(W, H)

    const stars = Array.from({ length: Math.round((W * H) / 9000) }, () => ({
      x: rand() * W,
      y: rand() * horizon * 0.55,
      r: 0.4 + rand() * 1.1,
      phase: rand() * 6,
    }))
    const clouds = Array.from({ length: 6 }, () => ({
      x: rand() * W,
      y: horizon * (0.42 + rand() * 0.45),
      w: W * (0.18 + rand() * 0.3),
      h: 2 + rand() * 5,
      speed: 4 + rand() * 10,
      alpha: 0.15 + rand() * 0.25,
    }))
    const sun = { x: W * (W > H ? 0.64 : 0.6), r: unit * (W > H ? 0.26 : 0.3) }
    const far = skyline(rand, {
      count: 26,
      minH: unit * 0.06,
      maxH: unit * 0.24,
      color: 'rgba(72,22,70,0.85)',
      windows: false,
      gapAt: sun.x,
      gapW: sun.r * 0.9,
    })
    const near = skyline(rand, {
      count: 18,
      minH: unit * 0.03,
      maxH: unit * 0.3,
      color: '#0b0710',
      windows: true,
      beacons: true,
      gapAt: sun.x,
      gapW: sun.r * 1.5,
    })
    // palms in the corners, sized to the screen's width so they frame a phone without filling it
    const tall = W > H ? Math.min(H * 0.62, W * 0.5) : W * 0.78
    const palms = [
      palm(rand, W * 0.04, H, tall, 0.12),
      palm(rand, W * 0.13, H, tall * 0.78, -0.05),
      palm(rand, W * 0.95, H, tall * 0.9, -0.14),
    ].filter((_, i) => W > H || i !== 1)
    const cars = Array.from({ length: 14 }, (_, i) => ({
      dir: i % 2 ? 1 : -1,
      x: rand() * W,
      speed: W * (0.18 + rand() * 0.22),
      lane: rand(),
      len: W * (0.05 + rand() * 0.08),
    }))
    // film grain, made once and slid about each frame
    const grain = document.createElement('canvas')
    grain.width = grain.height = 160
    const gg = grain.getContext('2d')
    const img = gg.createImageData(160, 160)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rand() * 255
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 22
    }
    gg.putImageData(img, 0, 0)

    scene = { stars, clouds, far, near, palms, cars, grain, sun, sunLayer: document.createElement('canvas') }
  }

  function drawSun(t) {
    const { x, r } = scene.sun
    const y = horizon - r * 0.12 - Math.min(1, t / 6) * r * 0.05 // rises a touch as it loads
    // glow
    const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3.2)
    glow.addColorStop(0, 'rgba(255,170,80,0.55)')
    glow.addColorStop(0.35, 'rgba(240,90,90,0.18)')
    glow.addColorStop(1, 'rgba(240,90,90,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, horizon)
    // the disc, with stripes that slide down through its lower half (cut on its own layer,
    // so the cuts show the sky behind and never the black of an empty canvas)
    const sun = scene.sunLayer
    const sg = sun.getContext('2d')
    const size = Math.ceil(r * 2 + 4)
    if (sun.width !== size) sun.width = sun.height = size
    sg.clearRect(0, 0, size, size)
    sg.globalCompositeOperation = 'source-over'
    const cx = size / 2
    const disc = sg.createLinearGradient(0, cx - r, 0, cx + r * 0.3)
    disc.addColorStop(0, '#fff1b8')
    disc.addColorStop(0.5, '#ffb347')
    disc.addColorStop(1, '#ff4f6d')
    sg.fillStyle = disc
    sg.beginPath()
    sg.arc(cx, cx, r, 0, Math.PI * 2)
    sg.fill()
    sg.globalCompositeOperation = 'destination-out'
    const gap = r * 0.12
    const slide = (t * r * 0.05) % gap
    for (let sy = cx - r * 0.55 + slide; sy < cx + r; sy += gap) {
      const k = (sy - (cx - r * 0.55)) / (r * 1.1)
      sg.fillRect(0, sy, size, Math.max(1, gap * (0.12 + 0.5 * k)))
    }
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, W, horizon)
    ctx.clip()
    ctx.drawImage(sun, x - cx, y - cx)
    ctx.restore()
  }

  function drawPalm(p, t) {
    const sway = Math.sin(t * 0.7 + p.phase) * 0.035
    const topX = p.x + p.height * (p.lean + sway)
    const topY = p.base - p.height
    ctx.strokeStyle = '#050307'
    ctx.fillStyle = '#050307'
    ctx.lineCap = 'round'
    // the trunk: a gentle curve, thicker at the foot
    for (let i = 0; i < 3; i++) {
      ctx.lineWidth = p.height * (0.03 - i * 0.008)
      ctx.beginPath()
      ctx.moveTo(p.x, p.base)
      ctx.quadraticCurveTo(p.x + p.height * p.lean * 0.2, p.base - p.height * 0.55, topX, topY + i * p.height * 0.01)
      ctx.stroke()
    }
    // the fronds: arching, tapering leaves with a ragged lower edge, drooping at the tips
    for (const f of p.fronds) {
      const a = f.a + sway * 3 + Math.sin(t * 1.3 + p.phase + f.a) * 0.035
      const ex = topX + Math.cos(a) * f.len
      const ey = topY + Math.sin(a) * f.len * 0.5 + f.len * 0.5 * f.droop
      const cx = topX + Math.cos(a) * f.len * 0.6
      const cy = topY + Math.sin(a) * f.len * 0.6 - f.len * 0.16
      const at = (s) => [
        (1 - s) * (1 - s) * topX + 2 * (1 - s) * s * cx + s * s * ex,
        (1 - s) * (1 - s) * topY + 2 * (1 - s) * s * cy + s * s * ey,
      ]
      const N = 30
      const upper = []
      const lower = []
      const wide = f.len * 0.11
      for (let i = 0; i <= N; i++) {
        const s = i / N
        const [x, y] = at(s)
        const [x2, y2] = at(Math.min(1, s + 0.01))
        let nx = -(y2 - y)
        let ny = x2 - x
        const len = Math.hypot(nx, ny) || 1
        nx /= len
        ny /= len
        if (ny < 0) {
          nx = -nx
          ny = -ny
        }
        const w = wide * Math.sin(Math.PI * Math.min(1, s * 1.05)) ** 0.8
        upper.push([x - nx * w * 0.35, y - ny * w * 0.35])
        // the leaflets hang down: a deeper, ragged edge underneath
        const rag = i % 2 ? 1.3 : 0.7
        lower.push([x + nx * w * rag, y + ny * w * rag + (i % 2 ? w * 0.35 : 0)])
      }
      ctx.beginPath()
      ctx.moveTo(upper[0][0], upper[0][1])
      for (const [x, y] of upper) ctx.lineTo(x, y)
      for (let i = lower.length - 1; i >= 0; i--) ctx.lineTo(lower[i][0], lower[i][1])
      ctx.closePath()
      ctx.fill()
    }
    // a knot of coconuts / leaf bases at the crown
    ctx.beginPath()
    ctx.arc(topX, topY + p.height * 0.01, p.height * 0.022, 0, Math.PI * 2)
    ctx.fill()
  }

  function frame(now) {
    const t = still ? 4 : (now - start) / 1000
    const { stars, clouds, far, near, palms, cars, grain } = scene

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, horizon)
    for (const [stop, color] of SKY) sky.addColorStop(stop, color)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, horizon)
    for (const s of stars) {
      ctx.globalAlpha = 0.35 + 0.45 * Math.sin(t * 1.6 + s.phase) ** 2
      ctx.fillStyle = '#fff4e0'
      ctx.fillRect(s.x, s.y, s.r, s.r)
    }
    ctx.globalAlpha = 1

    drawSun(t)

    // clouds drifting across the sun
    for (const c of clouds) {
      const x = ((c.x + t * c.speed) % (W + c.w)) - c.w
      const g = ctx.createLinearGradient(x, 0, x + c.w, 0)
      g.addColorStop(0, 'rgba(110,30,80,0)')
      g.addColorStop(0.5, `rgba(110,30,80,${c.alpha})`)
      g.addColorStop(1, 'rgba(110,30,80,0)')
      ctx.fillStyle = g
      ctx.fillRect(x, c.y, c.w, c.h)
    }

    // the skyline: the far layer drifts a touch, the near one a touch more (a slow camera move)
    const pan = Math.sin(t * 0.08) * W * 0.01
    ctx.drawImage(far.layer, pan * 0.5, 0)
    ctx.drawImage(near.layer, pan, 0)
    for (const l of near.lights) {
      if (l.kind === 'window') {
        if (t < l.on) continue // the city switching its lights on as it loads
        const flick = Math.sin(t * 0.6 + l.x * 0.13 + l.y * 0.07) > -0.96
        if (!flick) continue
        ctx.fillStyle = l.warm ? 'rgba(255,196,110,0.85)' : 'rgba(170,210,255,0.7)'
        ctx.fillRect(l.x + pan, l.y, 2, 3)
      } else if (Math.sin(t * 2.4 + l.phase) > 0.55) {
        ctx.fillStyle = '#ff3b4e'
        ctx.beginPath()
        ctx.arc(l.x + pan, l.y, 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // the sea, with the sun's reflection breaking up in lines
    const sea = ctx.createLinearGradient(0, horizon, 0, H)
    sea.addColorStop(0, '#2a0d2a')
    sea.addColorStop(0.5, '#0c0610')
    sea.addColorStop(1, '#040305')
    ctx.fillStyle = sea
    ctx.fillRect(0, horizon, W, H - horizon)
    const { x: sx, r: sr } = scene.sun
    ctx.globalCompositeOperation = 'lighter'
    for (let y = horizon + 3, i = 0; y < H * 0.86; y += 5 + i * 0.4, i++) {
      const depth = (y - horizon) / (H - horizon)
      const w = sr * (1.1 - depth * 0.6) * (0.6 + 0.4 * Math.sin(t * 1.8 + i * 1.7))
      const a = 0.5 * (1 - depth * 1.1)
      if (a <= 0) break
      ctx.fillStyle = `rgba(255,${150 - depth * 80},${90 - depth * 30},${a})`
      ctx.fillRect(sx - w / 2 + Math.sin(t * 1.1 + i) * sr * 0.08, y, w, 1.6)
    }

    // the coast road: light trails streaking both ways
    const roadY = H * 0.88
    for (const c of cars) {
      const x = ((((c.x + c.dir * t * c.speed) % (W + c.len * 2)) + W + c.len * 2) % (W + c.len * 2)) - c.len
      const y = roadY + (c.dir > 0 ? 0 : H * 0.018) + c.lane * H * 0.01
      const g = ctx.createLinearGradient(x, 0, x + c.dir * c.len, 0)
      const color = c.dir > 0 ? '255,230,180' : '255,60,70'
      g.addColorStop(0, `rgba(${color},0)`)
      g.addColorStop(1, `rgba(${color},0.9)`)
      ctx.fillStyle = g
      ctx.fillRect(Math.min(x, x + c.dir * c.len), y, c.len, Math.max(1.5, H * 0.003))
    }
    ctx.globalCompositeOperation = 'source-over'

    for (const p of palms) drawPalm(p, t)

    // grain and vignette
    const gx = Math.floor(Math.random() * 160)
    const gy = Math.floor(Math.random() * 160)
    ctx.fillStyle = ctx.createPattern(grain, 'repeat')
    ctx.save()
    ctx.translate(-gx, -gy)
    ctx.fillRect(gx, gy, W, H)
    ctx.restore()
    const vig = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75)
    vig.addColorStop(0, 'rgba(0,0,0,0)')
    vig.addColorStop(1, 'rgba(0,0,0,0.72)')
    ctx.fillStyle = vig
    ctx.fillRect(0, 0, W, H)

    if (!still) raf = requestAnimationFrame(frame)
  }

  const onResize = () => {
    build()
    if (still) frame(performance.now())
  }
  build()
  start = performance.now()
  raf = requestAnimationFrame(frame)
  window.addEventListener('resize', onResize)
  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', onResize)
  }
}
