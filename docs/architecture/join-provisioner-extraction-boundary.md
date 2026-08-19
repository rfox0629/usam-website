# `/join` provisioner — extraction boundary

**USA-110 Stage 0 + USA-111 rollback correction.** This document began as the extraction boundary for a no-behavior-change refactor. USA-111 intentionally updates the rollback baseline to prevent future orphan auth accounts without deleting profiles or existing accounts.
Executed in **Stage 2** from this corrected baseline, which must be a **pure refactor**.

---

## 1. Current structure — `app/api/join/submit/route.ts`, 1,041 lines

| Lines | Region | Stage 2 disposition |
|---|---|---|
| 1–86 | Imports and request/row types | **Move** — shared types where transport-agnostic |
| 87–286 | Field coercion, normalization, photo metadata, slug helpers | **Move** — pure helpers |
| 287–338 | `loadUsamOrganization()` and `findOrCreateUsamOrganization()` | **Move + parameterize** (§4) |
| 339–515 | Team-member lookup, retry reconciliation, membership helpers | **Move as corrected by USA-111** — keep the narrow retry policy |
| 517–704 | `validatePayload()` | **Stays in the route** — HTTP-shaped, returns user copy |
| 711–746 | POST entry, env guard, payload parse, validation | **Stays in the route** |
| 747–789 | Duplicate pre-check and narrow retry reconciliation | **Move** into the provisioner as a policy hook (§5) |
| 790–944 | **Provisioning sequence** | **Move** — the asset |
| 945–1009 | Application row + response assembly | **Split** — write moves, response stays |
| 1010–1040 | Success response, catch → cleanup → error | **Stays in the route** |

## 2. The boundary

```
app/api/join/submit/route.ts          HTTP only
  ├─ parse, validate, map errors to status codes
  ├─ call provisionMissionaryOnboarding(...)
  └─ shape the response

src/lib/onboarding/provisioner.ts     NEW — transport-agnostic
  ├─ provisionMissionaryOnboarding()
  ├─ resolveTargetOrganization()
  ├─ checkExistingIdentity()          policy hook
  └─ cleanupJoinCreatedResources()    USA-111 creation-scoped rollback baseline
```

**The rule:** the provisioner knows nothing about HTTP. It returns a discriminated result; the route maps that to a status code. This is what makes it reusable by the other four `/join` paths, by bulk YWAM onboarding, and by an admin-initiated invite.

## 3. Proposed signature

```ts
type ProvisionInput = {
  targetOrganization: { slug: string } | { id: string };   // never a constant
  account: { email: string; password: string; firstName: string; lastName: string; phone?: string };
  household: { name: string; location?: string };
  application?: ApplicationFields;
  idempotencyKey?: string;                                  // Stage 3
};

type ProvisionResult =
  | { ok: true; ids: JoinRollbackResources; applicationId?: string }
  | { ok: false; reason: "duplicate_identity"; existing: { profileId?: string; applicationId?: string } }
  | { ok: false; reason: "auth_failed"; message: string }
  | { ok: false; reason: "provisioning_failed"; message: string };
```

`reason` maps to today's status codes exactly: `duplicate_identity` → 409, `auth_failed` → 409 or 400 per the existing `authMessage.includes("already")` rule, `provisioning_failed` → 500.

## 4. `findOrCreateUsamOrganization` — parameterize, do not rewrite

Today (`route.ts:275–281`):

```ts
.or("branding_mode.eq.usam,slug.eq.usa-missionaries")
```

Stage 2 becomes `resolveTargetOrganization(input.targetOrganization)`, **and the route passes `{ slug: "usa-missionaries" }`** so behaviour is byte-identical. The `branding_mode='usam'` lookup is retained as a fallback until Stage 6 retires the enum — it is **load-bearing** and matches exactly one production row.

## 5. Duplicate pre-check — move as a hook, do not change

The 409 moves into the provisioner **unchanged** and behind a policy hook:

```ts
checkExistingIdentity(email) → { blocked: true, ... }   // Stage 2: current behaviour
                             → { resolved: identityId } // Stage 3: identity resolution
```

Stage 2 ships `blocked: true` only. **Stage 3 flips the policy, not the structure.**

> ⚠️ **There are two duplicate-blocking paths, not one.** Path A is the explicit pre-check. Path B is Supabase's own "already registered" error mapped to 409 via `friendlyAuthError`. USA-111 keeps both pathways for legitimate duplicate-email protection while removing the false duplicate trap caused by a current-request orphan auth account. Identity reuse is a later Workspace V2 stage, not part of USA-111.

USA-111 adds one deliberately narrow retry reconciliation path inside the pre-check. A retained profile is resumable only when it is the single same-email profile, has no `user_id`, belongs to the USA Missionaries organization, points at a USA Missionaries family collective, and there is no non-terminal application or active team-member duplicate. In that case the retry relinks that retained profile to the newly created auth user and continues. Every other existing profile, application, or team-member match still returns the ordinary duplicate 409.

## 6. Invariants Stage 2 must preserve

Pinned by `scripts/join-provisioner-contract-regression.mjs`:

1. Write order: `collectives` → `profiles` → `collective_memberships` → `missionary_households`
2. Duplicate pre-check **reads before any write**
3. Collective is `type: "family"`; membership is `role: "owner"`, `status: "pending"`
4. Rollback uses an explicit created-resource ledger and deletes the current-request auth user if provisioning later fails
5. Rollback deletes team members by exact created row ID, never by household-wide ownership assumption
6. Profiles are retained for reconciliation; rollback does not delete profiles
7. Created parent resources are deleted only when they remain unreferenced; ambiguity fails closed
8. Status codes 500 / 400 / 409 unchanged
9. `selectedPath !== "usam"` still rejected
10. Admin Supabase client still used

**USA-111 intentionally changes the prior D-A contract.** Remaining temporary behavior is still pinned deliberately so later refactors are not silent:

| Defect | Fixed in |
|---|---|
| **D-A** Rollback never deletes the auth user created by the current request | **Fixed by USA-111** |
| **D-B** Happy path never inserts `organization_memberships`, though cleanup deletes it | Stage 4 |
| **D-C** Duplicate email returns 409 across two paths | Later identity-resolution stage |

### Why USA-111 fixes D-A but preserves D-C

A failure after `createUser` used to leave the `auth.users` row orphaned. USA-111 removes that false duplicate trap by deleting only the auth user that the current request provably created. Pre-existing auth accounts are never looked up or deleted by rollback.

If a later cleanup step fails, USA-111 records a count-only warning and continues with the remaining safe cleanup steps. The HTTP route still returns the generic controlled failure response. Cleanup failures must not expose identifiers and must not short-circuit later rollback steps that can still safely run.

Duplicate-email 409 behavior still exists for legitimate existing profiles, profiles that cannot satisfy the narrow incomplete-attempt shape, non-terminal applications, active household invitations/team members, and Supabase's own duplicate-account response. Those cases remain intentional until the Workspace V2 identity-resolution stage exists.

When rollback cannot prove a parent resource is still unreferenced, USA-111 skips the delete and emits a count-only warning. The warning is intentionally non-identifying; canonical audit-log instrumentation belongs to the later provisioner/`audit_log` stages.

## 7. Stage 2 definition of done

- Contract assertions pass with the USA-111 rollback correction included.
- `npm run typecheck`, `npm run build`, `npm run smoke` pass.
- Route file is materially smaller; provisioner is importable and transport-agnostic.
- Extraction remains behavior-preserving from the post-USA-111 baseline; the D-A orphan-auth defect must not be reintroduced.
- Reversible by `git revert`.

## 8. Runtime parity matrix — specified, deliberately not executed

Requires a **disposable database**. It must never run against production. Specified now so Stage 2 can execute it.

| # | Scenario | Expected |
|---|---|---|
| P1 | Valid new applicant | 200; rows in `collectives`, `profiles`, `collective_memberships`, `missionary_households`, `usam_missionary_applications`; **no** `organization_memberships` (D-B) |
| P2 | Duplicate email, existing profile | 409; **zero** rows written |
| P3 | Duplicate email, existing application | 409; zero rows |
| P4 | Duplicate email, existing team member | 409; zero rows |
| P5 | Supabase reports "already registered" | 409 via `friendlyAuthError` (path B) |
| P6 | Household insert fails after profile created | Rollback deletes the current-request auth user; profile is retained; retry resumes the incomplete profile-only state instead of returning the ordinary duplicate-profile 409; parent cleanup deletes only unreferenced created resources |
| P7 | Application insert fails | Rollback deletes the current-request auth user; profile/application reconciliation remains a later human-reviewed concern |
| P8 | `selectedPath !== "usam"` | 400, no writes |
| P9 | Weak password | 400 before any write |
| P10 | Missing Supabase env | 500 before any write |
| P11 | Same payload submitted twice | **Currently 409 on the second.** Later identity resolution/idempotency work may intentionally change this |
| P12 | Organization already exists | Reused, not recreated; rollback does **not** delete it |

**P6 and P7 are the important ones** — they prove the rollback boundary now prevents future orphan auth accounts without deleting profiles or pre-existing accounts.

## 9. Not in scope for Stage 2

Refactoring `UsamJoinClient.tsx` (2,984 lines) · adding `/join` paths 2–5 · identity resolution · membership writes · typed household members · idempotency implementation. Each is a later, separately-gated stage.
