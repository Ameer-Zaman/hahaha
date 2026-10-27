import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

import { env } from './config/env.js'
import { errorHandler, notFound } from './middleware/errors.js'
import { checkOrigin } from './middleware/origin.js'
import { authenticateUpload } from './middleware/uploadToken.js'
import adminRoutes from './routes/admin/index.js'
import { handleUpload, upload } from './routes/admin/media.js'
import authRoutes from './routes/auth.js'
import chatRoutes from './routes/chat.js'
import mediaRoutes from './routes/media.js'
import publicRoutes from './routes/public.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', env.trustProxy)

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  // The website normally calls the API through its own /api proxy (same origin). CORS is
  // only for local development or a direct call from an allowed origin.
  app.use(cors({ origin: env.allowedOrigins, credentials: true }))
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (req, res) => res.json({ ok: true }))

  app.use('/api/public', publicRoutes)
  app.use('/api/media', mediaRoutes)
  app.use('/api/chat', checkOrigin, chatRoutes)
  app.use('/api/auth', checkOrigin, authRoutes)
  app.use('/api/admin', checkOrigin, adminRoutes)
  // Direct upload (bypasses the website proxy for big videos). Token-authenticated, no cookies.
  app.post('/api/upload', checkOrigin, authenticateUpload, upload.single('file'), handleUpload)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
