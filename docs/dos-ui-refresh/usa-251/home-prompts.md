# Recommended Home prompts (not built)

Ryan's 2026-09-10 review asked that Home and Reports keep distinct jobs: Reports answers *where is my time going and what is happening through it*; Home tells the missionary *what needs attention today*. The report no longer carries next-action copy, and this revision adds nothing to Home. The prompts below are the ones the report's data could support on Home; each needs its own founder approval (USA-252 owns next-action rules) and none is implemented.

| Prompt | Trigger (from the shared calculation) | Why it belongs on Home, not in Reports | Source of truth |
| --- | --- | --- | --- |
| **Set the relationship for N people** | People with a logged meeting in the last 30 days whose Person record has no confirmed relationship (`rows` where `completeness === "unresolved"`) | It is a task with a single fix on the Person record; the report already shows the consequence (time counted in neither direction) without nagging. | Person structured relationship (canonical) |
| **Add the missing duration on N meetings** | `totals.meetingsMissingDuration` in the last 30 days | A data-entry task; the report marks the row Partial and stops there. | Logged meeting start and end |
| **Confirm "They are discipling me" for Dirk / Marty** | A row whose `directionStatus` is `unconfirmed` (only My Record says so) or `conflicting` | One-time reconciliation the registry (§5.2) already requires; a report should state it, Home should prompt it. | Person record vs My Record |
| **Link a DOS identity for the people you are discipling** | Rows with `downstreamStatus === "not_connected"` | Multiplication can only be read through a verified identity link; the report says "Not connected" and claims nothing. Whether Home should ask for this depends on the identity-link product flow, which is not designed for disciples yet. | `dos_identity_links` (verified) |

Not recommended for Home: anything that ranks people, anything derived from circle placement, and any prompt that infers a relationship from notes, meeting titles, or a legacy summary string. Home's Top Time Investments stays invested-time only and points to Reports.
