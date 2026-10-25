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

  const start = performance.now()
  let progress = 0
  let raf = 0

  const frame = (now) => {
    raf = 0
    const t = (now - start) / 1000
    gl.uniform1f(u.time, t)
    gl.uniform1f(u.fade, Math.min(1, Math.max(0, (t - 0.15) / 1.3)))
    gl.uniform1f(u.prog, progress)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    // keep animating while the arrival drop is still moving or a wave is under way
    if (t < 5 || progress > 0) raf = requestAnimationFrame(frame)
  }

  function wake() {
    if (!raf) raf = requestAnimationFrame(frame)
  }

  window.addEventListener('resize', resize)
  resize()

  return {
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

/** Paints the royal, minimal welcome card: "Welcome to" · SHYASTHA · a gold hairline. */
/**
 * The welcome card, painted for the water canvas — the same design as the DOM card:
 * "WELCOME TO" between hairlines, the name huge in gold, a slanted gold badge below.
 */
export function paintWelcome(name, { kicker = 'Welcome to', badge = '' } = {}) {
  return (ctx, w, h, dpr) => {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#050507'
    ctx.fillRect(0, 0, w, h)
    const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.55)
    glow.addColorStop(0, 'rgba(227,181,90,0.09)')
    glow.addColorStop(1, 'rgba(227,181,90,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)

    const cx = w / 2
    const cy = h / 2
    const phone = w / dpr < 600
    ctx.textBaseline = 'alphabetic'

    // the name: as wide as ~60% of the screen (86% on phones), capped for very wide screens
    const title = name.toUpperCase()
    const tracking = 0.02
    ctx.font = `100px Anton, Impact, "Arial Narrow Bold", sans-serif`
    const per100 = spacedWidth(ctx, title, 100 * tracking) - 100 * tracking
    const size = Math.min(((phone ? 0.86 : 0.6) * w * 100) / per100, 240 * dpr)
    ctx.font = `${size}px Anton, Impact, "Arial Narrow Bold", sans-serif`
    const titleW = spacedWidth(ctx, title, size * tracking) - size * tracking
    const capH = ctx.measureText('H').actualBoundingBoxAscent || size * 0.86 // the capitals' real height
    const baseline = cy + capH / 2 - size * 0.04
    const grad = ctx.createLinearGradient(cx - titleW / 2, 0, cx + titleW / 2, 0)
    grad.addColorStop(0, '#fff2c9')
    grad.addColorStop(0.25, '#f2cf80')
    grad.addColorStop(0.5, '#e3b55a')
    grad.addColorStop(0.75, '#b5852f')
    grad.addColorStop(1, '#efcb7a')
    ctx.save()
    ctx.shadowColor = 'rgba(227,181,90,0.25)'
    ctx.shadowBlur = 40 * dpr
    ctx.fillStyle = grad
    drawSpaced(ctx, title, cx - titleW / 2, baseline, size * tracking)
    ctx.restore()

    // "WELCOME TO" between two hairlines, above
    const small = Math.max(11 * dpr, Math.min(size * 0.085, 16 * dpr))
    ctx.font = `${small}px "Space Mono", ui-monospace, monospace`
    const kText = kicker.toUpperCase()
    const kTrack = small * 0.6
    const kW = spacedWidth(ctx, kText, kTrack) - kTrack
    const ky = baseline - capH - small * 1.9
    ctx.fillStyle = 'rgba(244,239,230,0.72)'
    drawSpaced(ctx, kText, cx - kW / 2, ky, kTrack)
    const lineW = Math.min(60 * dpr, w * 0.08)
    const gap = small * 1.2
    const ly = ky - small * 0.35
    ctx.strokeStyle = 'rgba(227,181,90,0.7)'
    ctx.lineWidth = Math.max(1, dpr)
    ctx.beginPath()
    ctx.moveTo(cx - kW / 2 - gap - lineW, ly)
    ctx.lineTo(cx - kW / 2 - gap, ly)
    ctx.moveTo(cx + kW / 2 + gap, ly)
    ctx.lineTo(cx + kW / 2 + gap + lineW, ly)
    ctx.stroke()

    // the slanted gold badge, below
    if (badge) {
      const bSize = Math.max(13 * dpr, Math.min(size * 0.105, 22 * dpr))
      ctx.font = `${bSize}px Anton, Impact, "Arial Narrow Bold", sans-serif`
      const bText = badge.toUpperCase()
      const bTrack = bSize * 0.18
      const bW = spacedWidth(ctx, bText, bTrack) - bTrack
      const padX = bSize * 1.1
      const boxH = bSize * 2.2
      const top = baseline + size * 0.16
      const skew = boxH * 0.21
      ctx.fillStyle = '#e3b55a'
      ctx.beginPath()
      ctx.moveTo(cx - bW / 2 - padX + skew, top)
      ctx.lineTo(cx + bW / 2 + padX + skew, top)
      ctx.lineTo(cx + bW / 2 + padX - skew, top + boxH)
      ctx.lineTo(cx - bW / 2 - padX - skew, top + boxH)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#0b0b0e'
      drawSpaced(ctx, bText, cx - bW / 2, top + boxH / 2 + bSize * 0.36, bTrack)
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
