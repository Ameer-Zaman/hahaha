/**
 * Cloudflare Workers entry (used when the site is deployed as a Worker with static assets,
 * see wrangler.jsonc at the repo root). Website files are served straight from Cloudflare;
 * only /api/* reaches this code, which forwards it to the API on Render with edge caching —
 * the same code the Cloudflare Pages setup uses (client/functions/api/[[path]].js).
 */
import { onRequest } from '../functions/api/[[path]].js'

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url)
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return onRequest({ request, env, waitUntil: (p) => ctx.waitUntil(p) })
    }
    return env.ASSETS.fetch(request)
  },
}
