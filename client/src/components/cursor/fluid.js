/**
 * A small WebGL fluid simulation (stable fluids: advection, vorticity, pressure projection)
 * that turns mouse movement into a flowing gold smoke trail. Runs only while there's
 * something to show: it starts on movement and sleeps once the smoke has faded.
 *
 * createFluid(canvas) → { dispose } or null when the browser can't run it.
 */
const SIM_RES = 128 // velocity / pressure grid (the flow)
const DYE_RES = 512 // the smoke's own resolution
const PRESSURE_ITERATIONS = 18
const PRESSURE = 0.8
const CURL = 18 // swirl
const VELOCITY_DISSIPATION = 0.35
const DENSITY_DISSIPATION = 2.2 // how quickly the smoke fades
const SPLAT_RADIUS = 0.09 // percent of the screen
const SPLAT_FORCE = 3400
const MAX_STEP = 0.04 // limits a single jump of the mouse, so a flick doesn't flood the screen
const SLEEP_AFTER_MS = 3500

// gold tones, picked in turn so the trail shimmers between them (kept dim: it adds up)
const PALETTE = [
  [0.89, 0.71, 0.35],
  [0.95, 0.81, 0.5],
  [0.71, 0.52, 0.18],
  [1.0, 0.9, 0.66],
]
const INTENSITY = 0.07

const VERT = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv, vL, vR, vT, vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const FRAG = {
  clear: `precision mediump float; varying vec2 vUv; uniform sampler2D uTexture; uniform float value;
    void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`,
  splat: `precision highp float; varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio;
    uniform vec3 color; uniform vec2 point; uniform float radius;
    void main () {
      vec2 p = vUv - point; p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
    }`,
  advection: `precision highp float; varying vec2 vUv; uniform sampler2D uVelocity; uniform sampler2D uSource;
    uniform vec2 texelSize; uniform float dt; uniform float dissipation;
    void main () {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      gl_FragColor = texture2D(uSource, coord) / (1.0 + dissipation * dt);
    }`,
  divergence: `precision mediump float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).x; float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y; float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x;
      if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }`,
  curl: `precision mediump float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uVelocity, vL).y; float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x; float B = texture2D(uVelocity, vB).x;
      gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
    }`,
  vorticity: `precision highp float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity; uniform sampler2D uCurl;
    uniform float curl; uniform float dt;
    void main () {
      float L = texture2D(uCurl, vL).x; float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x; float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001; force *= curl * C; force.y *= -1.0;
      vec2 v = texture2D(uVelocity, vUv).xy + force * dt;
      gl_FragColor = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
    }`,
  pressure: `precision mediump float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uPressure; uniform sampler2D uDivergence;
    void main () {
      float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
      gl_FragColor = vec4((L + R + B + T - texture2D(uDivergence, vUv).x) * 0.25, 0.0, 0.0, 1.0);
    }`,
  gradient: `precision mediump float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uPressure; uniform sampler2D uVelocity;
    void main () {
      float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
      vec2 v = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
      gl_FragColor = vec4(v, 0.0, 1.0);
    }`,
  display: `precision highp float; varying vec2 vUv; uniform sampler2D uTexture;
    void main () {
      // soft highlights: dense smoke glows warm gold instead of burning to white
      vec3 c = 1.0 - exp(-texture2D(uTexture, vUv).rgb * 1.6);
      c *= 0.75;
      gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)));
    }`,
}

function getContext(canvas) {
  const params = { alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false }
  let gl = canvas.getContext('webgl2', params)
  const isGL2 = Boolean(gl)
  if (!gl) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params)
  if (!gl) return null
  let halfFloat
  let internal
  if (isGL2) {
    if (!gl.getExtension('EXT_color_buffer_float')) return null
    gl.getExtension('OES_texture_float_linear')
    halfFloat = gl.HALF_FLOAT
    internal = gl.RGBA16F
  } else {
    const ext = gl.getExtension('OES_texture_half_float')
    if (!ext || !gl.getExtension('OES_texture_half_float_linear')) return null
    halfFloat = ext.HALF_FLOAT_OES
    internal = gl.RGBA
  }
  return { gl, halfFloat, internal }
}

export function createFluid(canvas) {
  const ctx = getContext(canvas)
  if (!ctx) return null
  const { gl, halfFloat, internal } = ctx

  const compile = (type, src) => {
    const s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
    return s
  }
  const vert = compile(gl.VERTEX_SHADER, VERT)
  const programs = {}
  for (const [name, src] of Object.entries(FRAG)) {
    const p = gl.createProgram()
    gl.attachShader(p, vert)
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, src))
    gl.bindAttribLocation(p, 0, 'aPosition')
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p))
    const uniforms = {}
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < n; i++) {
      const u = gl.getActiveUniform(p, i).name
      uniforms[u] = gl.getUniformLocation(p, u)
    }
    programs[name] = { program: p, u: uniforms }
  }

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(0)

  const createFBO = (w, h) => {
    gl.activeTexture(gl.TEXTURE0)
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, halfFloat, null)
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return {
      texture,
      fbo,
      w,
      h,
      tx: 1 / w,
      ty: 1 / h,
      attach(id) {
        gl.activeTexture(gl.TEXTURE0 + id)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        return id
      },
      dispose() {
        gl.deleteTexture(texture)
        gl.deleteFramebuffer(fbo)
      },
    }
  }
  const createDouble = (w, h) => {
    let a = createFBO(w, h)
    let b = createFBO(w, h)
    return {
      get read() {
        return a
      },
      get write() {
        return b
      },
      swap() {
        ;[a, b] = [b, a]
      },
      dispose() {
        a.dispose()
        b.dispose()
      },
    }
  }

  const resolution = (res) => {
    let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight
    if (aspect < 1) aspect = 1 / aspect
    const lo = Math.round(res)
    const hi = Math.round(res * aspect)
    return gl.drawingBufferWidth > gl.drawingBufferHeight ? [hi, lo] : [lo, hi]
  }

  let velocity, dye, divergence, curl, pressure
  const buildTargets = () => {
    for (const t of [velocity, dye, divergence, curl, pressure]) t?.dispose()
    const [sw, sh] = resolution(SIM_RES)
    const [dw, dh] = resolution(DYE_RES)
    velocity = createDouble(sw, sh)
    dye = createDouble(dw, dh)
    divergence = createFBO(sw, sh)
    curl = createFBO(sw, sh)
    pressure = createDouble(sw, sh)
  }

  const resize = () => {
    const w = Math.max(1, Math.round(canvas.clientWidth))
    const h = Math.max(1, Math.round(canvas.clientHeight))
    if (canvas.width === w && canvas.height === h && velocity) return
    canvas.width = w
    canvas.height = h
    buildTargets()
  }
  resize()
  // a quick check that the half-float targets really work here
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null

  const blit = (target) => {
    if (target) {
      gl.viewport(0, 0, target.w, target.h)
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
    } else {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  const program = (name, texel) => {
    const p = programs[name]
    gl.useProgram(p.program)
    if (texel && p.u.texelSize) gl.uniform2f(p.u.texelSize, texel.tx, texel.ty)
    return p.u
  }

  const splat = (x, y, dx, dy, color) => {
    const aspect = canvas.width / canvas.height
    let u = program('splat')
    gl.uniform1i(u.uTarget, velocity.read.attach(0))
    gl.uniform1f(u.aspectRatio, aspect)
    gl.uniform2f(u.point, x, y)
    gl.uniform3f(u.color, dx, dy, 0)
    gl.uniform1f(u.radius, (SPLAT_RADIUS / 100) * (aspect > 1 ? aspect : 1))
    blit(velocity.write)
    velocity.swap()
    gl.uniform1i(u.uTarget, dye.read.attach(0))
    gl.uniform3f(u.color, color[0], color[1], color[2])
    blit(dye.write)
    dye.swap()
  }

  const step = (dt) => {
    gl.disable(gl.BLEND)
    let u = program('curl', velocity.read)
    gl.uniform1i(u.uVelocity, velocity.read.attach(0))
    blit(curl)

    u = program('vorticity', velocity.read)
    gl.uniform1i(u.uVelocity, velocity.read.attach(0))
    gl.uniform1i(u.uCurl, curl.attach(1))
    gl.uniform1f(u.curl, CURL)
    gl.uniform1f(u.dt, dt)
    blit(velocity.write)
    velocity.swap()

    u = program('divergence', velocity.read)
    gl.uniform1i(u.uVelocity, velocity.read.attach(0))
    blit(divergence)

    u = program('clear')
    gl.uniform1i(u.uTexture, pressure.read.attach(0))
    gl.uniform1f(u.value, PRESSURE)
    blit(pressure.write)
    pressure.swap()

    u = program('pressure', velocity.read)
    gl.uniform1i(u.uDivergence, divergence.attach(0))
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(u.uPressure, pressure.read.attach(1))
      blit(pressure.write)
      pressure.swap()
    }

    u = program('gradient', velocity.read)
    gl.uniform1i(u.uPressure, pressure.read.attach(0))
    gl.uniform1i(u.uVelocity, velocity.read.attach(1))
    blit(velocity.write)
    velocity.swap()

    u = program('advection', velocity.read)
    gl.uniform1i(u.uVelocity, velocity.read.attach(0))
    gl.uniform1i(u.uSource, velocity.read.attach(0))
    gl.uniform1f(u.dt, dt)
    gl.uniform1f(u.dissipation, VELOCITY_DISSIPATION)
    blit(velocity.write)
    velocity.swap()

    gl.uniform1i(u.uVelocity, velocity.read.attach(0))
    gl.uniform1i(u.uSource, dye.read.attach(1))
    gl.uniform1f(u.dissipation, DENSITY_DISSIPATION)
    blit(dye.write)
    dye.swap()
  }

  const render = () => {
    const u = program('display')
    gl.uniform1i(u.uTexture, dye.read.attach(0))
    blit(null)
  }

  /* ---- pointer and loop ---- */
  const pointer = { x: 0, y: 0, dx: 0, dy: 0, moved: false, known: false }
  let colorIndex = 0
  let colorTick = 0
  let raf = 0
  let last = 0
  let lastMove = 0

  const frame = (now) => {
    raf = 0
    const dt = Math.min((now - last) / 1000, 1 / 60)
    last = now
    resize()
    if (pointer.moved) {
      pointer.moved = false
      colorTick += 1
      if (colorTick % 18 === 0) colorIndex = (colorIndex + 1) % PALETTE.length
      const c = PALETTE[colorIndex]
      splat(pointer.x, pointer.y, pointer.dx * SPLAT_FORCE, pointer.dy * SPLAT_FORCE, c.map((v) => v * INTENSITY))
    }
    step(dt)
    render()
    if (now - lastMove < SLEEP_AFTER_MS) raf = requestAnimationFrame(frame)
    else {
      // asleep: clear what's left, so nothing lingers on screen
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      buildTargets()
    }
  }
  const wake = () => {
    if (raf || document.hidden) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  const onMove = (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return
    const x = event.clientX / canvas.clientWidth
    const y = 1 - event.clientY / canvas.clientHeight
    if (pointer.known) {
      const aspect = canvas.width / canvas.height
      const clampStep = (v) => Math.max(-MAX_STEP, Math.min(MAX_STEP, v))
      pointer.dx = clampStep((x - pointer.x) * (aspect < 1 ? aspect : 1))
      pointer.dy = clampStep((y - pointer.y) / (aspect > 1 ? aspect : 1))
      pointer.moved = Math.abs(pointer.dx) + Math.abs(pointer.dy) > 0
    }
    pointer.x = x
    pointer.y = y
    pointer.known = true
    lastMove = performance.now()
    wake()
  }
  const onLeave = () => {
    pointer.known = false
  }
  const onVisibility = () => {
    if (document.hidden && raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('pointerleave', onLeave)
  document.addEventListener('visibilitychange', onVisibility)

  return {
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      for (const t of [velocity, dye, divergence, curl, pressure]) t?.dispose()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
