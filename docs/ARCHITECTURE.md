# Architecture

```
Browser ──► Netlify (client/dist, static)
              │  /api/*  (rewrite, status 200 — same origin for the browser)
              ▼
            Render web service (server/, Express 5)
              │
              ▼
            MongoDB Atlas  ── collections + GridFS bucket "media"
```

- The browser only ever calls `/api/...` on the website's own origin. The session cookie is
  first-party (`SameSite=Lax`), and no API address is compiled into the website.
- Optional direct uploads: with `VITE_API_DIRECT_URL` set, the panel sends files over 4 MB
  straight to Render with a short-lived upload token, because Netlify proxy requests time
  out after 26 s.
- Public pages read `/api/public/*` with a 5-second timeout and fall back to the built-in
  content (`client/src/lib/publicData.js`).

## Roles

| Capability | Admin | Super Admin |
| --- | :---: | :---: |
| Gangs, players, wars | ✓ | ✓ |
| Staff cards and status | ✓ | ✓ |
| Rules (draft, publish, unpublish) | ✓ | ✓ |
| Media library, homepage media | ✓ | ✓ |
| Accounts | — | ✓ |
| Audit log | — | ✓ |

Roles belong to website accounts only. They are never derived from in-game ranks. Every
admin route checks the role on the server (`requireRole`). Anything not listed is denied.

## API

Public (no session, cacheable):

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/health` | `{ ok: true }` |
| GET | `/api/public/gangs` | `{ gangs: [{ id (slug), name, type, …, image, emblem, members }], wars: [{ id, date, sides: [slug, slug], winner, result }] }` |
| GET | `/api/public/staff` | `{ updatedAt, staff: [{ id, name, role, portrait, online, onDuty }] }` |
| GET | `/api/public/rules` | `{ status: 'published' \| 'draft', categories \| null, lastUpdated }` |
| GET | `/api/public/site` | `{ media: { heroVideo, welcomeVideo, posterAdministration, posterGangs, posterWars, posterRules, joinImage } }` (URLs or null) |
| GET | `/api/media/:id` | the file, with byte-range support and immutable caching |

Auth:

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/login` | `{ email, password }` → sets the `shy_session` cookie. Rate-limited per IP and per account. |
| POST | `/api/auth/logout` | clears the cookie |
| GET | `/api/auth/me` | `{ user }` or 401 |
| POST | `/api/auth/password` | `{ currentPassword, newPassword }`. Signs out every other session. |

Admin (session + role, origin-checked, `Cache-Control: no-store`):

| Path | Methods |
| --- | --- |
| `/api/admin/overview` | GET: counts, rule book state, recent activity (Super Admin) |
| `/api/admin/gangs` | GET, POST · `/:id` GET, PUT, DELETE (also deletes that gang's wars) |
| `/api/admin/wars` | GET, POST · `/:id` PUT, DELETE |
| `/api/admin/staff` | GET, POST · `/:id` PUT, DELETE · `/:id/status` PATCH `{ online, onDuty }` |
| `/api/admin/rules` | GET · `/draft` PUT `{ categories }` · `/publish` POST · `/unpublish` POST |
| `/api/admin/media` | GET, POST (multipart `file`) · `/:id` DELETE (409 while in use) · `/upload-token` POST |
| `/api/admin/settings` | GET · `/media` PUT `{ media: { slot: id \| null } }` |
| `/api/admin/users` | Super Admin only: GET, POST · `/:id` PATCH, DELETE |
| `/api/admin/audit` | Super Admin only: GET `?limit=&before=` |
| `/api/upload` | POST multipart `file` with `Authorization: Bearer <upload token>` (direct uploads) |

Errors are JSON `{ message }`: 400 validation, 401 not signed in, 403 role or origin,
404, 409 duplicate or in use, 413 too large, 415 wrong file type, 429 rate-limited.

## Data model

- **User**: email (unique), name, passwordHash (bcrypt, cost 12), role, active,
  tokenVersion (revokes sessions), lastLoginAt.
- **Gang**: slug (unique, public URL), name, type, established, territory, leader,
  headline, description, image, emblem (media ids), verified, order,
  members `[{ name, role, since }]`.
- **War**: date (YYYY-MM-DD), sides `[gangId, gangId]`, winner (one of the sides, or null), result.
- **Staff**: name, role, portrait, order, online, onDuty, statusUpdatedAt.
- **RuleBook** (single document): draft, published, publishedAt.
- **Settings** (single document): media slots.
- **AuditLog**: at, actor, actorEmail, action, target, summary, ip.
- **GridFS `media`**: uploaded files, with contentType, kind and uploadedBy in their metadata.

## Not built (yet)

- An automatic staff status feed from the FiveM server. Today status is set by hand in the
  panel. A FiveM resource could later call a token-protected endpoint to set it.
- Image resizing and transcoding on upload. Upload web-ready files.
- Load testing. No traffic capacity is claimed.
