import { Router } from 'express'

import { HttpError } from '../../middleware/errors.js'
import { validateBody } from '../../middleware/validate.js'
import { Product } from '../../models/Product.js'
import { readStore, Settings } from '../../models/Settings.js'
import { audit } from '../../services/audit.js'
import { findFile } from '../../services/media.js'
import { productSchema, storeSettingsSchema } from '../../validation/schemas.js'

/** Panel → Store: the products on the Store page, and where their Buy buttons go. Every change is audited. */
const router = Router()

const getSettings = async () => (await Settings.findOne({ key: 'main' })) ?? (await Settings.create({ key: 'main' }))

/** The cover and gallery must be pictures, and the preview a video, from the media library. */
async function checkMedia(body) {
  const want = [...[body.cover, ...body.gallery].filter(Boolean).map((id) => [id, 'image']), ...(body.video ? [[body.video, 'video']] : [])]
  for (const [id, kind] of want) {
    const file = await findFile(id)
    if (!file) throw new HttpError(400, 'A picture or video is no longer in the media library — choose it again.')
    if (file.kind !== kind)
      throw new HttpError(400, kind === 'image' ? 'The cover and gallery need pictures, not videos.' : 'The preview needs to be a video.')
  }
}

router.get('/', async (req, res) => {
  const [products, settings] = await Promise.all([
    Product.find().sort({ order: 1, createdAt: 1 }).lean(),
    Settings.findOne({ key: 'main' }, 'store').lean(),
  ])
  res.json({ products, store: readStore(settings) })
})

router.put('/settings', validateBody(storeSettingsSchema), async (req, res) => {
  const settings = await getSettings()
  const before = readStore(settings)
  settings.store = { buyUrl: req.body.buyUrl, note: req.body.note }
  settings.markModified('store')
  await settings.save()
  const changed = ['buyUrl', 'note'].filter((k) => before[k] !== req.body[k])
  if (changed.length) await audit(req, 'store.settings', 'store', changed.map((k) => (k === 'buyUrl' ? 'buy link' : 'note')).join(', '))
  res.json({ store: readStore(settings) })
})

router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id).lean()
  if (!product) throw new HttpError(404, 'Product not found.')
  res.json({ product })
})

router.post('/', validateBody(productSchema), async (req, res) => {
  await checkMedia(req.body)
  const product = await Product.create(req.body)
  await audit(req, 'product.create', product.slug, product.name)
  res.status(201).json({ product })
})

router.put('/:id', validateBody(productSchema), async (req, res) => {
  await checkMedia(req.body)
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!product) throw new HttpError(404, 'Product not found.')
  await audit(req, 'product.update', product.slug, product.name)
  res.json({ product })
})

router.delete('/:id', async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id)
  if (!product) throw new HttpError(404, 'Product not found.')
  await audit(req, 'product.delete', product.slug, product.name)
  res.json({ ok: true })
})

export default router
