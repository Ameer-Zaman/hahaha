import { useState } from 'react'
import { Link } from 'react-router-dom'

import { formatWhen } from '../format'
import { useAction, useResource } from '../hooks'
import { MediaField } from '../mediaKit'
import { adminApi } from '../panelApi'
import { Empty, ErrorNote, Loading, PageHead, Panel, TextField } from '../ui'

/**
 * Rules help: the chat button answers rule questions from the rule book in the visitor's browser.
 * Questions it can't answer can be sent to staff on Discord; this shows whether that's connected
 * and the latest staff chats (read-only — staff reply in Discord).
 */
export default function Chat() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/chat'))
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <ChatScreen data={data} reload={reload} />
}

function Status({ ok, warn, children }) {
  return (
    <span className={`p-status ${ok ? 'p-status--ok' : warn ? 'p-status--warn' : ''}`}>
      <span aria-hidden="true" />
      {children}
    </span>
  )
}

function ChatScreen({ data, reload }) {
  const [open, setOpen] = useState(null)
  const d = data.discord

  return (
    <>
      <PageHead
        title="Rules help chat"
        sub="The chat button on every page answers questions about the rules from your rule book — in plain words with the free AI services below, or with the plain rule search when none is set up or all are resting. If no rule fits, visitors can ask staff: the question opens a thread in your Discord, and replies there go back to them."
      >
        <button type="button" className="pbtn pbtn--ghost" onClick={reload}>
          Refresh
        </button>
      </PageHead>

      <BotSettings />

      <div>
        <Panel title="Connections">
          <ul className="p-list-plain">
            <li>
              Chat button on the website: {data.on ? <Status ok>On</Status> : <Status warn>Off</Status>}{' '}
              <Link to="/panel/site" className="p-link">
                change
              </Link>
            </li>
            <li>
              Discord bridge:{' '}
              {!d.configured ? (
                <Status warn>Not set up (DISCORD_BOT_TOKEN, DISCORD_CHAT_CHANNEL_ID)</Status>
              ) : d.state === 'ready' ? (
                <Status ok>Connected</Status>
              ) : (
                <Status warn>{d.state}</Status>
              )}
            </li>
            <li>
              Admin sign-in alerts to Discord:{' '}
              {!d.securityAlerts ? (
                <Status warn>Off (LOGIN_ALERTS=off)</Status>
              ) : d.configured ? (
                <Status ok>On · {d.securityChannelSeparate ? 'separate security channel' : 'this chat channel'}</Status>
              ) : (
                <Status warn>Waiting for the Discord bot</Status>
              )}
            </li>
          </ul>
          <p className="p-text">
            The bot token is set on the server (Render → Environment), never here. Without it, visitors who can’t find a rule get a link to
            your Discord instead. Answers come from the published rules — keep them up to date in Rules.
          </p>
        </Panel>
      </div>

      {data.ai && <AiPanel services={data.ai} />}

      <Panel title={`Questions sent to staff (${data.chats.length})`}>
        {data.chats.length === 0 ? (
          <Empty>No chats yet.</Empty>
        ) : (
          <ul className="p-chats">
            {data.chats.map((c) => (
              <li key={c.id} className="p-chats__item">
                <button
                  type="button"
                  className="p-chats__head"
                  onClick={() => setOpen(open === c.id ? null : c.id)}
                  aria-expanded={open === c.id}
                >
                  <strong>{c.nickname}</strong>
                  <span className="p-tag">{c.blocked ? 'Blocked' : c.status === 'closed' ? 'Ended' : 'Open'}</span>
                  <span className="p-chats__when">{formatWhen(c.lastAt)}</span>
                  <span className="p-chats__count">{c.messages.length} messages</span>
                </button>
                {open === c.id && (
                  <ol className="p-chats__log">
                    {c.messages.map((m, i) => (
                      <li key={i} className={`p-chats__msg is-${m.from}`}>
                        <b>{m.from === 'visitor' ? c.nickname : m.from === 'staff' ? `${m.name} (staff)` : 'Note'}</b> {m.text}
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}

/** The assistant's name and picture, as visitors see them in the chat window. */
function BotSettings() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/settings'))
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <BotForm key={`${data.chatBot.name}|${data.chatBot.avatar}`} initial={data.chatBot} />
}

function BotForm({ initial }) {
  const [form, setForm] = useState(initial)
  const [run, busy] = useAction()
  const changed = form.name.trim() !== initial.name || (form.avatar ?? null) !== (initial.avatar ?? null)

  async function save(e) {
    e.preventDefault()
    const res = await run(
      () =>
        adminApi.put('/settings/chat-bot', {
          name: form.name.trim(),
          avatar: form.avatar ?? null,
        }),
      'Saved — the chat shows it within a minute',
    )
    if (res) setForm(res.chatBot)
  }

  return (
    <Panel title="The bot">
      <form className="p-bot" onSubmit={save}>
        <div className="p-form-grid">
          <TextField
            label="Name"
            hint="What the chat assistant is called in the chat window."
            value={form.name}
            onChange={(name) => setForm((f) => ({ ...f, name }))}
            maxLength={30}
            required
          />
        </div>
        <MediaField
          label="Picture"
          value={form.avatar}
          onChange={(avatar) => setForm((f) => ({ ...f, avatar }))}
          fallback="Shown on the chat button on every page and beside the bot's messages. A square picture works best; it shows in a circle. Without one, the button shows the first letter of the name."
        />
        <div className="p-row">
          <button type="submit" className="pbtn pbtn--gold" disabled={busy || !changed || !form.name.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Panel>
  )
}

const RESTING = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

/** The free AI services, in the order they're tried: set up or not, resting, and today's use. */
function AiPanel({ services }) {
  const ready = services.filter((s) => s.configured)
  return (
    <Panel title="AI answers">
      <p className="p-text">
        {ready.length
          ? `Tried in this order. When one runs out of free uses the next one answers; when all are resting the chat uses the plain rule search.`
          : `No AI service is set up, so the chat uses the plain rule search. Add a free key on Render (Environment) to turn AI answers on.`}
      </p>
      <ol className="p-ai-list">
        {services.map((s, i) => (
          <li key={s.id} className={`p-ai ${s.configured ? '' : 'is-off'}`}>
            <span className="p-ai__n">{i + 1}</span>
            <span className="p-ai__main">
              <strong>{s.name}</strong>
              <span className="p-ai__models">{s.models.join(' → ')}</span>
              {s.resting.map((r) => (
                <span key={r.model} className="p-ai__rest">
                  {r.model}: {r.why} · back at {RESTING.format(new Date(r.until))}
                </span>
              ))}
            </span>
            <span className="p-ai__state">
              {!s.configured ? (
                <Status>Not set up · {s.keyName}</Status>
              ) : s.resting.length === s.models.length ? (
                <Status warn>Resting</Status>
              ) : (
                <Status ok>Ready</Status>
              )}
              {s.configured && (
                <span className="p-ai__today">
                  Today: {s.today.answered} answered
                  {s.today.limited ? ` · ${s.today.limited} limit hits` : ''}
                  {s.today.failed ? ` · ${s.today.failed} errors` : ''}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
      <p className="p-text p-ai-note">
        Keys are added on the server (Render → Environment), never here. Counts restart when the server restarts.
      </p>
    </Panel>
  )
}
