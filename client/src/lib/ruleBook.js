import { useEffect, useState } from 'react'

import { usePublic } from './publicData'

/** The parts of the Rules page around the rules (set in Panel → Rules); empty = hidden. */
const NO_EXTRAS = { notice: '', penalties: [], appeals: '', glossary: [] }

// The built-in rule book (content/rules.js) is big, so it's only downloaded when it's needed:
// while nothing is published from the panel.
let builtIn = null
let builtInLoad = null
export function loadBuiltInRules() {
  builtInLoad ??= import('../content/rules').then((m) => {
    builtIn = { categories: m.ruleCategories, status: m.rulesMeta.status, lastUpdated: m.rulesMeta.lastUpdated }
    return builtIn
  })
  return builtInLoad
}

function useBuiltIn(needed) {
  const [book, setBook] = useState(builtIn)
  useEffect(() => {
    if (!needed || book) return undefined
    let live = true
    loadBuiltInRules().then((b) => live && setBook(b))
    return () => {
      live = false
    }
  }, [needed, book])
  return book
}

/**
 * The rule book published from the admin panel, or the built-in one (content/rules.js)
 * while nothing has been published there.
 */
export function useRuleBook() {
  const entry = usePublic('/rules')
  const published = entry.status === 'ok' && entry.data?.status === 'published' && entry.data.categories?.length > 0
  const fallback = useBuiltIn(entry.status !== 'loading' && !published)

  if (published) {
    return {
      categories: entry.data.categories,
      extras: { ...NO_EXTRAS, ...(entry.data.extras ?? {}) },
      status: 'published',
      lastUpdated: entry.data.lastUpdated ? entry.data.lastUpdated.slice(0, 10) : null,
    }
  }
  if (entry.status === 'loading' || !fallback) {
    return { loading: true, categories: [], extras: NO_EXTRAS, status: 'draft', lastUpdated: null }
  }
  return { categories: fallback.categories, extras: NO_EXTRAS, status: fallback.status, lastUpdated: fallback.lastUpdated }
}
