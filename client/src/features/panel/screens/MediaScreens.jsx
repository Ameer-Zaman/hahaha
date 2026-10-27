import { useEffect, useState } from 'react'

import { MediaField, Thumb, UploadButton } from '../mediaKit'
import { adminApi, formatBytes, getStorage } from '../panelApi'
import { formatWhen } from '../format'
import { useAction, useResource } from '../hooks'
import { ConfirmButton, Empty, ErrorNote, Loading, PageHead, Panel } from '../ui'

/* ---------------------------------------------------------------- library */

export function MediaLibrary() {
  const { data, error, loading, reload, setData } = useResource(() => adminApi.get('/media'))
  const [filter, setFilter] = useState('all')
  const [run] = useAction()
  const [storage, setStorage] = useState(null)
  useEffect(() => {
    let alive = true
    getStorage()
      .then((info) => alive && setStorage(info))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

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
        sub={
          storage?.provider === 'cloudinary'
            ? `Stored on Cloudinary and delivered from its network. Photos (JPG, PNG, WebP, GIF · up to ${formatBytes(storage.limits.image)}) and videos (MP4, WebM, MOV · up to ${formatBytes(storage.limits.video)}). Pick them from here for gangs, staff and the homepage.`
            : `Photos (JPG, PNG, WebP, GIF · up to ${formatBytes(storage?.limits.image ?? 5 * 1024 * 1024)}) and videos (MP4, WebM · up to ${formatBytes(storage?.limits.video ?? 60 * 1024 * 1024)}). Stored in the database; connect Cloudinary on the server for bigger files and faster delivery.`
        }
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
                {file.provider === 'cloudinary' ? ' · Cloudinary' : ''}
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

/* Story page: each place has a video and an image (the video plays; the image shows while it loads, or alone) */
const STORY_CHAPTERS = [
  { key: 'City', name: 'Chapter one · The City', file: 'city', quote: true },
  { key: 'Streets', name: 'Chapter two · The Streets', file: 'streets', quote: true },
  { key: 'Night', name: 'Chapter three · After Dark', file: 'night', quote: false },
]
const STORY_PLACES = [
  { key: 'Scene', label: 'Big scene (moves with the scroll)', file: (f) => f },
  { key: 'CardA', label: 'Small card 1', file: (f) => `${f}-a` },
  { key: 'CardB', label: 'Small card 2', file: (f) => `${f}-b` },
  { key: 'Quote', label: 'Quote scene (after the chapter)', file: (f) => `quote-${f === 'city' ? 1 : 2}` },
]
const STORY_SLOTS = STORY_CHAPTERS.flatMap((ch) =>
  STORY_PLACES.filter((p) => p.key !== 'Quote' || ch.quote).flatMap((p) => [
    {
      group: ch.name,
      slot: `story${ch.key}${p.key}Video`,
      kind: 'video',
      label: `${p.label} — video`,
      fallback: `public/assets/video/story/${p.file(ch.file)}.mp4`,
    },
    {
      group: ch.name,
      slot: `story${ch.key}${p.key}Image`,
      kind: 'image',
      label: `${p.label} — image`,
      fallback: 'the video above',
    },
  ]),
)

export function SiteMedia() {
  return <MediaSlotsScreen slots={SLOTS} title="Homepage media" sub="Swap the homepage videos and pictures without a new deploy. Empty slots keep the file shipped with the website." />
}

export function StoryMedia() {
  return (
    <MediaSlotsScreen
      slots={STORY_SLOTS}
      title="Story media"
      sub="Videos and pictures for each chapter of the Story page. Each place takes a video, an image, or both (the image shows while the video loads). Big scenes move with the scroll: export those videos with frequent keyframes (see README → Story page videos)."
    />
  )
}

function MediaSlotsScreen({ slots, title, sub }) {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/settings'))
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <SiteMediaForm initial={data.media ?? {}} slots={slots} title={title} sub={sub} />
}

function SiteMediaForm({ initial, slots: SLOTS, title, sub }) {
  const [media, setMedia] = useState(initial)
  const pick = (all) => JSON.stringify(SLOTS.map(({ slot }) => all[slot] ?? null))
  const [savedJson, setSavedJson] = useState(() => pick(initial))
  const [run, busy] = useAction()
  const dirty = pick(media) !== savedJson

  async function save() {
    const body = Object.fromEntries(SLOTS.map(({ slot }) => [slot, media[slot] ?? null]))
    const result = await run(() => adminApi.put('/settings/media', { media: body }), `${title} saved`)
    if (result) {
      setMedia(result.media)
      setSavedJson(pick(result.media))
    }
  }

  const groups = [...new Set(SLOTS.map((s) => s.group))]
  return (
    <>
      <PageHead title={title} sub={sub}>
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
                fallback={s.fallback === 'the video above' ? 'Optional: shown while the video loads, or on its own without a video.' : `Empty: uses ${s.fallback} (or the illustrated skyline).`}
              />
            ))}
          </div>
        </Panel>
      ))}
    </>
  )
}
