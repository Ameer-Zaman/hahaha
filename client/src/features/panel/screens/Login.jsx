import { useState } from 'react'

import { site } from '../../../config/site'
import { useAuth } from '../authContext'

/** Sign-in for website staff. There is no sign-up: a Super Admin creates every account. */
export default function Login() {
  const { signIn, signInTwoFactor, expired } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(expired ? 'Your session ended. Please sign in again.' : '')
  const [busy, setBusy] = useState(false)
  const [waking, setWaking] = useState(false)
  // set once the password is accepted on an account that uses two-step sign-in
  const [ticket, setTicket] = useState(null)
  const [code, setCode] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await signIn(email, password, () => setWaking(true))
      if (res?.twoFactor) setTicket(res.ticket)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      setWaking(false)
    }
  }

  async function submitCode(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signInTwoFactor(ticket, code)
    } catch (err) {
      setError(err.message)
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  // Second step: the password was right, now the phone.
  if (ticket) {
    return (
      <main className="p-login">
        <form className="p-login__card" onSubmit={submitCode} noValidate>
          <p className="p-brand">
            {site.name}
            <span>Panel</span>
          </p>
          <h1 className="p-login__title">Enter your code</h1>
          <p className="p-login__sub">
            Open your authenticator app and type the six digits for {site.name}. A recovery code works too.
          </p>

          <div className="p-field">
            <label className="p-field__label" htmlFor="login-code">
              Code
            </label>
            <input
              id="login-code"
              className="p-input p-input--code"
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              autoFocus
              required
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          {error && (
            <p className="p-form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="pbtn pbtn--gold pbtn--block" disabled={busy || code.trim().length < 6}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
          <button
            type="button"
            className="p-login__back pbtn--plain"
            onClick={() => {
              setTicket(null)
              setCode('')
              setPassword('')
              setError('')
            }}
          >
            ← Start again
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="p-login">
      <form className="p-login__card" onSubmit={submit} noValidate>
        <p className="p-brand">
          {site.name}
          <span>Panel</span>
        </p>
        <h1 className="p-login__title">Sign in</h1>
        <p className="p-login__sub">For the administration team. Accounts are created by a Super Admin.</p>

        <div className="p-field">
          <label className="p-field__label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="p-input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="p-field">
          <label className="p-field__label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className="p-input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="p-form-error" role="alert">
            {error}
          </p>
        )}
        {waking && (
          <p className="p-form-note" role="status">
            The server is waking up — this can take up to a minute the first time.
          </p>
        )}

        <button type="submit" className="pbtn pbtn--gold pbtn--block" disabled={busy || !email || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <a className="p-login__back" href="/">
          ← Back to the website
        </a>
      </form>
    </main>
  )
}
