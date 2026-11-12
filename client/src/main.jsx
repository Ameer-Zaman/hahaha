import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import '@fontsource/anton/latin-400.css'
import '@fontsource/barlow/latin-400'
import '@fontsource/barlow/latin-400-italic'
import '@fontsource/barlow/latin-500'
import '@fontsource/barlow/latin-600'
import '@fontsource/barlow/latin-700'
import '@fontsource/barlow/latin-800'
import '@fontsource/space-mono/latin-400.css'
import '@fontsource/space-mono/latin-700.css'

import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

import App from './app/App'
import { loadPublic } from './lib/publicData'
import { armMusic, configureMusic } from './lib/music'
import { media } from './config/site'

// Start fetching the site's media settings straight away, so videos/images chosen in the
// admin panel are usually known before the first section renders.
loadPublic('/site')
configureMusic(media.music)
armMusic() // the music plays on every visit (from the first click or tap, as browsers require)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
