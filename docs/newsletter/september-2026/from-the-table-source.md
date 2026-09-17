# "From the Table" — source and permission status

**Status: PERMISSION UNVERIFIED. The story is out of every public render.**

`src/lib/communications/september-2026-sections.ts` seeds the `ktg-story`
section **hidden and empty**, and the seed migration carries it that way into the
record. Nothing about the woman in the reflection is in the repository, the
Operations record, the preview route, or any sendable HTML.

## The source document

`Kitchen Table Reflection - People.pdf` was received and read.

| | |
|---|---|
| Planning Center form | **1115723** — "Kitchen Table Reflection" |
| Submission | **45980998** |
| Submitted | **15 September 2026, 10:03 am** |
| Exported | 17 September 2026, 4:36 pm |
| URL on the export | `people.planningcenteronline.com/forms/1115723/submissions/45980998` |

This is **not** the May reflection found earlier (form 1199861, submission
42200110, "2 Minute Reflection (After Coffee)", `share_permission = 'private'`).
That row's declined permission has not been applied to this submission, and the
two are unrelated.

The reflection contains the participant's **name**, her **email address**, and a
specific, sensitive **personal disclosure**. None of it appears in this
repository, and none of it may be published under any permission short of one
that explicitly covers it.

## What the PDF establishes, and what it does not

It establishes the content. It does **not** establish the permission.

Page 2 prints the privacy paragraph and then **both** permission statements, one
after the other:

> I give permission for USA Missionaries to share my testimony publicly (written
> or verbal) in an anonymized form.

> I give permission for USA Missionaries to share my testimony publicly with my
> name included.

The export was examined at the PDF drawing level, not just as text, to see
whether the selection survived the print:

| Checked | Result |
|---|---|
| Text layer | Both statements present, identical styling, same left margin, no marker glyph before either |
| Background rectangles | Two, at y=1659 and y=1722 — same 600pt width, same white fill, no highlight on either |
| Checkbox or tick vector paths in that band | **None** |
| Image XObjects in that band | None (the file's one image is elsewhere) |
| Form fields / AcroForm | **None** — the file has no interactive fields |
| Annotations carrying a state | None |

**The selection state was not captured in the export.** The PDF prints the two
option labels whether or not either was chosen, so it cannot tell us which was
selected — or whether either was. As instructed, no consent has been inferred
from the text.

## Why it could not be verified here

The original submission has to be read in Planning Center. This session cannot
reach it:

- No `PCO_APP_ID` or `PCO_SECRET` in this environment, and no `.env` file.
- The codebase's Planning Center client covers People and Giving only; it has no
  Forms endpoint, so there is no existing code path to a submission's answers.
- Neither form 1115723 nor submission 45980998 has been imported into the
  production database. The only imported reflection is the May one.

Pulling production Planning Center credentials out of the deployment to query a
third party for a private submission is not something to do unasked, so it was
not done.

## What needs confirming — exactly

In Planning Center, open
`people.planningcenteronline.com/forms/1115723/submissions/45980998` and read the
**Sharing Permission** answer. Then record it here:

```
Form:        1115723
Submission:  45980998
Selected:    anonymous | with_name | neither
Read by:     <name>
Read on:     <date>
```

Then one of three things happens:

| Selected | What may publish |
|---|---|
| **Anonymized** | The story with **no** name, no photograph, and no detail that identifies her. Her specific disclosure still needs its own judgement: "anonymized" covers identity, not sensitivity. |
| **With name included** | The name may appear. A photograph and the specific disclosure each still need separate, explicit confirmation — a name permission is not an image permission and not a disclosure permission. |
| **Neither / cannot be determined** | Nothing publishes. The section stays hidden, and the issue ships on 02's model copy, the men's update, and the invitation, which is exactly how it renders today. |

Because the disclosure is sensitive and the form was submitted two days before
this draft, ask her directly before the send even where the checkbox permits it.
A form checkbox is weaker consent than a conversation.

## How the code enforces this

`normalizeNewsletterSections` will only carry a story when **all** of these hold:

1. there is text;
2. `permission` is `anonymous` or `with_name` — there is no `private` member, so
   a declined permission cannot be represented at all;
3. the attribution matches the permission's scope: `anonymous` must have none,
   `with_name` must have one;
4. a `source` is recorded — form id, submission id, who verified it, and when.

Anything short of that and the story is dropped rather than reconciled. On top
of that, `evaluateSendReadiness` blocks the send while a visible story section
has no verified story, so an issue cannot go out hollow by accident either.

## The pull quote

> "The Kitchen Table was our first encounter of ministry, but it certainly was
> not the last."

**Held.** A verbatim quotation needs the verified permission *and* Ryan's
approval of the exact wording, separately. It is not in the fixture or the
record.

## The private review mockup

`review-only/story-mockup.json` holds Ryan's own de-identified draft, used only
to lay out and measure the private review render. It is outside `src/` so no
route can import it, outside the record so it cannot reach a preview or a send,
and a regression check fails the build if it appears in anything sendable.
