# USA-244 — Investigation: Add/Edit Person data path and the Samuel / Skylar Gaffney case (read-only)

Read-only, 2026-09-08, against `main` `89269c1` and production (read-only SQL; aggregates and the two named records Ryan asked about; no phone/email values reproduced). Nothing was mutated.

## 1. How Add/Edit Person maps to storage today
| UI (PersonFormContent) | Payload | Column (`missionary_field_people`) | Notes |
| --- | --- | --- | --- |
| First / Last name (required first), Mobile phone (required), Email | `name`, `phone`, `email` | `name`, `phone`, `email` | duplicate check on blur (name/phone/email) |
| "Your relationship with them" — 4 buttons: New / Walking With / Discipling / Mentor | `relationship_type_value` → `relationshipModelFromRelationshipType` | `relationship_type` + `role_in_my_life` (`not_active` / `walking_with_them` / `discipling_them` / `mentoring_me`) + `discipleship_stage` | direction is implicit ("Mentor" = they mentor me) |
| "How do you know them?" — 9 buttons | `relationship_context` | `relationship_context` (family, friend, work, church, community, outreach, neighbor, ministry_partner, other) | context only |
| **"Person role"** — 3 buttons: Primary Contact / Household Member / Hidden (default **Primary Contact**) | `field_visibility` | `field_visibility` = `primary` / `secondary` / `hidden` | **this is list visibility**, not a household role and not the relationship |
| Engagement Level (disclosure, advanced) | `engagement_level` | `engagement_level` | -3…+3 |
| Household & Family (disclosure): Spouse first/last, Anniversary, Child rows | `spouse_name`, `children_names`, `anniversary_date` (+ `household_notes`) | text columns on the **anchor** person | no link table exists |
| Address / City / State / ZIP / Church / Occupation / Birthday (disclosure) | … | … | |
| Notes (disclosure) | `notes` | `notes` | |
| Delete this person (edit only) | — | — | separate, confirmed |

There is **no household entity and no person-to-person link**: `household_id` on a person is the *workspace* (missionary household), and family is modelled only by the anchor's `spouse_name` / `children_names` text. After every create (POST) and edit (PATCH) the API runs `syncHouseholdMembersAsPeople`, which, for each spouse/child name that has no matching person (name key) in the workspace, **creates a new person row** with `field_visibility = "secondary"`, `relationship_context = "family"`, `relationship_type = "new"`, `spouse_name = <anchor>` (spouse only) and a household note "Spouse in X's household." An existing name match is updated only where its fields are empty (visibility set to `secondary` only if blank; `spouse_name` set only if blank). The anchor's own visibility is never changed by the sync; the secondary member gets **no visibility choice of its own** — the form's single "Person role" applies to the anchor only.

Consumers of `field_visibility`: the People list shows `primary` by default and `secondary` behind "Show household & secondary"; `hidden` never lists. Meeting attendee search (`filteredPeople`) and the Ministry Team picker search **all** people regardless of visibility, so a `secondary` spouse is already selectable as an attendee. Reports/dashboards do not filter on it. No "primary household contact" concept exists anywhere in code or schema.

## 2. Samuel and Skylar Gaffney (Ryan's workspace) — what the records say
| Record | `field_visibility` | relationship | `spouse_name` | created | source | phone / email | meetings |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Samuel Gaffney | `primary` | New · Other · Exploring, `not_active`, engagement +3 | **null** | 2026-08-21 | field (form) | phone yes / email no | 1 |
| Skylar Gaffney | `primary` | New · Other · Exploring, `not_active`, engagement 0 | **null** | 2026-09-07 | field (form) | none | 0 |
| Patty Gaffney | `hidden` | prayer-only contact (created from a prayer partner record) | null | 2026-06-30 | field | email only | 0 |

**Root cause: defaulting plus UI interpretation, not link direction and not a wrong stored value.** Skylar was added as a standalone person through Add Person (source `field`, no household note, no `spouse_name`, not created by the household sync), and the form's "Person role" defaulted to **Primary Contact**, so she was saved and displayed as "primary" exactly like Samuel. The word "Primary" on that control means *list visibility* ("appears in everyday People"), but it reads as "the primary spouse / household contact", which is the confusion Ryan saw. There is also **no household link at all** between Samuel and Skylar — neither row names the other as spouse — so DOS has no way to show them as one household; that is the only data gap, and it is a missing link rather than a wrong one. Nothing demoted Samuel; both are `primary`.

## 3. How many production households are affected (workspace-wide, aggregates)
| Measure | Count |
| --- | --- |
| Active people by visibility | 77 primary · 22 secondary · 15 hidden (all `source = field`) |
| People naming a spouse | 34 (26 primary, 7 secondary, 1 hidden) |
| Spouse pairs where both rows exist | primary ↔ secondary 7 · primary ↔ primary 2 · hidden ↔ secondary 1 · primary ↔ hidden 1 (+ the reverse views) |
| Secondary spouse rows created *after* their primary partner (the "created first is Primary" pattern from the sync) | 5 |
| People naming a spouse who has **no person row** (text-only spouse) | 18 (17 primary, 1 secondary) |
| People naming children | 16 (13 primary, 2 secondary, 1 hidden) |
| Meetings attended by a `secondary` person | 1 |

So: the Gaffney case is the *unlinked* variant (both primary, no link). The *linked* variant — a spouse auto-created as "Household Member" with no choice — affects 7 couples; 18 more people carry a spouse as text only. No record is wrong in the sense of a mis-set field; the model simply cannot express "two active spouses in one household" today.

## 4. Verdict on each hypothesis
- Stored data: **not incorrect**; one missing link (Samuel ↔ Skylar) that the UI never asked for.
- Link direction: **n/a** — no link exists in either direction.
- Defaulting: **yes** — "Person role" defaults to Primary Contact for every new person; secondary members get `secondary` with no choice.
- UI interpretation: **yes** — "Primary Contact" / "Household Member" / "Hidden" name list visibility with words that read as household roles.

## 5. Bounded correction for the two records (proposal; needs Ryan's approval — not executed)
No migration. Either of:
1. **In-app (recommended, no data script):** edit Samuel → Household & Family → Spouse "Skylar Gaffney" → Save. The sync matches the existing Skylar row by name, sets her `spouse_name` to Samuel and leaves her `primary`; Samuel's `spouse_name` becomes Skylar. Both stay Active people. After this PR ships, the same edit will show Skylar as a linked existing person rather than a text field.
2. **SQL (two-row update, reversible):** set `spouse_name` on both rows to each other; recorded with the previous values (`null`) for rollback.
Other households are not changed by this issue; the 7 auto-created "Household Member" spouses keep their `secondary` visibility until their leader chooses otherwise in the new per-person visibility control.

## 6. What the implementation must therefore do (no schema change)
- Separate the three meanings in the UI: **relationship stage** (plain-language dropdown mapping to the existing `relationship_type` / `role_in_my_life`), **how you know them** (compact dropdown, existing `relationship_context`), **list visibility** (compact dropdown, existing `field_visibility` values with plain labels: Active person / Household only / Private).
- Add Person default path: first name, last name, mobile phone, email, how you know them, relationship stage, Add person; everything else behind "Add more details".
- Household & Family: each spouse/child row carries its own visibility (spouse asked explicitly, default Active; child default Household only); the API payload gains an additive `household_members` array so `syncHouseholdMembersAsPeople` can honour a per-member visibility instead of always writing `secondary`; the anchor's visibility is never touched by a member's choice; typing a name that matches an existing person offers to link it instead of creating a duplicate (the sync already matches by name).
- Edit Person: compact sections, one open at a time on mobile; Delete stays separate at the bottom.
- No "Primary household contact" control: nothing in the architecture needs one today (no consumer reads such a field), so none is added.
