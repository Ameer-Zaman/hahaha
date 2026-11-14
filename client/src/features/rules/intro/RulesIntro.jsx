import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

import './rulesIntro.css'

/*
 * The Rules page's opening: out of the dark, a burst of rule-book pages flies at the camera.
 * They bend and flutter as they come; the ones that reach the glass slap onto the screen, then
 * slide off and fall away to reveal the Rules page. three.js, no model files. Any click, key or
 * the Skip button ends it at once.
 *
 * Timeline (seconds): 0 a warm glow in the dark · 0.3–0.9 the pages burst out · they reach the
 * glass ~0.8–1.9 · 2.1 the scene fades · 2.4 the pages on the glass fall · 3.9 done.
 */

const T_BURST = 0.3
const T_BURST_END = 0.9
const T_FADE = 2.1
const T_FALL = 2.4
const T_END = 3.9
const TAU = Math.PI * 2

const smooth = (a, b, t) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}
const mix = (a, b, k) => a + (b - a) * k
const rand = (a, b) => a + Math.random() * (b - a)

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

    const camera = new THREE.PerspectiveCamera(small ? 50 : 38, window.innerWidth / window.innerHeight, 0.05, 40)
    camera.position.set(0, 1.4, 5)
    const look = new THREE.Vector3(0, 1.3, 0)
    const origin = new THREE.Vector3(0, 1.25, -1.2) // where the pages come from, deep in the dark

    // light: a warm beam from above, soft fill, and a gold glow where the pages burst out
    scene.add(new THREE.HemisphereLight(0xfff1d6, 0x0a0806, 0.55))
    const key = new THREE.DirectionalLight(0xffe4b8, 2.2)
    key.position.set(-1.5, 4, 3)
    scene.add(key)
    const glowLight = new THREE.PointLight(0xffc766, 0, 6, 1.6)
    glowLight.position.copy(origin)
    scene.add(glowLight)
    const glow = new THREE.Sprite(
      keep(
        new THREE.SpriteMaterial({
          map: keep(dotTexture()),
          color: 0xffd38a,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    )
    glow.position.copy(origin)
    glow.scale.setScalar(2.6)
    scene.add(glow)

    // a faint beam of light from above, with dust drifting in it
    const beamFrom = new THREE.Vector3(-1.0, 5.4, 0.6)
    const beamDir = origin.clone().sub(beamFrom)
    const beamLen = beamDir.length() + 1.4
    beamDir.normalize()
    const beamTex = keep(
      canvasTexture(8, 256, (g) => {
        const r = g.createLinearGradient(0, 0, 0, 256)
        r.addColorStop(0, 'rgba(255,230,180,0.0)')
        r.addColorStop(0.15, 'rgba(255,230,180,0.6)')
        r.addColorStop(1, 'rgba(255,230,180,0.0)')
        g.fillStyle = r
        g.fillRect(0, 0, 8, 256)
      }),
    )
    const beam = new THREE.Mesh(
      keep(new THREE.CylinderGeometry(0.15, 1.4, beamLen, 40, 1, true)),
      keep(
        new THREE.MeshBasicMaterial({
          map: beamTex,
          transparent: true,
          opacity: 0.07,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        }),
      ),
    )
    beam.position.copy(beamFrom).addScaledVector(beamDir, beamLen / 2)
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), beamDir)
    scene.add(beam)

    const DUST = small ? 140 : 280
    const dustPos = new Float32Array(DUST * 3)
    const dustSeed = new Float32Array(DUST)
    for (let i = 0; i < DUST; i += 1) {
      dustPos[i * 3] = rand(-2.2, 2.2)
      dustPos[i * 3 + 1] = rand(-0.2, 3.4)
      dustPos[i * 3 + 2] = rand(-2.5, 3)
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
        born: T_BURST + Math.pow(i / COUNT, 1.3) * (T_BURST_END - T_BURST),
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
      // the camera drifts gently, and jolts a little as the first pages hit the glass
      const jolt = Math.max(0, 1 - Math.abs(t - 0.95) * 5) * 0.018
      camera.position.set(
        Math.sin(t * 0.7) * 0.06 + Math.sin(t * 43) * jolt,
        1.4 + Math.sin(t * 1.1 + 1) * 0.03 + Math.cos(t * 39) * jolt,
        mix(5.2, 4.6, smooth(0, T_FADE, t)),
      )
      camera.lookAt(look)
      camera.updateMatrixWorld()
      camera.getWorldDirection(forward)

      // the glow swells as the pages burst out of it, then dies down
      const flare = smooth(0, T_BURST + 0.1, t) * (1 - smooth(T_BURST_END, T_BURST_END + 0.8, t))
      glow.material.opacity = 0.15 + flare * 0.75
      glow.scale.setScalar(2.2 + flare * 1.6)
      glowLight.intensity = flare * 9

      // dust: a slow drift, stirred by the pages rushing past
      const stir = smooth(T_BURST, T_BURST + 0.4, t) * (1 - smooth(1.6, 2.6, t))
      const dp = dust.geometry.attributes.position
      for (let i = 0; i < DUST; i += 1) {
        const s = dustSeed[i]
        dp.array[i * 3] += (Math.sin(t * 0.4 + s) * 0.02 + stir * Math.sin(s) * 0.3) * dt
        dp.array[i * 3 + 1] += (Math.cos(t * 0.3 + s * 1.7) * 0.015 - 0.004) * dt
        dp.array[i * 3 + 2] += (Math.sin(t * 0.35 + s * 0.6) * 0.02 + stir * 0.5) * dt
      }
      dp.needsUpdate = true

      papers.forEach((p, i) => {
        if (!p.live && !p.gone && t >= p.born) {
          // out of the glow: most are aimed at the glass, the rest fly past
          p.live = true
          p.m.visible = true
          p.m.position.copy(origin).add(new THREE.Vector3(rand(-0.25, 0.25), rand(-0.2, 0.2), rand(-0.3, 0.1)))
          const onScreen = i % 3 !== 2
          const spreadX = onScreen ? 0.3 * camera.aspect : 1.5
          const spreadY = onScreen ? 0.28 : 1.0
          target
            .copy(camera.position)
            .addScaledVector(forward, 0.42)
            .add(new THREE.Vector3(rand(-spreadX, spreadX), rand(-spreadY, spreadY), 0))
          const flight = rand(0.5, 1.0)
          p.v.copy(target).sub(p.m.position).divideScalar(flight)
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
