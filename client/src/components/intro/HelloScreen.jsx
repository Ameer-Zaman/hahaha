import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import '@fontsource/sacramento/latin-400.css'
import { site } from '../../config/site'
import { preloadHomeAssets, releasePreload, usePreloadProgress } from '../../lib/preload'
import './hello.css'

/**
 * The opening "hello": greetings from around the world, one after another, while the
 * homepage's videos, images and sounds download in the background. It ends once
 * everything is ready (never sooner than MIN_MS, never later than MAX_MS) and hands over
 * to the welcome screen.
 */
const WORDS = [
  { text: 'hello', lang: 'en', script: true },
  { text: 'hola', lang: 'es', script: true },
  { text: 'bonjour', lang: 'fr', script: true },
  { text: 'नमस्ते', lang: 'hi' },
  { text: 'ciao', lang: 'it', script: true },
  { text: 'നമസ്കാരം', lang: 'ml' },
  { text: 'olá', lang: 'pt', script: true },
  { text: 'வணக்கம்', lang: 'ta' },
  { text: 'hallo', lang: 'de', script: true },
  { text: 'こんにちは', lang: 'ja' },
  { text: 'مرحبا', lang: 'ar' },
  { text: '안녕하세요', lang: 'ko' },
  { text: 'привет', lang: 'ru', script: true },
  { text: '你好', lang: 'zh' },
]

const FIRST_MS = 2200 // the first "hello" is written out, so it stays longer
const WORD_MS = 950
const MIN_MS = 3800
const MAX_MS = 14000
const EXIT_MS = 700

export default function HelloScreen({ onDone }) {
  const [step, setStep] = useState(0) // counts up; the word is step % WORDS.length
  const index = step % WORDS.length
  const writing = step === 0 // only the very first "hello" is written out
  const [leaving, setLeaving] = useState(false)
  const { progress, done } = usePreloadProgress()
  const startedAt = useRef(0)
  const doneRef = useRef(done)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    startedAt.current = performance.now()
  }, [])
  useEffect(() => {
    doneRef.current = done
  }, [done])
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    preloadHomeAssets()
  }, [])

  // next word on a timer; at each word boundary, check whether it's time to go
  useEffect(() => {
    if (leaving) return undefined
    const timer = setTimeout(
      () => {
        const elapsed = performance.now() - startedAt.current
        if ((doneRef.current && elapsed >= MIN_MS) || elapsed >= MAX_MS) setLeaving(true)
        else setStep((n) => n + 1)
      },
      writing ? FIRST_MS : WORD_MS,
    )
    return () => clearTimeout(timer)
  }, [step, writing, leaving])

  useEffect(() => {
    if (!leaving) return undefined
    releasePreload() // anything still downloading streams normally from here
    const timer = setTimeout(() => onDoneRef.current?.(), EXIT_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  const word = WORDS[index]
  const pct = Math.round(progress * 100)

  return createPortal(
    <div className={`hello ${leaving ? 'is-leaving' : ''}`} role="status" aria-live="off" aria-label={`Loading ${site.name}, ${pct}%`}>
      <div className="hello__stage" aria-hidden="true">
        {writing ? (
          <svg key="hello" className="hello__draw" viewBox="0 0 640 240">
            <defs>
              <linearGradient id="hello-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff2c9" />
                <stop offset="0.45" stopColor="#f2cf80" />
                <stop offset="1" stopColor="#b5852f" />
              </linearGradient>
            </defs>
            <text x="50%" y="62%" textAnchor="middle" className="hello__draw-text">
              hello
            </text>
          </svg>
        ) : (
          <span key={step} lang={word.lang} className={`hello__word ${word.script ? 'hello__word--script' : ''}`}>
            {word.text}
          </span>
        )}
      </div>
      <div className="hello__bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${Math.max(0.02, progress)})` }} />
      </div>
    </div>,
    document.body,
  )
}
