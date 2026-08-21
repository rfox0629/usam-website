# DOS Library navigation prototype (DISPOSABLE)

Route: `/dos/library-preview`

Founder UX review only. Not production, not linked from any nav, `noindex`.
**Delete this entire folder when the review is finished.** Nothing outside this
folder was modified.

## What it demonstrates

`LIBRARY -> RESOURCE -> CONTENT` with one shared Resource shell:

    <- Library
    RESOURCE TITLE
    subtitle / metadata pills / primary actions
    ------------------------------------------
    resource-specific content

Every Library row and Journey card opens through that same doorway. The content
underneath stays appropriate to its type - Remnant still feels like video,
the assessment still feels like an assessment, Tozer still feels like a Journey.

## Real content, new shell

Imported from production data modules (not copied):

- `src/lib/dos/resource-catalog.ts` - all Library rows, Journey sessions, assessment questions
- `src/lib/dos/prayer-resources.ts` - all 18 prayers, categories, attribution
- `src/lib/remnant/content.ts` + `app/dos/library/remnant/RemnantVideoEmbed.tsx` - Remnant

New in this folder only:

- `four-questions-content.ts` - the Four Questions PDF transcribed as native DOS
  teaching content. If this direction is approved it belongs in the resource
  catalog under `resource.content`, not here.
- `PreviewAssessment.tsx` - the existing Marriage Assessment UI with its own page
  chrome removed so the shared shell owns the header and Back. The interaction
  itself is unchanged.

## Prototype controls (black strip at the top)

- **In resource: Bottom nav / Focused** - compare keeping the DOS tab bar visible
  inside a resource vs. a focused full-screen resource.
- **Prayer: Back only / Breadcrumb** - compare a single contextual Back at depth 2
  vs. a `Library > Prayer Resources > Prayer` breadcrumb.

## Deliberately different from today

- No floating `+` button in Library.
- No repeated blue `OPEN` text - the row and chevron carry the affordance.
- No `Back to DOS`. Back is always the contextual parent (`Library`, or
  `Prayer Resources` one level deeper).
- Library scroll position is restored on Back.
- Journeys use one card component (14 Days and Tozer are the same component).
