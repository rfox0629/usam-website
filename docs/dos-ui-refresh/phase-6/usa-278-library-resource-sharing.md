# USA-278 — Library resources reach the people they are for (Marriage Assessment first)

## Problem

The Library's Marriage Assessment detail page offered **Start Assessment**, which
dropped whoever tapped it straight into a questionnaire with "Husband" and "Wife"
score pickers. It never established who the assessment was for, and a completed
assessment had no path back to anyone's People record. People had Journey,
Accountability, Groups and Prayer under Activity, but nowhere to send a Library
resource or see one that had been assigned.

## What this release does

**Library → Marriage Assessment.** The detail page keeps the resource type, title
and explanation, adds *Who it is for* and *How it works*, and leads with two
actions: **Send assessment** (primary) and **Preview assessment** (secondary).
Preview walks the real questions and the real result screen and says plainly that
it saves nothing, assigns nobody and creates no link.

**Send assessment.** A compact flow: pick an existing person with the People
picker, then confirm who is participating. A spouse already linked through the
household is offered first; otherwise the spouse can be an existing contact or
just a name — a first name is enough, no email, no new contact record. On confirm
the assignment and its public link are created, and the result reads **Link
ready**, never "Sent": DOS adds no email or SMS service here, so the sender
delivers the link with Copy link or the native share sheet.

**Couple and household behavior.** One assignment carries two identifiable
participants with separately attributed answers. When both spouses have People
records the same assignment is reachable from either, so there is never a second
submission or a second result. When only one contact exists the spouse's entered
name stays as the participant and the contact can be linked later without losing
responses. Spouse links come from the household model only — the name entered in
the household fields, or a record that names this person back. A shared surname is
never a link. A household connection grants no access to private notes or
unrelated records.

**Recipient experience.** `/dos/resource/<token>` opens without a DOS account and
shows the assessment, who requested it, both participant names, brief
instructions, and who will see the responses. Here **Start assessment** is the
right wording, because this is the recipient's own assigned assessment. All
existing questions and scoring semantics are preserved; each picker is labelled
with the spouse's name and role. Progress persists server-side and resumes on the
same link. Completion is confirmed, and a repeated submission returns the result
that already exists rather than creating a second one.

**People integration.** Activity gains a **Resources** section with an aligned
`+ Add`, and the person's floating plus menu gains **Send resource**. Both open
the same flow the Library opens, with the person preselected. Each row shows the
resource title, participant names, an accurate status (Link ready / In progress /
Completed / Link expired / Link revoked), the relevant date, and Copy link or View
results. Assignment and completion reach the Timeline; draft answers do not.

## Data and access

Additive migration `20260916120000_dos_resource_share_assignments.sql` (with a
rollback beside it). Nothing existing is altered: `dos_resource_assignments`
(Journey) is untouched and completed results still land in
`dos_assessment_results`.

- Workspace-scoped, RLS on, `anon` revoked. The recipient route reaches exactly
  one row through the service role, scoped by token.
- Tokens are 24 random bytes in base64url, expire after 90 days, and are
  revocable. Possession of a token grants the assigned assessment and nothing
  else — no contact records, no notes, no other assignments.
- A partial unique index keeps one open assignment per person per resource;
  completed, expired and revoked rows never block a fresh assessment, so repeat
  assessments stay distinct records.
- Every create, link and revoke proves workspace access and then proves each
  person id in the body belongs to that workspace.

## Resource types and their actions

| Type | Primary | Secondary | Status |
| --- | --- | --- | --- |
| Assessment | Send assessment | Preview assessment | Marriage only for now |
| Prayer / guide / teaching | Share resource | Open resource | Not offered yet |
| Journey (guided resource, reading plan) | Assign Journey | Open | Unchanged |

`dosShareableResourceSlugs` is the single gate: a resource is only offered as
sendable once its whole flow exists, so no dead action is ever put in front of a
leader.

## Inventory and the ordered follow-up

The catalog holds 36 resources: 2 teachings, 11 guides, 2 assessments, 18 prayers,
1 reading plan, 1 guided resource, 1 challenge.

Recommended order for the rest, each a separate change:

1. **Friendship Assessment** (`friendship-assessment`) — identical shape to
   marriage: two participants, 15 questions, 0–10, one couple/pair assignment. It
   reuses this pattern almost unchanged; the work is participant roles ("Friend
   1 / Friend 2"), its own result reading, and moving it off `/guide/...` onto a
   DOS resource page. Smallest next step, highest reuse.
2. **Prayer resources** (18) — a read-and-pray resource, not a questionnaire.
   Needs *Share resource* / *Open resource*, a recipient page that renders the
   prayer text with no answers to collect, and an "opened" state instead of
   scoring. The assignment row and token machinery carry over; the recipient
   experience is new.
3. **Commands of Jesus guides** (9) and the two Relationships guides — same shape
   as prayers (share and open), plus the existing PDF download. Worth doing in one
   change once the prayer recipient page exists.
4. **Table Teachings** (2) — leader-facing conversation flows rather than
   something to hand someone. Recommend leaving them as Library reading unless
   Ryan wants a participant-facing version; they should not get a Send action just
   because the pattern exists.
5. **Journeys** (`marks-of-discipleship`, `new-testament-14-days`) — deliberately
   unchanged. They already have assignment, progress and group behavior; routing
   them through the share flow would be a rewrite, not a reuse.

## Verification

- `npm run typecheck`, `npm run build`, `npm run test:dos` (69 suites).
- `npm run test:dos-resource-sharing` — contract checks over the migration, the
  route guards, the recipient page and the copy rules.
- `npm run test:dos-resource-sharing-behavior` — the send/complete/revoke path run
  end to end against an in-memory stand-in for the workspace database: duplicate
  links, cross-workspace refusals, saved progress, late spouse linking, repeated
  submission, revocation and expiry.
- Screenshots at 390×844 @2x and 1440×900 in `screenshots/usa-278/`.

All verification used synthetic data. No real contact was altered and no
assessment invitation was sent.
