# September newsletter — V4 revision notes

V4 restructures the issue around **exactly three main sections** and keeps the
USAM black/gold editorial system from V2/V3, with Kitchen Table Gospel and DOS
keeping their own grounds, marks, accents, and CTA colours inside it.

## Structure

| # | Section key | Type | Identity | What it carries |
|---|---|---|---|---|
| — | `header` | header | USAM | Field label, hero, edition |
| — | `opening` | letter | USAM | "Hi {{first_name}}," and three short paragraphs |
| **01** | `usam-covering` | pillar | USAM | The covering. Couples in conversation, and the rebuilt website as a secondary note. CTA → usamissionaries.org |
| **02** | `ktg-model` | pillar | KTG | The model in action, plus the table photograph |
| | `ktg-story` | story | KTG | **From the Table.** Hidden — permission unverified |
| | `ktg-men` | feature | KTG | Men's groups, group photograph, 2three2 |
| | `ktg-invitation` | invitation | KTG | "Your table is enough.", GATHER line, CTA → kitchentablegospel.org |
| **03** | `dos-tool` | pillar | DOS | The tool being prepared. CTA → discipleshipoperatingsystem.com |
| — | `closing` | closing | USAM | Back to one mission, prayer, Ryan & Brooke |

Section 02 is the longest and the emotional centre, as directed. The men's
update and the invitation sit **inside** the KTG identity rather than as
separate features, so the reader stays on the warm ground from the table
photograph through to the KTG call to action.

## Removed

| | Why |
|---|---|
| The standalone **website feature** section, with its own heading, full-bleed screenshot, and gold CTA | Now two sentences and one link inside 01. The screenshot is gone rather than shrunk: a page-level capture is unreadable at 600px, and a crop added nothing the sentence did not say. `usam-website.jpg` is deleted. |
| The standalone **men's discipleship** section | Folded into 02, where it belongs: it is the same model, continuing. |
| The **"The Ecosystem / So, what exactly is USA Missionaries?"** lead-in and its "Three parts, one mission" summary | A recap ladder ahead of three sections that explain themselves. The opening already says the ministry is fitting together. |
| The **ONE MISSION — MAKE DISCIPLES WHO MAKE DISCIPLES** statement block | It stated the mission a third time, between an opening that states it and a closing that returns to it. The closing keeps the job. |
| The **team growth** section | Still gone as a section. What replaced it is a hedged paragraph inside 01: conversations with *several* couples, explicitly not an announcement. No names, locations, biographies, photographs, or a number more precise than "several". |
| The **four-part "Some of that happened…"** opening list | It pre-announced every section. |

## Copy weight

| Section | Type | Identity | State | Body chars |
|---|---|---|---|---|
| `header` | header | usam | visible | 175 |
| `opening` | letter | usam | visible | 497 |
| `usam-covering` | pillar | usam | visible | 577 |
| `ktg-model` | pillar | ktg | visible | 240 |
| `ktg-story` | story | ktg | **hidden** | **0** |
| `ktg-men` | feature | ktg | visible | 200 |
| `ktg-invitation` | invitation | ktg | visible | 186 |
| `dos-tool` | pillar | dos | visible | 510 |
| `closing` | closing | usam | visible | 430 |
| **Total** | | | | **2,815** |

## Rendered height

Measured in Chromium against the real renderer, photographs loaded. No
horizontal overflow at either width in any render.

| | Desktop (700px viewport / 600px shell) | Mobile (390px) |
|---|---|---|
| Version A | 4,253px | 4,851px |
| V2 (PR #75) | 4,667px | 4,628px |
| **V4 as it would send** (no story) | **4,302px** | **4,584px** |
| **V4 private review** (story mockup in place) | **5,017px** | **5,550px** |

The sendable issue is the shortest mobile render of the four, despite carrying
more distinct copy than V2 — the removed feature sections and the removed recap
paid for the fuller three sections. **The story is what adds length**: roughly
+715px desktop and +966px mobile when it goes in. That is the honest budget for
the issue Ryan is approving, and it is the number to hold if the final approved
story runs longer than the mockup.

Mobile spacing was checked at 390px specifically: the masthead lockup stays at
64px with the wordmark beside it, section padding drops to 22px, the hero falls
to 32px and section headings to 22px, and both photographs run full-bleed with
their captions below. Nothing overflows and nothing collides.

## Subject and preview text

- **Subject:** `There's a Lot We've Been Wanting to Share` — retained. It is the
  working subject, it is what the record already carries, and nothing stronger
  emerged that was not more product-launch than field update.
- **Preview text:** `Conversations with couples exploring the mission, what
  happened around a table, and the tool we are preparing.` — 110 characters, and
  it previews the three sections in order instead of repeating the subject.

## Date

The old **2026-09-15** planned send has passed and is left as it is rather than
replaced with an invented one. No new date is set. (The earlier note proposing
Tuesday 30 September was wrong on the day: 30 September 2026 is a **Wednesday**.
No date is being proposed here — the send waits on the story, the permission,
the postal address, the design approval, and a Ryan-only test.)

## Verification

- `npm run typecheck` — clean.
- `npm run test:operations-communications` — 15/15.
- `npm run test:communications-public-routes` — 20/20, including four new checks:
  no issue's content is hard-coded by slug, September renders from its record,
  a story renders only under a verified sharing permission, and the unapproved
  mockup stays out of everything sendable.
- `npm run build` — clean.
- `scripts/september-newsletter-preview.mjs` regenerates every artifact here,
  fails if any photograph does not load, and fails if the mockup reaches the
  sendable render.
