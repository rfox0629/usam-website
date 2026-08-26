# USA-191 founder review package

Redesign of `/join` as a Typeform-paced "Welcome to the Team" experience, built
on top of the USA-167 application without changing its backend, data contracts
or validation.

Nothing here is merged or deployed. This is for review.

- Branch: `claude/usa-191-join-refinement-tfvv5p`
- Benchmark studied: `rfox0629/stewardship.capital` @ `55630f3`
- Palette source: USA Missionaries Operations (`/operations`)

---

## 1. What changed in the second pass

Your feedback was three things, and all three are addressed.

**"I don't see the tech feel on the first screen."** The opening now carries a
real product bar (gold tile, product name, application label) and a spec line
that states the application's own facts before the headline: `APPLICATION / 9
SECTIONS / ABOUT 30 MINUTES / SAVES AS YOU GO / RESUME ON ANY DEVICE`. Behind
it, the field was rebuilt for paper: a fine drafted mesh in slate ink at 10%,
a third pass of long chords that resolve only where attention is strongest, and
the gold reduced to a narrow travelling band. On white, a glow reads as smudge,
so the tech feel now comes from precision (hairlines, numeric metadata, tight
6px radii, a real key-cap hint) rather than from a dark screen.

**"The colors should be like the Operations system with a lighter background."**
The whole surface was rebuilt on the `/operations` palette, read from
`OperationsShell.tsx` and `OperationsUI.tsx` rather than approximated:

| Token | Value | Where Operations uses it |
| --- | --- | --- |
| Paper | `#F5F7FB` | the Operations page background |
| Surface | `#FFFFFF` on `#E2E8F0` hairlines | Operations panels and metrics |
| Gold | `#D8A932`, tint `#FFF7DF`, ink `#7A5200` | Operations brand tile, active nav, badges |
| Navy | `#0B1220` / `#1C2E4A` | Operations sidebar and persona |
| Labels | Rajdhani 700 uppercase, `0.16em` | every Operations micro-label |
| Body | Inter | everything readable in Operations |

An applicant and an operator are now looking at the same product. The previous
pass was dark; that is gone.

**"Make the three works look like products or apps."** Kitchen Table Gospel, the
Discipleship Operating System and Mission of Reconciliation are now a product
suite: four cards, each with its own drawn mark on a solid accent tile, a
category line, the name, and a one-line descriptor. The marks are geometry on a
24-unit grid in `ProductMarks.tsx`, and each says what the work is:

| Work | Category | Mark | Accent |
| --- | --- | --- | --- |
| Kitchen Table Gospel | Evangelism | people seated around a table | `#D8A932` |
| Discipleship Operating System | Platform | one disciple branching into many | `#1C2E4A` |
| Mission of Reconciliation | Restoration | two halves brought back together | `#0F9D76` |
| And growing. | Next | an open slot, dashed | `#94A3B8` |

"And growing." stays a member of the set rather than a caption, and is drawn as
a slot rather than a thing, so the list still reads as open.

**Typeform pacing, properly this time.** The step and section model is now
compiled into a flat list of 42 pages, one question to a page. A narrative
question owns its screen with the question set as the heading and no second
label above the box. A run of short factual fields inside one section stays
together, so an address is one screen rather than four. Enter advances;
Cmd/Ctrl+Enter advances from a long answer; number keys answer a choice screen.
The index line reads `STEP 2 OF 7 / YOUR STORY / 07 OF 42`.

---

## 2. What carried over from the benchmark

Stewardship.Capital was read as source, not as a screenshot. What transferred is
craft, not branding: a canvas field carrying the product's core metaphor, masked
line reveals, display type set to fill its measure, restraint, and design
rationale written into the stylesheet as comments.

Deliberately not copied: Stewardship's graphite and orange palette, its Archivo
type, its wordmark, its lattice artwork, and its copy voice.

The artwork is USAM's own. Stewardship's field is a lattice of entrusted points
that activate under a cursor. `MovementField.tsx` instead propagates a *send*
outward hop by hop through a proximity graph, so the accent only ever appears on
a point the movement has actually reached. Different mechanism, different idea:
a movement spreading person to person, which is what USA Missionaries does.

---

## 3. Screenshots

Desktop 1440×900 and mobile 390×844, both at 2× DPR, captured from a production
build. Same numbering in `desktop/` and `mobile/`.

| File | Screen |
| --- | --- |
| `00-founder-gate` | Access gate (only visible when `JOIN_PREVIEW_ACCESS_KEY` is set) |
| `01-welcome` | The opening, as first seen |
| `01b-welcome-full` | The opening scrolled, showing the full ecosystem reveal |
| `02-about-identity` | Step 1, identity |
| `03-about-couple` | Couple model expanded |
| `04-about-household` | Mixed short/long section |
| `05-story-longform` | Long-form room |
| `06-support-path` | Branch point, unanswered |
| `07-support-path-chosen` | Branch point, answered |
| `08-support-worksheet` | The private 17-category worksheet |
| `09-support-picture` | Budget / need / covered / gap, and the four separate money values |
| `10-profile-photos` | Private photo upload |
| `11-review` | Review with outstanding questions |
| `12-review-complete` | Review, everything answered, disclosures confirmed |
| `13-submitted` | Submitted |

On desktop the opening is tuned so the product tiles break the bottom edge,
which is what invites the scroll. On mobile that happens naturally.

**How the evidence was made:** `scripts/usa-191-preview-capture.mjs` drives the
whole flow end to end and can regenerate every image. The draft and application
API calls are stubbed **in the browser**, not in the app: a capture host has no
Supabase credentials, so without stubs every screenshot would show a save-retry
state that exists nowhere but the capture box, and the submitted screen could
not be reached at all. Nothing else about the page is altered.

---

## 4. Verification

| Check | Result |
| --- | --- |
| `npm install` | clean |
| `npm run typecheck` | pass |
| `npm run build` | pass |
| `npm run test:join-guided` | **pass** (32 assertions) |
| `npm run test:join-contract` | **pass** (24 assertions) |
| `npm run test:join-v2-release` | **pass** (Phase A static + Phase B served) |
| `npm run test:join-email-em-dash` | **pass** |
| `npm run test:join-resume-email-idempotency` | **pass** |
| `npm run test:dos-group-join-request-notification` | **pass** |

All USA-167 protections verified intact: nine-section IA, couple model,
save/resume, private uploads, canonical Operations ingress, the 17-category
worksheet, the three separate money values, the overflow acknowledgement,
email idempotency, founder gate, and no DOS provisioning before acceptance.

### Two pre-existing failures, not from this branch

- `npm run test:usa-174-launch` crashes reading
  `app/join/usam/UsamJoinClient.tsx`. **That file does not exist on `main`
  either** (`git cat-file -e main:app/join/usam/UsamJoinClient.tsx` fails), so
  this gate has been broken since the USA-167 rebuild removed the file. Left
  alone: fixing it means rewriting another ticket's gate.
- `npm run smoke` cannot launch Chromium in this sandbox (Playwright expects
  build 1228, the image ships 1194). Environment, not code.

---

## 5. Two changes that need your explicit sign-off

**a. One line of the USA-167 release gate was narrowed.**

`scripts/join-v2-release-regression.mjs` forbade the served `/join` from
containing any of six DOS markers, one of which was the literal string
"Discipleship Operating System". That marker was written when `/join` actually
rendered the DOS setup wizard, and the product name was the cheapest way to
detect that screen.

USA-191 requires naming the Discipleship Operating System as one of the works an
applicant is joining, which is the *opposite* of routing them into DOS
onboarding. The two requirements were in direct conflict.

Rather than weaken the gate, it was made more precise:

- all five setup-wizard markers ("Start Setup", "Join DOS", "Set up DOS",
  "favicons/dos", "Discipleship on the go") remain **absolutely forbidden**;
- the bare product name is still forbidden in `app/join/page.tsx` and is still
  what proves `/dos/setup` kept its identity;
- two **new** assertions were added: `/join` must offer no link into
  `/dos/setup` or `/dos/onboarding`, and `/join` must name all three works.

Net effect: the gate now actively protects the USA-191 requirement instead of
contradicting it, and still fails if the wizard ever returns. The ecosystem names
live in `app/join/ecosystem.ts` rather than in the route file, specifically so
the route-level check keeps reading exactly what it was written to read.

**b. A real submission bug was fixed along the way.**

`submitApplication` bailed with "Save your application before submitting."
whenever the resume token in component state was still `null`. Autosave is
debounced 1500ms, so an applicant who filled the application quickly and clicked
Submit could hit this on a valid, complete application. It reproduced reliably
during capture.

The submit path now uses the token returned by its own save call rather than the
possibly-stale one in state. Same request shape, same idempotency guarantees,
same endpoint; it just no longer depends on a race. `test:join-resume-email-idempotency`
still passes.

A minor correctness fix rode along: identity inputs had ids containing a space
(`id="About you-firstName"`), which is invalid HTML and unaddressable by an id
selector. They are now keyed on the person (`applicant-firstName`).

---

## 6. Not done, by instruction

Not merged. Not deployed. No production `JOIN_PREVIEW_ACCESS_KEY` changed, no
resume links sent, and no Vercel deployment created.
