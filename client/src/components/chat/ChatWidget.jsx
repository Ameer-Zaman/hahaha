import { useCallback, useEffect, useRef, useState } from 'react'

import { site } from '../../config/site'
import { ApiError, USE_API } from '../../lib/api'
import { useSiteSettings } from '../../lib/siteSettings'
import './chat.css'

/**
 * The website chat: a gold button in the corner opens a small window. The assistant (AI)
 * answers first; "Talk to staff" moves the chat to the team's Discord, and their replies show
 * up here. The chat is remembered in this browser, so a visitor can close the page and come
 * back to the answer. Switch it off in Panel → Sections & maintenance.
 */
const STORE = 'rameirah:chat'
const SUGGESTIONS = ['How do I join?', 'Where are the rules?', 'Is the server open yet?']

const readStore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? 'null')
  } catch {
    return null
  }
}
const writeStore = (value) => {
  try {
    if (value) localStorage.setItem(STORE, JSON.stringify(value))
    else localStorage.removeItem(STORE)
  } catch {
    /* private mode: the chat lasts for this visit */
  }
}

async function call(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' }
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers['X-Chat-Token'] = token
  let res
  try {
    res = await fetch(`/api/chat${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, credentials: 'omit' })
  } catch {
    throw new ApiError(0, 'Can’t reach the server. Check your connection.')
  }
  const data = (res.headers.get('content-type') ?? '').includes('application/json') ? await res.json().catch(() => null) : null
  if (!res.ok || !data) throw new ApiError(res.status, data?.message ?? 'The chat isn’t available right now.')
  return data
}

const Icon = {
  chat: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v11H9l-5 4z" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12l16-8-6 16-2.5-6.5z" />
    </svg>
  ),
}

export default function ChatWidget() {
  const { sections } = useSiteSettings()
  if (!USE_API || sections.chat === false) return null
  return <Chat />
}

function Chat() {
  const [open, setOpen] = useState(false)
  const [auth, setAuth] = useState(readStore) // { id, token }
  const [chat, setChat] = useState(null) // { status, blocked, staffAvailable, messages }
  const [draft, setDraft] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  }, [open])

  // `seen` = how many messages the visitor has had the window open for (for the unread badge)
  const merge = useCallback((data, replace = false) => {
    setChat((cur) => {
      const messages = replace || !cur ? data.messages : [...cur.messages, ...data.messages]
      const seen = openRef.current || !cur ? messages.length : cur.seen
      return { status: data.status, blocked: data.blocked, staffAvailable: data.staffAvailable, messages, seen }
    })
  }, [])
  const unread = chat && !open ? chat.messages.slice(chat.seen).filter((m) => m.from === 'staff' || m.from === 'bot').length : 0
  const toggle = () => {
    setChat((cur) => (cur ? { ...cur, seen: cur.messages.length } : cur))
    setOpen((v) => !v)
  }

  // load a saved chat
  useEffect(() => {
    if (!auth || chat) return
    call(`/${auth.id}`, { token: auth.token })
      .then((data) => merge(data, true))
      .catch((err) => {
        if (err.status === 404) {
          writeStore(null)
          setAuth(null)
        }
      })
  }, [auth, chat, merge])

  // new replies: poll while a person might answer (often when open, slowly when closed)
  const count = chat?.messages.length ?? 0
  useEffect(() => {
    if (!auth || !chat || chat.blocked) return undefined
    const waiting = chat.status === 'staff'
    if (!open && !waiting) return undefined
    const every = open ? (waiting ? 2500 : 6000) : 15000
    const timer = setInterval(async () => {
      if (document.hidden) return
      try {
        const data = await call(`/${auth.id}?after=${count}`, { token: auth.token })
        if (data.messages.length || data.status !== chat.status) merge(data)
      } catch {
        /* try again next time */
      }
    }, every)
    return () => clearInterval(timer)
  }, [auth, chat, count, open, merge])

  // keep the newest message in view
  useEffect(() => {
    if (open && count) requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }))
  }, [count, open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => inputRef.current?.focus())
    return () => document.removeEventListener('keydown', onKey)
  }, [open, auth])

  async function run(task) {
    setBusy(true)
    setError('')
    try {
      await task()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const start = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    run(async () => {
      const data = await call('/start', { method: 'POST', body: { name: name.trim() } })
      const next = { id: data.id, token: data.token }
      writeStore(next)
      setAuth(next)
      merge(data, true)
    })
  }

  const send = (text) => {
    const value = (text ?? draft).trim()
    if (!value || busy) return
    setDraft('')
    // show it straight away; the server's copy replaces it
    setChat((cur) => ({ ...cur, messages: [...cur.messages, { from: 'visitor', text: value, pending: true }], seen: cur.messages.length + 1 }))
    run(async () => {
      try {
        const data = await call(`/${auth.id}/messages`, { method: 'POST', body: { text: value }, token: auth.token })
        setChat((cur) => ({ ...cur, messages: cur.messages.filter((m) => !m.pending) }))
        merge(data)
      } catch (err) {
        setChat((cur) => ({ ...cur, messages: cur.messages.filter((m) => !m.pending) }))
        setDraft(value)
        throw err
      }
    })
  }

  const askStaff = () =>
    run(async () => {
      const data = await call(`/${auth.id}/staff`, { method: 'POST', token: auth.token })
      merge(data)
    })

  const newChat = () => {
    if (auth && chat?.status !== 'closed') call(`/${auth.id}/close`, { method: 'POST', token: auth.token }).catch(() => {})
    writeStore(null)
    setAuth(null)
    setChat(null)
  }

  const status = !chat
    ? 'We usually reply in a few minutes'
    : chat.blocked
      ? 'Chat closed'
      : chat.status === 'staff'
        ? 'Talking to staff'
        : chat.status === 'closed'
          ? 'Chat ended'
          : 'Assistant · staff on request'
  const showSuggestions = chat && chat.messages.length <= 1 && chat.status === 'bot'

  return (
    <div className={`chatw ${open ? 'is-open' : ''}`}>
      <section className="chatw__panel" role="dialog" aria-label={`${site.name} chat`} aria-hidden={!open} inert={!open}>
        <header className="chatw__head">
          <span className="chatw__avatar" aria-hidden="true">
            {site.name[0]}
          </span>
          <div className="chatw__title">
            <p className="chatw__name">{site.name}</p>
            <p className="chatw__status">
              <span className={`chatw__dot ${chat?.status === 'staff' ? 'is-staff' : ''}`} aria-hidden="true" />
              {status}
            </p>
          </div>
          {auth && (
            <button type="button" className="chatw__text-btn" onClick={newChat} title="Start a new chat">
              New
            </button>
          )}
          <button type="button" className="chatw__icon-btn" onClick={toggle} aria-label="Close chat">
            {Icon.close}
          </button>
        </header>

        {!auth ? (
          <form className="chatw__intro" onSubmit={start}>
            <p className="chatw__hello">Hi! Ask us anything about the city, the rules or how to join.</p>
            <label className="chatw__label" htmlFor="chatw-name">
              Your name (or in-game name)
            </label>
            <input
              ref={inputRef}
              id="chatw-name"
              className="chatw__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              autoComplete="nickname"
              placeholder="e.g. Viktor"
            />
            <button type="submit" className="chatw__primary" disabled={busy || !name.trim()}>
              {busy ? 'Starting…' : 'Start chat'}
            </button>
            {error && <p className="chatw__error">{error}</p>}
            <p className="chatw__fine">Don’t share passwords or personal details. Chats are kept for 30 days.</p>
          </form>
        ) : (
          <>
            <ol ref={listRef} className="chatw__list" aria-live="polite">
              {(chat?.messages ?? []).map((m, i) => (
                <li key={i} className={`chatw__msg chatw__msg--${m.from} ${m.pending ? 'is-pending' : ''}`}>
                  {m.from === 'staff' && <span className="chatw__who">{m.name} · Staff</span>}
                  {m.from === 'bot' && <span className="chatw__who">Assistant</span>}
                  <span className="chatw__bubble">{m.text}</span>
                </li>
              ))}
              {busy && chat?.status === 'bot' && (
                <li className="chatw__msg chatw__msg--bot">
                  <span className="chatw__bubble chatw__typing" aria-label="Assistant is typing">
                    <i />
                    <i />
                    <i />
                  </span>
                </li>
              )}
            </ol>

            {showSuggestions && (
              <div className="chatw__chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="chatw__chip" onClick={() => send(s)} disabled={busy}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="chatw__error chatw__error--bar">{error}</p>}

            {chat?.blocked ? (
              <p className="chatw__ended">This chat was closed by the staff.</p>
            ) : (
              <form
                className="chatw__compose"
                onSubmit={(e) => {
                  e.preventDefault()
                  send()
                }}
              >
                {chat?.status === 'bot' && (
                  <button type="button" className="chatw__staff" onClick={askStaff} disabled={busy}>
                    Talk to staff
                  </button>
                )}
                <div className="chatw__row">
                  <textarea
                    ref={inputRef}
                    className="chatw__input chatw__input--msg"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        send()
                      }
                    }}
                    rows={1}
                    maxLength={600}
                    placeholder={chat?.status === 'staff' ? 'Message the staff…' : 'Ask a question…'}
                    aria-label="Message"
                  />
                  <button type="submit" className="chatw__send" disabled={busy || !draft.trim()} aria-label="Send">
                    {Icon.send}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </section>

      <button
        type="button"
        className="chatw__launcher"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? 'Close chat' : unread ? `Open chat, ${unread} new` : 'Open chat'}
      >
        <span className="chatw__launcher-icon">{open ? Icon.close : Icon.chat}</span>
        {!open && unread > 0 && <span className="chatw__badge">{unread}</span>}
      </button>
    </div>
  )
}
