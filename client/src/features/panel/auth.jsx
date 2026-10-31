import { useCallback, useEffect, useMemo, useState } from 'react'

import { AuthContext } from './authContext'
import { authApi, withWake } from './panelApi'

/**
 * Who is signed in to the panel. The session itself is an httpOnly cookie the browser keeps;
 * this only mirrors the account the server reports. Roles are enforced by the server — the
 * panel hides what an account can't use, but hiding is never the protection.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'checking', user: null, waking: false })

  useEffect(() => {
    let alive = true
    withWake(() => authApi.me(), { onWaking: () => alive && setState((s) => ({ ...s, waking: true })) })
      .then(({ user }) => alive && setState({ status: 'in', user, waking: false }))
      .catch((err) => {
        if (!alive) return
        const status = err.code === 'not_connected' ? 'unconnected' : err.status === 401 ? 'out' : 'down'
        setState({ status, user: null, waking: false, error: err.message })
      })
    return () => {
      alive = false
    }
  }, [])

  /**
   * The password step. An account with two-step sign-in gets no session here — only a
   * ticket saying the password was right, which the code step then exchanges.
   */
  const signIn = useCallback(async (email, password, onWaking) => {
    const res = await withWake(() => authApi.login(email, password), { onWaking, tries: 6 })
    if (res.twoFactor) return { twoFactor: true, ticket: res.ticket }
    setState({ status: 'in', user: res.user, waking: false, mustSetUpTwoFactor: res.mustSetUpTwoFactor })
    return { user: res.user }
  }, [])

  /** The code step: six digits from the app, or a recovery code. */
  const signInTwoFactor = useCallback(async (ticket, code) => {
    const res = await authApi.loginTwoFactor(ticket, code)
    setState({ status: 'in', user: res.user, waking: false, mustSetUpTwoFactor: res.mustSetUpTwoFactor })
    return res.user
  }, [])

  /** Called once two-step sign-in has been set up, so the panel stops asking. */
  const twoFactorDone = useCallback(() => {
    setState((s) => ({ ...s, mustSetUpTwoFactor: false, user: s.user ? { ...s.user, twoFactor: true } : s.user }))
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setState({ status: 'out', user: null, waking: false })
    }
  }, [])

  /** Call with any API error: a 401 means the session ended, so return to the sign-in screen. */
  const handleError = useCallback((err) => {
    if (err?.status === 401) setState({ status: 'out', user: null, waking: false, expired: true })
  }, [])

  const value = useMemo(
    () => ({ ...state, isSuper: state.user?.role === 'superadmin', signIn, signInTwoFactor, twoFactorDone, signOut, handleError }),
    [state, signIn, signInTwoFactor, twoFactorDone, signOut, handleError],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
