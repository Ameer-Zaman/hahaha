import { useCallback, useEffect, useId, useState } from 'react'

import { ToastContext } from './hooks'

/* ------------------------------------------------------------------ toasts */


export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((list) => [...list.slice(-2), { id, message, tone }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === 'error' ? 7000 : 3500)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="p-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <p key={t.id} className={`p-toast p-toast--${t.tone}`}>
            {t.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/* ---------------------------------------------------------------- layout */

export function PageHead({ title, sub, children }) {
  return (
    <header className="p-head">
      <div>
        <h1 className="p-head__title">{title}</h1>
        {sub && <p className="p-head__sub">{sub}</p>}
      </div>
      {children && <div className="p-head__actions">{children}</div>}
    </header>
  )
}

export function Panel({ title, children, actions, className = '' }) {
  return (
    <section className={`p-card ${className}`}>
      {(title || actions) && (
        <div className="p-card__head">
          {title && <h2 className="p-card__title">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function Loading({ label = 'Loading…' }) {
  return (
    <p className="p-loading" aria-busy="true">
      <span aria-hidden="true" /> {label}
    </p>
  )
}

export function ErrorNote({ message, onRetry }) {
  return (
    <div className="p-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function Empty({ children }) {
  return <p className="p-empty">{children}</p>
}

/* ----------------------------------------------------------------- forms */

export function Field({ label, hint, children, wide = false, as: Tag = 'div' }) {
  const id = useId()
  const child = typeof children === 'function' ? children(id) : children
  return (
    <Tag className={`p-field ${wide ? 'p-field--wide' : ''}`}>
      <label className="p-field__label" htmlFor={id}>
        {label}
      </label>
      {child}
      {hint && <p className="p-field__hint">{hint}</p>}
    </Tag>
  )
}

/** A labelled text input. `multiline` renders a textarea. */
export function TextField({ label, hint, value, onChange, multiline = false, wide, ...rest }) {
  return (
    <Field label={label} hint={hint} wide={wide || multiline}>
      {(id) =>
        multiline ? (
          <textarea id={id} className="p-input p-input--area" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
        ) : (
          <input id={id} className="p-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
        )
      }
    </Field>
  )
}

export function SelectField({ label, hint, value, onChange, options, wide, ...rest }) {
  return (
    <Field label={label} hint={hint} wide={wide}>
      {(id) => (
        <select id={id} className="p-input p-select" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

export function Switch({ checked, onChange, label, disabled = false, tone = 'gold' }) {
  return (
    <label className={`p-switch p-switch--${tone} ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="p-switch__track" aria-hidden="true">
        <span className="p-switch__thumb" />
      </span>
      <span className="p-switch__label">{label}</span>
    </label>
  )
}

/**
 * A button that asks once more before doing something destructive (no browser dialogs).
 * First click arms it for a few seconds; the second click confirms.
 */
export function ConfirmButton({ onConfirm, children, confirmLabel = 'Click again to confirm', className = 'pbtn pbtn--danger', disabled }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return undefined
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      type="button"
      className={`${className} ${armed ? 'is-armed' : ''}`}
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else setArmed(true)
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  )
}
