import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import usePageTitle from '../../hooks/usePageTitle'
import Plate from '../../components/media/Plate'
import { join as prelaunch } from '../../content/home'
import { fields, initialValues, toPayload, validateAll, validateField } from './applicationSchema'
import { isSubmissionConnected, submitApplication } from './applicationService'
import './apply.css'

export default function ApplyPage() {
  usePageTitle('Apply')
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [phase, setPhase] = useState('editing') // editing | sending | sent | not-connected | rejected | failed
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const summaryRef = useRef(null)
  const outcomeRef = useRef(null)
  const connected = isSubmissionConnected()

  const update = (field, value) => {
    setValues((v) => ({ ...v, [field.name]: value }))
    if (touched[field.name]) {
      setErrors((e) => ({ ...e, [field.name]: validateField(field, value) }))
    }
  }

  const blur = (field) => {
    setTouched((t) => ({ ...t, [field.name]: true }))
    setErrors((e) => ({ ...e, [field.name]: validateField(field, values[field.name]) }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    // Honeypot: real people never fill the hidden field.
    if (event.currentTarget.elements.website?.value) return

    const nextErrors = validateAll(values)
    setErrors(nextErrors)
    setTouched(Object.fromEntries(fields.map((f) => [f.name, true])))
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    setPhase('sending')
    const outcome = await submitApplication(toPayload(values))
    setResult(outcome)
    setPhase(outcome.status)
    requestAnimationFrame(() => outcomeRef.current?.focus())
  }

  const copyAnswers = async () => {
    const text = fields
      .map((f) => `${f.label}\n${f.type === 'checkbox' ? (values[f.name] ? 'Yes' : 'No') : values[f.name] || '—'}`)
      .join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const errorList = Object.entries(errors).filter(([, message]) => message)

  return (
    <>
      <section className="apply-head theme-black" aria-labelledby="apply-title">
        <Plate className="apply-head__plate" seed={64} horizon={0.9} parallax />
        <div className="container apply-head__inner">
          <h1 id="apply-title" className="page-head__title">
            Apply
          </h1>
          <p className="lede">
            Applications open before the server does, so the first residents arrive ready. Tell us
            who you are and who you want to be in the city.
          </p>
          <ol className="apply-steps">
            {prelaunch.steps.map((step, i) => (
              <li key={step.title}>
                <span className="apply-steps__num" aria-hidden="true">
                  {i + 1}
                </span>
                <span>
                  <strong>{step.title}</strong> {step.detail}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="apply-body theme-dark section" aria-label="Application form">
        <div className="container apply-layout">
          <aside className="apply-aside">
            <p className="apply-aside__title">Before you start</p>
            <p>
              Read the <Link to="/rules">rules</Link> first — the form asks you to confirm you have.
              It takes about ten minutes.
            </p>
            {!connected && (
              <div className="notice" role="note">
                <p className="notice__title">Submissions are not connected yet</p>
                <p className="notice__body">
                  You can fill in and check the form, but nothing will be sent or saved until the
                  application system goes live.
                </p>
              </div>
            )}
          </aside>

          {phase === 'sent' || phase === 'not-connected' ? (
            <Outcome
              ref={outcomeRef}
              phase={phase}
              result={result}
              copied={copied}
              onCopy={copyAnswers}
              onEdit={() => setPhase('editing')}
            />
          ) : (
            <form className="apply-form" noValidate onSubmit={onSubmit}>
              {errorList.length > 0 && (
                <div className="form-summary" ref={summaryRef} tabIndex={-1} role="alert">
                  <p className="form-summary__title">
                    {errorList.length === 1 ? 'One answer needs attention' : `${errorList.length} answers need attention`}
                  </p>
                  <ul>
                    {errorList.map(([name, message]) => (
                      <li key={name}>
                        <a href={`#field-${name}`}>{message}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(phase === 'rejected' || phase === 'failed') && (
                <div className="form-summary" ref={outcomeRef} tabIndex={-1} role="alert">
                  <p className="form-summary__title">Your application was not sent</p>
                  <p>
                    {phase === 'rejected'
                      ? result?.message
                      : 'The connection failed. Check your internet connection and try again — your answers are still here.'}
                  </p>
                </div>
              )}

              {fields.map((field) => (
                <Field
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  error={touched[field.name] ? errors[field.name] : ''}
                  onChange={(value) => update(field, value)}
                  onBlur={() => blur(field)}
                />
              ))}

              {/* Honeypot for bots — hidden from people and assistive tech */}
              <div className="apply-hp" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <div className="apply-form__actions">
                <button type="submit" className="btn btn--primary btn--large" disabled={phase === 'sending'}>
                  {phase === 'sending' ? 'Sending application…' : connected ? 'Send application' : 'Check application'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  )
}

function Field({ field, value, error, onChange, onBlur }) {
  const id = `field-${field.name}`
  const hintId = field.hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  const common = {
    id,
    name: field.name,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    onBlur,
  }

  if (field.type === 'checkbox') {
    return (
      <div className={`field field--check ${error ? 'has-error' : ''}`}>
        <input {...common} type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        <label htmlFor={id}>
          {field.label} <Link to="/rules" target="_blank" rel="noopener">Open the rules</Link>
        </label>
        {error && (
          <p id={errorId} className="field__error">
            {error}
          </p>
        )}
      </div>
    )
  }

  const count = field.maxLength && field.type === 'textarea' ? String(value).trim().length : null

  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id} className="field__label">
        {field.label}
      </label>
      {field.hint && (
        <p id={hintId} className="field__hint">
          {field.hint}
        </p>
      )}
      {field.type === 'select' ? (
        <select {...common} value={value} onChange={(e) => onChange(e.target.value)} required={field.required}>
          {field.options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.value === ''}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          {...common}
          rows={field.rows}
          value={value}
          maxLength={field.maxLength}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          {...common}
          type={field.type}
          value={value}
          autoComplete={field.autoComplete}
          maxLength={field.maxLength}
          required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {(error || count !== null) && (
        <div className="field__foot">
          {error ? (
            <p id={errorId} className="field__error">
              {error}
            </p>
          ) : (
            <span />
          )}
          {count !== null && (
            <span className="field__count">
              {count} / {field.maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function Outcome({ ref, phase, result, copied, onCopy, onEdit }) {
  if (phase === 'sent') {
    return (
      <div className="outcome" ref={ref} tabIndex={-1} role="status">
        <h2 className="outcome__title">Application sent</h2>
        <p className="lede">
          The team will review it and contact you on Discord before launch.
          {result?.reference && <> Your reference is <strong>{result.reference}</strong>.</>}
        </p>
        <Link to="/rules" className="text-link">
          Re-read the rules while you wait
        </Link>
      </div>
    )
  }

  return (
    <div className="outcome" ref={ref} tabIndex={-1} role="status">
      <h2 className="outcome__title">Your answers are complete — but they were not sent</h2>
      <p className="lede">
        The application system is not connected yet, so nothing has been sent or saved. Copy your
        answers to keep them, and send them once applications open.
      </p>
      <div className="outcome__actions">
        <button type="button" className="btn btn--primary btn--large" onClick={onCopy}>
          {copied ? 'Answers copied' : 'Copy my answers'}
        </button>
        <button type="button" className="btn btn--ghost btn--large" onClick={onEdit}>
          Edit answers
        </button>
      </div>
    </div>
  )
}
