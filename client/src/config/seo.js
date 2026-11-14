/**
 * Search engines and link previews: the site's address and what each page is called and about.
 *
 * Used twice: at build time (seo/prerender.js writes a ready-made HTML page for every address
 * below, plus sitemap.xml) and in the browser (usePageTitle keeps the title, description and
 * canonical link in step as the visitor moves around).
 *
 * Keep every description factual: no player counts, dates or claims the team hasn't made.
 */
import { site } from './site.js'

/** The site's one official address. Every other copy (workers.dev, previews) points here. */
export const SITE_URL = 'https://rameirahempire.com'

/** The picture shown when a link to the site is shared (Discord, WhatsApp, X, Google). 1200×630. */
export const SHARE_IMAGE = '/assets/images/og-cover.jpg'

/**
 * Search Console ownership codes. Google Search Console → Add property → URL prefix →
 * "HTML tag": paste only the content="…" value here. Bing Webmaster Tools works the same way.
 * Empty = no tag. (A DNS record on the domain works too and needs nothing here.)
 */
export const VERIFY = { google: '', bing: '' }

/** The words people search for, worked naturally into titles and descriptions below. */
export const SEARCH_NAMES = ['Rameirah Empire', 'Rameirah RP', 'Rameirah Empire RP', 'Rameirah FiveM']

/** The homepage's title: what a search result shows in large type. */
export const HOME_TITLE = `${site.name} — FiveM GTA V Roleplay Server (Rameirah RP)`

/**
 * One entry per public page. `title` is the page's own name (the site name is added after it),
 * `heading` and `intro` are what the ready-made page shows before the app has loaded.
 */
export const pages = [
  {
    path: '/',
    title: null,
    heading: site.name,
    description: `${site.name} (Rameirah RP) is a serious FiveM roleplay server for GTA V, in preparation. Read the rules, meet the staff, see the gangs and join the Discord.`,
    intro: `${site.tagline} ${site.description}`,
    priority: 1.0,
    changefreq: 'weekly',
  },
  {
    path: '/rules',
    title: 'Rules',
    heading: 'The Rules',
    description: `The full ${site.name} rule book: the Code of Honour, citizenship, roleplay craft, conflict, justice, creators and entity rules for the Rameirah RP FiveM server.`,
    intro: `Every rule of ${site.name}, book by book. Each rule has its own page with the full text and what happens when it is broken.`,
    priority: 0.9,
    changefreq: 'weekly',
  },
  {
    path: '/staff',
    title: 'Staff',
    heading: 'Staff',
    description: `Meet the ${site.name} staff team: every department of the Rameirah RP city, who they are and what they do.`,
    intro: 'Every department of the city in one place: who they are, what they do and who is online right now.',
    priority: 0.7,
    changefreq: 'weekly',
  },
  {
    path: '/gangs',
    title: 'Gangs',
    heading: 'Gangs',
    description: `The gangs of ${site.name}: the crews that run the streets of the Rameirah RP city.`,
    intro: 'The crews that run the streets of the city.',
    priority: 0.7,
    changefreq: 'weekly',
  },
  {
    path: '/creators',
    title: 'Creators',
    heading: 'Creators',
    description: `The streamers and content creators of ${site.name}. See who is live from the Rameirah RP city and jump into their stream.`,
    intro: 'The streamers and creators of the city — see who’s live right now and jump straight into their stream.',
    priority: 0.6,
    changefreq: 'daily',
  },
  {
    path: '/events',
    title: 'Events',
    heading: 'Events',
    description: `Races, heists, tournaments and nights out in ${site.name}: what the Rameirah RP city is hosting, when, and how to take part.`,
    intro: 'Races, heists, tournaments and nights out — what the city is hosting, when, and how to take part.',
    priority: 0.6,
    changefreq: 'daily',
  },
  {
    path: '/leaderboard',
    title: 'Leaderboard',
    heading: 'Leaderboard',
    description: `${site.name} leaderboard: TDM players ranked by kills and gangs ranked by their war record.`,
    intro: 'Who runs the arena and who runs the streets: TDM players ranked by kills, gangs ranked by their war record.',
    priority: 0.5,
    changefreq: 'daily',
  },
  {
    path: '/clubs',
    title: 'Clubs',
    heading: 'Clubs',
    description: `The clubs of ${site.name}: the factions and places that make up the Rameirah RP city's nightlife.`,
    intro: 'The clubs of the city.',
    priority: 0.5,
    changefreq: 'weekly',
  },
  {
    path: '/dhadhas',
    title: 'Dhadhas',
    heading: 'Dhadhas',
    description: `Dhadhas, a new faction coming to ${site.name}. Who they are and how to join will be announced on the Discord.`,
    intro: 'A new faction is on its way to Rameirah Empire. Who they are and how to join will be announced on our Discord.',
    priority: 0.4,
    changefreq: 'weekly',
  },
  {
    path: '/story',
    title: 'Story',
    heading: 'Story',
    description: `The story of ${site.name}: every city has a story, and this one is written by the people who live in it.`,
    intro: 'Every city has a story. This one is written by the people who live in it.',
    priority: 0.5,
    changefreq: 'monthly',
  },
  {
    path: '/gallery',
    title: 'Gallery',
    heading: 'Gallery',
    description: `Photos from ${site.name}: heists, late nights and the people of the Rameirah RP city.`,
    intro: 'Heists, late nights and the people who make the Empire.',
    priority: 0.5,
    changefreq: 'weekly',
  },
  {
    path: '/store',
    title: 'Store',
    heading: 'Store',
    description: `The ${site.name} store: support the Rameirah RP server.`,
    intro: 'Support the city.',
    priority: 0.4,
    changefreq: 'weekly',
  },
]

/** The page entry for an address, if it is one of the pages above. */
export const pageFor = (path) => pages.find((p) => p.path === path) ?? null

/** "Rules — Rameirah Empire", or the homepage's own title. */
export const fullTitle = (title) => (title ? `${title} — ${site.name}` : HOME_TITLE)

/** Shorten text to a search-result-sized description, on a word boundary. */
export function clip(text, max = 158) {
  const t = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20))}…`
}
