import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { useAuth } from './authContext'

export const ToastContext = createContext(() => {})

export const useToast = () => useContext(ToastContext)

/* ------------------------------------------------------------ data loading */

/**
 * Loads something from the API for a screen: { data, error, loading, reload, setData }.
 * A 401 sends the panel back to sign-in.
 */
export function useResource(load, deps = []) {
  const { handleError } = useAuth()
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const loadRef = useRef(load)
  loadRef.current = load

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await loadRef.current()
      setState({ data, error: null, loading: false })
    } catch (err) {
      handleError(err)
      setState((s) => ({ ...s, error: err.message, loading: false }))
    }
  }, [handleError])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void reload(), deps)

  const setData = useCallback((update) => setState((s) => ({ ...s, data: typeof update === 'function' ? update(s.data) : update })), [])
  return { ...state, reload, setData }
}

/** Wraps an action (save, delete …): tracks busy state, shows a toast, handles session expiry. */
export function useAction() {
  const { handleError } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const run = useCallback(
    async (fn, success) => {
      setBusy(true)
      try {
        const result = await fn()
        if (success) toast(success)
        return result
      } catch (err) {
        handleError(err)
        toast(err.message, 'error')
        return undefined
      } finally {
        setBusy(false)
      }
    },
    [handleError, toast],
  )
  return [run, busy]
}
