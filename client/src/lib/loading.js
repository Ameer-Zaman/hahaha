import { useEffect, useSyncExternalStore } from 'react'

/**
 * A tiny global "something is loading" counter: a page chunk being fetched, or public data
 * on its way. The gold progress line at the top of the screen follows it.
 */
let active = 0
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())
const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useIsLoading() {
  return useSyncExternalStore(subscribe, () => active > 0)
}

/** While `on` is true, this component counts as "loading". */
export function useLoadingSignal(on) {
  useEffect(() => {
    if (!on) return undefined
    active += 1
    emit()
    return () => {
      active -= 1
      emit()
    }
  }, [on])
}
