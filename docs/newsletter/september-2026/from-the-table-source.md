# "From the Table" — source and permission status

**Status: BLOCKED. The story is not written, and must not be written from memory.**

`src/lib/communications/proposed/september-content.ts` holds `table.story = null`
for this reason. The section renders without it. Nothing has been invented to
fill the gap.

Two independent things are missing. Either one alone is enough to hold it.

## 1. The source document did not reach this session

The editorial brief names **"Kitchen Table Reflection - People.pdf"** as the
source. That file is not present anywhere this session can read:

| Checked | Result |
|---|---|
| The repository working tree | Not present |
| Every `*.pdf` on the container filesystem | 15 files, all USAM guides, DOS screenshots, or a skill example. None is this file. |
| Supabase Storage, all buckets | 7 PDFs, all in `partners-documents` (bylaws, EIN, IRS determination letter, and similar). None is this file. |
| The session's own upload directory | Empty |

The reflection therefore has to be re-attached before the story can be drafted.

## 2. The sharing permission on record says private

The brief asks that the selected sharing permission on the original Planning
Center submission be verified before publishing any version of the story. It was
checked. The result does not clear publication.

Exactly one Planning Center reflection has been imported into the production
database (`dos_meeting_reviews`, the row created by migration
`20260910150000_dos_person_feedback_import.sql`):

| Field | Value |
|---|---|
| Source system | `planning_center` |
| Form | `2 Minute Reflection (After Coffee)` (form `1199861`) |
| Submission | `42200110` |
| Submitted | 2026-05-13 |
| Attached to | A Person, not a meeting |
| **`share_permission`** | **`private`** |
| Narrative content | One field, `stood_out`, 55 characters. Every other response field is empty. |

The permission vocabulary for this form is fixed by
`supabase/migrations/20260513190000_dos_quick_reviews.sql` to exactly three
values: `anonymous`, `with_name`, `private`. On the participant-facing form
(`app/mission/MissionReviewCTA.tsx`) `private` is the option labelled
**"No, please keep my story private."**

`private` is not "share it without her name". It is the option that declines
publication. De-identifying it does not convert it into consent, so the
instruction to "draft without her name for now" cannot be carried out against
this record: there is nothing here that may be drafted from, named or unnamed.

## What this does and does not establish

It establishes that **no reflection currently in USAM systems may be published
in this issue.**

It does not establish that the PDF and this database row are the same
submission — the form names differ ("Kitchen Table Reflection" versus "2 Minute
Reflection (After Coffee)"), and this row's 55 characters of narrative are far
too thin to be the source of a main ministry story. The likeliest reading is
that the PDF is a **different** Planning Center submission that was never
imported. If so, its permission is unknown and still has to be read off the
submission itself.

## To unblock

1. Re-attach `Kitchen Table Reflection - People.pdf`.
2. In Planning Center, open that submission and read the answer to its sharing
   question. Record the form ID, submission ID, and the selected value here.
3. Only if that value permits publication, draft `table.story`, at the scope the
   value allows and no wider:
   - `anonymous` → no name, no photograph, no detail that identifies her.
   - `with_name` → name permitted; photograph and specific disclosures still
     need their own explicit confirmation, since a name permission is not an
     image or disclosure permission.
   - `private` → nothing publishes. The section ships on its frame and
     invitation, exactly as it renders today.
4. If publication is permitted but the disclosure is sensitive, ask her directly
   before the send. A form checkbox from May is weaker consent than a
   conversation in September.

## Budget when it is written

Roughly 600–900 characters, two or three paragraphs, sitting between the
photograph and "Your table is enough.":

1. What happened at the gathering.
2. How Ryan and Brooke kept caring for her afterward.

The invitation that follows it is already written and already carries the
section, so the story does not have to do the closing work as well.
