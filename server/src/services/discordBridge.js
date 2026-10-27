import { ChannelType, Client, Events, GatewayIntentBits, Partials, ThreadAutoArchiveDuration } from 'discord.js'

import { env } from '../config/env.js'

/**
 * The Discord side of the website chat. When a visitor asks for staff, the bot opens a thread
 * for that chat in the chat channel and posts the conversation; staff reply in the thread and
 * their messages go back to the website. In a thread, staff can type !close to end the chat
 * or !block to stop that visitor from writing.
 *
 * Needs DISCORD_BOT_TOKEN and DISCORD_CHAT_CHANNEL_ID; the bot needs the Message Content intent
 * and, in that channel: View Channel, Send Messages, Create Public Threads, Send Messages in
 * Threads, Read Message History.
 */
let client = null
let channel = null
let state = 'off' // off | connecting | ready | error: …
let onStaff = () => {}

/* Local testing only: DISCORD_BOT_TOKEN=fake stands in for Discord (refused in production). */
export const isFakeDiscord = () => env.chat.discordToken === 'fake' && !env.isProd
const fakeLog = []
let fakeThreads = 0
export const fakeDiscordLog = () => fakeLog
export const fakeStaffReply = (threadId, name, text) =>
  onStaff({ threadId, name, text, command: /^!(close|block)\b/i.exec(text)?.[1]?.toLowerCase() ?? null, react: () => {} })

export const discordStatus = () => ({ configured: Boolean(env.chat.discordToken && (env.chat.discordChannelId || isFakeDiscord())), state })
export const discordReady = () => state === 'ready'

/** Called for every staff message in a chat thread: ({ threadId, name, text, command }). */
export function onStaffMessage(handler) {
  onStaff = handler
}

export async function startDiscord() {
  if (isFakeDiscord()) {
    state = 'ready'
    return
  }
  if (!env.chat.discordToken || !env.chat.discordChannelId) return
  state = 'connecting'
  client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel],
  })
  client.once(Events.ClientReady, async () => {
    try {
      channel = await client.channels.fetch(env.chat.discordChannelId)
      if (!channel || channel.type !== ChannelType.GuildText) throw new Error('DISCORD_CHAT_CHANNEL_ID is not a text channel')
      state = 'ready'
      console.log(`Discord chat bridge ready as ${client.user.tag} in #${channel.name}`)
    } catch (err) {
      state = `error: ${err.message}`
      console.error('Discord chat bridge:', err.message)
    }
  })
  client.on(Events.MessageCreate, (message) => {
    if (message.author.bot || !message.channel.isThread() || message.channel.parentId !== env.chat.discordChannelId) return
    const text = message.content.trim()
    if (!text) return
    const command = /^!(close|block)\b/i.exec(text)?.[1]?.toLowerCase() ?? null
    onStaff({
      threadId: message.channel.id,
      name: message.member?.displayName ?? message.author.globalName ?? message.author.username,
      text,
      command,
      react: () => message.react('✅').catch(() => {}),
    })
  })
  client.on(Events.Error, (err) => console.error('Discord:', err.message))
  try {
    await client.login(env.chat.discordToken)
  } catch (err) {
    state = `error: ${err.message}`
    console.error('Discord chat bridge could not log in:', err.message)
  }
}

const clean = (text) => text.replace(/@/g, '@​').slice(0, 1900) // no pings from visitors

/** Opens a thread for a chat and posts the conversation so far. Returns the thread id. */
export async function openThread(session) {
  if (!discordReady()) throw new Error('discord-off')
  if (isFakeDiscord()) {
    const id = `fake-${++fakeThreads}`
    fakeLog.push({ threadId: id, opened: session.nickname, transcript: session.messages.length })
    return id
  }
  const thread = await channel.threads.create({
    name: `🌐 ${session.nickname} · ${session.publicId.slice(0, 6)}`.slice(0, 90),
    autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
    reason: 'Website chat',
  })
  const lines = session.messages
    .filter((m) => m.from !== 'system')
    .slice(-15)
    .map((m) => `**${m.from === 'visitor' ? session.nickname : m.name || 'Website'}:** ${m.text}`)
  const ping = env.chat.discordStaffRoleId ? `<@&${env.chat.discordStaffRoleId}> ` : ''
  await thread.send({
    content: clean(`${lines.join('\n')}`) + `\n\n${ping}**${clean(session.nickname)}** has a question from the website (not answered by the rules). Reply in this thread — your messages appear in their chat. \`!close\` ends it, \`!block\` blocks them.`,
    allowedMentions: { roles: env.chat.discordStaffRoleId ? [env.chat.discordStaffRoleId] : [] },
  })
  return thread.id
}

/** Posts a visitor's message into their thread. */
export async function sendToThread(threadId, nickname, text) {
  if (!discordReady()) throw new Error('discord-off')
  if (isFakeDiscord()) return void fakeLog.push({ threadId, from: nickname, text })
  const thread = await client.channels.fetch(threadId)
  if (thread.archived) await thread.setArchived(false).catch(() => {})
  await thread.send({ content: `**${clean(nickname)}:** ${clean(text)}`, allowedMentions: { parse: [] } })
}

export async function noteInThread(threadId, text) {
  if (!discordReady() || !threadId) return
  if (isFakeDiscord()) return void fakeLog.push({ threadId, note: text })
  const thread = await client.channels.fetch(threadId).catch(() => null)
  await thread?.send({ content: text, allowedMentions: { parse: [] } }).catch(() => {})
}
