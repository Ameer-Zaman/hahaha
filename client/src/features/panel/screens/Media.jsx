import { useState } from 'react'

import { MediaField, Thumb, UploadButton } from '../media'
import { adminApi, formatBytes } from '../panelApi'
import { formatWhen } from '../format'
import { useAction, useResource } from '../hooks'
import { ConfirmButton, Empty, ErrorNote, Loading, PageHead, Panel } from '../ui'

/* ---------------------------------------------------------------- library */

export function MediaLibrary() {
  const { data, error, loading, reload, setData } = useResource(() => adminApi.get('/media'))
  const [filter, setFilter] = useState('all')
  const [run] = useAction()

  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading && !data) return <Loading />
  const files = data.files.filter((f) => filter === 'all' || f.kind === filter)

  async function remove(file) {
    const ok = await run(() => adminApi.del(`/media/${file.id}`), `Deleted ${file.name}`)
    if (ok) setData((d) => ({ files: d.files.filter((f) => f.id !== file.id) }))
  }

  return (
    <>
      <PageHead
        title="Media library"
        sub="Photos (JPG, PNG, WebP, GIF · up to 5 MB) and videos (MP4, WebM · up to 60 MB). Pick them from here for gangs, staff and the homepage."
      >
        <UploadButton label="Upload files" onUploaded={(file) => setData((d) => ({ files: [file, ...d.files] }))} />
      </PageHead>

      <div className="p-tabs" role="group" aria-label="Show">
        {['all', 'image', 'video'].map((f) => (
          <button key={f} type="button" className={`p-tab ${filter === f ? 'is-active' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? `All (${data.files.length})` : f === 'image' ? 'Images' : 'Videos'}
          </button>
        ))}
      </div>

      {files.length === 0 ? (
        <Empty>No files here yet.</Empty>
      ) : (
        <ul className="p-library" role="list">
          {files.map((file) => (
            <li key={file.id} className="p-library__item">
              <a href={file.url} target="_blank" rel="noreferrer" className="p-library__preview">
                <Thumb id={file.id} kind={file.kind} alt={file.name} />
                {file.kind === 'video' && <span className="p-tag p-library__kind">Video</span>}
              </a>
              <p className="p-library__name" title={file.name}>
                {file.name}
              </p>
              <p className="p-library__meta">
                {formatBytes(file.size)} · {formatWhen(file.uploadedAt)}
              </p>
              <ConfirmButton className="pbtn pbtn--quiet pbtn--sm" confirmLabel="Confirm delete" onConfirm={() => remove(file)}>
                Delete
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/* ------------------------------------------------------------- site media */

const SLOTS = [
  { group: 'Homepage', slot: 'heroVideo', kind: 'video', label: 'Hero video', fallback: 'public/assets/video/home.mp4' },
  { group: 'Homepage', slot: 'welcomeVideo', kind: 'video', label: '“Welcome to the city” video', fallback: 'public/assets/video/welcome.mp4' },
  { group: 'Homepage', slot: 'joinImage', kind: 'image', label: 'Application section background', fallback: 'public/media/home/join.jpg' },
  { group: '“More than a server” posters', slot: 'posterAdministration', kind: 'image', label: 'Administration poster', fallback: 'public/media/home/administration.jpg' },
  { group: '“More than a server” posters', slot: 'posterGangs', kind: 'image', label: 'Gangs poster', fallback: 'public/media/home/gangs.jpg' },
  { group: '“More than a server” posters', slot: 'posterWars', kind: 'image', label: 'Wars poster', fallback: 'public/media/home/wars.jpg' },
  { group: '“More than a server” posters', slot: 'posterRules', kind: 'image', label: 'Rules poster', fallback: 'public/media/home/rules.jpg' },
]

export function SiteMedia() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/settings'))
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <SiteMediaForm initial={data.media ?? {}} />
}

function SiteMediaForm({ initial }) {
  const [media, setMedia] = useState(initial)
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initial))
  const [run, busy] = useAction()
  const dirty = JSON.stringify(media) !== savedJson

  async function save() {
    const body = Object.fromEntries(SLOTS.map(({ slot }) => [slot, media[slot] ?? null]))
    const result = await run(() => adminApi.put('/settings/media', { media: body }), 'Homepage media saved')
    if (result) {
      setMedia(result.media)
      setSavedJson(JSON.stringify(result.media))
    }
  }

  const groups = [...new Set(SLOTS.map((s) => s.group))]
  return (
    <>
      <PageHead title="Homepage media" sub="Swap the homepage videos and pictures without a new deploy. Empty slots keep the file shipped with the website.">
        <button type="button" className="pbtn pbtn--gold" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </PageHead>
      {groups.map((group) => (
        <Panel key={group} title={group}>
          <div className="p-slots">
            {SLOTS.filter((s) => s.group === group).map((s) => (
              <MediaField
                key={s.slot}
                label={s.label}
                kind={s.kind}
                value={media[s.slot] ?? null}
                onChange={(id) => setMedia((m) => ({ ...m, [s.slot]: id }))}
                fallback={`Empty: uses ${s.fallback} (or the illustrated skyline).`}
              />
            ))}
          </div>
        </Panel>
      ))}
    </>
  )
}
