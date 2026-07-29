# `/join` provisioner — extraction boundary

**USA-110 Stage 0.** Specification only. **No behaviour change in this issue.**
Executed in **Stage 2** (USA-109), which must be a **pure refactor**.

---

## 1. Current structure — `app/api/join/submit/route.ts`, 892 lines

| Lines | Region | Stage 2 disposition |
|---|---|---|
| 1–60 | Imports, `JoinSubmitPayload`, `CreatedResourceIds` | **Move** — shared types |
| 60–275 | Field coercion, normalization, photo metadata, `normalizeHouseholdRelationship` | **Move** — pure helpers |
| 275–300 | `findOrCreateUsamOrganization()` | **Move + parameterize** (§4) |
| 300–378 | `findExistingTeamMemberForEmail()`, `uniqueSlug()` | **Move** — pure lookups |
| 379–406 | `cleanupCreatedResources()` | **Move verbatim** — do not alter |
| 407–606 | `validatePayload()` | **Stays in the route** — HTTP-shaped, returns user copy |
| 607–638 | POST entry, env guard, payload parse, validation | **Stays in the route** |
| 639–666 | Duplicate pre-check → 409 | **Move** into the provisioner as a policy hook (§5) |
| 667–790 | **Provisioning sequence** | **Move** — the asset |
| 790–871 | Application row + response assembly | **Split** — write moves, response stays |
| 872–891 | Success response, catch → cleanup → error | **Stays in the route** |

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
  └─ cleanupCreatedResources()        verbatim
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
  | { ok: true; ids: CreatedResourceIds; applicationId?: string }
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

> ⚠️ **There are two duplicate-blocking paths, not one.** Path A is the explicit pre-check (line 663). Path B is Supabase's own "already registered" error mapped to 409 via `friendlyAuthError` (lines 597, 683). **Stage 3 must address both** or identity reuse stays blocked by the second. Both are pinned by the contract test.

## 6. Invariants Stage 2 must preserve

Pinned by `scripts/join-provisioner-contract-regression.mjs` (24 assertions):

1. Write order: `collectives` → `profiles` → `collective_memberships` → `missionary_households`
2. Duplicate pre-check **reads before any write**
3. Collective is `type: "family"`; membership is `role: "owner"`, `status: "pending"`
4. Rollback deletes exactly: team members, household, collective membership, org membership, profile, collective, org (only when created by this request)
5. `CreatedResourceIds` keeps all six fields
6. Status codes 500 / 400 / 409 unchanged
7. `selectedPath !== "usam"` still rejected
8. Admin Supabase client still used

**Three defects are pinned deliberately** so Stage 2 is provably behaviour-neutral:

| Defect | Fixed in |
|---|---|
| **D-A** Rollback never deletes the auth user — `createdIds.authUserId` is assigned at line 686 and **never read**; no `deleteUser` call exists in the file | Stage 3 |
| **D-B** Happy path never inserts `organization_memberships`, though cleanup deletes it | Stage 4 |
| **D-C** Duplicate email returns 409 across two paths | Stage 3 |

### Why D-A and D-C compound each other

A failure after `createUser` succeeds rolls back the profile, collective, and household — **but leaves the `auth.users` row orphaned.** The applicant retries, the pre-check finds the orphaned account, and returns *"use a different email."*

**The incomplete rollback actively manufactures the duplicate-identity problem the architecture forbids.** Fixing D-C without D-A leaves the orphan; fixing D-A without D-C leaves the block. **Stage 3 must fix both together.**

## 7. Stage 2 definition of done

- All 24 contract assertions pass, unmodified.
- `npm run typecheck`, `npm run build`, `npm run smoke` pass.
- Route file is materially smaller; provisioner is importable and transport-agnostic.
- Zero behaviour change — the three defects still present and still pinned.
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
| P6 | Household insert fails after profile created | Rollback removes profile/collective; **`auth.users` row REMAINS** (D-A) |
| P7 | Application insert fails | Full rollback; auth user remains (D-A) |
| P8 | `selectedPath !== "usam"` | 400, no writes |
| P9 | Weak password | 400 before any write |
| P10 | Missing Supabase env | 500 before any write |
| P11 | Same payload submitted twice | **Currently 409 on the second.** After Stage 3, idempotent 200 returning the first result |
| P12 | Organization already exists | Reused, not recreated; `organizationWasCreated=false`; rollback does **not** delete it |

**P6 and P7 are the important ones** — they prove the rollback boundary and document D-A with evidence rather than assertion.

## 9. Not in scope for Stage 2

Refactoring `UsamJoinClient.tsx` (2,984 lines) · adding `/join` paths 2–5 · identity resolution · membership writes · typed household members · idempotency implementation. Each is a later, separately-gated stage.
