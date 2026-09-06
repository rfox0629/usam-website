# Phase 0 — Protected workflow checklist

Behavior that later visual changes must preserve, recorded from the code at `de6862f` and the demo-preview screenshots in `./screenshots/`. Each item is phrased so it can be checked in a preview. "Baseline evidence" names the screenshot or script that shows the current state.

## Project-wide protections (from the Linear project description, restated as checks)

- [ ] **Home is visually unchanged** during this project unless Ryan separately approves a redesign. Evidence: `mobile-390--01-home.png`, `desktop-1440--01-home.png`.
- [ ] **Mobile bottom navigation stays exactly three tabs**: Home, Meetings, More (`mobileTabs`, line 425). Field is not a tab; it is reached from More/Apps and from Home's circle target.
- [ ] **Production navigation icons are preserved**: the inline `Icon` cases `home`, `meetings`, `apps` (line 1423 ff.). V10's icons are stand-ins and must not be copied.
- [ ] **Third-tab label stays "More"** until Ryan approves "Apps" (V10 line 237 and the USA-219 catalog both leave the rename to Ryan). Also unchanged: `DesktopPanel eyebrow="More"`, the "More" back pill on My Record, and the desktop sidebar group label "More".
- [ ] **Bottom navigation will become opaque with correct safe-area clearance** (Phase 4, USA-214). Current state: `bg-white/62 backdrop-blur-2xl`; content shows through it. Evidence: `mobile-390--09-person-record.png` ("FEEDBACK / Request" visible under the bar), `mobile-390--02-meetings-calendar.png` ("RECENTLY LOGGED" under the bar), `mobile-390--06-more-launcher.png` (Testimony Practice tile under the bar). Not to be changed in Phase 0.
- [ ] **Person is the canonical relationship record** (`missionary_field_people`; README "Canonical People Model").
- [ ] **Circle placement stays human-confirmed**; recalculation never moves anyone (`circle-placement.ts` line 19). No UI may auto-apply a recommendation.
- [ ] **Circle, Engagement, Spiritual Journey/Relationship, and Fruit remain separate dimensions.** Relationship truth is three structured columns, not the `relationship_type` display string (USA-168). Engagement is an Advanced Feature (visibility only).
- [ ] **Fruit remains core DOS intelligence** (`src/lib/dos/fruit-intelligence.ts`, `person-fruit-summary.ts`, `dos-fruit-guard` script).
- [ ] **Existing meeting, prayer, journey, accountability, group, history, and follow-up data stay intact**: no PR in this project may add a migration, change an API payload's meaning, or change which ids a request sends.
- [ ] **Editable surfaces never lose user-entered work** through backdrop tap, swipe, or navigation: the `kind="editable"` contract and `useUnsavedWorkGuard` (commits `ec836b3`, `76a942e`). Evidence: `mobile-390--14-log-meeting-discard-dialog.png`; `usa-168-stabilization` script (all 25 behaviors pass).
- [ ] **Timezone and historical-meeting behavior stays in the regression baseline**: dates display in `dosDisplayTimeZone` (= `groupDisplayTimeZone`, line 1642) via `Intl.DateTimeFormat` with `hourCycle: "h23"`; calendar-date-only values format in UTC (`displayTimeZoneForValue`, line 1638); historical meetings keep labels for options no longer offered (lines 513, 529). Scripts: `dos-meeting-lifecycle`, `dos-scheduled-table-log`, `dos-calendar-sync`, `dos-resource-assignments` (runs with `TZ`).

## Per-surface checklist

### Home (mobile) / Dashboard (desktop) — PROTECTED, no redesign
- [ ] Mobile: "DOS / Discipleship on the go." header, profile avatar button, circle target with My 3 / 12 / 70 / 120 counts (buttons "Open My N, X people"), Notifications card, primary **Log Meeting** button with Schedule / Add Person / Accountability, "Today's Alignment" with "Open My Record", then further cards. Bottom nav Home selected.
- [ ] Desktop: "Dashboard" title; Notifications, Today's Alignment (Time With God, Prayer Time, Next Mentor Meeting, Weekly Report Card), Top Time Investments table, Accountability (Due today / Overdue / 7 days + rows with Open Person / Log Check-In), Assigned Resources, upcoming items with View / View all.
- [ ] Deep link `?walkthrough=usam` opens the USAM first-launch walkthrough (line 39451).

### Meetings
- [ ] Mobile: title "Meetings", **View** control (`meetingCalendarViewTabs` month | week), search field "Search meetings", **Needs Logging** section with count pill ("All caught up" empty state), month calendar with prev/next, day buttons labelled "Weekday, Month D, YYYY", dots for scheduled items, **Recently Logged** list beneath the calendar (current behavior repeats history under the calendar; V10 changes this later, not now). Evidence: `mobile-390--02-meetings-calendar.png`, `03-meetings-view-toggle.png`, `03b-meetings-history-below-calendar.png`.
- [ ] There is **no Calendar/Timeline toggle today**; "Timeline" in code refers to the Person Record tab and a My Record sheet. Recording this so the Phase 5 pilot is measured against a known starting point.
- [ ] Quick-actions FAB on Meetings offers Log Meeting and Schedule Meeting (line 44631). Evidence: `mobile-390--13-quick-actions-fab.png`.
- [ ] Google Calendar sources/events, "Open calendar view", and "add to DOS" continue to work (`dos-calendar-sync`).

### Log Meeting and Edit Meeting
- [ ] `DosWorkflowPage` titled "Log Meeting", subtitle "Capture what mattered while it is fresh."; sections Date (date input), Who was there? (participant search + "More people / Just the two of you" disclosure), Duration pills (15m / 30m / 45m / 1h / Custom, 30m default), How did you connect? (select, "In person"), meeting context, conversation flow, notes/next steps, fruit signals; sticky **Log Meeting** submit. Evidence: `mobile-390--04-log-meeting.png`, `desktop-1440--04-log-meeting.png`.
- [ ] Back with a dirty form → "Discard changes?" with **Keep editing** (primary) and **Discard**; clean form exits silently. Backdrop and swipe are inert.
- [ ] Edit Meeting reuses `MeetingFormContent`; updating a meeting keeps its id, review status, and follow-up reminders (`dos-table-detail-edit`, `dos-table-next-steps`, `dos-review-link-send-state`).
- [ ] Meeting Context and Conversation Flow stay separate (README); Kitchen Table Gospel / Four Questions flows remain gated to USAM workspaces.
- [ ] Future-date rule and duration confirmation are current behavior to verify in Phase 5 ("Product logic — later" in V10).

### Schedule Meeting
- [ ] `ScheduleMeetingForm` (line 22915): person picker, date, time, duration, context, optional Google Calendar sync, reminder; submit label "Schedule Meeting" → "Scheduling…". Creates a scheduled `missionary_tables` row that later appears under Needs Logging (`dos-scheduled-table-log`, `dos-schedule-meeting-form`). Evidence: `mobile-390--05-schedule-meeting.png`, `desktop-1440--05-schedule-meeting.png`.

### People (Field) and Person Record
- [ ] Field list: Settings button, segmented filter All / My 3 / My 12 / My 70 / My 120, rows as buttons "Open {name}" with initials avatar and relationship label; quick-actions FAB offers Add Person. Evidence: `mobile-390--08-field-people.png`, `15-field-all.png`, `desktop-1440--08-field-people.png`.
- [ ] Person Record (`PersonDetailOverlay`, line 36007): Back and Edit; avatar, name, relationship label; pill tabs **Overview / Timeline / Details** (`PersonDetailTab`); Overview shows **Last Meeting** and **Next Meeting** cards at the top, then Accountability (+ Add, rows, journey progress with Continue), Prayer (+ Add), Feedback/Request, and further categories. Deep link `?person=<id>&tab=growth|commitments`. Evidence: `mobile-390--09-person-record.png`, `09b-person-record-timeline.png`, `09c-person-record-details.png`, `desktop-1440--09-person-record.png`.
- [ ] Do not add a redundant "Last Time" section (project description).
- [ ] Add/Edit Person is the same protected task screen; Basic form asks three questions and hides advanced sections; Edit seeds from the loaded Person; Save outranks Delete; no reminder is created on edit (USA-168 stabilization behaviors).
- [ ] Engagement values never appear when the Advanced Feature is off; the desktop People table drops the column rather than blanking it.

### Field and My 3 / 12 / 70 / 120 placement
- [ ] Circle counts on Home and the Field filter come from `relationshipModelCounts` / `circle-scoring.ts`; the `CircleLayerSheet` (line 34651) explains a layer. Placement changes go only through `/api/dos/circles/override` after a human confirms. "Needs placement" / recently-added must stay bounded (V10 direction; current behavior to be inventoried in Phase 2).

### My Record
- [ ] Title "My Record", **Share** button, "← More" back pill, tab rail **Overview / Walk / Growth / Purpose / Faithfulness** (`myRecordTabs`, values overview / walk_with_god / growth / calling / legacy). Overview currently shows **Today at a glance** (Encounters, Prayer, Reflection, Time) and **Recent Activity** with View all; FAB adds an entry. V10 removes Today at a glance later; it is present today. Evidence: `mobile-390--07-my-record.png`, `desktop-1440--07-my-record.png`.
- [ ] All My Record forms (journal, prayer, mentor relationship/meeting, prophetic word, life plan, learning book/chapter, assessments, external assessment) persist via `/api/dos/app/my-record*` and are editable surfaces (`dos-my-record`).

### Prayer
- [ ] Prayer app: `PrayerRequestView` praying | answered, partners, settings, log prayer, prayer resources library; requests/partners create/edit/delete via `/api/dos/app/prayer-*` (`dos-prayer-ui`). Evidence: `desktop-1440--13-prayer.png`.

### Fruit
- [ ] Fruit app tabs activity | forms | impact | reviews (`fruitViewTabs`); fruit events editable/deletable only via explicit action; reviews stay independent of Fruit status (README "Reviews And Fruit Verification"; `dos-fruit-guard`). Evidence: `desktop-1440--15-fruit.png`.

### Groups and Journeys, participant journey views
- [ ] Groups list (all | mine), group create/settings/invite sheets, gatherings, join requests, journey assign/edit sheets, leader journey progress sheet; simplified-V2 flag; shared leadership. Scripts: `dos-groups`, `dos-group-home-*`, `dos-group-join-request-notification`, `dos-legacy-group-assignment`, `dos-guided-resources`, `dos-resource-assignments`, `dos-participant-preview-parity`, `dos-group-member-portal`. Evidence: `desktop-1440--14-groups.png`.
- [ ] Participant views (public `/groups/*` portal) must keep parity with leader previews (`dos-participant-preview-parity`).

### Apps / More launcher
- [ ] Mobile More: two-column tile grid — My Record (entries count), Field (people count), Groups (groups count), Prayer (Installed), Fruit (records count), Library (Installed), Reports / Stewardship / Testimony Practice (Coming Soon) — with a "+" FAB. Tiles are `AppsCatalogSection` items (line 7739; sections installed | missionary | coming_soon). Evidence: `mobile-390--06-more-launcher.png`, `desktop-1440--06-more-launcher.png`.
- [ ] Stays a compact launcher close to this; no oversized cards or viewport overflow (project description).

### Library
- [ ] Library resource views, resource picker sheet, guided resources, `/dos/library/*` pages; `LibraryResourceViewState` (line 1176). Evidence: `desktop-1440--16-library.png`.

### Reports, Stewardship, Testimony Practice
- [ ] Present as Coming Soon tiles / desktop nav items; `in_season` = Testimony Practice. No functional workflow to preserve beyond the placeholder states.

### Community
- [ ] `/community` is a public USAM website route (branch `ryan/usa-57-community-visual-restoration`), not inside the DOS app client. Out of scope for DOS UI unless Phase 2 finds a DOS entry point.

### Authentication and workspace selection
- [ ] `/dos` → portal (`DosPortalClient`): unauthenticated shows sign-in; authenticated with a confirmed default workspace redirects to `/dos/<slug>`; otherwise lists launch workspaces. Blocked states: "DOS unavailable" (configuration_error), "Access pending" (unauthorized), "Workspace unavailable" (forbidden), "No workspace found" (not_found). Evidence: `mobile-390--12-dos-portal-no-config.png`, `desktop-1440--12-dos-portal-no-config.png` (configuration_error state captured locally), `11-preview-locked-state.png` (demo lock screen).
- [ ] Slug aliases `fox-family` → `ryan-fox`, `ryan-brooke-fox` → `ryan-fox`, `bond-family` → `dirk-bond` keep working.
