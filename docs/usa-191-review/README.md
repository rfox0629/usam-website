# USA-191 founder review package

The Welcome experience rebuilt to the approved reference image, on top of the
USA-167 application without changing its backend, data contracts or validation.

Nothing here is merged or deployed. This is for review.

- Branch: `claude/usa-191-join-refinement-tfvv5p`
- Reference: the attached approved comp (cream / black-navy / USAM gold, dotted
  US with a watershed, "Part of something greater")

---

## 1. What changed in this pass

**The spiderweb is gone.** It has been replaced by the dotted United States and
the real Mississippi watershed.

The geography is real, not invented. `watershed-data.ts` carries the lower 48
traced as a polygon, Lake Michigan cut out of it as a hole, and **43 real
rivers**: the main stem from Lake Itasca in Minnesota down past Baton Rouge and
New Orleans to the Gulf, with the Missouri, Ohio, Arkansas, Red, Tennessee,
Platte, Illinois, Cumberland, Wabash, Yellowstone, Kansas, Canadian, Cimarron,
Allegheny, Monongahela, Kanawha, Niobrara, James, Republican, Neosho, Washita
and the rest joining it where they actually do. Everything is drawn through an
Albers equal-area conic, the standard projection for a map of the United States,
so the country reads correctly rather than as a stretched rectangle.

Each river declares the river it empties into. The renderer splices a
tributary's course onto the rest of its parent's course all the way to the sea,
so a drop of light entering the Yellowstone in Wyoming runs the Yellowstone,
then the Missouri, then the Mississippi, and leaves past New Orleans. That is
the motion: **many streams, one river.** Light travels downstream rather than
blinking, tributaries visibly feed larger tributaries, the channel widens and
the light brightens and accelerates as it goes, and the pointer gently wakes
whatever is near it. It moves on its own when nobody touches the mouse, and
`prefers-reduced-motion` gets a single composed still frame.

Weights are deliberate: the country's dots are stronger than the streams so the
silhouette reads first; tributaries are thin; the Mississippi thickens
downstream without ever becoming a glowing stripe. One gold tonal family
throughout, no second accent, no blue.

**The hero matches the reference.** The app tile and the `APPLICATION / 9
SECTIONS / ABOUT 30 MINUTES / ...` strip are both gone. The top line is
`USA MISSIONARIES` left and `MISSIONARY APPLICATION` right, and nothing else.
The large WELCOME TO THE TEAM. type, the gold rule under it, and the spacious
composition are kept. The atmospheric mountain photograph
(`missionary-mountain-background-v2.png`, already in the repo) sits behind the
lower portion of the page, masked to nothing at the top and held under half
opacity so it gives depth without competing.

**Part of something greater.** Centred label with a gold rule, four cream cards
with thin gold line marks in rings, centred copy, and the exact wording from the
reference. **No category labels** - the EVANGELISM / PLATFORM / RESTORATION /
NEXT line from the previous pass is removed. The cards are translucent so the
landscape carries through them, which is what keeps the section part of the page
rather than four SaaS tiles sitting on top of it.

**Palette.** Cream `#FAF7F1` paper, `#FDFCF9` surfaces on warm `#E7DFD0`
hairlines, `#16202E` black-navy ink, and gold `#C9A227` with `#8A6A16` for gold
text. Applied across the whole join experience, not only the Welcome screen, so
there is no seam when an applicant starts the application. Flagging that as a
judgement call: the previous pass used the cooler Operations greys, and this
reference is warm.

---

## 2. What was preserved

Untouched: the USA-167 nine-step model, the couple flow, save and resume, the
private 17-category worksheet, the three separate money values, the overflow
acknowledgement, the canonical Operations ingress, email idempotency, the
founder gate, and the guided Typeform-paced application built in the previous
pass. No request shape, validation rule or data contract was altered.

---

## 2b. Visual review pass, and the six defects it found

Reviewing all eight screens at 1440 and 390 turned up six real defects. All are
fixed.

1. **Body copy on the submitted screen rendered light grey.** The root cause was
   a cascade collision, not a colour choice: `globals.css` carries the site's
   dark-surface readability pass, including `:where(p, li, dd) { color: #d1d5db }`.
   That selector has no specificity, but it matches the paragraph itself, and a
   rule that matches an element always beats a colour the element would
   otherwise inherit from its container. Measured on the rendered pixels: the
   heading at `rgb(22,32,46)`, the body at `rgb(209,213,219)`. Restoring
   inheritance for paragraphs inside `.join` fixed it; the body now measures
   `rgb(35,46,62)`. Worth noting the first diagnosis was wrong, and a scrim
   added on that assumption left a visible rectangle; measuring the pixels
   rather than trusting the screenshot is what found the real cause.
2. **The step rail overflowed at 1440 and chopped mid word** ("SUPPORT AND FU").
   Seven full step titles plus the wordmark, save state and resume link needed
   about 1330px inside a 1200px shell. The rail now carries short wayfinding
   labels; the full title stays the accessible name.
3. **The identity step asked for Email before First name.** The label map's
   declaration order was its render order by accident. Name now comes before
   contact, and the order is documented as deliberate.
4. **"About you" was labelled twice** on the identity screen, once as the step
   and again as a fieldset legend. The legend now appears only when a spouse
   fieldset exists for it to distinguish.
5. **The index line stranded a separator** at the end of a wrapped line at
   390px. Each separator now travels with the label it introduces.
6. **The required asterisk could wrap onto a line of its own** after a long
   question. It is now bound to the preceding word with a word joiner.

Also confirmed unchanged and correct: the real Mississippi geography, the single
gold family, the subtle downstream flow that gathers into the main stem, ambient
motion with no pointer, cursor proximity, the reduced-motion still frame, the
cream system end to end, the mountain atmosphere anchored to the page, and the
removal of the app/UM tile from both the opening and the application chrome.

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

On mobile the map sits below the call to action at its own size rather than
being squeezed beside the type, and the mountains stay at the very bottom so
the map keeps clean cream behind it.

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
