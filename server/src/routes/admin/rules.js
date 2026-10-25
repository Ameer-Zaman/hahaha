import { Router } from 'express'

import { validateBody } from '../../middleware/validate.js'
import { RuleBook } from '../../models/RuleBook.js'
import { audit } from '../../services/audit.js'
import { ruleBookSchema } from '../../validation/schemas.js'

const router = Router()

const getBook = async () =>
  (await RuleBook.findOne({ key: 'main' })) ?? (await RuleBook.create({ key: 'main' }))

const view = (book) => ({
  draft: book.draft,
  published: book.published,
  publishedAt: book.publishedAt,
  updatedAt: book.updatedAt,
})

router.get('/', async (req, res) => {
  res.json(view(await getBook()))
})

router.put('/draft', validateBody(ruleBookSchema), async (req, res) => {
  const book = await getBook()
  book.draft = req.body.categories
  await book.save()
  const count = req.body.categories.reduce((n, c) => n + c.rules.length, 0)
  await audit(req, 'rules.save_draft', 'rules', `${req.body.categories.length} sections · ${count} rules`)
  res.json(view(book))
})

router.post('/publish', async (req, res) => {
  const book = await getBook()
  book.published = book.draft
  book.publishedAt = new Date()
  await book.save()
  await audit(req, 'rules.publish', 'rules', `${book.draft.length} sections published`)
  res.json(view(book))
})

router.post('/unpublish', async (req, res) => {
  const book = await getBook()
  book.published = null
  book.publishedAt = null
  await book.save()
  await audit(req, 'rules.unpublish', 'rules', 'Public rule book taken down')
  res.json(view(book))
})

export default router
