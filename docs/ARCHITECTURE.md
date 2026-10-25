# Architecture and next phases

This document records the agreed direction for the backend phases. Nothing here is implemented yet. Phase 1 deliberately ships no backend code, no empty modules and no placeholder authentication.

## Frontend contracts already in place

The frontend talks to the backend through two configured endpoints. Build the backend to these contracts and the UI starts working without changes.

### `POST /api/applications` (`VITE_APPLICATIONS_ENDPOINT`)

Request body (JSON), as produced by `src/features/apply/applicationSchema.js → toPayload()`:

```json
{
  "discord": "string",
  "email": "string (may be empty)",
  "characterName": "string",
  "experience": "new | some | experienced",
  "backstory": "string",
  "motivation": "string",
  "rulesAccepted": true
}
```

Responses:
- `2xx` with `{ "reference": "optional string" }`: the UI shows "Application sent".
- `4xx/5xx` with `{ "message": "string" }`: the UI shows the message and keeps the answers.

**The server must re-validate every field** with the same limits as the schema. Client validation is a convenience, not a boundary. Also apply rate-limiting per IP and per Discord name, size limits, and spam checks. The form already sends a honeypot field (`website`) that must be empty.

### `GET /api/staff/status` (`VITE_STAFF_STATUS_ENDPOINT`)

```json
{
  "updatedAt": "ISO-8601",
  "staff": [{ "id": "matches content/staff.js id", "online": true, "onDuty": false }]
}
```

Polled every 60 seconds by `useStaffStatus`. Serve it from a short cache (around 15–30 s) so visitor traffic never reaches the game server directly.

## Backend (Node.js + Express + MongoDB)

Planned layout, created only when each part has real code:

```
server/
  src/
    config/        env loading + validation (fail fast on missing secrets)
    routes/        URL → controller wiring only
    controllers/   HTTP in/out, no business logic
    services/      business rules (applications, wars, staff, accounts)
    repositories/  MongoDB access
    models/        Mongoose schemas
    middleware/    auth, permissions, rate limits, validation, errors
    validation/    request schemas (shared limits with the frontend schema)
    integrations/  FiveM status bridge
    audit/         audit log writer
```

### Data (first pass)

- `applications`: payload, status (`submitted | in_review | accepted | rejected`), reviewer, notes, timestamps
- `gangs`: name, slug, emblem, image, territory, description, verified, timestamps
- `wars`: date, participants (gang refs), outcome, kill list entries `{ player name, gang, kills, … }`, verified, author
- `staffProfiles`: published name, role, group, portrait, linked in-game id for status
- `accounts`: website login identities with a `role` of `admin` or `superadmin`
- `auditLog`: actor, action, target, before/after summary, IP, timestamp (append-only)

Player names appear only inside war kill lists. No player directory, player profiles or collectible cards.

## Roles and permissions

Two website roles, **independent of in-game FiveM ranks**. An in-game rank never grants website access, and certainly never Super Admin.

| Permission | Admin | Super Admin |
| --- | :-: | :-: |
| Review and process applications | ✓ | ✓ |
| Manage war records | ✓ | ✓ |
| Manage rules and published content | ✓ | ✓ |
| Update approved staff directory entries | ✓ | ✓ |
| Create, deactivate and manage Admin accounts | | ✓ |
| Grant and revoke Admin access | | ✓ |
| Manage integrations and critical settings | | ✓ |
| Read audit logs | | ✓ |

### Security requirements

- Enforce permissions **on the server** for every protected route through one central `can(account, permission)` check. Deny by default.
- Never trust a role sent by the client. Load it from the session's account record on every request.
- Admins cannot change any account's role, including their own. Role changes are Super Admin only and are audited.
- No public Super Admin registration. Provision the first Super Admin with a one-off CLI command run on the server (`npm run provision:superadmin`) that reads credentials from the environment, refuses to run if a Super Admin already exists, and writes an audit entry.
- Sessions: httpOnly, Secure, SameSite=Lax cookies; rotate on login; short idle timeout for admin sessions. Consider Discord OAuth for identity, mapped to website accounts that a Super Admin approves.
- Secrets only in environment variables or a secret manager. Never commit credentials.
- Validate every request body. Rate-limit login, applications and all write endpoints. Add CSRF protection on cookie-authenticated writes.
- Audit-log every administrative change (who, what, when, from where).

## Performance and operations (before claiming 2,000+ concurrent visitors)

The public site is static and can be served entirely from a CDN, which is the main reason it should scale. The API is the part that needs proving:

1. Cache read endpoints (staff status, gangs, wars) at the edge or in memory with short TTLs.
2. Load-test realistic mixes (page views plus application submissions) with k6 or Artillery at and above the target.
3. Monitoring (uptime, error rates, latency), MongoDB backups with tested restores, and a written recovery plan.

Only state a capacity figure after those tests pass.

## Suggested order for Phase 2

1. Applications API + MongoDB + server validation + rate limiting (launch-critical).
2. Super Admin provisioning, authentication, roles and the audit log.
3. Admin review screen for applications.
4. Rules and gangs managed from the admin area instead of static files.
5. War archive (list, detail with kill list, search and filters, pagination).
6. FiveM staff-status bridge.
