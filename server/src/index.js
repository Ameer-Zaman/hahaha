import { env } from './config/env.js'
import { createApp } from './app.js'
import { connectDb, disconnectDb } from './db.js'
import { bootstrapSuperAdmin } from './services/bootstrap.js'
import { startDiscord } from './services/discordBridge.js'

async function main() {
  await connectDb()
  await bootstrapSuperAdmin()
  startDiscord() // website chat → Discord (optional; logs and carries on if it can't connect)
  const server = createApp().listen(env.port, () => {
    console.log(`Rameirah Empire API listening on port ${env.port}`)
  })

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`)
    server.close()
    await disconnectDb()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  console.error('Failed to start:', err.message)
  process.exit(1)
})
