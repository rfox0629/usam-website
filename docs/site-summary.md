# USA Missionaries Website Summary

Last updated: April 14, 2026

## Purpose of this doc

This document summarizes the current website structure, the links that already exist, and a recommended path to simplify the site without losing any pages that have already been built. It also outlines a phased plan for a metrics dashboard that can pull from a spreadsheet now and later switch to DOS as the source of truth.

## Current site at a glance

The site currently has 3 public routes:

- `/` — main landing page for USA Missionaries
- `/mission` — mission detail page
- `/system` — DOS platform / investor-style system page

The current visual system is consistent across all 3 pages:

- dark background
- amber/gold accent color
- Oswald + Rajdhani typography
- grid / tactical / operations-inspired visual language
- large narrative sections with strong headlines

## Current route summary

### 1. Home page

Path: `/`

Role:
- Main brand landing page
- Introduces the mission and movement
- Acts as the hub that sends people deeper into the Mission and System stories

Key sections:
- Hero: "THE MISSION IS ACTIVE"
- Identity: "NOT AN ORGANIZATION. A DEPLOYMENT."
- Expansion map: "FROM HERE TO THE NATIONS"
- Mission model: "MEET. MINISTER. MULTIPLY."
- System layer preview
- Audience / challenge section: "THIS IS NOT FOR EVERYONE"
- Impact counters
- Final CTA: "YOU WERE SENT"

Notes:
- This page is strong as the main front door.
- It currently carries a lot of narrative weight and could become the one primary storytelling page if simplification is the goal.

### 2. Mission page

Path: `/mission`

Role:
- Expands the spiritual / practical meaning of the mission
- Adds a more operational mission narrative
- Currently contains the most dashboard-like "briefing" module outside `/system`

Key sections:
- Hero: "ENTER THE MISSION"
- Briefing section: "LIVE FIELD METRICS"
- Field lanes
- Deployment rhythm
- Rules of engagement
- Final CTA: "THE MISSION CONTINUES"

Notes:
- This page feels like a bridge between narrative and operational content.
- It is the most natural place to house a near-term metrics dashboard.
- It already has a briefing pattern that can evolve into live data instead of placeholder values.

### 3. System page

Path: `/system`

Role:
- Explains DOS as infrastructure
- Reads like a strategic / investor / platform overview
- Most focused on system logic, visibility, and scale

Key sections:
- Hero: "THE OPERATING SYSTEM FOR DISCIPLESHIP AT SCALE"
- Invisible breakdown section
- "WHAT DOS MAKES POSSIBLE"
- "WHY THIS WILL BECOME THE STANDARD"
- Strategic thesis
- End-state / build vision

Notes:
- This page is not redundant, but it is more niche than the homepage.
- It is valuable to keep, even if it becomes less prominent in the main nav.
- Best framed as a subpage for partners, builders, donors, or internal stakeholders.

## Current internal links

### Home page links

Path: `/`

Top nav:
- `Mission` -> `/mission`
- `Movement` -> `/#movement`
- `System` -> `/system`
- `Deploy` -> `/#deploy`

Hero CTAs:
- `Enter the Mission` -> `/mission`
- `Access Briefing` -> `/mission#briefing`

Body links:
- `View the System` -> `/system`

Current gaps:
- `Step In` is currently a button with no destination
- `Join the Mission` is currently a button with no destination

### Mission page links

Path: `/mission`

Top nav:
- `Mission` -> `/mission`
- `Movement` -> `/#movement`
- `System` -> `/system`
- `Deploy` -> `/#deploy`

Hero / body CTAs:
- `Access the Briefing` -> `#briefing`
- `View the System` -> `/system`
- `Return to Base` -> `/`
- `Inspect the Infrastructure` -> `/system`

### System page links

Path: `/system`

Top nav:
- `Mission` -> `/`
- `Movement` -> `/`
- `System` -> `/system`
- `Deploy` -> `/`

Hero CTAs:
- `View Investor Brief` -> `#brief`
- `Join the Build` -> `#build`
- `Back to Mission` -> `/`

Current gap:
- The `Movement` and `Deploy` top-nav links on this page currently go to `/` rather than specific anchors like `/#movement` and `/#deploy`

## Simplification recommendation

The site can become much simpler without deleting any work.

Recommended structure:

- Keep `/` as the main public-facing landing page
- Keep `/mission` as the action-oriented mission detail page
- Keep `/system` as a secondary strategic page for DOS

This means simplifying navigation and messaging, not removing built pages.

## Best simplification strategy

### Option A: Simplify navigation, keep all pages

Recommended.

Primary nav:
- `Mission` -> `/`
- `Dashboard` -> `/mission#briefing` or a future `/dashboard`
- `DOS` -> `/system`

Why this works:
- Keeps everything already built
- Reduces confusion between "Mission" and "Movement"
- Gives metrics a clearer home
- Makes DOS feel intentional instead of competing with the main message

### Option B: Treat `/mission` as the dashboard page

Also strong.

Structure:
- `/` = story / brand / recruiting page
- `/mission` = mission briefing + metrics + field rhythm
- `/system` = deeper DOS explanation for internal / partner audiences

Why this works:
- No pages are lost
- The mission page already contains the right framing for a live dashboard
- You avoid creating a new route before the data model is ready

### Option C: Eventually add a dedicated `/dashboard`

Best long-term option after live data matters more.

Structure:
- `/` = story
- `/mission` = mission narrative
- `/system` = DOS vision
- `/dashboard` = live metrics and field intelligence

Why this works:
- Separates narrative from reporting
- Gives room for filters, tables, charts, and future auth if needed
- Creates a clean migration path from spreadsheet -> DOS

## Recommendation

If we simplify now, the cleanest near-term move is:

- Keep `/` as the main front door
- Keep `/mission` but make it the operational "briefing" page
- Keep `/system` as a strategic DOS page
- Reduce top nav to 3 items: `Mission`, `Briefing`, `DOS`

That gives the site a simpler structure while preserving all current work.

## Metrics dashboard: current state

There are already dashboard-like components in the codebase, but they are static placeholders today.

Existing dashboard-style sections:

- `/mission#briefing`
  - current component shows:
  - Active Cities
  - Live Tables
  - Operators
  - operator/city/status/tables/pulse table

- `/system`
  - contains intelligence and metric-strip patterns that could be reused

This is good news because the UI pattern is already started. What is missing is a real data source.

## Metrics dashboard: near-term plan using a spreadsheet

### Best first version

Use a spreadsheet as the source of truth and read it into the site at build time or request time.

Good spreadsheet options:

- CSV committed in the repo
- `.xlsx` file stored in the repo
- Google Sheet exported as CSV

Recommended first step:

- Start with a CSV file in the repo because it is the simplest to implement and deploy

Example files:

- `data/metrics-summary.csv`
- `data/metrics-cities.csv`
- `data/metrics-operators.csv`

### Suggested first dashboard metrics

Top-line cards:
- Active Cities
- Live Tables
- Active Operators
- New Tables This Month
- New Disciple Paths This Month
- Cities in Launch Phase

Table data:
- City
- State
- Operator Count
- Active Tables
- Launch Status
- Weekly Change
- Health / Pulse

Optional later:
- region filters
- date range filters
- trend sparklines
- map overlays

## Suggested spreadsheet structure

### Sheet 1: summary

Columns:
- metric_key
- label
- value
- note
- updated_at

Example rows:
- `active_cities,Active Cities,27,+4 this quarter,2026-04-14`
- `live_tables,Live Tables,118,14 launch-ready,2026-04-14`
- `operators,Operators,43,9 in training,2026-04-14`

### Sheet 2: city_metrics

Columns:
- city
- state
- operator_count
- active_tables
- status
- pulse
- notes
- updated_at

### Sheet 3: monthly_trends

Columns:
- month
- new_tables
- new_operators
- cities_added
- disciple_paths

## Dashboard implementation phases

### Phase 1: spreadsheet-backed static dashboard

Goal:
- replace hard-coded metric values with spreadsheet data

Approach:
- create a small data loader in the app
- parse CSV or spreadsheet rows into typed objects
- feed those values into the existing Mission dashboard UI

Output:
- real numbers on the page
- no DOS integration required yet

### Phase 2: shared dashboard components

Goal:
- avoid duplicating dashboard UI across `/mission` and `/system`

Approach:
- extract reusable components:
  - metric cards
  - data table
  - signal badges
  - dashboard panel shell

Output:
- one visual system for all metrics views

### Phase 3: DOS-ready data layer

Goal:
- keep the same UI while swapping the source from spreadsheet to DOS

Approach:
- define a stable internal data shape now
- spreadsheet adapter fills that shape first
- DOS adapter fills the same shape later

Output:
- minimal UI rewrite when DOS becomes the source

## Recommended technical approach for the dashboard

Build the dashboard around an internal shape like this:

```ts
type SummaryMetric = {
  key: string;
  label: string;
  value: string;
  note?: string;
};

type CityMetric = {
  city: string;
  state: string;
  operatorCount: number;
  activeTables: number;
  status: string;
  pulse: string;
  updatedAt?: string;
};
```

Then support 2 adapters:

- `spreadsheet -> internal shape`
- `dos -> internal shape`

That will let the frontend stay mostly unchanged later.

## Content simplification recommendation

The site currently has strong visual identity, but a lot of copy. If the goal is a simpler site, simplify by reducing message overlap, not by deleting pages.

### What can be simplified safely

- Reduce homepage nav from 4 labels to 3
- Remove or rename `Movement` and `Deploy` as standalone nav items
- Decide one primary CTA and one secondary CTA per page
- Use the homepage for brand story
- Use the Mission page for operational clarity + dashboard
- Use the System page for DOS vision only

### What should be preserved

- `/mission` route
- `/system` route
- the tactical dashboard visual language
- the map/table graphic and mission aesthetic
- the narrative distinction between mission story and system infrastructure

## Recommended next build steps

1. Simplify the nav across all pages to: `Mission`, `Briefing`, `DOS`
2. Fix the currently dead homepage buttons: `Step In` and `Join the Mission`
3. Decide whether the metrics live on `/mission#briefing` or a new `/dashboard`
4. Add spreadsheet-backed data loading for the existing Mission dashboard
5. Extract reusable dashboard UI components so the same metrics language can be used across pages
6. Later swap the spreadsheet adapter for a DOS adapter without changing the UI structure

## File references

Current page files:

- `app/page.tsx`
- `app/mission/page.tsx`
- `app/system/page.tsx`

Suggested future areas:

- `docs/site-summary.md`
- `data/metrics-summary.csv`
- `data/metrics-cities.csv`
- `components/dashboard/*`
- `lib/metrics/*`

## Final recommendation

Do not delete any existing pages.

Instead:

- simplify the nav
- clarify page roles
- make `/mission` the near-term briefing home
- keep `/system` as the deeper DOS thesis page
- connect a spreadsheet-backed metrics layer now
- design that data layer so DOS can replace the spreadsheet later

That gives you a cleaner website immediately without losing the work that is already done.
