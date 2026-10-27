import { Router } from 'express'

import { validateBody } from '../../middleware/validate.js'
import { ChatSession } from '../../models/ChatSession.js'
import { Settings } from '../../models/Settings.js'
import { audit } from '../../services/audit.js'
import { aiStatus } from '../../services/chatAi.js'
import { discordStatus } from '../../services/discordBridge.js'
import { chatKnowledgeSchema } from '../../validation/schemas.js'

/** Panel → Website chat: connection status, the AI's notes, and recent chats (read-only). */
const router = Router()

router.get('/', async (req, res) => {
  const [settings, chats] = await Promise.all([
    Settings.findOne({ key: 'main' }, 'chatKnowledge sections').lean(),
    ChatSession.find({}, 'publicId nickname status blocked messages lastAt createdAt').sort({ lastAt: -1 }).limit(40).lean(),
  ])
  res.json({
    on: settings?.sections?.chat !== false,
    ai: aiStatus(),
    discord: discordStatus(),
    knowledge: settings?.chatKnowledge ?? '',
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

router.put('/knowledge', validateBody(chatKnowledgeSchema), async (req, res) => {
  await Settings.findOneAndUpdate({ key: 'main' }, { $set: { chatKnowledge: req.body.knowledge } }, { upsert: true })
  await audit(req, 'chat.knowledge', 'chat', `${req.body.knowledge.length} characters`)
  res.json({ ok: true })
})

export default router
