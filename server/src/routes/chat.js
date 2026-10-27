import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import { env } from '../config/env.js'
import { HttpError } from '../middleware/errors.js'
import { validateBody } from '../middleware/validate.js'
import { ChatSession } from '../models/ChatSession.js'
import { Settings } from '../models/Settings.js'
import { aiReply, aiStatus } from '../services/chatAi.js'
import { discordReady, fakeDiscordLog, fakeStaffReply, isFakeDiscord, noteInThread, onStaffMessage, openThread, sendToThread } from '../services/discordBridge.js'
import { chatMessageSchema, chatStartSchema } from '../validation/schemas.js'

/**
 * Website chat for visitors. A chat starts with a nickname; the visitor gets a secret token
 * (kept in their browser) that is needed to read or write it. The AI answers first; "Talk to
 * staff" (or the AI itself) moves the chat to a Discord thread, and staff replies come back here.
 */
const router = Router()
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

const startLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 6, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many new chats. Try again in a few minutes.' } })
const messageLimiter = rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'You’re sending messages too fast. Wait a moment.' } })

const hash = (token) => createHash('sha256').update(token).digest()
const LINK = /(https?:\/\/|www\.|discord\.gg\/)\S+/gi

async function chatOn() {
  const s = await Settings.findOne({ key: 'main' }, 'sections').lean()
  return s?.sections?.chat !== false
}

const view = (session, after = 0) => ({
  id: session.publicId,
  status: session.status,
  blocked: session.blocked,
  staffAvailable: discordReady(),
  total: session.messages.length,
  messages: session.messages.slice(after).map((m) => ({ from: m.from, name: m.from === 'staff' ? m.name : '', text: m.text, at: m.at })),
})

async function loadSession(req) {
  const session = await ChatSession.findOne({ publicId: String(req.params.id) })
  const token = String(req.get('x-chat-token') ?? '')
  if (!session || !token) throw new HttpError(404, 'Chat not found.')
  const a = hash(token)
  const b = Buffer.from(session.tokenHash, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(404, 'Chat not found.')
  return session
}

const push = (session, from, text, name = '') => {
  session.messages.push({ from, name, text, at: new Date() })
  if (session.messages.length > 300) session.messages.splice(0, session.messages.length - 300)
  session.lastAt = new Date()
}

async function handOff(session) {
  if (session.status === 'staff') return
  if (!discordReady()) {
    push(session, 'bot', `Staff chat is offline right now. You can reach the team on our Discord: ${env.chat.discordInvite}`)
    return
  }
  try {
    session.threadId = await openThread(session)
    session.status = 'staff'
    push(session, 'system', 'A staff member has been asked to join. Replies appear here — you can keep this window open or come back later.')
  } catch (err) {
    console.error('Chat hand-off failed:', err.message)
    push(session, 'bot', `I couldn’t reach the staff just now. Please try again in a minute, or message us on Discord: ${env.chat.discordInvite}`)
  }
}

// local testing only (DISCORD_BOT_TOKEN=fake): play the staff side, and see what reached "Discord"
if (isFakeDiscord()) {
  router.get('/__fake/log', (req, res) => res.json(fakeDiscordLog()))
  router.post('/__fake/staff', async (req, res) => {
    await fakeStaffReply(req.body.threadId, req.body.name ?? 'Test Staff', req.body.text)
    res.json({ ok: true })
  })
}

router.post('/start', startLimiter, validateBody(chatStartSchema), async (req, res) => {
  if (!(await chatOn())) throw new HttpError(403, 'The chat is switched off right now.')
  const token = randomBytes(24).toString('base64url')
  const nickname = req.body.name.replace(/[\r\n<>]/g, ' ').trim()
  const session = new ChatSession({
    publicId: randomBytes(9).toString('base64url'),
    tokenHash: hash(token).toString('hex'),
    nickname,
    messages: [
      {
        from: 'bot',
        text: aiStatus().enabled
          ? `Hi ${nickname}! I’m the ${env.chat.siteName} assistant. Ask me anything about the city, the rules or how to join — or tap “Talk to staff” to reach a person.`
          : `Hi ${nickname}! Write your question and tap “Talk to staff” — the team will answer here.`,
      },
    ],
  })
  await session.save()
  res.status(201).json({ token, ...view(session) })
})

router.get('/:id', async (req, res) => {
  const session = await loadSession(req)
  const after = Math.max(0, Number(req.query.after) || 0)
  res.json(view(session, after))
})

router.post('/:id/messages', messageLimiter, validateBody(chatMessageSchema), async (req, res) => {
  const session = await loadSession(req)
  if (session.blocked) throw new HttpError(403, 'This chat has been closed by the staff.')
  const after = session.messages.length
  const text = req.body.text.replace(LINK, '[link removed]')
  if (session.status === 'closed') session.status = session.threadId ? 'staff' : 'bot'
  push(session, 'visitor', text)

  if (session.status === 'staff') {
    try {
      await sendToThread(session.threadId, session.nickname, text)
    } catch {
      push(session, 'system', 'Your message is saved, but the staff chat is offline right now.')
    }
  } else if (session.aiReplies >= 25) {
    push(session, 'bot', 'I’ve answered a lot in this chat — tap “Talk to staff” for anything else.')
  } else {
    try {
      const reply = await aiReply(session.messages)
      session.aiReplies += 1
      if (reply.text) push(session, 'bot', reply.text)
      if (reply.handoff) await handOff(session)
    } catch (err) {
      if (err.message !== 'ai-off') console.error('Chat AI:', err.message)
      if (err.message === 'ai-off') push(session, 'bot', 'Tap “Talk to staff” and the team will answer here.')
      else push(session, 'bot', 'I can’t answer right now. Tap “Talk to staff” to reach the team.')
    }
  }
  await session.save()
  res.json(view(session, after))
})

router.post('/:id/staff', messageLimiter, async (req, res) => {
  const session = await loadSession(req)
  if (session.blocked) throw new HttpError(403, 'This chat has been closed by the staff.')
  const after = session.messages.length
  await handOff(session)
  await session.save()
  res.json(view(session, after))
})

router.post('/:id/close', async (req, res) => {
  const session = await loadSession(req)
  const after = session.messages.length
  if (session.status !== 'closed') {
    session.status = 'closed'
    push(session, 'system', 'You ended the chat.')
    await noteInThread(session.threadId, `*${session.nickname} ended the chat on the website.*`)
    await session.save()
  }
  res.json(view(session, after))
})

/* staff replies from Discord */
onStaffMessage(async ({ threadId, name, text, command, react }) => {
  const session = await ChatSession.findOne({ threadId })
  if (!session) return
  if (command === 'close') {
    session.status = 'closed'
    push(session, 'system', `${name} closed the chat. Thanks for reaching out!`)
  } else if (command === 'block') {
    session.status = 'closed'
    session.blocked = true
    push(session, 'system', 'This chat has been closed by the staff.')
  } else {
    if (session.status === 'closed' && !session.blocked) session.status = 'staff'
    push(session, 'staff', text.slice(0, 1500), name)
  }
  await session.save()
  react()
})

export default router
