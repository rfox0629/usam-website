# Follow-up Ticket: DOS Group Facilitator Access Resolution Is Fragile

**Status:** Not started. Deliberately out of scope for the group join-request notification work (this session's Track A).

## The problem

`requireGroupRequestAccess()` in `app/api/dos/app/groups/join-requests/route.ts` does not use `dos_groups.leader_person_id` — the column that exists specifically to answer "who leads this group" — at all. Instead, for any non-admin caller, it:

1. Takes the logged-in Supabase Auth user's `email`/`phone`.
2. Fuzzy-matches (`ilike` on email, exact on phone) against `missionary_field_people` rows scoped to the workspace.
3. Checks whether any matched `person_id` has an active `leader`/`co_leader` row in `dos_group_members` for that specific group.

If a facilitator's Supabase Auth login email doesn't exactly match their `missionary_field_people.email` value, or if their `dos_group_members` row isn't marked `active` with role `leader`/`co_leader`, they receive a silent `403 Group leader access required.` and never see the join-request tab at all — with no indication of why.

This session's notification work (Track A) reuses the *identical* resolution logic for two new call sites — the pending-count endpoint (`app/api/dos/app/groups/pending-requests/route.ts`) and the facilitator-notification lookup (`notifyGroupFacilitators` in `app/groups/actions.ts`, which queries `dos_group_members` directly rather than going through the auth check). Both work correctly today because they were built against the same underlying data, but both would silently under-notify or under-count for the same class of facilitator whose identity doesn't cleanly resolve.

## Why this wasn't fixed as part of the notification ticket

The instruction for that ticket was explicit: "do not silently expand this implementation into a full group-authorization rewrite unless the current notification cannot function safely without it." The notification and pending-count features function correctly for every facilitator whose `missionary_field_people` record already has a matching email — which, in practice, covers the vast majority of current DOS groups (confirmed against the seeded Ryan/Brooke workspace data). The fragility is real but doesn't block the notification feature from working safely for its actual current users. Fixing it now would have meant taking on a genuine authorization rewrite as a hidden dependency of what was scoped as a notification fix.

## Recommended fix

Give `dos_groups.leader_person_id` (and, for co-leaders, `dos_group_members.role`) a direct role in authorization, rather than relying entirely on email/phone matching:

1. `requireGroupRequestAccess()` should check `dos_groups.leader_person_id` first, resolving whether the calling user's Supabase Auth identity is directly linked (via `missionary_field_people` or a more direct `auth.users.id` reference, if one exists or is added) to that specific person record — a single-hop check instead of the current fuzzy multi-step one.
2. Only fall back to the email/phone fuzzy match for co-leaders or in cases where a direct link genuinely isn't available, and log (or otherwise surface) when the fallback path is the one that succeeded, so drift between login identity and field-person records becomes visible instead of silent.
3. Apply the same resolution logic consistently across all three call sites that currently duplicate it (`join-requests/route.ts`, `pending-requests/route.ts`, `app/groups/actions.ts`) — ideally by extracting one shared helper once the resolution logic itself has been fixed, rather than fixing it in three places independently.
4. Add a diagnostic path (even just a console warning, matching the codebase's existing convention) for the specific case this ticket exists to catch: a person is an active `leader`/`co_leader` in `dos_group_members` but their linked `missionary_field_people.email` doesn't match any Supabase Auth login on the account — this is exactly the scenario that produces a silent, unexplained `403` today.

## Explicitly not recommending

- A full rewrite of DOS's broader auth model (`src/lib/dos/auth.ts`) — this ticket is scoped to group-leader resolution specifically, not DOS authorization generally.
- Adding a new `owner_user_id`/direct-auth-link column to `dos_groups` or `missionary_field_people` without first confirming (with whoever owns the DOS data model) whether such a link is intended to exist elsewhere already.

## Suggested size

Small-to-medium. The fix is concentrated in one function's resolution logic and its two direct callers; it does not require new tables or a data migration unless the diagnostic-link column in item 4 above is pursued.
