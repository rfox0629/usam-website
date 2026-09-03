-- USA-168: a progress update may name a person instead of writing prose.
--
-- The production defect this fixes:
--
--   Person -> Accountability -> Add person -> Save
--   => "Commitments and accountability are not ready yet."
--
-- The API was relaxed so that "Philip, started Sep 3" is a complete update,
-- but the table was never told. dos_commitment_updates_note_check still
-- demanded a non-empty progress_note, so a subject-only insert failed with
--
--   new row for relation "dos_commitment_updates" violates check constraint
--   "dos_commitment_updates_note_check"
--
-- and that message contains the table name, which the API's missing-schema
-- matcher treated as "this feature is not set up yet". A plain constraint
-- violation was therefore reported to the user as a setup problem. The
-- matcher is narrowed in the same change; this migration fixes the cause.
--
-- The new constraint says what the API says: an update must say SOMETHING --
-- a note, a DOS Person, or a name. An update carrying none of the three is
-- still refused, at the database as well as the route.
--
-- Strictly weaker than the constraint it replaces: every row that satisfied
-- the old check satisfies this one, so nothing existing can be invalidated.
-- Verified against production first -- all 5 update rows satisfy both.
--
-- progress_note stays NOT NULL; an update without prose stores an empty
-- string rather than a null, so nothing reading it has to learn a new shape.
--
-- No column added or dropped, no row rewritten, no RLS change.

alter table public.dos_commitment_updates
  drop constraint if exists dos_commitment_updates_note_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'dos_commitment_updates_says_something_check'
      and conrelid = 'public.dos_commitment_updates'::regclass
  ) then
    alter table public.dos_commitment_updates
      add constraint dos_commitment_updates_says_something_check
      check (
        length(btrim(progress_note)) > 0
        or subject_person_id is not null
        or length(btrim(coalesce(subject_person_name, ''))) > 0
      );
  end if;
end $$;

comment on constraint dos_commitment_updates_says_something_check on public.dos_commitment_updates is
  'A progress update must carry a note, a DOS Person subject, or a subject name. Naming who was discipled is a complete update on its own; an update carrying none of the three is meaningless and is refused.';
