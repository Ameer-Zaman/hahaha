import { z } from 'zod'

import { SECTION_KEYS } from '../models/Settings.js'
import { PANEL_AREAS } from '../models/User.js'

const text = (max) => z.string().trim().max(max)
const mediaId = z
  .string()
  .regex(/^[a-f0-9]{24}$/, 'invalid media id')
  .nullable()
  .optional()
const objectId = z.string().regex(/^[a-f0-9]{24}$/, 'invalid id')
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use lowercase letters, numbers and dashes')

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
})

export const passwordSchema = z.string().min(10, 'at least 10 characters').max(200)

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
})

/** Six digits from the app, or a recovery code (with or without its dash). */
const secondFactor = z.string().trim().min(6, 'enter the code').max(20)

export const twoFactorLoginSchema = z.object({
  ticket: z.string().min(10).max(2000),
  code: secondFactor,
})

export const twoFactorCodeSchema = z.object({ code: secondFactor })

/**
 * A date-time from the panel, or nothing at all.
 *
 * `z.null()` has to come first: `z.coerce.date()` happily turns null into 1970, which made
 * an empty start and finish look like two equal dates and fail the check below.
 */
const when = z.preprocess((v) => (v === '' || v === undefined ? null : v), z.union([z.null(), z.coerce.date()])).default(null)

export const announcementSchema = z
  .object({
    title: text(120).min(1, 'give it a title'),
    body: z.string().trim().max(4000).optional().default(''),
    tone: z.enum(['news', 'good', 'warning']).default('news'),
    status: z.enum(['draft', 'published']).default('draft'),
    pinned: z.boolean().default(false),
    startsAt: when,
    endsAt: when,
    // only ordinary links: a javascript: address in a headline is a way to run code
    linkUrl: z
      .union([
        z
          .string()
          .trim()
          .url()
          .max(500)
          .refine((u) => /^https?:\/\//i.test(u), 'use a http:// or https:// address'),
        z.literal(''),
      ])
      .optional()
      .default(''),
    linkLabel: text(60).optional().default(''),
  })
  .refine((a) => !a.startsAt || !a.endsAt || a.endsAt > a.startsAt, {
    message: 'the finish must be after the start',
    path: ['endsAt'],
  })

/** A web address people can safely be sent to: http(s) only, never javascript: or data:. */
const webLink = z
  .union([
    z
      .string()
      .trim()
      .url()
      .max(500)
      .refine((u) => /^https?:\/\//i.test(u), 'use a http:// or https:// address'),
    z.literal(''),
  ])
  .optional()
  .default('')

export const eventSchema = z
  .object({
    slug,
    title: text(100).min(1, 'give it a title'),
    category: text(40).optional().default('Event'),
    status: z.enum(['draft', 'published', 'cancelled']).default('draft'),
    statusNote: text(200).optional().default(''),
    startsAt: z.coerce.date({ message: 'pick when it starts' }),
    endsAt: when,
    location: text(80).optional().default(''),
    host: text(80).optional().default(''),
    summary: text(240).optional().default(''),
    description: z.string().trim().max(4000).optional().default(''),
    schedule: z
      .array(z.object({ time: text(20).optional().default(''), item: text(160).min(1, 'describe this part of the event') }))
      .max(30)
      .optional()
      .default([]),
    requirements: z.array(text(160).min(1)).max(20).optional().default([]),
    prizes: z
      .array(z.object({ place: text(30).optional().default(''), prize: text(160).min(1, 'describe the prize') }))
      .max(10)
      .optional()
      .default([]),
    capacity: z.coerce.number().int().min(0).max(10000).optional().default(0),
    signupUrl: webLink,
    signupLabel: text(40).optional().default(''),
    image: mediaId,
    featured: z.boolean().optional().default(false),
  })
  .refine((e) => !e.endsAt || e.endsAt > e.startsAt, { message: 'the finish must be after the start', path: ['endsAt'] })

/** The site logo: a picture from the media library, or null to go back to the placeholder. */
export const settingsBrandSchema = z.object({ logo: mediaId })

export const settingsChatBotSchema = z.object({
  name: text(30).min(1, 'give the bot a name'),
  avatar: mediaId.default(null),
})

export const settingsSecuritySchema = z.object({ requireTwoFactor: z.boolean() })

export const twoFactorOffSchema = z.object({
  password: z.string().min(1).max(200),
  code: secondFactor,
})

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: text(80).min(1),
  role: z.enum(['admin', 'superadmin']).default('admin'),
  password: passwordSchema,
  access: z.array(z.enum(PANEL_AREAS)).max(PANEL_AREAS.length).optional().default([]),
})

export const updateUserSchema = z.object({
  name: text(80).min(1).optional(),
  role: z.enum(['admin', 'superadmin']).optional(),
  active: z.boolean().optional(),
  password: passwordSchema.optional(),
  access: z.array(z.enum(PANEL_AREAS)).max(PANEL_AREAS.length).optional(),
})

const memberSchema = z.object({
  name: text(60).min(1),
  role: text(40).optional().default('Member'),
  since: text(20).optional().default(''),
})

export const gangSchema = z.object({
  slug,
  name: text(60).min(1),
  type: text(40).optional().default('Gang'),
  established: text(40).optional().default(''),
  territory: text(60).optional().default(''),
  leader: text(60).optional().default(''),
  coLeaders: text(160).optional().default(''),
  igl: text(60).optional().default(''),
  color: z
    .string()
    .trim()
    .regex(/^(#[0-9a-fA-F]{6})?$/, 'Colour must look like #e3b55a')
    .transform((v) => v.toLowerCase())
    .optional()
    .default(''),
  suspendedUntil: when,
  headline: text(160).optional().default(''),
  description: text(2000).optional().default(''),
  image: mediaId,
  emblem: mediaId,
  video: mediaId,
  verified: z.boolean().optional().default(true),
  order: z.number().int().min(0).max(9999).optional().default(0),
  members: z.array(memberSchema).max(200).optional().default([]),
})

export const clubSchema = z.object({
  slug,
  name: text(60).min(1),
  type: text(40).optional().default('Club'),
  owner: text(60).optional().default(''),
  location: text(60).optional().default(''),
  description: text(600).optional().default(''),
  emblem: mediaId,
  order: z.number().int().min(0).max(9999).optional().default(0),
})

/**
 * Bulk player import: { mode, gangs: { "<gang-slug>": [{ name, role, since }, …] } }.
 * 'replace' swaps each listed gang's players for the imported ones; 'append' adds the new
 * names and updates the role/since of names already on the list.
 */
export const importPlayersSchema = z.object({
  mode: z.enum(['replace', 'append']).default('append'),
  gangs: z
    .record(slug, z.array(memberSchema).max(200))
    .refine((g) => Object.keys(g).length > 0, 'nothing to import')
    .refine((g) => Object.keys(g).length <= 100, 'too many gangs in one import'),
})

export const warSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD'),
    sides: z.tuple([objectId, objectId]),
    winner: objectId.nullable(),
    result: text(120).optional().default(''),
  })
  .refine((w) => w.sides[0] !== w.sides[1], { message: 'pick two different gangs', path: ['sides'] })
  .refine((w) => w.winner === null || w.sides.includes(w.winner), { message: 'the winner must be one of the two gangs', path: ['winner'] })

const stat = z.number().int().min(0).max(1_000_000)

export const tdmBoardSchema = z.object({
  season: text(60).optional().default(''),
  players: z
    .array(
      z.object({
        name: text(60).min(1),
        kills: stat.optional().default(0),
        deaths: stat.optional().default(0),
        wins: stat.optional().default(0),
        matches: stat.optional().default(0),
      }),
    )
    .max(500, 'at most 500 players')
    .refine((list) => new Set(list.map((p) => p.name.toLowerCase())).size === list.length, 'each player can only be listed once'),
})

/** Each social link must be an https address on that platform's own site. */
export const SOCIAL_HOSTS = {
  discord: ['discord.com', 'discord.gg', 'discordapp.com'],
  youtube: ['youtube.com', 'youtu.be'],
  twitch: ['twitch.tv'],
  kick: ['kick.com'],
  tiktok: ['tiktok.com'],
  instagram: ['instagram.com'],
  x: ['x.com', 'twitter.com'],
  facebook: ['facebook.com', 'fb.com'],
}

const socialUrl = (platform) =>
  z
    .string()
    .trim()
    .max(300)
    .refine((value) => {
      if (!value) return true
      try {
        const url = new URL(value)
        const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '')
        return url.protocol === 'https:' && SOCIAL_HOSTS[platform].some((h) => host === h || host.endsWith(`.${h}`))
      } catch {
        return false
      }
    }, `must be an https link on ${SOCIAL_HOSTS[platform][0]}`)

/** The community's links for the header and footer: known platforms only, each on its own site. */
export const settingsSocialsSchema = z.object({
  links: z
    .array(
      z
        .object({ platform: z.enum(Object.keys(SOCIAL_HOSTS)), url: z.string().trim().min(1, 'add the link').max(300) })
        .superRefine((link, ctx) => {
          const check = socialUrl(link.platform).safeParse(link.url)
          if (!check.success) ctx.addIssue({ code: 'custom', path: ['url'], message: `${link.platform}: ${check.error.issues[0].message}` })
        }),
    )
    .max(12, 'at most 12 links')
    .refine((list) => new Set(list.map((l) => l.url.toLowerCase())).size === list.length, 'each link only once'),
})

export const staffSocialsSchema = z
  .object(Object.fromEntries(Object.keys(SOCIAL_HOSTS).map((p) => [p, socialUrl(p).optional()])))
  .strict()
  .transform((links) => Object.fromEntries(Object.entries(links).filter(([, v]) => v)))

export const staffSchema = z.object({
  name: text(60).min(1),
  role: text(60).min(1),
  department: text(40).optional().default(''),
  socials: staffSocialsSchema.optional().default({}),
  portrait: mediaId,
  order: z.number().int().min(0).max(9999).optional().default(0),
  online: z.boolean().optional().default(false),
  onDuty: z.boolean().optional().default(false),
})

/** Card effects and logo decorations a creator card can have (see client creators.css). */
export const CREATOR_EFFECTS = ['none', 'aurora', 'neon', 'shine', 'sparkles', 'embers', 'snow', 'confetti', 'hearts']
export const CREATOR_DECORATIONS = ['none', 'glow', 'spin', 'orbit', 'ripple']
export const CREATOR_FRAMES = ['none', 'thorns', 'filigree', 'chains', 'crown', 'custom']

/** A creator card: name, a short line, photo and channel links (same rules as staff links). */
export const creatorSchema = z.object({
  name: text(60).min(1),
  tagline: text(100).optional().default(''),
  photo: mediaId,
  banner: mediaId,
  look: z
    .object({
      effect: z.enum(CREATOR_EFFECTS).default('none'),
      decoration: z.enum(CREATOR_DECORATIONS).default('none'),
      accent: z
        .string()
        .trim()
        .regex(/^#[0-9a-f]{6}$/i, 'accent must be a colour like #e3b55a')
        .default('#e3b55a'),
      frame: z.enum(CREATOR_FRAMES).default('none'),
      frameImage: mediaId,
    })
    .optional()
    .default({ effect: 'none', decoration: 'none', accent: '#e3b55a', frame: 'none', frameImage: null }),
  photoSource: z.enum(['auto', 'upload', 'youtube', 'kick', 'twitch']).optional().default('auto'),
  bannerSource: z.enum(['auto', 'upload', 'youtube', 'kick', 'twitch']).optional().default('auto'),
  links: staffSocialsSchema.optional().default({}),
  order: z.number().int().min(0).max(9999).optional().default(0),
  visible: z.boolean().optional().default(true),
})

/** A link a Buy button may open: https only (a Discord ticket channel, Tebex, a DM link …). */
const buyLink = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    if (!v) return true
    try {
      return new URL(v).protocol === 'https:'
    } catch {
      return false
    }
  }, 'the buy link must start with https://')

export const STORE_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR', 'CAD', 'AUD', 'MYR', 'LKR', 'PKR', 'BDT']
export const STORE_BADGES = ['', 'new', 'popular', 'limited', 'sale']
const money = z.number().min(0).max(1_000_000).nullable().optional().default(null)

/** A product in the Store (see models/Product.js). */
export const productSchema = z
  .object({
    slug,
    name: text(70).min(1),
    kind: z.enum(['asset', 'item']).default('asset'),
    category: text(30).optional().default(''),
    tagline: text(140).optional().default(''),
    description: text(3000).optional().default(''),
    features: z.array(text(120).min(1)).max(12, 'at most 12 points').optional().default([]),
    specs: z
      .array(z.object({ label: text(30).min(1), value: text(80).min(1) }))
      .max(10, 'at most 10 rows')
      .optional()
      .default([]),
    price: money,
    oldPrice: money,
    currency: z.enum(STORE_CURRENCIES).default('USD'),
    priceNote: text(30).optional().default(''),
    badge: z.enum(STORE_BADGES).optional().default(''),
    cover: mediaId,
    gallery: z
      .array(z.string().regex(/^[a-f0-9]{24}$/, 'invalid media id'))
      .max(8, 'at most 8 pictures')
      .optional()
      .default([]),
    video: mediaId,
    buyUrl: buyLink.optional().default(''),
    featured: z.boolean().optional().default(false),
    soldOut: z.boolean().optional().default(false),
    visible: z.boolean().optional().default(true),
    order: z.number().int().min(0).max(9999).optional().default(0),
  })
  .refine((p) => p.oldPrice === null || p.price === null || p.oldPrice > p.price, {
    path: ['oldPrice'],
    message: 'the old price must be higher than the price',
  })

/** Panel → Store: where Buy buttons go by default, and a short line under the title. */
export const storeSettingsSchema = z.object({
  buyUrl: buyLink.optional().default(''),
  note: text(200).optional().default(''),
})

/** Staff switching a creator to "live now" by hand, for a while, with where to watch. */
export const creatorManualLiveSchema = z.object({
  minutes: z.number().int().min(15).max(720),
  platform: z.enum(['twitch', 'kick', 'youtube', 'tiktok', 'instagram', 'facebook', 'x', 'other']),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => {
      try {
        return ['https:', 'http:'].includes(new URL(v).protocol)
      } catch {
        return false
      }
    }, 'must be a link (https://…)'),
  title: text(120).optional().default(''),
})

export const staffStatusSchema = z.object({
  online: z.boolean(),
  onDuty: z.boolean(),
})

const ruleId = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9-]+$/, 'use lowercase letters, numbers and dashes')

export const ruleBookSchema = z.object({
  categories: z
    .array(
      z.object({
        id: ruleId,
        title: text(80).min(1),
        summary: text(240).optional().default(''),
        rules: z
          .array(
            z.object({
              id: ruleId,
              title: text(120).min(1),
              text: text(2000).min(1),
              level: z.enum(['standard', 'serious', 'zero']).optional().default('standard'),
              penalty: text(160).optional().default(''),
            }),
          )
          .max(100),
      }),
    )
    .max(40),
  extras: z
    .object({
      notice: text(600).optional().default(''),
      penalties: z
        .array(z.object({ title: text(60).min(1), text: text(300).optional().default('') }))
        .max(8)
        .optional()
        .default([]),
      appeals: text(1200).optional().default(''),
      glossary: z
        .array(z.object({ term: text(40).min(1), meaning: text(300).min(1) }))
        .max(40)
        .optional()
        .default([]),
    })
    .optional()
    .default({ notice: '', penalties: [], appeals: '', glossary: [] }),
})

export const settingsSiteSchema = z
  .object({
    sections: z
      .partialRecord(z.enum(SECTION_KEYS), z.boolean()) // the same list as the model, so a new section can't be missed
      .optional(),
    maintenance: z
      .object({
        on: z.boolean(),
        message: z.string().trim().max(300).default(''),
      })
      .optional(),
  })
  .strict()
  .refine((v) => v.sections || v.maintenance, 'Nothing to change.')

export const uploadTicketSchema = z.object({ kind: z.enum(['image', 'video']) })

export const cloudUploadSchema = z.object({
  publicId: z.string().trim().min(1).max(300),
  version: z.coerce.number().int().positive(),
  signature: z.string().regex(/^[a-f0-9]{40}$/),
  resourceType: z.enum(['image', 'video']),
  name: z.string().trim().max(200).optional().default(''),
})

export const settingsMediaSchema = z.object({
  media: z.record(
    z.string(),
    z
      .string()
      .regex(/^[a-f0-9]{24}$/)
      .nullable(),
  ),
})

/* ---- website chat ---- */
export const chatStartSchema = z.object({ name: text(30).min(1, 'Enter a name'), text: text(600).min(1, 'Write your question') })
export const chatMessageSchema = z.object({ text: text(600).min(1, 'Write a message') })
/** A rules question for the AI helper, with the last few lines of the chat for follow-ups. */
export const chatAskSchema = z.object({
  question: text(600).min(1, 'Write your question'),
  history: z
    .array(z.object({ from: z.enum(['visitor', 'bot']), text: text(900) }))
    .max(6)
    .default([]),
})

/** Panel → Live: a live gang situation with its stream link. */
export const liveAlertSchema = z
  .object({
    gangA: z.string().trim().toLowerCase().min(1, 'choose the first gang').max(80),
    gangB: z.string().trim().toLowerCase().min(1, 'choose the second gang').max(80),
    title: text(80).optional().default(''),
    url: z
      .string()
      .trim()
      .url('paste the full link to the stream')
      .max(500)
      .refine((u) => /^https?:\/\//i.test(u), 'use a http:// or https:// address'),
    note: text(200).optional().default(''),
    /** How long it stays up unless ended earlier, in minutes (15 min to 12 hours). */
    minutes: z.coerce.number().int().min(15).max(720).default(120),
  })
  .refine((v) => v.gangA !== v.gangB, { message: 'pick two different gangs', path: ['gangB'] })
