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
