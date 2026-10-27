import { useState } from 'react'

import { formatWhen } from '../format'
import { useAction, useResource } from '../hooks'
import { adminApi } from '../panelApi'
import { ConfirmButton, ErrorNote, Loading, PageHead, Panel, Switch, TextField } from '../ui'

/** The website sections that can be switched off. Home is always on. */
const SECTIONS = [
  { key: 'story', label: 'Story', path: '/story' },
  { key: 'staff', label: 'Staffs', path: '/staff' },
  { key: 'gangs', label: 'Gangs', path: '/gangs', note: 'In the Factions menu' },
  { key: 'clubs', label: 'Clubs', path: '/clubs', note: 'In the Factions menu' },
  { key: 'dhadhas', label: 'Dhadhas', path: '/dhadhas', note: 'In the Factions menu' },
  { key: 'leaderboard', label: 'Leaderboard', path: '/leaderboard' },
  { key: 'rules', label: 'Rules', path: '/rules' },
  { key: 'chat', label: 'Rules help chat', path: '', note: 'The chat button on every page' },
]

/**
 * Sections & maintenance: switch menu sections on or off, and put the whole website into
 * maintenance mode. The panel itself keeps working either way.
 */
export default function SiteSettings() {
  const { data, error, loading, reload, setData } = useResource(() => adminApi.get('/settings'))
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  // a fresh form whenever the saved values change
  const key = JSON.stringify([data.sections, data.maintenance])
  return <SettingsForm key={key} data={data} setData={setData} />
}

function SettingsForm({ data, setData }) {
  const [run, busy] = useAction()
  const [sections, setSections] = useState(data.sections)
  const [message, setMessage] = useState(data.maintenance.message)

  const maintenance = data.maintenance
  const sectionsDirty = SECTIONS.some((s) => sections[s.key] !== data.sections[s.key])
  const messageDirty = message.trim() !== maintenance.message

  async function save(body, success) {
    const result = await run(() => adminApi.put('/settings/site', body), success)
    if (result) setData((d) => ({ ...d, ...result }))
  }

  return (
    <>
      <PageHead
        title="Sections & maintenance"
        sub="Choose what visitors can open, or close the whole website for maintenance. Changes reach visitors within about a minute."
      />

      <Panel
        title="Maintenance mode"
        className={maintenance.on ? 'p-maint is-on' : 'p-maint'}
        actions={
          <span className={`p-status ${maintenance.on ? 'p-status--warn' : 'p-status--ok'}`}>
            <span aria-hidden="true" />
            {maintenance.on ? 'Website closed' : 'Website live'}
          </span>
        }
      >
        <p className="p-text">
          {maintenance.on
            ? `Visitors see the “We’ll be right back” screen${maintenance.changedAt ? ` (since ${formatWhen(maintenance.changedAt)})` : ''}. You can still open the website while signed in here, to check it before reopening.`
            : 'When it’s on, every page of the website shows a “We’ll be right back” screen with your message. The panel keeps working, and signed-in accounts can still see the site.'}
        </p>
        <TextField
          label="Message for visitors"
          hint="Optional, up to 300 characters. For example: “Back at 8 PM with the new update.”"
          value={message}
          onChange={setMessage}
          multiline
          rows={3}
          maxLength={300}
          placeholder="The website is getting some work done. Please check back soon."
        />
        <div className="p-row">
          {maintenance.on ? (
            <>
              <button type="button" className="pbtn pbtn--gold" disabled={busy} onClick={() => save({ maintenance: { on: false, message: message.trim() } }, 'Website reopened')}>
                Turn off and reopen the website
              </button>
              <button type="button" className="pbtn pbtn--ghost" disabled={busy || !messageDirty} onClick={() => save({ maintenance: { on: true, message: message.trim() } }, 'Message updated')}>
                Save message
              </button>
            </>
          ) : (
            <>
              <ConfirmButton
                className="pbtn pbtn--danger"
                confirmLabel="Click again to close the website"
                disabled={busy}
                onConfirm={() => save({ maintenance: { on: true, message: message.trim() } }, 'Maintenance mode is on')}
              >
                Turn on maintenance mode
              </ConfirmButton>
              {messageDirty && (
                <button type="button" className="pbtn pbtn--ghost" disabled={busy} onClick={() => save({ maintenance: { on: false, message: message.trim() } }, 'Message saved')}>
                  Save message for later
                </button>
              )}
            </>
          )}
        </div>
      </Panel>

      <Panel title="Sections">
        <p className="p-text">
          A section that’s off disappears from the menu, the footer and the homepage, and its page shows “Closed for now”.
          Home is always on.
        </p>
        <ul className="p-sections" role="list">
          <li className="p-sections__row is-locked">
            <span className="p-sections__name">
              Home <code>/</code>
            </span>
            <span className="p-sections__note">Always on</span>
            <Switch checked disabled onChange={() => {}} label="On" />
          </li>
          {SECTIONS.map((s) => {
            const on = sections[s.key] !== false
            return (
              <li key={s.key} className={`p-sections__row ${on ? '' : 'is-off'}`}>
                <span className="p-sections__name">
                  {s.label} {s.path && <code>{s.path}</code>}
                </span>
                <span className="p-sections__note">{s.note ?? ''}</span>
                <Switch checked={on} onChange={(v) => setSections((cur) => ({ ...cur, [s.key]: v }))} label={on ? 'On' : 'Off'} />
              </li>
            )
          })}
        </ul>
        <div className="p-row">
          <button type="button" className="pbtn pbtn--gold" disabled={busy || !sectionsDirty} onClick={() => save({ sections }, 'Sections saved')}>
            Save sections
          </button>
          {sectionsDirty && (
            <button type="button" className="pbtn pbtn--ghost" onClick={() => setSections(data.sections)}>
              Undo changes
            </button>
          )}
        </div>
      </Panel>
    </>
  )
}
