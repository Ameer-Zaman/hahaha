/**
 * `npm run dev` — run the API on your own computer with no setup.
 *
 * - No server/.env yet? One is created for you: a random session secret and a first
 *   Super Admin login with a random password (printed below, and kept in server/.env).
 * - No real MONGODB_URI in server/.env? A local MongoDB starts automatically and keeps its
 *   data in server/.local-db/ (the first run downloads MongoDB once, ~100 MB).
 *   Put an Atlas string in MONGODB_URI to use that instead.
 *
 * Local development only: Render runs `npm start`, which never touches any of this.
 */
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env')

function readEnv() {
  if (!existsSync(envPath)) return {}
  const out = {}
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

function banner(lines) {
  const width = Math.max(...lines.map((l) => l.length)) + 4
  console.log(`\n┌${'─'.repeat(width)}┐`)
  for (const l of lines) console.log(`│  ${l.padEnd(width - 2)}│`)
  console.log(`└${'─'.repeat(width)}┘\n`)
}

/* 1 · server/.env: create it on the first run, or fill in what an older one is missing */
if (!existsSync(envPath)) {
  writeFileSync(
    envPath,
    [
      '# Created by `npm run dev` for local development. Never commit this file.',
      '# Leave MONGODB_URI empty to use the built-in local database (server/.local-db/).',
      'MONGODB_URI=',
      'CLIENT_ORIGIN=http://localhost:5173',
      'TRUST_PROXY=1',
      '',
    ].join('\n'),
  )
  console.log('Created server/.env for local development.')
}
{
  const current = readEnv()
  const add = []
  if (!current.JWT_SECRET || current.JWT_SECRET.length < 32) add.push(['JWT_SECRET', randomBytes(48).toString('hex')])
  if (!current.CLIENT_ORIGIN) add.push(['CLIENT_ORIGIN', 'http://localhost:5173'])
  let password = null
  if (!current.SUPERADMIN_EMAIL || !current.SUPERADMIN_PASSWORD) {
    password = randomBytes(9).toString('base64url') // 12 random characters
    add.push(['SUPERADMIN_EMAIL', current.SUPERADMIN_EMAIL || 'admin@shyastha.local'], ['SUPERADMIN_PASSWORD', password])
  }
  if (add.length) {
    // drop empty copies of the keys we're about to set, then append the new values
    const keys = new Set(add.map(([k]) => k))
    const kept = readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=/)
        return !(m && keys.has(m[1]))
      })
    while (kept.length && kept[kept.length - 1] === '') kept.pop()
    kept.push('', '# Added by `npm run dev`', ...add.map(([k, v]) => `${k}=${v}`), '')
    writeFileSync(envPath, kept.join('\n'))
  }
  const env = readEnv()
  banner([
    'Shyastha panel (local)',
    '',
    '  Open:     http://localhost:5173/panel',
    `  Email:    ${env.SUPERADMIN_EMAIL}`,
    `  Password: ${password ? password : '(SUPERADMIN_PASSWORD in server/.env)'}`,
    '',
    'This login is created the first time the database is empty.',
    'It is saved in server/.env (change it in the panel under Account).',
  ])
}

const fileEnv = readEnv()
const childEnv = { ...process.env }

/* 2 · the database: the local one unless a real connection string is set */
const uri = process.env.MONGODB_URI || fileEnv.MONGODB_URI || ''
const isReal = /^mongodb(\+srv)?:\/\//.test(uri) && !uri.includes('<')
let local = null
if (!isReal) {
  let MongoMemoryServer
  try {
    ;({ MongoMemoryServer } = await import('mongodb-memory-server'))
  } catch {
    console.error('The local database needs the dev packages. Run:  npm install --prefix server')
    process.exit(1)
  }
  const dbPath = join(root, '.local-db')
  mkdirSync(dbPath, { recursive: true })
  console.log('Starting the local database (the first run downloads MongoDB, please wait)…')
  try {
    local = await MongoMemoryServer.create({
      instance: { dbPath, storageEngine: 'wiredTiger', dbName: 'shyastha' },
    })
  } catch (err) {
    console.error(`\nThe local database couldn't start: ${err.message.split('\n')[0]}`)
    console.error('Check your internet connection for the one-time MongoDB download, or put a MongoDB Atlas')
    console.error('connection string in MONGODB_URI in server/.env (see README step 2).\n')
    process.exit(1)
  }
  childEnv.MONGODB_URI = local.getUri('shyastha')
  console.log(`Local database ready — data is kept in server/.local-db/`)
}

/* 3 · the API, restarting on code changes */
const api = spawn(process.execPath, ['--watch', '--env-file-if-exists=.env', 'src/index.js'], {
  cwd: root,
  env: childEnv,
  stdio: 'inherit',
})

let stopping = false
const stop = async (code = 0) => {
  if (stopping) return
  stopping = true
  api.kill()
  await local?.stop({ doCleanup: false, force: false }) // keep the data for next time
  process.exit(code)
}
api.on('exit', (code) => stop(code ?? 0))
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
