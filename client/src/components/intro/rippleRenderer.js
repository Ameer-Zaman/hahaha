/**
 * Water-drop transition for the welcome screen — a single fragment shader, no libraries.
 *
 * The welcome screen is painted into a texture. The shader then:
 *  1. on arrival, drops a single "drop" at the centre: soft rings spread through the text;
 *  2. as the visitor scrolls, sends a wave front outwards from the centre. Ahead of the
 *     front the screen refracts (with a faint gold crest and colour split); behind it the
 *     screen turns transparent, revealing the site underneath.
 *
 * createRipple(canvas, paint) → { setProgress(0..1), resize(), dispose() } or null without WebGL.
 * `paint(ctx, width, height)` draws the welcome screen into a 2D canvas (device pixels).
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uTime;   // seconds since mount
uniform float uFade;   // 0..1 text fade-in
uniform float uProg;   // 0..1 transition progress
varying vec2 vUv;

const vec3 BG = vec3(0.0235, 0.0275, 0.0392);
const vec3 GOLD = vec3(0.89, 0.71, 0.35);

void main() {
  vec2 aspect = vec2(uRes.x / uRes.y, 1.0);
  vec2 dv = (vUv - 0.5) * aspect;
  float d = length(dv);
  vec2 dir = d > 0.0001 ? dv / d : vec2(0.0);

  // 1) The arrival drop: rings spreading from the centre, fading as they travel.
  float t = uTime;
  float spread = t * 0.42;
  float inside = smoothstep(spread + 0.04, spread - 0.22, d);
  float drop = sin(d * 46.0 - t * 8.5) * exp(-d * 2.4) * exp(-t * 0.85) * inside;
  vec2 offset = dir * drop * 0.0055;

  // 2) The transition wave: a crest at radius R with trailing ripples.
  float R = uProg * 1.3;
  float x = d - R;
  float active = smoothstep(0.0, 0.04, uProg);
  float crest = exp(-(x * x) / 0.0035);
  float wake = sin(x * 64.0 - t * 5.0) * exp(-abs(x) * 8.0);
  offset += dir * (crest * 0.045 + wake * 0.011) * active;

  vec2 uv = vUv - offset / aspect;
  vec2 split = dir / aspect * crest * 0.005 * active;

  vec3 col;
  col.r = texture2D(uTex, uv + split).r;
  col.g = texture2D(uTex, uv).g;
  col.b = texture2D(uTex, uv - split).b;

  // text fades in over the plain background on arrival
  col = mix(BG, col, uFade);
  // a faint gold light riding the crest
  col += GOLD * crest * 0.32 * active * (1.0 - uProg * 0.7);

  // behind the wave the screen is gone: transparent, so the site shows through
  float alpha = mix(1.0, smoothstep(R - 0.07, R + 0.012, d), active);
  gl_FragColor = vec4(col * alpha, alpha);
}`

export function createRipple(canvas, paint) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
  if (!gl) return null

  const compile = (type, src) => {
    const s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
    return s
  }
  let program
  try {
    program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link failed')
  } catch {
    return null
  }
  gl.useProgram(program)

  // full-screen triangle pair
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(program, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const u = {
    tex: gl.getUniformLocation(program, 'uTex'),
    res: gl.getUniformLocation(program, 'uRes'),
    time: gl.getUniformLocation(program, 'uTime'),
    fade: gl.getUniformLocation(program, 'uFade'),
    prog: gl.getUniformLocation(program, 'uProg'),
  }

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.uniform1i(u.tex, 0)

  const paintCanvas = document.createElement('canvas')
  const paintCtx = paintCanvas.getContext('2d')

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
    canvas.width = paintCanvas.width = w
    canvas.height = paintCanvas.height = h
    gl.viewport(0, 0, w, h)
    paint(paintCtx, w, h, dpr)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paintCanvas)
    gl.uniform2f(u.res, w, h)
    wake()
  }

  let start = null // set by reveal(): the text stays hidden until then
  let progress = 0
  let raf = 0

  const frame = (now) => {
    raf = 0
    const t = start === null ? 0 : (now - start) / 1000
    gl.uniform1f(u.time, t)
    gl.uniform1f(u.fade, start === null ? 0 : Math.min(1, Math.max(0, t / 0.7)))
    gl.uniform1f(u.prog, progress)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    // keep animating while the arrival drop is still moving or a wave is under way
    if (start !== null && (t < 5 || progress > 0)) raf = requestAnimationFrame(frame)
  }

  function wake() {
    if (!raf) raf = requestAnimationFrame(frame)
  }

  window.addEventListener('resize', resize)
  resize()

  return {
    /** Starts the entrance: the text fades in and the arrival drop plays. */
    reveal() {
      if (start !== null) return
      start = performance.now()
      wake()
    },
    setProgress(value) {
      progress = value
      wake()
    },
    resize,
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}

/**
 * The welcome screen, painted for the water canvas:
 * wide screens — the words on the left (a gold handwritten "Welcome to", the name in two big
 * ivory lines, a gold hairline, a small line below) and the picture on the right, melting into
 * the dark; phones — the picture across the top, the words underneath.
 * `image` is optional (an HTMLImageElement that has loaded); without it the words stand alone.
 */
export function paintWelcome(name, { script = 'Welcome to', tagline = '' } = {}, image = null) {
  return (ctx, w, h, dpr) => {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#050507'
    ctx.fillRect(0, 0, w, h)
    const phone = w / h < 0.9
    const live = image === 'live' // a live figure is drawn on top of this canvas; leave its space lit
    const pic = live ? null : image && image.naturalWidth ? image : null

    if (pic) paintPicture(ctx, pic, w, h, phone)
    else if (live) paintStage(ctx, w, h, phone, dpr)
    else {
      const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.55)
      glow.addColorStop(0, 'rgba(227,181,90,0.09)')
      glow.addColorStop(1, 'rgba(227,181,90,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, h)
    }

    // the words: left-aligned on wide screens, under the picture on phones
    const words = name.toUpperCase().split(/\s+/).filter(Boolean)
    const lines =
      words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words
    const left = phone ? w * 0.08 : w * 0.075
    const maxW = phone ? w * 0.84 : pic || live ? w * 0.42 : w * 0.6
    const maxLineH = phone ? h * 0.1 : h * 0.17
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    const tracking = 0.012
    ctx.font = `100px Anton, Impact, "Arial Narrow Bold", sans-serif`
    const widest = Math.max(...lines.map((l) => spacedWidth(ctx, l, 100 * tracking) - 100 * tracking))
    const capRatio = (ctx.measureText('H').actualBoundingBoxAscent || 86) / 100
    const size = Math.min((maxW * 100) / widest, maxLineH / capRatio, 230 * dpr)
    ctx.font = `${size}px Anton, Impact, "Arial Narrow Bold", sans-serif`
    const capH = size * capRatio
    const gap = capH * 0.16
    const blockH = capH * lines.length + gap * (lines.length - 1)
    const sSize = size * (phone ? 0.62 : 0.5)
    const top = phone ? h * 0.555 : h / 2 - blockH / 2 + sSize * 0.2
    const firstBase = top + capH

    // "Welcome to": gold script, slightly tilted, just above the name
    ctx.font = `${sSize}px Sacramento, "Brush Script MT", cursive`
    const sW = ctx.measureText(script).width
    ctx.save()
    ctx.translate(left + size * 0.04, top - capH * 0.08)
    ctx.rotate((-5 * Math.PI) / 180)
    const gold = ctx.createLinearGradient(0, 0, sW, 0)
    gold.addColorStop(0, '#fff2c9')
    gold.addColorStop(0.3, '#f2cf80')
    gold.addColorStop(0.65, '#e3b55a')
    gold.addColorStop(1, '#b5852f')
    ctx.shadowColor = 'rgba(0,0,0,0.9)'
    ctx.shadowBlur = 18 * dpr
    ctx.shadowOffsetY = 4 * dpr
    ctx.fillStyle = gold
    ctx.fillText(script, 0, 0)
    ctx.shadowColor = 'transparent'
    ctx.fillText(script, 0, 0)
    ctx.strokeStyle = gold
    ctx.lineWidth = Math.max(1, sSize * 0.012)
    ctx.lineJoin = 'round'
    ctx.strokeText(script, 0, 0)
    ctx.restore()

    // the name, in ivory, one or two lines; a soft shadow lifts it off the picture
    ctx.font = `${size}px Anton, Impact, "Arial Narrow Bold", sans-serif`
    lines.forEach((line, i) => {
      const base = firstBase + i * (capH + gap)
      const ivory = ctx.createLinearGradient(0, base - capH, 0, base)
      ivory.addColorStop(0, '#fbf7ef')
      ivory.addColorStop(1, '#e2d8c5')
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.75)'
      ctx.shadowBlur = 30 * dpr
      ctx.fillStyle = ivory
      drawSpaced(ctx, line, left, base, size * tracking)
      ctx.restore()
    })
    const lastBase = firstBase + (lines.length - 1) * (capH + gap)

    // a gold hairline that fades out, and the small line below
    const lineY = lastBase + Math.max(capH * 0.32, 18 * dpr)
    const lineW = Math.min(maxW * 0.55, 260 * dpr)
    const hair = ctx.createLinearGradient(left, 0, left + lineW, 0)
    hair.addColorStop(0, 'rgba(227,181,90,0.95)')
    hair.addColorStop(1, 'rgba(227,181,90,0)')
    ctx.fillStyle = hair
    ctx.fillRect(left, lineY, lineW, Math.max(1, dpr))
    ctx.beginPath()
    ctx.fillStyle = '#e3b55a'
    ctx.arc(left, lineY + dpr / 2, 2.5 * dpr, 0, Math.PI * 2)
    ctx.fill()
    if (tagline) {
      const tSize = Math.max(11 * dpr, Math.min(size * 0.075, 14 * dpr))
      ctx.font = `${tSize}px "Space Mono", ui-monospace, monospace`
      ctx.fillStyle = 'rgba(244,239,230,0.62)'
      drawSpaced(ctx, tagline.toUpperCase(), left, lineY + tSize * 2.3, tSize * 0.45)
    }
  }
}

/** The space for the live figure: a warm light behind it and a few embers in the air. */
function paintStage(ctx, w, h, phone, dpr) {
  const gx = phone ? w / 2 : w * 0.72
  const gy = phone ? h * 0.3 : h * 0.42
  const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.55)
  glow.addColorStop(0, 'rgba(227,181,90,0.16)')
  glow.addColorStop(0.4, 'rgba(160,110,40,0.06)')
  glow.addColorStop(1, 'rgba(227,181,90,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  let seed = 3
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 46; i++) {
    const x = phone ? rnd() * w : w * 0.45 + rnd() * w * 0.55
    const y = phone ? rnd() * h * 0.62 : rnd() * h
    const r = (0.7 + rnd() * 1.6) * dpr
    const e = ctx.createRadialGradient(x, y, 0, x, y, r * 4)
    e.addColorStop(0, `rgba(255,${190 + rnd() * 50},120,${0.35 + rnd() * 0.45})`)
    e.addColorStop(1, 'rgba(255,160,60,0)')
    ctx.fillStyle = e
    ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8)
  }
}

/** The picture: on the right (wide screens) or across the top (phones), melting into the dark. */
function paintPicture(ctx, pic, w, h, phone) {
  const iw = pic.naturalWidth
  const ih = pic.naturalHeight
  let dw
  let dh
  let dx
  let dy
  if (phone) {
    // across the top, covering the width, the top two thirds of the screen
    const areaH = h * 0.66
    const s = Math.max(w / iw, areaH / ih)
    dw = iw * s
    dh = ih * s
    dx = (w - dw) / 2
    dy = 0
  } else {
    // the right side: full height, anchored to the right edge; any extra height is cut
    // mostly from the bottom, so the head stays in view
    const areaW = w * 0.6
    const s = Math.max(h / ih, areaW / iw)
    dw = iw * s
    dh = ih * s
    dx = w - dw
    dy = (h - dh) * 0.25
  }
  // a warm light behind the figure
  const gx = phone ? w / 2 : w * 0.72
  const gy = phone ? h * 0.3 : h * 0.4
  const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.6)
  glow.addColorStop(0, 'rgba(227,181,90,0.12)')
  glow.addColorStop(1, 'rgba(227,181,90,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(pic, dx, dy, dw, dh)
  // melt the edges into the background
  const bg = (a) => `rgba(5,5,7,${a})`
  if (phone) {
    const fade = ctx.createLinearGradient(0, h * 0.34, 0, h * 0.66)
    fade.addColorStop(0, bg(0))
    fade.addColorStop(1, bg(1))
    ctx.fillStyle = fade
    ctx.fillRect(0, h * 0.34, w, h * 0.66 - h * 0.34 + 1)
    ctx.fillStyle = bg(1)
    ctx.fillRect(0, h * 0.66, w, h)
    const topFade = ctx.createLinearGradient(0, 0, 0, h * 0.12)
    topFade.addColorStop(0, bg(0.7))
    topFade.addColorStop(1, bg(0))
    ctx.fillStyle = topFade
    ctx.fillRect(0, 0, w, h * 0.12)
  } else {
    const x0 = Math.max(0, w - w * 0.6)
    ctx.fillStyle = bg(1)
    ctx.fillRect(0, 0, x0, h)
    const side = ctx.createLinearGradient(x0, 0, x0 + w * 0.24, 0)
    side.addColorStop(0, bg(1))
    side.addColorStop(1, bg(0))
    ctx.fillStyle = side
    ctx.fillRect(x0, 0, w * 0.24 + 1, h)
    for (const [y0, y1, a0, a1] of [
      [h * 0.78, h, 0, 1],
      [0, h * 0.14, 0.8, 0],
    ]) {
      const vf = ctx.createLinearGradient(0, y0, 0, y1)
      vf.addColorStop(0, bg(a0))
      vf.addColorStop(1, bg(a1))
      ctx.fillStyle = vf
      ctx.fillRect(x0, y0, w - x0, y1 - y0)
    }
  }
}

function spacedWidth(ctx, text, tracking) {
  return [...text].reduce((sum, ch) => sum + ctx.measureText(ch).width + tracking, 0)
}

/** Draws `text` starting at x with extra space between letters (no trailing space). */
function drawSpaced(ctx, text, x, y, tracking) {
  let cursor = x
  for (const ch of text) {
    ctx.fillText(ch, cursor, y)
    cursor += ctx.measureText(ch).width + tracking
  }
}
