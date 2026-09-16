# USA-279: the Marriage Assessment reads as DOS, and sending it is one form

Follows USA-278 (#152), which shipped the Library resource sending experience.
This change is presentation and the sending flow only. No migration, no schema
change, no change to how existing assignments, links, answers, scoring,
permissions or household connections are stored or read.

## The defects this addresses

From the founder's review of the deployed USA-278 screens:

1. The assessment screens did not look like DOS. Blue and gradient
   backgrounds, tinted panels stacked inside cards, cards nested in cards,
   oversized rounded containers, and copy that repeated itself.
2. The detail screen explained the assessment three times over.
3. "Preview assessment" was not a preview. It was the real wizard: a sticky
   Back/Next bar over the content, a completion percentage, an answered-count
   badge, and a back link to the Library root rather than to the assessment.
4. Sending took three stacked questions and two radio cards with paragraph
   explanations to ask what is really one thing.
5. **The first person selected was assumed to be the Husband.** Sending to a
   wife stored her as Husband, and her answers came back under his label.

## The design reference

`src/components/dos/GuidedJourneyUi.tsx` is the established DOS reading
treatment, used by the book studies. This change does not invent a look; it
reuses that vocabulary in a new file,
`src/components/dos/assessments/AssessmentUi.tsx`:

| | |
|---|---|
| page | `bg-white`, one `max-w-[700px]` reading column |
| section | `px-5 pb-6 pt-7 sm:px-6`, separated by hairlines |
| eyebrow | `text-[11px] font-bold uppercase tracking-[0.15em]` |
| title | `text-[27px] font-bold leading-[1.08] tracking-[-0.032em]` |
| body | `text-[15.5px] leading-[1.62]` |
| ink / body / muted / faint | `#0F172A` `#475569` `#64748B` `#94A3B8` |
| hairline / band / warm | `#EAF2FF` `#F8FBFF` `#EBF2FF` |
| buttons | `min-h-[46px] rounded-[11px]`; dock `min-h-[50px] rounded-[14px]` |

`AssessmentPrimitives.tsx` is gone; every assessment surface now draws from
`AssessmentUi`.

The book study reference is at
`screenshots/usa-279/reference-book-study.png`.

## What changed, screen by screen

### Library detail

Three facts, then the questions on hairlines:

- A couple answers 15 questions together.
- Each spouse gives their own scores, as Husband and Wife.
- Their results return to the linked People records.

The long "Who it is for" / "How it works" panels, the duplicated description
and the em dashes are gone.

`before/library-detail.png` · `after/library-detail.png`

### Preview

All 15 questions, grouped, on one scrollable page. No step band, no
Back/Next dock, no percentage, no answered count. Selections are local React
state and are never sent anywhere: the preview branch has no fetch, no
assignment, no draft, no result. It opens under a plain notice,
**"Preview only. Answers are not saved."**, and ends with **Back to Marriage
Assessment**, which returns to the assessment's own detail screen inside the
app (`/dos/app?view=library&resource=marriage-assessment`), not to the Library
root.

`before/preview.png` · `after/preview.png`

### Sending

One form:

```
Who are you sending this to?     [ Search people ]
Their role in this assessment    [ Husband ] [ Wife ]
Spouse                           [ ............... ]
                                 [ Create link ]
```

- Opened from a People record, the person is already chosen
  (`after/send-form-from-person.png`). Opened from the Library, it starts
  empty (`after/send-form.png`).
- **No role is preselected unless DOS actually stores one.**
  `reliableAssessmentRoleFor` returns a role only from an explicit stored
  participant role. DOS stores none today, so the form always asks. Nothing
  is inferred from the account owner, from a name, from gender, or from
  selection order, and **Create link** stays disabled until a role is chosen.
- The spouse field is one input that doubles as a contact search. A first
  name is enough; picking a suggestion links an existing People record,
  typing a name does not create a contact and does not change a household
  relationship.
- Changing the primary person clears the role and re-resolves the spouse from
  that person's own household link.
- The same contact cannot be selected for both participants.
- A confirmation line names both people and both roles before the link is
  created.

`before/send-form-filled.png` · `after/send-form-filled.png`. The before shot
is the defect itself: Naomi Lee, labelled **Husband**, with no way to say
otherwise.

### Recipient

Intro, then step by step, then completion, all in the same system. The
step-by-step flow is deliberate for someone filling this in on a phone and is
unchanged; only the presentation moved. The dock sits at the end of each
step's content rather than pinned over it.

`after/recipient-intro.png` · `after/recipient-questions.png`

A wife-first link shows her as Wife: `after/recipient-intro-wife-first.png`.

### Results

`after/results.png`. Category figures are labelled with the participants'
own names and roles.

## Attribution

This is the part that has to be right end to end, not just on screen.

- `CreateShareInput` now carries `primaryParticipantRole`. The server
  validates it against the resource's own roles and refuses the request
  without one (`400`). The spouse takes the opposite role.
- `scoreAssessmentCategory` looks `husbandScore` and `wifeScore` up **by
  role**, never by position in the participants array:

  ```ts
  const husbandRole = participants.includes("Husband") ? "Husband" : participants[0];
  const wifeRole = participants.includes("Wife") ? "Wife" : participants[1];
  ```

  The previous positional lookup would have reported a wife-first couple's
  scores under the wrong spouse. Labels in the results sheet are looked up the
  same way.
- Historical rows are untouched. Every assignment created before this change
  stored `Husband` first because that is what it was sent as, and it still
  reads back that way. Nothing is reinterpreted.
- The order-independent duplicate-couple protection from USA-278 is
  unchanged: `couple_person_low` / `couple_person_high` generated columns and
  `dos_resource_share_assignments_open_couple_unique` still block a mirrored
  second assignment started from the other spouse.

## Copy

Em dashes are gone from `AssessmentUi`, the Marriage Assessment client, the
recipient page and form, `resource-sharing.ts` and `resource-share-links.ts`.
The regression suite asserts their absence so they do not come back. No
question wording changed, and no stored user content was touched.

## Review surface

The recipient's assessment is now in the demo gallery behind the existing demo
token, with a synthetic couple and a fake token, alongside the Quick Review /
Testimony / Review Options forms added in USA-243:

```
/dos/app/preview?demo=<token>&gallery=recipient-forms&form=marriage-assessment
/dos/app/preview?demo=<token>&gallery=recipient-forms&form=marriage-assessment-wife-first
```

Submitting from there reaches the real API with a token that does not exist,
and is refused. Nothing is written, no real recipient is exposed, and no link
is marked opened.

## Verification

Run and passing on this branch:

- `npm run typecheck`
- `npm run test:dos` (the whole suite, exit 0), which includes:
  - `scripts/dos-resource-sharing-regression.mjs`, extended for USA-279: the
    book study tokens are present and the called-out shapes
    (`rounded-[28px]`, `rounded-[24px]`, the large drop shadow, a pinned
    bottom bar) are absent; the preview branch has no step band, dock,
    percentage or answered count and returns to the detail screen; the
    recipient keeps its steps and its Previous/Next; the server and route
    validate the role; scoring is role-based; the send form asks the four
    things above and guards against the same contact twice; no em dashes.
  - `scripts/dos-resource-sharing-behavior.mjs`, extended for USA-279: a
    create without a role is refused with 400; an invalid role is refused; a
    **wife-first** assignment stores `primary_participant_role: "Wife"` and
    `secondary_participant_role: "Husband"`; the recipient's participants are
    labelled from those roles; and with the wife scoring 9 and the husband 4,
    every returned category has `wifeScore > husbandScore`.
- `npm run build`
- Browser verification of the built production bundle against the token-gated
  demo route (synthetic fixture, no database) at 390px: Library detail,
  Send from the Library (empty) and from a People record (preselected), the
  linked spouse resolving from the household relationship with no role
  preselected, the preview scrolling as one page and returning to the detail,
  the recipient intro and questionnaire husband-first and wife-first, and the
  completed couple result. All screenshots in this folder come from that run.

### Environment limitations, stated plainly

- This container has no Supabase configuration, so the create / save / submit
  HTTP handlers cannot reach a database here. The role storage and
  role-based scoring are covered by the behavior script against a real module
  graph, and the same narrowly scoped production verification with synthetic
  records used for USA-278 should be repeated against the deployed build
  before this is called verified in production.
- `npm run test:dos:visual` records byte-for-byte baselines keyed by platform
  and only `darwin-arm64` baselines exist, so it skips on Linux and cannot be
  re-recorded from here. This change moves the Library resource screens, so
  the macOS baselines need re-recording on a Mac. That is carried forward
  with the `mobile--person-record` re-record already outstanding from USA-278.

## Out of scope

The Friendship Assessment is untouched.
