# Community UX Map & Screen Inventory

USA-57 deliverable #2. Reflects the current, audited implementation (see `docs/community-product-reset-audit.md`) plus the template expansion landed in this pass. This is an inventory of what exists today, mapped to the product model in the issue — not a set of new mockups, per the "refine in place" recommendation.

## Product model as implemented

| Community template | `template_key` | `template_category` | Status |
|---|---|---|---|
| Discipleship Group (Men's / Women's) | `mens_discipleship`, `womens_discipleship` | `discipleship` | Existing |
| Kitchen Table | `kitchen_table` | `discipleship` | Added this pass |
| House Church | `house_church` | `discipleship` | Added this pass |
| Fitness / 2three2 Community | `2three2_{activity}_{audience}` (15 combinations) | `activity` | Existing |
| Prayer Community | `prayer_community` | `discipleship` (`type = prayer`) | Added this pass |
| Ministry Team | `ministry_team` | `discipleship` | Added this pass |
| Cohort | `cohort` | `discipleship` | Added this pass |
| Custom Community | `custom_community` | `discipleship` | Added this pass |

All templates share one engine: `dos_groups` + `dos_group_members` + `dos_group_gatherings` + `dos_group_attendance` + `dos_group_resources` + `prayer_requests` (via `source = 'dos_group'`). No per-template schema fork.

## Screen inventory

### 1. Community directory (in-workspace)

- **Component**: `GroupsWorkspaceV2` (`app/dos/app/DosMvpAppClient.tsx:7264`), legacy equivalent `GroupsWorkspace` for non-beta workspaces.
- **State**: `mine` vs. all-groups segmented tabs, search, per-card pending-request badge.
- **Card content**: name, template pill, audience pill, tagline/description, rhythm, next-gathering time, member count, leader count.
- **Actions**: New Group (primary), Directory Link (secondary), per-card Copy Link / Public Page / pending-requests shortcut.
- **Scoping**: workspace-scoped already (per-leader, not a global USAM list) — matches the issue's directory requirement out of the box.
- **Gap vs. issue**: no explicit "I lead / co-lead / participate in" grouping beyond the "Mine" tab filter (which is active-membership, not role-differentiated). Worth a future pass once terminology rename is approved.

### 2. Community home (in-workspace detail overview)

- **Component**: `GroupDetailWorkspaceV2` header + `GroupOverviewTabV2` (`app/dos/app/DosMvpAppClient.tsx:7384`, `:7512`).
- **Header**: logo mark, template/audience pills, name, description, rhythm/members/next-gathering/leader-count facts, one primary action (Start/Log Meeting), Add Person, and a "More" sheet (Edit Group, Schedule, Copy Link, Public Page, Archive).
- **Overview body**: one status grid (Next Gathering, Members, Pending Requests, Active Prayer, Completed Gatherings, Leaders) + one Recent Activity panel.
- **Gap vs. issue**: "Pending join requests and leader actions" surface as a status count today, not an inline action list — the actual review flow lives in the People tab. Acceptable given AGENTS.md's "reduce nested cards" guidance, but worth confirming with the founder whether pending requests should be actionable from Overview directly.

### 3. People (in-workspace)

- **Component**: `GroupPeopleTabV2` (`app/dos/app/DosMvpAppClient.tsx:~7619`), legacy `GroupMembersTab` (`:9080`).
- **Content**: active member rows with role, plus inline pending join-request review (accept/decline) reusing `loadDosGroupRoleAccess` for authorization.
- **Privacy**: only group-scoped `missionary_field_people` rows are exposed; no My Record, private notes, household, or unrelated-workspace data — confirmed by the identity-link authorization model in `docs/dos-identity-shared-leadership.md`.

### 4. Gatherings (in-workspace)

- **Component**: `GroupGatheringsTab` (`app/dos/app/DosMvpAppClient.tsx:10200`), `GroupGatheringRow`.
- **Content**: scheduled/past gatherings list; "Start/Log Meeting" from the detail header creates or logs against a gathering; `GroupEndGatheringWizard` (`:8254`) is a 5-step wizard (attendance → prayer → fruit → follow-up → complete) for legacy, reused conceptually by V2's meeting action.
- **Attendance**: separate tab/table (`dos_group_attendance`), intentionally distinct from member-submitted RSVP.

### 5. Public Community page

- **Component**: `PublicGroupPageTemplate.tsx`, served from `app/groups/[slug]/page.tsx`.
- **Sections**: header (site name, "All Groups" link) → hero (name, tagline, when/where/leaders/scripture facts, Request to Join + Member Sign In) → next-gathering card → "What to Expect" → join form → footer.
- **Guardrails already enforced**: no attendance/settings/member-identity/internal-role exposure; exact location gated by `member_visible_location_mode`; closed groups (`accepting_members = false`) hide the join form.

### 6. Member portal

- **Component**: `GroupHomeMemberView.tsx`, reached via `/groups/[slug]/member` token claim then `/groups/[slug]` with a valid session cookie.
- **Hierarchy** (matches the issue's spec exactly): compact identity header → Next Gathering + RSVP → Latest Update (+ earlier updates disclosure) → Prayer (recent requests + submit) → Resources → Keep Me Updated (per-notification-type email toggles) → Sign Out.
- **Session model**: hashed, expiring, single-use access tokens; hashed, revocable sessions; httpOnly `/groups`-scoped cookie; every request rechecks membership/group/session state.

### 7. Mobile

- All screens above are built mobile-first (stacked single-column grids, `min-h-11`/`min-h-9` tap targets, `SegmentedTabs`/`GroupDetailTabBar` as horizontal pill rows, sheets/drawers instead of new routes for Create/Invite/Settings). No dedicated mobile screenshots were captured in this pass — see "Not done" below.

## Navigation map

```
/dos/[workspace] (authenticated)
  Groups tab
    -> GroupsWorkspaceV2 (directory)
       -> GroupDetailWorkspaceV2 (Community home)
          -> Overview | People | Gatherings | Settings tabs
          -> More sheet: Edit / Schedule / Copy Link / Public Page / Archive

/groups (public directory, org/site-scoped)
  -> /groups/[slug] (public Community page)
     -> Request to Join -> dos_group_join_requests -> leader review in People tab
     -> Member Sign In -> /groups/[slug]/member -> token claim -> session cookie
        -> /groups/[slug] renders GroupHomeMemberView instead of the public template
```

## Explicitly not produced in this pass

- Live preview URL / screenshots across desktop and mobile — this worktree has no linked Supabase project or running deployment target available to this session, and screenshot capture was not attempted without one. Recommend running `npm run dev` against a seeded/staging Supabase project and capturing the six required screens once the terminology-rename decision (audit Finding 4 / recommendation #3) is made, so screenshots reflect final copy rather than being retaken twice.
- Founder review package — depends on the screenshots above plus a decision on recommendation #2 (flag rollout) and #3 (terminology rename).
