# Typography Rules

Do not introduce new fonts unless explicitly requested.

Use the existing site font system only:
- Display/headline font for major page titles only
- Body/UI font for paragraphs, buttons, cards, forms, and testimonials
- Uppercase tracking is allowed for labels, metadata, and small section tags

Testimonials should NOT use serif fonts or decorative fonts.
Make testimonials stand out through layout, spacing, line-height, quote styling, and amber accents instead of adding another font.

Before changing typography, preserve the existing brand system.

# Project Context

This is the USAM website (not the DOS app).

The website is the public front door to:
- Mission and vision
- Financial Freedom intake
- Missionary support pages
- Profiles (PF) public-facing missionary pages

Admin functionality exists under /admin.
Command Center (CC) functionality lives under /admin.

Do NOT build app-style dashboards on public pages.
Keep the website simple, clear, and invitational.

---

# System Architecture

This project is built on three layers:

### Command Center (CC)
- Admin and operational system
- Source of truth interface for all data
- Used for creating, editing, reviewing, and approving data
- Used by leadership, admins, and operators
- Current development focus

### Profiles (PF)
- Public-facing missionary profile pages
- Displays only approved and curated data
- Used by donors, partners, and visitors
- Never exposes raw, reviewed, private, or sensitive data
- Do not modify public Profiles display beyond data wiring unless explicitly requested

### Field (FD)
- Daily-use application for missionaries
- Primary entry point for new data such as People, Tables, and notes
- Must remain simple, fast, and minimal
- Do not build Field UI yet

---

# Core Principle

There is ONE shared database: Supabase.

Do NOT:
- create duplicate data models
- create separate systems for CC, PF, or FD
- sync between multiple versions of the same data

Instead:
- use one shared model
- build different interfaces for CC, PF, and FD
- keep Supabase as the single source of truth

---

# Data Flow

Field (FD)
-> creates People, Tables, Encounters, notes, and future Connection Logs

Database (Supabase)
-> stores all records

Command Center (CC)
-> edits, enriches, categorizes, reviews, assesses, approves, and plans next steps

Profiles (PF)
-> displays approved and curated data only

---

# Ministry Data Layers

Keep ministry data separated by purpose:

- People / Your Field = WHO the person is; persistent relationship profile
- Tables = WHEN and HOW the meeting happened; event record
- Encounters = WHAT the person said; raw response only
- Review = missionary interpretation of the meeting
- Discipleship Assessment = structured spiritual diagnostic for that meeting
- Fruit = approved outcome derived from Encounter + Review + Assessment
- Movement Step = what happens next
- Connection Logs = ongoing discipleship interactions outside formal Tables

Do NOT mix these layers. Do NOT store disciples or relationship data in Team.

Core workflow:

Your Field (People)
-> Table
-> Encounter
-> Review
-> Discipleship Assessment
-> Profile Update Prompt
-> Fruit
-> Movement Step
-> Continued discipleship

---

# Data States

All structured outputs, especially Fruit, follow:

RAW -> REVIEWED -> APPROVED

- RAW: created and unprocessed; not visible publicly
- REVIEWED: cleaned and summarized for internal use only
- APPROVED: published to Profiles (PF) and later usable in Field (FD) as encouragement or insight

Never expose RAW or REVIEWED data publicly.

---

# Core Modules (Command Center)

Build and maintain these Command Center modules:

1. Your Field (People)
2. Tables
3. Connections
4. Fruit
5. Library
6. In Season
7. Profiles (publishing layer)

Tables contain the nested workflow:
- Table details
- Encounters
- Review
- Discipleship Assessment

Do NOT make Encounters a top-level Command Center tab. Encounters are nested under Tables.

Each module must:
- be clearly separated
- connect through shared data models
- avoid duplicated logic or storage
- prepare data for public display and future field use

---

# Missionary Workspaces Roles

Missionary Workspaces in Command Center organize all three product layers, but each layer has a distinct job.

### Profiles (PF)
Public-facing content only:
- Profile
- Features
- Team (public roster only)
- Media
- Story
- Support
- Prayer

Profiles must display only approved and curated content.

### Command Center (CC)
Operational data:
- Tables: meeting events that contain details, Encounters, Review, and Discipleship Assessment
- Connections: ongoing interactions outside formal Tables such as calls, texts, Zoom, prayer, and discipleship
- Encounters: raw submissions nested under Tables
- Review: missionary interpretation of a meeting
- Discipleship Assessment: structured spiritual insights tied to a meeting
- Fruit: approved outcomes derived from Encounters + Review + Assessment
- Movement Step: next action after an interaction
- Connection Logs: ongoing discipleship interactions outside formal Tables

Command Center owns review, cleanup, structuring, and publishing decisions.

### Field (FD)
Future daily-use behavior:
- creates Encounters
- displays Fruit summaries

Do not build Field UI yet.

Missionary Workspace rules:
- Do NOT use Team to store disciples or ministry relationships
- Team is public-facing roster content only
- Encounters is the intake layer for testimonies, forms, reviews, and raw story material
- Review, Assessment, and Movement Step belong to interactions, not public Team records
- Fruit is derived from approved Encounter + Review + Assessment data
- Fruit is the only structured output shown across CC, PF, and future FD

---

# Your Field (People)

Your Field is the relational map of everyone in a missionary's life.

No artificial limit. Do NOT use "100 people" language.

Use a single shared People table across CC and FD.

Required fields:
- name
- phone

Optional collapsed fields:
- email
- address
- church
- family info
- notes

Always editable in the interface:
- relationship type
- engagement level
- church / spiritual community

Post-interaction fields:
- status
- relationship type
- engagement level
- church

These should be updated after meetings, not required upfront.

Source fields:
- source: 'field' | 'command_center'
- created_by
- created_at

People are created primarily in FD and managed/refined in CC.
Command Center must allow full editing and enrichment.

People insights should be prepared for:
- total time spent
- number of interactions
- last interaction
- table count

Discipleship Circles are plan-only for now:
- Closest 3
- Core 12
- Broader 70

These will later be based on time spent, frequency, and recency. Do NOT automate yet.

---

# Tables

Tables are meeting events.

Tables own the first working workflow:

People
-> Table
-> Encounter
-> later Review + Fruit

Fields:
- date, default today
- type: Kitchen Table, Coffee, Phone, Zoom, Group, Other
- people linked to Your Field
- notes
- teaching used, future Library link

UX:
- modal or slide-over
- fast entry under 30 seconds
- default values
- buttons: Save Table, Save + Add Encounter
- detail view contains nested Encounters, Review placeholder, and Discipleship Assessment placeholder

Movement Step is selectable from Tables.

---

# Encounters

Encounters capture raw participant response.

Sources:
- short form
- long testimony
- manual entry

Fields:
- name
- email optional
- raw response text
- linked table
- status: RAW

Do NOT store church, relationship type, or engagement level in Encounters.

---

# Review

Review is the missionary interpretation layer.

Fields:
- how the meeting went
- key observations
- breakthroughs or concerns
- movement step
- follow up needed

Review data stays internal unless it is explicitly transformed into approved Fruit.

---

# Discipleship Assessment

Discipleship Assessment is nested under Review and belongs to the meeting, not People.

Fields:
- teaching used: Kitchen Table Gospel, Are You Really a Disciple, Commands of Jesus
- questions covered
- responses / notes
- readiness: Not ready, Curious, Open, Ready to follow, Actively following
- areas needing follow up: Repentance, Baptism, Scripture, Prayer, Community, Obedience

Do NOT store assessment diagnostics in People.

---

# Profile Update Prompt

After completing Review, prompt:

"What did you learn about this person?"

Allow updating only missing or incomplete Person fields:
- relationship type
- engagement level
- church

Save updates to the Person record. Do NOT duplicate data.

---

# Connection Logs

Connection Logs track ongoing discipleship outside formal Tables.

Examples:
- phone call
- Zoom
- text
- coffee
- prayer
- discipleship meeting

Fields:
- person
- date
- duration
- interaction type
- notes
- movement step
- follow up

Connection Logs must be extremely fast to log and feed People insights and future Discipleship Circles.

---

# Fruit

Fruit is approved output derived from Encounter + Review + Assessment.

Fields:
- summary
- outcome tags: Salvation, Baptism, Healing, Deliverance, Church Connection, Discipleship, Prayer Answered, Other
- linked person
- linked table
- status: APPROVED

Rules:
- only APPROVED Fruit goes to Profiles (PF)
- raw data remains internal
- approved Fruit is the only thing that later feeds Profile and Field

---

# Movement Step

Every interaction should lead to a next step.

Options:
- Continue meeting
- Begin discipleship
- Send follow up
- Invite to group
- Connect to church
- Connect to ministry
- Hand off
- Pray and wait
- Other

Movement Step is selectable in Tables, Review, and Connection Logs.

---

# Library

Library is a light teaching-framework store.

Examples:
- Kitchen Table Gospel
- Commands of Jesus

Tables can reference Library items in the future.

---

# In Season

In Season tracks current focus.

Fields:
- current focus
- prayer emphasis
- active people
- active tables

Keep it simple.

---

# Routing Rules

Public pages:
- /
- /financialfreedom
- /give/[userId]
- /missionaries

Admin pages:
- /admin/dashboard
- /admin/missionary-profiles
- /admin/financial-freedom
- /admin/*

All /admin routes must be protected using Supabase auth + admin_users table.

---

# Missionary Workspace and Command Center UI Rules

These rules are canonical for all future Missionary Workspace and Command Center development.

Product philosophy:
- Build operational software, not a brochure and not an enterprise CRM.
- The interface should feel minimal, premium, fast, calm, and purposeful.
- Use inspiration from Linear, Vercel, Apple, Stripe, and Notion: clear hierarchy, restrained surfaces, compact controls, excellent spacing, and no clutter.
- Missionary Workspace is the expanded operational workspace. DOS/Field is the mobile daily-use app. Do not blur the product roles in UI copy.
- Every screen should answer: what matters now, what changed, what needs action, and where do I go next?

UI/UX standards:
- Default to fewer visible controls and fewer words.
- Prioritize scan speed over explanation.
- Use clear section hierarchy: primary nav -> secondary nav -> content.
- Keep the current section/state visually obvious.
- Prefer compact rows, badges, pills, tabs, segmented controls, and drawers over large explanatory cards.
- Do not stack multiple explanation cards to teach the architecture. The product should feel self-evident.
- Avoid dashboard clutter, spreadsheet dumps, and enterprise CRM density that makes the page feel heavy.

Copywriting rules:
- Use short labels and direct nouns: `Support`, `Commitments`, `Settings`, `Public Links`, `Status`.
- Remove obvious helper copy. Buttons and fields that are self-explanatory do not need paragraphs.
- Keep helper text only when it prevents a real mistake or explains a non-obvious consequence.
- Avoid implementation language in normal UI: no schema, routing internals, fallback behavior, migration talk, or system plumbing unless the screen is explicitly admin diagnostics.
- Do not repeat the same idea in a heading, paragraph, and card.
- Prefer calm operational copy over motivational or marketing copy inside admin/workspace tools.

Spacing and layout standards:
- Use compact vertical rhythm in admin/workspace surfaces.
- Keep content width constrained for readability.
- Reduce nested cards. One container surface is usually enough.
- Use whitespace to separate groups, not repeated bordered boxes.
- Keep page headers short. Remove redundant labels, slugs, and internal URLs unless they are directly actionable.
- Form sections should be tight and scannable: label, control, optional short helper.
- Avoid oversized hero-style typography inside admin cards and tool surfaces.

Table and list responsiveness:
- No horizontal scrolling in Missionary Workspace or Command Center operational views.
- Do not ship tables with `min-width` that force sideways scrolling.
- Default table/list views should show only essential columns.
- Move secondary details into a modal, drawer, expandable row, or detail panel.
- Mobile behavior should become stacked cards or compact responsive rows.
- Keep status values as compact pills.
- Donor/support tables should show scan fields first, such as `Donor`, `Amount`, `Type`, `Status`, `Actions`.
- Person/activity tables should prioritize name, status, last activity, next action, and a compact view/edit action.

Button hierarchy:
- Primary actions: solid gold, dark text, clear label, used sparingly.
- Secondary actions: dark or white surface with border, lower visual weight.
- Tertiary/copy actions: small, icon-first where possible, subtle outline or text treatment.
- Navigation tabs are not action buttons. Keep tab styling visually distinct from save, preview, copy, and launch actions.
- Disabled actions should be muted and should not compete visually.
- One primary CTA per section whenever possible.

Settings philosophy:
- Settings screens are operational controls, not documentation.
- Show current state as compact metadata or pills.
- Keep only controls that can be changed on that screen.
- Remove large explanation cards from settings.
- Avoid describing backend behavior unless it changes the user's decision.
- Advanced settings should be collapsed or visually quiet unless needed for the current workflow.

Operational density standards:
- Missionary Workspace and Command Center should feel efficient and ready for repeated daily use.
- Prefer compact cards, rows, and pills over large panels.
- Reduce row height and padding when the user is scanning records.
- Use hover states, detail drawers, and view buttons for secondary information.
- Keep dashboards executive and awareness-focused: metrics, pending items, recent activity, status, and exceptions.
- Do not turn dashboards into launchpads full of redundant buttons.

Mobile-first requirements:
- Every admin/workspace surface must remain usable on mobile.
- No control should require horizontal dragging to read or act.
- Tap targets must remain comfortable, but layouts should stay compact.
- Multi-column desktop layouts should collapse into stacked mobile cards cleanly.
- Modals/drawers must fit within the viewport and scroll internally when needed.

Anti-bloat rules:
- Do not add features because there is empty space.
- Do not add tutorial copy to compensate for unclear IA; simplify the IA instead.
- Do not create duplicate UI paths for the same workflow.
- Do not create separate data models for separate interfaces.
- Do not expose raw/private data publicly.
- Do not use public profile pages as admin dashboards.
- Do not add new design systems, fonts, decorative effects, or visual themes unless explicitly requested.

Preferred UX patterns:
- Compact status header: `Public Visible` `Support Enabled` `$8,333/mo`.
- Operational row with detail modal: default row shows key fields; `View` opens email, phone, notes, dates, and metadata.
- Section cards for major areas; small tabs for subsections.
- Sticky or contextual save bar only when edits are dirty.
- Copy utilities as small `Copy` icon buttons, not large CTAs.
- Settings row: `Giving System: Active` `Destination: Ryan & Brooke Fox` instead of multiple explanatory cards.
- Empty states should be short: one sentence and one action when action is useful.

Public page UI principles:
- Keep public pages simple, clear, and invitational.
- Avoid dashboard-style layouts on public pages.
- Public Profiles must display only approved and curated content.
- Do not expose internal state, raw submissions, admin notes, or reviewed-but-unapproved content.

---

# Component Rules

- Reuse existing components whenever possible
- Do not duplicate UI patterns
- Keep components small and focused
- Follow existing spacing and card patterns

---

# Supabase Rules

- Use Supabase for all structured data
- Never hardcode credentials
- Do not expose private data publicly
- Use RLS for all tables

Public pages:
- can INSERT only (forms)

Admin pages:
- can SELECT / UPDATE based on admin access

---

# Admin Rules

- All admin pages must use the shared AdminShell
- Sidebar navigation must remain consistent
- Admin pages are tools, not marketing pages

---

# Form Rules

- Forms must feel safe and voluntary
- Avoid overwhelming inputs
- Always include privacy language
- Do not require more than necessary

---

# Development Flow

Always build in this order:

1. Data model (Supabase)
2. Basic UI
3. UX refinement
4. Add intelligence

---

# DO NOT

- introduce new design systems
- add unnecessary complexity
- break existing layout patterns
- expose sensitive financial data
- expose RAW or REVIEWED data publicly
- duplicate CC, PF, or FD data models
