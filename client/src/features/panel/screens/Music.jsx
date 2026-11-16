import { useState } from 'react'

import { mediaUrl, move } from '../format'
import { useAction, useResource } from '../hooks'
import { MediaPicker, Thumb } from '../mediaKit'
import { adminApi } from '../panelApi'
import { Empty, ErrorNote, Loading, PageHead, Panel } from '../ui'
import { RowTools } from './Gangs'

const MAX = 30

/**
 * Panel → Music: the songs visitors can choose from the small arrow under the header's music
 * button. The first song plays for anyone who hasn't picked one. With no songs here the site
 * plays its own theme and the arrow doesn't show.
 */
export default function Music() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/music'))
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <MusicEditor initial={data.tracks} />
}

function MusicEditor({ initial }) {
  const [saved, setSaved] = useState(initial)
  const [tracks, setTracks] = useState(initial)
  const [picking, setPicking] = useState(null) // the row choosing a file, or 'new'
  const [run, busy] = useAction()
  const dirty = JSON.stringify(tracks) !== JSON.stringify(saved)

  async function save() {
    const result = await run(() => adminApi.put('/music', { tracks }), 'Music saved')
    if (result) {
      setSaved(result.tracks)
      setTracks(result.tracks)
    }
  }

  // a file's name, tidied into a song title: "dark_theme-v2.mp3" → "Dark theme v2"
  const titleFrom = (name) => {
    const t = String(name ?? '')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim()
    return (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, 60) || 'Untitled'
  }

  return (
    <>
      <PageHead title="Music" sub={`Songs visitors can choose · ${tracks.length}/${MAX}${dirty ? ' · changes not saved yet' : ''}`}>
        <button type="button" className="pbtn pbtn--gold" onClick={save} disabled={busy || !dirty}>
          Save
        </button>
      </PageHead>

      <Panel
        title="Songs"
        sub="Visitors pick one from the small arrow under the music button in the header. The first song plays for anyone who hasn't chosen. Upload MP3 (best), OGG, WAV or M4A. Leave this empty to play the site's own theme."
      >
        {tracks.length === 0 && <Empty>No songs yet — the site plays its own theme.</Empty>}
        <ol role="list" className="p-gal">
          {tracks.map((t, i) => (
            <li key={`${t.media}-${i}`} className="p-gal__item p-music-row">
              <span className="p-gal__num">{i + 1}</span>
              <Thumb id={t.media} kind="audio" alt="" />
              <div className="p-gal__fields">
                <input
                  className="p-input"
                  aria-label={`Song ${i + 1} name`}
                  placeholder="Song name"
                  value={t.title}
                  maxLength={60}
                  onChange={(e) => setTracks(tracks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                />
                <div className="p-music-row__file">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption -- a song preview for staff */}
                  <audio className="p-music-row__player" src={mediaUrl(t.media)} controls preload="none" />
                  <button type="button" className="pbtn pbtn--quiet pbtn--sm" onClick={() => setPicking(i)}>
                    Change file
                  </button>
                </div>
              </div>
              <RowTools
                index={i}
                count={tracks.length}
                label={t.title || `song ${i + 1}`}
                onMove={(d) => setTracks(move(tracks, i, d))}
                onRemove={() => setTracks(tracks.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ol>
        <button type="button" className="pbtn pbtn--ghost p-dh-add" disabled={tracks.length >= MAX} onClick={() => setPicking('new')}>
          {tracks.length >= MAX ? `The list is full (${MAX})` : 'Add a song'}
        </button>
      </Panel>

      <MediaPicker
        open={picking !== null}
        kind="audio"
        onClose={() => setPicking(null)}
        onPick={(file) => {
          if (picking === 'new') setTracks([...tracks, { title: titleFrom(file.name), media: file.id }])
          else setTracks(tracks.map((x, j) => (j === picking ? { ...x, media: file.id } : x)))
          setPicking(null)
        }}
      />
    </>
  )
}
