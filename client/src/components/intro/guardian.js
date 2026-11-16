import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

/*
 * The welcome screen's guardian: a hooded figure — a cream hood edged in gold, the face lost in
 * shadow but for two amber eyes, a cream mantle on the shoulders over dark leather. Live: the eyes
 * blink every few seconds, the head sways a little and turns towards the mouse (or the tilt of a
 * phone), the chest breathes.
 *
 * createGuardian(canvas) → { setPointer(x, y), setFade(0..1), dispose() } or null without WebGL.
 * The canvas is transparent; the welcome screen's own background shows behind it.
 */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

function canvasTexture(w, h, draw, color = true) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  if (color) t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  return t
}

/** Woven cloth: a fine irregular weave, for the hood and mantle's colour map. */
function weave() {
  let seed = 9
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#ddd0b6'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) {
      const v = rnd()
      g.fillStyle = v > 0.5 ? `rgba(255,248,230,${rnd() * 0.12})` : `rgba(90,70,40,${rnd() * 0.1})`
      if (rnd() > 0.5) g.fillRect(rnd() * w, rnd() * h, 1, 2 + rnd() * 6)
      else g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 1)
    }
  })
}

const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/*
 * The hood: a sphere shaped like cloth — a soft peak at the crown, the front drawn forward to
 * shade the face, the lower part flared out and down onto the shoulders — with one opening cut
 * for the face: pointed at the top, widest at the eyes, closing again under the chin.
 */
const HOOD_R = 0.135
const OPEN_TOP = 0.17 * Math.PI // where the opening starts (angle down from the crown)
const OPEN_BOTTOM = 0.74 * Math.PI // and where it closes under the chin
const OPEN_HALF = 0.98 // its half-width round the front, in radians, at the widest
const openHalf = (theta) => {
  const t = (theta - OPEN_TOP) / (OPEN_BOTTOM - OPEN_TOP)
  if (t <= 0 || t >= 1) return 0
  // a pointed arch above, a softer close below
  return OPEN_HALF * (t < 0.55 ? Math.sin((t / 0.55) * (Math.PI / 2)) ** 0.75 : Math.cos(((t - 0.55) / 0.45) * (Math.PI / 2)) ** 0.6)
}
function shapeHood(x, y, z) {
  const theta = Math.acos(clamp(y / HOOD_R, -1, 1))
  const ring = Math.hypot(x, z) || 1e-6
  const flare = smooth(0.66 * Math.PI, 0.92 * Math.PI, theta)
  const front = Math.max(0, z / ring) // 1 straight ahead, 0 at the sides and back
  const phi = Math.atan2(z, -x)
  const folds = 1 + 0.035 * flare * Math.sin(phi * 11) + 0.015 * flare * Math.sin(phi * 23 + 1)
  const grow = (1 - 0.1 * smooth(0.45 * Math.PI, 0.7 * Math.PI, theta)) * (1 + 1.0 * flare) * folds
  x *= grow
  z *= grow
  y -= 0.07 * flare
  z += 0.045 * front ** 1.5 * smooth(0.08 * Math.PI, 0.4 * Math.PI, theta) * (1 - 0.8 * flare)
  const tip = 1 - smooth(0, 0.3 * Math.PI, theta)
  y += 0.018 * tip * tip
  z -= 0.022 * tip * tip
  return new THREE.Vector3(x * 0.96, y * 1.02, z)
}
const spherePoint = (r, phi, theta) =>
  new THREE.Vector3(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta))
function hoodGeometry(radius, wide, tall) {
  const thetaLength = 0.92 * Math.PI
  const geo = new THREE.SphereGeometry(radius, wide, tall, 0, 2 * Math.PI, 0, thetaLength)
  const p = geo.attributes.position
  const uv = geo.attributes.uv
  const k = HOOD_R / radius
  // cut the face opening: drop every triangle whose middle falls inside it
  const index = geo.index.array
  const kept = []
  for (let f = 0; f < index.length; f += 3) {
    let u = 0
    let v = 0
    for (let c = 0; c < 3; c++) {
      u += uv.getX(index[f + c]) / 3
      v += uv.getY(index[f + c]) / 3
    }
    const phi = u * 2 * Math.PI
    const theta = (1 - v) * thetaLength
    if (Math.abs(phi - Math.PI / 2) < openHalf(theta)) continue
    kept.push(index[f], index[f + 1], index[f + 2])
  }
  geo.setIndex(kept)
  for (let i = 0; i < p.count; i++) {
    const v = shapeHood(p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k).multiplyScalar(1 / k)
    p.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  return geo
}
/** The opening's edge, all the way round: for the gold trim. */
function hoodEdge(inset = 1.0) {
  const pts = []
  const n = 60
  for (let i = 0; i <= n; i++) {
    const theta = OPEN_TOP + ((OPEN_BOTTOM - OPEN_TOP) * i) / n
    pts.push(shapeHood(...spherePoint(HOOD_R, Math.PI / 2 + openHalf(theta), theta).toArray()).multiplyScalar(inset))
  }
  for (let i = n - 1; i > 0; i--) {
    const theta = OPEN_TOP + ((OPEN_BOTTOM - OPEN_TOP) * i) / n
    pts.push(shapeHood(...spherePoint(HOOD_R, Math.PI / 2 - openHalf(theta), theta).toArray()).multiplyScalar(inset))
  }
  return new THREE.CatmullRomCurve3(pts, true)
}

export function createGuardian(canvas) {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  const small = Math.min(window.innerWidth, window.innerHeight) < 700
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  renderer.setClearColor(0x000000, 0)

  const trash = []
  const keep = (x) => {
    trash.push(x)
    return x
  }

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture
  scene.environment = env
  scene.environmentIntensity = 0.32

  /* ---------------- materials ---------------- */
  const clothMap = keep(weave())
  clothMap.repeat.set(3, 3)
  const cloth = keep(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: clothMap,
      roughness: 0.82,
      sheen: 1,
      sheenColor: new THREE.Color(0xfff1d6),
      sheenRoughness: 0.45,
    }),
  )
  const mantleCloth = keep(cloth.clone())
  mantleCloth.side = THREE.DoubleSide
  const hoodInside = keep(new THREE.MeshStandardMaterial({ color: 0x050302, roughness: 1, side: THREE.BackSide }))
  const gold = keep(
    new THREE.MeshPhysicalMaterial({ color: 0xd2a756, metalness: 1, roughness: 0.22, clearcoat: 0.35, clearcoatRoughness: 0.12 }),
  )
  const leather = keep(
    new THREE.MeshPhysicalMaterial({
      color: 0x1d140d,
      roughness: 0.62,
      sheen: 0.5,
      sheenColor: new THREE.Color(0x3a2a18),
      clearcoat: 0.15,
    }),
  )
  const voidMat = keep(new THREE.MeshBasicMaterial({ color: 0x000000 }))
  const eyeMat = keep(new THREE.MeshBasicMaterial({ color: 0xff8a24, toneMapped: false }))
  const haloMap = keep(
    canvasTexture(64, 64, (g) => {
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
      r.addColorStop(0, 'rgba(255,170,80,0.9)')
      r.addColorStop(0.35, 'rgba(255,120,30,0.35)')
      r.addColorStop(1, 'rgba(255,140,40,0)')
      g.fillStyle = r
      g.fillRect(0, 0, 64, 64)
    }),
  )

  const mesh = (geo, mat, parent) => {
    keep(geo)
    const m = new THREE.Mesh(geo, mat)
    parent.add(m)
    return m
  }

  /* ---------------- the figure ---------------- */
  const bust = new THREE.Group()
  scene.add(bust)
  const chest = new THREE.Group()
  bust.add(chest)

  // the body: a sculptor's cut through the chest in dark leather
  const profile = new THREE.SplineCurve(
    [
      [0.0, -0.62],
      [0.28, -0.62],
      [0.305, -0.42],
      [0.32, -0.27],
      [0.31, -0.17],
      [0.27, -0.1],
      [0.19, -0.055],
      [0.11, -0.03],
      [0.0, -0.015],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
  ).getPoints(80)
  const DEPTH = 0.5 // the torso is an ellipse in plan: broad, not deep
  mesh(new THREE.LatheGeometry(profile, 120), leather, chest).scale.set(1, 1, DEPTH)
  const rAt = (y) => {
    for (let i = 1; i < profile.length; i++) {
      const p0 = profile[i - 1]
      const p1 = profile[i]
      if ((y - p0.y) * (y - p1.y) <= 0) return p0.x + ((p1.x - p0.x) * (y - p0.y)) / (p1.y - p0.y || 1)
    }
    return 0
  }

  // the mantle: cream cloth over the shoulders, a little proud of the body, edged in gold
  const MANTLE_Y = -0.36
  const mantleR = (y) => rAt(y) * 1.07 + 0.012
  const mantleProfile = []
  for (let i = 0; i <= 40; i++) {
    const y = MANTLE_Y + (i / 40) * (-0.03 - MANTLE_Y)
    mantleProfile.push(new THREE.Vector2(mantleR(y), y))
  }
  mantleProfile.push(new THREE.Vector2(0.085, -0.005))
  const mantleGeo = new THREE.LatheGeometry(mantleProfile, 200)
  {
    // soft folds, deeper towards the hem
    const p = mantleGeo.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const y = p.getY(i)
      const z = p.getZ(i)
      const a = Math.atan2(z, x)
      const deep = smooth(-0.08, MANTLE_Y, y)
      const k = 1 + deep * (0.022 * Math.sin(a * 16) + 0.01 * Math.sin(a * 31 + 2))
      p.setXYZ(i, x * k, y, z * k)
    }
    mantleGeo.computeVertexNormals()
  }
  mesh(mantleGeo, mantleCloth, chest).scale.set(1, 1, DEPTH)
  const hem = mesh(new THREE.TorusGeometry(mantleR(MANTLE_Y), 0.005, 10, 160), gold, chest)
  hem.rotation.x = Math.PI / 2
  hem.position.y = MANTLE_Y
  hem.scale.y = DEPTH
  const onMantle = (x, y) => new THREE.Vector3(x, y, DEPTH * Math.sqrt(Math.max(0, mantleR(y) ** 2 - x * x)) + 0.004)
  // a gold clasp at each side of the chest, joined by a fine chain
  const claspAt = [-0.085, 0.085].map((x) => onMantle(x, -0.12))
  for (const at of claspAt) {
    const clasp = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.006, 32), gold, chest)
    clasp.position.copy(at)
    clasp.rotation.x = Math.PI / 2 - 0.35
    const stud = mesh(new THREE.SphereGeometry(0.006, 16, 12), gold, chest)
    stud.position.copy(at).add(new THREE.Vector3(0, 0, 0.005))
  }
  const sag = onMantle(0, -0.17)
  mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(claspAt[0], sag, claspAt[1]), 32, 0.0022, 6), gold, chest)
  // gold embroidery down the front edges of the mantle
  for (const side of [-1, 1]) {
    const line = new THREE.CatmullRomCurve3([-0.05, -0.12, -0.2, -0.28, -0.35].map((y, i) => onMantle(side * (0.05 + i * 0.012), y)))
    mesh(new THREE.TubeGeometry(line, 40, 0.0028, 6), gold, chest)
  }

  // neck and head
  const neck = new THREE.Group()
  chest.add(neck)
  mesh(new THREE.CylinderGeometry(0.055, 0.064, 0.12, 24), voidMat, neck).position.y = 0.05
  const head = new THREE.Group()
  head.position.y = 0.17
  head.scale.setScalar(1.22)
  neck.add(head)
  // the face: nothing but shadow
  mesh(new THREE.SphereGeometry(0.1, 48, 36), voidMat, head).scale.set(0.92, 1.1, 0.82)
  // the hood, its dark lining, and the gold trim round the opening
  mesh(hoodGeometry(HOOD_R, 280, 160), cloth, head)
  mesh(hoodGeometry(HOOD_R * 0.965, 140, 80), hoodInside, head)
  mesh(new THREE.TubeGeometry(hoodEdge(1.002), 160, 0.0034, 8), gold, head)
  mesh(new THREE.TubeGeometry(hoodEdge(0.985), 160, 0.0016, 6), gold, head)

  // eyes: two amber glows in the dark that blink
  const eyes = []
  for (const side of [-1, 1]) {
    const eye = new THREE.Group()
    eye.position.set(side * 0.029, 0.012, 0.088)
    eye.rotation.y = side * 0.3
    head.add(eye)
    const almond = new THREE.Shape()
    almond.moveTo(-0.016, 0.001)
    almond.quadraticCurveTo(0, 0.0085, 0.016, 0.003)
    almond.quadraticCurveTo(0, -0.006, -0.016, 0.001)
    const glow = mesh(new THREE.ShapeGeometry(almond, 16), eyeMat, eye)
    glow.position.z = 0.0018
    glow.scale.set(1.1, 1.1, 1)
    const halo = new THREE.Sprite(
      keep(new THREE.SpriteMaterial({ map: haloMap, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })),
    )
    halo.scale.set(0.09, 0.05, 1)
    halo.position.z = 0.004
    eye.add(halo)
    eyes.push({ glow, halo })
  }

  /* ---------------- light ---------------- */
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x0a0806, 0.45))
  const rimL = new THREE.SpotLight(0xffbf6a, 55, 6, 0.6, 0.7, 1.4)
  rimL.position.set(-1.2, 0.9, -1.4)
  rimL.target.position.set(0, 0.05, 0)
  scene.add(rimL, rimL.target)
  const rimR = new THREE.SpotLight(0xe8ecff, 18, 6, 0.6, 0.7, 1.4)
  rimR.position.set(1.3, 0.6, -1.0)
  rimR.target.position.set(0, 0.05, 0)
  scene.add(rimR, rimR.target)
  const key = new THREE.SpotLight(0xffe6c0, 4, 6, 0.5, 0.8, 1.4)
  key.position.set(-0.9, 0.8, 1.6)
  key.target.position.set(0, 0.15, 0)
  scene.add(key, key.target)
  const eyeLight = new THREE.PointLight(0xff8a30, 0.35, 0.25, 2)
  eyeLight.position.set(0, 0.19, 0.16)
  head.add(eyeLight)
  eyeLight.position.set(0, 0.02, 0.12)

  /* ---------------- camera ---------------- */
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20)
  const resize = () => {
    const w = Math.max(1, canvas.clientWidth)
    const h = Math.max(1, canvas.clientHeight)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // frame the head and chest; on a wide box keep him upright and centred
    const tall = h / w > 1.05
    // a phone's band across the top of the screen is short and narrow: step back to fit the head and shoulders
    const narrow = w / h < 0.85
    camera.fov = tall ? 30 : 26
    camera.position.set(0.08, 0.2, narrow ? 2.2 : tall ? 1.5 : 1.55)
    camera.lookAt(0, narrow ? -0.12 : 0.04, 0)
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)
  bust.rotation.y = -0.38 // turned towards the words on the left

  /* ---------------- life: blink, look, breathe ---------------- */
  const pointer = { x: -0.3, y: 0, tx: -0.3, ty: 0 }
  let nextBlink = performance.now() + 1600
  let blinkStart = -1
  let doubleBlink = false
  let fade = 0
  let shown = 0
  let raf = 0
  const start = performance.now()
  let last = start
  const ease = (rate, dt) => 1 - Math.exp(-rate * dt) // frame-rate independent smoothing

  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    const t = (now - start) / 1000
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    // fade in slowly, out quickly; nothing to draw while hidden
    shown += (fade - shown) * ease(fade > shown ? 1.8 : 10, dt)
    renderer.domElement.style.opacity = String(shown)
    if (shown < 0.002 && fade === 0) return
    // the head follows the pointer slowly, on top of a gentle idle sway
    pointer.x += (pointer.tx - pointer.x) * ease(2.4, dt)
    pointer.y += (pointer.ty - pointer.y) * ease(2.4, dt)
    head.rotation.y = pointer.x * 0.35 + Math.sin(t * 0.45) * 0.07
    head.rotation.x = -pointer.y * 0.18 + Math.sin(t * 0.33 + 1) * 0.03
    head.rotation.z = Math.sin(t * 0.27) * 0.025
    neck.rotation.y = head.rotation.y * 0.3
    // breathing
    const breath = Math.sin(t * 1.6)
    chest.position.y = breath * 0.0035
    chest.scale.set(1 + breath * 0.004, 1, 1 + breath * 0.006)
    // blinking: lids close fast, open a little slower; sometimes twice
    if (blinkStart < 0 && now >= nextBlink) blinkStart = now
    let open = 1
    if (blinkStart >= 0) {
      const b = now - blinkStart
      open = b < 70 ? 1 - b / 70 : b < 160 ? (b - 70) / 90 : 1
      if (b >= 160) {
        blinkStart = -1
        if (!doubleBlink && Math.random() < 0.25) {
          doubleBlink = true
          nextBlink = now + 140
        } else {
          doubleBlink = false
          nextBlink = now + 2400 + Math.random() * 3200
        }
      }
    }
    for (const e of eyes) {
      e.glow.scale.y = 1.1 * Math.max(0.04, open)
      e.halo.material.opacity = 0.35 + 0.65 * open
      e.halo.scale.y = 0.05 * Math.max(0.15, open)
    }
    eyeLight.intensity = 0.35 * open
    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)

  return {
    /** Where the visitor is looking: -1..1 across the screen (x right, y down). */
    setPointer(x, y) {
      pointer.tx = clamp(x, -1, 1)
      pointer.ty = clamp(y, -1, 1)
    },
    /** 0 = hidden, 1 = fully shown. */
    setFade(value) {
      fade = clamp(value, 0, 1)
    },
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      trash.forEach((x) => x.dispose?.())
      env.dispose()
      pmrem.dispose()
      renderer.dispose()
    },
  }
}
