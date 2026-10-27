/**
 * Finds the rules that answer a question, entirely in the browser: no server, no AI, so it's
 * free, instant, and can only ever quote the real rule book.
 *
 * Words are simplified (lower case, common endings removed) and common roleplay slang is mapped
 * to the words the rules use (cop → police, RDM → random violence, NLR → new life …). A rule
 * scores for every question word found in its title (most), its category, and its text.
 */
const STOP = new Set(
  'a an the and or but if of to in on at by for with from as is are was were be been being am do does did can could should would will may might must shall i im me my we our you your he she they them it its this that these those there here what whats which who whom how why when where about any some no not yes ok okay please pls tell know rule rules allowed allow okay just get got have has had into out up down than then so too very also really much many more most other again ever'.split(
    ' ',
  ),
)

// slang → the words the rule book uses (each value can be several words)
const SYNONYMS = {
  cop: 'police', cops: 'police', pd: 'police', officer: 'police', lspd: 'police',
  ems: 'medic', doctor: 'medic', hospital: 'medic', revive: 'medic',
  car: 'vehicle', cars: 'vehicle', bike: 'vehicle', drive: 'vehicle', ram: 'ramming vehicle', ramming: 'ramming vehicle', vdm: 'vehicle ramming',
  rdm: 'random violence', kill: 'violence', killing: 'violence', shoot: 'violence weapon', shooting: 'violence weapon', gun: 'weapon', guns: 'weapon', fight: 'combat conflict', fighting: 'combat conflict',
  nlr: 'new life', die: 'new life death', died: 'new life death', death: 'new life', respawn: 'new life',
  meta: 'metagaming', metagame: 'metagaming', stream: 'metagaming', streaming: 'metagaming', discord: 'metagaming discord',
  powergame: 'powergaming', godmode: 'powergaming',
  hack: 'cheats exploits', hacks: 'cheats exploits', hacker: 'cheats exploits', mod: 'cheats', mods: 'cheats', menu: 'cheats', glitch: 'exploits', bug: 'exploits',
  toxic: 'respect', insult: 'respect', racism: 'respect discrimination', racist: 'respect discrimination', swear: 'respect', harass: 'respect harassment', bully: 'respect harassment',
  ooc: 'character', fail: 'character', failrp: 'character roleplay', rp: 'roleplay',
  gang: 'gangs', crew: 'gangs', family: 'gangs', war: 'wars', declare: 'declared wars', turf: 'gangs territory',
  report: 'report', ticket: 'report', complain: 'report', complaint: 'report',
  ban: 'appeals', banned: 'appeals', unban: 'appeals', appeal: 'appeals', kick: 'appeals', kicked: 'appeals',
  admin: 'staff', admins: 'staff', mods_: 'staff', moderator: 'staff', staff: 'staff',
  hostage: 'value life', robbery: 'value life', rob: 'value life', fear: 'value life',
}

const stem = (word) => {
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3)
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2)
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2)
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

const words = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

/** The question as a list of simplified search words (slang expanded, filler removed). */
export function questionTerms(question) {
  const out = new Set()
  for (const raw of words(question)) {
    const mapped = SYNONYMS[raw]
    for (const w of mapped ? mapped.split(' ') : [raw]) {
      if (!STOP.has(w) && w.length > 1) out.add(stem(w))
    }
  }
  return [...out]
}

const indexOf = (text) => new Set(words(text).map(stem))

/** Every rule as { rule, category, title, text, cat } search sets (cache it per rule book). */
export function indexRules(categories) {
  return categories.flatMap((category) =>
    category.rules.map((rule) => ({
      rule,
      category,
      title: indexOf(rule.title),
      text: indexOf(rule.text),
      cat: indexOf(`${category.title} ${category.summary ?? ''}`),
    })),
  )
}

const has = (set, term) => {
  if (set.has(term)) return true
  if (term.length < 4) return false
  for (const w of set) if (w.startsWith(term) || (w.length >= 4 && term.startsWith(w))) return true
  return false
}

/** The best matching rules for a question: up to `limit` { rule, category, score }. */
export function searchRules(index, question, limit = 3) {
  const terms = questionTerms(question)
  if (!terms.length) return []
  const scored = index
    .map((entry) => {
      let score = 0
      let hits = 0
      for (const t of terms) {
        const s = (has(entry.title, t) ? 3 : 0) + (has(entry.cat, t) ? 1.5 : 0) + (has(entry.text, t) ? 1 : 0)
        if (s) hits += 1
        score += s
      }
      return { rule: entry.rule, category: entry.category, score: score + hits * 0.5 }
    })
    .filter((r) => r.score >= 2)
    .sort((a, b) => b.score - a.score)
  if (!scored.length) return []
  const best = scored[0].score
  return scored.filter((r) => r.score >= best * 0.55).slice(0, limit)
}
