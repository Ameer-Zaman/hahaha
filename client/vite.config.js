import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // In development, /api/* is forwarded to the local API server (server/), so the website and
  // the API share one origin — exactly like production, where Netlify forwards /api to Render.
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:4000'
  const proxy = { '/api': { target: apiTarget, changeOrigin: false } }
  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
    build: {
      // Built JS/CSS go to /static (cached forever, filenames are hashed).
      // /assets is left for your own files, e.g. public/assets/video/home.mp4.
      assetsDir: 'static',
    },
  }
})
