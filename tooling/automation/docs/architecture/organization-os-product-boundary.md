# Organization OS — Product Boundary and Build Contract

**Date:** 2026-07-28 · Read-only evidence from `rfox0629/usam-website` @ `b90dbc72183a`.
**Purpose:** founder ruling 3 requires Organization OS to be *intentionally defined and built* as an application boundary before any extraction is reconsidered. This document defines that boundary.

## Evidence base — what exists today

Total measured footprint: **≈2,621 LOC (9% of `app/admin`)**.

| Path | LOC | What it actually is |
|---|---:|---|
| `app/admin/organizations` | 1,967 | List view + `UsamOrganizationHubClient.tsx` (1,560). The list renders a hardcoded `previewOrganizations` array with `isPreviewOnly: true` ("Crew Ministry" etc.). Page title: "Organizations \| National Command Center". |
| `app/admin/workspaces` | 299 | A single `[id]/preview/page.tsx`. |
| `app/admin/people` | 225 | A single `[id]/page.tsx`. |
| `app/admin/finance` | 130 | Thin wrapper over the shared `OperationsInboxPage`, titled "Finance Inbox \| USA Missionaries". A form-submission inbox, **not** a finance system. |

Supporting real data: `src/lib/admin/organization-data.ts` (`loadOrganizationsOverview`), `organization-shared.ts` (`OrganizationSummary`). Backing tables `organizations`, `organization_memberships`, `people`, `person_roles` exist and are real.

**Honest status: `planned-and-partial`.** Real tables and a real data loader exist beneath a UI that is substantially preview. It is not independently deployable and not a mature product.

## The twenty questions

**1. What is Organization OS?**
The administrative operating system for running a nonprofit organization: its people, its money, its obligations, and its communications. It is the *back office of the institution*.

**2. Primary user?**
Organizational staff and leadership — the founder today, later an operations person, a bookkeeper, and board-facing roles. **Not** missionaries, and **not** disciples.

**3. What is not part of it?**
Discipleship relationships, meetings, prayer logs, fruit, assessments, groups/community, My Record — all DOS. Public marketing pages — USAM Website. Missionary profile presentation and public support flows — USAM Website.

**4. How does it differ from DOS?**
DOS is about *relationships between people in ministry*. Organization OS is about *the organization as an institution*. DOS's unit is the person and the household; Organization OS's unit is the organization and the record. They share identity but almost nothing else.

**5. How does it differ from USAM ministry operations?**
This is the hardest line and the reason `app/admin` is tangled. Today `app/admin` holds ~25,455 LOC of **USAM-specific** back-office — missionary profiles (14,635), prayer ops (2,643), support team (1,628), financial freedom (890), public experience (644). Those are *one organization's* operations, expressed as bespoke pages. Organization OS is the **generic** capability any organization would need. The test: *would a second organization need this page, or is it USA Missionaries-specific?*

**6. Relationship to NCC?**
`app/admin/organizations` already carries the title "National Command Center." NCC appears to be the founder-facing aggregate view. Treat NCC as a *surface* of Organization OS, not a separate product. **Founder confirmation needed.**

**7. Relationship to Communications?**
Communications (newsletters, subscribers, Resend) is an Organization OS module. Evidence: `communications_resend_subscribers` was applied remotely on 2026-07-28, and `src/lib/email` exists with a single consumer in admin. It is currently thin.

**8. Relationship to finance/compliance/governance?**
All three are Organization OS scope, but today only *inboxes* exist. `app/admin/finance` is a form inbox. There is no ledger, no 990 workflow, no board-minute management. Linear projects for Finance & Payroll, Compliance, and Governance live on the **Ministry Ops** team — organizational work is currently tracked as ministry operations, not as software.

**9. What belongs in V1?**
See the module table below.

**10. Future scope?** Donor management, payroll, full accounting, CRM automation, event management, volunteer scheduling. **None of these should be assumed for V1.**

**11. Which current code belongs to it?** The four paths in the evidence table, plus `src/lib/admin/organization-data.ts` and `organization-shared.ts`.

**12. Which is preview/placeholder?** `app/admin/organizations` list view (hardcoded preview array), `app/admin/workspaces/[id]/preview`, and `app/admin/finance` (inbox wrapper, not finance).

**13. Which tables does it need?** Owned: `organizations`, `organization_memberships`, `person_roles`. Likely future: documents, communications/subscribers, finance records.

**14. Which shared identity objects does it consume?** `auth.users`, `profiles`, `people`, `admin_users`, and — significantly — `missionary_households`, the most cross-coupled table in the system (referenced from DOS ×8, admin ×12, public ×9).

**15. Permissions required?** Today: a global `admin_users` allowlist via `src/lib/admin-auth.ts` (34 consumers). Organization OS needs **per-organization** roles. `person_roles` and `organization_memberships` exist but the enforcement path does not. **This is the single largest engineering gap.**

**16. Single- or multi-organization?** The data model is multi-organization (`organizations` + `organization_memberships` + preview records for other ministries). The *auth model* is single-organization (a global admin allowlist). **They disagree today.** V1 must pick one deliberately.

**17. Tenancy model?** Recommended: **shared database, RLS-enforced per-organization scoping**, one Supabase project. Do not create a second database. Do not duplicate identity.

**18. Canonical route strategy?** Consolidate under `/admin/(org-os)/…` during Stage B, keeping URLs stable. A future `/organizations/…` top-level namespace only once it is a real product. No route moves now.

**19. Vercel deployment strategy?** None of its own for the foreseeable future. It rides the `usam-website` project. It earns a separate Vercel boundary only after meeting the graduation criteria below.

**20. Linear project structure?** Keep the `Organization OS` Application label, retargeted to `rfox0629/usam-website` (USA-107). Represent it as a **future product**, not an active application. Organizational *ministry* work stays on Ministry Ops; Organization OS *software* work belongs on Engineering.

## Proposed module scope

| Layer | Modules | Rationale |
|---|---|---|
| **Foundation** (prerequisite) | Per-organization access control (`person_roles` + `organization_memberships` enforced by RLS); organization record CRUD replacing preview data; the `app/admin` website/org-os split | Nothing else is trustworthy without tenancy |
| **V1** | Organization dashboard · People/contacts · Organization settings · Access management · Documents · Forms | The minimum that makes it a real product |
| **V1.5** | Communications & newsletters · Finance/compliance **status** (not systems) | Extends existing thin surfaces |
| **Later** | Donors · Volunteers · Events · Payroll · Full accounting · Reporting · CRM automation | Each needs its own justification |

## Graduation criteria — when it earns its own app workspace

All five must hold:

1. **≥ 10,000 LOC** of genuine, non-preview Organization OS code. *(Today: ~2,621, substantially preview.)*
2. **Zero hardcoded preview data** in production paths.
3. **Per-organization access control enforced by RLS**, not a global admin allowlist.
4. **A distinct primary user** actually using it who is not the founder.
5. **The `app/admin` split complete** (Stage B), so the boundary is real rather than aspirational.

Separate *repository* extraction requires all of the above **plus** a commercial or operational justification, and a fresh founder decision. It is not on any current roadmap.

## Founder decisions needed

Three, all requiring ministry strategy rather than engineering judgement:

1. **Single- or multi-organization?** The data model says multi; the auth model says single. This determines whether Organization OS is USA Missionaries' internal back office or a platform other ministries could use. Everything else follows from it.
2. **Is NCC the same thing as Organization OS**, or a distinct founder-facing surface?
3. **Does V1 include Communications**, or does Communications stay a thin utility until a newsletter cadence actually exists?

## Limitations

Classification is based on directory names, LOC, and spot-reads of entry points. `app/admin`'s 28,076 LOC were **not** read line by line. The finance/compliance/governance assessment is inferred from page structure and titles, not from a full read of `OperationsInboxPage`. Where this document says "today," it means commit `b90dbc72183a`.
