# USA-244 follow-up — the Household-only save bug, one Add/Edit form, and the reminder audit

Branch `ryan/usa-244-person-form-consistency` from `main` 29585ab. Read-only diagnosis first; no production record was modified.

## 1. Why "Save Person" did nothing

**Reproduction case: Skylar Gaffney** (`c2f7abe2-…`, Ryan's workspace). Read-only production facts:

| Fact | Value |
|---|---|
| `field_visibility` | `primary` (Active person) |
| `phone` | `""` (empty string, not null) |
| `email` | null |
| `created_at` / `updated_at` | identical, `2026-09-07T04:20:22.913577Z` |

`updated_at` still equals `created_at`, so **no UPDATE has ever reached that row**. This was not a value that saved and reverted, and not a cache or refresh problem. The write never happened. Two independent defects stacked, either of which alone would have stopped it.

**Defect A — the browser refused to submit, silently.** Edit Person keeps collapsed sections *mounted but hidden* (correct: it is what lets a collapsed section still submit its values). The Mobile Phone input was unconditionally `required`. Opening **Relationship** to change List visibility collapses **Basic information**, so at the moment of Save the form contained a `required`, empty, `hidden` input. HTML constraint validation fails on it, and because the control cannot be focused the browser cannot show its message: no request, no error, nothing. Demonstrated directly in both engines:

```
chromium: old markup valid=false submitted=false | fixed markup valid=true submitted=true
webkit:   old markup valid=false submitted=false | fixed markup valid=true submitted=true
```

**Defect B — the server rejected the write anyway.** `PATCH /api/dos/app/people` required a non-empty phone:

```ts
if (!workspaceId || !isUuid(id) || !name || !phone) {   // 400 "Name and phone are required."
```

`POST` (create) has only ever required a name, and the household sync creates spouses and children from a name alone. So the app creates records it then refuses to let you edit. **28 of the 73 people in the founder's workspace have no phone** — every one of them was uneditable, not just Skylar. Had Defect A been fixed alone, the save would have failed with a 400 whose message renders at the *top* of a long form, out of sight of the sticky Save button at the bottom.

**Everything else on the path was already correct** and was ruled out rather than assumed: the dropdown maps "Household only" → `secondary`; visibility travels as an always-mounted hidden input, so a collapsed section cannot drop it; the payload sends `fieldVisibility`; the route writes `field_visibility` on both create and edit; the read-mapper returns the stored value; the three stored values are unchanged. Relationship stage and context are separate columns and are untouched by a visibility change.

### The fix

- **Server:** `PATCH` now requires only a name, matching `POST`. An edit never demands a field the record was allowed to be created without.
- **Client:** Mobile Phone is `required` when **adding**, optional when **editing**. The required marker follows the same rule.
- **Safety net for the whole class:** any invalid control inside a collapsed section now opens that section, focuses the control and lets the browser explain, instead of blocking Save with no feedback. Sections carry `data-person-section` so an invalid control can be traced back to its owner.

### Verified

- Round trip on a local PostgreSQL with the production people schema, on a row shaped exactly like Skylar (no phone): Active person → **Household only** → Active person → Private all persist, and `relationship_type` / `relationship_context` / `role_in_my_life` are unchanged by a visibility write. An invalid value is still rejected by the column constraint.
- In-browser, 7 widths in Chromium and 2 in WebKit: choosing Household only sets the submitted value to `secondary`, the form now validates with an empty phone, and Save reaches the submit handler.

### What is still needed to close it end to end

The demo route is deliberately DB-free, so a real save cannot be exercised there, and the founder's instruction was not to modify Skylar's production record. **Controlled verification plan, for founder approval:** on production, open Skylar Gaffney → Edit → Relationship → List visibility → **Household only** → Save. Expect: return to Skylar's record, a brief confirmation, and Skylar behind the household toggle in People. I will then confirm `field_visibility = 'secondary'` and a fresh `updated_at`, and re-check after a reload and a new session. Reverting is one edit back to Active person. Nothing else in the record changes.

## 2. One Add/Edit structure

Add Person's single oversized "Add more details" expansion is gone. Both forms now render **one shared section list** — same components, labels, summaries, spacing and field locations:

1. Basic information (open by default) · 2. Relationship · 3. Household · 4. Details · 5. Reminder (Add only) · 6. Notes

One optional section is open at a time. Collapsed sections stay mounted, so every value still submits. The short Add path is unchanged in spirit: name, phone, email, then the connection questions one section down, then **Add person**.

The reminder shortcut stays on Add only, where a birthday or surgery date is actually in hand; on Edit, reminders live in the person's own reminder list. It sits at position 5 so the order matches on both forms.

## 3. The person stays named while editing

`DosWorkflowPage` takes an optional `identity`. Edit Person now shows a compact sticky header — eyebrow **Edit Person**, then **Skylar Gaffney** — one row, below the safe area, above the content and below the sticky save action, so it covers neither a dropdown nor Save. The action reads **Save Skylar** when a first name is available, otherwise **Save person**.

## 4. Engagement Level

Moved into **Relationship** on both forms, after the connection questions and List visibility. The separate "Advanced" section is gone from these forms. The Engagement Levels Advanced Feature still decides whether the control renders at all; nothing about the stored value or permissions changed.

## 5. Reminder audit, then the redesign

Traced before touching any label. What each control actually did:

| Control | Stored | Real effect |
|---|---|---|
| Tag | `reminder_type` (`prayer` / `anniversary` / `custom`) + notes metadata; prefixes the title for custom types | Real |
| Repeats | `recurrence` column | Real: yearly recurrence |
| Reminder timing | notes metadata only | **None.** Never moved the date, never scheduled anything earlier. "1 week before" was decoration |
| Show on Dashboard | notes metadata, read by `reminderShowsOnDashboard()` | Real: gates Upcoming/Dashboard |
| Send to app → Person Timeline only | nothing extra | Always recorded on the person |
| Send to app → Prayer | forces `reminder_type = "prayer"` | Lists it with prayer reminders. **Creates no prayer request and notifies nobody** |
| Send to app → Calendar | `google_sync_enabled` when Google is healthy | Real: syncs to Google Calendar |

So the answer to the specific question: **"Send to app: Prayer" merely categorises the reminder.** It does not create a prayer item and does not send anything to another person. The label implied otherwise, which is why it is gone.

The redesign, showing only what the system supports:

- Short path unchanged in length: **Title**, **Date**. Everything else behind **More reminder options**.
- **Where should this appear?**
  - *Person timeline — always recorded here.* (a statement, not a choice)
  - **Show in Prayer** — "Also lists it with your prayer reminders. Nothing is sent to anyone."
  - **Add to my calendar** — "Also adds it to your connected Google Calendar on that date." Disabled, with the reason, when no calendar is connected.
  - **Remind me on the Dashboard** — "Shows in Upcoming on your Dashboard as the date approaches."
- Prayer and Calendar are independent underneath (`reminder_type` vs `google_sync_enabled`), so they are independent toggles rather than one either/or. Both can be on.
- **Reminder timing was removed**, not relabelled: it promised a lead time nothing delivered. Its stored values are still parsed so existing reminders keep loading. Implementing a real lead time is a separate, honest piece of work.
- The stored metadata keeps its existing shape, so reminders saved before this change still parse.

## 6. Verification

`npm run typecheck` · `npm run test:dos` (53 scripts, including the new `test:dos-person-form-consistency`) · `npm run build` · `npm run smoke` · `npm run test:usa-168-person-ui` — all pass. Three older scripts that pinned the previous Add layout, the Edit-only reminder placement and the Advanced section were updated to the newly approved structure rather than deleted.

Browser verification at **320 / 360 / 375 / 390 / 430 / 768 / 1440 in Chromium and 375 / 390 in WebKit**, 0 failures: sticky identity header; Save Skylar; section order on both forms; Relationship holding both connection questions, List visibility and (when enabled) Engagement Level; opening Relationship collapsing Basic; Household only submitting `secondary`; the form validating with an empty phone; Save reaching the handler; the oversized Add disclosure gone; phone still required when adding; the reminder copy; and no horizontal overflow on either form.

A demo person with no phone (**Skylar Gaffney**) was added to the preview fixture so the reproduction case is one tap away in the founder preview.

## 7. Not done here

- No production record was modified. The controlled plan in §1 awaits approval.
- Reminder lead time is not implemented; the unsupported control was removed rather than left implying a promise.
- Add Person still requires a phone. Loosening creation to "phone or email" is a product decision, not part of this bug, and duplicate detection leans on phone.
