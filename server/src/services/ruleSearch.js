/**
 * Finds the rules that answer a question, used by the browser (client/src/lib/ruleSearch.js) and, as this copy, by the server to pick
 * the rules the AI helper may quote. Keep the two the same. Plain search is
 * free, instant, and can only ever quote the real rule book.
 *
 * Words are simplified (lower case, common endings removed) and common roleplay slang is mapped
 * to the words the rules use (cop → police, RDM → random violence, NLR → new life …). A rule
 * scores for every question word found in its title (most), its category, and its text.
 */
const STOP = new Set(
  'a an the and or but if of to in on at by for with from as is are was were be been being am do does did can could should would will may might must shall i im me my we our you your he she they them it its this that these those there here what whats which who whom how why when where about any some no not yes ok okay please pls tell know rule rules allowed allow okay just get got have has had into out up down than then so too very also really much many more most other again ever during happen happens happened someone somebody something thing things need needed want wanted using make made go going went take took give gave like ok'.split(
    ' ',
  ),
)

// slang → the words the rule book uses (each value can be several words)
const SYNONYMS = {
  cop: 'police',
  cops: 'police',
  pd: 'police',
  officer: 'police',
  lspd: 'police',
  ems: 'medic rmd',
  doctor: 'medic rmd',
  hospital: 'medic rmd',
  revive: 'medic revival rmd',
  car: 'vehicle',
  cars: 'vehicle',
  bike: 'vehicle',
  drive: 'vehicle',
  ram: 'ramming vehicle',
  ramming: 'ramming vehicle',
  vdm: 'vehicle ramming',
  rdm: 'random violence',
  kill: 'violence',
  killing: 'violence',
  shoot: 'violence weapon',
  shooting: 'violence weapon',
  gun: 'weapon',
  guns: 'weapon',
  fight: 'combat conflict',
  fighting: 'combat conflict',
  nlr: 'death revival memory',
  die: 'death revival',
  died: 'death revival',
  death: 'death revival memory',
  respawn: 'respawning revival',
  meta: 'metagaming',
  metagame: 'metagaming',
  stream: 'metagaming',
  streaming: 'metagaming',
  discord: 'metagaming discord',
  powergame: 'powergaming',
  godmode: 'powergaming',
  hack: 'cheats exploits',
  hacks: 'cheats exploits',
  hacker: 'cheats exploits',
  mod: 'cheats',
  mods: 'cheats',
  menu: 'cheats',
  glitch: 'exploits',
  bug: 'exploits',
  toxic: 'respect',
  insult: 'respect',
  racism: 'respect discrimination',
  racist: 'respect discrimination',
  swear: 'respect',
  harass: 'respect harassment',
  bully: 'respect harassment',
  ooc: 'character',
  fail: 'character',
  failrp: 'character roleplay',
  rp: 'roleplay',
  gang: 'gangs',
  crew: 'gangs',
  family: 'gangs',
  war: 'wars',
  declare: 'declared wars',
  turf: 'gangs territory',
  report: 'report',
  ticket: 'report',
  complain: 'report',
  complaint: 'report',
  ban: 'appeals',
  banned: 'appeals',
  unban: 'appeals',
  appeal: 'appeals',
  kick: 'appeals',
  kicked: 'appeals',
  admin: 'staff',
  admins: 'staff',
  mods_: 'staff',
  moderator: 'staff',
  staff: 'staff',
  hostage: 'hostages',
  hostages: 'hostages',
  kidnap: 'hostages kidnapping',
  robbery: 'robberies',
  rob: 'robberies',
  heist: 'robberies',
  fear: 'value life',
  medical: 'medic rmd',
  ambulance: 'rmd medic',
  paramedic: 'rmd medic',
  log: 'logging',
  logged: 'logging',
  logout: 'logging',
  logoff: 'logging',
  combatlog: 'logging',
  f4: 'logging',
  alt: 'account second character',
  safezone: 'safe sanctuary',
  green: 'safe sanctuary',
  night: 'night truce',
  '2am': 'night truce restarts',
  restart: 'restarts',
  tsunami: 'restarts',
  streamer: 'creators streaming',
  snipe: 'sniping',
  sniping: 'sniping',
  youtube: 'creators',
  afk: 'away keyboard',
  sell: 'sale premium',
  selling: 'sale premium',
  vip: 'premium',
  donate: 'premium plan',
  soundboard: 'soundboards',
  name: 'citizen name',
  mask: 'masks disguise',
  abuse: 'abusive language strike',
  abusive: 'abusive language strike',
  gaali: 'abusive language strike',
  mother: 'family parental',
  dox: 'doxxing privacy',
  doxx: 'doxxing privacy',
  nsfw: 'nsfw explicit',
  pov: 'evidence pov recording',
  clip: 'evidence pov',
  evidence: 'evidence pov',
  shootout: 'firefights gunfire',
  firefight: 'firefights',
  traffic: 'traffic stops',
  pullover: 'traffic stops',
  chase: 'refusing pull over',
  lockdown: 'lockdowns',
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
  for (const raw of words(String(question).replace(/new\s*life/gi, ' nlr '))) {
    const mapped = SYNONYMS[raw]
    // the word itself, plus what the rule book calls it
    for (const w of mapped ? [raw, ...mapped.split(' ')] : [raw]) {
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
      // the number (HON-03), title and tags weigh most; the book's own name isn't a useful tag
      title: indexOf(`${rule.number ?? ''} ${rule.title} ${(rule.tags ?? []).filter((t) => t !== category.title).join(' ')}`),
      text: indexOf(`${rule.summary ?? ''} ${rule.text}`),
      cat: indexOf(`${category.title} ${category.summary ?? ''} ${rule.division ?? ''} ${rule.section ?? ''}`),
      // title and tags as one line of simplified words, for two-word phrases ("combat log")
      phrase: ` ${words(`${rule.title} ${(rule.tags ?? []).join(' ')}`)
        .map(stem)
        .join(' ')} `,
      dept: indexOf(
        `${rule.division ?? ''} ${rule.section ?? ''} ${rule.division === 'Medical Department' ? 'rmd medic ems' : ''} ${rule.division === 'Police' ? 'police officer rcpd' : ''}`,
      ),
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
  const plain = words(question)
    .filter((w) => !STOP.has(w))
    .map(stem)
  const pairs = plain.slice(1).map((w, i) => ` ${plain[i]} ${w}`)
  const scored = index
    .map((entry) => {
      let score = 0
      let hits = 0
      for (const t of terms) {
        const s = (has(entry.title, t) ? 3 : 0) + (has(entry.cat, t) ? 1.5 : 0) + (has(entry.text, t) ? 1 : 0)
        if (s) hits += 1
        score += s
      }
      // a department's own rules (Police, Medical …) only lead when the question is about that department
      for (const pair of pairs) if (entry.phrase.includes(pair)) score += 3
      const offTopic = entry.rule.division && !terms.some((t) => has(entry.dept, t))
      return { rule: entry.rule, category: entry.category, score: score + hits * 0.5 - (offTopic ? 2 : 0) }
    })
    .filter((r) => r.score >= 2)
    .sort((a, b) => b.score - a.score)
  if (!scored.length) return []
  const best = scored[0].score
  return scored.filter((r) => r.score >= best * 0.55).slice(0, limit)
}
