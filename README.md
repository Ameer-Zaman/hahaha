# Community website — Phase 1

Pre-launch website for a FiveM roleplay community. React + Vite, custom CSS design tokens, GSAP for motion.

Design language: black and gold, condensed uppercase display type (Anton), Archivo for text, Space Mono for small labels, pill buttons and diamond markers — modelled on the Nova RP page pattern.

Phase 1 covers the frontend: homepage, Gangs archive, and foundations for the Admin directory and Rules pages (applications go through Discord). There is **no backend yet**, and the site is honest about that everywhere it matters.

## Run it

```bash
npm install
npm run dev       # local development at http://localhost:5173
npm run build     # production build to dist/
npm run preview   # serve the production build at http://localhost:4173
npm run lint      # oxlint
```

Requires Node 20.19+ or 22.12+ (Vite 8).

## Make it yours: what to edit

Everything unconfirmed lives in a few files. Nothing in them is an official fact until the team replaces it.

| What | Where |
| --- | --- |
| Community name, tagline, launch status | `src/config/site.js` → `site` (also update `<title>` and meta tags in `index.html`) |
| Discord / social links (hidden while empty) | `src/config/site.js` → `communityLinks` |
| Photos and video (hero, trailer banner, poster wall, How to join background `public/media/home/join.jpg`, gangs) | `src/config/site.js` → `media`; put files in `public/media/` |
| Trailer link (adds the play button) | `src/config/site.js` → `media.trailer.youtubeUrl` |
| Hero video (your own clip) | `public/media/home.mp4`, set in `src/config/site.js` → `media.hero.video` |
| Welcome banner video (YouTube) | `src/config/site.js` → `media.trailer.youtube` (`id`, `title`, `credit`; set `id: null` to turn off) |
| Logo (currently a placeholder diamond) | `src/components/ui/BrandMark.jsx` |
| Discord invite (every Apply button opens it) | `src/config/site.js` → `DISCORD_INVITE` |
| Staff status endpoint | `.env` → `VITE_STAFF_STATUS_ENDPOINT` |
| Homepage copy | `src/content/home.js` |
| Gangs (official entries only) | `src/content/gangs.js` → `gangs` |
| Staff directory | `src/content/staff.js` → `staff`, `roleGroups` |
| Rules (currently a **draft**) | `src/content/rules.js`; set `rulesMeta.status = 'published'` when final |
| Colours, type, spacing, motion | `src/styles/tokens.css` |

### Media

Until photography is supplied, every image slot renders an original, procedurally drawn night-city plate (`src/components/media/CityPlate.jsx`), so nothing ever shows a broken image. Drop in real in-game screenshots to replace it:

- Full-bleed images: WebP or AVIF, about 1920px wide, under ~300 KB.
- Hero video (optional): short, muted MP4 loop under ~4 MB. The image underneath remains the fallback, and the video never plays for visitors who prefer reduced motion.

### Videos

- **Hero:** `public/assets/video/home.mp4` (set in `media.hero.video`). Plays muted and looped, with no player buttons, and pauses when scrolled away.
- **Welcome to the city:** `public/assets/video/welcome.mp4` (set in `media.trailer.video`). Plays muted and looped behind the title, with no player buttons. A **Watch on YouTube** button opens `media.trailer.youtubeUrl` in a new tab; the credit line (`media.trailer.credit`) is shown under it. Clear the credit if the video is your own footage.
- If a file is missing, the illustrated skyline shows instead. For fast loading keep each video under ~10–20 MB: H.264, 1080p or less, with `faststart` (`ffmpeg -i in.mp4 -vf scale=-2:1080 -c:v libx264 -preset veryfast -crf 26 -movflags +faststart -an welcome.mp4`).
- With reduced motion or data saver on, the videos don't autoplay.

## Welcome screen

First-time visitors who land on the homepage see a royal, minimal welcome: "Welcome to", **Shyastha** in Cinzel with a gold sheen, a gold hairline, and a quiet "Scroll to enter".

- **Water-drop transition** (`src/components/intro/rippleRenderer.js`, one small WebGL shader, no libraries): on arrival a single drop sends soft rings through the lettering. Scrolling sends a wave front out from the centre that refracts the screen (gold crest, slight colour split) and dissolves it into the site. A small scroll moves the wave and lets it settle back; past about a quarter it glides through on its own (1.6 s, time-based, so it's the same speed on any device).
- Click / tap anywhere, or press Enter, Space, ↓ or Escape, to enter. Tab reveals an "Enter the city" button for keyboard and screen-reader users.
- Shown once per browser session, never when someone arrives via a link to another page.
- With reduced motion, or without WebGL, the same text simply fades.
- To turn it off, return `false` from `shouldShowIntro` in `src/lib/intro.js`.

## Parallax and motion

Parallax is declarative. Wrap a container in `<ParallaxScope>` (or put `data-parallax-scope` on an element and call `useParallax(ref)`), then mark decorative layers inside it:

```jsx
<span data-parallax="y:60:-60" />     {/* moves 60px → -60px as the scope crosses the screen */}
<div data-parallax="x:0%:-30%" />     {/* percentages move relative to the element's own size */}
```

- `<Plate parallax />` gives the city skyline real depth (far, mid and near layers move at different speeds) or lets a photo drift inside its frame.
- `<ParallaxWord text="…" />` adds an oversized outlined word behind a section.
- Only decorative layers move. Text and controls never do, nothing is pinned, and scrolling is never hijacked.
- Everything is switched off when the visitor prefers reduced motion.

Also included: a reading-progress bar, a header that tucks away while scrolling down and returns on scroll up (never while focused or with the menu open), and a fade-in on page change.

## Gangs page

**The reel (`/gangs`).** An endless film reel: rounded cinematic cards stacked vertically, the cards before and after peeking in, and after the last gang comes the first again. The page has no footer and doesn't scroll; the reel turns instead.

- On arrival the reel spins through every gang (two laps) and eases to a stop on the first one.
- The mouse wheel, trackpad, touch swipes, mouse drag and the arrow / Page / Space keys turn the reel. It glides with weight, and each gesture settles on the next card. A drag never opens a gang by accident.
- While it turns fast the reel leans with the speed, pictures drift inside their frames, and cards away from the centre shrink and dim.
- Each card shows a big name whose letters roll in, and a credits table (Leader, Territory, File) bottom-left, with an **Explore** button bottom-right. A cream "Admit one" ticket in the corner counts the gangs with rolling digits.
- Coming back from a gang's page lands on that gang (no spin).
- With reduced motion turned on, there is no spin or loop: the cards are simply stacked and the page scrolls.
- Until real gangs are added, the cards are named Gang 01 … Gang 06. Tune the feel with `LERP`, `INTRO_TURNS` and `INTRO_SECONDS` in `src/features/gangs/components/Reel.jsx`.

**A gang's own page (`/gangs/<id>`).** Explore opens it. It shows the poster card, the **war record** (date, opponent, outcome, result, with won/lost/drawn totals) and the **player list** (name, role, since). Anything not supplied yet says so plainly. Player names are plain text; there are no player profile pages.

**Adding real data** (all in `src/content/gangs.js`):
- `gangs`: name, type, established, territory, leader, headline, description and `members`.
- `wars`: date, the two gang ids, the winner (or `null` for a draw) and a short result.
- Images: drop `file-01.jpg`, `file-02.jpg`… into `public/media/gangs/` (by position), or set `image` on a gang.

## Honesty rules built into the UI

- **Applications:** applications happen on Discord. Every Apply button opens the Discord invite in a new tab (`/apply` redirects there too). Until `DISCORD_INVITE` is set, the buttons show as inactive with a "Discord invite coming soon" hint instead of linking nowhere.
- **Staff status:** with no `VITE_STAFF_STATUS_ENDPOINT`, no online or on-duty state is shown at all. If the endpoint fails, staff show "Status unavailable".
- **Gangs:** while `gangs` is empty, the archive shows numbered *reserved files* with no names or claims, marked "Awaiting confirmation".
- **Rules:** shown with a "Draft — not yet published" notice until `rulesMeta.status` is `'published'`.
- **Launch:** the site says "Server in preparation" until `site.launch.isLive` is `true`. It never shows player counts.

## Structure

```
src/
  app/            routes (inner pages are code-split)
  config/         site identity, links, media, integrations, navigation
  content/        all copy and data, separate from presentation
  components/     layout (header, footer), media (Plate, CityPlate)
  features/
    home/         homepage sections
    gangs/        archive page: model + components
    admin/        directory + live status hook
    rules/        rules page
  hooks/ lib/     page title, GSAP setup (plugins registered once)
  styles/         tokens, base, shared components
```

## Motion and accessibility

- GSAP animations run inside `gsap.matchMedia('(prefers-reduced-motion: no-preference)')` and are reverted on unmount. Content is fully visible if JavaScript animation never runs.
- No scroll-jacking or pinning. Scroll effects are scrubbed parallax and reveals only.
- Skip link, visible focus states, a keyboard-trapped mobile menu (Escape closes it), labelled form errors with a focused error summary.

## Deploying

The site is a static single-page app (`dist/`). It needs a fallback to `index.html` for client-side routes:

- **Vercel:** `vercel.json` is included (also sets long-term caching on hashed assets).
- **Netlify / Cloudflare Pages:** `public/_redirects` is included.
- **Nginx:** `try_files $uri /index.html;`

Serve `dist/` from a CDN. The site has not been load-tested; see `docs/ARCHITECTURE.md` before claiming any traffic capacity.

## Next phase

See `docs/ARCHITECTURE.md`: Express + MongoDB backend for applications, authentication with separate Admin and Super Admin roles, war records, and FiveM staff-status integration.

---
Not affiliated with or endorsed by Rockstar Games, Take-Two Interactive or Cfx.re.
