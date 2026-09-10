# Repeatable meeting outcomes — persistence audit and decision

Audited before any UI change, against production.

## Question: does the current contract already support arrays?

**The database does. The API does. The client did not.**

| Layer | Finding | Change needed |
|---|---|---|
| `prayer_requests` | Already carries `meeting_id`. Many rows can reference one meeting. Each row has its own `status`, `answered_at`, `answer_testimony`, `priority`. | **None** |
| `relationship_reminders` | Already one row per reminder, with its own `title`, `reminder_date`, `google_sync_enabled`, `notes` and `deleted_at`. | **None** |
| `POST /api/dos/app/prayer-requests` | Creates exactly one record per call and honours an `operationId` for idempotency. | **None** |
| `POST /api/dos/app/reminders` | Same. | **None** |
| `runMeetingWorkflow` | Fixed step keys `meeting`, `prayer`, `reflection`, `reminder`: **one of each, by construction**. | Extended additively |
| Log Meeting form | One `prayer_needs` textarea, one `follow_up_note` plus `follow_up_date`. | Replaced with composers |

**Decision: no schema change and no API change.** The limit was never the store; it was the single-value form and the fixed-shape workflow runner. Adding tables or columns here would have invented a second way to record something the database already records correctly.

## Backward compatibility

| Requirement | How it holds |
|---|---|
| An existing single prayer/reminder loads as one item | Each composer seeds its first draft from the old single default (`prayerNeedsDefault`, `followUpNoteDefault` and `followUpDateDefault`). |
| Editing an old meeting does not lose it | That seeded draft is a normal draft: it submits unless the user removes it. |
| Repeated saves do not duplicate records | Every draft carries a uid created with it, used as the write's `operationId`. Both routes already dedupe on that id. A uid cannot shift onto another item the way an index can. |
| Removed draft items create nothing | A removed draft renders no hidden inputs, so it never reaches the reader. |
| Removing an already-saved item | Unchanged: the existing archive/delete policy on `relationship_reminders` (`deleted_at`) and `prayer_requests` still applies from their own surfaces. |
| The meeting save stays atomic | The meeting itself is still one write. Children are attempted after it, and a child failure never reports the meeting as unsaved. |
| Failed saves preserve every entered item and identify which failed | The runner returns `itemFailures` naming each item, and `savedItemOperationIds` so a retry skips what already saved. The surface keeps every draft on screen. |

## One defect this surfaced

`saveTableFollowUpReminder` resolved "the" reminder for a meeting with `tableFollowUpReminderForMeeting`, which returns the first match. With several reminders on one meeting the second draft would have **overwritten the first**. The repeatable path now never reuses a row; idempotency comes from the operation id instead. A regression asserts it.

## Scope

Applied to both surfaces that use the shared capture contract: Log Meeting and Edit Meeting, which are the two `MeetingFormContent` call sites.

**Important date in Add Person is untouched.** It keeps its own metadata shape. A meeting reminder writes only the Upcoming flag, through its own helper, so the two cannot drift into each other: an Important Date is profile information, a Reminder from a meeting is follow-up.
