# DOS UI and behavior specification (canonical)

**Status:** v1.0 — published 2026-09-04 for Phase 3 (USA-196 / USA-207). Consolidates already-approved direction (Linear project description, V10 reference on USA-219) with verified production behavior (Phases 0–2). It introduces no new product decisions; everything not already approved is listed in §9 as unresolved.
**Scope:** the authenticated DOS application (`/dos/[slug]`, rendered by `app/dos/app/DosMvpAppClient.tsx`) on mobile and desktop. Portal, setup, onboarding, public token forms, the public group portal, `/admin`, and the marketing sites receive tokens only where they already share components.
**Governing principle:** simple at the surface, powerful underneath.

## 0. Precedence and sources

For anything under `app/dos/**`, `app/api/dos/**`, `src/components/dos/**`, `components/dos/**`, `src/lib/dos/**`:

1. The Linear project description and the issue being worked (product authority).
2. **This specification** (design and behavior authority). Where it and V10 differ, this document wins because it has been reconciled with production; the difference is recorded in §9 or §10.
3. The V10 reference (USA-219) for any visual detail this document does not state, for the screens V10 covers, with V10's own labels: "Approved direction" is direction; "Interaction demonstration" is illustrative; "Product logic — later" is unresolved.
4. `app/dos/README.md` (architecture and data boundaries).
5. `AGENTS.md` — website and admin rules; its DOS-specific statements listed in Phase 1 §3 are superseded by this document for the paths above (pending D1 confirmation of the wording).
6. `docs/dos-ui-refresh/phase-{0,1,2}/` — evidence, not rules.

Superseded documents are listed in §10 and are archived (moved, never deleted) in Phase 7.

## 1. Product behavior rules (must hold on every screen)

| # | Rule | Where it is enforced today |
| --- | --- | --- |
| B1 | **Home (mobile) and Dashboard (desktop) are unchanged** in layout, content, and order for the life of this project. Only shared tokens may touch them, and only when a re-screenshot shows no visible change beyond color/typography values. | `CircleFocusHero`, `DesktopHomeDashboard` |
| B2 | **Bottom navigation is three tabs — Home, Meetings, More** — with the production inline icons (`Icon` names `home`, `meetings`, `apps`). Field is never a tab; it stays reachable from More and from Home's circle target. The label "More" stays until D2 is decided. | `mobileTabs` (line 425), `MobileTabBar` |
| B3 | **Person is the canonical relationship record** (`missionary_field_people`). No screen introduces a second person-like entity. | README |
| B4 | **Circle placement is human-confirmed.** Recommendations are deterministic and visible with their reason; nothing places or moves a person except an explicit tap that names the person and the circle. `POST /api/dos/circles/recalculate` refreshes metrics only. | `circle-placement.ts` line 19, `/api/dos/circles/override` |
| B5 | **Circle, Engagement, Spiritual Journey/Relationship, and Fruit are separate dimensions** and are never merged into one label or pill. Relationship truth is the three structured columns, not the display string. Engagement is an Advanced Feature: visibility only, off by default. | USA-168, `advanced-features.ts` |
| B6 | **Fruit is core DOS intelligence.** Fruit comes from meetings and reviews; no section-level "+ Add" on Fruit. Reviews never create Fruit automatically. | README "Reviews And Fruit Verification" |
| B7 | **Editable surfaces never lose entered work.** A surface declares `kind="editable"` or is a task screen; its backdrop and swipe are inert; every deliberate exit is routed through `useUnsavedWorkGuard`; the discard dialog appears only when the form is dirty (real entered work, not any keystroke); Keep editing is the safe default. Inspection surfaces close on backdrop. | `src/lib/dos/unsaved-work.ts`, `Sheet`, `DosWorkflowPage` |
| B8 | **No workflow, field, validation, history, or permission is removed** to make a screen simpler. A refresh may re-group, re-label (within §9 limits), or move controls into a disclosure; it may not drop them. | protected checklist (Phase 0 §4) |
| B9 | **Timezone and historical-meeting behavior are unchanged**: display in `dosDisplayTimeZone`; calendar-date-only values in UTC; historical meetings keep labels for options no longer offered. | client lines 513, 529, 1638–1652 |
| B10 | **Data contracts are frozen**: no PR in this project changes an `app/api/dos/**` request or response shape, the ids a request carries, a migration, RLS, auth, or flag semantics. | Phase 0 protocol §2 |
| B11 | **Product copy is preserved** except where V10 + this spec approve a label (listed in §6). Not renamed: "More", "Workspace", "Feedback" (pending "Follow-up" decision), "In person" default. | Phase 1 D2/D5, Phase 2 |
| B12 | **Desktop keeps its current layout structure** (sidebar, panels, tables). Desktop receives tokens and components by rule; no desktop screen is redesigned, because V10 draws none. | Phase 2 finding 1 |
| B13 | **Home's protection includes its gradient background and card grammar.** Elsewhere the page ground is white/`surface-2`. | Phase 2 I16 |
| B14 | **Shared components with the public participant portal** (`GuidedJourneyUi`, `VoiceTextarea`) change only with the parity script green. | `dos-participant-preview-parity` |

## 2. Design tokens

Values are reconciled: V10 supplies the value where it defines one; USA-168 token names are kept; production-only values are retired. Tokens live in `tailwind.config.js` (`theme.extend.colors.dos`, plus new `borderRadius`, `boxShadow`, `fontSize` entries) and `src/lib/dos/text-tokens.ts` (constants for inline/non-Tailwind use). Never in `app/globals.css`.

### 2.1 Color

| Token | Value | Use | Replaces (production) | Contrast on white |
| --- | --- | --- | --- | --- |
| `dos.ink` (alias `dos.primary`) | `#0B1220` | titles, names, committed statements, active labels | `#0F172A` ×459, `#0F1520` | 17.9:1 |
| `dos.body` | `#3D4654` | body copy, excerpts | `#475569` ×103 | 9.6:1 |
| `dos.secondary` (alias `dos.ink2`) | `#5A6473` | dates, counts, metadata, helper text, lede — **the floor for readable text** | `#64748B` ×431, **`#94A3B8` ×133** | 5.8:1 |
| `dos.eyebrowSection` | `#2251E8` — section eyebrows on refreshed screens (V10: eyebrows are blue) | tracked-caps labels, `#6B7686` section eyebrows | 5.2:1 |
| `dos.eyebrow` | `#6B7686` — grey sub-eyebrows inside a section (Person "Right now") and every eyebrow not yet refreshed; the existing `text-dos-eyebrow` utility keeps this value so no screen changes until it is refreshed | — | 4.6:1 |
| `dos.disabled` | `#9AA3B2` | genuinely disabled UI only; never readable content | `#B4BBC5`, `#CBD5E1` | — |
| `dos.blue` | `#2251E8` | primary actions, active pills, progress, links | `#2563EB` ×328, `#1D4ED8` ×271, `#2450C8` | 5.2:1 (white on blue 4.9:1 at ≥15px/600) |
| `dos.blueText` | `#1E3FB8` | blue text on light tints where 4.5:1 is needed at small sizes | — | 7.0:1 |
| `dos.blue50` | `#F1F4FF` | selected-day fill, tinted buttons, icon tiles | `#EBF2FF` ×274, `#EAF2FF` ×223, `#DCEBFF` ×229, `#F8FBFF` | — |
| `dos.blue100` | `#E4EAFF` | chip/tile borders on tint, hover | `#BFDBFE` ×244 | — |
| `dos.line` (alias `dos.hairline`) | `#E5E8EF` | hairlines between rows, field borders, nav border | `#E2E8F0` ×115, `#E7E9ED`, `#EDEFF2` | — |
| `dos.surface2` | `#F7F8FB` | segmented-control track, working-region band, desktop page ground | `#F8FAFC` ×106, `#F1F5F9`, `#F6F9FE` | — |
| `dos.amber` / `dos.amberBg` | `#B45309` / `#FDF0D5` | overdue, due soon, testing | assorted ambers | 5.1:1 |
| `dos.green` / `dos.greenBg` | `#047857` / `#DCF5E9` | logged, on track, confirmed, answered | `#15803D`, `#BBF7D0`, `#F0FDF4`, `#ECFDF5` | 5.5:1 |
| `dos.red` / `dos.redBg` | `#B91C1C` / `#FDE8E8` | validation errors, Discard | assorted reds | 5.9:1 |
| `white` | `#FFFFFF` | nav, sheets, cards, page ground | `bg-white/62`, `bg-white/97` | — |

Home keeps its existing wash (`#EAF2FF` → white → peach) and the `#2563EB` values it uses today until a Home decision exists; token adoption on Home is limited to text colors that map 1:1 (`#0F172A` → ink) and must be verified by screenshot (B1).

### 2.2 Typography (Inter, system fallback; no new fonts)

| Token | Size / weight / line-height | Use | Replaces |
| --- | --- | --- | --- |
| `text-dos-display` | 30px / 700 / 1.1, letter-spacing −0.025em | page titles (Meetings, Field, My Record, Prayer, Apps) | `text-[32px]` |
| `text-dos-title` | 26px / 700 / 1.15 | resource titles | — |
| `text-dos-heading` | 20px / 700 / 1.2 | form titles, dialog titles | `text-[24px]` |
| `text-dos-question` | 17px / 600 / 1.35 | Purpose statements, step questions, big figures | — |
| `text-dos-body` | 15px / 400 / 1.5 | body, lede (`dos.secondary`), field text, row primary line (600) | `text-[15px]`, `text-[14.5px]`, `text-[14px]` |
| `text-dos-label` | 13.5px / 600 / 1.3 | field labels (sentence case), pill labels, chips, tab labels | `text-[13.5px]`, `text-[13px]`, tracked-caps labels |
| `text-dos-meta` | 12.5px / 500 / 1.35 | row secondary lines, hints (`dos.secondary`) | `text-[12.5px]`, `text-[12px]`, `text-[11px]` |
| `text-dos-eyebrow` | 11.5px / 600 / 1.2, tracking 0.08em, uppercase | section eyebrows only | `text-[10px]` ×200 tracked, `text-[11px]` |
| `text-dos-pill` | 12px / 600 / 1 | status/count pills (20px tall) | `text-[10px]`, `text-[9px]` ×56, `text-[8px]` ×12 |

**Rules.** Nothing below 12px carries readable content; 9px and 8px are retired except inside SVG. Hierarchy comes from size, weight, and position; color only separates kinds of text. Eyebrows are the only uppercase text. Field labels are sentence case.

### 2.3 Spacing, radius, elevation, size

| Token | Value |
| --- | --- |
| Page horizontal padding | 20px mobile (`px-5`), 32px desktop |
| Section gap | 22px above an eyebrow, 8px below |
| Row | 12px vertical padding, 12px gap, hairline top |
| Card | `dos.line` border, `r2`, 14px 16px padding, white |
| `rounded-dos-1` / `-2` / `-3` | 12px (fields, tiles, day selector) / 20px (cards, sheets) / 999px (buttons, pills, chips, nav) |
| `shadow-dos-float` | `0 1px 2px rgba(16,24,40,.05), 0 12px 32px -14px rgba(16,24,40,.22)` — nav, sheets, FAB only |
| Control heights | button 48; compact paired field 44; chip / pill-rail pill 36; status pill 20; nav 70; icon tile 30 (Apps) / 38 (timeline) |
| Hit area | ≥ 44px for every tappable control |
| Nav clearance constant | **134px** = nav 70 + gap 14 + safe-area 34 + 16 breathing, applied as `padding-bottom: calc(env(safe-area-inset-bottom) + 100px)` on every scrollable screen that shows the nav |

## 3. Component standards (Phase 4 builds these under `src/components/dos/`)

| Component | Spec | Source of truth today |
| --- | --- | --- |
| **PageHeader** | Back (when pushed) · title `text-dos-display` · optional trailing control (Settings, Edit, View). Replaces the "← More" pill on My Record, Prayer, Library (V10 "standard header"). Home keeps its hero. | `TabHero`, `TabPageHeader`, `MoreBackButton` |
| **Eyebrow** | `text-dos-eyebrow` in `dos.blue`, optional right-aligned count or action; grey variant for sub-groups. Never a bordered card. | ad-hoc |
| **Button** | 48px, `r3`, 15/600. Variants: `primary` (blue fill, white text), `tinted` (blue-50 fill, blue text; also the "tinted until valid" sticky state), `secondary` (white, hairline), `text` (blue text), `danger-text` (red text, never filled). Renames `AppButton` tones (`black` → `primary`). | `AppButton`, `CompactButton` |
| **PillRail** | Scrollable pill tab rail: 36px pills, 15px padding, 6px gap, 13.5/600 ink on white with hairline; active = blue fill, white text; native horizontal scroll, no arrows, right-edge fade, selected pill scrolls into view, offset retained on return; 44px hit area; `role=tablist`. Used by My Record, Field circles, Prayer tabs, Person tabs, Meetings Calendar/Timeline. | `MyRecordTabBar`, `PeopleCircleTabs`, `SegmentedTabs` |
| **Segmented** | For 2–3 exclusive views inside content (month/week): `surface-2` track, 4px padding, `r3`. | `SegmentedTabs` |
| **Chip** | 36px, `r3`, hairline, 13.5/600; selected = blue-50 fill + blue border; removable variant with ✕; truncates at ~190px with count in the helper. | duration pills, attendee search |
| **Field** | 48px (44 paired), `r1`, hairline, 15px text; label above (`text-dos-label`, ink-2), optional "optional" hint right-aligned, helper line below (`text-dos-meta`); required = red asterisk after the label; error = red border + 2px `redBg` ring + helper replaced by a red instruction. Focus = 2px blue ring. | `DosFormField`, `FieldLabel` |
| **Select** | Field with trailing chevron; native `<select>` on mobile. | `FormOptionSelect`, `CompactOptionSelect` |
| **DateInput / TimeInput** | Compact field pair (44px) using native inputs; display "Today, Sep 4". | `DosDateInput` |
| **Stepper** | − value + ; fixed steps (15 min for durations, 5 min for Time with God); no ceiling; confirm past a threshold (threshold is unresolved, §9). | new (replaces duration pills) |
| **ToggleRow** | Label + one-line consequence + switch; used for booleans with a consequence (Household, We prayed together). | ad-hoc |
| **HelperLine** | One `text-dos-meta` sentence under the control it explains. Replaces info boxes. | ad-hoc |
| **StickyPrimary** | Bottom-fixed primary button above the keyboard, white gradient fade, never disabled: when invalid it is `tinted`, reads "Fix N things to …", and scrolls to the first error; while saving it shows a spinner and a progressive verb ("Adding…"). Shown only on task screens (nav hidden). | form footers |
| **Sheet (inspection)** | Full-screen or bottom-anchored white surface, `r2` top corners, `shadow-float`, scrim `rgba(16,24,40,.32)` **without backdrop blur**; closes on backdrop, ✕, Escape, swipe. | `Sheet`, `ProfileSheetFrame` |
| **Sheet (editable)** | Same surface; backdrop and swipe inert; exits via `useUnsavedWorkGuard`. | `Sheet kind="editable"` |
| **BottomSheet** | Short content sheets (day sheet, placement, contextual add): drag handle, title + subtitle rule line, ✕. | `MobileBottomSheet` |
| **Dialog** | 20px-radius centered card: title 20/700, one sentence, primary (Keep editing) + `danger-text` (Discard); dismisses on scrim. | `DiscardChangesDialog` |
| **TaskScreen** | Full-screen form page: back arrow + grey Cancel, 20px title + one lede line, sections, StickyPrimary; hides the nav; desktop offset by the sidebar. | `DosWorkflowPage` |
| **Row** | 12px padding, hairline top, optional 38px icon tile or initials avatar, primary line 15/600 ink, secondary line 12.5 ink-2, trailing pill and/or chevron; the whole row is the tap target. | 11 row families |
| **Card** | Only where content is a self-contained object (Last/Upcoming meeting, Apps tile, dashboard panels). Never nested. | `DetailCard`, `DesktopPanel` |
| **StatusPill** | 20px, `r3`, 12/600: grey (neutral/logged), blue (scheduled), amber (overdue, due soon, testing, pending), green (on track, confirmed, answered), red (error). Never colored text for status. Not a control. | ad-hoc |
| **EmptyState** | One sentence in ink-2 + at most one action; no illustration. | 3 components |
| **FAB** | Extended pill with verb + icon, blue, `shadow-float`, `z 10`, bottom = safe-area + nav + 14; hidden on task screens; contextual per tab (Log meeting / Schedule / Add person / Add request / Add entry); on tabs with several add types a BottomSheet menu. | `MobileFloatingActions` |
| **Icons** | Navigation: the production inline `Icon` set, untouched. Elsewhere: 24px viewBox, 1.8 stroke, `currentColor`; one system (choose in USA-213 between extending `Icon` or lucide — nav excluded either way). | `Icon`, lucide |
| **Avatar** | Initials on blue-50, ink text; amber ring for overdue rhythm (Field). | ad-hoc |
| **Skeleton / Loader** | `DosTargetLoader` for route loading; inline `isSubmitting` verbs elsewhere; no global spinner. | existing |
| **Error** | Inline red instruction next to the control or a red `HelperLine` under the form's primary; never a toast or `alert()`. | existing |

## 4. Navigation and layout rules

1. Mobile nav: `position: absolute/fixed; bottom: 14px + safe-area`, 70px tall, `#FFFFFF` (opacity 1, **no backdrop filter**), `r3`, hairline, `shadow-float`, `z-index: 30`. Three tabs, production icons, selected state = blue-50 pill + blue label, unselected = ink-2 (never `#94A3B8`).
2. Every scrollable screen that shows the nav reserves the 134px clearance at its end; the scroll container is the only vertical scroller (`overflow-x: hidden` on the app root, `overflow-y: auto` on the container, never `overflow: hidden` on content).
3. Z-index ladder (documented, exhaustive; Tailwind `z-dos-*`): content 0 · sticky in-content 10 · in-content detail overlays (Person/Meeting/Circles) 20 · FAB 25 · nav 30 · in-content popovers 40 · bottom sheets 80 · task screens 120 · full sheets 1000 · dialog 1100. Detail overlays sit beneath the nav on purpose: the nav stays visible on a Person or Meeting record, as it does today; the FAB sits above those overlays but beneath the nav (V10: "z 10 vs 30").
4. Forms and focused task screens hide the nav and use one StickyPrimary; resource overviews keep the nav; an opened step (reading plan, book study) is a task screen. **Never both a sticky action bar and the nav.**
5. Safe areas: bottom on nav, FAB, sheets, sticky primaries; top on full-screen overlays and popovers; left/right on popovers.
6. Desktop (`md:` ≥ 768px): sidebar 232px (`xl:` 260px), page ground `surface-2`, content max-width per screen as today; task screens offset by the sidebar; no bottom nav; FAB becomes the header/top-right action where one exists today.
7. Deep links (`?view= ?person= ?openGroup= ?tab= ?resource= ?walkthrough=usam`) and slug aliases keep working.

## 5. Approved screen patterns (implementation direction for Phases 5–6)

Each pattern names the route/component it changes and the behavior it must preserve. Anything marked *(unresolved: …)* keeps production behavior until §9 is answered.

### 5.1 Meetings — Calendar (USA-218) · `MeetingCalendarView`, `activeTab=meetings`
- PageHeader "Meetings" + PillRail **Calendar | Timeline** (new); search stays on Timeline only *(unresolved: whether search also stays on Calendar; production has it on the calendar screen)*.
- Needs logging: compact rows with inline **Log**; whole section (eyebrow included) removed when empty; then the month title moves up.
- Month grid: 52px cells, 15px numerals, 5px dots (logged grey, needs-logging amber, scheduled blue), prev/next; **nothing below the grid except the one-line colour key**. Recently Logged moves to Timeline. Month/week Segmented stays as today's "View" control *(unresolved: keep or drop week view; V10 draws month only — keep)*.
- Tap a day → BottomSheet with weekday/date, prev/next-day, ✕; rows use Row with status pill; needs-logging rows carry Log; "Schedule on <date>" button *(unresolved: empty-day sheet; date pre-fill — recommended yes)*.
- Extended FAB "Schedule". Google calendar sources, add-to-DOS, meeting detail overlay, options, notes unchanged.

### 5.2 Meetings — Timeline (USA-218) · new view in `MeetingCalendarView`
- Logged meetings only; reverse-chronological; month groups with count in the eyebrow ("September · 4 logged"); search; **no filters, no status pills**; scheduled/unlogged never appear.
- Row: 38px context icon tile, bold "when" line (`Wed, Sep 2 · 2:00 PM`), name, `context · duration · metadata` (prayed together, N notes, N fruit, resource assigned), chevron → meeting detail. Same spine language as Person Timeline. Group meetings included *(V10 shown yes; unresolved only if Ryan objects)*.

### 5.3 Log Meeting / Edit Meeting (USA-216) · `MeetingFormContent`, `DosWorkflowPage "Log Meeting"`
- TaskScreen: back, grey Cancel, "Log meeting", lede "Capture what mattered while it's fresh."
- Date: compact DateInput ("Today, Sep 4"). Who was there: Chips from the person picker, household spouse present but unselected, "+ Add". Duration: Stepper, 15-min steps, default = production's 30m *(unresolved: default)*. How did you connect: Select, default = production "In person" *(V10 shows Coffee; keep production)*. Prayer: ToggleRow "We prayed together" + ToggleRow "Add something to pray for" revealing a Field (errors if ticked and empty). Fruit observed (optional Select) *(unresolved: on form vs afterward — keep where production has it)*. What happened: VoiceTextarea. Conversation Flow, meeting context, next steps, review link options stay where they are today (B8).
- StickyPrimary "Log meeting" / "Save changes"; validation grammar per §3; future date → red instruction *(unresolved: block vs redirect to Schedule — production behavior kept)*; duration past 4h → confirm *(unresolved threshold — keep production behavior)*.
- Edit reuses the same screen with the meeting's values; id, review status, reminders preserved.

### 5.4 Schedule Meeting (USA-217) · `ScheduleMeetingForm`
- Same TaskScreen grammar. Date & time as a 44px pair; Who's coming Chips + helper "Invites go to people with an email on file."; Stepper; How will you connect; Where (optional); Reminder Select; Repeat ToggleRow *(unresolved: Repeat here vs Settings; reminder default — keep production values)*. StickyPrimary "Schedule". Google sync and invitation behavior unchanged.

### 5.5 Add Person / Edit Person (USA-217) · `PersonFormContent`
- TaskScreen "Add person" / "Edit person", lede "Just a name is enough to start."
- Name (required). Relationship: Select with production option values (labels per production). Circle: chip group **Not yet placed | My 3 | My 12 | My 70 | My 120**, default Not yet placed, helper "Leave unplaced to decide after your first meeting." *(unresolved: circle at creation vs only via Place — production already allows it; keep)*. Contact (optional): Phone / Email pair. Household: ToggleRow with consequence. How you met (optional). Advanced/Engagement fields remain hidden unless the Advanced Feature is on (B5). StickyPrimary "Add person" / "Save".
- Retire the stale `dos-field-contact-form` assertion in this PR and replace it with one matching this layout (S7).

### 5.6 Person Record — Overview (USA-222) · `PersonDetailOverlay`
- Header: back, Edit; centred avatar, name, `Relationship · My N · set by you`; PillRail Overview | Timeline | Details.
- Two cards: **Last meeting** (date · context · duration · one metadata line, chevron → logged meeting) and **Upcoming** (date · time · context · place, chevron → scheduled meeting; when empty shows a Schedule button inside the card — V10 recommended; *unresolved only if Ryan prefers hiding*). No "Last Time" section.
- Eyebrow **Right now**, then grey sub-eyebrows: Journey (Continue as the one filled action), Accountability (+ Add), Prayer ("N open · M answered", + Add), Fruit (no + Add), Follow-up (Quick review status, Testimony request) *(unresolved: "Follow-up" vs production "Feedback" label — keep "Feedback" until decided)*. Lists cap at 3 with "View all N". Every row opens its record.
- Timeline and Details tabs: tokens and Row only; structure unchanged.

### 5.7 Apps / More launcher (USA-223) · `AppsCatalogSection`, `activeMoreAppView=apps`
- PageHeader "More" (label per B2). Real scroll container with 134px clearance. Two-column tiles 104px tall, 12px padding, 30px icon circle, name 15/600 single line with ellipsis, one 12.5px description line truncated, 20px count/status pill capped at 100px. Group headings and production order unchanged. **The "+" FAB is kept** (production shortcut menu) until D12 is decided.

### 5.8 My Record (USA-220) · `MyRecordWorkspace`
- PageHeader "My Record" with 🔒 Private chip *(replaces the Share button visually; sharing scope and per-entry sharing unchanged)* and Settings; PillRail Overview | Walk | Growth | Purpose | Faithfulness (treatment A).
- **Overview = Current + Recent entries + one View all.** "Today at a glance", stats, Explore, and bottom arrows are removed. *(D10: the "Current" rule. Until answered, Current shows exactly the items production already treats as active — in-progress assessments and active self-assigned resources/journeys where the data exists — or is hidden when empty. No new aggregate is invented.)*
- Walk: headed groups Time with God (Log now, latest 3, "All N entries"), Scripture *(unresolved storage — show derived passages from recent entries as today's data allows, else omit)*, Prayer (Log prayer time), Reflections (Write). FAB "Time with God".
- Growth: Active (journey / assessment with Continue), Mentors (+ Add), Mentor meetings (next or Schedule, last two), Assessments, Books (+ Add). FAB opens a three-row BottomSheet (Mentor meeting, Assessment result, Book) *(list must match existing add flows)*.
- Purpose: identity block (Calling, Current season, Word of the year) as typographic statements with one Edit; Prophetic words timeline with testing/confirmed pills. FAB "Prophetic word".
- Faithfulness: one quiet sentence; year-grouped timeline of the existing kinds; **never a count, streak, or score**. FAB "Record God's faithfulness".
- Record detail: eyebrow "Kind · Section", title, date, Edit; labelled prose; Connected rows where links exist in data; Sharing row; Delete entry (existing confirm).
- Entry forms use §3 primitives; Time with God per V10 §7 (date + minutes pair, 5-min stepper, timer as helper row, voice inside textarea) *(unresolved: timer control and sheet vs task screen — keep the sheet presentation)*.

### 5.9 Library (Phase 6, USA-225) · `GuidedJourneyUi`, `LibraryResourceShell`
- Resource header: blue eyebrow "Type · length", 26px title, blue Featured pill, description 15px ink, grey fact pills; primary action after the description with one HelperLine ("Assign to someone" + consequence). No gold; no type colour outside the icon tile *(unresolved: type colour)*.
- Journey: eyebrow + count, progress bar, 12px step selector; step content under a grey eyebrow; question under a blue eyebrow. Overview keeps the nav; **an opened step is a TaskScreen** with sticky Complete (tinted until a response exists) and "Save and finish later" as text *(unresolved: complete-requires-response; push vs expand)*.
- Assessment: facts only from production copy; previous results as one line with "See results".
- Parity with the public participant portal must stay green (B14).

### 5.10 Prayer (Phase 6, USA-226) · `MobilePrayerWorkspace`, `AddPrayerRequestSheet`
- PageHeader "Prayer" + Settings; search; PillRail Prayers | Prayer team | Answered; one summary line (`N open · sorted by …` + "All ▾" filter); hairline Rows led by initials (neutral tile when no person); title, then `person · category · group`; follow-up as StatusPill (amber overdue/due within a week, grey otherwise). FAB "Add request". **No change to field meanings, links, sorting, or follow-up logic.**
- Add request: same TaskScreen grammar; fields and defaults exactly as production (Title, Request, Category, Priority, Visibility + helper, Group, Follow-up date, Who is this request for, Linked people as chips). No prayer-team toggle.

### 5.11 Field list and placement (Phase 6, USA-227)
- PageHeader "Field" (back, Settings); search; PillRail All | 3 | 12 | 70 | 120; A–Z rows: initials, name, `Relationship · My N · met N days ago`, chevron; whole row taps. **Rhythm pills are not implemented** (no per-person rhythm exists in data; §9). Household/secondary hidden with a Show row (production behavior preserved). Extended FAB "Add person".
- Needs placement summary + sheet: **D11** — until approved, production's Circle Suggestion / "DOS noticed something" sheets stay.

### 5.12 Everything else (Groups, Fruit, Settings, placeholders, USAM layer, blocked/loading screens)
Tokens and §3 components by rule; structure, copy, and workflows unchanged.

## 6. Approved copy changes

| Where | From | To | Authority |
| --- | --- | --- | --- |
| Library assign action | "Assign" + info box | "Assign to someone" + helper line | V10 §8 |
| My Record header | Share button | 🔒 Private chip (Share moves to the per-entry Sharing row that already exists) | V10 §6 |
| Prayer FAB | "+" | "Add request" | V10 §9 |
| Form primaries | "Log Meeting" / "Schedule Meeting" | "Log meeting" / "Schedule" | V10 §5 (sentence case) |
| Form validation | — | "Fix N things to …" | V10 §5 |
Everything else keeps production copy (B11).

## 7. Protected existing screens

Home (mobile), Dashboard (desktop), bottom navigation (structure, icons, label), meeting detail record, Person Timeline/Details, Groups, Fruit, Settings, placeholders, USAM layer, portal/setup/onboarding, public forms, public group portal. See Phase 0 `04-protected-workflow-checklist.md` for the per-surface behaviors.

## 8. Accessibility and responsive requirements

- Text contrast ≥ 4.5:1 for all readable text (tokens in §2.1 satisfy this); pills ≥ 4.5:1 for their 12px labels; disabled state is the only exception.
- Every tappable control ≥ 44px hit area; visible focus ring (2px blue, 2px offset) via `focus-visible`; tab order follows visual order; PillRail uses `role=tablist/tab` with `aria-selected`; sheets trap focus and restore it on close; dialogs are `role=dialog` with a labelled title.
- No horizontal page scroll at 320, 375, 390, 430, 768, 1024, 1440; tables scroll inside their own container.
- Safe areas per §4.5; keyboard-open: focused field scrolls above the sticky primary.
- `prefers-reduced-motion`: no tab-settle translation or sheet slide.
- Screenshots at 390×844 @2x and 1440×900 (plus 320 for the pill rail) are part of every PR.

## 9. Unresolved product decisions (do not guess; production behavior stands)

| Id | Decision | Affects |
| --- | --- | --- |
| D1 | `AGENTS.md` DOS statements superseded for `app/dos/**` (wording) | docs |
| D2 | "More" → "Apps" | `mobileTabs`, More header |
| D3 | Demo route exposure in production | `/dos/app/preview` |
| D4 | Delete legacy `app/api/dos/[collectiveSlug]/*` | Phase 7 |
| D5 | "Workspace" vs "Household" copy | sidebar, portal |
| D6 | Groups V2 promotion vs default path | USA-228 |
| D7 | Unmerged usa-163/164/138 UI branches | git |
| D8 | `app/dos/library-preview/` intent | USA-225 |
| D9 | Strict status checks | repo settings |
| D10 | My Record "Current" rule | USA-220 |
| D11 | Field Needs-placement bounded block | USA-227 |
| D12 | More-tab "+" FAB keep/remove | USA-223 |
| PL-1 | Rhythm satisfaction and due-soon windows; rhythm data model | USA-227 (pills not built) |
| PL-2 | Apps category membership | USA-223 (production order kept) |
| PL-3 | Log future-date rule; 4-hour confirm threshold; default duration; Fruit on the form; context default | USA-216 (production kept) |
| PL-4 | Schedule Repeat and reminder defaults | USA-217 |
| PL-5 | Circle at creation vs Place | USA-217 (production kept) |
| PL-6 | Empty-day sheet; Schedule date pre-fill; search on Calendar; week view | USA-218 |
| PL-7 | "Follow-up" vs "Feedback" label; Upcoming empty state | USA-222 |
| PL-8 | My Record Scripture storage, per-tab add actions, Purpose record shape, Faithfulness kinds and relation to Prayer's Answered, cross-links, per-entry sharing, timer control, sheet vs task screen | USA-220 |
| PL-9 | Resource-type colour; complete-requires-response; push vs expand | USA-225 |
| PL-10 | "Who is this for" vs "Linked people"; prayer-team sending; previous assessment results | USA-226 / USA-225 |

## 10. Deprecated patterns and documents

**Patterns retired by this spec (removed as they are touched; never by blind global replace):** very light gray readable text (`#94A3B8`, `#CBD5E1`); 8/9/10px readable text; tracked-caps field labels; status as coloured text or blue links; nested card-in-card; info boxes; translucent nav/footers/scrims with backdrop blur; gold eyebrows/pills; the "← More" back pill; three sheet frames; three tab treatments; `AppButton tone="black"`; ad-hoc hex values (use tokens); the sticky-bar-over-nav stack.

**Documents superseded (archived in Phase 7, not deleted):** `dos.html`; `src/components/dos/WorkspaceV2Shell.tsx`; the `AGENTS.md` DOS statements (D1); `docs/dos-groups-v2-polish-audit.md` (folded into §5.12 by rule); `docs/dos-groups-v2-shared-leadership-beta-validation.md`, `docs/dos-public-groups-member-portal-rollout.md`, `docs/release-notes/2026-07-09-…` (historical); `tooling/automation/docs/ci-baseline.md` (reconciled with `docs/ci-baseline.md`); `docs/usa-170-*.sql` (archive with "never run" header).

**README amendment applied with this spec:** `app/dos/README.md` now points here, describes the demo route as it is, and allows shared primitives under `src/components/dos/`.
