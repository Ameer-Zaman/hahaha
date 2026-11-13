/**
 * The Store's categories, in the order they show (server copy: server/src/config/storeTaxonomy.js).
 * A product has a `plan` (top category) and an optional `sub` path inside it,
 * e.g. 'premium-plan' or 'custom-vehicle/car'.
 */
export const STORE_TREE = [
  {
    id: 'vip',
    label: 'VIP',
    subs: [
      { id: 'vip-plan', label: 'VIP Plan' },
      { id: 'premium-plan', label: 'Premium Plan' },
      { id: 'number', label: 'Number' },
    ],
  },
  {
    id: 'resident',
    label: 'Resident',
    subs: [
      {
        id: 'custom-vehicle',
        label: 'Custom Vehicle',
        subs: [
          { id: 'bike', label: 'Bike' },
          { id: 'car', label: 'Car' },
          { id: 'helicopter', label: 'Helicopter' },
          { id: 'yacht', label: 'Yacht' },
        ],
      },
    ],
  },
  { id: 'gang', label: 'Gang Plan', subs: [] },
  { id: 'dhadha', label: 'Dhadha Plan', subs: [] },
  { id: 'club', label: 'Club Plan', subs: [] },
]

/** Products saved before categories existed: VIP ones go under VIP, the rest under Resident. */
export const planOf = (p) => p.plan || (p.tier === 'vip' ? 'vip' : 'resident')
export const isVip = (p) => planOf(p) === 'vip'

/** 'resident' + 'custom-vehicle/car' → ['Resident', 'Custom Vehicle', 'Car'] */
export function pathLabels(plan, sub = '') {
  const top = STORE_TREE.find((t) => t.id === plan)
  if (!top) return []
  const out = [top.label]
  let level = top.subs
  for (const id of (sub || '').split('/').filter(Boolean)) {
    const node = level.find((n) => n.id === id)
    if (!node) break
    out.push(node.label)
    level = node.subs ?? []
  }
  return out
}

/** Every sub-category of a plan as a picker option: 'custom-vehicle' and 'custom-vehicle/car' → "Custom Vehicle › Car". */
export function subOptions(plan) {
  const top = STORE_TREE.find((t) => t.id === plan)
  if (!top) return []
  const out = []
  for (const s of top.subs) {
    out.push({ value: s.id, label: s.label })
    for (const c of s.subs ?? []) out.push({ value: `${s.id}/${c.id}`, label: `${s.label} › ${c.label}` })
  }
  return out
}
