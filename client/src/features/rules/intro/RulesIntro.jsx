import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

import './rulesIntro.css'

/*
 * The Rules page's opening: the Rule-keeper — a tall figure in a long black robe with gold
 * trim and a plain gold mask — stands in a beam of light, winds up and throws the rule book at
 * the camera. The pages bend and flutter through the air; the ones that reach the glass slap
 * onto the screen, then slide off and fall away to reveal the Rules page.
 *
 * Built in three.js from simple shapes (no model files, nothing copied). The motion is a real
 * throwing chain — hips, then chest, shoulder, elbow and a wrist snap — on smooth curves, and
 * the robe's hem swings after the body. Any click, key or the Skip button ends it at once.
 *
 * Timeline (seconds): 0 idle, camera drifts in · 0.6 wind-up · 1.36 throw starts · 1.62 release
 * · 1.62–1.9 follow-through · pages reach the glass ~1.9–2.8 · 3.0 the scene fades · 3.3 they fall.
 */

const T_WIND = 0.6
const T_LOAD = 1.36
const T_RELEASE = 1.62
const T_FOLLOW = 1.9
const T_FADE = 3.0
const T_FALL = 3.3
const T_END = 4.8
const TAU = Math.PI * 2

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const smooth = (a, b, t) => {
  const x = clamp01((t - a) / (b - a))
  return x * x * (3 - 2 * x)
}
const mix = (a, b, k) => a + (b - a) * k
const rand = (a, b) => a + Math.random() * (b - a)

/**
 * A keyframed value on a smooth curve (monotone cubic Hermite): it passes through every key
 * without stopping at each one, so the movement flows like a real body instead of snapping
 * from pose to pose.
 */
function makeTrack(keys) {
  const n = keys.length
  const ts = keys.map((k) => k[0])
  const vs = keys.map((k) => k[1])
  const d = []
  for (let i = 0; i < n - 1; i += 1) d.push((vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]))
  const m = new Array(n)
  m[0] = 0
  m[n - 1] = 0
  for (let i = 1; i < n - 1; i += 1) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
  for (let i = 0; i < n - 1; i += 1) {
    if (d[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      const k = 3 / Math.sqrt(s)
      m[i] = k * a * d[i]
      m[i + 1] = k * b * d[i]
    }
  }
  return (t) => {
    if (t <= ts[0]) return vs[0]
    if (t >= ts[n - 1]) return vs[n - 1]
    let i = 0
    while (t > ts[i + 1]) i += 1
    const h = ts[i + 1] - ts[i]
    const x = (t - ts[i]) / h
    const x2 = x * x
    const x3 = x2 * x
    return (2 * x3 - 3 * x2 + 1) * vs[i] + (x3 - 2 * x2 + x) * h * m[i] + (-2 * x3 + 3 * x2) * vs[i + 1] + (x3 - x2) * h * m[i + 1]
  }
}

/* ------------------------------------------------------------------ materials drawn on canvases */

function canvasTexture(w, h, draw, color = true) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.flipY = false
  if (color) tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/**
 * Robe cloth: near-black with soft folds, an optional gold band (hemBand: from–to along the
 * height, 0–1) and gold trim (down the front opening, or a stole). Returns the colour map and
 * a metal/rough map (green = roughness, blue = metalness) so only the gold shines.
 */
function robeMaps({ hemBand = null, front = 'none' }) {
  const paint = (g, w, h, pbr) => {
    g.fillStyle = pbr ? 'rgb(0, 222, 0)' : '#0c0c0f'
    g.fillRect(0, 0, w, h)
    if (!pbr) {
      for (let x = 0; x < w; x += 4) {
        const k = Math.sin(x * 0.11) * 0.5 + Math.sin(x * 0.031 + 1.3) * 0.5
        g.fillStyle = k > 0 ? `rgba(255,255,255,${k * 0.035})` : `rgba(0,0,0,${-k * 0.35})`
        g.fillRect(x, 0, 4, h)
      }
    }
    const gold = pbr ? 'rgb(0, 70, 255)' : '#c9a050'
    g.fillStyle = gold
    if (hemBand) g.fillRect(0, h * hemBand[0], w, h * (hemBand[1] - hemBand[0]))
    if (front === 'opening') {
      g.fillRect(0, 0, w * 0.014, h)
      g.fillRect(w * 0.986, 0, w * 0.014, h)
    } else if (front === 'stole') {
      g.fillRect(w * 0.035, 0, w * 0.03, h * 0.88)
      g.fillRect(w * 0.935, 0, w * 0.03, h * 0.88)
    }
  }
  return {
    map: canvasTexture(512, 512, (g, w, h) => paint(g, w, h, false)),
    pbr: canvasTexture(256, 256, (g, w, h) => paint(g, w, h, true), false),
  }
}

/** A turned (lathe) shape from a smooth profile of [radius, height] points. */
function turned(points, samples, segments) {
  const curve = new THREE.SplineCurve(points.map(([r, y]) => new THREE.Vector2(r, y)))
  return new THREE.LatheGeometry(curve.getPoints(samples), segments)
}

/* ------------------------------------------------------------------ the Rule-keeper */

function buildKeeper() {
  const disposables = []
  const keep = (x) => {
    disposables.push(x)
    return x
  }

  const skirtMaps = robeMaps({ hemBand: [0.9, 0.955], front: 'opening' })
  const torsoMaps = robeMaps({ front: 'stole' })
  const sleeveMaps = robeMaps({ hemBand: [0.05, 0.15] }) // the wide cuff end is at the bottom of the map
  for (const m of [skirtMaps, torsoMaps, sleeveMaps]) {
    keep(m.map)
    keep(m.pbr)
  }
  const cloth = (maps) =>
    keep(
      new THREE.MeshStandardMaterial({
        map: maps.map,
        roughnessMap: maps.pbr,
        metalnessMap: maps.pbr,
        roughness: 1,
        metalness: 1,
        side: THREE.DoubleSide,
      }),
    )
  const robeSkirt = cloth(skirtMaps)
  const robeTorso = cloth(torsoMaps)
  const robeSleeve = cloth(sleeveMaps)
  const gold = keep(new THREE.MeshStandardMaterial({ color: 0xd8ac52, roughness: 0.24, metalness: 1 }))
  const leather = keep(new THREE.MeshStandardMaterial({ color: 0x111012, roughness: 0.42, metalness: 0.2 }))
  const dark = keep(new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.75, metalness: 0.05 }))
  const paperMat = keep(new THREE.MeshStandardMaterial({ color: 0xf1ebde, roughness: 0.85 }))
  const maskMap = keep(
    canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#ffffff'
      g.fillRect(0, 0, w, h)
      // two calm eye slits and a faint line down the brow
      g.fillStyle = '#1a1206'
      for (const x of [0.37, 0.63]) {
        g.beginPath()
        g.ellipse(w * x, h * 0.57, w * 0.07, h * 0.02, 0, 0, TAU)
        g.fill()
      }
      g.fillStyle = 'rgba(80, 55, 10, 0.35)'
      g.fillRect(w * 0.49, h * 0.38, w * 0.02, h * 0.16)
    }),
  )
  const maskMat = keep(new THREE.MeshStandardMaterial({ color: 0xd8ac52, map: maskMap, roughness: 0.22, metalness: 1 }))

  const mesh = (geo, mat) => {
    keep(geo)
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = true
    m.receiveShadow = true
    return m
  }
  const joint = (parent, x, y, z) => {
    const g = new THREE.Group()
    g.position.set(x, y, z)
    parent.add(g)
    return g
  }

  const root = new THREE.Group()
  const hips = joint(root, 0, 1.0, 0)

  // the skirt of the robe, from the waist to the floor; its hem is moved every frame
  const skirtGeo = turned(
    [
      [0.19, 0],
      [0.2, -0.1],
      [0.225, -0.3],
      [0.27, -0.55],
      [0.33, -0.78],
      [0.39, -0.93],
      [0.41, -0.985],
    ],
    26,
    56,
  )
  const skirt = mesh(skirtGeo, robeSkirt)
  skirt.scale.set(1, 1, 0.82)
  hips.add(skirt)
  const skirtBase = Float32Array.from(skirtGeo.attributes.position.array)

  // the upper robe, with a gold stole down the front and a gold collar
  const spine = joint(hips, 0, 0, 0)
  const torso = mesh(
    turned(
      [
        [0.19, 0],
        [0.205, 0.14],
        [0.235, 0.32],
        [0.245, 0.45],
        [0.225, 0.54],
        [0.15, 0.6],
        [0.085, 0.64],
        [0.075, 0.68],
      ],
      22,
      44,
    ),
    robeTorso,
  )
  torso.scale.set(1, 1, 0.74)
  spine.add(torso)
  const collar = mesh(new THREE.TorusGeometry(0.083, 0.017, 10, 32), gold)
  collar.rotation.x = Math.PI / 2
  collar.position.y = 0.655
  collar.scale.set(1, 0.78, 1)
  spine.add(collar)

  // head: dark, with a plain gold mask over the face
  const neck = joint(spine, 0, 0.665, 0)
  const neckMesh = mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.09, 14), dark)
  neckMesh.position.y = 0.04
  neck.add(neckMesh)
  const head = mesh(new THREE.SphereGeometry(0.108, 32, 24), dark)
  head.scale.set(0.93, 1.12, 1.02)
  head.position.y = 0.175
  neck.add(head)
  const face = mesh(new THREE.SphereGeometry(0.116, 40, 28, Math.PI / 2 - 0.98, 1.96, 0.42, 2.12), maskMat)
  face.scale.copy(head.scale)
  face.position.copy(head.position)
  neck.add(face)

  // arms in wide sleeves with gold cuffs; gloved hands whose fingers grip and let go
  const arms = {}
  for (const side of [1, -1]) {
    const shoulder = joint(spine, 0.245 * side, 0.52, 0)
    const cap = mesh(new THREE.SphereGeometry(0.078, 16, 12), robeTorso)
    cap.scale.set(1, 0.9, 0.85)
    shoulder.add(cap)
    const upper = mesh(new THREE.CylinderGeometry(0.068, 0.06, 0.31, 16), robeTorso)
    upper.position.y = -0.155
    shoulder.add(upper)
    const elbow = joint(shoulder, 0, -0.31, 0)
    const fore = mesh(new THREE.CylinderGeometry(0.05, 0.042, 0.27, 14), dark)
    fore.position.y = -0.14
    elbow.add(fore)
    const sleeve = mesh(new THREE.CylinderGeometry(0.068, 0.098, 0.34, 28, 1, true), robeSleeve)
    sleeve.position.y = -0.155
    elbow.add(sleeve)
    const hand = joint(elbow, 0, -0.3, 0)
    const palm = mesh(new THREE.BoxGeometry(0.075, 0.085, 0.03), leather)
    palm.position.y = -0.04
    hand.add(palm)
    const fingers = []
    for (let f = 0; f < 4; f += 1) {
      const base = joint(hand, (f - 1.5) * 0.019, -0.085, 0.003)
      const fm = mesh(new THREE.CapsuleGeometry(0.0085, 0.045, 4, 8), leather)
      fm.position.y = -0.028
      base.add(fm)
      fingers.push(base)
    }
    const thumb = joint(hand, -0.04 * side, -0.035, 0.012)
    const tm = mesh(new THREE.CapsuleGeometry(0.0095, 0.04, 4, 8), leather)
    tm.position.y = -0.025
    thumb.add(tm)
    thumb.rotation.z = 0.7 * side
    arms[side > 0 ? 'left' : 'right'] = { shoulder, elbow, hand, fingers, thumb }
  }

  // the rule book in the right hand
  const stack = new THREE.Group()
  stack.add(mesh(new THREE.BoxGeometry(0.21, 0.04, 0.29), paperMat))
  const cover = mesh(new THREE.BoxGeometry(0.215, 0.006, 0.295), gold)
  cover.position.y = -0.023
  stack.add(cover)
  stack.position.set(0, -0.1, 0.06)
  stack.rotation.set(0.25, 0, 0)
  arms.right.hand.add(stack)

  return { root, hips, spine, neck, arms, stack, skirt, skirtBase, disposables }
}

/* The performance: every joint on its own curve. The right arm throws. */
const T = {
  rootZ: makeTrack([
    [0, 0],
    [T_WIND, 0],
    [1.3, -0.09],
    [1.55, 0.17],
    [T_FOLLOW, 0.22],
    [2.7, 0.19],
  ]),
  rootYaw: makeTrack([
    [0, 0.12],
    [T_WIND, 0.1],
    [1.3, -0.32],
    [1.5, 0.3],
    [1.78, 0.42],
    [2.7, 0.24],
  ]),
  crouch: makeTrack([
    [0, 0],
    [T_WIND, 0],
    [1.3, -0.035],
    [1.6, -0.075],
    [T_FOLLOW, -0.06],
    [2.7, -0.02],
  ]),
  spineYaw: makeTrack([
    [0, 0],
    [T_WIND, -0.05],
    [T_LOAD, -0.52],
    [1.58, 0.38],
    [1.85, 0.52],
    [2.7, 0.22],
  ]),
  spineLean: makeTrack([
    [0, 0.03],
    [T_WIND, 0.02],
    [T_LOAD, -0.17],
    [1.6, 0.28],
    [1.88, 0.42],
    [2.7, 0.14],
  ]),
  spineSide: makeTrack([
    [0, 0],
    [T_LOAD, 0.12],
    [1.62, -0.1],
    [2.7, -0.03],
  ]),
  rShoulderX: makeTrack([
    [0, -0.72],
    [T_WIND, -0.76],
    [1.2, 1.9],
    [1.4, 2.62],
    [1.52, Math.PI + 0.1],
    [T_RELEASE, TAU - 1.22],
    [1.84, TAU - 0.42],
    [2.7, TAU - 0.24],
  ]),
  rShoulderZ: makeTrack([
    [0, 0.12],
    [T_WIND, 0.1],
    [1.4, -0.38],
    [T_RELEASE, 0.08],
    [1.85, 0.46],
    [2.7, 0.2],
  ]),
  rElbow: makeTrack([
    [0, -1.48],
    [T_WIND, -1.5],
    [1.25, -1.75],
    [1.47, -2.05],
    [T_RELEASE, -0.14],
    [1.8, -0.34],
    [2.7, -0.5],
  ]),
  rWrist: makeTrack([
    [0, -0.15],
    [1.3, 0.25],
    [1.54, 0.55],
    [1.66, -0.55],
    [2.0, -0.2],
    [2.7, -0.1],
  ]),
  lShoulderX: makeTrack([
    [0, 0.02],
    [T_WIND, -0.1],
    [T_LOAD, -1.32],
    [1.6, 0.32],
    [1.88, 0.52],
    [2.7, 0.12],
  ]),
  lShoulderZ: makeTrack([
    [0, -0.1],
    [T_LOAD, -0.18],
    [1.6, -0.42],
    [2.7, -0.14],
  ]),
  lElbow: makeTrack([
    [0, -0.2],
    [T_LOAD, -0.25],
    [1.62, -1.25],
    [2.7, -0.42],
  ]),
  grip: makeTrack([
    [0, 1],
    [T_RELEASE - 0.01, 1],
    [T_RELEASE + 0.05, 0.05],
    [2.4, 0.35],
  ]),
}

function pose(k, t) {
  const breathe = Math.sin(t * 2.3) * 0.006
  k.root.position.z = T.rootZ(t)
  k.root.rotation.y = T.rootYaw(t)
  k.hips.position.y = 1.0 + T.crouch(t) + breathe * 0.5
  k.spine.rotation.y = T.spineYaw(t)
  k.spine.rotation.x = T.spineLean(t) + breathe
  k.spine.rotation.z = T.spineSide(t)
  // the head keeps facing the camera while the body turns
  k.neck.rotation.y = -(k.spine.rotation.y + k.root.rotation.y) * 0.8
  k.neck.rotation.x = -k.spine.rotation.x * 0.6 + 0.04

  const R = k.arms.right
  R.shoulder.rotation.x = T.rShoulderX(t)
  R.shoulder.rotation.z = T.rShoulderZ(t)
  R.elbow.rotation.x = T.rElbow(t)
  R.hand.rotation.x = T.rWrist(t)
  const grip = T.grip(t)
  R.fingers.forEach((f, i) => (f.rotation.x = -(0.35 + grip * 1.15) - i * 0.04))
  R.thumb.rotation.x = -0.2 - grip * 0.6

  const L = k.arms.left
  L.shoulder.rotation.x = T.lShoulderX(t)
  L.shoulder.rotation.z = T.lShoulderZ(t)
  L.elbow.rotation.x = T.lElbow(t)
  L.hand.rotation.x = -0.15
  L.fingers.forEach((f, i) => (f.rotation.x = -0.45 - i * 0.08))
}

/* The robe's hem: it trails the body on a spring, swirls with the turn and breathes a little. */
function makeHem(k) {
  const pos = k.skirt.geometry.attributes.position
  const base = k.skirtBase
  let lagZ = 0
  let lagZv = 0
  let swirl = 0
  let swirlV = 0
  let lastZ = k.root.position.z
  let lastYaw = k.root.rotation.y
  return (t, dt) => {
    if (dt <= 0) return
    const turn = k.root.rotation.y + k.spine.rotation.y * 0.3
    const vz = (k.root.position.z - lastZ) / dt
    const vyaw = (turn - lastYaw) / dt
    lastZ = k.root.position.z
    lastYaw = turn
    lagZv += ((-vz * 0.22 - lagZ) * 60 - lagZv * 9) * dt
    lagZ += lagZv * dt
    swirlV += ((-vyaw * 0.32 - swirl) * 55 - swirlV * 8) * dt
    swirl += swirlV * dt
    const lagX = Math.sin(t * 1.3) * 0.012
    for (let i = 0; i < pos.count; i += 1) {
      const x = base[i * 3]
      const y = base[i * 3 + 1]
      const z = base[i * 3 + 2]
      const d = Math.pow(clamp01(-y / 0.985), 1.7)
      const a = swirl * d
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const wave = 1 + Math.sin(Math.atan2(x, z) * 5 + t * 2.4) * 0.025 * d
      pos.array[i * 3] = (x * ca + z * sa) * wave + lagX * d
      pos.array[i * 3 + 1] = y + Math.abs(lagZ) * d * 0.12
      pos.array[i * 3 + 2] = (-x * sa + z * ca) * wave + lagZ * d
    }
    pos.needsUpdate = true
    k.skirt.geometry.computeVertexNormals()
  }
}

/* ------------------------------------------------------------------ the pages */

/** A page of the rule book: header, rule number, title, lines of text. */
function pageTexture(rule) {
  const tex = canvasTexture(256, 362, (g) => {
    const paper = g.createLinearGradient(0, 0, 256, 362)
    paper.addColorStop(0, '#fbf8f1')
    paper.addColorStop(1, '#e6dece')
    g.fillStyle = paper
    g.fillRect(0, 0, 256, 362)
    g.fillStyle = '#b8913e'
    g.fillRect(18, 18, 220, 3)
    g.font = '700 11px monospace'
    g.fillStyle = '#7a6430'
    g.fillText('RAMEIRAH EMPIRE · RULE BOOK', 18, 38)
    g.font = '700 30px sans-serif'
    g.fillStyle = '#16140f'
    g.fillText(rule.number || 'RULE', 18, 80)
    g.font = '600 15px sans-serif'
    g.fillStyle = '#2b2720'
    let line = ''
    let y = 104
    for (const w of String(rule.title || '').split(' ')) {
      if (g.measureText(`${line} ${w}`).width > 215 && line) {
        g.fillText(line, 18, y)
        line = w
        y += 19
        if (y > 140) break
      } else line = line ? `${line} ${w}` : w
    }
    if (y <= 140) g.fillText(line, 18, y)
    g.fillStyle = 'rgba(40, 36, 28, 0.22)'
    for (let ly = 162; ly < 336; ly += 13) g.fillRect(18, ly, ly % 39 === 0 ? 150 : 210 - ((ly * 7) % 50), 5)
  })
  tex.flipY = true // a flat page: the usual way up, so the text reads correctly
  return tex
}

/** A soft round dot, for the dust in the light. */
const dotTexture = () =>
  canvasTexture(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    r.addColorStop(0, 'rgba(255,240,210,1)')
    r.addColorStop(0.4, 'rgba(255,230,180,0.35)')
    r.addColorStop(1, 'rgba(255,230,180,0)')
    g.fillStyle = r
    g.fillRect(0, 0, 64, 64)
  })

/* ------------------------------------------------------------------ the scene */

export default function RulesIntro({ rules, onDone }) {
  const host = useRef(null)
  const [slaps, setSlaps] = useState([])
  const [phase, setPhase] = useState('play') // play → fade → fall
  const done = useRef(false)
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })
  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    onDoneRef.current()
  }, [])

  useEffect(() => {
    const el = host.current
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    } catch {
      finish()
      return undefined
    }
    const small = window.innerWidth < 700
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    el.appendChild(renderer.domElement)

    const trash = []
    const keep = (x) => {
      trash.push(x)
      return x
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x040405)
    scene.fog = new THREE.Fog(0x040405, 6.5, 14)
    const pmrem = new THREE.PMREMGenerator(renderer)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.45

    const camera = new THREE.PerspectiveCamera(small ? 48 : 36, window.innerWidth / window.innerHeight, 0.05, 40)
    const look = new THREE.Vector3(0, 1.28, 0)

    // light: one warm beam from above, gold rims behind, very little fill — a stage
    scene.add(new THREE.HemisphereLight(0xfff1d6, 0x0a0806, 0.22))
    const key = new THREE.SpotLight(0xffe4b8, 46, 14, 0.34, 0.72, 1.5)
    key.position.set(-1.2, 5.2, 2.4)
    key.target.position.set(0, 1.0, 0.1)
    key.castShadow = true
    key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
    key.shadow.bias = -0.0003
    scene.add(key, key.target)
    const rim = new THREE.SpotLight(0xffc766, 85, 12, 0.6, 0.5, 1.4)
    rim.position.set(1.6, 3.4, -3.4)
    rim.target.position.set(0, 1.4, 0)
    scene.add(rim, rim.target)
    const rim2 = new THREE.SpotLight(0xd8a24a, 40, 10, 0.55, 0.6, 1.5)
    rim2.position.set(-2.4, 2.6, -2.6)
    rim2.target.position.set(0, 1.2, 0)
    scene.add(rim2, rim2.target)

    // the beam itself, faintly visible in the dark
    const beamDir = key.target.position.clone().sub(key.position)
    const beamLen = beamDir.length() + 0.6
    beamDir.normalize()
    const beamTex = keep(
      canvasTexture(8, 256, (g) => {
        const r = g.createLinearGradient(0, 0, 0, 256)
        r.addColorStop(0, 'rgba(255,230,180,0.0)')
        r.addColorStop(0.15, 'rgba(255,230,180,0.6)')
        r.addColorStop(1, 'rgba(255,230,180,0.05)')
        g.fillStyle = r
        g.fillRect(0, 0, 8, 256)
      }),
    )
    const beam = new THREE.Mesh(
      keep(new THREE.CylinderGeometry(0.12, 1.25, beamLen, 40, 1, true)),
      keep(
        new THREE.MeshBasicMaterial({
          map: beamTex,
          transparent: true,
          opacity: 0.075,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        }),
      ),
    )
    beam.position.copy(key.position).addScaledVector(beamDir, beamLen / 2)
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), beamDir)
    scene.add(beam)

    // dust drifting in the beam
    const DUST = small ? 140 : 280
    const dustPos = new Float32Array(DUST * 3)
    const dustSeed = new Float32Array(DUST)
    for (let i = 0; i < DUST; i += 1) {
      dustPos[i * 3] = rand(-1.6, 1.4)
      dustPos[i * 3 + 1] = rand(0.2, 3.6)
      dustPos[i * 3 + 2] = rand(-1.2, 2.2)
      dustSeed[i] = rand(0, 100)
    }
    const dustGeo = keep(new THREE.BufferGeometry())
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
    const dust = new THREE.Points(
      dustGeo,
      keep(
        new THREE.PointsMaterial({
          map: keep(dotTexture()),
          size: small ? 0.022 : 0.018,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    )
    scene.add(dust)

    // the floor: matte black stone, a gold ring around the keeper
    const floor = new THREE.Mesh(
      keep(new THREE.CircleGeometry(10, 72)),
      keep(new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.62, metalness: 0.15, envMapIntensity: 0.05 })),
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)
    const ring = new THREE.Mesh(
      keep(new THREE.RingGeometry(1.0, 1.035, 96)),
      keep(new THREE.MeshBasicMaterial({ color: 0xd8ac52, transparent: true, opacity: 0.3 })),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.003
    scene.add(ring)

    const keeper = buildKeeper()
    scene.add(keeper.root)
    const hem = makeHem(keeper)

    // the pages: real rule numbers and titles, on paper that bends as it flies
    const pool = rules.length ? rules : [{ number: 'RULES', title: 'Rameirah Empire' }]
    const textures = Array.from({ length: Math.min(12, pool.length) }, (_, i) => keep(pageTexture(pool[(i * 7) % pool.length])))
    const paperMats = textures.map((map) => {
      const mat = keep(new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.82 }))
      // the back of a page is plain paper, with the print showing through faintly
      mat.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
            vec4 sampledDiffuseColor = texture2D( map, vMapUv );
            if ( !gl_FrontFacing ) sampledDiffuseColor.rgb = mix( vec3( 0.86, 0.82, 0.74 ), sampledDiffuseColor.rgb, 0.14 );
            diffuseColor *= sampledDiffuseColor;
          #endif`,
        )
      }
      return mat
    })
    const baseGeo = keep(new THREE.PlaneGeometry(0.21, 0.297, 4, 6))
    const COUNT = small ? 55 : 110
    const papers = Array.from({ length: COUNT }, (_, i) => {
      const geo = keep(baseGeo.clone())
      const m = new THREE.Mesh(geo, paperMats[i % paperMats.length])
      m.visible = false
      scene.add(m)
      return {
        m,
        base: Float32Array.from(geo.attributes.position.array),
        rule: pool[(i * 7) % pool.length],
        born: T_RELEASE + Math.pow(i / COUNT, 1.4) * 0.16,
        live: false,
        gone: false,
        v: new THREE.Vector3(),
        w: new THREE.Vector3(rand(-7, 7), rand(-5, 5), rand(-7, 7)),
        drag: rand(0.05, 0.13),
        freq: rand(9, 16),
        bend: rand(0.6, 1.4),
        phase: rand(0, TAU),
      }
    })

    const handPos = new THREE.Vector3()
    const project = new THREE.Vector3()
    const forward = new THREE.Vector3()
    const toPaper = new THREE.Vector3()
    const target = new THREE.Vector3()
    const GRAVITY = 2.4
    const maxSlaps = small ? 9 : 16
    const slapped = []
    let raf = 0
    let last = performance.now()
    const start = last
    const params = new URLSearchParams(window.location.search)
    const freezeAt = params.has('intro-t') ? Number(params.get('intro-t')) : null
    // ?intro-speed=0.25 plays it in slow motion (for checking the animation)
    const speed = Math.min(1, Math.max(0.05, Number(params.get('intro-speed')) || 1))

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    const bendPaper = (p, t) => {
      const pos = p.m.geometry.attributes.position
      const curl = Math.sin(t * p.freq + p.phase) * 0.024 * p.bend
      const ripple = Math.cos(t * p.freq * 1.3 + p.phase) * 0.008 * p.bend
      for (let i = 0; i < pos.count; i += 1) {
        const x = p.base[i * 3] / 0.105
        const y = p.base[i * 3 + 1] / 0.1485
        pos.array[i * 3 + 2] = curl * (x * x - 0.35) + ripple * Math.sin(y * 2.6 + p.phase) * (y + 1) * 0.5
      }
      pos.needsUpdate = true
      p.m.geometry.computeVertexNormals()
    }

    /** Moves everything on to time t (dt seconds since the last call). */
    const simulate = (t, dt) => {
      pose(keeper, t)
      hem(t, dt)
      keeper.stack.visible = t < T_RELEASE

      // a slightly handheld camera that drifts in, and flinches as the pages come
      const flinch = Math.max(0, 1 - Math.abs(t - T_RELEASE - 0.05) * 7) * 0.025
      const drift = smooth(0, T_FOLLOW + 0.3, t)
      camera.position.set(
        mix(0.95, 0.38, drift) + Math.sin(t * 0.9) * 0.012 + Math.sin(t * 43) * flinch,
        mix(1.62, 1.46, drift) + Math.sin(t * 1.3 + 1) * 0.008 + Math.cos(t * 39) * flinch,
        mix(small ? 6.6 : 6.0, small ? 5.3 : 4.75, drift),
      )
      camera.lookAt(look)
      camera.updateMatrixWorld()
      camera.getWorldDirection(forward)
      ring.material.opacity = 0.22 + Math.sin(t * 2.4) * 0.06

      // dust: a slow drift, stirred a little by the throw
      const stir = smooth(T_RELEASE, T_RELEASE + 0.4, t) * (1 - smooth(2.2, 3.2, t))
      const dp = dust.geometry.attributes.position
      for (let i = 0; i < DUST; i += 1) {
        const s = dustSeed[i]
        dp.array[i * 3] += (Math.sin(t * 0.4 + s) * 0.02 + stir * Math.sin(s) * 0.25) * dt
        dp.array[i * 3 + 1] += (Math.cos(t * 0.3 + s * 1.7) * 0.015 - 0.004) * dt
        dp.array[i * 3 + 2] += (Math.sin(t * 0.35 + s * 0.6) * 0.02 + stir * 0.35) * dt
      }
      dp.needsUpdate = true

      keeper.arms.right.hand.getWorldPosition(handPos)
      papers.forEach((p, i) => {
        if (!p.live && !p.gone && t >= p.born) {
          // out of the hand in a burst: most are aimed at the glass, the rest fly past
          p.live = true
          p.m.visible = true
          p.m.position.copy(handPos).add(new THREE.Vector3(rand(-0.04, 0.04), rand(-0.04, 0.04), rand(-0.03, 0.03)))
          const onScreen = i % 3 !== 2
          const spreadX = onScreen ? 0.3 * camera.aspect : 1.5
          const spreadY = onScreen ? 0.28 : 1.0
          target
            .copy(camera.position)
            .addScaledVector(forward, 0.42)
            .add(new THREE.Vector3(rand(-spreadX, spreadX), rand(-spreadY, spreadY), 0))
          const flight = rand(0.45, 1.05)
          p.v.copy(target).sub(handPos).divideScalar(flight)
          p.v.y += 0.5 * GRAVITY * flight
          p.v.multiplyScalar(1 + p.drag * 0.9) // to make up for the air slowing it
          p.m.rotation.set(rand(-0.6, 0.6), rand(0, TAU), rand(-0.6, 0.6))
        }
        if (!p.live) return
        // paper in the air: gravity, drag that grows with speed, a flutter that pushes it sideways
        const speedNow = p.v.length()
        p.v.y -= GRAVITY * dt
        p.v.multiplyScalar(Math.max(0, 1 - p.drag * speedNow * dt))
        p.v.x += Math.sin(t * p.freq * 0.5 + p.phase) * 0.9 * dt
        p.m.position.addScaledVector(p.v, dt)
        p.w.multiplyScalar(1 - 0.25 * dt)
        p.m.rotation.x += p.w.x * dt
        p.m.rotation.y += p.w.y * dt
        p.m.rotation.z += p.w.z * dt
        bendPaper(p, t)
        // reaching the glass: the page slaps onto the screen (or it has flown past or landed)
        toPaper.copy(p.m.position).sub(camera.position)
        const atGlass = toPaper.dot(forward) < 0.48
        if (atGlass || p.m.position.y < 0.02) {
          p.live = false
          p.gone = true
          p.m.visible = false
          project.copy(p.m.position).project(camera)
          if (atGlass && slapped.length < maxSlaps && Math.abs(project.x) < 0.92 && Math.abs(project.y) < 0.92) {
            slapped.push({
              id: slapped.length,
              x: (project.x * 0.5 + 0.5) * 100,
              y: (-project.y * 0.5 + 0.5) * 100,
              r: rand(-26, 26),
              dx: rand(-9, 9),
              rule: p.rule,
            })
            if (freezeAt === null) setSlaps([...slapped])
          }
        }
      })
    }

    let shown = 'play'
    const step = (time) => {
      if (freezeAt !== null) {
        // checking a moment: run the whole performance up to it, then draw that one frame
        for (let k = 0; k <= freezeAt; k += 1 / 60) simulate(k, 1 / 60)
        setSlaps([...slapped])
        renderer.render(scene, camera)
        return
      }
      const t = ((time - start) / 1000) * speed
      const dt = Math.min(0.05, (time - last) / 1000) * speed
      last = time
      simulate(t, dt)
      renderer.render(scene, camera)
      const want = t >= T_FALL ? 'fall' : t >= T_FADE ? 'fade' : 'play'
      if (want !== shown) {
        shown = want
        setPhase(want)
      }
      if (t >= T_END) {
        finish()
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      trash.forEach((x) => x.dispose())
      keeper.disposables.forEach((x) => x.dispose())
      env.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [rules, finish])

  // any key or click skips it
  useEffect(() => {
    const skip = (e) => {
      if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return
      finish()
    }
    window.addEventListener('keydown', skip)
    return () => window.removeEventListener('keydown', skip)
  }, [finish])

  return createPortal(
    <div className={`ri ri--${phase}`} onClick={() => finish()} role="presentation">
      <div ref={host} className="ri__stage" aria-hidden="true" />
      <div className="ri__sheets" aria-hidden="true">
        {slaps.map((s) => (
          <div
            key={s.id}
            className="ri-sheet"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              '--r': `${s.r}deg`,
              '--d': `${(s.id % 7) * 0.06}s`,
              '--dx': `${s.dx}vw`,
              '--fall': `${(s.id % 2 ? 1 : -1) * (24 + (s.id % 5) * 10)}deg`,
            }}
          >
            <span className="ri-sheet__head">Rameirah Empire · Rule book</span>
            <span className="ri-sheet__num">{s.rule.number}</span>
            <span className="ri-sheet__title">{s.rule.title}</span>
            <span className="ri-sheet__lines" />
          </div>
        ))}
      </div>
      <button
        type="button"
        className="ri__skip"
        onClick={(e) => {
          e.stopPropagation()
          finish()
        }}
      >
        Skip
      </button>
    </div>,
    document.body,
  )
}
