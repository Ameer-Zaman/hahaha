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
export function paintWelcome(name) {
  return (ctx, w, h, dpr) => {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#06070a'
    ctx.fillRect(0, 0, w, h)
    const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.5)
    glow.addColorStop(0, 'rgba(227,181,90,0.07)')
    glow.addColorStop(1, 'rgba(227,181,90,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)

    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const cx = w / 2
    const cy = h / 2

    // Large name, widely tracked, metallic gold
    // a touch larger on narrow (phone) screens so the name still commands the screen
    const size = Math.min(w * (w / dpr < 600 ? 0.118 : 0.095), 128 * dpr)
    ctx.font = `500 ${size}px Cinzel, "Times New Roman", serif`
    const title = name.toUpperCase()
    const tracking = size * 0.2
    const titleW = spacedWidth(ctx, title, tracking)
    const grad = ctx.createLinearGradient(cx - titleW / 2, 0, cx + titleW / 2, 0)
    grad.addColorStop(0, '#fff2c9')
    grad.addColorStop(0.3, '#f2cf80')
    grad.addColorStop(0.55, '#e3b55a')
    grad.addColorStop(0.8, '#b5852f')
    grad.addColorStop(1, '#efcb7a')
    ctx.fillStyle = grad
    drawSpaced(ctx, title, cx - (titleW - tracking) / 2, cy, tracking)

    // "WELCOME TO" above
    const small = Math.max(11 * dpr, size * 0.13)
    ctx.font = `500 ${small}px Cinzel, "Times New Roman", serif`
    ctx.fillStyle = 'rgba(244,239,230,0.72)'
    const kicker = 'WELCOME TO'
    const kTrack = small * 0.55
    const kW = spacedWidth(ctx, kicker, kTrack)
    drawSpaced(ctx, kicker, cx - (kW - kTrack) / 2, cy - size * 0.82, kTrack)

    // hairline · diamond · hairline below
    const ly = cy + size * 0.78
    const half = Math.min(titleW * 0.32, 220 * dpr)
    ctx.strokeStyle = 'rgba(227,181,90,0.75)'
    ctx.lineWidth = Math.max(1, dpr)
    ctx.beginPath()
    ctx.moveTo(cx - half, ly)
    ctx.lineTo(cx - 12 * dpr, ly)
    ctx.moveTo(cx + 12 * dpr, ly)
    ctx.lineTo(cx + half, ly)
    ctx.stroke()
    ctx.save()
    ctx.translate(cx, ly)
    ctx.rotate(Math.PI / 4)
    ctx.fillStyle = '#e3b55a'
    const dm = 4.5 * dpr
    ctx.fillRect(-dm / 2, -dm / 2, dm, dm)
    ctx.restore()
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
