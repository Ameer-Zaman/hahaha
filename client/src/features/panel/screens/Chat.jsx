import { useState } from 'react'
import { Link } from 'react-router-dom'

import { formatWhen } from '../format'
import { useAction, useResource } from '../hooks'
import { adminApi } from '../panelApi'
import { Empty, ErrorNote, Loading, PageHead, Panel, TextField } from '../ui'

/**
 * Website chat: is the assistant (AI) and the Discord bridge connected, the team's notes the
 * assistant answers from, and the latest chats (read-only — staff reply in Discord).
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
  const [knowledge, setKnowledge] = useState(data.knowledge)
  const [open, setOpen] = useState(null)
  const [run, busy] = useAction()
  const dirty = knowledge !== data.knowledge
  const d = data.discord

  return (
    <>
      <PageHead
        title="Website chat"
        sub="The chat button on every page. The assistant answers first; “Talk to staff” opens a thread in your Discord, and replies there go back to the visitor."
      >
        <button type="button" className="pbtn pbtn--ghost" onClick={reload}>
          Refresh
        </button>
      </PageHead>

      <div className="p-grid-2">
        <Panel title="Connections">
          <ul className="p-list-plain">
            <li>
              Chat button on the website: {data.on ? <Status ok>On</Status> : <Status warn>Off</Status>}{' '}
              <Link to="/panel/site" className="p-link">
                change
              </Link>
            </li>
            <li>
              AI assistant:{' '}
              {data.ai.enabled ? (
                <Status ok>
                  Connected · {data.ai.usedToday} / {data.ai.dailyLimit} replies today
                </Status>
              ) : (
                <Status warn>Not set up (ANTHROPIC_API_KEY)</Status>
              )}
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
          </ul>
          <p className="p-text">
            Keys are set on the server (Render → Environment), never here. Without the AI, visitors go straight to staff; without Discord, the
            assistant points them to your Discord invite.
          </p>
        </Panel>

        <Panel title="What the assistant knows">
          <p className="p-text">
            It already reads your published rules and the gang and club names. Add anything else visitors ask about: how applications work,
            whitelisting, launch news, links. It only answers from this, and hands the chat to staff when it doesn’t know.
          </p>
          <TextField
            label="Notes for the assistant"
            value={knowledge}
            onChange={setKnowledge}
            multiline
            rows={9}
            maxLength={8000}
            placeholder={'Applications: join the Discord, open #apply and fill in the form. Reviews take 1–3 days.\nThe server is not open yet; the launch date will be announced on Discord.'}
          />
          <div className="p-row">
            <button
              type="button"
              className="pbtn pbtn--gold"
              disabled={busy || !dirty}
              onClick={() => run(() => adminApi.put('/chat/knowledge', { knowledge }), 'Notes saved').then((r) => r && reload())}
            >
              Save notes
            </button>
          </div>
        </Panel>
      </div>

      <Panel title={`Recent chats (${data.chats.length})`}>
        {data.chats.length === 0 ? (
          <Empty>No chats yet.</Empty>
        ) : (
          <ul className="p-chats">
            {data.chats.map((c) => (
              <li key={c.id} className="p-chats__item">
                <button type="button" className="p-chats__head" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>
                  <strong>{c.nickname}</strong>
                  <span className="p-tag">{c.blocked ? 'Blocked' : c.status === 'staff' ? 'With staff' : c.status === 'closed' ? 'Ended' : 'Assistant'}</span>
                  <span className="p-chats__when">{formatWhen(c.lastAt)}</span>
                  <span className="p-chats__count">{c.messages.length} messages</span>
                </button>
                {open === c.id && (
                  <ol className="p-chats__log">
                    {c.messages.map((m, i) => (
                      <li key={i} className={`p-chats__msg is-${m.from}`}>
                        <b>{m.from === 'visitor' ? c.nickname : m.from === 'bot' ? 'Assistant' : m.from === 'staff' ? `${m.name} (staff)` : 'Note'}</b> {m.text}
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
