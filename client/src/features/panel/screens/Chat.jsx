import { useState } from 'react'
import { Link } from 'react-router-dom'

import { formatWhen } from '../format'
import { useResource } from '../hooks'
import { adminApi } from '../panelApi'
import { Empty, ErrorNote, Loading, PageHead, Panel } from '../ui'

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
        sub="The chat button on every page answers questions about the rules straight from your rule book (free, no AI). If no rule fits, visitors can ask staff: the question opens a thread in your Discord, and replies there go back to them."
      >
        <button type="button" className="pbtn pbtn--ghost" onClick={reload}>
          Refresh
        </button>
      </PageHead>

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
          </ul>
          <p className="p-text">
            The bot token is set on the server (Render → Environment), never here. Without it, visitors who can’t find a rule get a link to
            your Discord instead. Answers come from the published rules — keep them up to date in Rules.
          </p>
        </Panel>

      </div>

      <Panel title={`Questions sent to staff (${data.chats.length})`}>
        {data.chats.length === 0 ? (
          <Empty>No chats yet.</Empty>
        ) : (
          <ul className="p-chats">
            {data.chats.map((c) => (
              <li key={c.id} className="p-chats__item">
                <button type="button" className="p-chats__head" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>
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
