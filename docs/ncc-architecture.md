# National Command Center — Master Vision & Product Architecture

**The foundational, long-term product vision for the National Command Center: the operating system for running a disciple-making movement — from one ministry today to a national network of missionaries, employees, partner organizations, and churches over the next decade.**

Author's note: this document is a strategy artifact, not an implementation ticket. Nothing in it should be built directly from this file. It exists so that every future engineering decision — a new table, a new page, a new permission, a new AI feature — has something to check itself against. When an implementation question isn't answered here, that's a signal to update this document first, not to improvise around it.

---

## 1. Executive Summary

USA Missionaries runs on three systems with three different jobs. The **public website** introduces people to the mission. **DOS** is where ministry actually happens — missionaries walking with people, logging tables, discipling, praying. The **National Command Center** is where that ministry gets *operated*: staffed, funded, reported on, protected, and grown. Most software projects called "an admin panel" quietly become the least-loved part of the stack. This one shouldn't, because it isn't one — it's the headquarters software for a movement that intends to still be running, and still be trustworthy with other people's money and other people's confidential prayer requests, in ten years.

The NCC (`/admin`) grew the way every real internal tool grows: one urgent feature at a time, with no one asked to step back and design the whole. A full repository audit confirms the system works today but cannot carry the next five years of growth as currently structured:

- **Two parallel data models coexist in Supabase.** A `missionary_households`-scoped legacy model (tables, encounters, fruit, applications) runs alongside a newer, genuinely multi-tenant `organizations` / `profiles` / `collectives` model. They were stitched together with a single bridge table (`usam_missionary_applications`) rather than unified.
- **Row-Level Security is a single global gate, not an organization boundary.** Any `admin`/`editor` user can read and write every table in the system. The `organization_memberships` table exists but is enforced nowhere. This is the single largest blocker to onboarding a second organization safely — and, as this revision argues, the single largest blocker to building any automation, AI-assisted or not, responsibly.
- **Authorization is three unrelated systems wearing one name.** Real accounts (`admin_users` + Supabase Auth) govern `/admin` and `/dos`; a separate HMAC-signed cookie governs `/missionaries` and `/system/preview`; a third, single shared-secret cookie governs all of `/partners`. None of them share code, and partners have no individual identity at all.
- **The richest "future roles" model in the codebase is unused.** `src/lib/platform/architecture.ts` and `dos-platform-roles.ts` describe a seven-tier access model — and are referenced nowhere else in the repository. The real system today has three roles: admin, editor, viewer.
- **Partnerships and Finance are largely aspirational content, not software.** There is no `partners` table. There is no accounting functionality of any kind. Both departments are, today, a well-designed document portal and a set of donor-intake inboxes wearing department names.
- **Navigation has drifted from the sitemap.** At least six routes are pure redirects kept for compatibility; two pages (`/admin/profiles` and `/admin/missionary-profiles`) do fundamentally different jobs with confusingly similar names; the page self-described as "legacy" (`missionary-profiles`, 1,514 lines) actually owns most of the system's real backend logic.
- **DOS itself has no notification or work-item model for personal ministry activity.** A group facilitator has no reliable way to learn someone has requested to join their group; this is a real, immediate gap, and it's a DOS problem, not an NCC one (§19).

None of this is a crisis. It is exactly what unplanned organic growth looks like, and the foundations underneath it — a real `organizations` table with a real USAM row already seeded, a working role-precedent in `admin_users`, a proven document-portal pattern in `partners_documents` — are good enough to build the next decade on **without a rewrite**.

This revision goes further than the original architecture pass. It reframes the NCC not as an admin tool being cleaned up, but as an operating system being designed on purpose: **modular**, so it can serve a two-person church plant and a national nonprofit from the same codebase; **event-driven, at two different altitudes**, so personal ministry work and organizational work each get routed to the right place without ever crossing into each other's territory by accident; **intelligent by default, but not intelligence-dependent**, with AI as one of several possible consumers of that event stream rather than the foundation itself; and **organization-first**, so growth is a configuration change, not a rewrite. Sections 4 (Modular Architecture), 11 (Multi-Organization Operating Model), 13–19 (the Event-Driven Architecture cluster), and 28 (AI Architecture) are new or substantially new. Section 36 (The End State) describes what success feels like, not just how to get there.

---

## 2. Vision — Why the NCC Exists

Start with the sequence, because it's the whole argument in one line:

```
Public Website  →  introduces people to the mission
       ↓
      DOS  →  where ministry happens
       ↓
      NCC  →  where the ministry is operated
```

The public website tells the story and opens the door. DOS is where a missionary sits at a kitchen table, has a conversation, logs it, and watches someone move from curious to following Jesus. That is the actual work of the mission, and it happens in DOS, not in an admin panel. The NCC exists for a different, no less real reason: **someone has to run the organization that makes that kitchen-table conversation possible.** Someone has to pay the missionary a stipend. Someone has to make sure the 990 gets filed. Someone has to know if a partner church's relationship has gone cold. Someone has to decide what story is ready to tell donors. Someone has to make sure a missionary's confidential prayer request never reaches someone without the right permission.

That "someone" is not one person today, and won't be ten years from now. It's an Executive Director, a Treasurer, a Communications Director, a Regional Director, a Partnership Manager, an HR lead, a board — a whole headquarters. **The National Command Center is that headquarters, expressed as software.** Not an admin panel bolted onto a ministry app. Not a dashboard. The operating system a disciple-making movement runs on once it has grown past what a spreadsheet and a shared inbox can hold.

That reframing has consequences for how this document treats the NCC going forward:

- **It is not a tool for "admins."** It is the daily workplace for every employee, board member, accountant, communications director, partnership manager, regional director, executive leader, volunteer coordinator, and ministry operations leader USA Missionaries will ever have. "Admin" implies a narrow, occasional-use surface for a handful of technical staff. That is not what this system needs to become, and treating it that way is exactly what produced today's organically-grown, admin-flavored information architecture.
- **It should feel like an operating system, not one giant application.** A person opens it and finds *their* workspace — the modules relevant to their job, nothing else — the same way opening a laptop shows you your apps, not everyone's. Section 4 makes this literal: departments are not just an org-chart grouping, they are **modules**, independently ownable, independently toggleable, independently versionable.
- **It should grow the way the mission grows — including outward, not just upward.** USA Missionaries won't just add more of its own missionaries; it will take on relationships with other ministries, some arms-length, some deeply integrated. Section 11 works through what it means for the NCC to host more than one ministry's entire operation at once without erasing any of their identities.
- **It should know what to do next without being told twice — at the right altitude.** DOS already routes work to a missionary the moment something happens in their ministry — a group join request, a follow-up reminder. The NCC should work the same way for the organization — a donation, an application, an expiring document. But these are not the same routing problem wearing two names: DOS routes *personal* ministry work to *individuals*; the NCC routes *organizational* work to *departments*. Sections 13 through 19 work through exactly where that line sits, using the case that most often gets it wrong — group registrations — as the central worked example.
- **It should get smarter without depending on being smart.** AI belongs everywhere that a person currently does rote synthesis work — drafting a summary, categorizing a document, spotting a pattern across hundreds of records a human would never scan by hand — and nowhere that a human's judgment, consent, or signature is actually the point. But the platform's ability to route work correctly cannot depend on AI existing at all: Section 15 makes the event system technology-neutral by design, so that notifications and simple rules can carry the whole platform on their own, with AI, and later specialized agents, added as optional consumers rather than required infrastructure.
- **It should scale down as naturally as it scales up.** The current thinking (including the original pass of this document) mostly asked "how does this serve USA Missionaries at scale." The right question is "how does this serve *any organization* running on this platform, at whatever scale it's actually at" — a two-person church plant and a 200-missionary national network should both feel like the software was built for them specifically, not like they're using 10% or 100% of someone else's tool.

---

## 3. Design Principles

1. **Departments, not pages.** Every screen belongs to exactly one department. If a feature doesn't fit a department, that's a sign the department list is wrong, not that the feature needs a new top-level nav item.
2. **Organization-first, always.** No feature is built assuming "there is only one ministry." Every table that holds operational data carries an `organization_id`. USAM is a row, not a constant.
3. **One identity, many roles.** A person has one account and one identity in the system. What they can do is a function of their organization membership plus department-scoped permission grants — never a proliferating list of named roles.
4. **NCC operates; DOS disciples.** The NCC reviews, approves, reports, and administrates. It does not re-implement People/Tables/Encounters data entry — that already exists correctly in DOS and should not be duplicated (the current 1,514-line "Legacy Missionary Workspace" violates this and should be the first thing retired).
5. **RLS is the real permission boundary, not the UI.** Every access rule must be enforceable at the database layer. A UI-only check is not a permission — today's blanket admin-bypass RLS pattern is the biggest violation of this principle in the current system, and the hardest blocker to everything in Sections 4, 11, 13–19, and 28.
6. **Boring, reusable primitives over bespoke pages.** The existing `OperationsInboxPage` and tabbed-hub patterns (already used well in Organizations and Public Experience) should become the *standard* department shell, not one pattern among several. New departments should be mostly configuration of these primitives.
7. **Every entity is a hub, not a dead end.** A partner, a person, an organization — every detail page shows what's connected to it in other departments (documents, gifts, tasks, meetings), rather than requiring a user to hunt across five unrelated pages.
8. **Calm, operational density.** The interface philosophy already established in `AGENTS.md` (Linear/Stripe/Notion-inspired, minimal copy, status pills over paragraphs) is correct and should be preserved and extended into every new department, not diluted by growth.
9. **Phase finance and partnerships as workflows, not features.** Don't build a ledger because "Finance" sounds like it needs one. Build the document portal, then the workflow, then the reporting layer, in that order, driven by actual pain.
10. **Build for module boundaries, not universal assumptions.** No department may assume every organization has it enabled. A page that breaks because "Finance" is off for this organization is a bug, not an edge case.
11. **AI drafts; humans decide.** Every AI output that touches money, publishing, personnel, or an approval workflow is a draft awaiting a human. This is the same RAW → REVIEWED → APPROVED discipline the ministry data pipeline already enforces, applied to the intelligence layer. It is non-negotiable, not a phase-1 simplification to relax later.
12. **An organization's identity survives every relationship it enters.** Whether an organization is a self-serve tenant, an arms-length partner, or a fully integrated affiliate operating through USAM's shared services, its data, board, financials, and users belong to it — never silently absorbed into USAM's own records as a side effect of receiving support.
13. **Events stay in their domain unless intentionally elevated.** A DOS event routes work to a missionary; an NCC event routes work to a department. Crossing from one domain into the other is a deliberate, reviewed action — the same discipline RAW → REVIEWED → APPROVED already requires of Fruit — never an automatic side effect of a shared table. See Sections 13–19.
14. **Automation is earned per action, not granted per actor.** A rule, an AI assistant, or a future specialized agent does not inherit a blanket level of trust from being "automated." Each type of action — sending a notification, drafting a summary, posting a transaction — has its own justified place on the automation ladder (§17), and building a more capable actor never bypasses the review boundary a specific action type has earned.

---

## 4. Modular Architecture

This is the biggest structural addition to the vision, so it's worth being precise about what's actually being proposed.

### Department vs. module — two names for a decision, not one concept

A **department** is the org-chart concept: what a person calls their job, how navigation is grouped, what a Chief Product Officer thinks about when planning headcount. A **module** is the technical unit that embodies a department in software: something that can be enabled or disabled per organization, has declared dependencies on other modules, and is the unit permissions and navigation are computed against. In the common case they are the same thing wearing two hats — the Finance department *is* the Finance module. Keeping the two ideas distinct matters for exactly one reason: it stops the temptation to sub-module everything down to feature-flag granularity (a "Budgeting sub-module," a "990 Prep sub-module") which would recreate the permission-sprawl problem this document is trying to avoid. **Module granularity should almost always sit at the department level.** Finer-grained control belongs in the department-permission-grant system (§9), not a second layer of toggles.

### Why modular, concretely

The current NCC implicitly assumes there is exactly one organization using it, and that organization uses everything. That assumption is baked into the navigation (a flat list of every section, always visible), the data model (most operational tables aren't organization-scoped at all), and the mental model of the team building it. It's the right assumption for a system with one tenant. It is the wrong assumption for the system this document argues the NCC should become — one where a partner church, a partner ministry, or a future affiliate network runs its own, much smaller slice of the same platform.

A modular NCC means:

- **Every module has a manifest**: a key, a human name, a short description, and a list of module dependencies (e.g., Development depends on People and Organizations; Partnerships depends on Organizations and People). A module cannot be enabled for an organization until its dependencies are.
- **A new `organization_modules` table** (`organization_id`, `module_key`, `enabled_at`, `enabled_by`, `tier`) is the single source of truth for what's turned on where. Navigation, quick actions, search results, and notifications all filter through this table before they filter through the permission-grant system in §9 — module enablement is the outer gate, permissions are the inner one.
- **Some modules are core and cannot be disabled**: People, Organizations, Settings. Every organization on the platform, no matter how small, needs to know who its people are, needs an identity in the system, and needs basic configuration. Reports and NCC Home are not modules at all — they are cross-cutting layers that render whatever the enabled modules actually contain, the same way a search index reflects whatever's been indexed rather than being a thing you turn on.
- **Most modules are optional**, and optional modules split into two tiers that matter for a very practical reason: **self-serve** modules (Communications, Prayer, Knowledge Base) an organization's own admin can turn on themselves, and **platform-assigned** modules (Finance, Partnerships, Development, Compliance & Legal, advanced Technology administration) that imply an actual working relationship with USA Missionaries' own staff and therefore get enabled *for* an organization by USAM, not self-served. Turning on "Finance" for a partner church isn't a UI toggle — it's USAM agreeing to provide accounting support to that church, which is a business decision wearing a database row. Section 11 develops exactly this mechanism further, because it turns out to be the same mechanism that makes shared back-office services to affiliated ministries possible.

### Worked examples

A **small partner church** might run:

```
Core (always on):   People · Organizations · Settings
Self-serve:         Prayer · Communications
```

That's it. No Finance, no Partnerships tab about itself, no Compliance & Legal, no Development pipeline. The nav for that church's admin is four items long. It should feel like a purpose-built church tool, not a stripped-down enterprise system.

A **large nonprofit like USA Missionaries itself** enables every module, plus the platform-operator-only capabilities (assigning modules to other organizations, configuring cross-org visibility rules) that only make sense for the organization actually running the platform.

### Where I'd push back on the brief

The instruction was to think through what full modular architecture looks like — worth doing, and done above. But there's a real trap in this idea that a CPO reviewing it should name out loud: **building the actual enable/disable machinery — dynamic navigation, module-aware onboarding, a settings UI for toggling modules — has zero payoff until there is a second real tenant organization**, and today there is exactly one. Building it now, for an audience of one, is the same anti-pattern already flagged elsewhere in this codebase's own house style: "do not add features because there is empty space."

The right sequencing is to **design the data model to be module-aware from day one** (every table gets `organization_id`; every new department is built as if it could be turned off; the `organization_modules` table exists early) because that costs almost nothing extra when building something new anyway and prevents expensive rework later — but to **not build the toggle UI, the tiered self-serve/platform-assigned workflow, or dynamic per-org navigation until the first real second tenant is being onboarded** (already scheduled in the Year 3 roadmap, §29). Modularity as a *data and architecture discipline*: adopt immediately. Modularity as a *shipped feature*: sequence deliberately.

There's a second, smaller pushback worth naming: the brief's own small-church example lists "People, Prayer, **Groups**, Communications." Groups — small-group meetings, gatherings, attendance — already exists in the schema today as `dos_groups`, `dos_group_members`, `dos_group_gatherings`, and `dos_group_attendance`, and it's ministry execution, not ministry operation. Per Principle 4, that's DOS's job, not the NCC's. A small church's *NCC* footprint doesn't include a Groups module at all — its small-group ministry happens in DOS, which every organization gets by default as the platform layer underneath the NCC, the same way USA Missionaries' own missionaries use DOS today. What the NCC gives that church is an oversight window into that group activity through Ministry Operations, if and when they want one — not a place to run the groups themselves. This is a good example of exactly the kind of category error worth catching early: it's easy to look at a feature a small organization needs and assume it belongs in "the admin system" when it actually belongs in "the tool where the work happens." Sections 13 and 19 revisit this exact example in much more depth, because it turns out to be the clearest possible illustration of the DOS/NCC event boundary.

---

## 5. Department & Module Definitions

Evaluating the department list in the brief against what a national nonprofit actually needs, what the current system already half-implements, and — new in this revision — how each one behaves as a module:

| Department | Verdict | Module Tier | Rationale |
|---|---|---|---|
| **NCC Home** | New, not a department | Not a module (cross-cutting) | Personalized landing experience. Replaces "Dashboard" — every user's home differs by role and enabled modules; it isn't owned content. |
| **Executive** | Keep | Core, thin by default | Board-facing rollups, KPIs, strategic docs. Even a two-person church plant's leader wants a rollup; it just starts nearly empty and fills in as other modules are enabled. Not something an org "turns off." |
| **People** | Keep, expanded | Core | Absorbs HR, Volunteer Management, and missionary personnel management (see §22). Avoids permission sprawl from splintering "people who work here" across three departments. |
| **Organizations** | Keep, elevated | Core | Becomes the tenant/entity backbone every other department scopes against (see §10 and §11), not just a directory page. |
| **Partnerships** | Keep, rebuilt | Optional, platform-assigned | Currently the least-built department relative to its ambition (see §21). Also the department that carries the arms-length end of the multi-organization spectrum described in §11. |
| **Finance** | Keep, phased | Optional, platform-assigned | Currently zero accounting functionality; needs the most disciplined phased roadmap of any department (see §20). |
| **Development** | Add | Optional, platform-assigned | Donor/fundraising pipeline is currently smeared across Finance (`major_gift_inquiries`, `support_commitments`) and Missionary Profiles. Deserves its own department: donor relationships, campaigns, grants pipeline — distinct from Finance's accounting/compliance job. |
| **Communications** | Add | Optional, self-serve | PR, content calendar, public-website content coordination (today `public_experience` half-covers this from a CMS angle only). |
| **Prayer** | Keep | Optional, self-serve | Already a real, working department (`admin_users.prayer_permissions` is the best precedent for scoped permissions in the whole codebase). |
| **Ministry Operations** | Keep, redefined | Optional, self-serve (auto-relevant once an org uses DOS) | NCC's *oversight window* into DOS — fruit approval queue, network-wide field activity, coaching visibility. Not a place ministry data is created (see §23, §26). |
| **Compliance & Legal** | Merge | Optional, platform-assigned | Two thin departments become one. Nonprofit compliance (990s, audits, policies) and legal (contracts, entity structure) share the same small audience (Treasurer, ED, outside counsel) and the same document types. |
| **Reports** | Keep, cross-cutting | Not a module (cross-cutting) | A reporting *layer* addressable from every department, plus one consolidated cross-department reports home — reflects whatever's enabled rather than being enabled itself. |
| **Settings** | Keep, narrowed | Core | Personal + org-level configuration only. Department-specific settings live inside their department, not centralized. |
| **AI** | Remove as a department | Not a module (cross-cutting capability, one of several possible event consumers) | AI is a capability embedded in each department's workflows, gated by module enablement plus a separate consent flag (§28), not a destination — and not the only possible consumer of the event stream (§15). A junk-drawer "AI" tab becomes unmaintained clutter. |
| **Knowledge Base** | Keep | Optional, self-serve | SOPs, policies, onboarding docs — cross-department content that deserves its own home and is the best low-risk first home for an internal AI assistant. |
| **Technology** | Keep, narrowed | Split: basic settings are Core (folded into Settings); integrations/system administration are Optional, platform-assigned | System administration, integrations (PCO, calendars), access codes. In the near term, realistically only ever enabled for USAM itself. |
| **Volunteer Management** | Fold into People | — | See People rationale above. A standalone Volunteer department would duplicate People's identity model for no benefit. |
| **HR** | Fold into People | — | Same rationale — HR is a permission-scoped view inside People (employee-only sensitive data), not a separate department. |
| **Legal** | Merge into Compliance & Legal | — | See above. |
| **Operations** | Fold into Ministry Operations + Technology | — | "Operations" as stated is too broad to be a department; its real content splits cleanly between ministry oversight and systems administration. |
| **Groups** | Do not add | — | Ministry execution; belongs in DOS, not the NCC (see §4 pushback, §13, and §19). |

**Final module list:** 3 core (People, Organizations, Settings) + 1 core-thin (Executive) + 8 optional (Partnerships, Finance, Development, Communications, Prayer, Ministry Operations, Compliance & Legal, Knowledge Base, Technology-advanced) + 2 cross-cutting, non-toggleable layers (NCC Home, Reports) + 1 cross-cutting, consent-gated capability (AI).

---

## 6. Recommended Navigation Hierarchy

**Primary navigation** — a persistent left rail (desktop) / bottom-collapsing nav (mobile). Critically, this list is not static markup: it is computed at render time from `organization_modules` (§4) intersected with the current user's department permission grants (§9). What follows is the **maximal** version — every module enabled, as USA Missionaries itself would see it:

```
NCC Home
─────────────
Executive          (leadership-only visibility)
People
Organizations
Partnerships
Development
Finance
Communications
Prayer
Ministry Operations
─────────────
Compliance & Legal
Reports
Knowledge Base
─────────────
Technology
Settings
```

A small partner church, per the §4 worked example, would see:

```
NCC Home
─────────────
Executive
People
─────────────
Prayer
Communications
─────────────
Settings
```

Same code, same component tree, different data — this is the practical test of whether the modular architecture actually worked: nothing about the church's nav is a special case in the codebase, it's just what the module-and-permission query returned.

**Secondary navigation** — every department is a single route with tabs, not a scatter of top-level pages (this generalizes the pattern already proven in `/admin/organizations/[id]` and `/admin/public-experience`):

```
/ncc/<department>                 Overview (dashboard for that department)
/ncc/<department>/<object-list>   e.g. Partners, Documents, Meetings
/ncc/<department>/<object>/<id>   Detail hub with cross-department related-record panels
```

**Global elements** (present on every screen, not department-specific):
- **Global search (⌘K):** people, organizations, documents, records — one index, typed results, filtered to modules the searching user's organization actually has enabled.
- **Quick actions (+ menu):** context-aware — "Log a partner meeting," "New person," "Upload document" — surfaced based on current department and, increasingly, drafted with AI assistance (§28).
- **Notifications:** pending approvals, mentions, document expirations, task due dates — the user-facing surface of the event model (§13–§19).
- **Organizational Inbox:** a cross-department aggregation of open work items — Needs Attention, Assigned to Me, Waiting on Others, Approvals, Exceptions, Due Soon (§16). Deep-links back to the authoritative department screen; never a replacement for it.
- **Recent activity:** a feed, not a department — what changed across the org today, permission-filtered.
- **Cross-links:** every entity detail page surfaces "Related" panels pulling from other departments (a Partner page shows its Finance gifts, its Documents, its open Tasks) rather than requiring department-hopping.
- **Organization switcher** (for the minority of users who work across more than one organization, per §11): a lightweight Slack/Notion-style switcher, distinct from department navigation — you pick *which organization's* workspace you're in, then the department nav renders for that organization specifically.

---

## 7. Complete Sitemap

```
/ncc                                    NCC Home (personalized)
/ncc/inbox                              Organizational Inbox — cross-department work items (see §16)
/ncc/executive                          Board packets, KPIs, strategic docs
/ncc/people                             Overview: headcount, applications, onboarding queue
/ncc/people/missionaries                Missionary roster (review/approve layer over DOS data)
/ncc/people/employees                   HR: staff records, roles, onboarding/offboarding
/ncc/people/volunteers                  Volunteer roster and assignments
/ncc/people/board                       Board member roster, terms, committee assignments
/ncc/people/applicants                  Application pipeline (was /admin/applications)
/ncc/people/[personId]                  Person hub — one record, persona-scoped tabs
/ncc/organizations                      Organization directory (tenant list, hierarchy view)
/ncc/organizations/[id]                 Organization hub — members, workspaces, modules, settings
/ncc/organizations/[id]/shared-services Shared-service grants this organization receives or provides (see §11)
/ncc/partnerships                       Partner pipeline overview
/ncc/partnerships/[id]                  Partner relationship hub (see §21 for tab list)
/ncc/development                        Donor/fundraising pipeline, campaigns, grants
/ncc/development/major-gifts            Major gift inquiries (moved from Finance)
/ncc/finance                            Finance overview (see §20 for phased scope)
/ncc/finance/documents                  Monthly financials, board reports, 990s, audit docs
/ncc/finance/support                    Giving/support commitments, PCO reconciliation
/ncc/finance/donations                  Donation ledger with full organizational attribution (see §14)
/ncc/finance/budgets                    Budget vs. actual (Phase 3+)
/ncc/finance/consolidated               Cross-organization rollup reporting (see §11; visible only where enabled)
/ncc/communications                     Content calendar, public-site coordination
/ncc/prayer                             Prayer team operations (existing, keep largely as-is)
/ncc/ministry-operations                Field activity rollups, fruit approval queue
/ncc/ministry-operations/approvals      RAW → REVIEWED → APPROVED review queue (the elevation gate — see §13)
/ncc/compliance                         Policies, insurance, 990/audit prep, legal docs
/ncc/reports                            Cross-department report builder/library
/ncc/knowledge-base                     SOPs, wiki, internal assistant entry point
/ncc/technology                         Integrations, access codes, system health, module assignment
/ncc/settings                           Personal + org configuration, roles & permissions
```

This represents the fully-enabled configuration (USA Missionaries itself, or any future organization with every module turned on). A smaller organization's real sitemap is a subset of this tree, computed the same way its navigation is (§6) — there is only one sitemap, not one per organization size.

Every route above maps to an existing capability or a direct consolidation of 2–3 existing routes (mapping detail in §32).

---

## 8. User Personas

| Persona | Primary departments | Notes |
|---|---|---|
| Executive Director / President | Executive, all (read) | Needs cross-department rollups more than any single department's depth. First real user of AI-drafted executive briefings (§28). |
| Treasurer / Board Member | Finance, Compliance, Executive | Read-heavy; occasional approval actions. |
| Bookkeeper / Accounting Team | Finance | Upload-heavy; will be the first real user of the Finance document workflow, then the first real user of Finance AI once Phase 2 lands. |
| Regional Director | People, Ministry Operations | Coaching visibility into their region's missionaries; not org-wide. |
| Missionary / Group Facilitator (e.g., Ryan, Dirk) | People (own record), DOS (daily use) | NCC touch is light — self-service profile/support settings. Their group facilitation, registrations, and participant approvals happen entirely in DOS (§13, §19); the NCC never becomes their operational inbox for that. |
| Communications Staff | Communications, People (public bios) | Owns public-site content coordination; heavy user of Communications AI drafting. |
| Operations/Admin Staff | Technology, Settings, People | The "keeps the system running" persona. |
| Partnership Manager | Partnerships, Development | Owns the partner relationship lifecycle end to end. |
| Partner Organization Contact | Partnerships (own org only, external) | Should graduate from shared-secret cookie to a real scoped account (see §9). Sees only their own organization's Partnership workspace — nothing else exists in their nav. |
| Small Partner Church Staff | People, Prayer, Communications, Executive (thin) | The proof case for the modular architecture (§4) — a handful of modules, nothing else visible. |
| Integrated Ministry Staff (e.g., a future MOR employee) | Executive, People, Finance, Ministry Operations — their own organization only | Runs a fully-featured workspace of their own; some of those modules are staffed by USAM's shared-services team rather than their own hires (see §11). |
| USAM Shared-Services Staff (accountant, comms lead) | Home organization is USAM; also holds cross-organization service grants on one or more affiliated ministries | Uses the organization switcher (§6) to move between USAM's own Finance workspace and an affiliated ministry's, seeing only what that ministry's grant scopes them to (§11). |
| Church Leader / Affiliate | Organizations (own org, once modeled) | Future tenant type, same infrastructure as partners. |
| Applicant | People (own application, external) | Pre-account; converts to Missionary persona on approval. |
| Volunteer | People (own record) | Lightweight, mostly self-service. |
| Technology Administrator | Technology, Settings | Only persona with system-wide config access, including assigning modules to other organizations. |
| Platform Operator (USAM Technology team) | Technology, Organizations | Configures which modules are platform-assigned to which tenant organizations — a role that only exists because USAM is, in effect, the platform operator as well as the first tenant. |

---

## 9. Role Architecture

**Problem with the aspirational model:** the unused seven-role list (`platform_admin`, `organization_director`, `applications_manager`, `donor_manager`, `prayer_leader`, `missionary`, `support_team_member`) is exactly the failure mode the brief warns against — a new named role for every job title, which will keep growing forever and was never wired to enforcement in the first place.

**Recommendation: a three-layer model**, generalizing the one pattern in the codebase that already works well (`admin_users.prayer_permissions`), now explicitly incorporating module enablement as the outermost layer:

**Layer 0 — Module Enablement** (organization-level, from §4):
- Is this module even turned on for this organization? If not, nothing else in this list matters — the module and every permission grant within it are simply inert. This is new in this revision and matters because it means permission sprawl is capped structurally: you cannot accumulate a `finance:approve` grant that does anything if your organization never enabled Finance.

**Layer 1 — Organization Role** (coarse, scopes *which org's data* you can see):
- `owner` · `admin` · `member` · `viewer`, granted per organization via `organization_memberships` (table already exists, currently unenforced by RLS — see §30).

**Layer 2 — Department Permission Grants** (fine, scopes *which departments and what actions* within that org, and only within modules that org has enabled):
- A generalized permission-grant table, structurally identical to today's `prayer_permissions` text array, extended per department: e.g. `finance:read`, `finance:write`, `finance:approve`, `partnerships:manage`, `people:hr:read`, `compliance:admin`.
- Job titles ("Treasurer," "President," "Regional Director") become **presets** — a saved bundle of grants an admin can apply in one click — not new enum values baked into the schema. Adding a new job title never requires a migration.
- These same grants are what "my team" means for the Organizational Inbox's "Assigned to my team" view (§16) — a team, for inbox purposes, is simply the set of people sharing a given department permission grant, not a new concept to build.

This directly reuses two things that already exist and work (`admin_users` coarse role, `prayer_permissions` array pattern) instead of inventing new infrastructure, while finally giving `organization_memberships` a real enforcement job. External personas (partner contacts, church leaders) get real accounts under `viewer`/`member` org roles scoped to their own organization — replacing the shared-secret cookie model entirely.

**A fourth layer exists for the multi-organization model in §11:** a person's Layer 1 organization role is granted by their *home* organization, but Layer 2 department permission grants can also be issued *across* organizations — a USAM accountant can hold `finance:write` scoped to an affiliated ministry's organization, without being a member of that organization at all. Section 11 specifies this mechanism in full; it is worth flagging here because it is a genuine extension of the role model, not just an application of it.

---

## 10. Organization Architecture

The `organizations` table is the correct foundation and should become the literal tenant boundary for the whole system:

- USA Missionaries is `organizations` row #1 (already true — seeded by migration, not hardcoded).
- Every operational table gains (or already should have) an `organization_id`. Today only `product_feedback` and the newest DOS "My Record" tables consistently do; the legacy `missionary_households`-scoped tables (tables, encounters, fruit, applications, prayer, support) do not, and need retrofitting (§30–32).
- **New: `organization_modules`** (`organization_id`, `module_key`, `enabled_at`, `enabled_by`, `tier`) — the enforcement table for §4's modular architecture, sitting directly on top of `organizations`.
- `collectives` (existing table: family/team/ministry_team/small_group) becomes the sub-org grouping mechanism — a missionary household, a regional team, a partner church's small group are all `collectives` owned by an `organization`. As §14 details, this is also exactly how a **Mission Division** is modeled — a `collective` under USAM's own organization row, not a separate tenant.
- Partner ministries, churches, and affiliate networks are simply new `organizations` rows with `type = partner | church | affiliate`, using the exact same People, Documents, Reports infrastructure USAM uses for itself — no bespoke "partner mode" required in the codebase.
- `visibility_rules` (existing, currently unused by any UI) is the correct mechanism for controlled cross-organization data sharing once real partner tenants exist — worth activating rather than reinventing.

This section describes organizations as a flat list of tenants — correct as far as it goes, but incomplete. Some future organizations won't just be independent tenants sitting beside USAM; they'll be ministries USAM helps run. **Section 11 extends this exact model with a parent-child hierarchy** to describe that relationship precisely.

---

## 11. Multi-Organization Operating Model

Everything so far treats organizations as peers: USAM, a partner church, a future affiliate, each a row in `organizations`, each with its own modules and members. That model is correct for arms-length relationships. It doesn't yet describe what happens when USA Missionaries doesn't just *partner with* another ministry but actually *runs its back office* — when a ministry like the **Ministry of Reconciliation (MOR)**, already the flagship case study on the current `/partners` page, becomes an organization inside the NCC with its own board, its own financial records, its own missionaries, and its own donors, while USAM's own accounting, communications, compliance, and technology staff do real, hands-on work on MOR's behalf. That relationship needs its own architecture, because "give them a login" is not the same problem as "operate their finance department without owning their finances."

### From a flat tenant list to a hierarchy

Add a nullable, self-referential `parent_organization_id` to the existing `organizations` table. Most organizations will still have no parent — a partner church or an arms-length partner is a peer of USAM, not a child of it. But an organization *can* declare a parent, and USAM will, in practice, be the parent almost every affiliated ministry declares. This is a small, additive change to a table that already exists; it does not disturb anything described in §10.

### Three relationships, one taxonomy the organization already uses

The current `/partners` marketing page already names three tiers — Strategic Partner, Integrated Ministry, Mission Division — as a hardcoded, informal roadmap. Rather than invent new vocabulary, this section gives those three tiers a precise technical meaning, so the language product, legal, and engineering all use is the same language:

| Tier | `parent_organization_id` | What stays independent | What's shared |
|---|---|---|---|
| **Strategic Partner** | None — a peer organization | Everything: identity, finances, users, ministry data, board, branding | Only what's explicitly opted into via `visibility_rules` (e.g., a shared document library, joint-initiative tracking through Partnerships). This is the relationship type §21's Partnerships department already fully describes. |
| **Integrated Ministry** (e.g., a future MOR) | Set — child of USAM | Legal identity, its own board and board documents, its own financial records (own QuickBooks or ledger of record), its own donor base, its own missionaries and ministry data, its own public branding | Specific *platform-assigned* modules (§4) — typically Finance, Compliance & Legal, Technology, sometimes Development — operated in whole or part by USAM staff through cross-organization service grants (below), not by data migration. |
| **Mission Division** | N/A — not a separate organization at all | Nothing structurally; it *is* USAM | Fully absorbed: modeled as a `collective` under USAM's own organization row, not a tenant. Appropriate only when a ministry's leadership has actually chosen to give up independent identity, not merely to receive support. |

The meaningful engineering distinction is between the first two rows: a **Strategic Partner** is a peer with a relationship; an **Integrated Ministry** is a child organization that keeps its own identity while drawing on USAM's operational muscle. A **Mission Division** isn't really a multi-organization case at all — it's the point at which a ministry stops being modeled as its own organization, and should be treated as a distinct, deliberate decision, not a default. Section 14 walks through exactly how a single donation event resolves differently depending on which of these three a gift lands against — the clearest possible test of whether this taxonomy actually holds up.

### Isolated workspace, shared services — not shared data

This is the load-bearing rule for the whole section, and it follows directly from Principle 12 (§3): **an Integrated Ministry's data is always scoped by its own `organization_id`. It is never merged, copied, or migrated into USAM's own rows.** MOR's People, MOR's DOS ministry activity, MOR's Finance documents, MOR's board minutes — all belong to `organizations` row "MOR," full stop. What USAM provides is not data ownership but *labor*: staff who are members of USAM's organization but who are also granted the ability to operate specific modules on MOR's behalf.

That distinction — shared services, not shared data — is what lets MOR credibly tell its own board, its own donors, and its own auditors that it remains its own ministry, even while USAM's accountant is the one closing its books every month.

### Cross-organization service grants — extending the role model

Section 9 already flags this as a fourth layer on the role model; here is the mechanism. A new table, structurally similar to `organization_memberships` but distinct from it:

`cross_organization_service_grants` — (`grantee_user_id`, `home_organization_id`, `target_organization_id`, `department`, `permission_level`, `granted_by`, `starts_at`, `ends_at`).

A USAM staff accountant's home organization is USAM. A service grant lets that same person hold `finance:write` scoped to MOR's organization, without ever becoming a "member" of MOR in the `organization_memberships` sense. Two things about this are important:

- **It should be time-bounded** (`ends_at`), because a shared-services relationship is a business arrangement that can end — a grant that outlives the underlying agreement is a real access risk, not a hypothetical one.
- **It composes with, rather than bypasses, the existing Layer 2 permission model** — a service grant is still a `finance:write`-shaped grant, evaluated the same way any other department permission grant is evaluated (§9); it's just scoped to an organization other than the grantee's own.

### Consolidated reporting: two different things wearing one name

"Consolidated financial reporting" means two genuinely different things, and this architecture should support both without conflating them:

1. **Informational rollups** — an internal NCC dashboard summing MOR's and USAM's numbers side by side for leadership visibility. This is straightforward: every Finance record already carries an `organization_id`; a rollup is a query scoped to USAM plus any child organizations that have opted into consolidated-reporting visibility via `visibility_rules`. Cheap, low-risk, and genuinely useful the moment a second Integrated Ministry exists.
2. **Legally consolidated financial statements** — the GAAP question of whether USAM's audited financials must actually include MOR's numbers because USAM exercises a defined level of "control" over MOR. **That is an accounting and legal determination, not a software decision**, and this document deliberately does not presume an answer. The right posture for the NCC is to make sure every transaction is cleanly attributable to its owning organization (so that a true consolidation is *mechanically possible* whenever the accountants determine it's required) without building a "consolidated statements" feature speculatively ahead of that determination.

### Shared services, concretely

Each platform-assigned module (§4) is a candidate shared service. In practice, for an Integrated Ministry:

- **Technology** — the platform itself is inherently shared; MOR runs on the same NCC infrastructure USAM does, with no separate hosting or codebase.
- **Finance** — USAM's accounting team holds service grants to close MOR's books, prepare MOR's board reports, and prepare MOR's 990 workpapers, following the exact same phased roadmap as §20, just executed on MOR's data by USAM's staff instead of MOR's own.
- **Compliance & Legal** — USAM's compliance staff can maintain MOR's policy library and filing calendar the same way.
- **Communications** — optional; some Integrated Ministries will want their own communications staff and keep this module self-operated, others will lean on USAM's team. The module tier framework already supports either without a special case.
- **Development** — similarly optional; MOR may run its own donor pipeline or draw on USAM's Development staff, decided per relationship, not hardcoded.

### Branding and public identity

The `organizations` table already carries a `branding_mode` column (`default | usam | affiliate | custom`) — evidence the schema anticipated exactly this need before this document existed. An Integrated Ministry like MOR keeps its own public identity: its own missionary profiles, its own public-facing pages, its own name and visual identity, even while its back office runs through USAM's shared services. `branding_mode = affiliate` or `custom` is the mechanism; this section just gives it a reason to be used.

### AI assistants across the hierarchy

The AI governance rules in §28 extend into this model without needing new rules, only a clear statement of how they apply:

- **A USAM accountant using Finance AI while working MOR's books sees only MOR's data** — not because AI has a special multi-organization mode, but because the AI service is a thin layer over that accountant's real permissions (§28's second governing rule), and their cross-organization service grant is simply another source feeding that same permission check.
- **USAM's own Executive AI briefing may optionally include a labeled cross-organization section** — "MOR: 3 partnership follow-ups overdue, Finance close on track" — summarizing affiliated ministries that have opted into consolidated visibility via `visibility_rules`. It must always be visibly attributed to the named affiliate, never silently blended into USAM's own internal numbers as if it were USAM's own activity.
- **New guardrail specific to this section:** AI must never aggregate data across organizations that have not opted into a `visibility_rules` sharing relationship. Blending two organizations' data without consent is a distinct risk this section introduces that didn't exist when every organization was a fully independent tenant, and it deserves its own explicit rule rather than being assumed to fall out of the general RLS guardrail.

### Where I'd push back

- **Sequence this exactly like §4's module toggles: design `parent_organization_id` and the service-grant table now, because it's cheap; do not build the shared-services grant UI, the org switcher, or consolidated-reporting screens until there is a real Integrated Ministry to onboard.** Building this ahead of a real relationship is speculative generality with no one to validate it against.
- **Cap hierarchy depth at two levels — parent and child — unless a real case demands more.** Open-ended org trees (grandchildren, great-grandchildren) sound elegant and solve a problem nobody has yet; they also multiply the surface area of every permission and reporting query in this section for no proven benefit. Revisit only if an actual relationship needs it.
- **Legal consolidation should follow the accountants, not the roadmap.** Resist the temptation to build "consolidated financial statements" as a headline feature before USAM's own accounting and legal advisors have determined whether a given Integrated Ministry relationship actually triggers GAAP consolidation. Building the informational-rollup version now, and staying mechanically ready for the legal version later, is the right amount of software to build against an open question.
- **Default new integrated ministries to their own `organizations` row (Integrated Ministry), not to a Mission Division, even when full absorption seems likely eventually.** It's straightforward to reduce an organization's independence over time — fewer permission grants, more shared services — but it is genuinely hard to retroactively split a Mission Division's commingled data back into its own organization if a relationship changes direction. Reversibility should bias the default.

---

## 12. Relationship Between Public Website, DOS, and NCC

Section 2 told this story as a vision. This is the same relationship stated as an engineering invariant — confirmed accurate today and worth preserving exactly as-is going forward:

```
Public Website  →  Supabase  →  NCC  →  Public Website
   (intake)         (source          (review,          (curated
                     of truth)        approve,          display)
                                      operate)

DOS (Field)     →  Supabase  →  NCC
  (creates People,    (shared        (reviews, approves,
   Tables,             tables)        reports, never
   Encounters,                        re-creates)
   Fruit)
```

- The public website **only** creates intake records (applications, prayer requests, donor inquiries, partner document requests) and displays approved, curated output. It never becomes an app-style dashboard.
- DOS **only** executes ministry (People/Tables/Encounters/Review/Fruit) and never grows finance, HR, or partner-relationship features.
- The NCC **only** reviews, approves, administrates, and reports. It should not re-implement ministry data entry (see §26) or public content rendering — it configures and curates both.
- All three share one Supabase instance and one data model — already a correct, load-bearing decision (per `AGENTS.md`) that this redesign preserves entirely. This invariant holds per-organization once §11's model is in place: an Integrated Ministry's own missionaries use the same shared DOS, scoped to their own organization, exactly as USAM's do.

This section describes *what* crosses between the three systems — intake, approved content, shared data. **Sections 13 through 19 describe *how* — the event mechanics that decide when something happening in one domain becomes work routed in another, why most things never should, and what has to exist before any of it can be automated safely.**

---

## 13. Event-Driven Architecture — Domains and Routing

DOS and the NCC are both, underneath their department names and screens, systems that notice something happened and hand a person the next thing to do about it. That's already true of DOS, even though nothing in this document named it before this revision: a missionary logs a Table, and DOS can already surface a follow-up reminder or a suggested Movement Step. It's the target design for the NCC throughout this document too: a donation lands, and it should appear in the Finance inbox without anyone going to look for it; an application is submitted, and it should appear in the People pipeline the same way. **Both systems are event-driven — something happens, and work gets routed to the person or department responsible for it — but they are event-driven at different altitudes, and getting that altitude right is the entire point of this section.**

A prior pass of this document used group registrations as an illustration of NCC operational workflow. That was the wrong domain, and it's worth being explicit about why, because the same mistake is easy to make anywhere a personal ministry activity looks, from a distance, like an organizational process.

### Two domains, two altitudes

**DOS owns personal ministry and field execution.** These events generate work *for the individual missionary, discipler, or facilitator* — never for a department:

- Someone requests to join an individual facilitator's group
- A participant completes an assessment
- Someone responds to a table invitation
- A person submits a prayer request directly to a missionary
- A review arrives for a missionary
- A meeting request is submitted
- A personal follow-up becomes due

These should create DOS notifications, dashboard items, tasks, or approval requests for the individual ministry leader or the appropriate DOS user — not an NCC inbox item. Section 19 makes this a concrete, near-term DOS implementation recommendation, independent of everything else in this document.

**The NCC owns organizational operations.** These events generate work *for a department*, because they involve the organization's money, its legal standing, its public content, or its relationships with other organizations:

- A donation is received through a missionary, campaign, organization, or ministry division giving page
- A missionary application is submitted
- A church or organization submits a partnership inquiry
- A partner uploads a document
- A bank statement is uploaded
- Payroll information is received
- A Form 990 or insurance deadline approaches
- A missionary profile is ready for organizational approval
- A public testimony or fruit story is ready for publishing review
- An integrated ministry requires accounting, compliance, communications, or technology work
- A shared-services task is created for another organization
- A donation or expense needs allocation to the correct organization, ministry division, missionary, fund, campaign, or chart-of-accounts category

Both altitudes run on the same underlying mechanism — an event: something happened, at a point in time, to a subject, scoped to an organization, with a payload — but the *routing rules* differ by altitude, and that's correct, not an accident to fix. A Table being logged should never generate a task in anyone's Finance inbox. A donation landing should never generate a follow-up reminder inside a missionary's DOS app.

### The group registration worked example

Take the case directly: a person like Ryan or Dirk creates and facilitates their own group inside DOS. They control their public group page, receive group registrations, approve participants, communicate with participants, and manage the group day to day. Every one of those is a personal or field-ministry responsibility. It belongs in DOS, full stop — matching Principle 4 (NCC operates; DOS disciples), and matching the §4 finding that Groups execution already lives correctly in DOS's schema (`dos_groups`, `dos_group_members`, `dos_group_join_requests`).

USA Missionaries may see **aggregated** group metrics in the NCC — total active groups, total pending requests network-wide, participation trends by region. It should not normally see, manage, or approve any individual facilitator's group registrations. The distinction that matters: an *aggregate count* crossing into an NCC reporting view is a completely different, much lower-stakes thing than an *individual approval decision* crossing into an NCC inbox. The first is a metric; the second would be the NCC quietly becoming the operational owner of something that isn't its job — the exact failure this section exists to prevent.

### Most NCC events are organization-native, not elevated DOS events

Worth being precise here: it's tempting to read "NCC events" as always originating somewhere in DOS and bubbling up. Mostly they don't. A donation, a partner document upload, a compliance deadline, a board report — these are born directly in NCC's domain; they were never DOS events to begin with. **Elevation** describes the narrower, more consequential case: an event that originates in DOS's personal-ministry domain but becomes organizationally significant enough to cross into NCC's event stream. That's a much smaller set of events, and the system already has a working example of exactly this gate.

### The elevation gate already exists — this section just names it

RAW → REVIEWED → APPROVED, already established elsewhere in this document, *is* an event-elevation pipeline: a Fruit item is created as a DOS-domain personal-ministry event (RAW), reviewed, and only once APPROVED does it become eligible to cross into NCC's organizational domain — as content Communications can publish, as a data point Ministry Operations' Field Activity Rollup counts, as something Executive AI can reference in a briefing (§28). The elevation gate is the same human-approval step that already governs public visibility; this section's contribution is naming it as the general mechanism for *any* DOS-to-NCC crossing, not just the Fruit-to-Profile one. A missionary's DOS onboarding completing and becoming visible to the People department's Applicants/Missionaries pipeline (§22) is the same shape of event, at a smaller scale — and notably, group registrations are the counterexample: they generate an *aggregate metric* crossing (not an elevation of the individual event) precisely because no individual group-join decision needs organizational review the way an approved Fruit item does.

### Elevation requires the same discipline as publication, not a database trigger

Because RAW → REVIEWED → APPROVED already requires a human step, elevation should default to requiring one too. Recommend against building a generic, automatic DOS→NCC event-propagation system that silently promotes data across the domain boundary — that repeats exactly the kind of premature, speculative infrastructure this document has already argued against twice (§4's module-toggle sequencing, §11's multi-organization sequencing). Keep elevation rare, explicit, and reviewed, not a side effect of a shared table.

### The one legitimate downward flow is a notification, not a workflow

"Organizational workflows stay in the NCC" cuts both ways, and it's worth sharpening what it rules out. NCC-generated organizational work — a Finance close checklist item, a board packet deadline, a compliance renewal — must never spawn a workflow item inside DOS's ministry-execution surface; that would violate Principle 4 as directly as the reverse would. But a person still needs to *know* things that happen in NCC — "your support commitment was updated," "your application moved to the next stage." That's a **notification**, not routed work: it tells a person something happened; it doesn't ask DOS to do anything about it, generate a task, or change DOS's own data. The distinction matters because the two look similar from the outside and are architecturally very different — a notification is a one-way announcement, routed work is an item that expects action, state, and follow-up inside the system that receives it.

### A shared technical substrate, kept deliberately boring

One lightweight, append-only event log — not a full event-sourcing or CQRS platform, which would be more machinery than either domain's actual workflow needs justify today (Principle 6):

`platform_events` — (`id`, `organization_id`, `scope: personal | organizational`, `event_type`, `subject_type`, `subject_id`, `actor_id`, `payload`, `occurred_at`, `elevated_from_event_id` nullable).

- **`scope` is the routing switch:** `personal` events are DOS's to read and act on; `organizational` events are NCC's. A person working across a §11 shared-services relationship still generates events scoped to the organization the work was done *for* — a USAM accountant closing MOR's books generates organizational events scoped to MOR, not to USAM.
- **`elevated_from_event_id`** is how an NCC event that originated as a reviewed, approved DOS event keeps a traceable link back to its source — Fruit-approval-as-elevation becomes a real, auditable row instead of an implicit status flip.
- This is the general-purpose shape. Section 14 shows how it gets specialized for a financially significant event type — a donation — where several `payload` fields need to be promoted to first-class, queryable columns.

### Where I'd push back

- **Don't build a general-purpose event bus or message-queue platform up front.** A single append-only table with a handful of well-known `event_type` values, read by a small number of known consumers (§15), is sufficient at this scale and avoids the premature-infrastructure trap this document has flagged twice already.
- **Don't let "elevation" become a synonym for "replication."** The moment an elevated event starts carrying a full copy of DOS's underlying record into an NCC table, the two-parallel-data-models problem this document opened with (§1) recreates itself in miniature. An elevated event should reference its source, not duplicate its contents.
- **Resist making elevation automatic for anything touching money or public content.** Fruit-to-Profile already requires a human approval; any new elevation path (a support-status change reaching Development, for instance) should default to the same discipline until there's a specific, narrow, low-risk case for skipping it.

---

## 14. The Donation Event — Multi-Organization Routing and Financial Attribution

Use donations as the primary design example for the whole event system, because a donation is the single event type that most stresses the organization hierarchy (§11), the DOS/NCC boundary (§13), and the Integrated Ministry / Mission Division distinction all at once — and because getting it wrong has real financial and audit consequences, not just a UX papercut.

### The scale this has to work at

Assume the platform eventually serves 15,000 missionaries, leaders, giving pages, campaigns, organizations, and ministry divisions. A donor may give through:

- Ryan and Brooke Fox's USA Missionaries public profile
- Another missionary's profile
- A USA Missionaries campaign
- A restricted fund
- A Ministry of Reconciliation giving page
- Another integrated ministry
- A church or partner organization
- A Mission Division that is legally and financially part of USA Missionaries

An event that merely says "a donation was received" is useless at this scale. It has to carry enough organizational context to route, account for, report, and act on the donation correctly — on its own, without a human first figuring out whose money it is.

### Evaluating the proposed event envelope

The base `platform_events` shape from §13 (`id`, `organization_id`, `scope`, `event_type`, `subject_type`, `subject_id`, `actor_id`, `payload`, `occurred_at`, `elevated_from_event_id`) is the right foundation for every event type. A donation is financially significant and high-volume enough to justify promoting several fields out of `payload` into first-class, indexed columns — not because every event needs this treatment (most don't, and shouldn't), but because routing, RLS, and reporting all need to query these fields directly. Evaluating the proposed field list:

| Field | Recommendation |
|---|---|
| `event_type` | Keep — e.g. `donation.received`. |
| `occurred_at` | Keep. |
| `source_system` | Keep, but make it an explicit enum (`stripe`, `pco`, `manual`, `other`) rather than a free string — needed for reconciliation and for the gap-analysis question in §31 about whether PCO is the real system of record for USAM's own giving today. |
| `organization_id` | Keep, and define it precisely: **the organization whose books this transaction belongs to** — the accounting owner, not necessarily the organization whose giving page the donor clicked through. This is the single most important field in the envelope; RLS, Finance routing, and consolidated reporting all key off it. |
| `parent_organization_id` | Keep, as a **point-in-time snapshot**, not a live join. Financial and audit records should be immutable; if an Integrated Ministry's parent relationship ever changes, historical donation events should still reflect the org structure that was true when the gift was given. This is a deliberate exception to "don't duplicate what you can join" (§13's replication warning) — audit integrity earns it here specifically. |
| `ministry_division_id` **or** `collective_id` | **Collapse into one field: `collective_id`.** Per §11, a Mission Division *is* a `collective` under USAM's organization row — introducing a parallel `ministry_division_id` risks recreating the two-parallel-models problem this document opened with. One field, nullable, used for both regional teams and Mission Divisions. |
| `missionary_or_beneficiary_id` | **Split into `beneficiary_type` + `beneficiary_id`** (`missionary`, `campaign`, `fund`, `collective`, `organization`), mirroring the base envelope's existing `subject_type`/`subject_id` pattern rather than inventing a new shape. Worth keeping as first-class columns, not payload, because beneficiary is load-bearing for routing (Finance needs to query "all gifts to this missionary" efficiently). |
| `donor_id` | Keep. |
| `campaign_id`, `fund_id` | Keep as nullable references. Don't block the event envelope's design on Campaign/Fund tables existing first — those are Finance Phase 3 deliverables (§20); in Phase 0 these can be loosely-typed placeholders. |
| `restriction_type` | Keep, but make it a real enum matching nonprofit fund accounting: `unrestricted`, `temporarily_restricted`, `permanently_restricted` — Finance's restricted-funds tracking depends on exactly this classification, not a free-text field. |
| `amount` and `currency` | Keep. Store `amount` in minor units (integer cents), not a float — standard financial-engineering practice, worth stating explicitly since it's an easy mistake to make once and expensive to unwind. |
| `payment provider` | Keep — folds naturally into `source_system` above rather than being a separate field. |
| `external transaction ID` | Keep — essential for reconciliation against Stripe/PCO. |
| `deduplication / idempotency key` | Keep, but **derive it deterministically** from `(source_system, external_transaction_id)` rather than treating it as a separate freestanding value — one source of truth for uniqueness, not two that can drift apart. |
| `visibility classification` | Keep, as an explicit enum: `public` (may appear in donor-facing receipts, public fundraising thermometers), `internal` (Finance/Development only), `confidential` (e.g. an anonymous major gift) — echoes the confidentiality pattern already established for prayer requests (§9, §28). |
| `processing status` | Keep, but **reuse the work-item lifecycle from §16** rather than invent a second status vocabulary for this one event type. |
| `correlation ID` | Keep — groups every work item this one donation spawns (Finance reconciliation, Development update, thank-you draft, audit record) so they can be traced as one story, not four unrelated rows. |
| `metadata` | Keep as a catch-all, with one hard rule: **nothing needed for routing, security, or reporting may live only in `metadata`.** `organization_id`, `amount`, `restriction_type`, and the rest of the columns above must stay first-class — burying them in JSON breaks both RLS and query performance. |

Two additions worth making that weren't in the proposed list: an explicit `schema_version` (cheap to reserve now, detailed in §18) and `ingested_via` (which integration or person recorded this row — a webhook, a sync job, or manual entry — useful for debugging trust in the data long before anything automated touches it).

### How one donation event produces several different organizational actions

Once the event is written with the fields above populated correctly, everything downstream is a separate, independent **consumer** reading the same event — exactly the pattern §15 formalizes, not a special case:

- **Finance** records and reconciles the transaction against the bank/payment-processor feed.
- **Development** updates the donor relationship — giving history, relationship stage, next contact.
- **The missionary or beneficiary** receives an appropriate notification (a DOS or NCC notification depending on whether they're a missionary in the field or an org-level beneficiary).
- **A restricted fund's balance** updates, if `restriction_type` and `fund_id` apply.
- **A thank-you workflow** is prepared — a draft, per Principle 11, never auto-sent unless it matches a policy-approved template (§17's Level 5).
- **Reports** update — the relevant dashboards simply reflect the new row; nothing needs to "know" a donation happened beyond reading the same data.
- **An audit record** is written — in this design, the event row itself, immutable and append-only, *is* the audit record; no separate logging step is needed.
- **AI drafts communications** for human review — a receipt, a personalized thank-you note, a donor-relationship summary — strictly a Level 3 action (§17), never sent without approval.
- **An Integrated Ministry's books** receive the correct attribution automatically, because `organization_id` already pointed at MOR, not USAM, from the moment the event was written.
- **USAM leadership** sees an informational rollup, if and only if MOR has opted into consolidated visibility via `visibility_rules` (§11) — clearly labeled as MOR's activity, never commingled into USAM's own revenue line.

Nothing above requires a giant switch statement in one service. Each bullet is a consumer subscribing to `donation.received` events, filtered by whatever it cares about, exactly as §15 describes.

### Integrated Ministry vs. Mission Division: the same event, two different destinations

This is the concrete test of whether the taxonomy in §11 actually holds up under a real financial transaction:

- **A gift to an Integrated Ministry (MOR):** `organization_id = MOR`. The transaction lands in MOR's own ledger of record — its own QuickBooks today, or its own eventual internal ledger — regardless of whether USAM shared-services staff are the ones operating Finance for MOR. It is MOR's revenue, appears on MOR's 990, and is subject to MOR's own audit. USAM only ever sees it through an opted-in informational rollup, never as USAM's own income.
- **A gift to a Mission Division:** the division is not its own tenant — it's a `collective` under USAM's own `organizations` row (§11). So `organization_id = USAM`, with `collective_id = <the division>` carrying the internal segmentation. The gift lands directly in USAM's own chart of accounts, tagged by department, class, or fund — the same mechanism QuickBooks "classes" or "locations" already use for multi-program nonprofits today. It is USAM's revenue, USAM's 990, USAM's audit, just internally segmented.

The architectural payoff: **the same event envelope, the same consumers, the same routing logic handle both cases correctly.** The only thing that differs is which two fields get populated at the moment the donation is captured — `organization_id` pointing at a distinct tenant versus `organization_id` pointing at USAM with a `collective_id` tag. No branching logic needs to exist anywhere else in the system for this distinction to hold.

### Where I'd push back

- **Don't block the event envelope's design on Fund and Campaign tables existing first.** They're genuinely Year-2 Finance deliverables (§20, Phase 3); `campaign_id`/`fund_id` can be loosely-typed, nullable placeholders in Phase 0 without blocking anything.
- **Don't let `metadata` become a dumping ground for fields that are inconvenient to model properly.** Every time a new "just put it in metadata for now" field turns out to matter for routing or reporting six months later, it should get promoted to a real column — and that promotion should be treated as normal schema evolution, not a failure to have planned ahead.

---

## 15. Event-Driven Automation Foundation

This foundation is deliberately technology-neutral. **AI is not the foundation. Individual AI agents are not the foundation. There is no fixed "Operational Intelligence Layer" this architecture requires as a permanent component.** The foundation is simpler and more durable than any of those: meaningful activity emits a structured event (§13, specialized where needed as in §14), and an open set of optional consumers may respond to it.

### Possible consumers

- Notification service
- Organizational inbox (§16)
- Workflow rules
- Approval queues
- Email
- SMS
- Reporting
- Analytics
- Audit logging
- AI assistants
- Specialized future agents
- Third-party integrations
- Human-assigned tasks

### Why this framing matters more than any single consumer

This is what preserves the freedom the brief asks for: begin with basic notifications and rules, add AI recommendations later, and eventually adopt department-specific agents — without unwinding the core platform to do any of it. Concretely, this means the roadmap in §29 is fully functional and valuable with **zero AI involvement at all** through its early phases: an event fires, a notification consumer delivers it, a rule-based routing consumer assigns a work item, a human resolves it. AI, when it's added, is simply one more subscriber to the same stream — it does not change how events are produced, and removing it (or not building it at all) does not break anything else.

Each consumer subscribes to a filtered slice of the event stream — by `event_type`, `scope`, `organization_id` pattern — and needs to know nothing about any other consumer. Recommend against building a formal, pluggable consumer-registry abstraction up front: a handful of hard-coded consumers reading from `platform_events` with a `WHERE` clause is entirely sufficient at the scale this document is designed for today (Principle 6). Revisit a real plugin architecture only once there are enough real consumers — four or five, genuinely in production — that hand-wiring them becomes unwieldy, not before.

---

## 16. Events, Work Items, and the Organizational Inbox

### The distinction

**An event is a fact — something happened.** A donation was received; a document was uploaded; a partner requested a meeting. **A work item is a claim on someone's attention — something must be responded to.** Not every event should create a work item. A routine, successfully reconciled transaction might just update a balance and write its own audit row (the event itself), with no human ever needing to look at it. A work item exists only when a person, or a rule acting on a person's behalf, decides a response is actually needed.

### A reusable work-item lifecycle

One shared lifecycle, used by every department's work items — Finance's close checklist, Partnerships' tasks, Compliance's reminders, the Fruit approval queue — rather than each `OperationsInboxPage` instance inventing its own status vocabulary, which is exactly what's happened organically in the current system:

**New → Triaged → Assigned → In Progress → Waiting on Internal Team → Waiting on External Party → Ready for Review → Approved → Completed → Dismissed → Failed / Exception**

A `work_items` table backs this: `id`, `organization_id`, `department`, `status`, `assigned_to_user_id`, `assigned_to_team` (a department permission grant, per §9), `source_event_id` (nullable FK to `platform_events`), `due_at`, `created_at`, `completed_at`. Most work items originate from an event, but not all do — a person can also create a task manually (a partnership manager deciding on their own to follow up next week) — so `source_event_id` stays nullable rather than mandatory.

### Should the NCC have a cross-department organizational inbox?

**Yes, recommended**, with the views the brief proposes: Needs Attention, Assigned to Me, Assigned to My Team, Waiting on Me, Waiting on Others, Approvals, Exceptions, Due Soon, Recently Completed.

**The inbox aggregates; it does not replace.** Every item shown deep-links back to its authoritative department screen — a Finance close-checklist item opened from the inbox opens the real Finance screen, not a separate inbox-only editing surface. This is Principle 7 (every entity is a hub, not a dead end) and Principle 6 (reusable primitives) applied directly to cross-department work, and it's the fix for the current system's biggest navigational failure: every department today is a dead end with no shared view across them.

### Where I'd push back

Don't build the cross-department inbox before at least two departments have real work-item-generating workflows to aggregate — Finance's Phase 2 close checklist and Partnerships' Tasks (§20, §21) are the natural first two. An inbox aggregating a single department's items is just that department's screen with extra steps; it earns its keep only once there's genuinely more than one place work is coming from.

---

## 17. The Automation Ladder and Human-Review Boundaries

Rather than one mandatory AI model, define a ladder of increasing autonomy. Any given action type sits at whichever rung it has earned — most start low and stay there indefinitely, and that's fine.

**Level 0 — Record only.** The event is written; nothing else happens.
**Level 1 — Notify.** A person is told something happened.
**Level 2 — Rule-based routing.** A predetermined rule assigns a work item to a person or team.
**Level 3 — Prepare a recommendation or draft.** A summary, categorization, or draft communication is generated for a human to review. This is where nearly every AI capability in §28 operates.
**Level 4 — Human approval, then execution.** A person reviews a *specific instance* and approves it; the system then carries out that one action.
**Level 5 — Automatic execution for explicitly approved, low-risk actions.** An entire *category* of action has been pre-approved by policy, so individual instances execute without a human touching each one.
**Level 6 — Specialized agents operating within bounded permissions.**

### Where I'd sharpen this ladder

The most important line in the whole ladder is between Levels 4 and 5, and it's worth stating more precisely than the brief does: **Level 4 is per-instance human approval; Level 5 is per-category policy approval.** An action only belongs at Level 5 once someone with the authority to do so has written down, in advance, "this entire class of action is safe to execute without a human touching each occurrence" — not because a few instances in a row looked fine. Reaching Level 5 should require an explicit, documented policy decision, not a gradual erosion of Level 4 review.

**Level 6 is not a higher trust tier — it's a different shape of actor, not a bigger permission grant.** A specialized agent that can chain multiple actions together toward a goal is still bound, action by action, by whatever ladder level each individual action type has independently earned. Building an agent never lets a financial posting skip from Level 3 straight to Level 5 just because an agent, rather than a human, is the one initiating it — the agent still needs a human to approve that specific posting (Level 4) unless posting-category actions have separately, explicitly earned Level 5 status. This is Principle 14, stated in ladder terms: automation is earned per action, not granted per actor.

### Always requires human approval — no exceptions, regardless of ladder level otherwise available

- Financial posting or adjustment
- Legal or tax filing
- Public publishing
- Personnel decisions
- Sensitive pastoral or prayer decisions
- Organization access and permission changes
- Donor restriction changes
- Cross-organization data-sharing changes

These are permanently capped at Level 4. No amount of automation maturity, AI confidence, or agent sophistication moves any of them to Level 5 — the approval step itself must always be a human action, and an agent may prepare the Level 3 draft that a human then approves, but never approve its own output.

### Candidates for eventual Level 5 automatic execution

- Creating an internal notification
- Assigning a task according to a predetermined rule
- Sending a standard receipt already authorized by policy (the interesting case: it's genuinely Level 5 specifically because the entire category — "a standard donation receipt matching an approved template" — was pre-approved, not because any single instance seemed safe)
- Updating a non-sensitive workflow status
- Scheduling a reminder
- Detecting a missing document
- Preparing a draft (this one is actually Level 3, not 5 — drafting itself never auto-executes anything; it produces something for a human to act on)

---

## 18. Reliability and Auditability

The event system has to be reliable enough for finance, donor records, compliance, and multi-organization operations from the moment it exists — but "reliable enough" scales with how much is actually automated. Most of the list below is scaffolding for *automated* consumers; as long as Phase 0/1 keeps humans in the loop for anything consequential (which §17's ladder already mandates), the event log's job is simpler than a real distributed message queue. It mostly needs to be true, ordered, and idempotent at write time.

### Must exist in Phase 0

- **Idempotency and duplicate prevention** — via the deterministic dedup key from §14 (`source_system` + `external_transaction_id`). Non-negotiable from day one: a duplicate donation event double-counts real revenue.
- **Correlation IDs** — needed immediately to trace one event's downstream work items for debugging and audit, before any automation exists to make debugging harder.
- **Audit history** — automatic by construction, not an add-on: every event row is itself permanent and append-only (§13).
- **Permission checks and organization isolation** — this is the same RLS fix already flagged as the top technical prerequisite (§30); the event system's reliability is meaningless if the underlying data isn't organization-isolated in the first place.
- **Sensitive-data minimization** — decide up front what never belongs in an event payload (raw prayer request text, SSNs, full bank account numbers). Reference the owning record by ID instead of copying sensitive content into the event log, since the event log will, by design, have broader read access across more consumers than the narrowly-scoped source table.

### Can wait until real automated consumers exist (Phase 1+)

- **Retry behavior** — matters once automated consumers can fail transiently; a human-driven workflow doesn't need automatic retry.
- **Failed-event handling / dead-letter queue** — becomes necessary the moment automated consumers exist to protect against; before that, there's nothing reading the stream unattended.
- **Event versioning (`schema_version`)** — worth reserving the column in Phase 0 (nearly free) but the actual versioning discipline only matters once multiple consumers depend on a stable shape.
- **Replay safety** — matters once an automated consumer might reprocess an event and needs that to be side-effect-free; irrelevant while humans are the ones acting on events.
- **Human override / undo / compensating actions** — build this *concurrently with* the first Level 5 automatic-execution action, not before. There's nothing to override until something executes without a human in the loop.
- **Retention policy** — start with "keep everything"; add a real retention/archival policy once volume or a specific compliance need (a donor data request, for instance) makes one necessary.

Do not build the Phase 1+ list prematurely. It is real distributed-systems engineering, and building it before there's an automated consumer that needs it is exactly the kind of speculative infrastructure this document has repeatedly argued against.

---

## 19. Immediate DOS Recommendation — Notifications and Work Items

This is a standalone, separate DOS implementation ticket. It should not wait for any of the NCC work in Sections 4 through 18 — it can and should proceed immediately, on its own schedule, because the gap it fixes exists today and is unrelated to the NCC's organizational-event infrastructure.

**The gap:** DOS currently has no reliable notification or work-item model for personal ministry activity. A facilitator has no dependable way to learn someone has requested to join their group. A missionary has no work-item view of prayer requests, meeting requests, or reviews addressed to them directly (§13's DOS-domain event list).

**The concrete case**, using the group-registration example directly:

- A facilitator (Ryan, or Dirk) receives an in-app notification the moment someone requests to join their group.
- The DOS dashboard shows pending approvals as a work item — reusing the same event → work item → lifecycle pattern from §16, scoped `personal` rather than `organizational`.
- The facilitator opens the request directly from the notification or the dashboard.
- Approving or declining resolves the notification and the work item.
- Optional email or SMS delivery preferences, set per person.
- **The NCC receives only aggregate metrics** — total active groups, total pending requests network-wide — never the individual approval decision, and never a routed inbox item for it. This is §13's group-registration example, restated as an implementation instruction rather than an illustration.

**Why this doesn't wait:** it requires none of the organization-hierarchy work in §11, none of the RLS rework in §30, and none of the event envelope specialization in §14. DOS can implement its own `scope: personal` version of the event → work-item pattern on its own schedule, because §13 already establishes that DOS and NCC are two altitudes of the same idea, not one shared build. It also fixes a real, present usability gap for every missionary and facilitator using DOS today — independent of anything else in this document being built first.

---

## 20. Future Finance Department

**Current state:** zero accounting functionality. "Finance" today is a donor-intake inbox (`major_gift_inquiries`, `support_commitments`, `financial_freedom` submissions); "Financial Freedom" is an unrelated donor-coaching program that happens to share the word "financial." `stewardship` and `stewardship-sharing` are empty placeholders.

**Explicit non-goal:** do not replace QuickBooks. Recommend a phased roadmap:

- **Phase 1 (0–6 months) — Secure Document Portal.** Directly reuse the `partners_documents` pattern (private storage bucket, category grouping, signed URLs) for Finance: monthly financials, board reports, 990s, audit workpapers, insurance policies. This is nearly a copy of infrastructure that already works, not new invention.
- **Phase 2 (6–12 months) — Monthly Upload Workflow.** A checklist/status layer on top of Phase 1: bank statements received → reconciled → financials published → board-report sent. QuickBooks remains the ledger; NCC becomes the operational tracking and audit trail around the monthly close, visible to Treasurer/ED without needing QuickBooks access. This is also the natural point to introduce Finance AI (§28) — the checklist gives AI-drafted categorization and close summaries a concrete workflow to attach to, rather than a speculative feature.
- **Phase 3 (Year 2) — Budgeting, Restricted Funds, Housing Allowance.** These are nonprofit/missions-specific concerns QuickBooks doesn't model well out of the box: departmental budget vs. actual, restricted-fund tracking, per-missionary housing allowance calculations. Purpose-built here, not forced into QuickBooks classes. This is also when real `campaign`/`fund` tables should be built, giving §14's donation envelope real foreign keys instead of placeholder IDs.
- **Phase 4 (Year 2–3) — Read-Only Reporting via QuickBooks API.** Pull P&L, balance sheet, and cash flow into NCC dashboards via the QuickBooks API rather than re-deriving them — reporting layer, not a second ledger.
- **Phase 5 (Year 3+, evaluate only) — Internal Ledger.** Only revisit building a real accounting core if QuickBooks becomes a genuine multi-entity consolidation bottleneck once several partner or Integrated Ministry organizations are onboarded (see §11's consolidated-reporting discussion). Not a default recommendation.

Donation Tracking and Grant Tracking should live primarily in the new **Development** department (donor/pipeline relationship), with Finance owning the accounting-of-record view of the same underlying gift data — one dataset, two department lenses, matching the "one shared model, different interfaces" principle already established for DOS.

*AI opportunities for this department are detailed in full in §28; see "Finance AI." Cross-organization Finance service delivery to affiliated ministries is detailed in §11. The full donation-routing example is detailed in §14.*

---

## 21. Future Partnership Department

**Current state:** no `partners` table exists. Today's "Partnerships" is a static single-tenant marketing page plus a shared-password document portal (`partners_documents`) plus an empty admin placeholder. This is the largest gap between ambition and implementation of any department in the system.

**Recommended partner relationship hub** — one route per partner (`/ncc/partnerships/[id]`), tabs:

- **Overview** — relationship stage. The existing 6-phase integration roadmap already written as marketing copy converts into a real workflow state machine, and now maps cleanly onto §11's three-tier taxonomy: a partner's stage in this workflow is effectively "how close is this Strategic Partner to becoming an Integrated Ministry."
- **Contacts** — real `partner_contacts` records (name, role, email, phone) — currently doesn't exist at all.
- **Organizations** — link to the partner's `organizations` row once they're modeled as a tenant (§10), not a standalone concept.
- **Documents** — the existing, working `partners_documents` pattern, but scoped per-partner instead of one shared library everyone with the password sees identically.
- **Meetings** — notes/log, reusing the DOS `meetings` table pattern conceptually (not literally — partner meetings are an org-relationship concern, not a discipleship one; don't conflate the two data models).
- **Financial Support** — grants, in-kind gifts, recurring commitments — surfaced from Development/Finance's gift data, not duplicated.
- **Joint Initiatives / Projects** — trackable shared objects (e.g., "shared services pilot") with status and owner — doesn't exist today even conceptually.
- **Tasks** — follow-ups, board-approval milestones, legal-review steps — real work items per §16, not a bespoke list.
- **Communication Timeline** — a chronological log (calls, emails, meetings, document shares) — the single highest-value addition, since today there is literally no history retained per relationship, and the direct input to Partnership AI's meeting summarization (§28).
- **Relationship Health** — a simple, transparent score (days since last contact, document engagement, open tasks) modeled after — but distinct from — DOS's existing `dos_relationship_scores` pattern for individual discipleship. Reuse the *pattern*, not the table; partner-org health and personal discipleship health are different concepts and must not share a data model.
- **Prayer** — link partner-specific prayer requests into the existing Prayer department rather than building a parallel prayer feature.

**Access model change:** replace the single shared `PARTNERS_ACCESS_KEY` cookie with real accounts under `organization_memberships` (viewer/member role, scoped to their own partner org). This is required before per-partner document scoping or access logging can exist at all, and is a natural first proof point for the Role Architecture in §9.

**Where this department stops:** Partnerships owns the *Strategic Partner* relationship end to end. The moment a relationship crosses into shared back-office services — USAM staff operating another ministry's Finance or Compliance — it has become an Integrated Ministry relationship and is governed by §11, not by anything in this department. Partnerships should surface that transition as a real workflow step (moving a partner's stage to "Integrated"), not silently let the two models blur.

*AI opportunities for this department are detailed in full in §28; see "Partnership AI."*

---

## 22. Future People Department

**Current state:** fragmented across `/admin/missionary-profiles` (a 1,514-line "legacy" dashboard that is actually the real backend for households/tables/fruit/encounters), `/admin/profiles` (a thin, confusingly-named submission inbox), `/admin/applications`, and no HR or volunteer functionality at all.

**Recommendation:** one People department, one underlying `Person` concept (reuse the newer, properly organization-scoped `people`/`profiles` tables from the DOS-foundation model — not the legacy `missionary_households`/`missionary_people` tables, which should be migrated onto the newer model rather than extended further), with persona-scoped views:

- **Missionaries** — review/approve layer over DOS-authored data (support status, public-profile visibility, fruit approval queue). Data entry itself stays in DOS (§26).
- **Employees** — HR-only view: role, compensation metadata, onboarding/offboarding checklist. Gated by a dedicated `people:hr:read`/`write` permission grant (§9) — HR data must never be visible via the generic `editor` role the way finance/ministry data currently is.
- **Volunteers** — lightweight roster and assignment tracking.
- **Board** — roster, term dates, committee assignments — currently only exists as hardcoded bios on the public `/partners` page; should become real records the public page renders from.
- **Applicants** — the existing applications pipeline (`/admin/applications`), which already correctly funnels from public `/join`.

One person can hold multiple personas over time (Applicant → Missionary; Volunteer → Employee) without creating a new record — the single biggest UX and data-integrity win of unifying this department.

*AI opportunities for this department are detailed in full in §28; see "People AI."*

---

## 23. Future Ministry Operations Department

**Current state:** smeared across the "legacy" missionary-profiles dashboard (which does raw CRUD, violating the CC/FD boundary), `relationship-intelligence` ("Circle Engine"), and `workspaces/[id]/preview` ("Workspace Intelligence") — three different views of overlapping DOS rollup data, plus README/code drift (the preview route's docs claim it redirects; the code doesn't).

**Recommendation:** Ministry Operations becomes purely an **oversight and approval window into DOS**, not a data-entry surface:

- **Field Activity Rollup** — network-wide table/encounter/fruit volume, replacing the ad hoc mix of `relationship-intelligence` and `workspaces/preview`. This is also where aggregated group metrics (§13's group-registration example) belong — an oversight rollup, not a management surface.
- **Fruit Approval Queue** — the RAW → REVIEWED → APPROVED gate, currently buried inside the legacy dashboard, promoted to its own first-class workflow view. This is also the elevation gate described in §13 — the queue is literally where personal-ministry events become organizational ones.
- **Coaching/Accountability View** — regional directors see their region's missionaries' activity, matching the `accessTiers` intent that currently exists only as unused TypeScript.
- Raw People/Tables/Encounters CRUD is **removed** from this department entirely and left to DOS, where it already correctly lives (§26).

*AI opportunities for this department are detailed in full in §28; see "Ministry Operations AI."*

---

## 24. Recommended Data Ownership

| Data domain | System of record | NCC's relationship to it |
|---|---|---|
| People, Tables, Encounters, Review, Assessment, Connection Logs | DOS | Reviews, approves, reports — never creates |
| Fruit (RAW/REVIEWED/APPROVED) | DOS creates; NCC approves | NCC owns the approval action and the APPROVED state transition |
| Group registrations and facilitator approvals | DOS | NCC receives aggregate metrics only (§13); never the individual approval |
| Organizations, memberships, permission grants, module enablement, cross-organization service grants | NCC | NCC is system of record; DOS reads org context |
| Public profile content (curated) | NCC | NCC owns publishing decisions; public site only renders APPROVED data |
| Partners, partner contacts, documents, relationship history | NCC | NCC-only; no DOS or public-site equivalent |
| Finance documents, budgets, gift/support data | NCC (with QuickBooks as ledger of record per §20) | NCC is the operational/reporting layer, not the ledger |
| Applications, intake forms | Public site creates; NCC owns pipeline | Public site never shows pipeline status beyond confirmation |
| Knowledge base / policies | NCC | No other system needs this content |
| The event log (`platform_events`) | Shared substrate, written by both DOS and NCC | Each system owns writing its own `scope`; neither reads or routes the other's without an elevation event (§13) |
| Work items (`work_items`) | Owned per-department in NCC; DOS maintains its own separate personal-scope equivalent | The two never merge into one inbox (§16, §19) |

Every row in this table holds exactly as written for an Integrated Ministry as it does for USAM itself — the *only* thing that changes under §11 is who is doing the work, not who owns the record. A shared-services accountant closing MOR's books is still writing to Finance documents scoped to MOR's `organization_id`; nothing here becomes "USAM's data" by virtue of USAM staff having touched it.

---

## 25. Cross-Department Workflows

The current system has almost none of these because every department is a dead-end page. The redesign should make these the default, not an exception — and, per §13, each of these is really just an organizational event being routed to more than one department:

- **Application → People → Ministry Operations:** an approved applicant becomes a Missionary person record and appears in the Ministry Operations coaching view automatically.
- **Fruit Approval (the elevation gate) → Ministry Operations → Communications:** the moment a Fruit item crosses RAW → REVIEWED → APPROVED, it becomes eligible content for Communications to feature publicly — and, with Communications AI (§28), becomes a drafted newsletter or social post waiting for a human to approve and publish, not just raw data waiting to be noticed. This is §13's elevation mechanism, worked through as a concrete cross-department handoff.
- **Donation → Finance → Development → (missionary/beneficiary notification):** the full worked example in §14, spanning at least four departments from a single event.
- **Partnerships → Development → Finance:** a partner's financial commitment appears as a gift in Development's pipeline and as recognized/restricted revenue in Finance — one record, three department lenses.
- **Compliance → Finance:** document expiration (insurance, 990 filing windows) should generate a Finance/Compliance shared task, not live only as a static file.
- **People (HR) → Technology:** offboarding an employee should trigger account/access revocation — today nothing connects HR status changes to account permissions at all.
- **Partnerships → Organizations:** a partner relationship reaching the "Integrated Ministry" stage should trigger the actual organizational changes described in §11 — setting `parent_organization_id`, provisioning the first cross-organization service grants — as a deliberate workflow step, not a manual database change.

---

## 26. Areas That Should Move Into DOS Instead

- **The entire "Legacy Missionary Workspace" data-entry surface** (`/admin/missionary-profiles` CRUD for households, tables, encounters, fruit) — this duplicates DOS's own People/Tables/Fruit entry, contradicting the project's own stated principle ("People are created primarily in FD and managed/refined in CC"). NCC should retain only the *review/approve/report* half of this page.
- **Small-group ministry execution** (meetings, gatherings, attendance, **and registrations/approvals**) — already correctly modeled in DOS today (`dos_groups`, `dos_group_members`, `dos_group_gatherings`, `dos_group_attendance`, `dos_group_join_requests`) and should stay there. This is called out explicitly in this revision because the brief's own small-church example reached for "Groups" as an NCC module, and because group registrations were, in an earlier pass of this document, mistakenly used as an NCC workflow example (§13). The NCC's only legitimate touchpoint with Groups is an aggregate oversight rollup inside Ministry Operations, not a Groups CRUD or approval surface of its own. §19 recommends DOS build the notification/work-item infrastructure this requires, as an immediate, standalone ticket.
- No other misplaced ministry-execution functionality was found in the audit. These two are the significant violations and the highest-priority cleanup.

## 27. Areas That Should Remain Only in the NCC

- Organization, module, and permission administration
- Finance/accounting oversight and Compliance
- Partner relationship management
- Board governance and Executive reporting
- Cross-organization / network-wide reporting, including consolidated reporting across an organization hierarchy (§11) and organization-level attribution of donations and expenses (§14)
- Final approval workflows (fruit publishing, application approval) — the human-reviewed elevation gate described in §13
- Communications planning and public-content curation decisions
- System settings, integrations, and access administration
- Aggregate, network-wide rollups of DOS-domain activity (group participation, field activity) — never the individual personal-ministry decisions those rollups summarize (§13, §24)

---

## 28. AI Architecture — The Intelligence Layer

AI is not a department, and it doesn't get its own icon in the primary nav (§6). It is one of several possible consumers of the event stream described in §15 — not the foundation the platform depends on, and not required for anything through the early phases of the roadmap (§29) to work. It is a capability that shows up inside the workflows the twelve departments above already do, wherever it removes rote synthesis work from a human without removing the human's judgment from anything that matters. The goal is not "AI chat." Chat is the least interesting way to embed intelligence into operating software — it asks the user to remember the tool exists and go start a conversation with it. The more valuable pattern, used throughout this section, is AI that has already done the first draft of something a person was going to have to do anyway, sitting there waiting for review when they open the relevant screen.

Two rules govern every example below, restated from Principle 11 and worth repeating here because they are the actual product decision, not a caveat:

1. **AI drafts; a human approves.** Nothing in this section initiates a financial transaction, files anything, publishes anything externally, or takes an HR action on its own. Every capability below produces a draft, a summary, a suggestion, or a flag — never a completed action. In automation-ladder terms (§17), essentially everything in this section operates at **Level 3**.
2. **AI runs inside the requesting user's real permissions, never above them.** An AI feature is not a service account with blanket read access to everything for convenience. If a regional director asks for a coaching summary, the summarization job can only see what that regional director could already see by hand. This includes cross-organization service grants (§11): a shared-services accountant's AI-assisted view of an affiliated ministry's books is scoped exactly as their grant is, no more. This is stated explicitly because it is currently *not safe to build* — see the hard dependency called out at the end of this section.

Mechanically, every capability below is triggered by the event model in §13–§15: something happens (Fruit is approved, a meeting is logged, a close-checklist item is completed), an event fires, and AI is simply one of the optional consumers that reads it and does something with it. Without §13's event log, "AI has already drafted it by the time you open the screen" is just a description with nothing underneath it — and, per §15, none of this requires AI to exist at all for the platform's routing to still function correctly.

### Department by department

**Executive AI**
- A weekly or monthly executive briefing, auto-assembled from activity across whichever modules are enabled (People changes, Finance status, Partnership health, Ministry Operations fruit counts) — drafted, then reviewed and edited by the ED before anyone treats it as final. The same RAW → REVIEWED → APPROVED discipline the ministry pipeline already uses, applied to internal reporting content. Where §11 applies, this briefing may include a labeled, opt-in cross-organization section for affiliated ministries — never silently blended into USAM's own numbers.
- Board packet assembly assistance: AI drafts the narrative summary from underlying Finance/Ministry Operations/Partnership data; staff edits before it goes to the board. Never auto-sent.
- Strategic pattern surfacing: "three partner relationships have had no contact in 60+ days," "there's a coaching gap in the Southeast region" — genuinely useful only because it's cross-department, which is exactly what a human scanning department-by-department would miss.

**Finance AI**
- Reads uploaded bank statements and receipts and suggests transaction categorization — a suggestion the bookkeeper approves before anything is treated as posted. Never posts to the ledger itself.
- Drafts the monthly close summary and flags what's missing from the Phase 2 close checklist (§20).
- Prepares Form 990 workpapers: pulls the relevant structured data and drafts supporting commentary for the accountant to review. Does not file anything.
- Drafts board financial reports from the underlying Finance data.
- Flags unusual expenses for human review — pattern-based alerting, not autonomous action.
- Drafts donation thank-you communications and receipts from `donation.received` events (§14), never auto-sent unless the specific template has separately earned Level 5 policy approval (§17).
- **Governance line, restated because Finance is the highest-stakes department for this:** AI never initiates a transaction, a reconciliation, or a financial approval. This isn't a phase-1 limitation to relax later — it's permanent, capped at Level 4 by §17, and it's the same "do not replace QuickBooks" discipline from §20 applied to the AI layer. It applies identically whether the books belong to USAM or to an Integrated Ministry USAM's staff are closing on its behalf (§11).

**Partnership AI**
- Summarizes meetings (from Voice AI transcription, below, or manual notes) directly into the Communication Timeline (§21) — automatically, since a summary of a meeting that already happened carries little risk and high value.
- Drafts follow-up emails from meeting notes, for the partnership manager to review and send.
- Recommends a next action based on relationship stage and health score — e.g., "this partner is in the Governance phase with no legal-review task open; consider opening one."
- Flags neglected partnerships proactively, extending the passive Relationship Health score (§21) into an active nudge.

**Communications AI**
- Drafts newsletters, social posts, prayer updates, donor communications, and press releases from underlying structured data (approved Fruit, Partnership milestones, Finance summaries) — always draft-then-human-publish. This must respect the exact same APPROVED-only gate that already governs what ministry data can appear publicly (§12); an AI draft pulling from RAW or REVIEWED data and accidentally getting published would be a real incident, not a bug.

**People AI**
- Summarizes long applications for reviewers into a scannable summary with flagged concerns — the reviewer still decides.
- Drafts missionary summaries (for board or donor use) from approved profile and fruit data.
- Suggests onboarding checklist items and role fit based on what an applicant captured — a suggestion, not a decision.

**Prayer AI**
- Summarizes regional prayer trends without exposing individual confidential requests to anyone who lacks the permission to see them — this must run inside the existing `prayer_permissions` confidentiality boundary (§9), not around it. An AI summarizer is not an exemption from `view_confidential_requests`.
- Generates answered-prayer reports for donor and board storytelling, sourced only from requests already marked resolved and shareable.

**Ministry Operations AI**
- Flags bottlenecks proactively — "12 fruit items have been pending review for more than 14 days" — surfaced before someone has to go looking for it.
- Extends DOS's `dos_relationship_score` rollups with narrative summarization across regions.
- Drafts leadership coaching summaries for regional directors reviewing their missionaries.

**Knowledge Base AI**
- An internal assistant doing retrieval over SOPs and policies — "what's our reimbursement policy," "how do we handle a data request." This remains, as in the original architecture pass, the lowest-risk, highest-leverage starting point: it touches no financial, personnel, or confidential pastoral data, which makes it the right place to prove the AI pattern works and build organizational trust before extending into sensitive domains.

**Technology AI — reclassified, not adopted as written**
The brief lists error explanation, system diagnostics, deployment summaries, and codebase documentation under Technology AI. Worth pushing back on directly: these are genuinely useful, but they are **engineering-tooling concerns, not NCC product features.** They're things the team building the NCC uses to build the NCC (already served well by tools like Claude Code itself), not something a Technology Administrator persona needs as a shipped screen inside the product nonprofit staff use. Recommend keeping this capability real, but external to the NCC's user-facing surface — don't build a "Technology AI" tab that operational staff will never open.

### Voice AI — a shared service, not a department feature

Voice capture, meeting transcription, quiet-time transcription, automatic summarization, and action-item extraction should be built **once**, as a shared transcription-and-summarization service, and consumed by whichever department needs it — Partnerships (meeting notes), Executive (board meetings), People (interviews) — rather than re-implemented per department. This is Principle 6 (boring, reusable primitives) applied to the AI layer, and it's worth noting explicitly that DOS already has a live precedent for exactly this pattern in its own voice-journaling and `dos_user_journal_entries` feature — this isn't a new capability area for the team, it's an extension of infrastructure that already exists and works.

### AI governance principles

- **Every AI output in an approval-relevant workflow is a draft**, restated once more because it is the single most important sentence in this section.
- **AI must respect the same permission and confidentiality boundaries as a human user** — see the hard dependency below.
- **AI must never aggregate across organizations without explicit, opted-in sharing** — the multi-organization-specific extension of the rule above, spelled out fully in §11.
- **Per-organization AI consent**, defaulting **off** for confidential domains (Prayer, HR) until an organization's admin explicitly enables it. A module being enabled and AI being allowed to touch that module's data are two separate switches, not one — a church might want the Prayer module without wanting AI anywhere near confidential prayer requests, and that has to be a real, respected setting, not a footnote.
- **No AI in final financial posting, legal filing, or public-publishing actions**, full stop — these stay permanently at Level 4 per §17, regardless of what AI or agent capability exists.

### The hard dependency this section has on the rest of the document

This is worth stating plainly rather than burying in a risks section: **building any of the above on top of today's Row-Level Security is not safe.** Today's RLS pattern (§30, Technical Recommendation 2) gives any `admin`/`editor` blanket read/write access to every table — there is no organization boundary enforced at the database layer. An AI feature built against that foundation, even a well-intentioned one, would be a service that can see everything, summarizing everything, for everyone — which is precisely the shape of a real data-leak incident (a partner church's confidential prayer requests summarized into a report a different organization's admin can read, or an Integrated Ministry's unapproved financials appearing in a briefing USAM staff outside that shared-services grant can see). **The RLS fix in §30 is not parallel work to the AI roadmap. It is a prerequisite for it.** No AI feature that touches per-organization data should ship before organization-scoped RLS is live.

### Recommended rollout sequence

Given the dependency above and the sensitivity gradient across departments, don't build these simultaneously. In order:

1. **Knowledge Base retrieval assistant** — lowest risk, no per-org sensitive data, proves the pattern.
2. **Voice AI transcription** — high daily-use value, moderate risk, built as the shared service other departments will lean on.
3. **Communications drafting** — meaningful value, bounded risk since output is always reviewed before anything public happens.
4. **Finance and Partnership assistance** — sequenced after their respective Phase 1/2 workflows exist (§20, §21) so AI has a real process to attach to rather than a speculative one.
5. **Executive summarization** — needs mature, trustworthy cross-module data to summarize, so it comes after the departments it draws from are real.
6. **Prayer AI last** — the most sensitive domain in the system; ship it only after the confidentiality-gating pattern has been proven safe elsewhere.
7. **Cross-organization AI (§11's labeled consolidated briefings)** — ships only after both organization-scoped RLS and single-organization AI are proven, since it is strictly higher-risk than either alone.

---

## 29. Long-Term Roadmap

This roadmap layers two distinct tracks. The **Year 1/3/5** structure below is the whole-system build-out (also detailed as build Phases 0–6 in §35). Nested inside it is a separate, narrower **Automation Maturity progression (Phases 0–4)**, specific to how the event and automation system in §13–§19 matures — deliberately paced slower than the rest of the platform, per §17's "automation is earned" principle. The two use the word "phase" for different things; treat the Automation Maturity phases below as a sub-track of the Year 1/3/5 timeline, not a competing schedule.

### Automation Maturity Phases

**Phase 0 — Establish the substrate, stay human-driven.**
- Establish event naming and attribution conventions (`event_type` taxonomy, `organization_id`/`scope` discipline).
- Build the minimal event and audit primitives — `platform_events`, the donation envelope specialization (§14).
- Ensure every public form and organizational intake record has clear ownership and status (fixing today's ad hoc `OperationsInboxPage` source-forms lists).
- Fix missing notification paths — including the DOS ticket in §19, which runs in parallel on its own track, not gated behind this list.
- Keep all workflows primarily human-driven. No automation beyond Level 0–2 (record, notify, rule-route) exists yet.

**Phase 1 — Organize the work.**
- Organizational Inbox (§16).
- Reliable notifications.
- Basic rule-based routing (Level 2).
- Approval queues.
- Work-item ownership and statuses, using the shared lifecycle from §16.

**Phase 2 — Draft, don't decide.**
- AI summaries, classification, duplicate detection, and drafted actions (Level 3) — sequenced per §28's rollout order (Knowledge Base first).
- Human review remains mandatory before any sensitive execution — nothing in this phase reaches Level 4 or 5.

**Phase 3 — Earn selective automation.**
- Low-risk, policy-approved automation (Level 5), only for the categories §17 explicitly allows — never for anything on the always-human list.
- Department-specific assistants, sequenced per §28 (Finance and Partnerships next, Prayer last) — not all departments simultaneously.

**Phase 4 — Evaluate, don't schedule.**
- Specialized agents or multi-agent workflows, **if and only if they become genuinely useful** for a specific, named pain point that Phase 3's simpler automation has already failed to solve.

### Where I'd challenge this sequence

Phase 4 should stay unscheduled and conditional, the same way Finance's Phase 5 internal ledger (§20) and the multi-organization module-toggle UI (§4, §11) are treated as "evaluate only" rather than committed work. Per §17's own definition, a specialized agent is only as trustworthy as the individually-earned ladder level of each action it takes — multi-agent workflows are the highest-risk, least-proven part of this entire roadmap, and pursuing them because the technology exists rather than because a specific, named problem demands them would repeat the same mistake this document has flagged everywhere else: building capability ahead of proven need.

### Year 1 — Foundation & Consolidation

- Retrofit `organization_id` onto legacy operational tables; activate `organization_memberships` in RLS. This is the prerequisite for everything in Year 3 and every AI feature in §28 — it ships first regardless of what else is prioritized.
- Design every new table and department as module-aware (`organization_modules` exists; nothing assumes universal availability) — without yet building the toggle UI (see §4 pushback).
- Add `parent_organization_id` and the `cross_organization_service_grants` table to the schema (§11) — data model only, no UI yet, for the same reason.
- Complete Automation Maturity Phase 0: stand up `platform_events`, the donation envelope, and `work_items` (§13–§16); wire the one elevation rule that already exists in practice — Fruit approval — through it.
- Ship the DOS notification/work-item ticket (§19), independently and in parallel.
- Ship the three-layer (soon four-layer) role/permission model; migrate `admin_users` roles and `prayer_permissions` onto it.
- Consolidate duplicate/alias routes into the new department shell (§32); retire the Legacy Missionary Workspace's data-entry half.
- Ship Partnerships Phase 1 (real `partners`/`partner_contacts` entities, per-partner accounts, scoped documents) and Finance Phase 1 (document portal).
- Stand up People department consolidation (HR/Volunteers/Missionaries/Applicants under one model).
- Begin Automation Maturity Phase 1 (Organizational Inbox, reliable notifications) and ship the first AI capability: the Knowledge Base retrieval assistant (Phase 2's first, lowest-risk entry).

### Year 3 — Departmental Depth & First Real Module Toggle

- Finance Phases 2–3 (monthly workflow, budgeting, restricted funds, housing allowance) — Finance AI (categorization, close drafting) follows once Phase 2 is live.
- Partnerships Phases 2–4 (relationship health, joint initiatives, communication timeline) — Partnership AI (meeting summaries, follow-up drafts) follows.
- Development department stood up as its own donor/grant pipeline, separated cleanly from Finance.
- **Onboard the first real partner organization as a second `organizations` tenant** — this is the point at which the module toggle UI, self-serve vs. platform-assigned workflow, and dynamic per-org navigation actually get built, proving the organization-first and modular models end to end together, not separately.
- **If a relationship like MOR's is ready, onboard the first Integrated Ministry** — building out the shared-services grant UI, the organization switcher, and informational-rollup reporting from §11 against a real relationship rather than a hypothetical one.
- Voice AI shared service and Communications AI drafting ship, both consuming `platform_events`.
- Automation Maturity Phase 2 matures across most departments; Phase 3's first Level 5 candidates (standard receipts, rule-based task assignment) get evaluated for policy approval.

### Year 5 — Network Scale

- Multiple partner organizations and Integrated Ministries operating as tenants under `visibility_rules`-governed cross-org sharing, each running its own module mix and, where applicable, its own mix of self-operated and shared-services departments.
- Finance Phase 4 (QuickBooks API reporting layer); evaluate Phase 5, and any question of legally consolidated statements across Integrated Ministries, only if the accounting and legal facts on the ground actually call for it (§11).
- Executive AI summarization and Ministry Operations AI mature, now drawing on genuinely rich cross-module data, including opt-in cross-organization rollups.
- Prayer AI ships last, after every other domain has proven the confidentiality-gating pattern holds.
- Automation Maturity Phase 3 in steady operation; Phase 4 (specialized agents) evaluated only against specific, named needs Phase 3 hasn't solved.
- NCC is the default daily login surface for every employee, missionary, board member, and active partner or affiliated-ministry contact — see §36.

---

## 30. Technical Recommendations

1. **Unify the two parallel data models.** Migrate legacy `missionary_households`-scoped tables toward the `organizations`/`collectives`/`profiles`/`people` foundation rather than extending the legacy model further.
2. **Fix RLS to be organization-scoped, not globally admin-vs-not.** Replace the blanket `admin_users` bypass pattern (copy-pasted across 10+ migrations) with a single reusable function that checks organization membership and department permission grants. This is now a hard prerequisite for §28 (AI Architecture) and every automated event consumer in §15, not just a data-hygiene improvement — sequence it accordingly.
3. **Add real middleware protection for `/admin` and `/dos`.** Both currently rely entirely on layout-level checks; a new API route that forgets to call the auth helper is silently unprotected. Introduce a shared `requireDepartmentAccess()` wrapper instead of the current hand-copied per-route check — and have it check module enablement (§4) before permission grants (§9).
4. **Unify the three access-gate systems** (`admin_users`+Supabase Auth, HMAC `system_access_codes` cookie, shared-secret partners cookie) into one identity model — real accounts for everyone, including partners and board members, enabling actual audit trails.
5. **Generate and commit a Supabase `Database` TypeScript type.** None exists today; the schema is undocumented in code for a system with ~80 tables.
6. **Build one generic, polymorphic `documents` subsystem** (owner_type/owner_id: partner, finance, compliance, person) instead of the current single-purpose `partners_documents` table, so Finance, Compliance, and HR don't each re-invent upload/versioning/access-logging.
7. **Delete or implement the aspirational role model.** `src/lib/platform/architecture.ts` and `dos-platform-roles.ts` should either become the real permission system (§9) or be removed — leaving them as unused scaffolding actively misleads future engineers.
8. **Resolve the `workspaces/[id]/preview` doc/code drift** — the README claims a redirect that the code doesn't perform. Reconcile before it causes a real incident.
9. **Build `organization_modules` and the module-manifest system as a data model in Year 1**, but withhold the toggle UI and dynamic navigation until Year 3 (§4, §29) — the schema should be ready long before the feature needs to be.
10. **Add `parent_organization_id` (self-referential, nullable) to `organizations` and build `cross_organization_service_grants` (§11) in the same Year 1 data-foundation pass** — cheap now, and every later multi-organization feature depends on it existing.
11. **Build the `platform_events` append-only log (§13) in the same Year 1 pass**, with `scope`, `elevated_from_event_id`, and a reserved `schema_version` column from day one — a single small table, not a message-bus platform, that every department inbox and every AI trigger in §28 ultimately reads from.
12. **Build `work_items` (§16) as a shared table from the start**, reused across every department rather than department-specific status columns bolted onto existing tables — this is the direct fix for the current `OperationsInboxPage` pattern, where each instance already reinvents its own status vocabulary.
13. **For the donation event type specifically, promote the fields listed in §14 to first-class columns** rather than leaving them in `payload` — routing, RLS, and reporting all need to query them directly, and this is the one event type in Phase 0 that justifies that treatment.
14. **AI services must be built as thin layers over the same RLS-scoped queries a human user would run** — never as a privileged bypass service account. This is the concrete engineering form of the AI governance principles in §28 and the single most important guardrail in this section.

---

## 31. Repository Gap-Analysis Questions

Before any of Sections 13–19's event architecture, or §14's donation-routing example specifically, moves from this document into implementation, these open questions about the current repository need real answers — not assumptions made here. Each is grounded in what the earlier codebase audit actually found, not a generic checklist:

1. **Does DOS have any notification delivery mechanism today — in-app, email, or SMS — for any event type at all?** The audit found no evidence of one. This determines whether §19's DOS ticket is new infrastructure or an extension of something that partially exists.
2. **Is `dos_group_join_requests` (confirmed to exist in the schema) already sufficient to represent a facilitator's pending approvals**, or does it need the status vocabulary from §16 layered on top before it can back a real notification/work-item experience?
3. **What do `support_commitments`, `pco_giving_records`, and `pco_giving_sync_runs` currently capture for a gift** — do they already carry enough structure (amount, payer, date, matched missionary) to map onto §14's donation envelope, or does a new `donations`/`gifts` table need to be introduced alongside them?
4. **Is Planning Center Online the actual system of record for USAM's own giving today?** If so, `source_system` in §14's envelope needs to distinguish PCO-originated events from any future direct Stripe integration from day one, not as a later addition.
5. **Does any `campaign` or `fund` concept exist in the schema today, even informally?** The audit found none. This confirms §14's `campaign_id`/`fund_id` should stay loosely-typed placeholders until Finance Phase 3 (§20) builds the real tables, not block the event envelope's design in the meantime.
6. **Is `organizations.branding_mode` read anywhere in current giving-page or public-profile code today, or is giving-page branding still fully hardcoded per missionary?** This determines whether a MOR-branded giving page (§14) is close to buildable or requires new giving-page infrastructure first.
7. **What do `missionary_households.usam_application_status` and `usam_profile_status` currently drive?** These may already be an ad hoc, informal work-item lifecycle for the applications pipeline — if so, §16's formal lifecycle should absorb and replace them, not run alongside them as a second system.
8. **Do any current integrations (Stripe, PCO, or others) have a webhook or sync entry point that could emit `platform_events` directly**, or does every integration today write straight to its destination table with no natural event-emission point? This determines whether Phase 0 can retrofit the event log onto existing integrations cheaply or needs new webhook plumbing first.
9. **Does any existing admin page already implement anything resembling a cross-department inbox**, beyond the per-department `OperationsInboxPage` instances the audit found — i.e., is there real prior art for §16's aggregation UI, or is it greenfield?
10. **What is the current relationship between `missionary_fruit_items.cc_status` and any notification a missionary or reviewer receives today?** Is there already an implicit "ready for review" signal that could seed the Fruit-approval elevation event in §13, or does that notification path not exist yet either — in which case it's effectively the same gap as §19's DOS ticket, just on the review side rather than the facilitator side.

---

## 32. Migration Strategy From the Current NCC

This is an in-place evolution, not a rewrite. Sequenced to minimize risk:

1. **Answer §31's gap-analysis questions first.** Several of the sequencing decisions below (whether `pco_giving_records` needs a new table alongside it, whether `dos_group_join_requests` needs new columns) depend on their answers, not on assumptions made in this document.
2. **Data foundation first, invisibly.** Backfill `organization_id`, stand up the permission-grant table, the `organization_modules` table, the `platform_events` log, the `work_items` table, and the `parent_organization_id`/`cross_organization_service_grants` schema from §11 — none of this changes any UI, so it can ship incrementally with no user-facing risk.
3. **Ship the DOS notification/work-item ticket (§19) on its own track**, independent of everything else in this list — it has no dependency on the NCC data foundation above.
4. **New department shell alongside old routes.** Build the tabbed department-hub pattern once (generalizing the existing `OperationsInboxPage`/`public-experience` pattern), then migrate department by department — starting with **Finance** and **Partnerships**, since they have the least legacy entanglement and the most obvious current gaps.
5. **Consolidate known duplicates as part of the same pass:**
   - `support` / `support-team` → one route
   - `feedback` / `product-feedback` → one route
   - `prayer` / `prayer-team` → one route
   - `forms` / `pages` / `site` / `inquiries` → already redirect into `public-experience`; delete the shims once confirmed unused
   - `finance` / `financial-freedom` (admin) → Finance department absorbs the donor-coaching review queue as a sub-view; keep the public `/financialfreedom` program name distinct in copy to avoid confusing donors
   - `stewardship` / `stewardship-sharing` → retire both placeholders; their intent folds into Finance's phased roadmap (§20)
   - `partners` / `partners-documents` → become tabs of one Partnerships department
   - `profiles` / `missionary-profiles` → split cleanly along the People (§22) / Ministry Operations (§23) boundary; retire the data-entry half per §26
6. **People department consolidation next** — it's the largest, most-used surface, so it moves only after the department shell and permission model are proven on smaller departments.
7. **Decommission the Legacy Missionary Workspace's CRUD** only after DOS's field entry is confirmed to fully cover what it currently duplicates, and NCC's review/approve tooling covers what's left.
8. **Do not build the module toggle UI, dynamic navigation, or self-serve/platform-assigned workflow until the first real second tenant organization is being onboarded.** Everything up to that point should be built *module-aware*, not module-*configurable* — the distinction from §4 matters here as a sequencing rule, not just an architecture note.
9. **Do not build the shared-services grant UI, organization switcher, or consolidated-reporting screens from §11 until a real Integrated Ministry relationship exists.** Same discipline, same reason: schema now, feature when there's someone to validate it against.
10. **Do not build elevation rules beyond Fruit approval, or any automatic DOS→NCC propagation, until a second concrete case proves the pattern is needed.** §13's substrate should exist early; its rule set should grow slowly and only against real, reviewed cases.
11. **Do not build the Organizational Inbox (§16) until at least two departments generate real work items to aggregate.**
12. **AI features ship only after their governing RLS fix and, where relevant, their target department's Phase 1/2 workflow are live** — per the rollout sequence in §28.
13. **Do not build Automation Maturity Phase 4 (specialized/multi-agent workflows) on a schedule at all** — evaluate only, against specific named needs, per §29's challenge to that phase.

---

## 33. Risks

- **RLS rework touches sensitive data.** Financial and pastoral (prayer) records are exactly the data where a wrong policy is a real incident, not a bug ticket. Requires deliberate staged rollout with verification at each step, not a single big-bang migration.
- **AI, or any automated consumer, built on top of today's blanket RLS is a data-leak risk, not just a feature risk.** Restated from §28 because it is one of the largest risks this revision surfaces: any automated consumer is a force-multiplier on whatever access boundary it inherits, and today's boundary is broken.
- **Retrofitting `organization_id` onto ~80 tables** is a large, careful migration program — sequencing and backward compatibility during the transition matter more than speed.
- **Premature module-toggling and multi-organization infrastructure has no payoff until a second tenant or Integrated Ministry actually exists** and is a real risk of wasted engineering effort if built ahead of that need — see §4, §11, and §32.
- **Cross-organization service grants are a new privilege-escalation surface if not scoped and time-bounded carefully** — an untended grant that outlives the underlying shared-services relationship is a real access risk, not a hypothetical one (§11).
- **Consolidated-reporting ambition could outrun accounting and legal reality.** Building "consolidated financial statements" as a feature before USAM's accountants and legal advisors determine whether GAAP consolidation actually applies risks producing numbers that look official but aren't accounting-defensible (§11).
- **Donation misrouting is a real financial-integrity risk, not just a data-quality one.** If `organization_id` or `collective_id` is populated incorrectly at the point a gift is captured (§14), the money is misattributed between an Integrated Ministry and USAM's own books — this needs validation at the point of capture, not just downstream reconciliation.
- **Event elevation could quietly become event replication.** If an elevated event ends up carrying a full copy of the underlying DOS record rather than a reference to it, the two-parallel-data-models problem this document opened with (§1) recreates itself inside the event log (§13).
- **"Agent-washing" — using the label "Level 6 agent" to justify skipping an action's individually-earned ladder level.** §17's core clarification exists specifically to prevent this; it should be treated as a hard architectural rule during implementation review, not just a documented preference.
- **Level 5 automation reached by erosion rather than explicit policy decision** — a handful of Level 4 approvals going smoothly is not the same thing as a documented decision that an entire category is safe to auto-execute (§17). Watch for this distinction blurring in practice.
- **Moving partners off a shared password to individual accounts is a visible UX change** for external users who didn't ask for it — needs a deliberate communication/rollout plan, not a silent cutover.
- **Building finance tooling ahead of real pain wastes effort.** The explicit instruction to phase Finance and not replace QuickBooks prematurely should be treated as a hard constraint, not a suggestion.
- **Department consolidation can look like regression to daily users** if legacy routes are removed before muscle memory shifts — redirects and a transition period are required, not immediate deletion.
- **AI feature sprawl.** Ten departments' worth of AI ideas is a lot of surface area to build responsibly; the sequencing in §28 exists specifically to prevent shipping all of it at once and diluting quality and trust in any single capability.

## 34. Opportunities

- The existing `organizations` table, seeded with a real USAM row, plus `visibility_rules` (built but unused) and `branding_mode` (built but unused), mean the multi-organization future is **already partially built** — this is a much smaller lift than a from-scratch multi-tenant redesign, and §11's hierarchy model is a natural extension of infrastructure that already exists.
- `admin_users.prayer_permissions` is a proven, working precedent for the generalized permission-grant model — no new pattern needs to be invented, only extended.
- `partners_documents`' upload/storage/signed-URL pattern is directly reusable for Finance and Compliance documents with almost no new engineering.
- DOS's `dos_relationship_scores` pattern is a ready-made template for Partnership relationship health scoring (as a pattern, not a shared table).
- **`dos_group_join_requests` already exists in the schema** (§31) — the DOS notification ticket in §19 is very likely smaller than it first appears, since the data model for the primary worked example is already partway built.
- **The RAW → REVIEWED → APPROVED pipeline and each department's ad hoc `OperationsInboxPage` polling already anticipate the event and work-item model in §13–§16** — formalizing a shared event log and a shared work-item lifecycle is consolidating a pattern the team has independently reinvented several times already, not introducing an unfamiliar new concept.
- The AI-assisted content processing already live in DOS (`refine-story`, `summarize-encounter`, voice journaling) proves the team already has working infrastructure for the kind of AI features recommended in §28 — this is extension, not a new capability area.
- An organization-first, modular NCC is a genuine strategic differentiator: it positions USA Missionaries to eventually offer the NCC itself as a platform to other ministries and churches — not just a document-portal guest experience, but real, independently-configured workspaces running on shared infrastructure. Worth naming explicitly as a long-horizon option, not a current plan.
- **A working Integrated Ministry relationship (MOR or otherwise) is a compelling, concrete story for recruiting further affiliates** — "we can run your accounting, compliance, and technology while you stay fully your own ministry" is a meaningfully different, more valuable pitch than "we'll host your documents," and §11 is what makes that pitch actually deliverable rather than aspirational.
- The Knowledge Base AI assistant is a fast, low-risk proof point that can build organizational trust in AI before it's extended into Finance, Partnerships, or Prayer — a deliberate, sequenced way to earn the credibility the later, higher-stakes AI features will need.
- **Because the automation foundation is technology-neutral (§15), none of the above AI opportunities are dependencies for the rest of the platform.** USA Missionaries can capture the organizational and modular benefits of this architecture on a notifications-and-rules basis alone, and treat every AI capability in §28 as pure upside layered on top whenever it's ready — not as something the roadmap is gated behind.

## 35. Suggested Implementation Phases

These are the whole-platform build phases (0–6) — distinct from the narrower Automation Maturity Phases (0–4) defined in §29, which describe how the event/automation system specifically matures across build Phases 0 through roughly 3 below. Don't conflate the two numbering tracks.

| Phase | Focus | Primary deliverable |
|---|---|---|
| 0 | Data foundation | org_id backfill, permission-grant table, `organization_modules` table, `parent_organization_id` + `cross_organization_service_grants`, `platform_events` log with event-naming conventions and the Fruit-approval elevation rule, `work_items` table, generic documents table, generated DB types. DOS notification ticket (§19) ships in parallel, independently. |
| 1 | Auth unification | Three-layer (soon four-layer) RBAC live; partners on real accounts; RLS org-scoped |
| 2 | Department shell | Generalized tabbed department pattern; Finance + Partnerships migrated first; Organizational Inbox (§16) stood up once both have real work items |
| 3 | Consolidation | Duplicate routes merged; Legacy Missionary Workspace's CRUD half retired |
| 4 | People unification | HR/Volunteers/Missionaries/Applicants under one department |
| 5 | Departmental depth + first AI | Finance Phases 2–3; Partnerships Phases 2–4; Development stood up; Knowledge Base AI, then Voice AI and Communications AI ship, both event-triggered, all at Automation Ladder Level 3 |
| 6 | Network scale | First real partner tenant and first Integrated Ministry onboarded; module toggle UI and shared-services grant UI built; cross-org reporting including donation attribution (§14); Executive and Ministry Operations AI mature; Prayer AI ships last; Level 5 automation evaluated only where policy has explicitly approved it |

---

## 36. The End State

Ten years from now, logging into the NCC doesn't feel like opening an admin panel. It feels like opening the operating system the mission runs on — the same way opening a laptop doesn't feel like "using the admin panel for my life," it just feels like getting to work.

The Executive Director opens the NCC on a Monday morning and lands in an executive workspace: a briefing already drafted by AI overnight — fired the moment last week's events settled — waiting to be read, edited where it's wrong, and trusted where it's right. Nothing was auto-published. Everything is a head start.

An accountant on the finance team logs in and sees Finance — the monthly close checklist, three transactions AI has already suggested categories for, a board report half-drafted for the upcoming meeting, a donation to a Ministry of Reconciliation giving page already sitting in MOR's books, not USAM's, because the event carried the right organization from the moment it landed. She doesn't see Partnerships, or Prayer, or the Knowledge Base, because her job doesn't need them and the nav doesn't pretend otherwise. Later that morning, she opens the organization switcher and moves into a different workspace entirely — the Ministry of Reconciliation's Finance department, where she closes their books the same way she closes USAM's, because that's the service relationship her role exists to provide. MOR's own executive director, logging in from a different building, sees an entire workspace of their own — their own People, their own Executive rollup, their own board documents — with no visible seam showing that some of it runs on USAM's staff time. They are fully themselves, running on shared infrastructure.

A communications director logs in and finds a newsletter draft waiting, built the moment last week's approved fruit stories and a partnership milestone crossed into her department's event stream — written by AI, in the organization's voice, ready for her judgment before it goes anywhere near a subscriber's inbox.

A regional director logs in and sees their region: the missionaries they coach, a fruit-approval queue that isn't backing up anymore, a coaching summary AI drafted from the week's activity that gives them something better to say in Thursday's call than "how's it going." None of it required them to go looking — the events that mattered found their way to the right inbox on their own.

Meanwhile, in a completely different app, Dirk opens DOS and sees a notification: someone has requested to join his Tuesday-night group. He taps it, reads a short note the person left, and approves them in ten seconds. He never touches the NCC to do this, and never needs to — his group is his to run, the same as it's always been, except now he actually finds out when someone wants in.

A partner organization's staff member logs in — with their own real account, not a password every partner shares — and sees exactly one thing: their own partnership workspace. Their documents, their meeting history, their open tasks. They have no idea USA Missionaries' finance module even exists, because it isn't theirs to see, and nobody had to write a special case to make that true — it's just what the module and permission system already does for every organization on the platform.

A small partner church's pastor logs in for the first time and sees four things: People, Prayer, Communications, and a thin Executive view that's mostly empty because the church is small and new to the platform. It doesn't feel like a stripped-down version of someone else's enterprise tool. It feels like software built for a church that size, because functionally, it was — the same codebase simply showed up smaller.

Everyone is using the same operating system. Nobody is using the same interface. The difference isn't a theme or a role dropdown — it's the honest, structural result of an organization's modules, its place in a hierarchy of relationships from arms-length to fully integrated, an individual's permissions, an event model that quietly routes each day's work to the right hands at the right altitude, and an AI layer that knows what to draft before being asked — never more trusted than the specific thing it's doing has earned. That is what it means for the National Command Center to be the headquarters of a movement, not the admin panel underneath one: it disappears into being simply where the work happens, for whoever's job it is that day, whichever ministry they belong to, at whichever altitude that work actually lives.

---

*This document should be revisited at the end of each phase — treat it as a living architecture, not a one-time spec.*
