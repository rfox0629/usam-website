# Operations Center Backups Security Evidence

Linear: USA-91

## Scope

USA-91 adds `Infrastructure / Backups` inside the existing Operations Center at
`/admin/operations-center/infrastructure/backups`. It reuses the USA-86 backup
engine under `~/USAM-Automation/backup` and does not create a separate app.

## Secret Handling

- The dashboard never asks for database passwords, GPG passphrases, webhook URLs,
  Backblaze application keys, Supabase service keys, or rclone credentials.
- Credential setup remains on the Mac Mini through
  `~/USAM-Automation/backup/bin/usam-backup-setup-secrets.sh`.
- Backblaze B2 setup remains local through rclone; the dashboard only reads the
  non-secret `OFFSITE_MODE` shape from USA-86 config when available.
- API responses are `private, no-store` and sanitize action output.
- The client component does not use `localStorage`, `sessionStorage`, cookies,
  or browser persistence for backup state.

## Agent Boundary

- GET `/api/admin/operations-center/backups` is admin-authenticated and read-only.
- POST `/api/admin/operations-center/backups/actions` is admin-only and requires
  a same-origin request plus `x-usam-operations-intent: backups`.
- POST accepts a fixed `actionId` only. It has no command, argument, shell,
  path, environment, or payload passthrough.
- Local execution is disabled unless the Mac Mini runtime sets
  `USAM_BACKUP_AGENT_LOCAL_EXECUTION=enabled`.
- Approved commands are limited to:
  - `backup/bin/usam-backup.sh`
  - `backup/bin/usam-restore.sh --latest`
  - `backup/bin/usam-backup-selftest.sh`
  - `/usr/bin/security find-generic-password` for presence checks only
- No general shell endpoint exists.

## Production Safety

- No production schema migration is added.
- No production data write path is added.
- No production deployment, DNS, custom domain, or Vercel promotion path is
  added.
- Restore testing stays with USA-86, whose restore script refuses non-local
  database targets.
- Code Protection is read-only and exposes no repository mutation actions.

## Known Limits

- A protected preview can show the control surface and read-only safeguards, but
  it cannot run Mac Mini actions unless the dashboard is running on the Mac Mini
  with local execution enabled.
- Supabase logical dumps do not contain Auth JWT secrets, API keys, Edge
  Function source, or Vercel project settings; the dashboard surfaces that gap
  in the read-only Code Protection card.
