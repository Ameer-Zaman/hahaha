import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ProductCard } from '../../store/StorePage'
import { formatPrice } from '../../store/price'
import { mediaUrl, slugify } from '../format'
import { MediaField, MediaPicker, Thumb } from '../mediaKit'
import { adminApi } from '../panelApi'
import { useAction, useResource } from '../hooks'
import { ConfirmButton, Empty, ErrorNote, ListTable, Loading, PageHead, Panel, SelectField, Switch, TextField } from '../ui'

const KIND_LABEL = { asset: 'Asset', item: 'In-game' }
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR', 'CAD', 'AUD', 'MYR', 'LKR', 'PKR', 'BDT']
const BADGES = [
  { value: '', label: 'None' },
  { value: 'new', label: 'New' },
  { value: 'popular', label: 'Popular' },
  { value: 'limited', label: 'Limited' },
  { value: 'sale', label: 'Sale (shows the % off)' },
]
const CATEGORY_IDEAS = {
  asset: ['Scripts', 'MLO', 'Maps', 'Vehicles', 'Clothing', 'UI', 'Bundles'],
  item: ['VIP', 'Vehicles', 'Properties', 'Items', 'Perks', 'Bundles'],
}

/* ------------------------------------------------------------------ list */

export function StoreList() {
  const { data, error, loading, reload, setData } = useResource(() => adminApi.get('/store'))
  const products = data?.products

  return (
    <>
      <PageHead
        title="Store"
        sub="What's for sale on the Store page, in this order. Buy buttons open a link — nothing is paid for on the website."
      >
        <a className="pbtn pbtn--ghost" href="/store" target="_blank" rel="noreferrer">
          View on site
        </a>
        <Link to="/panel/store/new" className="pbtn pbtn--gold">
          New product
        </Link>
      </PageHead>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}

      {data && <StoreSettings key={JSON.stringify(data.store)} store={data.store} onSaved={(store) => setData((d) => ({ ...d, store }))} />}

      {products?.length === 0 && <Empty>No products yet. Until you add one, the Store page says it is being stocked.</Empty>}
      {products?.length > 0 && (
        <div className="p-table-wrap">
          <ListTable>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Product</th>
                <th scope="col">Kind</th>
                <th scope="col">Category</th>
                <th scope="col">Price</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="p-sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td className="p-num">{p.order}</td>
                  <td>
                    <span className="p-cell-media">
                      <Thumb id={p.cover} />
                      <strong>{p.name}</strong>
                    </span>
                  </td>
                  <td>{KIND_LABEL[p.kind]}</td>
                  <td>{p.category || '—'}</td>
                  <td>{formatPrice(p.price, p.currency)}</td>
                  <td>
                    <span className="p-st-tags">
                      {!p.visible && <span className="p-tag">Hidden</span>}
                      {p.featured && <span className="p-tag p-tag--ok">Featured</span>}
                      {p.soldOut && <span className="p-tag p-tag--warn">Sold out</span>}
                      {p.visible && !p.featured && !p.soldOut && <span className="p-tag">On sale</span>}
                    </span>
                  </td>
                  <td className="p-actions-cell">
                    <Link to={`/panel/store/${p._id}`} className="pbtn pbtn--ghost pbtn--sm">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </ListTable>
        </div>
      )}
    </>
  )
}

/** Where every Buy button goes unless a product has its own link, and a line under the title. */
function StoreSettings({ store, onSaved }) {
  const [form, setForm] = useState({ comingSoon: store.comingSoon !== false, buyUrl: store.buyUrl ?? '', note: store.note ?? '' })
  const [run, busy] = useAction()
  const changed =
    form.comingSoon !== (store.comingSoon !== false) || form.buyUrl !== (store.buyUrl ?? '') || form.note !== (store.note ?? '')

  async function save(e) {
    e.preventDefault()
    const result = await run(() => adminApi.put('/store/settings', form), 'Store settings saved')
    if (result) onSaved(result.store)
  }

  return (
    <form onSubmit={save}>
      <Panel
        title="Store page"
        sub="The website takes no payments. Buy opens the link below — a Discord ticket channel, for example — and staff handle payment and delivery there."
        actions={
          <button type="submit" className="pbtn pbtn--gold pbtn--sm" disabled={busy || !changed}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        }
      >
        <div className="p-st-soon">
          <Switch
            checked={form.comingSoon}
            onChange={(comingSoon) => setForm((f) => ({ ...f, comingSoon }))}
            label="Coming soon — the Store page shows “Coming soon” and lists no products"
          />
          <p className="p-field__hint">
            {form.comingSoon
              ? 'Add and prepare products while it’s on; nobody can see them. Switch it off and save to open the store.'
              : 'The store is open: visible products are listed on the Store page.'}
          </p>
        </div>
        <div className="p-form-grid">
          <TextField
            label="Buy link"
            hint="https only. Empty = the community Discord invite. A product can have its own link (e.g. its Tebex page)."
            value={form.buyUrl}
            onChange={(buyUrl) => setForm((f) => ({ ...f, buyUrl }))}
            placeholder="https://discord.com/channels/…"
            maxLength={500}
            type="url"
          />
          <TextField
            label="Line under the title"
            hint="Optional, e.g. opening hours of the store tickets."
            value={form.note}
            onChange={(note) => setForm((f) => ({ ...f, note }))}
            maxLength={200}
          />
        </div>
      </Panel>
    </form>
  )
}

/* ---------------------------------------------------------------- editor */

const EMPTY = {
  name: '',
  slug: '',
  kind: 'asset',
  category: '',
  tagline: '',
  description: '',
  features: [],
  specs: [],
  price: null,
  oldPrice: null,
  currency: 'USD',
  priceNote: '',
  badge: '',
  cover: null,
  gallery: [],
  video: null,
  buyUrl: '',
  featured: false,
  soldOut: false,
  visible: true,
  order: 0,
}

export function ProductEditor() {
  const { id } = useParams()
  const isNew = id === 'new'
  const { data, error, loading, reload } = useResource(
    () => (isNew ? Promise.resolve({ product: EMPTY }) : adminApi.get(`/store/${id}`)),
    [id],
  )
  if (error) return <ErrorNote message={error} onRetry={reload} />
  if (loading || !data) return <Loading />
  return <ProductForm key={id} initial={data.product} isNew={isNew} />
}

/** The saved product as form fields: numbers as text, lists as lines. */
function toForm(p) {
  const out = {}
  for (const key of Object.keys(EMPTY)) out[key] = p[key] ?? EMPTY[key]
  return {
    ...out,
    price: out.price === null ? '' : String(out.price),
    oldPrice: out.oldPrice === null ? '' : String(out.oldPrice),
    features: (out.features ?? []).join('\n'),
    specs: (out.specs ?? []).map((s) => `${s.label}: ${s.value}`).join('\n'),
  }
}

const lines = (text) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

/** "Framework: QBCore, ESX" → { label: 'Framework', value: 'QBCore, ESX' } */
const specsOf = (text) =>
  lines(text)
    .map((l) => {
      const at = l.indexOf(':')
      return at > 0 ? { label: l.slice(0, at).trim(), value: l.slice(at + 1).trim() } : null
    })
    .filter((s) => s && s.label && s.value)

const amount = (v) => (String(v).trim() === '' ? null : Number(String(v).replace(',', '.')))

function toBody(form) {
  return {
    ...form,
    price: amount(form.price),
    oldPrice: amount(form.oldPrice),
    features: lines(form.features),
    specs: specsOf(form.specs),
    order: Number(form.order) || 0,
  }
}

function ProductForm({ initial, isNew }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(() => toForm(initial))
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [picking, setPicking] = useState(false)
  const [run, busy] = useAction()
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const setName = (name) => setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }))

  const body = toBody(form)
  const badPrice = [body.price, body.oldPrice].some((n) => n !== null && (!Number.isFinite(n) || n < 0))
  const badSpecs = lines(form.specs).length !== body.specs.length

  async function save(e) {
    e.preventDefault()
    const result = await run(
      () => (isNew ? adminApi.post('/store', body) : adminApi.put(`/store/${initial._id}`, body)),
      isNew ? 'Product created' : 'Product saved',
    )
    if (result) {
      if (isNew) navigate(`/panel/store/${result.product._id}`, { replace: true })
      else setForm(toForm(result.product))
    }
  }

  async function remove() {
    const result = await run(() => adminApi.del(`/store/${initial._id}`), 'Product deleted')
    if (result) navigate('/panel/store')
  }

  // the card as visitors will see it
  const preview = {
    id: form.slug || 'preview',
    name: form.name || 'Product name',
    kind: form.kind,
    category: form.category,
    tagline: form.tagline,
    price: badPrice ? null : body.price,
    oldPrice: badPrice ? null : body.oldPrice,
    currency: form.currency,
    priceNote: form.priceNote,
    badge: form.badge,
    cover: mediaUrl(form.cover),
    video: null,
    soldOut: form.soldOut,
  }

  return (
    <form onSubmit={save}>
      <PageHead
        title={isNew ? 'New product' : form.name || 'Product'}
        sub={
          <Link to="/panel/store" className="p-link">
            ← All products
          </Link>
        }
      >
        {!isNew && form.visible && (
          <a className="pbtn pbtn--ghost" href={`/store/${initial.slug}`} target="_blank" rel="noreferrer">
            View on site
          </a>
        )}
        <button type="submit" className="pbtn pbtn--gold" disabled={busy || !form.name.trim() || !form.slug || badPrice}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </PageHead>

      <div className="p-grid-2 p-grid-2--wide-left">
        <div className="p-stack">
          <Panel title="Details">
            <div className="p-form-grid">
              <TextField label="Name" value={form.name} onChange={setName} required maxLength={70} />
              <TextField
                label="Short name"
                hint="Its link: /store/short-name (letters, numbers and dashes)."
                value={form.slug}
                onChange={(v) => {
                  setSlugTouched(true)
                  set('slug')(slugify(v))
                }}
                required
                maxLength={60}
              />
              <SelectField
                label="Kind"
                value={form.kind}
                onChange={set('kind')}
                options={[
                  { value: 'asset', label: 'Asset — for server owners (script, map, vehicle …)' },
                  { value: 'item', label: 'In-game — for players (VIP, car, house …)' },
                ]}
              />
              <TextField
                label="Category"
                hint="The Store groups by this. Pick one or type your own."
                value={form.category}
                onChange={set('category')}
                maxLength={30}
                list="p-store-cats"
              />
              <datalist id="p-store-cats">
                {CATEGORY_IDEAS[form.kind].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <TextField label="One line about it" value={form.tagline} onChange={set('tagline')} maxLength={140} wide />
              <TextField
                label="Description"
                hint="Leave an empty line between paragraphs."
                value={form.description}
                onChange={set('description')}
                maxLength={3000}
                multiline
                rows={6}
              />
              <TextField
                label="What you get"
                hint="One point per line, at most 12 — e.g. “Works with QBCore and ESX”."
                value={form.features}
                onChange={set('features')}
                multiline
                rows={4}
              />
              <TextField
                label="Details table"
                hint="One row per line as Label: value — e.g. “Framework: QBCore, ESX”, “Escrow: Yes”, “Duration: 30 days”."
                value={form.specs}
                onChange={set('specs')}
                multiline
                rows={4}
              />
              {badSpecs && <p className="p-form-note">Some lines have no “Label: value” — they won’t be shown.</p>}
            </div>
          </Panel>

          <Panel title="Price">
            <div className="p-form-grid">
              <TextField
                label="Price"
                hint="Empty = “Price on request”. 0 = Free."
                value={form.price}
                onChange={set('price')}
                inputMode="decimal"
                placeholder="e.g. 25"
              />
              <SelectField
                label="Currency"
                value={form.currency}
                onChange={set('currency')}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
              <TextField
                label="Old price"
                hint="Optional: shown crossed out (must be higher)."
                value={form.oldPrice}
                onChange={set('oldPrice')}
                inputMode="decimal"
              />
              <TextField
                label="After the price"
                hint="e.g. one-time, / month, 30 days"
                value={form.priceNote}
                onChange={set('priceNote')}
                maxLength={30}
              />
              <SelectField label="Tag on the picture" value={form.badge} onChange={set('badge')} options={BADGES} />
              {badPrice && <p className="p-form-note">Prices must be numbers like 25 or 24.99.</p>}
            </div>
          </Panel>

          <Panel title="Pictures">
            <div className="p-form-grid">
              <MediaField
                label="Cover"
                value={form.cover}
                onChange={set('cover')}
                fallback="Shown on the card. 4:3 works best; GIFs play."
              />
              <MediaField
                label="Preview clip"
                kind="video"
                value={form.video}
                onChange={set('video')}
                maxSeconds={20}
                fallback="Optional short video: plays when a visitor points at the card, and first in the details."
              />
            </div>
            <div className="p-field">
              <span className="p-field__label">More pictures ({form.gallery.length}/8)</span>
              <div className="p-st-gallery">
                {form.gallery.map((gid, i) => (
                  <span key={`${gid}-${i}`} className="p-st-gallery__item">
                    <Thumb id={gid} />
                    <button
                      type="button"
                      className="p-icon-btn p-icon-btn--danger"
                      aria-label={`Remove picture ${i + 1}`}
                      onClick={() => set('gallery')(form.gallery.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {form.gallery.length < 8 && (
                  <button type="button" className="pbtn pbtn--ghost pbtn--sm" onClick={() => setPicking(true)}>
                    Add picture
                  </button>
                )}
              </div>
              <p className="p-field__hint">Shown in the product’s details, after the cover.</p>
            </div>
            <MediaPicker
              open={picking}
              kind="image"
              onClose={() => setPicking(false)}
              onPick={(file) => {
                set('gallery')([...form.gallery, file.id].slice(0, 8))
                setPicking(false)
              }}
            />
          </Panel>
        </div>

        <div className="p-stack">
          <Panel title="Card preview">
            <div className="st theme-black p-st-preview" inert="">
              <ProductCard product={preview} index={Number(form.order) || 1} />
            </div>
          </Panel>

          <Panel title="On the website">
            <div className="p-st-switches">
              <Switch checked={form.visible} onChange={set('visible')} label="Show on the Store" />
              <Switch checked={form.featured} onChange={set('featured')} label="Featured (big card at the top)" />
              <Switch checked={form.soldOut} onChange={set('soldOut')} label="Sold out" />
            </div>
            <div className="p-form-grid p-form-grid--spaced">
              <TextField
                label="Own buy link"
                hint="Optional, https only — e.g. this product’s Tebex page. Empty = the store’s buy link."
                value={form.buyUrl}
                onChange={set('buyUrl')}
                maxLength={500}
                type="url"
                wide
              />
              <TextField
                label="Order"
                hint="Lower numbers come first."
                type="number"
                min={0}
                max={9999}
                value={form.order}
                onChange={set('order')}
              />
            </div>
          </Panel>
        </div>
      </div>

      {!isNew && (
        <Panel title="Delete product" className="p-card--danger">
          <p className="p-text">
            Removes it from the Store. This can't be undone — to take it down for a while, switch off “Show on the Store” instead.
          </p>
          <ConfirmButton onConfirm={remove} disabled={busy}>
            Delete {initial.name}
          </ConfirmButton>
        </Panel>
      )}
    </form>
  )
}
