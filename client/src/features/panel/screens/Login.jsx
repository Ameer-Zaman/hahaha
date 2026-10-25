import { useState } from 'react'

import { site } from '../../../config/site'
import { useAuth } from '../authContext'

/** Sign-in for website staff. There is no sign-up: a Super Admin creates every account. */
export default function Login() {
  const { signIn, expired } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(expired ? 'Your session ended. Please sign in again.' : '')
  const [busy, setBusy] = useState(false)
  const [waking, setWaking] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(email, password, () => setWaking(true))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      setWaking(false)
    }
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
