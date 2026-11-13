/**
 * The Store's categories and their sub-categories (client copy: client/src/features/store/taxonomy.js).
 * A product has a `plan` (top category) and an optional `sub`: a path inside that plan, e.g.
 * 'premium-plan' or 'custom-vehicle/car'.
 */
export const STORE_TREE = {
  vip: ['vip-plan', 'premium-plan', 'number'],
  resident: ['custom-vehicle', 'custom-vehicle/bike', 'custom-vehicle/car', 'custom-vehicle/helicopter', 'custom-vehicle/yacht'],
  gang: [],
  dhadha: [],
  club: [],
}
export const STORE_PLANS = Object.keys(STORE_TREE)
export const validSub = (plan, sub) => !sub || (STORE_TREE[plan] ?? []).includes(sub)
