import { z } from 'zod'

const text = (max) => z.string().trim().max(max)
const mediaId = z.string().regex(/^[a-f0-9]{24}$/, 'invalid media id').nullable().optional()
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

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: text(80).min(1),
  role: z.enum(['admin', 'superadmin']).default('admin'),
  password: passwordSchema,
})

export const updateUserSchema = z.object({
  name: text(80).min(1).optional(),
  role: z.enum(['admin', 'superadmin']).optional(),
  active: z.boolean().optional(),
  password: passwordSchema.optional(),
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
  headline: text(160).optional().default(''),
  description: text(2000).optional().default(''),
  image: mediaId,
  emblem: mediaId,
  video: mediaId,
  verified: z.boolean().optional().default(true),
  order: z.number().int().min(0).max(9999).optional().default(0),
  members: z.array(memberSchema).max(200).optional().default([]),
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

export const staffSchema = z.object({
  name: text(60).min(1),
  role: text(60).min(1),
  portrait: mediaId,
  order: z.number().int().min(0).max(9999).optional().default(0),
  online: z.boolean().optional().default(false),
  onDuty: z.boolean().optional().default(false),
})

export const staffStatusSchema = z.object({
  online: z.boolean(),
  onDuty: z.boolean(),
})

const ruleId = z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/, 'use lowercase letters, numbers and dashes')

export const ruleBookSchema = z.object({
  categories: z
    .array(
      z.object({
        id: ruleId,
        title: text(80).min(1),
        summary: text(240).optional().default(''),
        rules: z
          .array(z.object({ id: ruleId, title: text(120).min(1), text: text(2000).min(1) }))
          .max(100),
      }),
    )
    .max(40),
})

export const settingsMediaSchema = z.object({
  media: z.record(z.string(), z.string().regex(/^[a-f0-9]{24}$/).nullable()),
})
