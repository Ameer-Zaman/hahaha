/**
 * Tiny client for the website API. The website always calls its own /api path: Vite forwards
 * it to the local server in development and Netlify forwards it to Render in production, so
 * the admin session cookie is first-party and no API address is baked into the build.
 */
export const USE_API = import.meta.env.VITE_USE_API !== 'false'

/** Optional direct address of the API, used only for big uploads (see client/.env.example). */
export const API_DIRECT_URL = (import.meta.env.VITE_API_DIRECT_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, message, code = '') {
    super(message)
    this.status = status
    this.code = code
  }
}

/** Status codes that mean "the server is starting up / unreachable" rather than a real answer. */
export const isWaking = (err) => err instanceof ApiError && [0, 502, 503, 504].includes(err.status)

export async function api(path, { method = 'GET', body, signal, timeout = 0, form } = {}) {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)
  const timer = timeout ? setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), timeout) : 0
  try {
    const headers = { Accept: 'application/json' }
    let payload
    if (form) payload = form
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
    let res
    try {
      res = await fetch(`/api${path}`, { method, headers, body: payload, credentials: 'same-origin', signal: controller.signal })
    } catch (err) {
      if (signal?.aborted) throw err
      throw new ApiError(0, 'The server could not be reached.')
    }
    if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
      // No API behind /api at all: the website's own page came back (its index.html, 200 or 404).
      const ownPage = (res.status === 200 || res.status === 404) && !res.headers.has('x-render-routing')
      if (ownPage) throw new ApiError(404, 'The API server is not connected to this website yet.', 'not_connected')
      // Anything else is the API's host or the forwarder answering for it — asleep, restarting or
      // mid-deploy — so it's worth waiting and trying again rather than giving up.
      throw new ApiError(503, 'The server is starting up.')
    }
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new ApiError(res.status, data?.message ?? `Request failed (${res.status}).`)
    return data
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
