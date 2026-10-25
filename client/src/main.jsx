import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import '@fontsource/anton/latin-400.css'
import '@fontsource-variable/archivo/wght.css'
import '@fontsource/space-mono/latin-400.css'
import '@fontsource/space-mono/latin-700.css'

import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

import App from './app/App'
import { loadPublic } from './lib/publicData'
import { configureMusic } from './lib/music'
import { media } from './config/site'

// Start fetching the site's media settings straight away, so videos/images chosen in the
// admin panel are usually known before the first section renders.
loadPublic('/site')
configureMusic(media.music)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
