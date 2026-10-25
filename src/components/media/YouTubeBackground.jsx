import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './youtube-background.css'

const ORIGIN = 'https://www.youtube-nocookie.com'
const PLAYING = 1

/** Sends a command to the YouTube iframe player API over postMessage. */
function send(frame, func) {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), ORIGIN)
}

/**
 * A muted, looping YouTube video used as a background layer.
 *
 * - Loads only once its section is near the viewport and the browser is idle, so it never
 *   costs anything for visitors who don't scroll to it.
 * - Stays invisible until YouTube reports it is actually playing; if the video is blocked,
 *   unavailable or slow, whatever sits underneath (the plate) simply remains.
 * - Pauses while off screen to save CPU and data.
 * - Never autoplays for visitors who prefer reduced motion or have data saver on —
 *   they get a "Play video" button instead.
 * - Exposes sound and pause controls (WCAG 2.2.2: moving content must be pausable).
 */
export default function YouTubeBackground({ videoId, title, credit, controlsSlot = null }) {
  const frameRef = useRef(null)
  const wrapRef = useRef(null)
  const userPaused = useRef(false)
  const [mode] = useState(() => (shouldAutoplay() ? 'auto' : 'manual'))
  const [mounted, setMounted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)

  // Mount the iframe when its section comes near the viewport and the browser is idle.
  useEffect(() => {
    if (mode !== 'auto' || !wrapRef.current) return undefined
    let idle = 0
    let timer = 0
    const start = () => setMounted(true)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        if ('requestIdleCallback' in window) idle = window.requestIdleCallback(start, { timeout: 1500 })
        else timer = setTimeout(start, 300)
      },
      { rootMargin: '0px 0px -10% 0px' }, // only once the section is properly on screen
    )
    observer.observe(wrapRef.current)
    return () => {
      observer.disconnect()
      if (idle) window.cancelIdleCallback(idle)
      clearTimeout(timer)
    }
  }, [mode])

  // Listen for the player's state so we only reveal it once it is really playing.
  useEffect(() => {
    if (!mounted) return undefined
    const onMessage = (event) => {
      if (event.origin !== ORIGIN || event.source !== frameRef.current?.contentWindow) return
      let data
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch {
        return
      }
      const state = data?.info?.playerState ?? (data?.event === 'onStateChange' ? data.info : undefined)
      if (state === PLAYING) setPlaying(true)
      if (typeof data?.info?.muted === 'boolean') setMuted(data.info.muted)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [mounted])

  // Pause when the section scrolls out of view; resume when it returns (unless the visitor paused).
  useEffect(() => {
    if (!playing || !wrapRef.current) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (userPaused.current) return
      send(frameRef.current, entry.isIntersecting ? 'playVideo' : 'pauseVideo')
    })
    observer.observe(wrapRef.current)
    return () => observer.disconnect()
  }, [playing])

  const onLoad = () => {
    // Ask the player to start sending state updates.
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: videoId }), ORIGIN)
  }

  const toggleSound = () => {
    send(frameRef.current, muted ? 'unMute' : 'mute')
    setMuted(!muted)
  }

  const togglePause = () => {
    send(frameRef.current, paused ? 'playVideo' : 'pauseVideo')
    userPaused.current = !paused
    setPaused(!paused)
  }

  const controlsUi = (
    <div className="yt-bg__controls">
      {credit && (
        <a
          className="yt-bg__credit mono-note"
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {credit}
        </a>
      )}
      {!mounted && mode === 'manual' && (
        <button type="button" className="yt-bg__btn" onClick={() => setMounted(true)}>
          Play video
        </button>
      )}
      {playing && (
        <>
          <button type="button" className="yt-bg__btn" onClick={toggleSound} aria-pressed={!muted}>
            {muted ? 'Sound on' : 'Sound off'}
          </button>
          <button type="button" className="yt-bg__btn" onClick={togglePause} aria-pressed={paused}>
            {paused ? 'Play' : 'Pause'}
          </button>
        </>
      )}
    </div>
  )

  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: videoId,
    controls: '0',
    rel: '0',
    playsinline: '1',
    disablekb: '1',
    iv_load_policy: '3',
    modestbranding: '1',
    enablejsapi: '1',
    origin: window.location.origin,
  })

  return (
    <>
      <div ref={wrapRef} className={`yt-bg ${playing ? 'is-playing' : ''}`} aria-hidden="true">
        {mounted && (
          <iframe
            ref={frameRef}
            className="yt-bg__frame"
            src={`${ORIGIN}/embed/${videoId}?${params}`}
            title={title}
            tabIndex={-1}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={onLoad}
          />
        )}
      </div>

      {controlsSlot ? createPortal(controlsUi, controlsSlot) : controlsUi}
    </>
  )
}

function shouldAutoplay() {
  if (typeof window === 'undefined') return false
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const saveData = navigator.connection?.saveData === true
  return !reduced && !saveData
}
