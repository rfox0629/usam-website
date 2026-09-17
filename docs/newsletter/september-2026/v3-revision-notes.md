# September newsletter — V3 revision notes

V3 refines the V2 direction recorded in the "SEPTEMBER NEWSLETTER — DESIGN
REVIEW — PROPOSED V2" note on PR #75. It is the same visual system: USAM black
and gold, the continuous black field, Oswald / Rajdhani / Inter, and the
distinct Kitchen Table Gospel and DOS grounds, marks, accents, and CTA colours.
No new design concept was started.

## The one structural change

The table moved from a rung of the framework ladder to the lead ministry story.

| | V2 | V3 |
|---|---|---|
| Order | Hero → intro → ecosystem (01 / **02 KTG, with the table photo and copy** / 03) → one mission → website → men's → closing | Hero → intro → **From the Table** → ecosystem (01 / 02 / 03) → one mission → website → men's → closing |
| The table | Framework material inside section 02 | Its own section, before the framework |
| Section 02 | Mark, heading, copy, photograph, table copy, GATHER line, KTG CTA | Mark, heading, one line |

The story now earns the explanation instead of following it, and the material
that used to appear twice appears once. The photograph, the GATHER / LEARN /
CONFESS / ENCOURAGE / MULTIPLY line, and the Kitchen Table Gospel CTA all moved
up into the story; section 02 no longer repeats them. The CTA sequence is still
three different brand colours in ecosystem order — KTG cream, DOS blue, USAM
gold.

## Removed

| | Why |
|---|---|
| **"The Team Is Growing" section** | No announcement is ready. V2 had already emptied the copy and made the section conditional; V3 deletes the section, the `team` field, and its plain-text block outright, so this issue carries no dormant, unreviewed code path. Recoverable from PR #75 at `809942f` if an announcement lands later. |
| The four-part "Some of that happened… Some through… Some behind… Some through…" list in the opening | It pre-announced every section in the issue. This was the largest single source of the repetition flagged in the V2 review. |
| "and new people joining the mission" from the hero subhead | It trailed the removed team section. |
| The duplicate table photograph and table copy in section 02 | Now in the story, once. |
| "One of the biggest things we have been working on is simply making the vision clearer" from the opening | It said in the intro what the website section's headline already says. |

## Copy length, V2 → V3

Measured from the two content modules, not estimated.

| Field | V2 | V3 | Change |
|---|---|---|---|
| intro | 549 | 310 | **−239 (−44%)** |
| hero.subhead | 126 | 141 | +15 (+12%) |
| table.frame (was `tables`) | 166 | 267 | +101 (+61%) |
| **table.invitation.body** | 0 | 353 | **new** |
| **table.story** | 0 | **0** | **reserved — see below** |
| ktgBody | 124 | 150 | +26 (+21%) |
| covering | 152 | 152 | — |
| dosBody | 160 | 160 | — |
| website.body | 126 | 122 | −4 (−3%) |
| mens.body | 177 | 177 | — |
| closing.body | 251 | 247 | −4 (−2%) |
| team.body | 0 | 0 | section deleted |
| **Total** | **1,831** | **2,079** | **+248 (+14%)** |

## Rendered height

Measured in Chromium against the real renderers, with the photographs loaded.

| | V2 | V3 (as it would send) | Change |
|---|---|---|---|
| Desktop, 700px viewport / 600px shell | 4,667px | 5,028px | +361px (+7.7%) |
| Mobile, 390px | 4,628px | 5,144px | +516px (+11.1%) |

No horizontal overflow at either width, in either version.

**V3 is taller than V2, and that is the intended trade.** V2's goal was
compression. V3's goal is a main ministry story, and a story plus an invitation
costs height that trimming the opening by 44% does not repay. Everything that
was not the story got shorter or stayed the same. When `table.story` is written
it will add roughly another 250–350px.

The founder-review render is 190px taller again (5,218px desktop) because it
draws the reserved-slot marker. That marker never renders in an email.

## Stale deadline

Nothing in the email copy names a date. The stale deadline is in the record:

`communication_newsletters.planned_send_at` for `q2-q3-2026-field-update` is
**2026-09-15 13:00 UTC**, which passed two days ago. The record still reads
`test_sent`, was last tested 2026-09-04, and has never been approved or sent.

This has not been changed. Proposed replacement, for the founder to set:
**Tuesday 2026-09-30, 13:00 UTC (08:00 US Central)** — far enough out to
re-attach the reflection, resolve the sharing permission, approve the design,
verify the postal address, and run a fresh test send, and still inside September
so the issue's own "Field Update // September 2026" label stays true. If the
permission cannot be resolved by then, the issue ships on its frame and
invitation rather than slipping into October.

## Pre-send blockers, unchanged

1. **Verified postal address.** Still unset. Worth being precise about how unset
   it is: `postalAddress` has no source anywhere in the codebase — no
   environment variable, no database column, and no caller that passes anything
   but `null`. Both renderers correctly render nothing rather than inventing an
   address, but `evaluateSendReadiness` does not list it as a blocker either, so
   nothing in the application would stop a CAN-SPAM-incomplete send. See the
   editor plan.
2. **The "From the Table" story.** See `from-the-table-source.md`.

## Verification

- `npm run typecheck` — clean.
- `npm run test:operations-communications` and
  `npm run test:communications-public-routes` — see the commit.
- `node --no-warnings --import ./scripts/ts-loader.mjs scripts/september-newsletter-preview.mjs`
  regenerates every artifact in this directory and fails if any photograph does
  not load.
- Version A is byte-identical: `september-2026.ts`, `newsletter-editorial.ts`,
  `render.ts`, and `newsletter-template.ts` are untouched on this branch.
