# USA-281 follow-up: removing a sent assessment

## What was wrong

USA-281 shipped a Remove control and it reached Journey assignments only. On a
People record and on My Record the Marriage Assessment rows, both "Link ready"
and "Completed", had no management control at all. A leader could create an
assessment and had no way to take it back off the record.

The cause is that a sent assessment is not a Journey assignment. It lives in
`dos_resource_share_assignments`, a different table with a different lifecycle,
a public token, and two people whose records both show it. The Journey removal
work in `dos_resource_assignments` could not cover it and did not.

## What removal does

Removal is a soft delete in both cases, because an assessment carries answers
two people sat down and gave. Nothing is deleted, ever.

| | unfinished (`link_ready`, `in_progress`) | completed |
|---|---|---|
| `removed_at` | set | set |
| `status` | becomes `revoked` | stays `completed` |
| `revoked_at` | set | stays null |
| answers (`responses`) | untouched | untouched |
| `dos_assessment_results` row | n/a | untouched |
| public link | dead | dead |
| blocks a new assessment | no | no |

The two shapes are not a style choice. `dos_resource_share_assignments` carries

```
completed_check   (status = 'completed') = (completed_at is not null)
revoked_check     (status = 'revoked')   = (revoked_at is not null)
```

which cannot both hold on one row. A completed assessment therefore cannot be
marked revoked at all, which is exactly why it needs `removed_at` of its own
rather than reusing revocation. That is also why the deployed revoke action
could never have been repurposed for this.

Public access is cut off for both shapes in one place. `loadShareRowForToken`
and `loadDosResourceShareLink` check `removed_at` before they check status, so
a removed **result** is not readable through a link the couple already holds.

The result a removed completed assessment owns is also dropped from the record
read. Without that it would reappear on the Timeline under its own name the
moment its share row stopped representing it, and removal would look like it
had not worked. Both rows stay in the database; `restore` brings both back.

## The confirmation

`window.confirm` is gone from this path. `DosConfirmDialog` in
`src/components/dos/overlays/DosSurfaces.tsx` is now the single confirmation
shell, shared with `DiscardChangesDialog`, so the unsaved-work prompt and a
destructive removal look and behave the same: safe choice first and filled,
destructive choice a deliberate press, Escape and the backdrop both safe.

A couple can hold more than one assessment, so the question names the
participants, the status and the date. A completed one asks its own question
and its button says what it removes.

## Verified by clicking it

Against a real PostgreSQL 16 and a real PostgREST built from this repository's
own migrations, driving the production build in Chromium at 390x844. Every
check below is what the running application did, not what the source says.

28 of 28 browser checks passed:

- both row menus exist, on a Person and in My Record, on unfinished and
  completed rows alike
- the action menu closes when the confirmation opens
- the dialog is the app's own, offers Cancel and Remove, and names the
  participants, the status and the date
- Cancel leaves the row in place
- Remove takes it off the record, and it is still gone after a reload
- a completed assessment asks "Remove these completed results?" and its button
  reads "Remove results"
- the assessment is gone from the other participant's record too
- the completed result does not reappear under its own name
- the New Testament Journey is untouched

At the data layer, after those clicks:

```
completed  removed_at set  status=completed  result_id intact  15 answers  remover recorded
unfinished removed_at set  status=revoked    revoked_at set    responses intact
dos_assessment_results     123/150, 82%, 15 answers, still present
```

Both public links returned "Link no longer active" afterwards, and `save` and
`submit` through either token returned HTTP 410.

A new assessment was then created for both couples, `reused: false` in each
case, so removal frees the slot and does not overwrite the earlier answers.

Permissions: removing another workspace's assessment with this workspace's
credentials returned 404 and left that row untouched; an unauthenticated
removal returned 401; a second removal of an already-removed assessment
returned 404.

## Restore recovers the record, not the URL

Restoring a removal and republishing results to whoever holds the old address
are two different decisions, and one must never silently perform the other. So
public access has a column of its own, `public_access_revoked_at`:

| | `removed_at` | `public_access_revoked_at` |
|---|---|---|
| asks | is this on the record? | does the link still open? |
| set by removal | yes | yes, in both shapes |
| cleared by restore | yes | **no** |
| cleared by | restore | the explicit enable-sharing action only |

The token path refuses any row where `public_access_revoked_at` is set,
whatever its status, so a restored assessment is readable from the record and
unreachable through the link the couple already has.

`enable_sharing` is the only thing that clears it, and it refuses rather than
overriding anything that closed the link in its own right:

| situation | result |
|---|---|
| still removed | 409, restore it first |
| independently revoked | 409, send a new assessment |
| expired | 409, the 90 days are not extended |
| already shared | 409 |
| another workspace | 404 |
| restored completed assessment | 200, link opens again |

An unfinished assessment that was removed is `revoked`, so undoing its removal
never reopens a half-answered questionnaire.

### Verified

Both assessments removed, then restored, with the links probed at each step:

```
            before removal   after removal   after restore
completed   REPORT VISIBLE   LINK OFF        LINK OFF
            save 200         save 410        save 410
            submit 200       submit 410      submit 410
unfinished  questionnaire    LINK OFF        LINK OFF
            save 200         save 410        save 410
            submit 200       submit 410      submit 410
```

Restore returned `{"ok":true,"publicAccessRestored":false}` for both. After it:

```
Brooke Fox + Ryan Fox    completed  back on record  link withdrawn  15 answers  result kept
Dana Reed + Marcus Reed  revoked    back on record  link withdrawn   1 answer   no result
dos_assessment_results   123/150, 82%, 15 answers
```

Through the UI: removing the completed assessment took it off My Record,
restore put it back with its Completed status and View results, and the
results sheet opened from the record showing `123 of 150`, `82%`, all five
category figures, every answer and the Download PDF action, while its public
link stayed off. 9 of 9 checks.

Every guard on `enable_sharing` was exercised and returned the codes above.

## Screenshots

In `docs/dos-ui-refresh/phase-8/screenshots/`, prefixed
`usa-281-assessment-removal-`: the Person record before, its row menu, the
unfinished confirmation, the record after, the record after a refresh, My
Record before, its row menu showing View results and Remove on a completed
assessment, the completed confirmation, My Record after, and the spouse's
record afterwards.

---

# USA-281 follow-up, part two: one Resources section, one Add

## What was overlapping

A journey and an assessment are both a Library resource someone is working
through, and the app split them across two places with two ways in.

| | before | after |
|---|---|---|
| Person record | JOURNEY section, then a separate RESOURCES section | one RESOURCES section: journeys, then assessments |
| My Record | journeys under Current commitments, assessments under Resources | one Resources section; Current commitments is accountability only |
| Add, on a record | two `+ Add` buttons | one |
| Add, floating menu | "Assign journey" and "Send resource" | "Add resource" |
| Person-level pickers | two | one |

The floating menu asked the user to know which internal flow a resource
happens to use before they had chosen a resource. The picker's own groups had
the same problem, so "Send a link" and "Assign a journey" became "Journeys"
and "Assessments": what the thing is, not how it is wired. A group with no
supported resources is not rendered, so no empty category appears, and nothing
that lacks a working flow is offered.

Both entry points open the same sheet, carrying the person it was opened for
all the way into whichever setup follows. On Brooke's record neither path asks
who it is for. Couple wording stays inside the Marriage Assessment setup, and
creating a link still says "Link ready".

This is a presentation change. Every assignment keeps its own group, start
date, progress and notes, and each one opens and removes on its own.

## A collision the browser run found

With Resources holding both kinds of row, the last row on a Person record sat
under the floating action button with no way to scroll it clear: the overlay's
bottom padding was 24px short of the button and the page was not scrollable
past it. Both the Person record and My Record now use the shared
`pb-dos-fab-clearance` token rather than their own ad-hoc values.

A floating button over a scrolling list will cover something at some scroll
offset; that is what floating means. What is checked is that no control is
permanently under it. At 320, 390 and 430, every Resources control on both
surfaces is clear of the button at some reachable scroll position, and at the
bottom of the scroll nothing is covered at all.

## Verified by clicking it

72 of 72 browser checks, plus 8 re-checking that removal still works now the
rows have moved. Both floating buttons are found and measured rather than
assumed; an earlier version of this run reported "no floating button" and
passed vacuously, which was fixed rather than accepted.

Covered: both entry points open the same picker with the same person; the
picker groups by Journeys and Assessments with no empty category and no
Friendship Assessment; cancelling the picker, journey setup and assessment
setup each leave the row count unchanged; journeys appear before assessments
and appear once, with Current commitments reading "Nothing open right now";
the two group journeys are listed separately with their own group, start date
and menu, and removing one names which; unfinished and completed assessments
both still remove; no horizontal overflow at any of the three widths.

After the run, the database showed the completed assessment removed with its
15 answers and its result intact, the unfinished one revoked, both links
returning "Link no longer active", a fresh assessment created with
`reused: false`, and all three journey assignments untouched.
