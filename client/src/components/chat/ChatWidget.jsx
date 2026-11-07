import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { applyLink } from '../../config/site'
import { ApiError, USE_API } from '../../lib/api'
import { useRuleBook } from '../../lib/ruleBook'
import { indexRules, searchRules } from '../../lib/ruleSearch'
import { useSiteSettings } from '../../lib/siteSettings'
import './chat.css'

/**
 * The chat assistant (Vexy by default — its name and picture, which is also the chat button, are set in
 * Panel → Rules help chat → The bot):
 * a chat button on every page that answers questions about the server rules.
 * Answers are found in the rule book right here in the browser (free, instant, and always the
 * real wording). If no rule fits, "Ask staff" sends the question to the team's Discord and their
 * reply shows up in this window. Switch it off in Panel → Sections & maintenance.
 */
const STORE = 'rameirah:chat'

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
    res = await fetch(`/api/chat${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'omit',
    })
  } catch {
    throw new ApiError(0, 'Can’t reach the server. Check your connection.')
  }
  const data = (res.headers.get('content-type') ?? '').includes('application/json') ? await res.json().catch(() => null) : null
  if (!res.ok || !data) throw new ApiError(res.status, data?.message ?? 'Staff chat isn’t available right now.')
  return data
}

const Icon = {
  close: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
}

/** Waits a moment before the bot answers, so a reply reads like one ("typing…"). Off with reduced motion. */
const TYPING_MS = 650
const motionOk = () => typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

const clock = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

export default function ChatWidget() {
  const { sections, chatBot } = useSiteSettings()
  if (sections.chat === false) return null
  return <RulesChat bot={chatBot} />
}

// "hi", "thanks", "bye" … answered right here, not searched for in the rules (nor sent to the AI)
const HELLO = /^(hi+|hey+|hello+|helo|hai|yo|sup|wassup|what'?s up|hola|namaste|salam|good (morning|afternoon|evening|night))\b/i
const THANKS = /^(thanks?|thank you|thx|ty|tysm|ok(ay)?|cool|nice|great|got it)\b/i
const BYE = /^(bye+|goodbye|cya|see (you|ya)|gn)\b/i
// words that can follow a greeting without making it a question ("hi there", "thanks bro")
const FILLER = new Set('there bro bruh guys all everyone man mate dude sir team bot again friend buddy so much a lot you very'.split(' '))
function smallTalk(text, botName = '') {
  const t = text
    .toLowerCase()
    .replace(/[!.?,🙂😊👋]+/gu, ' ')
    .trim()
  const only = (re) => {
    const m = re.exec(t)
    if (!m) return false
    const rest = t.slice(m[0].length).split(/\s+/).filter(Boolean)
    return rest.every((w) => FILLER.has(w) || w === botName.toLowerCase())
  }
  if (only(HELLO)) return 'Hey! 👋 Ask me anything about the server rules — like “can I rob a store?” or “what is NLR?”'
  if (only(THANKS)) return 'Anytime! Ask if anything else about the rules is unclear.'
  if (only(BYE)) return 'See you in the city! 👋'
  return ''
}

let nextId = 1
const say = (from, extra) => ({ id: nextId++, from, ...extra })

function RulesChat({ bot }) {
  const { categories } = useRuleBook()
  const index = useMemo(() => indexRules(categories), [categories])
  const [open, setOpen] = useState(false)
  const [openedAt] = useState(() => new Date())
  const [log, setLog] = useState(() => [
    say('bot', {
      text: 'Ask me anything about the server rules — I’ll find the rule for you.',
      greet: true,
    }),
  ])
  const [draft, setDraft] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')
  const [asking, setAsking] = useState(false) // the "ask staff" form is showing
  const [name, setName] = useState('')
  const [staffUp, setStaffUp] = useState(null) // null = unknown
  const [aiUp, setAiUp] = useState(false) // the AI helper is set up on the server
  const [thinking, setThinking] = useState(false) // waiting for the AI helper
  const [auth, setAuth] = useState(readStore) // a chat with staff: { id, token }
  const [staff, setStaff] = useState(null) // { status, blocked, messages, seen }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  }, [open])

  // is "Ask staff" available? (asked once, when the chat is first opened)
  useEffect(() => {
    if (!open || staffUp !== null || !USE_API) return
    call('/status')
      .then((s) => {
        setStaffUp(Boolean(s.staffAvailable))
        setAiUp(Boolean(s.ai))
      })
      .catch(() => setStaffUp(false))
  }, [open, staffUp])

  /* ---------- staff chat (only once the visitor has asked staff) ---------- */
  const merge = useCallback((data, replace = false) => {
    setStaff((cur) => {
      const messages = replace || !cur ? data.messages : [...cur.messages, ...data.messages]
      const seen = openRef.current || !cur ? messages.length : cur.seen
      return { status: data.status, blocked: data.blocked, messages, seen }
    })
  }, [])

  useEffect(() => {
    if (!auth || staff) return
    call(`/${auth.id}`, { token: auth.token })
      .then((data) => merge(data, true))
      .catch((err) => {
        if (err.status === 404) {
          writeStore(null)
          setAuth(null)
        }
      })
  }, [auth, staff, merge])

  const staffCount = staff?.messages.length ?? 0
  useEffect(() => {
    if (!auth || !staff || staff.blocked || staff.status === 'closed') return undefined
    const timer = setInterval(
      async () => {
        if (document.hidden) return
        try {
          const data = await call(`/${auth.id}?after=${staffCount}`, {
            token: auth.token,
          })
          if (data.messages.length || data.status !== staff.status) merge(data)
        } catch {
          /* next time */
        }
      },
      open ? 2500 : 15000,
    )
    return () => clearInterval(timer)
  }, [auth, staff, staffCount, open, merge])

  const unread = staff && !open ? staff.messages.slice(staff.seen).filter((m) => m.from === 'staff').length : 0

  /* ---------- the window ---------- */
  const toggle = () => {
    setStaff((cur) => (cur ? { ...cur, seen: cur.messages.length } : cur))
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (open)
      requestAnimationFrame(() =>
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: 'smooth',
        }),
      )
  }, [open, log.length, staffCount, asking])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  /* ---------- asking the rules ---------- */
  // the bot "types" for a moment, then the typing bubble is swapped for the answer
  const reply = useCallback((visitorText, answer) => {
    if (!motionOk()) {
      setLog((cur) => [...cur, say('visitor', { text: visitorText }), answer])
      return
    }
    const typing = say('bot', { typing: true })
    setLog((cur) => [...cur, say('visitor', { text: visitorText }), typing])
    setTimeout(() => setLog((cur) => cur.map((m) => (m.id === typing.id ? answer : m))), TYPING_MS)
  }, [])

  // the plain rule search, in the browser: always works, quotes the rule book word for word
  function searchAnswer(q) {
    const found = searchRules(index, q)
    return found.length
      ? say('bot', {
          text: found.length === 1 ? 'Here’s the rule:' : 'These rules cover it:',
          rules: found.map((f) => ({ rule: f.rule, category: f.category })),
        })
      : say('bot', { text: 'I couldn’t find a rule about that. Try other words, or ask the staff.', noMatch: true })
  }

  async function ask(question) {
    const q = question.trim()
    if (!q || thinking) return
    setDraft('')
    setError('')
    setAsking(false)
    setLastQuestion(q)
    const small = smallTalk(q, bot.name)
    if (small) {
      reply(q, say('bot', { text: small }))
      return
    }
    if (!aiUp) {
      reply(q, searchAnswer(q))
      return
    }

    // the AI helper answers in plain words from the rule book; if it can't (free limit used
    // up, Groq down, too many questions), the plain search answers instead, without a fuss
    const history = log
      .filter((m) => !m.greet && !m.typing && m.text)
      .slice(-4)
      .map((m) => ({
        from: m.from === 'visitor' ? 'visitor' : 'bot',
        text: (m.rules && !m.ai ? `${m.text} ${m.rules.map((r) => r.rule.title).join(', ')}` : m.text).slice(0, 900),
      }))
    const typing = say('bot', { typing: true })
    setLog((cur) => [...cur, say('visitor', { text: q }), typing])
    setThinking(true)
    let answer
    try {
      const data = await call('/ask', { method: 'POST', body: { question: q, history } })
      const byId = new Map(index.map((e) => [e.rule.id, e]))
      const rules = data.rules.map((id) => byId.get(id)).filter(Boolean)
      answer = say('bot', {
        text: data.answer,
        rules: rules.length ? rules.map((e) => ({ rule: e.rule, category: e.category })) : undefined,
        compact: true,
        ai: true,
        noMatch: !data.found,
      })
    } catch (err) {
      if (err.status === 503 && /resting/.test(err.message)) setAiUp(false) // out for now: stop asking it this visit
      answer = searchAnswer(q)
    } finally {
      setThinking(false)
    }
    setLog((cur) => cur.map((m) => (m.id === typing.id ? answer : m)))
  }

  /* ---------- asking staff ---------- */
  async function startStaff(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await call('/start', {
        method: 'POST',
        body: { name: name.trim(), text: (draft || lastQuestion).trim() },
      })
      const next = { id: data.id, token: data.token }
      writeStore(next)
      setAuth(next)
      merge(data, true)
      setAsking(false)
      setDraft('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function sendToStaff() {
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    setBusy(true)
    setError('')
    try {
      merge(
        await call(`/${auth.id}/messages`, {
          method: 'POST',
          body: { text },
          token: auth.token,
        }),
      )
    } catch (err) {
      setDraft(text)
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function endStaffChat() {
    if (auth && staff?.status !== 'closed') call(`/${auth.id}/close`, { method: 'POST', token: auth.token }).catch(() => {})
    writeStore(null)
    setAuth(null)
    setStaff(null)
  }

  const inStaffChat = Boolean(auth && staff && !staff.blocked && staff.status !== 'closed')
  const canAskStaff = staffUp && !auth
  const submit = (e) => {
    e.preventDefault()
    if (inStaffChat) sendToStaff()
    else ask(draft)
  }

  // one thread: the bot's answers, then any chat with staff. Each message knows whether it
  // starts or ends a run from the same sender, so bubbles group like a DM thread.
  const thread = [
    ...log.map((m) => ({ ...m, key: `b${m.id}`, side: m.from === 'visitor' ? 'me' : 'them' })),
    ...(staff?.messages ?? []).map((m, i) => ({
      ...m,
      key: `s${i}`,
      side: m.from === 'visitor' ? 'me' : m.from === 'system' ? 'mid' : 'them',
    })),
    ...(staff?.blocked ? [{ key: 'blocked', from: 'system', side: 'mid', text: 'This chat was closed by the staff.' }] : []),
  ].map((m, i, all) => {
    const who = (x) => x && `${x.side}|${x.from}|${x.name ?? ''}`
    return { ...m, first: who(all[i - 1]) !== who(m), last: who(all[i + 1]) !== who(m) }
  })
  const lastMine = thread.findLastIndex((m) => m.side === 'me')
  const answeredAfter = lastMine >= 0 && thread.slice(lastMine + 1).some((m) => m.side === 'them' && !m.typing)

  return (
    <div className={`chatw ${open ? 'is-open' : ''}`}>
      <section className="chatw__panel" role="dialog" aria-label={`Chat with ${bot.name}`} aria-hidden={!open} inert={!open}>
        <header className="chatw__head">
          <BotAvatar bot={bot} size="sm" />
          <div className="chatw__title">
            <p className="chatw__name">{bot.name}</p>
            <p className="chatw__status">{inStaffChat ? 'Chatting with staff' : 'Answers from the rule book'}</p>
          </div>
          {auth ? (
            <button type="button" className="chatw__text-btn" onClick={endStaffChat} title="End the chat with staff">
              End chat
            </button>
          ) : (
            <Link to="/rules" className="chatw__text-btn" onClick={() => setOpen(false)}>
              Rules
            </Link>
          )}
          <button type="button" className="chatw__icon-btn" onClick={toggle} aria-label="Close">
            {Icon.close}
          </button>
        </header>

        <ol ref={listRef} className="chatw__list" aria-live="polite">
          <li className="chatw__time" aria-hidden="true">
            Today {clock.format(openedAt)}
          </li>

          {thread.map((m, i) => (
            <li
              key={m.key}
              className={[
                'chatw__msg',
                `chatw__msg--${m.side}`,
                `chatw__msg--${m.from}`,
                m.first ? 'is-first' : '',
                m.last ? 'is-last' : '',
                m.rules ? 'has-rules' : '',
              ].join(' ')}
            >
              {m.side === 'them' && m.first && m.from === 'staff' && <span className="chatw__who">{m.name} · Staff</span>}
              <span className="chatw__line">
                {m.side === 'them' && (
                  <span className="chatw__face">
                    {m.last && (m.from === 'staff' ? <StaffFace name={m.name} /> : <BotAvatar bot={bot} size="xs" />)}
                  </span>
                )}
                <span className="chatw__stack">
                  {m.typing ? (
                    <span className="chatw__bubble chatw__bubble--typing" aria-label={`${bot.name} is typing`}>
                      <span className="chatw__typing">
                        <i />
                        <i />
                        <i />
                      </span>
                    </span>
                  ) : (
                    <span className="chatw__bubble">{m.greet ? `Hi, I’m ${bot.name}! ${m.text}` : m.text}</span>
                  )}

                  {m.rules && (
                    <span className="chatw__rules">
                      {m.rules.map(({ rule, category }) =>
                        m.compact ? (
                          <Link key={rule.id} to={`/rules#${rule.id}`} className="chatw__rule chatw__rule--compact">
                            {rule.title} <span aria-hidden="true">›</span>
                          </Link>
                        ) : (
                          <span key={rule.id} className="chatw__rule">
                            <span className="chatw__rule-cat">{category.title}</span>
                            <span className="chatw__rule-title">{rule.title}</span>
                            <span className="chatw__rule-text">{rule.text}</span>
                            <Link to={`/rules#${rule.id}`} className="chatw__rule-link">
                              Read it in the rules
                            </Link>
                          </span>
                        ),
                      )}
                    </span>
                  )}

                  {m.noMatch && !auth && (
                    <span className="chatw__chips chatw__chips--inline">
                      {canAskStaff ? (
                        <button type="button" className="chatw__chip chatw__chip--staff" onClick={() => setAsking(true)}>
                          Ask the staff
                        </button>
                      ) : (
                        applyLink.href && (
                          <a className="chatw__chip chatw__chip--staff" href={applyLink.href} target="_blank" rel="noopener noreferrer">
                            Ask on Discord
                          </a>
                        )
                      )}
                    </span>
                  )}
                </span>
              </span>
              {i === lastMine && answeredAfter && m.from === 'visitor' && staff == null && <span className="chatw__seen">Seen</span>}
            </li>
          ))}
        </ol>

        {asking && !auth ? (
          <form className="chatw__ask" onSubmit={startStaff}>
            <p className="chatw__ask-title">Ask the staff</p>
            <label className="chatw__label" htmlFor="chatw-name">
              Your name (or in-game name)
            </label>
            <input
              id="chatw-name"
              className="chatw__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              autoComplete="nickname"
              autoFocus
            />
            <label className="chatw__label" htmlFor="chatw-q">
              Your question
            </label>
            <textarea
              id="chatw-q"
              className="chatw__input chatw__input--area"
              rows={2}
              maxLength={600}
              value={draft || lastQuestion}
              onChange={(e) => setDraft(e.target.value)}
            />
            {error && <p className="chatw__error">{error}</p>}
            <div className="chatw__ask-row">
              <button type="button" className="chatw__text-btn" onClick={() => setAsking(false)}>
                Cancel
              </button>
              <button type="submit" className="chatw__primary" disabled={busy || !name.trim() || !(draft || lastQuestion).trim()}>
                {busy ? 'Sending…' : 'Send to staff'}
              </button>
            </div>
            <p className="chatw__fine">Staff reply here, usually within a few minutes. Don’t share passwords or personal details.</p>
          </form>
        ) : (
          <form className="chatw__compose" onSubmit={submit}>
            {error && <p className="chatw__error">{error}</p>}
            <div className="chatw__pill">
              <textarea
                ref={inputRef}
                className="chatw__input chatw__input--msg"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) submit(e)
                }}
                rows={1}
                maxLength={600}
                placeholder={inStaffChat ? 'Message the staff…' : 'Message…'}
                aria-label={inStaffChat ? 'Message the staff' : `Message ${bot.name} about a rule`}
              />
              <button type="submit" className="chatw__send" disabled={busy || thinking || !draft.trim()} aria-label="Send">
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                  <path d="M4 10h11M10.5 5.5 15 10l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
                </svg>
              </button>
            </div>
          </form>
        )}
      </section>

      <button
        type="button"
        className="chatw__launcher"
        onClick={toggle}
        aria-expanded={open}
        aria-label={
          open
            ? `Close the chat with ${bot.name}`
            : unread
              ? `Chat with ${bot.name}, ${unread} new from staff`
              : `Chat with ${bot.name} — rules help`
        }
      >
        {open ? <span className="chatw__launcher-close">{Icon.close}</span> : <LauncherFace bot={bot} />}
        {!open && unread > 0 && <span className="chatw__badge">{unread}</span>}
      </button>
    </div>
  )
}

/** The chat button: the bot's picture from the panel, or its initial on gold. */
function LauncherFace({ bot }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="chatw__avatar" aria-hidden="true">
      {bot.avatar && !failed ? (
        <img src={bot.avatar} alt="" className="chatw__avatar-img" onError={() => setFailed(true)} />
      ) : (
        (bot.name.trim()[0] ?? 'V').toUpperCase()
      )}
    </span>
  )
}

/** A staff member's initial, for their replies. */
function StaffFace({ name = '' }) {
  return (
    <span className="chatw__avatar chatw__avatar--xs chatw__avatar--staff" aria-hidden="true">
      {(name.trim()[0] ?? 'S').toUpperCase()}
    </span>
  )
}

/** The bot's picture from the panel (or the first letter of its name), in a gold ring. */
function BotAvatar({ bot, size = 'sm' }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className={`chatw__ring chatw__ring--${size}`} aria-hidden="true">
      <span className={`chatw__avatar chatw__avatar--${size}`}>
        {bot.avatar && !failed ? (
          <img src={bot.avatar} alt="" className="chatw__avatar-img" onError={() => setFailed(true)} />
        ) : (
          (bot.name.trim()[0] ?? 'V').toUpperCase()
        )}
      </span>
    </span>
  )
}
