# USA-191 founder review package

Redesign of `/join` as a Typeform-style "Welcome to the Team" experience, built on
top of the USA-167 application without changing its backend, data contracts or
validation.

Nothing here is merged or deployed. This is for review.

- Branch: `claude/usa-191-join-refinement-tfvv5p`
- Benchmark studied: `rfox0629/stewardship.capital` @ `55630f3`

---

## 1. What the benchmark actually taught

Stewardship.Capital was read as source, not as a screenshot. The transferable
craft turned out to be six things, none of them Stewardship's branding:

| Principle in the benchmark | How USA-191 uses it |
| --- | --- |
| Dark foundation, **one** accent that only ever marks what has been activated | USAM near-black `#0D0D0D` with USAM gold `#C2A14E`. Gold marks answered steps, the current step, a chosen option, a reached point in the artwork. Never decoration. |
| Masked line reveals (`translateY(105%)` out of a clipped box, staggered) | The same technique, USAM timing. Headings arrive as composed sequences rather than as elements fading independently. |
| A bespoke canvas field carrying the product's core metaphor | A new one built for USAM (see below). Same discipline: Canvas 2D, zero dependencies, DPR aware, static frame under reduced motion. |
| Very large display type, tight tracking, near-1.0 leading | Oswald, already USAM's display face, set far larger than `/join` has ever used it. |
| Restraint: no cards, hairlines instead of borders, 3px radii | Card soup removed entirely. Questions sit on the page. |
| Design rationale written into the CSS as comments | `app/join/join-experience.css` explains why each decision was made. |

**Deliberately not copied:** Stewardship's graphite/orange palette, its Archivo
type, its wordmark, its lattice artwork, and its copy voice.

### The artwork is USAM's own

Stewardship's field is a *lattice of entrusted points* that activate under
attention. Copying it would have been the obvious move and the wrong one.

`app/join/MovementField.tsx` paints **The Movement** instead: a scattered field
of people, mostly latent. Every few seconds one is *sent*, and the light
**travels** outward hop by hop along real proximity connections. It is a
different mechanism (wavefront propagation through a graph, not a radial
falloff) expressing a different idea: a movement spreading person to person,
which is what USA Missionaries does. Gold only ever appears on a point the
movement has actually reached.

---

## 2. What changed in the experience

**The opening.** `/join` used to open with a heading and four paragraphs of
administrative preamble. It now opens full-screen on "Welcome to the team," with
the movement behind it, and the ecosystem revealed in sequence underneath:
Kitchen Table Gospel, Discipleship Operating System, Mission of Reconciliation,
and **And growing.** The fourth is styled as a member of the list, not a caption
under it, and is the only one with a lit node, because it is the line the
applicant might become. Everything the old preamble said about review, privacy
and saving is still said, in two lines instead of four paragraphs.

**The application.** One section is now one screen. USA-167 already modelled
steps → sections → fields, so the guided spine was preserved exactly and only
its presentation changed:

- sticky chrome carries the step rail, live save state and "Email me a link", so
  the body below can be nothing but the current question;
- a fixed advance bar means Continue is always reachable without scrolling;
- Enter advances from a single-line field; inside a textarea Enter stays a
  newline (Cmd/Ctrl+Enter advances) because these are the long answers the
  application exists to collect;
- long-form answers get 200px minimum, 280px for the narrative questions;
- forward and back replay different transitions, so back does not read as
  forward;
- grouped substeps were kept. Tiny fields were **not** split onto separate
  screens to imitate Typeform.

**Consistency fix.** The rest of usamissionaries.org is dark (`bg-usam-black`,
Oswald/Rajdhani). `/join` was the one route forcing a light gradient over it via
a `body:has()` override. That override is gone, so the application now sits in
the site's own visual language rather than fighting it. The mobile browser chrome
colour was updated to match.

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

On desktop the opening is tuned so the first ecosystem row breaks the bottom
edge, which is what invites the scroll. On mobile that happens naturally.

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
