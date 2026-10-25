import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Built JS/CSS go to /static (cached forever, filenames are hashed).
    // /assets is left for your own files, e.g. public/assets/video/home.mp4.
    assetsDir: 'static',
  },
})
