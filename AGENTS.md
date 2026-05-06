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
-> creates data

Database (Supabase)
-> stores all records

Command Center (CC)
-> edits, enriches, categorizes, reviews, and approves

Profiles (PF)
-> displays approved and curated data only

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

1. People
2. Tables
3. Fruit
4. Library
5. In Season
6. Profiles (publishing layer)

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
- Encounters: raw submissions such as testimonies, forms, reviews, and story intake
- Fruit: reviewed and structured outcomes derived from Encounters

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
- Fruit is derived from Encounters
- Fruit is the only structured output shown across CC, PF, and future FD

---

# People Model

Use a single shared People table across CC and FD.

Required fields:
- name
- contact info
- status
- tags
- notes (internal)
- source: 'field' | 'command_center'
- created_by
- created_at

People are created primarily in FD and managed/refined in CC.
Command Center must allow full editing and enrichment.

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

# UI Principles

- Keep pages simple and uncluttered
- Avoid dashboard-style layouts on public pages
- Use cards and sections instead of dense data
- One primary CTA per section
- Mobile-first always

Do NOT:
- add unnecessary features
- create large hero dashboards
- overwhelm users with data

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
