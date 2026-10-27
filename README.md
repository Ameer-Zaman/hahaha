# Rameirah Empire — FiveM community website + admin panel

```
client/   the website (React + Vite) — hosted on Netlify
server/   the API and admin backend (Node + Express + MongoDB) — hosted on Render
```

The website works on its own. Every public page reads from the API when it answers and falls back to the built-in content in `client/src/content/` when it doesn't, so the site never breaks while the server is asleep or not set up yet.

The **admin panel** lives at **`/panel`** on the website. From there the team manages:

- **Clubs**: add, edit or delete the clubs on the Clubs page (name, type, owner, location, logo, order). Each club becomes a playing card in the deck; with none added, the page shows face-down “to be announced” cards.
- **Sections & maintenance**: switch Story, Staffs, Gangs, Clubs, Leaderboard or Rules off (they leave the menu, footer and homepage, and their page says "Closed for now"), and turn on **maintenance mode** with a message, so visitors see a "We'll be right back" screen. Signed-in panel accounts still see the site while it's closed. Every switch is in the audit log.
- **Gangs & players**: name, territory, leader, card image or **short looping video**, emblem and player list. Players can be **imported from JSON**, for one gang or many at once.
- **Wars**: date, the two gangs, winner or draw, and the result. Wars show on both gangs' pages.
- **TDM leaderboard**: players with kills, deaths, wins and matches, typed in or pasted from a spreadsheet (CSV) or JSON. The **Leaderboard** page (`/leaderboard`) ranks them by kills, then K/D, then wins. Its **War** tab ranks gangs automatically from the war records: wins, losses, draws, win rate and last-5 form.
- **Staff**: cards on the **Staffs** page (`/staff`), each with a **department** (Management, PD, EMS … — the page groups by department and gets a filter for each) and optional **social links** (Discord, YouTube, Twitch, Kick, TikTok, Instagram, X, Facebook — shown as the brands' own logos and colours). **Online / On duty** switches show on the site within 30 seconds, and visitors can filter to **Live now**.
- **Rules**: edit a draft, then publish. Until something is published, the site shows its built-in draft.
- **Media library**: upload images (JPG/PNG/WebP/GIF, up to 5 MB) and videos (MP4/WebM, up to 60 MB).
- **Homepage media**: swap the hero video, the welcome video, the four posters and the application-section background without redeploying.
- **Accounts** (Super Admin only): create, disable, re-role, reset or delete accounts.
- **Audit log** (Super Admin only): every sign-in, failed sign-in and change.

---

## Recommended hosting (free, built for thousands of visitors at once)

| Part | Where | Why |
|---|---|---|
| Website + homepage videos | **Cloudflare Pages** (free) | Unlimited bandwidth, served from data centres near every visitor |
| `/api` | a **Cloudflare Pages Function** in front of Render (`client/functions/api/[[path]].js`) | Caches public data at the edge: Render answers a few times a minute, however many visitors |
| API + admin backend | **Render** web service | Small JSON traffic only |
| Photos | **Cloudinary** (free) | Automatic format and quality per device |
| Database | **MongoDB Atlas** (free) | |

In a local test under Cloudflare's runtime, 9,060 requests from 500 simultaneous visitors reached the backend **7 times**, with no errors. While a fresh copy is fetched visitors get the previous one, and if the backend is asleep or down the last good copy keeps being served (up to a day). Changes from the panel reach visitors within about 10–30 seconds.

### Put the website on Cloudflare Pages

1. **dash.cloudflare.com** → sign up (free) → **Workers & Pages → Create → Pages → Connect to Git**, pick this repository. (The owner of the GitHub repository has to approve Cloudflare's access once.)
2. Build settings:
   - **Framework preset:** None
   - **Root directory:** `client`
   - **Build command:** `npm ci && npm run build`
   - **Build output directory:** `dist`
   - **Environment variables:** `NODE_VERSION` = `22` (and `API_ORIGIN` = your API's address if it isn't `https://shyastha-api.onrender.com`)
3. **Save and Deploy.** Your site is live at `https://<project>.pages.dev`; every push to GitHub redeploys it.
4. Render → API service → **Environment** → `CLIENT_ORIGIN`: add the new address, comma-separated, e.g. `https://hahaha-1-oqpe.onrender.com,https://shyastha.pages.dev` → Save.
5. Open `https://<project>.pages.dev/api/health` → `{"ok":true}`, then `/panel` and sign in.
6. Later, a domain: Pages project → **Custom domains**. Add it to `CLIENT_ORIGIN` too.

### …or as a Cloudflare Worker (Cloudflare's newer "Create application" screen)

If Cloudflare shows **Set up your application** with a *Deploy command* field, it is creating a Worker. That works too, using `wrangler.jsonc` at the repo root (`client/worker/index.js` runs the same `/api` proxy and cache):

- **Project name:** `hahaha` (must match `name` in `wrangler.jsonc`)
- **Build command:** `npm ci --prefix client && npm run build --prefix client`
- **Deploy command:** `npx wrangler deploy`
- **Advanced settings:** leave the root directory empty; add the variable `NODE_VERSION` = `22`

The site is then at `https://hahaha.<your-subdomain>.workers.dev`. Use that address in `CLIENT_ORIGIN` (step 4 above). The edge cache works best on a custom domain (Worker → **Settings → Domains & Routes**); on `workers.dev`, each Cloudflare server still shares one request per refresh between its visitors.

### Homepage videos

Put the two homepage videos in `client/public/assets/video/` as `home.mp4` and `welcome.mp4` and push: Cloudflare delivers them for free. Each file must be under **25 MB** (Cloudflare Pages' limit); aim for **5–8 MB** (720p–1080p, 10–15 s, see "Videos" below) so they start quickly on phones. Leave the panel's Homepage media video slots empty, so the videos aren't delivered from Cloudinary's monthly quota.

Only the hero video is downloaded during the intro; the welcome-banner video starts when a visitor scrolls to it.

## 1 · Run it on your computer

Needs **Node 22**. Nothing else: no database to install, no accounts to create.

```bash
npm install              # root helper (runs both apps together)
npm run install:all      # installs client/ and server/
npm run dev              # API on :4000 + website on http://localhost:5173
```

The first `npm run dev`:
- creates `server/.env` with a random session secret and a first **Super Admin login**, printed in a box in the terminal (also saved in `server/.env`);
- starts a **built-in local database** that keeps its data in `server/.local-db/`. The very first start downloads MongoDB once (~100 MB), so give it a minute.

Then open **http://localhost:5173/panel** and sign in with the email and password from the box. Change the password in the panel under **Account**.

- **Use MongoDB Atlas instead:** put its connection string in `MONGODB_URI` in `server/.env` (see step 2).
- **Start the database from scratch:** stop the app and delete `server/.local-db/`. The Super Admin from `server/.env` is created again on the next start.

Other commands: `npm run build` (website → `client/dist`), `npm run lint`, `npm test` (server unit tests).

In development, Vite forwards `/api/*` to the local server, the same way the hosted website does.

---

## 2 · Create the database (MongoDB Atlas, free)

1. Sign up at **cloud.mongodb.com** and create a **free (M0) cluster**.
2. **Database Access → Add new database user.** Choose a username and a long password (letters and numbers only, so it needs no escaping in the URL).
3. **Network Access → Add IP address → `0.0.0.0/0`** (allow from anywhere). Render's free plan has no fixed IP, so this is needed. The strong password is what protects the database.
4. **Connect → Drivers** and copy the connection string. Put your password in, and add the database name `shyastha` before the `?`:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/shyastha?retryWrites=true&w=majority
   ```
   This is your `MONGODB_URI`. Keep it secret.

Uploaded images and videos are stored in the same database (GridFS). The free tier has **512 MB**, which is room for a few videos. Keep videos small (see "Videos" below).

---

## 3 · Deploy the server on Render

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → pick the repo. Render reads `render.yaml` and creates the web service **shyastha-api** (root directory `server/`).
3. Fill in the values it asks for:

   | Variable | Value |
   | --- | --- |
   | `MONGODB_URI` | the Atlas string from step 2 |
   | `CLIENT_ORIGIN` | already set to `https://hahaha-1-oqpe.onrender.com` in `render.yaml`. Change it if the website's address changes (no slash at the end; separate several with commas) |
   | `SUPERADMIN_EMAIL` | the first Super Admin's email |
   | `SUPERADMIN_PASSWORD` | at least 10 characters |

   `JWT_SECRET` is generated by Render. `TRUST_PROXY=2` and `NODE_ENV=production` are already set.
4. When it's live, open `https://<your-service>.onrender.com/api/health`. It should answer `{"ok":true}`.
5. The first start creates the Super Admin. **Then delete `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD`** from Render. They are only ever used while the database has no accounts.

> Render's free plan sleeps after 15 minutes without visitors, and the next request takes up to a minute to wake it. Public pages don't wait: they show the built-in content and pick up live data on the next visit. The panel shows "waking the server…" and retries on its own.

## 4 · Point the website at the server (website on Render)

If the website is a **Render static site** (for example `https://hahaha-1-oqpe.onrender.com`):

1. Open the static site on Render → **Redirects/Rewrites**, and make the rules exactly these, in this order:

   | # | Source | Destination | Action |
   | --- | --- | --- | --- |
   | 1 | `/api/*` | `https://<your-api>.onrender.com/api/*` | Rewrite |
   | 2 | `/*` | `/index.html` | Rewrite |

   The `/api/*` rule must be above `/*`. Otherwise API calls get the website page back, and the panel says "Server not connected".
2. Static site → **Environment**: delete `VITE_USE_API` if it's there.
3. **Manual Deploy → Clear build cache & deploy.**
4. On the API service, `CLIENT_ORIGIN` must be the website's address exactly, e.g. `https://hahaha-1-oqpe.onrender.com` (no slash at the end).
5. Open `/panel` on the website and sign in with the Super Admin email and password.

## 4b · Point the website at the server (website on Netlify)

1. In **`netlify.toml`**, replace `https://shyastha-api.onrender.com` in the `/api/*` rule with your Render address. Commit and push.
2. Netlify → Site configuration → Build & deploy: leave **Base directory** empty (`netlify.toml` sets `client`), or set it to `client`. Then **Clear cache and deploy**.
3. Open `https://<your-site>.netlify.app/panel` and sign in.

Netlify forwards `/api/*` to Render behind the scenes, so the API lives on the website's own address and the login cookie stays first-party. Netlify stops proxied requests after 26 seconds, which can cut off big video uploads. To upload big files straight to Render, set **`VITE_API_DIRECT_URL`** = your Render address in Netlify's environment variables and redeploy. The panel then sends files over 4 MB directly, using a 10-minute upload-only token.

---

## Security model

- **No public sign-up.** The first Super Admin comes from environment variables, only while the database is empty. After that, only a Super Admin can create accounts.
- **Roles are website-only.** *Admin* manages content. *Super Admin* also manages accounts and reads the audit log. An in-game rank never grants anything here.
- **Deny by default, enforced on the server.** Every `/api/admin` route requires a valid session and an explicit role. The panel hides what an account can't use, but hiding is not the protection.
- **Sessions** are signed JWTs in an `httpOnly`, `SameSite=Lax`, `Secure` cookie (12 hours). Changing a password, or disabling or re-roling an account, signs it out everywhere.
- **CSRF:** state-changing requests must come from an origin listed in `CLIENT_ORIGIN`.
- **Sign-in throttling:** 10 attempts per 15 minutes, both per IP and per account. Unknown emails take as long as wrong passwords.
- **Uploads** are identified by their actual bytes, not their file name. SVG and other types are refused, and sizes are capped.
- **Guard rails:** you can't disable or delete your own account, and there is always at least one active Super Admin.
- **Audit log** of sign-ins, failed sign-ins and every change.
- **Secrets** live only in environment variables. `server/.env` is git-ignored.

## Rules help chat (free) + Discord

A gold chat button sits in the corner of every page. Visitors ask about the rules ("can I RDM?", "what is NLR?") and get the matching rules straight from the rule book, with a link to each one on the Rules page. It runs in the visitor's browser — free, instant, no AI and no API key — and it only ever quotes the real rules (the published rule book, or the draft while nothing is published). Common slang is understood (RDM, VDM, NLR, meta, cops, mod menu, banned …).

When no rule fits, **Ask staff** sends the question to a **thread in your Discord**; staff reply in that thread and the reply appears in the visitor's chat window. In a thread, `!close` ends the chat and `!block` stops that visitor. Without the Discord bot, visitors get a link to your Discord instead. Switch the chat off in **Panel → Sections & maintenance**.

**Discord bot (free)**
1. discord.com/developers/applications → **New Application** → **Bot**: **Reset Token** and copy it; turn on **Message Content Intent**.
2. **OAuth2 → URL Generator**: scope `bot`; permissions *View Channels, Send Messages, Create Public Threads, Send Messages in Threads, Read Message History, Add Reactions* → open the link and add the bot to your server.
3. Create a private channel, e.g. `#website-questions`, visible to staff and the bot. Discord → Settings → Advanced → **Developer Mode** on, then right-click the channel → **Copy Channel ID**.
4. Render → `shyastha-api` → **Environment**: `DISCORD_BOT_TOKEN` = the token, `DISCORD_CHAT_CHANNEL_ID` = the channel id, optionally `DISCORD_STAFF_ROLE_ID` (right-click your staff role → Copy Role ID) to ping staff on each question. Save; the server restarts.
5. Panel → Rules help chat should show Discord as **Connected**.

The bot lives in the API server, so it's only online while the server is awake. On Render's free plan the server sleeps after 15 minutes without visitors; the repo's "keep API awake" GitHub workflow pings it every 10 minutes to prevent that. Visitors can't send links, messages are rate-limited, and chats are deleted 30 days after the last message.

## Importing players from JSON

**Gangs → Import players (JSON)** fills several gangs at once. **Import JSON** on a gang's own page fills just that gang; press Save afterwards. Paste the JSON or choose a `.json` file, check the preview, then pick one:
- **Add to the list:** new names are added, and names already listed get their role / since updated.
- **Replace the list:** the imported players become the whole list.

```json
{
  "harbor-wolves": [
    { "name": "Mara Voss", "role": "Leader", "since": "2026" },
    { "name": "Dex Hollow", "role": "Enforcer" },
    "Juno Park"
  ],
  "Ash Kings": [{ "player": "Theo Grant", "rank": "Boss" }]
}
```

Gangs are matched by their address (`harbor-wolves`) or exact name, and must already exist. Also accepted:
- a flat list with a `"gang"` field on each player;
- `{ "players": [...] }` for a single gang;
- the field names `player`, `character`, `ign` and `username` (for the name), `rank` (for the role) and `joined` (for since).

Duplicate names are merged, and there are at most 200 players per gang. The panel has an **Example file** button.

## Gang card videos

On a gang's page in the panel, **Card media → Card video** takes a 5–10 second clip. It plays muted on a loop instead of the card image, on the reel and on the gang's own page:
- Only the card in focus plays. Cards spinning past don't download anything.
- The image shows while the clip loads, and for visitors with reduced motion or data saver on.
- Keep clips under ~8 MB. The panel warns if a clip is longer than 15 seconds.

## Photos and videos on Cloudinary (recommended)

With Cloudinary connected, everything uploaded in the panel is stored on Cloudinary and delivered from its worldwide network: photos automatically in the best format (AVIF/WebP) and quality for each visitor, videos straight from the CDN. The free plan has 25 credits a month (plenty for a community site), 10 MB photos and 100 MB videos.

1. Sign up at **cloudinary.com** (free).
2. **Settings → API Keys**, copy the **API environment variable**. It looks like `cloudinary://123456789012345:AbCdEf…@your-cloud-name`. Keep it secret.
3. Render → your **API** service → **Environment** → add `CLOUDINARY_URL` with that value → Save (the API restarts).
   For local development, put the same line in `server/.env`.
4. Open **Panel → Media library**: it now says "Stored on Cloudinary". Upload as usual.

How it works:
- The panel uploads **straight to Cloudinary** with a short-lived permission signed by the API, so big videos never pass through Render or the website.
- The API then checks Cloudinary's signature on the upload, reads the file's real type and size from Cloudinary, and adds it to the library (in the `shyastha` folder on Cloudinary; change with `CLOUDINARY_FOLDER`).
- Deleting a file in the panel deletes it on Cloudinary too. Files uploaded before Cloudinary was connected keep working from the database.
- Without `CLOUDINARY_URL`, uploads are stored in the database as before.

## Videos

Keep each video under ~10–20 MB (H.264, 1080p or less, with `faststart`):

```bash
ffmpeg -i in.mp4 -vf scale=-2:1080 -c:v libx264 -preset veryfast -crf 26 -movflags +faststart -an out.mp4
```

Videos are streamed with byte ranges, so they start quickly and can seek.

## Loading screen and preloading

Opening the homepage shows a loading screen (the name, a gold progress bar and a percentage) while the site downloads the hero video, poster images, welcome sound and music, so the page is instant once the visitor enters. It closes as soon as everything is downloaded (at least ~1 second, at most 12), then the welcome screen opens. Return visits load from the browser's saved copies, so it's brief.

- Videos up to 80 MB are downloaded whole and played from memory, so moving between pages and back to the homepage never waits. Bigger ones, or any still downloading when the loading screen ends, stream as usual and are saved in the background for next time.
- Visitors who land on another page first get the homepage videos downloaded quietly in the background (unless they've asked their browser to save data).
- The videos are also saved in the visitor's browser, so return visits play them straight from disk. A tiny check asks the server whether a file was replaced; if so, the new one is downloaded instead. Replacing a video (same name or in the panel) is picked up automatically.
- The loading screen's timings are at the top of `client/src/components/intro/LoadingScreen.jsx`; the preloader is `client/src/lib/preload.js`.
- The welcome screen's handwritten line and the small line below the name are `site.welcome` in `client/src/config/site.js` (an empty tagline hides it).

## Story page videos

The Story page (`/story`) is a long cinematic scroll in the style of the GTA VI site. Its full-screen **scene videos scrub with the scroll**: scrolling moves the video forward and back. Smooth scrubbing needs a keyframe in every few frames, so encode scene videos like this (1080p, no audio):

```bash
ffmpeg -i in.mp4 -vf scale=1920:-2 -c:v libx264 -preset veryfast -crf 24 -g 6 -keyint_min 6 -pix_fmt yuv420p -movflags +faststart -an city.mp4
```

Keep scene clips short (5–15 s) and under ~25 MB. Drop them into `client/public/assets/video/story/` with these names:

| Scene | File |
| --- | --- |
| Chapter one: The City | `city.mp4`, cards `city-a.mp4`, `city-b.mp4`, quote `quote-1.mp4` |
| Chapter two: The Streets | `streets.mp4`, cards `streets-a.mp4`, `streets-b.mp4`, quote `quote-2.mp4` |
| Chapter three: After Dark | `night.mp4`, cards `night-a.mp4`, `night-b.mp4` |

Card videos simply loop while on screen, so normal encoding is fine for them. Missing files show the illustrated skyline instead. The text, the file names and the number of chapters are all in `client/src/content/story.js`. The copy there is a draft: rewrite it freely.

## Website content without the panel

The built-in content is what visitors see while the API has nothing (or is down):

| What | Where |
| --- | --- |
| Name, Discord invite, links, homepage media files | `client/src/config/site.js` |
| Homepage copy | `client/src/content/home.js` |
| Built-in gangs (empty → demo gangs, marked "Demo data") | `client/src/content/gangs.js` |
| Built-in rules draft | `client/src/content/rules.js` |
| Colours, type, spacing | `client/src/styles/tokens.css` |
| Image / video files | `client/public/media/…`, `client/public/assets/video/…` |

Set `VITE_USE_API=false` to build a purely static site that never calls the API.

## Structure

```
client/src/
  app/              routes (/panel is its own lazy chunk)
  config/ content/  site settings and built-in content
  features/         home, story, staff, gangs, clubs, leaderboard, rules — and panel/ (the admin panel)
  lib/api.js        API client;  lib/publicData.js  cached public reads + fallback
server/src/
  config/env.js     environment (fails fast if anything required is missing)
  models/           User, Gang, War, Staff, RuleBook, Settings, AuditLog
  routes/           auth, public, media, admin/*
  middleware/       auth + roles, origin check, validation, errors, upload tokens
  services/         audit log, media (GridFS), first Super Admin bootstrap
```

API reference: `docs/ARCHITECTURE.md`.

---
Not affiliated with or endorsed by Rockstar Games, Take-Two Interactive or Cfx.re.
