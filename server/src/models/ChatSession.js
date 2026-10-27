import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    from: { type: String, enum: ['visitor', 'bot', 'staff', 'system'], required: true },
    name: { type: String, default: '' },
    text: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
)

/**
 * One website chat. `token` is a hash of the visitor's secret (the visitor keeps the secret in
 * their browser), so only they can read or write their chat. Chats are deleted automatically
 * 30 days after the last message.
 */
const chatSessionSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true },
    tokenHash: { type: String, required: true },
    nickname: { type: String, required: true, trim: true },
    status: { type: String, enum: ['staff', 'closed'], default: 'staff' },
    blocked: { type: Boolean, default: false },
    threadId: { type: String, default: null, index: true },
    messages: { type: [messageSchema], default: [] },
    lastAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)
chatSessionSchema.index({ lastAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

export const ChatSession = mongoose.model('ChatSession', chatSessionSchema)
