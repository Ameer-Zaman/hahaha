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
        setState({ status: err.status === 401 ? 'out' : 'down', user: null, waking: false, error: err.message })
      })
    return () => {
      alive = false
    }
  }, [])

  const signIn = useCallback(async (email, password, onWaking) => {
    const { user } = await withWake(() => authApi.login(email, password), { onWaking, tries: 6 })
    setState({ status: 'in', user, waking: false })
    return user
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
    () => ({ ...state, isSuper: state.user?.role === 'superadmin', signIn, signOut, handleError }),
    [state, signIn, signOut, handleError],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
