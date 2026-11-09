import { useState } from 'react'

import { BrandIcon } from '../../../components/ui/BrandIcons'
import { SOCIAL_PLATFORMS } from '../../../components/ui/socialPlatforms'

import { useNow } from '../../events/eventsModel'
import { formatWhen } from '../format'
import { useAction, useResource } from '../hooks'
import { MediaField, Thumb } from '../mediaKit'
import { adminApi } from '../panelApi'
import { ConfirmButton, Empty, ErrorNote, Loading, PageHead, Panel, SelectField, Switch, TextField } from '../ui'

// streaming platforms first: those are the ones checked for "live"
const ORDER = ['twitch', 'kick', 'youtube', 'tiktok', 'instagram', 'x', 'facebook', 'discord']
const PLATFORMS = ORDER.map((id) => SOCIAL_PLATFORMS.find((p) => p.id === id)).filter(Boolean)
const CHECKED = { twitch: 'Twitch', kick: 'Kick', youtube: 'YouTube' }
const KEYS = {
  twitch: 'TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET',
  kick: 'KICK_CLIENT_ID + KICK_CLIENT_SECRET',
  youtube: 'YOUTUBE_API_KEY',
}
const PLACEHOLDERS = {
  twitch: 'https://twitch.tv/…',
  kick: 'https://kick.com/…',
  youtube: 'https://youtube.com/@…',
  tiktok: 'https://tiktok.com/@…',
  instagram: 'https://instagram.com/…',
  x: 'https://x.com/…',
  facebook: 'https://facebook.com/…',
  discord: 'https://discord.com/users/…',
}
const DURATIONS = [
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '360', label: '6 hours' },
  { value: '720', label: '12 hours' },
]
const LIVE_PLATFORMS = [
  ...PLATFORMS.filter((p) => p.id !== 'discord').map((p) => ({ value: p.id, label: p.label })),
  { value: 'other', label: 'Other' },
]

const blank = () => ({ name: '', tagline: '', photo: null, links: {}, order: 0, visible: true })
const compact = (n) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

/**
 * Panel → Creators: the cards on the Creators page. Twitch, Kick and YouTube links are checked
 * for "live" automatically once their free keys are on the server; anything else (TikTok,
 * Instagram …) can be switched to live by hand, for a while.
 */
export default function Creators() {
  const { data, error, loading, reload, setData } = useResource(() => adminApi.get('/creators'))
  const [form, setForm] = useState(null)
  const [manual, setManual] = useState(null) // { id, platform, url, minutes, title }
  const [run, busy] = useAction()
  const now = useNow()

  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading && !data) return <Loading />
  const { creators, support, errors } = data
  const anyCheck = Object.values(support).some(Boolean)
  const replace = (c) => setData((d) => ({ ...d, creators: d.creators.map((x) => (x._id === c._id ? c : x)) }))

  async function save(e) {
    e.preventDefault()
    const body = {
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      photo: form.photo,
      links: Object.fromEntries(
        Object.entries(form.links)
          .filter(([, v]) => v.trim())
          .map(([k, v]) => [k, v.trim()]),
      ),
      order: Number(form.order) || 0,
      visible: form.visible,
    }
    const res = await run(
      () => (form.id ? adminApi.put(`/creators/${form.id}`, body) : adminApi.post('/creators', body)),
      form.id ? 'Saved' : 'Creator added',
    )
    if (!res) return
    setForm(null)
    reload()
  }
  async function remove(id) {
    if (await run(() => adminApi.del(`/creators/${id}`), 'Creator removed')) {
      setForm(null)
      reload()
    }
  }
  async function checkNow() {
    const res = await run(() => adminApi.post('/creators/check'), 'Checked')
    if (res) setData(res)
  }
  async function goLive(e) {
    e.preventDefault()
    const res = await run(
      () =>
        adminApi.post(`/creators/${manual.id}/live`, {
          platform: manual.platform,
          url: manual.url.trim(),
          minutes: Number(manual.minutes),
          title: manual.title.trim(),
        }),
      'Marked live — it shows on the website within a minute',
    )
    if (res) {
      replace(res.creator)
      setManual(null)
    }
  }
  async function endLive(id) {
    const res = await run(() => adminApi.post(`/creators/${id}/live/end`), 'No longer marked live')
    if (res) replace(res.creator)
  }

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <>
      <PageHead title="Creators" sub="The streamers and creators on the Creators page, and whether they’re live.">
        {anyCheck && (
          <button type="button" className="pbtn pbtn--ghost" onClick={checkNow} disabled={busy}>
            Check live now
          </button>
        )}
        <button type="button" className="pbtn pbtn--gold" onClick={() => setForm(blank())}>
          Add creator
        </button>
      </PageHead>

      <Panel title="Live checks">
        <ul className="p-ai-list">
          {Object.entries(CHECKED).map(([id, label], i) => (
            <li key={id} className={`p-ai ${support[id] ? '' : 'is-off'}`}>
              <span className="p-ai__n">{i + 1}</span>
              <span className="p-ai__main">
                <strong>{label}</strong>
                <span className="p-ai__models">
                  {support[id]
                    ? 'Checked about every ' + (id === 'youtube' ? '5 minutes' : '90 seconds')
                    : `Add ${KEYS[id]} on Render (Environment) to check ${label} automatically.`}
                </span>
                {errors[id] && <span className="p-ai__rest">{errors[id]}</span>}
              </span>
              <span className={`p-cr-pill ${support[id] ? 'is-on' : ''}`}>{support[id] ? 'On' : 'Not set up'}</span>
            </li>
          ))}
        </ul>
        <p className="p-text p-ai-note">
          Creators on other platforms (TikTok, Instagram …) show no live status unless you mark them live by hand. The website never shows
          “Offline” for a channel it can’t check.
        </p>
      </Panel>

      {form && (
        <Panel title={form.id ? `Edit ${form.name || 'creator'}` : 'New creator'}>
          <form onSubmit={save}>
            <div className="p-grid-2">
              <div className="p-form-grid">
                <TextField label="Name" value={form.name} onChange={set('name')} required maxLength={60} />
                <TextField
                  label="Short line (optional)"
                  value={form.tagline}
                  onChange={set('tagline')}
                  maxLength={100}
                  placeholder="e.g. Plays Marcus, Ballas OG"
                />
                <TextField
                  label="Order"
                  type="number"
                  min={0}
                  max={9999}
                  value={form.order}
                  onChange={set('order')}
                  hint="Lower numbers come first (live creators always go to the top)."
                />
                <Switch checked={form.visible} onChange={set('visible')} label="Show on the website" />
              </div>
              <MediaField label="Photo" value={form.photo} onChange={set('photo')} fallback="Empty: the card shows their initials." />
            </div>
            <fieldset className="p-socials">
              <legend className="p-field__label">Channels</legend>
              <p className="p-field__hint">
                Paste the full link (https://…). Twitch, Kick and YouTube links are checked for live automatically; all of them show as
                logos on the card.
              </p>
              <div className="p-socials__grid">
                {PLATFORMS.map((p) => (
                  <label key={p.id} className="p-socials__item">
                    <span className="p-socials__icon">
                      <BrandIcon platform={p} size={16} />
                    </span>
                    <span className="p-sr-only">{p.label}</span>
                    <input
                      className="p-input"
                      type="url"
                      inputMode="url"
                      maxLength={300}
                      placeholder={PLACEHOLDERS[p.id]}
                      value={form.links[p.id] ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, links: { ...f.links, [p.id]: e.target.value } }))}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="p-row">
              <button type="submit" className="pbtn pbtn--gold" disabled={busy || !form.name.trim()}>
                {form.id ? 'Save' : 'Add'}
              </button>
              <button type="button" className="pbtn pbtn--ghost" onClick={() => setForm(null)}>
                Cancel
              </button>
              {form.id && (
                <ConfirmButton className="pbtn pbtn--danger p-push" onConfirm={() => remove(form.id)}>
                  Remove creator
                </ConfirmButton>
              )}
            </div>
          </form>
        </Panel>
      )}

      {creators.length === 0 ? (
        <Empty>No creators yet. Until you add one, the Creators page says none are listed.</Empty>
      ) : (
        <ul className="p-staff" role="list">
          {creators.map((c) => {
            const manualOn = c.manual?.until && new Date(c.manual.until).getTime() > now
            const checkable = Object.keys(CHECKED).filter((p) => support[p] && c.links?.[p])
            return (
              <li key={c._id} className={`p-staff__card ${manualOn || c.live?.on ? 'is-online' : 'is-offline'}`}>
                <Thumb id={c.photo} alt={c.name} className="p-staff__photo" />
                <div className="p-staff__text">
                  <p className="p-staff__name">
                    {c.name}
                    {!c.visible && <span className="p-cr-hidden"> · hidden</span>}
                  </p>
                  <p className="p-staff__role">
                    {manualOn ? (
                      <span className="p-cr-live">
                        ● Live on {LIVE_PLATFORMS.find((p) => p.value === c.manual.platform)?.label ?? c.manual.platform} — set by staff until {time.format(new Date(c.manual.until))}
                      </span>
                    ) : c.live?.on && checkable.includes(c.live.platform) ? (
                      <span className="p-cr-live">
                        ● Live on {CHECKED[c.live.platform]}
                        {c.live.viewers > 0 && ` · ${compact(c.live.viewers)} watching`}
                      </span>
                    ) : checkable.length ? (
                      `Offline · checks ${checkable.map((p) => CHECKED[p]).join(', ')}`
                    ) : (
                      'Live status not checked — no Twitch / Kick / YouTube link with keys set up'
                    )}
                  </p>
                  {checkable.length > 0 && c.live?.checkedAt && (
                    <p className="p-staff__when">Last checked {formatWhen(c.live.checkedAt)}</p>
                  )}
                </div>
                <div className="p-row p-cr-actions">
                  {manualOn ? (
                    <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => endLive(c._id)} disabled={busy}>
                      End live
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="pbtn pbtn--ghost pbtn--sm"
                      onClick={() => {
                        const first = PLATFORMS.find((p) => p.id !== 'discord' && c.links?.[p.id])
                        setManual({
                          id: c._id,
                          platform: first?.id ?? 'other',
                          url: first ? c.links[first.id] : '',
                          minutes: '120',
                          title: '',
                        })
                      }}
                    >
                      Mark live
                    </button>
                  )}
                  <button
                    type="button"
                    className="pbtn pbtn--ghost pbtn--sm"
                    onClick={() =>
                      setForm({
                        id: c._id,
                        name: c.name,
                        tagline: c.tagline ?? '',
                        photo: c.photo,
                        links: { ...(c.links ?? {}) },
                        order: c.order,
                        visible: c.visible,
                      })
                    }
                  >
                    Edit
                  </button>
                </div>
                {manual?.id === c._id && (
                  <form className="p-cr-manual" onSubmit={goLive}>
                    <div className="p-form-grid">
                      <SelectField
                        label="Live on"
                        value={manual.platform}
                        onChange={(v) => setManual((m) => ({ ...m, platform: v, url: c.links?.[v] ?? m.url }))}
                        options={LIVE_PLATFORMS}
                      />
                      <SelectField
                        label="Show it for"
                        value={manual.minutes}
                        onChange={(v) => setManual((m) => ({ ...m, minutes: v }))}
                        options={DURATIONS}
                      />
                      <TextField
                        label="Link to the stream"
                        type="url"
                        inputMode="url"
                        required
                        wide
                        maxLength={500}
                        value={manual.url}
                        onChange={(v) => setManual((m) => ({ ...m, url: v }))}
                        placeholder="https://…"
                      />
                      <TextField
                        label="Stream title (optional)"
                        wide
                        maxLength={120}
                        value={manual.title}
                        onChange={(v) => setManual((m) => ({ ...m, title: v }))}
                      />
                    </div>
                    <div className="p-row">
                      <button type="submit" className="pbtn pbtn--gold" disabled={busy || !/^https?:\/\/\S+\.\S+/i.test(manual.url.trim())}>
                        Mark live
                      </button>
                      <button type="button" className="pbtn pbtn--ghost" onClick={() => setManual(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
