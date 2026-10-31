import { useEffect, useRef, useState } from 'react'

import { useAuth } from '../authContext'
import { useAction } from '../hooks'
import { authApi } from '../panelApi'
import { Panel, TextField } from '../ui'

/**
 * Two-step sign-in, on your own account.
 *
 * The password proves who you are; a six-digit code from a phone proves you still have the
 * phone. One without the other is not enough, so a leaked password on its own no longer
 * opens the panel — and the panel is the whole website.
 */
export default function TwoFactor({ onDone }) {
  const { twoFactorDone } = useAuth()
  const [state, setState] = useState(null) // { enabled, recoveryCodesLeft, required }
  const [setup, setSetup] = useState(null) // { secret, otpauth } while setting it up
  const [codes, setCodes] = useState(null) // shown once, straight after turning it on
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [run, busy] = useAction()

  const load = () => authApi.twoFactor().then(setState)
  useEffect(() => {
    load()
  }, [])

  async function start() {
    const res = await run(() => authApi.twoFactorSetup())
    if (res) setSetup(res)
  }

  async function enable(e) {
    e.preventDefault()
    const res = await run(() => authApi.twoFactorEnable(code), 'Two-step sign-in is on')
    if (res) {
      setCodes(res.recoveryCodes)
      setSetup(null)
      setCode('')
      twoFactorDone()
      onDone?.()
      await load()
    }
  }

  async function disable(e) {
    e.preventDefault()
    const ok = await run(() => authApi.twoFactorDisable(password, code), 'Two-step sign-in is off')
    if (ok) {
      setPassword('')
      setCode('')
      await load()
    }
  }

  async function regenerate(e) {
    e.preventDefault()
    const res = await run(() => authApi.twoFactorNewCodes(code), 'New recovery codes — the old ones no longer work')
    if (res) {
      setCodes(res.recoveryCodes)
      setCode('')
      await load()
    }
  }

  if (!state) return <Panel title="Two-step sign-in">Loading…</Panel>

  // Shown once, right after turning it on or asking for new ones.
  if (codes) {
    return (
      <Panel title="Your recovery codes">
        <p className="p-note">
          Save these somewhere safe and away from your phone. Each one signs you in once if you lose the phone. This is the
          only time they are shown — nobody, including a Super Admin, can read them again.
        </p>
        <ul className="p-codes">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="p-row">
          <button type="button" className="pbtn" onClick={() => copyAll(codes)}>
            Copy all
          </button>
          <button type="button" className="pbtn" onClick={() => downloadCodes(codes)}>
            Download
          </button>
          <button type="button" className="pbtn pbtn--gold" onClick={() => setCodes(null)}>
            I have saved them
          </button>
        </div>
      </Panel>
    )
  }

  // Step one and two of setting it up.
  if (setup) {
    return (
      <Panel title="Set up two-step sign-in">
        <ol className="p-steps">
          <li>
            Open an authenticator app — Google Authenticator, Authy, 1Password or the one built into your phone.
            <div className="p-qr">
              <Qr text={setup.otpauth} />
            </div>
          </li>
          <li>
            Scan the square. If the camera won't, type this key in by hand:
            <code className="p-secret">{setup.secret.replace(/(.{4})/g, '$1 ').trim()}</code>
          </li>
          <li>
            <form className="p-form-grid p-form-grid--narrow" onSubmit={enable}>
              <TextField
                label="Enter the six digits it shows"
                value={code}
                onChange={setCode}
                autoComplete="one-time-code"
                placeholder="000000"
                required
                wide
              />
              <div className="p-row p-field--wide">
                <button type="submit" className="pbtn pbtn--gold" disabled={busy || code.trim().length < 6}>
                  Turn it on
                </button>
                <button type="button" className="pbtn" onClick={() => setSetup(null)} disabled={busy}>
                  Cancel
                </button>
              </div>
            </form>
          </li>
        </ol>
      </Panel>
    )
  }

  if (!state.enabled) {
    return (
      <Panel title="Two-step sign-in">
        <p className="p-note">
          {state.required
            ? 'Two-step sign-in is required for every account here. Set it up to carry on.'
            : 'Off. Your password alone opens the panel, and the panel controls the whole website. Turning this on means a stolen password is not enough on its own.'}
        </p>
        <button type="button" className="pbtn pbtn--gold" onClick={start} disabled={busy}>
          Set up two-step sign-in
        </button>
      </Panel>
    )
  }

  return (
    <Panel title="Two-step sign-in">
      <p className="p-note">
        On since {new Date(state.confirmedAt).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}.{' '}
        {state.recoveryCodesLeft} recovery {state.recoveryCodesLeft === 1 ? 'code' : 'codes'} left.
        {state.recoveryCodesLeft <= 2 && ' Worth making a new set.'}
      </p>

      <form className="p-form-grid p-form-grid--narrow" onSubmit={regenerate}>
        <TextField label="Code from your app" value={code} onChange={setCode} placeholder="000000" autoComplete="one-time-code" wide />
        <div className="p-row p-field--wide">
          <button type="submit" className="pbtn" disabled={busy || code.trim().length < 6}>
            New recovery codes
          </button>
        </div>
      </form>

      {!state.required && (
        <details className="p-details">
          <summary>Turn two-step sign-in off</summary>
          <form className="p-form-grid p-form-grid--narrow" onSubmit={disable}>
            <TextField label="Your password" type="password" value={password} onChange={setPassword} autoComplete="current-password" required wide />
            <TextField label="Code from your app" value={code} onChange={setCode} placeholder="000000" required />
            <div className="p-row p-field--wide">
              <button type="submit" className="pbtn pbtn--danger" disabled={busy || !password || code.trim().length < 6}>
                Turn it off
              </button>
            </div>
          </form>
        </details>
      )}
    </Panel>
  )
}

/** The QR square, drawn from the otpauth address. */
function Qr({ text }) {
  const [svg, setSvg] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    let live = true
    import('qrcode').then(({ default: QRCode }) =>
      QRCode.toString(text, { type: 'svg', margin: 1, width: 196, color: { dark: '#0b0b0e', light: '#ffffff' } }).then(
        (out) => live && setSvg(out),
      ),
    )
    return () => {
      live = false
    }
  }, [text])
  // the svg comes from the QR library in this page, not from anything a visitor typed
  useEffect(() => {
    if (ref.current) ref.current.replaceChildren()
    if (ref.current && svg) {
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
      const node = doc.documentElement
      if (node?.tagName === 'svg') ref.current.append(node)
    }
  }, [svg])
  return <div ref={ref} className="p-qr__box" aria-label="QR code for your authenticator app" role="img" />
}

function copyAll(codes) {
  navigator.clipboard?.writeText(codes.join('\n')).catch(() => {})
}

function downloadCodes(codes) {
  const blob = new Blob([`Recovery codes\n\nEach one works once.\n\n${codes.join('\n')}\n`], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'recovery-codes.txt'
  a.click()
  URL.revokeObjectURL(url)
}
