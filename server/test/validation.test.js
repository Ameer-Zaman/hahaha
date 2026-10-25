// Unit tests that need no database. Run with: npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/test'
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-123'

const { gangSchema, warSchema, createUserSchema, ruleBookSchema } = await import('../src/validation/schemas.js')
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
