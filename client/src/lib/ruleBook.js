import { ruleCategories as staticCategories, rulesMeta } from '../content/rules'
import { usePublic } from './publicData'

/** The parts of the Rules page around the rules (set in Panel → Rules); empty = hidden. */
const NO_EXTRAS = { notice: '', penalties: [], appeals: '', glossary: [] }

/**
 * The rule book published from the admin panel, or the built-in draft (content/rules.js)
 * while nothing has been published there.
 */
export function useRuleBook() {
  const entry = usePublic('/rules')
  if (entry.status === 'loading') return { loading: true, categories: [], extras: NO_EXTRAS, status: 'draft', lastUpdated: null }
  if (entry.status === 'ok' && entry.data?.status === 'published' && entry.data.categories?.length) {
    return {
      categories: entry.data.categories,
      extras: { ...NO_EXTRAS, ...(entry.data.extras ?? {}) },
      status: 'published',
      lastUpdated: entry.data.lastUpdated ? entry.data.lastUpdated.slice(0, 10) : null,
    }
  }
  return { categories: staticCategories, extras: NO_EXTRAS, status: rulesMeta.status, lastUpdated: rulesMeta.lastUpdated }
}
