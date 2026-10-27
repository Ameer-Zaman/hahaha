import { Router } from 'express'

import { ChatSession } from '../../models/ChatSession.js'
import { Settings } from '../../models/Settings.js'
import { discordStatus } from '../../services/discordBridge.js'

/** Panel → Website chat: is it on, is Discord connected, and the latest staff chats (read-only). */
const router = Router()

router.get('/', async (req, res) => {
  const [settings, chats] = await Promise.all([
    Settings.findOne({ key: 'main' }, 'sections').lean(),
    ChatSession.find({}, 'publicId nickname status blocked messages lastAt createdAt').sort({ lastAt: -1 }).limit(40).lean(),
  ])
  res.json({
    on: settings?.sections?.chat !== false,
    discord: discordStatus(),
    chats: chats.map((c) => ({
      id: c.publicId,
      nickname: c.nickname,
      status: c.status,
      blocked: c.blocked,
      lastAt: c.lastAt,
      createdAt: c.createdAt,
      messages: c.messages.map((m) => ({ from: m.from, name: m.name, text: m.text, at: m.at })),
    })),
  })
})

export default router
