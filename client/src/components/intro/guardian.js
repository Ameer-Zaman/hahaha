import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

/*
 * The welcome screen's guardian: an original figure in black and gold — a smooth sculpted gold
 * mask with glowing amber eyes, a gold circlet, a high black collar edged in gold and engraved
 * black armour on the shoulders. Live: the eyes blink every few seconds, the head sways a
 * little and turns towards the mouse (or the tilt of a phone), the chest breathes.
 *
 * createGuardian(canvas) → { setPointer(x, y), setFade(0..1), dispose() } or null without WebGL.
 * The canvas is transparent; the welcome screen's own background shows behind it.
 */

const TAU = Math.PI * 2
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

/** Black steel with fine gold scrollwork: colour map and a metal/rough map (G rough, B metal). */
function engraving(pbr) {
  let seed = 5
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  return canvasTexture(
    512,
    512,
    (g, w, h) => {
      g.fillStyle = pbr ? 'rgb(0,100,255)' : '#141519'
      g.fillRect(0, 0, w, h)
      for (let i = 0; i < 900; i++) {
        g.fillStyle = pbr ? `rgba(0,${70 + rnd() * 70},255,0.5)` : `rgba(255,255,255,${rnd() * 0.03})`
        g.fillRect(rnd() * w, rnd() * h, rnd() * 90 + 10, 1)
      }
      g.strokeStyle = pbr ? 'rgb(0,60,255)' : '#c9a050'
      g.lineCap = 'round'
      g.lineWidth = 2.2
      const scroll = (x, y, s, flip) => {
        g.beginPath()
        for (let a = 0; a < TAU * 1.5; a += 0.1) {
          const r = s * (1 - a / (TAU * 1.8))
          const px = x + Math.cos(a) * r * (flip ? -1 : 1)
          const py = y + Math.sin(a) * r
          if (a === 0) g.moveTo(px, py)
          else g.lineTo(px, py)
        }
        g.stroke()
      }
      for (const by of [0.12, 0.88]) {
        g.beginPath()
        g.moveTo(0, h * by - 14)
        g.lineTo(w, h * by - 14)
        g.moveTo(0, h * by + 14)
        g.lineTo(w, h * by + 14)
        g.stroke()
        for (let x = 16; x < w; x += 56) scroll(x, h * by, 7, (x / 56) % 2 > 1)
      }
    },
    !pbr,
  )
}

/* The mask's face: a sphere pushed and pressed into a calm face — brow, nose, cheeks, closed lips. */
function sculpt(geo) {
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i)
    const y = p.getY(i)
    let z = p.getZ(i)
    // a face, not an egg: narrower towards the chin, a little fuller at the cheekbones
    const jaw = 1 - 0.24 * clamp((-y - 0.01) / 0.1, 0, 1) ** 1.4
    x *= jaw
    z *= 1 - 0.08 * clamp((-y - 0.04) / 0.08, 0, 1)
    if (z > 0) {
      const ax = Math.abs(x)
      const front = clamp(z / 0.1, 0, 1)
      const g = (dx, dy, sx, sy) => Math.exp(-((dx / sx) ** 2 + (dy / sy) ** 2))
      z += front * 0.017 * g(x, y + 0.008, 0.011, 0.034) // nose
      z += front * 0.007 * g(0, y - 0.04, 1, 0.012) * (ax < 0.07 ? 1 : 0.4) // brow
      z -= front * 0.011 * g(ax - 0.036, y - 0.016, 0.019, 0.013) // eye sockets
      z += front * 0.006 * g(ax - 0.05, y + 0.02, 0.022, 0.02) // cheekbones
      z -= front * 0.0035 * g(x, y + 0.058, 0.026, 0.0035) // the line of the lips
      z += front * 0.005 * g(x, y + 0.088, 0.03, 0.014) // chin
      z -= front * 0.006 * g(ax - 0.07, y + 0.05, 0.02, 0.05) // under the cheeks
    }
    p.setXYZ(i, x, y, z)
  }
  geo.computeVertexNormals()
  return geo
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
  const steelMap = keep(engraving(false))
  const steelPbr = keep(engraving(true))
  const steel = (rx = 2, ry = 1) => {
    const map = keep(steelMap.clone())
    const pbr = keep(steelPbr.clone())
    map.repeat.set(rx, ry)
    pbr.repeat.set(rx, ry)
    return keep(
      new THREE.MeshPhysicalMaterial({
        map,
        roughnessMap: pbr,
        metalnessMap: pbr,
        roughness: 1,
        metalness: 1,
        clearcoat: 0.4,
        clearcoatRoughness: 0.25,
      }),
    )
  }
  const gold = keep(
    new THREE.MeshPhysicalMaterial({ color: 0xd2a756, metalness: 1, roughness: 0.22, clearcoat: 0.35, clearcoatRoughness: 0.12 }),
  )
  const maskGold = keep(
    new THREE.MeshPhysicalMaterial({ color: 0xc99a48, metalness: 1, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.15 }),
  )
  const black = keep(
    new THREE.MeshPhysicalMaterial({ color: 0x09090b, metalness: 0.2, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0x2a2010) }),
  )
  const voidMat = keep(new THREE.MeshBasicMaterial({ color: 0x000000 }))
  const eyeMat = keep(new THREE.MeshBasicMaterial({ color: 0xff9d2e, toneMapped: false }))
  const haloMap = keep(
    canvasTexture(64, 64, (g) => {
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
      r.addColorStop(0, 'rgba(255,200,110,0.9)')
      r.addColorStop(0.35, 'rgba(255,150,50,0.35)')
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

  // the bust: a sculptor's cut through the chest — sloped shoulders, straight sides —
  // in engraved black steel, with gold lapel lines meeting at the breastbone
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
  mesh(new THREE.LatheGeometry(profile, 120), steel(3, 1), chest).scale.set(1, 1, DEPTH)
  const rAt = (y) => {
    for (let i = 1; i < profile.length; i++) {
      const p0 = profile[i - 1]
      const p1 = profile[i]
      if ((y - p0.y) * (y - p1.y) <= 0) return p0.x + ((p1.x - p0.x) * (y - p0.y)) / (p1.y - p0.y || 1)
    }
    return 0
  }
  const onChest = (x, y) => new THREE.Vector3(x, y, DEPTH * Math.sqrt(Math.max(0, rAt(y) ** 2 - x * x)) + 0.003)
  for (const side of [-1, 1]) {
    const lapel = new THREE.CatmullRomCurve3(
      [
        [0.09, -0.04],
        [0.075, -0.1],
        [0.05, -0.19],
        [0.02, -0.28],
        [0.0, -0.33],
      ].map(([x, y]) => onChest(side * x, y)),
    )
    mesh(new THREE.TubeGeometry(lapel, 48, 0.0042, 8), gold, chest)
  }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([-0.33, -0.4, -0.5, -0.6].map((y) => onChest(0, y))), 24, 0.004, 8), gold, chest)
  const clasp = mesh(new THREE.OctahedronGeometry(0.012, 0), gold, chest)
  clasp.position.copy(onChest(0, -0.33))
  clasp.scale.set(1, 1.4, 0.5)

  // the gorget: a stiff black collar tapering up to the neck, ringed in gold
  const gorget = mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.06, 72, 1, true), black, chest)
  gorget.material = keep(black.clone())
  gorget.material.side = THREE.DoubleSide
  gorget.position.y = 0.0
  gorget.scale.z = 0.86
  for (const [r, y] of [
    [0.071, 0.03],
    [0.099, -0.029],
  ]) {
    const ring = mesh(new THREE.TorusGeometry(r, 0.0032, 10, 120), gold, chest)
    ring.rotation.x = Math.PI / 2
    ring.position.y = y
    ring.scale.y = 0.86
  }

  // neck and head
  const neck = new THREE.Group()
  neck.position.y = 0.0
  chest.add(neck)
  mesh(new THREE.CylinderGeometry(0.055, 0.064, 0.12, 24), black, neck).position.y = 0.05
  const head = new THREE.Group()
  head.position.y = 0.17
  head.scale.setScalar(1.22)
  neck.add(head)
  const skull = mesh(sculpt(new THREE.SphereGeometry(0.11, 96, 72)), black, head)
  skull.scale.set(0.8, 1.0, 0.92)
  // the mask: the front of the same sculpted face, in gold
  const maskGeo = sculpt(new THREE.SphereGeometry(0.1118, 140, 90, Math.PI / 2 - 1.3, 2.6, 0.95, 1.75))
  const mask = mesh(maskGeo, maskGold, head)
  mask.scale.copy(skull.scale)
  // a gold circlet round the brow, with a small point at the front
  const circlet = mesh(new THREE.TorusGeometry(0.0945, 0.0052, 12, 160), gold, head)
  circlet.rotation.x = Math.PI / 2
  circlet.position.y = 0.06
  circlet.rotation.x = Math.PI / 2 + 0.06
  circlet.scale.set(0.84, 0.97, 1)
  const point = mesh(new THREE.ConeGeometry(0.01, 0.03, 4), gold, head)
  point.position.set(0, 0.076, 0.089)
  point.rotation.x = 0.25
  const gem = mesh(
    new THREE.OctahedronGeometry(0.0075, 0),
    keep(new THREE.MeshPhysicalMaterial({ color: 0x5a0f12, roughness: 0.08, metalness: 0.1, clearcoat: 1, transmission: 0.2 })),
    head,
  )
  gem.position.set(0, 0.061, 0.095)
  gem.scale.set(1, 1.3, 0.6)

  // eyes: dark almond openings with an amber glow behind that blinks
  const eyes = []
  for (const side of [-1, 1]) {
    const eye = new THREE.Group()
    eye.position.set(side * 0.0295, 0.016, 0.0897)
    eye.rotation.y = side * 0.32
    head.add(eye)
    const almond = new THREE.Shape()
    almond.moveTo(-0.017, 0)
    almond.quadraticCurveTo(0, 0.009, 0.017, 0.001)
    almond.quadraticCurveTo(0, -0.0075, -0.017, 0)
    const hole = mesh(new THREE.ShapeGeometry(almond, 16), voidMat, eye)
    hole.position.z = 0.001
    const glow = mesh(new THREE.ShapeGeometry(almond, 16), eyeMat, eye)
    glow.position.z = 0.0018
    glow.scale.set(0.8, 0.8, 1)
    const halo = new THREE.Sprite(
      keep(new THREE.SpriteMaterial({ map: haloMap, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })),
    )
    halo.scale.set(0.07, 0.045, 1)
    halo.position.z = 0.004
    eye.add(halo)
    eyes.push({ glow, halo })
  }

  /* ---------------- light ---------------- */
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x0a0806, 0.15))
  const rimL = new THREE.SpotLight(0xffbf6a, 55, 6, 0.6, 0.7, 1.4)
  rimL.position.set(-1.2, 0.9, -1.4)
  rimL.target.position.set(0, 0.05, 0)
  scene.add(rimL, rimL.target)
  const rimR = new THREE.SpotLight(0xe8ecff, 18, 6, 0.6, 0.7, 1.4)
  rimR.position.set(1.3, 0.6, -1.0)
  rimR.target.position.set(0, 0.05, 0)
  scene.add(rimR, rimR.target)
  const key = new THREE.SpotLight(0xffe6c0, 2.6, 6, 0.5, 0.8, 1.4)
  key.position.set(-0.9, 0.8, 1.6)
  key.target.position.set(0, 0.15, 0)
  scene.add(key, key.target)
  const eyeLight = new THREE.PointLight(0xffa040, 0.25, 0.35, 2)
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
    camera.position.set(0.08, 0.2, narrow ? 1.95 : tall ? 1.5 : 1.55)
    camera.lookAt(0, narrow ? -0.05 : 0.04, 0)
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
      e.glow.scale.y = 0.8 * Math.max(0.04, open)
      e.halo.material.opacity = 0.35 + 0.65 * open
      e.halo.scale.y = 0.045 * Math.max(0.15, open)
    }
    eyeLight.intensity = 0.25 * open
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
