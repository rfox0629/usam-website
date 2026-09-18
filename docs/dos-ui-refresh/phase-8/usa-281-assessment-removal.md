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

Restore was exercised on the completed assessment: `{"ok":true}`, the row came
back with `status=completed`, its result and all 15 answers, and its results
link served the report again.

## Screenshots

In `docs/dos-ui-refresh/phase-8/screenshots/`, prefixed
`usa-281-assessment-removal-`: the Person record before, its row menu, the
unfinished confirmation, the record after, the record after a refresh, My
Record before, its row menu showing View results and Remove on a completed
assessment, the completed confirmation, My Record after, and the spouse's
record afterwards.
