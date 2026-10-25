import { useEffect, useRef, useState } from 'react'

import { ACCEPT, adminApi, checkUpload, formatBytes, uploadMedia } from './panelApi'
import { useAuth } from './authContext'
import { mediaUrl } from './format'
import { useToast } from './hooks'
import { Empty, ErrorNote, Loading } from './ui'

/** A small preview of a stored file. */
export function Thumb({ id, kind = 'image', alt = '', className = '', onDuration }) {
  if (!id) return <span className={`p-thumb p-thumb--empty ${className}`} aria-hidden="true" />
  return kind === 'video' ? (
    <video
      className={`p-thumb ${className}`}
      src={`${mediaUrl(id)}#t=0.5`}
      muted
      playsInline
      preload="metadata"
      aria-label={alt}
      onLoadedMetadata={onDuration ? (e) => onDuration(e.currentTarget.duration) : undefined}
    />
  ) : (
    <img className={`p-thumb ${className}`} src={mediaUrl(id)} alt={alt} loading="lazy" />
  )
}

/**
 * Upload one or more files with progress. Calls `onUploaded(file)` for each stored file.
 */
export function UploadButton({ onUploaded, kind, label = 'Upload', className = 'pbtn pbtn--gold' }) {
  const input = useRef(null)
  const toast = useToast()
  const { handleError } = useAuth()
  const [progress, setProgress] = useState(null)

  const accept = kind ? ACCEPT.split(',').filter((t) => t.startsWith(kind)).join(',') : ACCEPT

  async function handle(files) {
    for (const file of files) {
      const problem = checkUpload(file) ?? (kind && !file.type.startsWith(kind) ? `${file.name} is not ${kind === 'video' ? 'a video' : 'an image'}.` : null)
      if (problem) {
        toast(problem, 'error')
        continue
      }
      try {
        setProgress({ name: file.name, value: 0 })
        const stored = await uploadMedia(file, (value) => setProgress({ name: file.name, value }))
        toast(`Uploaded ${stored.name}`)
        onUploaded?.(stored)
      } catch (err) {
        handleError(err)
        toast(err.message, 'error')
      }
    }
    setProgress(null)
    if (input.current) input.current.value = ''
  }

  return (
    <span className="p-upload">
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={!kind}
        className="p-sr-only"
        tabIndex={-1}
        onChange={(e) => handle([...e.target.files])}
      />
      <button type="button" className={className} disabled={Boolean(progress)} onClick={() => input.current?.click()}>
        {progress ? `Uploading ${Math.round(progress.value * 100)}%` : label}
      </button>
      {progress && (
        <span className="p-upload__bar" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress.value})` }} />
        </span>
      )}
    </span>
  )
}

/**
 * Library browser in a modal dialog. `kind` limits it to images or videos.
 * Resolves the choice through `onPick(file)`.
 */
export function MediaPicker({ open, kind, onPick, onClose }) {
  const dialog = useRef(null)
  const { handleError } = useAuth()
  const [state, setState] = useState({ files: null, error: null })

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    let alive = true
    adminApi
      .get('/media')
      .then(({ files }) => alive && setState({ files, error: null }))
      .catch((err) => {
        handleError(err)
        if (alive) setState({ files: null, error: err.message })
      })
    return () => {
      alive = false
    }
  }, [open, handleError])

  const files = state.files?.filter((f) => !kind || f.kind === kind)

  return (
    <dialog ref={dialog} className="p-dialog" onClose={onClose} aria-labelledby="picker-title">
      <div className="p-dialog__head">
        <h2 id="picker-title" className="p-card__title">
          Choose {kind === 'video' ? 'a video' : kind === 'image' ? 'an image' : 'a file'}
        </h2>
        <div className="p-row">
          <UploadButton
            kind={kind}
            label="Upload new"
            onUploaded={(file) => {
              setState((s) => ({ ...s, files: [file, ...(s.files ?? [])] }))
            }}
          />
          <button type="button" className="pbtn pbtn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      {state.error && <ErrorNote message={state.error} />}
      {!state.error && !files && <Loading />}
      {files?.length === 0 && <Empty>Nothing in the library yet. Upload a file to use it here.</Empty>}
      {files?.length > 0 && (
        <ul className="p-picker" role="list">
          {files.map((file) => (
            <li key={file.id}>
              <button type="button" className="p-picker__item" onClick={() => onPick(file)}>
                <Thumb id={file.id} kind={file.kind} />
                <span className="p-picker__name">{file.name}</span>
                <span className="p-picker__meta">{formatBytes(file.size)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </dialog>
  )
}

/**
 * A form field holding one media id: preview, "Choose", and "Remove".
 * `fallback` explains what shows on the site while it's empty.
 */
export function MediaField({ label, kind = 'image', value, onChange, fallback, hint, maxSeconds }) {
  const [open, setOpen] = useState(false)
  const [length, setLength] = useState(null) // { id, seconds } of the chosen video
  const tooLong = maxSeconds && length?.id === value && length.seconds > maxSeconds
  return (
    <div className="p-field p-media-field">
      <span className="p-field__label">{label}</span>
      <div className="p-media-field__body">
        <Thumb
          id={value}
          kind={kind}
          alt={label}
          className="p-media-field__thumb"
          onDuration={maxSeconds ? (seconds) => setLength({ id: value, seconds }) : undefined}
        />
        <div className="p-media-field__actions">
          <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => setOpen(true)}>
            {value ? 'Change' : 'Choose'}
          </button>
          {value && (
            <button type="button" className="pbtn pbtn--quiet pbtn--sm" onClick={() => onChange(null)}>
              Remove
            </button>
          )}
        </div>
      </div>
      {hint && <p className="p-field__hint">{hint}</p>}
      {!value && fallback && <p className="p-field__hint">{fallback}</p>}
      {tooLong && (
        <p className="p-form-note">
          This clip is {Math.round(length.seconds)} s long — a 5–10 s loop loads faster and looks better.
        </p>
      )}
      <MediaPicker
        open={open}
        kind={kind}
        onClose={() => setOpen(false)}
        onPick={(file) => {
          onChange(file.id)
          setOpen(false)
        }}
      />
    </div>
  )
}
