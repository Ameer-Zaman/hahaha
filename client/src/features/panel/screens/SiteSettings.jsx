import { useEffect, useState } from 'react'
import { useAuth } from '../authContext'

import { formatWhen, mediaUrl } from '../format'
import { MediaField } from '../mediaKit'
import { site } from '../../../config/site'
import { useAction, useResource } from '../hooks'
import { adminApi } from '../panelApi'
import { ConfirmButton, ErrorNote, Loading, PageHead, Panel, SelectField, Switch, TextField } from '../ui'
import SocialIcon from '../../../components/ui/SocialIcon'
import { SOCIAL_PLATFORMS } from '../../../components/ui/socialPlatforms'
import { move } from '../format'
import { RowTools } from './Gangs'

/** The website sections that can be switched off. Home is always on. */
const SECTIONS = [
  { key: 'story', label: 'Story', path: '/story' },
  { key: 'staff', label: 'Staffs', path: '/staff' },
  { key: 'creators', label: 'Creators', path: '/creators' },
  { key: 'gangs', label: 'Gangs', path: '/gangs', note: 'In the Factions menu' },
  { key: 'clubs', label: 'Clubs', path: '/clubs', note: 'In the Factions menu' },
  { key: 'dhadhas', label: 'Dhadhas', path: '/dhadhas', note: 'In the Factions menu' },
  { key: 'events', label: 'Events', path: '/events' },
  { key: 'updates', label: 'City updates', path: '/updates', note: 'In the Community menu' },
  { key: 'leaderboard', label: 'Leaderboard', path: '/leaderboard' },
  { key: 'gallery', label: 'Gallery', path: '/gallery' },
  { key: 'rules', label: 'Rules', path: '/rules' },
  { key: 'store', label: 'Store', path: '/store' },
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
  const key = JSON.stringify([data.sections, data.maintenance, data.security])
  return <SettingsForm key={key} data={data} setData={setData} />
}

function SettingsForm({ data, setData }) {
  const { isSuper } = useAuth()
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

  async function saveSecurity(requireTwoFactor) {
    const result = await run(
      () => adminApi.put('/settings/security', { requireTwoFactor }),
      requireTwoFactor
        ? 'Two-step sign-in is now required — anyone without it is asked to set it up'
        : 'Two-step sign-in is optional again',
    )
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
              <button
                type="button"
                className="pbtn pbtn--gold"
                disabled={busy}
                onClick={() => save({ maintenance: { on: false, message: message.trim() } }, 'Website reopened')}
              >
                Turn off and reopen the website
              </button>
              <button
                type="button"
                className="pbtn pbtn--ghost"
                disabled={busy || !messageDirty}
                onClick={() => save({ maintenance: { on: true, message: message.trim() } }, 'Message updated')}
              >
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
                <button
                  type="button"
                  className="pbtn pbtn--ghost"
                  disabled={busy}
                  onClick={() => save({ maintenance: { on: false, message: message.trim() } }, 'Message saved')}
                >
                  Save message for later
                </button>
              )}
            </>
          )}
        </div>
      </Panel>

      <SiteLogo initial={data.brand?.logo ?? null} onSaved={(logo) => setData((d) => ({ ...d, brand: { logo } }))} />

      <Panel title="Sections">
        <p className="p-text">
          A section that’s off disappears from the menu, the footer and the homepage, and its page shows “Closed for now”. Home is always
          on.
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
          <button
            type="button"
            className="pbtn pbtn--gold"
            disabled={busy || !sectionsDirty}
            onClick={() => save({ sections }, 'Sections saved')}
          >
            Save sections
          </button>
          {sectionsDirty && (
            <button type="button" className="pbtn pbtn--ghost" onClick={() => setSections(data.sections)}>
              Undo changes
            </button>
          )}
        </div>
      </Panel>

      <CityServer initial={data.gameServer?.address ?? ''} />

      <CommunityLinks initial={data.socials} />

      {isSuper && (
        <Panel title="Sign-in security" sub="Applies to every panel account. It does not change anything for visitors to the website.">
          <div className="p-setting">
            <div className="p-setting__text">
              <p className="p-setting__name">Require two-step sign-in</p>
              <p className="p-setting__note">
                Everyone needs a code from their phone as well as their password. Anyone who hasn't set it up is asked to on their next
                visit, and can't change anything until they do.
              </p>
            </div>
            <Switch
              checked={Boolean(data.security?.requireTwoFactor)}
              onChange={saveSecurity}
              label={data.security?.requireTwoFactor ? 'Required' : 'Optional'}
            />
          </div>
        </Panel>
      )}
    </>
  )
}

/* ------------------------------------------------------------- city server */

/** Why a check failed, in words staff can act on. */
const CITY_REASONS = {
  'not-listed':
    'The FiveM server list doesn’t have this join code right now — the city is closed, or the code is wrong. Check it in the FiveM server list or txAdmin.',
  timeout: 'The server didn’t answer in time. If the city is open, its port may be closed to the internet, or the address is wrong.',
  refused: 'Nothing answered at that address and port. Check the IP and the port (usually 30120).',
  dns: 'That host name doesn’t exist. Check the spelling, or use the IP.',
  blocked:
    'The server answered, but it keeps its player list private (a setting like sv_requestParanoia). Use the cfx.re join link instead, or ask your developer to allow /dynamic.json.',
  'not-fivem': 'Something answered at that address, but it isn’t a FiveM server. Check the IP and port.',
  'http-403': 'The FiveM server list refused the request from the website’s server. Try the IP and port instead.',
  'http-429': 'The FiveM server list says too many requests — it will try again in a minute.',
}

/** What the last reading says, in words, for the panel. */
function cityLine(status) {
  if (!status || status.state === 'off') return null
  if (status.state === 'online')
    return { tone: 'ok', text: `Online — ${status.players}${status.max ? ` of ${status.max}` : ''} players in the city right now.` }
  if (status.state === 'error')
    return { tone: 'bad', text: 'That address points inside a private network, so the website can’t read it. Use the public address.' }
  const why =
    CITY_REASONS[status.reason] ??
    (status.reason?.startsWith('http-') ? `The server answered with an error (${status.reason.slice(5)}).` : 'It couldn’t be reached.')
  return { tone: 'bad', text: `Shows as offline. ${why}${status.detail ? ` [${status.detail}]` : ''}` }
}

/**
 * The FiveM server, for the "players in the city" indicator in the header and on the home
 * page. Empty = the indicator is hidden. Only the number of players is ever shown.
 */
function CityServer({ initial }) {
  const [address, setAddress] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [status, setStatus] = useState(null)
  const [run, busy] = useAction()
  const changed = address.trim() !== saved

  async function save(next) {
    const res = await run(
      () => adminApi.put('/settings/game-server', { address: next }),
      next ? 'Saved — the indicator updates within a minute' : 'Removed — the indicator is hidden',
    )
    if (res) {
      setAddress(res.gameServer.address)
      setSaved(res.gameServer.address)
      setStatus(res.status)
    }
  }

  async function test() {
    const res = await run(() => adminApi.get('/settings/game-server/status'))
    if (res) setStatus(res.status)
  }

  // show where things stand as soon as the card opens
  useEffect(() => {
    if (!initial) return undefined
    let live = true
    adminApi
      .get('/settings/game-server/status')
      .then((res) => live && setStatus(res.status))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [initial])

  const line = cityLine(status)
  return (
    <Panel
      title="City server"
      sub="Shows how many players are in the city in the top bar of every page and on the home page. Leave it empty to hide it. Only the number is shown — never player names."
    >
      <TextField
        label="Server address"
        value={address}
        onChange={setAddress}
        maxLength={120}
        placeholder="cfx.re/join/abc123  or  203.0.113.7:30120"
        hint="The cfx.re join link is the most reliable. An IP or host with its port works too (30120 if you leave it out)."
      />
      {line && (
        <p className={`p-note ${line.tone === 'ok' ? 'p-note--ok' : 'p-note--warn'}`} role="status">
          {line.text}
        </p>
      )}
      <div className="p-row">
        <button type="button" className="pbtn pbtn--gold" onClick={() => save(address.trim())} disabled={busy || !changed}>
          {busy ? 'Saving…' : 'Save address'}
        </button>
        {saved && !changed && (
          <button type="button" className="pbtn pbtn--ghost" onClick={test} disabled={busy}>
            Check now
          </button>
        )}
        {saved && (
          <ConfirmButton className="pbtn pbtn--ghost" onConfirm={() => save('')} disabled={busy}>
            Remove
          </ConfirmButton>
        )}
      </div>
    </Panel>
  )
}

/* --------------------------------------------------------- community links */

const PLATFORM_OPTIONS = SOCIAL_PLATFORMS.map((p) => ({ value: p.id, label: p.label }))
const EXAMPLE = {
  discord: 'https://discord.gg/your-invite',
  youtube: 'https://www.youtube.com/@yourchannel',
  twitch: 'https://www.twitch.tv/yourchannel',
  kick: 'https://kick.com/yourchannel',
  tiktok: 'https://www.tiktok.com/@youraccount',
  instagram: 'https://www.instagram.com/youraccount',
  x: 'https://x.com/youraccount',
  facebook: 'https://www.facebook.com/yourpage',
}

/**
 * The community's links: in the header (the round button that opens them on a ring), the
 * footer and the phone menu, in this order. Never saved = the website keeps the links from
 * its config file.
 */
function CommunityLinks({ initial }) {
  const [links, setLinks] = useState(() => initial ?? [])
  const [saved, setSaved] = useState(() => JSON.stringify(initial ?? []))
  const [run, busy] = useAction()
  const changed = JSON.stringify(links) !== saved
  const edit = (i, field, value) => setLinks((list) => list.map((l, j) => (j === i ? { ...l, [field]: value } : l)))
  const unused = SOCIAL_PLATFORMS.find((p) => !links.some((l) => l.platform === p.id))?.id ?? 'discord'

  async function save() {
    const body = { links: links.map((l) => ({ platform: l.platform, url: l.url.trim() })).filter((l) => l.url) }
    const res = await run(() => adminApi.put('/settings/socials', body), 'Saved — the website shows them within a minute')
    if (res) {
      setLinks(res.socials)
      setSaved(JSON.stringify(res.socials))
    }
  }

  return (
    <Panel
      title="Community links"
      sub="Your Discord, YouTube and other pages. They appear in the header (the round button that opens them around your logo), the footer and the phone menu, in this order."
      actions={
        links.length < 12 && (
          <button
            type="button"
            className="pbtn pbtn--ghost pbtn--sm"
            onClick={() => setLinks((l) => [...l, { platform: unused, url: '' }])}
          >
            Add a link
          </button>
        )
      }
    >
      {initial == null && links.length === 0 && (
        <p className="p-note">Not set here yet, so the website shows the Discord link from its settings file. Add links to take over.</p>
      )}
      {links.length > 0 && (
        <ol className="p-rows" role="list">
          {links.map((l, i) => (
            <li key={i} className="p-rows__item p-rows__item--social">
              <span className="p-social-logo" aria-hidden="true">
                <SocialIcon id={l.platform} size={18} />
              </span>
              <SelectField
                label={`Link ${i + 1} platform`}
                value={l.platform}
                onChange={(v) => edit(i, 'platform', v)}
                options={PLATFORM_OPTIONS}
              />
              <TextField
                label={`Link ${i + 1} address`}
                type="url"
                value={l.url}
                onChange={(v) => edit(i, 'url', v)}
                maxLength={300}
                placeholder={EXAMPLE[l.platform]}
              />
              <RowTools
                index={i}
                count={links.length}
                label={`link ${i + 1}`}
                onMove={(d) => setLinks((list) => move(list, i, d))}
                onRemove={() => setLinks((list) => list.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ol>
      )}
      <p className="p-field__hint">Each link must be an https address on that platform's own site.</p>
      <div className="p-row">
        <button type="button" className="pbtn pbtn--gold" onClick={save} disabled={busy || !changed}>
          {busy ? 'Saving…' : 'Save links'}
        </button>
      </div>
    </Panel>
  )
}

/**
 * The community's logo: shown in the website's header, footer and maintenance screen, and as
 * the browser-tab icon. Without one the website shows its placeholder diamond.
 */
function SiteLogo({ initial, onSaved }) {
  const [logo, setLogo] = useState(initial)
  const [run, busy] = useAction()
  const dirty = logo !== initial

  async function save() {
    const res = await run(
      () => adminApi.put('/settings/brand', { logo }),
      logo ? 'Logo saved — the website shows it within a minute' : 'Logo removed — the placeholder is back',
    )
    if (res) onSaved(res.brand.logo)
  }

  return (
    <Panel title="Site logo" sub="Shown in the website’s header, footer and maintenance screen, and as the icon on the browser tab.">
      <div className="p-logo">
        <MediaField
          label="Logo"
          value={logo}
          onChange={setLogo}
          fallback="Empty: the website shows its placeholder diamond."
          hint="A PNG with a transparent background works best (WebP, JPG or GIF also work). Square or wide; it shows small, so keep it simple."
        />
        <div className="p-logo__preview" aria-label="Preview of the website header">
          <span className="p-field__label">Preview</span>
          <div className="p-logo__bar">
            {logo ? (
              <img src={mediaUrl(logo)} alt="" className="p-logo__img" />
            ) : (
              <svg className="p-logo__img" viewBox="0 0 32 32" aria-hidden="true">
                <rect x="6" y="6" width="20" height="20" transform="rotate(45 16 16)" fill="none" stroke="currentColor" strokeWidth="2" />
                <rect x="12" y="12" width="8" height="8" transform="rotate(45 16 16)" fill="currentColor" />
              </svg>
            )}
            <span className="p-logo__name">{site.name}</span>
          </div>
          <div className="p-logo__tab">
            {logo ? <img src={mediaUrl(logo)} alt="" /> : <span className="p-logo__tab-dot" />}
            <span>{site.name}</span>
          </div>
        </div>
      </div>
      <div className="p-row">
        <button type="button" className="pbtn pbtn--gold" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save logo'}
        </button>
        {dirty && (
          <button type="button" className="pbtn pbtn--ghost" onClick={() => setLogo(initial)} disabled={busy}>
            Undo
          </button>
        )}
      </div>
    </Panel>
  )
}
