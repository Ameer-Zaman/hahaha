import mongoose from 'mongoose'

export const STORE_PLANS = ['resident', 'gang', 'club', 'dhadha', 'vip']

/**
 * Something in the Store. Two kinds:
 *   asset  — a download for other server owners (script, MLO, vehicle pack, clothing …)
 *   item   — something for players in the city (a VIP pack, a car, a house …)
 *
 * The website takes no payments: the Buy button opens a link (by default the store's Discord
 * ticket link, set in Panel → Store) and staff handle payment and delivery there.
 */
const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: ['asset', 'item'], default: 'asset' },
    /** The store's category: Resident, Gang Plan, Club Plan, Dhadha Plan or VIP Plan. */
    plan: { type: String, enum: STORE_PLANS, default: 'resident' },
    /** VIP or Normal (older setting; VIP Plan replaces it): a second way to sort the store, shown as a VIP tag on VIP products. */
    tier: { type: String, enum: ['normal', 'vip'], default: 'normal' },
    /** Free text the team picks: "Scripts", "MLO", "Vehicles", "VIP" … the page groups by it. */
    category: { type: String, trim: true, default: '' },
    tagline: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    /** Short bullet points ("Optimised: 0.00 ms idle", "QBCore and ESX"). */
    features: { type: [String], default: [] },
    /** Label / value rows shown as a small table ("Framework" → "QBCore, ESX"). */
    specs: { type: [{ _id: false, label: String, value: String }], default: [] },
    /** null = no price shown ("Price on request"); 0 = free. */
    price: { type: Number, default: null },
    /** The old price, crossed out, when it's on sale. */
    oldPrice: { type: Number, default: null },
    currency: { type: String, default: 'USD' },
    /** After the price: "one-time", "/ month", "30 days" … */
    priceNote: { type: String, trim: true, default: '' },
    /** What shows when there is no price: 'request' ("Price on request") or 'soon' ("Coming soon", not buyable yet). */
    noPrice: { type: String, enum: ['request', 'soon'], default: 'request' },
    badge: { type: String, default: '' }, // '' | new | popular | limited | sale
    cover: { type: String, default: null }, // media id (GIFs work)
    gallery: { type: [String], default: [] }, // media ids
    video: { type: String, default: null }, // media id: a short preview clip
    /** This product's own buy link; empty = the store's default (Panel → Store). */
    buyUrl: { type: String, trim: true, default: '' },
    featured: { type: Boolean, default: false },
    soldOut: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false },
)

export const Product = mongoose.model('Product', productSchema)
