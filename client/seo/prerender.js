/**
 * Build step: a ready-made HTML page for every public address, and sitemap.xml.
 *
 * The site is a single-page app, so without this every address would answer with the same
 * empty index.html. Search engines and link previews (Discord, WhatsApp, X) would then see one
 * title, one description and no text. After the build this writes, next to index.html:
 *
 *   rules.html, staff.html …           one per page in src/config/seo.js
 *   rules/hon-01.html …                one per rule in the built-in rule book
 *   sitemap.xml                        every address above, for Google and Bing
 *
 * Each page has its own title, description, canonical address, share picture, structured data
 * (JSON-LD) and the page's real text inside #root. The app replaces that text as soon as it
 * starts; it only shows (after a short delay) when JavaScript can't run.
 *
 * Cloudflare (Workers/Pages) and Netlify serve /rules from rules.html automatically.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

import { site, communityLinks } from '../src/config/site.js'
import { SITE_URL, SHARE_IMAGE, SEARCH_NAMES, VERIFY, pages, fullTitle, clip } from '../src/config/seo.js'
import { ruleCategories, rulesMeta } from '../src/content/rules.js'
import { parseBlocks } from '../src/features/rules/markdownText.js'

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Markdown marks inside a line → HTML (the text is escaped first). */
const inline = (s) =>
  esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\s][^*]*)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')

const markdown = (src) =>
  parseBlocks(src)
    .map((b) => {
      if (b.type === 'ul') return `<ul>${b.items.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`
      if (b.type === 'ol') return `<ol start="${b.start}">${b.items.map((x) => `<li>${inline(x)}</li>`).join('')}</ol>`
      if (b.type === 'table') {
        const head = b.head ? `<thead><tr>${b.head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` : ''
        return `<table>${head}<tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      }
      return `<p>${inline(b.text)}</p>`
    })
    .join('\n')

const abs = (p) => SITE_URL + (p === '/' ? '/' : p)
const jsonLd = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
const today = new Date().toISOString().slice(0, 10)

const ORG_ID = `${SITE_URL}/#organization`
const SITE_ID = `${SITE_URL}/#website`
const sameAs = communityLinks.map((l) => l.url).filter(Boolean)

const breadcrumbs = (trail) => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(p) })),
})

/** The public rule books (locked books and divisions stay out, as on the site). */
const books = ruleCategories
  .filter((c) => c.locked !== true)
  .map((c) => ({ ...c, rules: (c.rules ?? []).filter((r) => !(c.lockedDivisions ?? []).includes(r.division)) }))
  .filter((c) => c.rules.length)

/* ------------------------------------------------------------------ the pages */

function nav(current) {
  const links = pages.map((p) => `<a href="${p.path}"${p.path === current ? ' aria-current="page"' : ''}>${esc(p.title ?? 'Home')}</a>`)
  return `<nav aria-label="Main">${links.join(' ')}</nav>`
}

function shell({ path: p, heading, intro, body = '' }) {
  const discord = communityLinks.find((l) => l.id === 'discord')?.url
  return `<div class="seo-shell">
<header><a class="seo-shell__brand" href="/">${esc(site.name)}</a>${nav(p)}</header>
<main>
<h1>${esc(heading)}</h1>
${intro ? `<p class="seo-shell__lede">${esc(intro)}</p>` : ''}
${body}
</main>
<footer>${discord ? `<a href="${esc(discord)}" rel="noopener">Join ${esc(site.name)} on Discord</a> · ` : ''}<a href="/rules">Rules</a> · <a href="/staff">Staff</a></footer>
</div>`
}

function head({ path: p, title, description, type = 'website', ld }) {
  const url = abs(p)
  const image = SITE_URL + SHARE_IMAGE
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="${esc(site.name)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(site.name)} — FiveM roleplay" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    jsonLd({ '@context': 'https://schema.org', '@graph': ld }),
    ...(VERIFY.google ? [`<meta name="google-site-verification" content="${esc(VERIFY.google)}" />`] : []),
    ...(VERIFY.bing ? [`<meta name="msvalidate.01" content="${esc(VERIFY.bing)}" />`] : []),
  ].join('\n    ')
}

const webPage = (p, title, description, trail) => [
  { '@type': 'WebPage', '@id': `${abs(p)}#webpage`, url: abs(p), name: title, description, isPartOf: { '@id': SITE_ID }, inLanguage: 'en' },
  ...(trail ? [breadcrumbs(trail)] : []),
]

function buildPages() {
  const out = []

  for (const page of pages) {
    const title = fullTitle(page.title)
    const description = clip(page.description)
    let body = ''
    let ld
    if (page.path === '/') {
      ld = [
        {
          '@type': 'Organization',
          '@id': ORG_ID,
          name: site.name,
          alternateName: SEARCH_NAMES.filter((n) => n !== site.name),
          url: abs('/'),
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 },
          description: site.description,
          ...(sameAs.length ? { sameAs } : {}),
        },
        {
          '@type': 'WebSite',
          '@id': SITE_ID,
          name: site.name,
          alternateName: SEARCH_NAMES.filter((n) => n !== site.name),
          url: abs('/'),
          description,
          publisher: { '@id': ORG_ID },
          inLanguage: 'en',
        },
        ...webPage('/', title, description),
      ]
      body = `<h2>Inside the city</h2><ul>${pages
        .filter((x) => x.path !== '/')
        .map((x) => `<li><a href="${x.path}">${esc(x.heading)}</a> — ${esc(x.intro)}</li>`)
        .join('')}</ul>`
    } else {
      ld = webPage(page.path, title, description, [
        [site.name, '/'],
        [page.heading, page.path],
      ])
    }
    if (page.path === '/rules') {
      body = books
        .map(
          (b) =>
            `<section><h2>${esc(b.title)}</h2><p>${esc(b.summary)}</p><ul>${b.rules
              .map((r) => `<li><a href="/rules/${r.id}">${esc(r.number)} ${esc(r.title)}</a> — ${esc(r.summary)}</li>`)
              .join('')}</ul></section>`,
        )
        .join('\n')
    }
    out.push({
      path: page.path,
      head: head({ path: page.path, title, description, ld }),
      root: shell({ path: page.path, heading: page.heading, intro: page.intro, body }),
      priority: page.priority,
      changefreq: page.changefreq,
      lastmod: page.path === '/rules' ? rulesMeta.lastUpdated : today,
    })
  }

  // every rule on its own page: the full text people search for ("rameirah rp nlr rule")
  for (const book of books) {
    book.rules.forEach((r, i) => {
      const p = `/rules/${r.id}`
      const title = fullTitle(`${r.number} ${r.title} · Rules`)
      const base = `${r.number} ${r.title}: ${r.summary}`
      const description = base.length <= 128 ? `${base} — ${site.name} RP rules.` : clip(base)
      const prev = book.rules[i - 1]
      const next = book.rules[i + 1]
      const body = [
        `<p><a href="/rules">All rules</a> › ${esc(book.title)}</p>`,
        r.summary ? `<p class="seo-shell__lede"><strong>${esc(r.summary)}</strong></p>` : '',
        markdown(r.text),
        r.penalty ? `<h2>Penalty</h2>${markdown(r.penalty)}` : '',
        r.tags?.length ? `<p>Tags: ${r.tags.map(esc).join(', ')}</p>` : '',
        `<p>${prev ? `<a href="/rules/${prev.id}">← ${esc(prev.number)} ${esc(prev.title)}</a>` : ''}${prev && next ? ' · ' : ''}${
          next ? `<a href="/rules/${next.id}">${esc(next.number)} ${esc(next.title)} →</a>` : ''
        }</p>`,
      ].join('\n')
      const ld = [
        ...webPage(p, title, description, [
          [site.name, '/'],
          ['Rules', '/rules'],
          [`${r.number} ${r.title}`, p],
        ]),
      ]
      ld[0].dateModified = r.updated || rulesMeta.lastUpdated
      out.push({
        path: p,
        head: head({ path: p, title, description, ld, type: 'article' }),
        root: shell({ path: p, heading: `${r.number} ${r.title}`, intro: '', body }),
        priority: 0.6,
        changefreq: 'monthly',
        lastmod: r.updated || rulesMeta.lastUpdated,
      })
    })
  }
  return out
}

const sitemap = (list) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${list
  .map(
    (x) =>
      `  <url><loc>${abs(x.path)}</loc><lastmod>${x.lastmod}</lastmod><changefreq>${x.changefreq}</changefreq><priority>${x.priority.toFixed(1)}</priority></url>`,
  )
  .join('\n')}
</urlset>
`

/** The Vite plugin. */
export default function seoPrerender() {
  let outDir = 'dist'
  return {
    name: 'seo-prerender',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const template = await fs.readFile(path.join(outDir, 'index.html'), 'utf8')
      const START = '<!-- seo:start -->'
      const END = '<!-- seo:end -->'
      const a = template.indexOf(START)
      const b = template.indexOf(END)
      if (a < 0 || b < 0 || !template.includes('<div id="root"></div>'))
        throw new Error('seo-prerender: index.html is missing its seo markers or #root')
      const list = buildPages()
      for (const page of list) {
        const html =
          template.slice(0, a + START.length) +
          '\n    ' +
          page.head +
          '\n    ' +
          template.slice(b).replace('<div id="root"></div>', `<div id="root">${page.root}</div>`)
        const file = page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`
        await fs.mkdir(path.dirname(path.join(outDir, file)), { recursive: true })
        await fs.writeFile(path.join(outDir, file), html)
      }
      await fs.writeFile(path.join(outDir, 'sitemap.xml'), sitemap(list))
      this.info?.(`seo-prerender: ${list.length} pages and sitemap.xml`)
    },
  }
}
