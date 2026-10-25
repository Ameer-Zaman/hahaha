import { api, API_DIRECT_URL, ApiError, isWaking } from '../../lib/api'

export { ApiError, isWaking }

/** Admin endpoints (/api/admin/*). All of them need a signed-in website account. */
export const adminApi = {
  get: (path, opts) => api(`/admin${path}`, opts),
  post: (path, body) => api(`/admin${path}`, { method: 'POST', body }),
  put: (path, body) => api(`/admin${path}`, { method: 'PUT', body }),
  patch: (path, body) => api(`/admin${path}`, { method: 'PATCH', body }),
  del: (path) => api(`/admin${path}`, { method: 'DELETE' }),
}

export const authApi = {
  me: () => api('/auth/me', { timeout: 20_000 }),
  login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password }, timeout: 25_000 }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword, newPassword) =>
    api('/auth/password', { method: 'POST', body: { currentPassword, newPassword } }),
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Free hosting puts the API to sleep when nobody uses it; the first request then takes up to
 * a minute while it starts. Retry while the server is waking, telling the UI it's waiting.
 */
export async function withWake(fn, { onWaking, tries = 10, delay = 5000 } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn()
    } catch (err) {
      if (!isWaking(err) || attempt >= tries) throw err
      onWaking?.(attempt)
      await sleep(delay)
    }
  }
}

/* ---------------------------------------------------------------- uploads */

export const UPLOAD_TYPES = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
}
export const UPLOAD_LIMITS = { image: 5 * 1024 * 1024, video: 60 * 1024 * 1024 }
export const ACCEPT = Object.keys(UPLOAD_TYPES).join(',')

export const formatBytes = (n) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`

/** Checks a file before uploading (the server checks again, by its actual bytes). */
export function checkUpload(file) {
  const kind = UPLOAD_TYPES[file.type]
  if (!kind) return 'Only JPG, PNG, WebP or GIF images and MP4 or WebM videos can be uploaded.'
  if (file.size > UPLOAD_LIMITS[kind]) return `${file.name} is too large (max ${formatBytes(UPLOAD_LIMITS[kind])} for ${kind}s).`
  return null
}

// Files above this go straight to the API server when its address is configured, because the
// website's /api proxy stops after 26 seconds.
const DIRECT_ABOVE = 4 * 1024 * 1024

/** Uploads one file to the media library. Resolves with the stored file's description. */
export async function uploadMedia(file, onProgress) {
  const problem = checkUpload(file)
  if (problem) throw new ApiError(400, problem)

  let url = '/api/admin/media'
  const headers = {}
  let withCredentials = true
  if (API_DIRECT_URL && file.size > DIRECT_ABOVE) {
    const { token } = await adminApi.post('/media/upload-token')
    url = `${API_DIRECT_URL}/api/upload`
    headers.Authorization = `Bearer ${token}`
    withCredentials = false
  }

  const form = new FormData()
  form.append('file', file, file.name)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.withCredentials = withCredentials
    xhr.setRequestHeader('Accept', 'application/json')
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.onerror = () => reject(new ApiError(0, 'The upload could not reach the server.'))
    xhr.onload = () => {
      let data = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.file) resolve(data.file)
      else if (xhr.status === 504) reject(new ApiError(504, 'The upload took too long through the website. Set VITE_API_DIRECT_URL to upload big videos directly.'))
      else reject(new ApiError(xhr.status, data?.message ?? `Upload failed (${xhr.status}).`))
    }
    xhr.send(form)
  })
}
