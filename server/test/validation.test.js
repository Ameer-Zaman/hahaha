// Unit tests that need no database. Run with: npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/test'
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-123'

const { gangSchema, warSchema, createUserSchema, ruleBookSchema, staffSchema } = await import('../src/validation/schemas.js')
const { detectType } = await import('../src/services/media.js')

const id = (n) => String(n).padStart(24, 'a')

test('gang slugs must be lowercase words joined by dashes', () => {
  assert.equal(gangSchema.safeParse({ slug: 'harbor-wolves', name: 'Harbor Wolves' }).success, true)
  assert.equal(gangSchema.safeParse({ slug: 'Harbor Wolves', name: 'x' }).success, false)
  assert.equal(gangSchema.safeParse({ slug: '../etc', name: 'x' }).success, false)
})

test('a war needs two different gangs and a winner from those two', () => {
  assert.equal(warSchema.safeParse({ date: '2026-10-01', sides: [id(1), id(2)], winner: id(1) }).success, true)
  assert.equal(warSchema.safeParse({ date: '2026-10-01', sides: [id(1), id(2)], winner: null }).success, true)
  assert.equal(warSchema.safeParse({ date: '2026-10-01', sides: [id(1), id(1)], winner: null }).success, false)
  assert.equal(warSchema.safeParse({ date: '2026-10-01', sides: [id(1), id(2)], winner: id(3) }).success, false)
  assert.equal(warSchema.safeParse({ date: '1 Oct', sides: [id(1), id(2)], winner: null }).success, false)
})

test('accounts need a real email, a known role and a 10+ character password', () => {
  const ok = { email: 'a@b.co', name: 'A', password: '0123456789' }
  assert.equal(createUserSchema.safeParse(ok).success, true)
  assert.equal(createUserSchema.safeParse({ ...ok, password: 'short' }).success, false)
  assert.equal(createUserSchema.safeParse({ ...ok, role: 'owner' }).success, false)
  assert.equal(createUserSchema.parse(ok).role, 'admin')
})

test('rule ids are safe anchors', () => {
  const book = (rid) => ({ categories: [{ id: 'general', title: 'General', rules: [{ id: rid, title: 'T', text: 'X' }] }] })
  assert.equal(ruleBookSchema.safeParse(book('general-1')).success, true)
  assert.equal(ruleBookSchema.safeParse(book('<script>')).success, false)
})

test('uploads are recognised by their bytes, not their name', () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
  const jpg = Buffer.from('ffd8ffe000104a4649460001', 'hex')
  const mp4 = Buffer.concat([Buffer.from('00000018', 'hex'), Buffer.from('ftypmp42'), Buffer.alloc(4)])
  const svg = Buffer.from('<svg onload="x()"></svg>')
  assert.equal(detectType(png)?.type, 'image/png')
  assert.equal(detectType(jpg)?.type, 'image/jpeg')
  assert.equal(detectType(mp4)?.kind, 'video')
  assert.equal(detectType(svg), null)
})

test('staff social links must be https links on the platform itself', () => {
  const ok = staffSchema.parse({
    name: 'A',
    role: 'B',
    department: 'PD',
    socials: { youtube: 'https://www.youtube.com/@someone', x: 'https://twitter.com/someone', twitch: '' },
  })
  assert.deepEqual(ok.socials, { youtube: 'https://www.youtube.com/@someone', x: 'https://twitter.com/someone' })
  for (const bad of ['https://evil.example/youtube.com', 'https://youtube.com.evil.example/', 'http://youtube.com/a', 'javascript:alert(1)']) {
    assert.equal(staffSchema.safeParse({ name: 'A', role: 'B', socials: { youtube: bad } }).success, false, bad)
  }
  assert.equal(staffSchema.safeParse({ name: 'A', role: 'B', socials: { myspace: 'https://myspace.com/a' } }).success, false)
})

test('TDM board: whole numbers only, each player once', async () => {
  const { tdmBoardSchema } = await import('../src/validation/schemas.js')
  const ok = tdmBoardSchema.parse({ season: 'Season 1', players: [{ name: 'Mara', kills: 12, deaths: 4 }] })
  assert.deepEqual(ok.players[0], { name: 'Mara', kills: 12, deaths: 4, wins: 0, matches: 0 })
  assert.equal(tdmBoardSchema.safeParse({ players: [{ name: 'Mara' }, { name: 'mara' }] }).success, false)
  assert.equal(tdmBoardSchema.safeParse({ players: [{ name: 'Mara', kills: -1 }] }).success, false)
  assert.equal(tdmBoardSchema.safeParse({ players: [{ name: 'Mara', kills: 1.5 }] }).success, false)
})

test('Cloudinary request signing matches the example in Cloudinary\'s documentation', async () => {
  const { signParams } = await import('../src/services/cloudinary.js')
  const signature = signParams(
    { eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 },
    'abcd',
  )
  assert.equal(signature, 'bfd09f95f331f558cbd1320e67aa8d488770583e')
})

test('events: a start is required, the finish comes after it, and links are web links only', async () => {
  const { eventSchema } = await import('../src/validation/schemas.js')
  const base = { slug: 'street-race-night', title: 'Street Race Night', startsAt: '2026-12-05T20:00:00Z' }
  assert.equal(eventSchema.safeParse(base).success, true)
  assert.equal(eventSchema.safeParse({ ...base, startsAt: undefined }).success, false)
  assert.equal(eventSchema.safeParse({ ...base, endsAt: '2026-12-05T19:00:00Z' }).success, false)
  assert.equal(eventSchema.safeParse({ ...base, endsAt: '' }).data?.endsAt, null)
  assert.equal(eventSchema.safeParse({ ...base, signupUrl: 'javascript:alert(1)' }).success, false)
  assert.equal(eventSchema.safeParse({ ...base, signupUrl: 'https://discord.gg/abc' }).success, true)
  assert.equal(eventSchema.safeParse({ ...base, status: 'secret' }).success, false)
  assert.equal(eventSchema.safeParse({ ...base, capacity: -1 }).success, false)
  // unknown fields are dropped, so a request cannot set who wrote it
  assert.equal('createdBy' in eventSchema.parse({ ...base, createdBy: 'someone' }), false)
})

test('event state: drafts and cancellations win, then the clock decides', async () => {
  const { eventState } = await import('../src/models/Event.js')
  const now = new Date('2026-12-05T21:00:00Z')
  const at = (iso, extra = {}) => ({ status: 'published', startsAt: new Date(iso), endsAt: null, ...extra })
  assert.equal(eventState(at('2026-12-06T20:00:00Z'), now), 'upcoming')
  assert.equal(eventState(at('2026-12-05T20:00:00Z'), now), 'live') // no finish set: counts as 3 hours
  assert.equal(eventState(at('2026-12-05T17:00:00Z'), now), 'ended')
  assert.equal(eventState(at('2026-12-05T20:00:00Z', { endsAt: new Date('2026-12-05T20:30:00Z') }), now), 'ended')
  assert.equal(eventState(at('2026-12-06T20:00:00Z', { status: 'draft' }), now), 'draft')
  assert.equal(eventState(at('2026-12-06T20:00:00Z', { status: 'cancelled' }), now), 'cancelled')
})

test('community links: known platforms only, https on that platform, each once', async () => {
  const { settingsSocialsSchema } = await import('../src/validation/schemas.js')
  const ok = (links) => settingsSocialsSchema.safeParse({ links }).success
  assert.equal(ok([{ platform: 'discord', url: 'https://discord.gg/abc' }, { platform: 'youtube', url: 'https://www.youtube.com/@server' }]), true)
  assert.equal(ok([]), true) // removing them all is allowed
  assert.equal(ok([{ platform: 'youtube', url: 'https://evil.example/youtube.com' }]), false)
  assert.equal(ok([{ platform: 'discord', url: 'http://discord.gg/abc' }]), false)
  assert.equal(ok([{ platform: 'discord', url: 'javascript:alert(1)' }]), false)
  assert.equal(ok([{ platform: 'myspace', url: 'https://myspace.com/x' }]), false)
  assert.equal(ok([{ platform: 'discord', url: '' }]), false)
  assert.equal(ok([{ platform: 'discord', url: 'https://discord.gg/a' }, { platform: 'discord', url: 'https://discord.gg/A' }]), false)
})

test('site settings accept every section switch, including Creators', async () => {
  const { settingsSiteSchema } = await import('../src/validation/schemas.js')
  const { SECTION_KEYS } = await import('../src/models/Settings.js')
  const sections = Object.fromEntries(SECTION_KEYS.map((k) => [k, false]))
  assert.equal(settingsSiteSchema.safeParse({ sections }).success, true)
  assert.equal(settingsSiteSchema.safeParse({ sections: { creators: true } }).success, true)
  assert.equal(settingsSiteSchema.safeParse({ sections: { nonsense: true } }).success, false)
})

test('store products: https buy links only, a sale price below the old one, pictures by id', async () => {
  const { productSchema, storeSettingsSchema } = await import('../src/validation/schemas.js')
  const base = { slug: 'drift-pack', name: 'Drift pack', kind: 'asset', price: 25, currency: 'USD' }
  const ok = (extra) => productSchema.safeParse({ ...base, ...extra }).success
  assert.equal(ok({}), true)
  assert.equal(ok({ price: null }), true) // price on request
  assert.equal(ok({ price: 0 }), true) // free
  assert.equal(ok({ price: -1 }), false)
  assert.equal(ok({ oldPrice: 40 }), true)
  assert.equal(ok({ oldPrice: 20 }), false)
  assert.equal(ok({ buyUrl: 'https://discord.com/channels/1/2' }), true)
  assert.equal(ok({ buyUrl: 'http://example.com' }), false)
  assert.equal(ok({ buyUrl: 'javascript:alert(1)' }), false)
  assert.equal(ok({ gallery: [id(1), id(2)] }), true)
  assert.equal(ok({ gallery: ['../x'] }), false)
  assert.equal(ok({ kind: 'crypto' }), false)
  assert.equal(ok({ currency: 'XYZ' }), false)
  assert.equal(storeSettingsSchema.safeParse({ buyUrl: 'https://discord.gg/abc', note: 'x' }).success, true)
  assert.equal(storeSettingsSchema.safeParse({ buyUrl: 'ftp://x' }).success, false)
})
