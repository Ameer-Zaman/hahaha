import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

import './rulesIntro.css'

/*
 * The Rules page's opening: a 3D figure in a black suit (a faceless gold "statue" head, like the
 * site's black-and-gold look) winds up and throws a stack of rule pages at the camera. The pages
 * flutter towards you, the closest ones slap onto the screen, then everything falls away and the
 * Rules page is underneath. Built from simple shapes in three.js — no model files, nothing
 * copied. Any click, key or the Skip button ends it at once.
 *
 * Timeline (seconds): 0 idle and dolly in · 0.7 wind-up · 1.45 throw (pages released ~1.62)
 * · 1.9 follow-through · pages reach the screen ~2.1–2.9 · 3.0 the 3D fades · 3.3 pages fall.
 */

const T_WIND = 0.7
const T_THROW = 1.45
const T_FOLLOW = 1.9
const T_RELEASE = 1.62
const T_FADE = 3.0
const T_FALL = 3.3
const T_END = 4.7

const smooth = (a, b, t) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}
const mix = (a, b, k) => a + (b - a) * k
const rand = (a, b) => a + Math.random() * (b - a)

/** Keyframed pose: [time, value] pairs, eased between. */
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i += 1) {
    const [t1, v1] = keys[i]
    const [t0, v0] = keys[i - 1]
    if (t <= t1) return mix(v0, v1, smooth(t0, t1, t))
  }
  return keys[keys.length - 1][1]
}

/* ------------------------------------------------------------------ the figure */

function buildFigure() {
  const suit = new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 0.5, metalness: 0.15 })
  const suitDark = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.6, metalness: 0.1 })
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8ac52, roughness: 0.26, metalness: 0.9 })
  const shirt = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.7 })
  const shoe = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3, metalness: 0.4 })

  const mesh = (geo, mat) => {
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = true
    return m
  }
  const capsule = (r, len, mat) => mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat)
  const joint = (parent, x, y, z) => {
    const g = new THREE.Group()
    g.position.set(x, y, z)
    parent.add(g)
    return g
  }

  const root = new THREE.Group()
  const hips = joint(root, 0, 1.0, 0)
  const pelvis = capsule(0.13, 0.1, suitDark)
  pelvis.rotation.z = Math.PI / 2
  pelvis.scale.set(1, 1, 0.75)
  hips.add(pelvis)

  // legs
  const legs = {}
  for (const side of [1, -1]) {
    const thigh = joint(hips, 0.105 * side, -0.04, 0)
    const t = capsule(0.075, 0.36, suit)
    t.position.y = -0.24
    thigh.add(t)
    const knee = joint(thigh, 0, -0.47, 0)
    const s = capsule(0.062, 0.36, suit)
    s.position.y = -0.22
    knee.add(s)
    const foot = mesh(new THREE.BoxGeometry(0.1, 0.07, 0.25), shoe)
    foot.position.set(0, -0.47, 0.06)
    knee.add(foot)
    legs[side > 0 ? 'left' : 'right'] = { thigh, knee }
  }

  // torso: a jacket, a shirt front, a gold tie
  const spine = joint(hips, 0, 0.06, 0)
  const jacket = mesh(new THREE.CylinderGeometry(0.235, 0.19, 0.74, 20), suit)
  jacket.scale.set(1, 1, 0.62)
  jacket.position.y = 0.23
  spine.add(jacket)
  const chest = mesh(new THREE.SphereGeometry(0.235, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), suit)
  chest.scale.set(1, 0.32, 0.62)
  chest.position.y = 0.6
  spine.add(chest)
  const shirtFront = mesh(new THREE.ConeGeometry(0.075, 0.3, 3), shirt)
  shirtFront.rotation.x = Math.PI
  shirtFront.position.set(0, 0.47, 0.128)
  shirtFront.scale.set(1, 1, 0.25)
  spine.add(shirtFront)
  const tie = mesh(new THREE.BoxGeometry(0.035, 0.27, 0.012), gold)
  tie.position.set(0, 0.45, 0.145)
  spine.add(tie)

  // head: neck and a smooth gold head
  const neck = joint(spine, 0, 0.66, 0)
  const n = mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.1, 14), gold)
  n.position.y = 0.04
  neck.add(n)
  const head = mesh(new THREE.SphereGeometry(0.115, 28, 20), gold)
  head.scale.set(0.92, 1.12, 1)
  head.position.y = 0.19
  neck.add(head)

  // arms
  const arms = {}
  for (const side of [1, -1]) {
    const shoulder = joint(spine, 0.255 * side, 0.57, 0)
    const pad = mesh(new THREE.SphereGeometry(0.075, 14, 10), suit)
    shoulder.add(pad)
    const u = capsule(0.058, 0.24, suit)
    u.position.y = -0.17
    shoulder.add(u)
    const elbow = joint(shoulder, 0, -0.33, 0)
    const f = capsule(0.05, 0.22, suit)
    f.position.y = -0.15
    elbow.add(f)
    const cuff = mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.03, 12), shirt)
    cuff.position.y = -0.28
    elbow.add(cuff)
    const hand = joint(elbow, 0, -0.33, 0)
    const h = mesh(new THREE.SphereGeometry(0.052, 14, 10), gold)
    h.scale.set(0.85, 1.1, 0.6)
    hand.add(h)
    arms[side > 0 ? 'left' : 'right'] = { shoulder, elbow, hand }
  }

  // the stack of pages in the right hand
  const stack = new THREE.Group()
  const sheets = mesh(new THREE.BoxGeometry(0.2, 0.05, 0.27), shirt)
  stack.add(sheets)
  stack.position.set(0, -0.06, 0.05)
  stack.rotation.set(0.3, 0, 0)
  arms.right.hand.add(stack)

  return { root, hips, spine, neck, legs, arms, stack, materials: [suit, suitDark, gold, shirt, shoe] }
}

/** Puts the figure in its pose for time t. */
function pose(f, t) {
  const { hips, spine, neck, legs, arms, root } = f
  // weight shifts back on the wind-up, forward on the throw
  root.position.z = track(
    [
      [0, 0],
      [T_WIND, 0],
      [T_THROW - 0.05, -0.12],
      [T_FOLLOW, 0.2],
      [3, 0.16],
    ],
    t,
  )
  root.rotation.y = track(
    [
      [0, 0.25],
      [T_WIND, 0.2],
      [T_THROW - 0.05, 0.55],
      [T_FOLLOW, -0.15],
      [3, -0.05],
    ],
    t,
  )
  hips.position.y =
    1.0 +
    track(
      [
        [0, 0],
        [T_THROW - 0.05, -0.05],
        [T_FOLLOW, -0.08],
        [3, -0.02],
      ],
      t,
    ) +
    Math.sin(t * 2.2) * 0.006

  spine.rotation.y = track(
    [
      [0, 0],
      [T_WIND, -0.1],
      [T_THROW - 0.05, -0.75],
      [T_FOLLOW - 0.15, 0.55],
      [3, 0.3],
    ],
    t,
  )
  spine.rotation.x = track(
    [
      [0, 0.02],
      [T_WIND, 0],
      [T_THROW - 0.05, -0.22],
      [T_FOLLOW - 0.1, 0.42],
      [3, 0.2],
    ],
    t,
  )
  neck.rotation.x = track(
    [
      [0, 0.05],
      [T_THROW - 0.05, 0.12],
      [T_FOLLOW, -0.25],
      [3, -0.1],
    ],
    t,
  )
  neck.rotation.y = -spine.rotation.y * 0.55

  // right arm: holds the stack at the chest, goes up and back, whips forward towards the camera
  const R = arms.right
  R.shoulder.rotation.x = track(
    [
      [0, -0.75],
      [T_WIND, -0.8],
      [T_THROW - 0.05, 2.7],
      [T_RELEASE, 2 * Math.PI - 1.2],
      [T_FOLLOW, 2 * Math.PI - 0.5],
      [3, 2 * Math.PI - 0.32],
    ],
    t,
  )
  R.shoulder.rotation.z = track(
    [
      [0, 0.15],
      [T_THROW - 0.05, -0.45],
      [T_FOLLOW, 0.35],
      [3, 0.2],
    ],
    t,
  )
  R.elbow.rotation.x = track(
    [
      [0, -1.35],
      [T_WIND, -1.4],
      [T_THROW - 0.05, -1.9],
      [T_RELEASE, -0.25],
      [T_FOLLOW, -0.45],
      [3, -0.6],
    ],
    t,
  )
  // left arm: reaches forward for balance, then swings back
  const L = arms.left
  L.shoulder.rotation.x = track(
    [
      [0, 0.05],
      [T_WIND, -0.1],
      [T_THROW - 0.05, -1.3],
      [T_FOLLOW, 0.55],
      [3, 0.2],
    ],
    t,
  )
  L.shoulder.rotation.z = track(
    [
      [0, -0.08],
      [T_THROW - 0.05, -0.35],
      [T_FOLLOW, -0.25],
      [3, -0.12],
    ],
    t,
  )
  L.elbow.rotation.x = track(
    [
      [0, -0.15],
      [T_THROW - 0.05, -0.35],
      [T_FOLLOW, -0.6],
      [3, -0.3],
    ],
    t,
  )

  // legs: right foot back, knees bend into the throw
  legs.right.thigh.rotation.x = track(
    [
      [0, 0.28],
      [T_THROW - 0.05, 0.42],
      [T_FOLLOW, 0.05],
      [3, 0.12],
    ],
    t,
  )
  legs.right.knee.rotation.x = track(
    [
      [0, 0.12],
      [T_THROW - 0.05, 0.35],
      [T_FOLLOW, 0.5],
      [3, 0.25],
    ],
    t,
  )
  legs.left.thigh.rotation.x = track(
    [
      [0, -0.22],
      [T_THROW - 0.05, -0.12],
      [T_FOLLOW, -0.5],
      [3, -0.32],
    ],
    t,
  )
  legs.left.knee.rotation.x = track(
    [
      [0, 0.08],
      [T_THROW - 0.05, 0.2],
      [T_FOLLOW, 0.45],
      [3, 0.3],
    ],
    t,
  )
}

/* ------------------------------------------------------------------ the pages */

/** A page of the rule book, drawn on a canvas: header, rule number, title, lines of text. */
function pageTexture(rule) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 362
  const g = c.getContext('2d')
  const paper = g.createLinearGradient(0, 0, 256, 362)
  paper.addColorStop(0, '#fbf8f1')
  paper.addColorStop(1, '#e8e0cf')
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
  const words = String(rule.title || '').split(' ')
  let line = ''
  let y = 104
  for (const w of words) {
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
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

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
    renderer.toneMappingExposure = 1.1
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050506)
    scene.fog = new THREE.Fog(0x050506, 6.5, 15)
    const pmrem = new THREE.PMREMGenerator(renderer)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.55

    const camera = new THREE.PerspectiveCamera(small ? 50 : 38, window.innerWidth / window.innerHeight, 0.05, 40)
    const look = new THREE.Vector3(0, 1.2, 0)

    // lights: a warm key from the front, a strong gold rim behind, a soft fill
    scene.add(new THREE.HemisphereLight(0xfff1d6, 0x0a0806, 0.28))
    const key = new THREE.SpotLight(0xffe2b0, 38, 14, 0.36, 0.75, 1.6)
    key.position.set(-1.8, 4.6, 3.2)
    key.target.position.set(0, 1.35, 0)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.bias = -0.0004
    scene.add(key, key.target)
    const rim = new THREE.SpotLight(0xffc766, 90, 12, 0.7, 0.5, 1.4)
    rim.position.set(1.8, 3.2, -3.4)
    rim.target.position.set(0, 1.3, 0)
    scene.add(rim, rim.target)
    const rim2 = new THREE.PointLight(0xd8a24a, 5, 5)
    rim2.position.set(-1.6, 2.6, -1.6)
    scene.add(rim2)

    // the floor: polished black, fading into the dark
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9, metalness: 0, envMapIntensity: 0 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)
    // a gold ring of light on the floor around the figure
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.0, 64),
      new THREE.MeshBasicMaterial({ color: 0xd8ac52, transparent: true, opacity: 0.35 }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.003
    scene.add(ring)

    const fig = buildFigure()
    scene.add(fig.root)

    // the pages: textures from real rule numbers and titles
    const pool = rules.length ? rules : [{ number: 'RULES', title: 'Rameirah Empire' }]
    const textures = Array.from({ length: Math.min(10, pool.length) }, (_, i) => pageTexture(pool[(i * 7) % pool.length]))
    const paperGeo = new THREE.PlaneGeometry(0.21, 0.297)
    const paperMats = textures.map(
      (map) => new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.85, metalness: 0, transparent: true }),
    )
    const COUNT = small ? 55 : 110
    const papers = Array.from({ length: COUNT }, (_, i) => {
      const m = new THREE.Mesh(paperGeo, paperMats[i % paperMats.length])
      m.visible = false
      scene.add(m)
      return {
        m,
        rule: pool[(i * 7) % pool.length],
        born: T_RELEASE + (i / COUNT) * 0.22,
        live: false,
        v: new THREE.Vector3(),
        w: new THREE.Vector3(rand(-6, 6), rand(-6, 6), rand(-6, 6)),
        phase: rand(0, Math.PI * 2),
      }
    })

    const handPos = new THREE.Vector3()
    const project = new THREE.Vector3()
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

    const forward = new THREE.Vector3()
    const toPaper = new THREE.Vector3()
    const target = new THREE.Vector3()
    const GRAVITY = 2.2
    const maxSlaps = small ? 9 : 16

    /** Moves everything on to time t (dt seconds since the last call). */
    const simulate = (t, dt) => {
      pose(fig, t)
      fig.stack.visible = t < T_RELEASE + 0.02

      // the camera dollies in, and jolts a little as the pages are thrown
      const shake = Math.max(0, 1 - Math.abs(t - T_RELEASE) * 6) * 0.02
      camera.position.set(
        mix(0.9, 0.35, smooth(0, T_THROW, t)) + Math.sin(t * 40) * shake,
        mix(1.5, 1.42, smooth(0, T_THROW, t)) + Math.cos(t * 37) * shake,
        mix(small ? 6.2 : 5.6, small ? 5.2 : 4.6, smooth(0, T_FOLLOW, t)),
      )
      camera.lookAt(look)
      camera.updateMatrixWorld()
      camera.getWorldDirection(forward)
      ring.material.opacity = 0.25 + Math.sin(t * 3) * 0.08

      fig.arms.right.hand.getWorldPosition(handPos)
      papers.forEach((p, i) => {
        if (!p.live && !p.gone && t >= p.born) {
          // out of the hand: most are aimed at the glass (somewhere on the screen), the rest fly past
          p.live = true
          p.m.visible = true
          p.m.position.copy(handPos)
          const onScreen = i % 3 !== 2
          const spreadX = onScreen ? 0.32 * camera.aspect : 1.4
          const spreadY = onScreen ? 0.3 : 1.0
          target
            .copy(camera.position)
            .addScaledVector(forward, 0.45)
            .add(new THREE.Vector3(rand(-spreadX, spreadX), rand(-spreadY, spreadY), 0))
          const flight = rand(0.42, 1.0)
          p.v.copy(target).sub(handPos).divideScalar(flight)
          p.v.y += 0.5 * GRAVITY * flight
          p.m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6))
        }
        if (!p.live) return
        // light paper: a little gravity, fluttering and spinning as it goes
        p.v.y -= GRAVITY * dt
        p.m.position.addScaledVector(p.v, dt)
        p.m.position.x += Math.sin(t * 9 + p.phase) * 0.12 * dt
        p.m.rotation.x += p.w.x * dt
        p.m.rotation.y += p.w.y * dt
        p.m.rotation.z += p.w.z * dt
        // reaching the glass: the page slaps onto the screen (or it has flown past)
        toPaper.copy(p.m.position).sub(camera.position)
        if (toPaper.dot(forward) < 0.5) {
          p.live = false
          p.gone = true
          p.m.visible = false
          project.copy(p.m.position).project(camera)
          if (slapped.length < maxSlaps && Math.abs(project.x) < 0.95 && Math.abs(project.y) < 0.95) {
            slapped.push({
              id: slapped.length,
              x: (project.x * 0.5 + 0.5) * 100,
              y: (-project.y * 0.5 + 0.5) * 100,
              r: rand(-28, 28),
              rule: p.rule,
            })
            if (freezeAt === null) setSlaps([...slapped])
          }
        }
      })
    }

    const step = (time) => {
      if (freezeAt !== null) {
        // checking a moment: run the whole throw up to it, then draw that one frame
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
    let shown = 'play'
    raf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      textures.forEach((x) => x.dispose())
      paperMats.forEach((x) => x.dispose())
      paperGeo.dispose()
      fig.materials.forEach((x) => x.dispose())
      scene.traverse((o) => o.geometry?.dispose?.())
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
              '--d': `${(s.id % 7) * 0.05}s`,
              '--fall': `${(s.id % 2 ? 1 : -1) * (20 + (s.id % 5) * 9)}deg`,
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
