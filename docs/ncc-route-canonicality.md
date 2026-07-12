# /admin vs /ncc Route Canonicality Decision

**Decision: `/ncc` is the new canonical route tree going forward. `/admin` remains fully
functional, unredirected, and unmodified by this branch.**

## What changed

Nothing under `app/admin/**` was edited to build this phase. `/ncc` is a new,
additive route tree (`app/ncc/**`) that:

- Shares the exact same authentication and authorization gate as `/admin`
  (`getAdminAuthorization()` from `src/lib/admin-auth.ts` — no new identity
  system, no new roles).
- Reuses `admin_users` roles (`admin`/`editor`/`viewer`) unchanged.
- For departments not yet built inside `/ncc`, links directly out to the
  real, working `/admin` page rather than faking a port (tagged "Legacy" in
  the nav rail — see `app/ncc/_components/nccNav.ts`).
- For Partnerships, directly reuses the existing `partners_documents` table,
  storage bucket, and server actions (`app/admin/partners-documents/actions.ts`)
  — the same underlying data, rendered inside the new shell.

## Why this order, not a rewrite

Per `docs/ncc-architecture.md` §32 ("Migration Strategy From the Current
NCC"): *"New department shell alongside old routes... migrate department by
department — starting with Finance and Partnerships, since they have the
least legacy entanglement and the most obvious current gaps."* This phase is
exactly that first step, not a cutover.

## What this means for existing links, bookmarks, and integrations

- Every existing `/admin/**` URL keeps working exactly as it does today. None
  were removed, redirected, or renamed.
- `/ncc` is additive. It does not intercept, redirect, or shadow any
  `/admin` route.
- `middleware.ts` was not changed — like `/admin`, `/ncc` relies on its own
  layout (`app/ncc/layout.tsx`) to enforce authorization, matching the
  existing pattern where `middleware.ts` only gates `/partners`.

## What's deliberately NOT decided yet

- **When (or whether) `/admin` routes get retired or redirected to `/ncc`
  equivalents.** Per §32's own sequencing discipline, that's a department-by-
  department decision made once each department is actually ported, not a
  single flag-day cutover.
- **Whether `/ncc` becomes the primary link surface in any UI (e.g. a "go to
  NCC" prompt inside `/admin`).** Not added in this phase, to avoid steering
  real users into departments that are still marked "Planned."

## Recommendation for the next review

Treat `/ncc` as the place new department work lands going forward. Don't
route users there for departments still tagged "Legacy" or "Planned" — that
tagging is the honest signal of what's real today, and it updates in one
place (`app/ncc/_components/nccNav.ts`) as each department is actually built.
