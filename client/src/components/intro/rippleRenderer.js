/**
 * Water-drop transition for the welcome screen — a single fragment shader, no libraries.
 *
 * The welcome screen is painted into a texture. The shader then:
 *  1. on arrival, fades the text in over the background — no rings;
 *  2. follows the cursor: moving the pointer drops water where it goes, so the text ripples
 *     under the hand. This is the only water on the screen;
 *  3. as the visitor scrolls, clears the screen from the centre outwards — a plain soft-edged
 *     opening, no wave crest — revealing the site underneath.
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
#define DROPS 10
#define DROP_LIFE 1.5
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uTime;   // seconds since mount
uniform float uFade;   // 0..1 text fade-in
uniform float uProg;   // 0..1 transition progress
uniform vec3 uDrops[DROPS]; // cursor drops: xy in aspect space, z = birth time (<0: unused)
varying vec2 vUv;

const vec3 BG = vec3(0.0235, 0.0275, 0.0392);
const vec3 GOLD = vec3(0.89, 0.71, 0.35);

void main() {
  vec2 aspect = vec2(uRes.x / uRes.y, 1.0);
  vec2 dv = (vUv - 0.5) * aspect;
  float d = length(dv);

  float t = uTime;
  vec2 offset = vec2(0.0);

  // The cursor's wake: a small drop wherever the hand has just been.
  float lift = 0.0;
  for (int i = 0; i < DROPS; i++) {
    float born = uDrops[i].z;
    if (born < 0.0) continue;
    float age = t - born;
    if (age < 0.0 || age > DROP_LIFE) continue;
    vec2 pv = dv - uDrops[i].xy;
    float pd = length(pv);
    vec2 pdir = pd > 0.0001 ? pv / pd : vec2(0.0);
    float ring = sin(pd * 58.0 - age * 13.0);        // rings running outwards
    float reach = smoothstep(age * 0.55 + 0.04, age * 0.55 - 0.2, pd); // front edge
    float fade = 1.0 - age / DROP_LIFE;
    float decay = exp(-pd * 4.6) * fade * fade;
    float w = ring * reach * decay;
    offset += pdir * w * 0.013;
    lift += abs(w);
  }

  // The transition: an opening that grows from the centre, with a soft edge.
  float R = uProg * 1.3;
  float active = smoothstep(0.0, 0.04, uProg);

  vec2 uv = vUv - offset / aspect;
  vec3 col = texture2D(uTex, uv).rgb;

  // text fades in over the plain background on arrival
  col = mix(BG, col, uFade);
  // a faint gold sheen where the cursor lifts the water
  col += GOLD * min(lift, 1.0) * 0.14 * (1.0 - uProg);

  // inside the opening the screen is gone: transparent, so the site shows through
  float alpha = mix(1.0, smoothstep(R - 0.09, R + 0.02, d), active);
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
    drops: gl.getUniformLocation(program, 'uDrops') ?? gl.getUniformLocation(program, 'uDrops[0]'),
  }

  // the cursor's drops, oldest overwritten first: [x, y, birth] × DROPS, birth < 0 = unused
  const DROPS = 10
  const DROP_LIFE = 1.5
  const drops = new Float32Array(DROPS * 3).fill(-1)
  let dropAt = 0

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
    // retire drops that have faded, so the shader can skip them
    let live = false
    for (let i = 0; i < DROPS; i++) {
      const born = drops[i * 3 + 2]
      if (born < 0) continue
      if (t - born > DROP_LIFE) drops[i * 3 + 2] = -1
      else live = true
    }
    gl.uniform3fv(u.drops, drops)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    // keep drawing while the text fades in, the cursor's water moves, or the screen is opening
    if (start !== null && (t < 1 || progress > 0 || live)) raf = requestAnimationFrame(frame)
  }

  function wake() {
    if (!raf) raf = requestAnimationFrame(frame)
  }

  // The cursor drops water as it moves: a new drop every so often along its path.
  let lastDrop = { x: 0, y: 0, at: -1 }
  const onMove = (e) => {
    if (start === null || progress > 0.02) return // not before the text, not during the wave
    if (e.pointerType === 'touch') return // a finger is scrolling, not drawing
    const t = (performance.now() - start) / 1000
    // the canvas fills the screen; to aspect space, the same frame the shader works in
    const aspect = canvas.clientWidth / canvas.clientHeight
    const x = (e.clientX / canvas.clientWidth - 0.5) * aspect
    const y = (1 - e.clientY / canvas.clientHeight - 0.5)
    // one drop at a time, and only once the hand has actually travelled
    const far = Math.hypot(x - lastDrop.x, y - lastDrop.y) > 0.045
    if (lastDrop.at >= 0 && t - lastDrop.at < 0.06) return
    if (lastDrop.at >= 0 && !far) return
    lastDrop = { x, y, at: t }
    drops[dropAt * 3] = x
    drops[dropAt * 3 + 1] = y
    drops[dropAt * 3 + 2] = t
    dropAt = (dropAt + 1) % DROPS
    wake()
  }

  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', onMove, { passive: true })
  resize()

  return {
    /** Starts the entrance: the text fades in. */
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
      window.removeEventListener('pointermove', onMove)
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}

/** Paints the royal, minimal welcome card: "Welcome to" · the name · a gold hairline. */
/**
 * The welcome card, painted for the water canvas — the same design as the DOM card:
 * the name huge in ivory, a gold handwritten "Welcome to" across its top, a small line below.
 */
export function paintWelcome(name, { script = 'Welcome to', tagline = '' } = {}) {
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

    // the name: ~65% of the screen wide (88% on phones), capped on very wide screens
    const title = name.toUpperCase()
    const tracking = 0.01
    ctx.font = `100px Anton, Impact, "Arial Narrow Bold", sans-serif`
    const per100 = spacedWidth(ctx, title, 100 * tracking) - 100 * tracking
    const size = Math.min(((phone ? 0.88 : 0.65) * w * 100) / per100, 260 * dpr)
    ctx.font = `${size}px Anton, Impact, "Arial Narrow Bold", sans-serif`
    const titleW = spacedWidth(ctx, title, size * tracking) - size * tracking
    const capH = ctx.measureText('H').actualBoundingBoxAscent || size * 0.86
    const baseline = cy + capH / 2
    const ivory = ctx.createLinearGradient(0, baseline - capH, 0, baseline)
    ivory.addColorStop(0, '#fbf7ef')
    ivory.addColorStop(1, '#e9e1d2')
    ctx.fillStyle = ivory
    drawSpaced(ctx, title, cx - titleW / 2, baseline, size * tracking)

    // "Welcome to" in gold script, tilted, across the top of the name
    const sSize = size * (phone ? 0.7 : 0.56)
    ctx.font = `${sSize}px Sacramento, "Brush Script MT", cursive`
    const sW = ctx.measureText(script).width
    const sy = baseline - capH * 0.66
    ctx.save()
    ctx.translate(cx, sy)
    ctx.rotate((-6 * Math.PI) / 180)
    const gold = ctx.createLinearGradient(-sW / 2, 0, sW / 2, 0)
    gold.addColorStop(0, '#fff2c9')
    gold.addColorStop(0.3, '#f2cf80')
    gold.addColorStop(0.6, '#e3b55a')
    gold.addColorStop(1, '#b5852f')
    ctx.shadowColor = 'rgba(0,0,0,0.9)'
    ctx.shadowBlur = 18 * dpr
    ctx.shadowOffsetY = 4 * dpr
    ctx.fillStyle = gold
    ctx.textAlign = 'center'
    ctx.fillText(script, 0, 0)
    ctx.shadowColor = 'transparent'
    ctx.fillText(script, 0, 0) // a second pass keeps the strokes crisp over the shadow
    ctx.strokeStyle = gold // a fine outline gives the thin script a little more body
    ctx.lineWidth = Math.max(1, sSize * 0.012)
    ctx.lineJoin = 'round'
    ctx.strokeText(script, 0, 0)
    ctx.restore()

    // the small line below
    if (tagline) {
      const tSize = Math.max(11 * dpr, Math.min(size * 0.06, 14 * dpr))
      ctx.font = `${tSize}px "Space Mono", ui-monospace, monospace`
      const text = tagline.toUpperCase()
      const tTrack = tSize * 0.5
      const tW = spacedWidth(ctx, text, tTrack) - tTrack
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(244,239,230,0.55)'
      drawSpaced(ctx, text, cx - tW / 2, baseline + Math.max(tSize * 2.6, size * 0.16), tTrack)
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
