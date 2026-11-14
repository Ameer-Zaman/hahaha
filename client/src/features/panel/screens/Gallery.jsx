import { useState } from 'react'

import { move } from '../format'
import { useAction, useResource } from '../hooks'
import { MediaPicker, Thumb, UploadButton } from '../mediaKit'
import { adminApi } from '../panelApi'
import { Empty, ErrorNote, Loading, PageHead, Panel } from '../ui'
import { RowTools } from './Gangs'

const MAX = 150

/**
 * Panel → Gallery: the photos on the website's Gallery page, where visitors can pick them up,
 * move them around and open them full size. Photos show in this order (the first ones land on
 * top of the table). Each can have a short caption and a credit. Nothing changes on the
 * website until you press Save.
 */
export default function Gallery() {
  const { data, error, loading, reload } = useResource(() => adminApi.get('/gallery'))
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <GalleryEditor initial={data.items} />
}

function GalleryEditor({ initial }) {
  const [saved, setSaved] = useState(initial)
  const [items, setItems] = useState(initial)
  const [picking, setPicking] = useState(false)
  const [run, busy] = useAction()

  const dirty = JSON.stringify(items) !== JSON.stringify(saved)
  const add = (file) =>
    setItems((all) =>
      all.some((i) => i.media === file.id) || all.length >= MAX ? all : [...all, { media: file.id, caption: '', credit: '' }],
    )
  const update = (i, change) => setItems((all) => all.map((it, j) => (j === i ? { ...it, ...change } : it)))

  async function save() {
    const result = await run(() => adminApi.put('/gallery', { items }), 'Gallery saved')
    if (result) {
      setSaved(result.items)
      setItems(result.items)
    }
  }

  return (
    <>
      <PageHead
        title="Gallery"
        sub={`${items.length} ${items.length === 1 ? 'photo' : 'photos'} on the Gallery page${dirty ? ' · changes not saved yet' : ''}`}
      >
        <a className="pbtn pbtn--ghost" href="/gallery" target="_blank" rel="noreferrer">
          View page
        </a>
        <button type="button" className="pbtn pbtn--gold" onClick={save} disabled={busy || !dirty}>
          Save
        </button>
      </PageHead>

      <Panel
        title="Add photos"
        sub="Screenshots and photos from the city. Landscape pictures look best; up to 150 photos. Pictures only — no videos."
      >
        <div className="p-row">
          <UploadButton kind="image" multiple label="Upload photos" onUploaded={add} />
          <button type="button" className="pbtn pbtn--ghost" onClick={() => setPicking(true)} disabled={items.length >= MAX}>
            Choose from the library
          </button>
        </div>
        <MediaPicker
          open={picking}
          kind="image"
          onClose={() => setPicking(false)}
          onPick={(file) => {
            add(file)
            setPicking(false)
          }}
        />
      </Panel>

      <Panel title="Photos" sub="The order here is the order on the page. Captions show on the photo and in the full-size view.">
        {items.length === 0 ? (
          <Empty>No photos yet. Upload some above — the Gallery page shows a “coming soon” note until there are photos.</Empty>
        ) : (
          <ol role="list" className="p-gal">
            {items.map((item, i) => (
              <li key={item.media} className="p-gal__item">
                <span className="p-gal__num">{i + 1}</span>
                <Thumb id={item.media} alt={item.caption || `Photo ${i + 1}`} className="p-gal__thumb" />
                <div className="p-gal__fields">
                  <input
                    className="p-input"
                    aria-label={`Photo ${i + 1} caption`}
                    placeholder="Caption (optional), e.g. Sunset over the pier"
                    value={item.caption}
                    maxLength={140}
                    onChange={(e) => update(i, { caption: e.target.value })}
                  />
                  <input
                    className="p-input"
                    aria-label={`Photo ${i + 1} credit`}
                    placeholder="Credit (optional), e.g. Shot by Arjun"
                    value={item.credit}
                    maxLength={60}
                    onChange={(e) => update(i, { credit: e.target.value })}
                  />
                </div>
                <RowTools
                  index={i}
                  count={items.length}
                  label={item.caption || `photo ${i + 1}`}
                  onMove={(d) => setItems((all) => move(all, i, d))}
                  onRemove={() => setItems((all) => all.filter((_, j) => j !== i))}
                />
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </>
  )
}
