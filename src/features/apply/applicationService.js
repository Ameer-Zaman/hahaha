import { integrations } from '../../config/site'

/**
 * Sends an application. Never reports success unless a real endpoint accepted it.
 *
 * Results:
 *   { status: 'not-connected' } — no endpoint configured; nothing was sent or stored
 *   { status: 'sent', reference? } — the server accepted it (2xx)
 *   { status: 'rejected', message } — the server answered with an error
 *   { status: 'failed' } — network failure
 */
export async function submitApplication(payload) {
  const endpoint = integrations.applicationsEndpoint
  if (!endpoint) return { status: 'not-connected' }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) return { status: 'sent', reference: body.reference ?? null }
    return {
      status: 'rejected',
      message: typeof body.message === 'string' ? body.message : 'The application could not be accepted.',
    }
  } catch {
    return { status: 'failed' }
  }
}

export function isSubmissionConnected() {
  return Boolean(integrations.applicationsEndpoint)
}
