# Operations Center Backups Security Evidence

Linear: USA-91

## Scope

USA-91 adds `Infrastructure / Backups` inside the existing Operations Center at
`/admin/operations-center/infrastructure/backups`. It reuses the USA-86 backup
engine under `~/USAM-Automation/backup` and does not create a separate app.

## Secret Handling

- The dashboard can collect database, encryption, and Backblaze values only
  after pairing with the Mac Mini backup agent at `http://127.0.0.1:47691`.
- Secret setup requests are sent directly from the browser to the loopback
  agent. They do not pass through Vercel, Supabase, Linear, or the web app API.
- The agent stores secrets in macOS Keychain:
  - `usam-supabase-db-password`
  - `usam-backup-gpg-passphrase`
  - `usam-backup-b2-key-id`
  - `usam-backup-b2-application-key`
- Backblaze B2 setup validates the supplied key with rclone before writing
  Keychain items or `OFFSITE_MODE`.
- `backup.env` receives only the non-secret `OFFSITE_MODE` destination path.
- API responses are `private, no-store` and sanitize action output.
- The client component does not use `localStorage`, `sessionStorage`, cookies,
  or browser persistence for backup state or the local agent session token.

## Agent Boundary

- GET `/api/admin/operations-center/backups` is admin-authenticated and
  read-only.
- POST `/api/admin/operations-center/backups/actions` refuses live actions with
  HTTP 410. The web server never receives setup secrets and never runs backup
  commands.
- The local agent binds only to `127.0.0.1`.
- The local agent allows only trusted USA Missionaries/Vercel/local origins.
- The local agent requires a Mac-displayed pairing code and an in-memory bearer
  session for status, setup, validation, backup, and restore-test endpoints.
- The local agent exposes fixed endpoints only. It accepts no command, argument,
  path, shell, environment, or arbitrary script field.
- Approved local operations are limited to:
  - Keychain writes for known USA-86 services
  - Database credential validation with `psql select 1`
  - Backblaze validation with `rclone lsd`
  - `backup/bin/usam-backup.sh`
  - `backup/bin/usam-restore.sh --latest`
  - `backup/bin/usam-backup-selftest.sh`
- No general shell endpoint exists.

## Production Safety

- No production schema migration is added.
- No production data write path is added.
- No production deployment, DNS, custom domain, or Vercel promotion path is
  added.
- Restore testing stays with USA-86, whose restore script refuses non-local
  database targets.
- Code Protection is read-only and exposes no repository mutation actions.

## One-Time Installation

Install the local agent once on the Mac Mini:

```bash
npm run backup-agent:install
```

After that, the founder pairs from the Operations Dashboard and can configure
Supabase credentials, encryption, Backblaze, first backup, off-site validation,
and restore tests without routine Terminal use.

## Known Limits

- A protected preview can show the control surface and pair with the Mac Mini
  agent from the founder's browser. Vercel itself cannot run Mac Mini actions.
- Supabase logical dumps do not contain Auth JWT secrets, API keys, Edge
  Function source, or Vercel project settings; the dashboard surfaces that gap
  in the read-only Code Protection card.
