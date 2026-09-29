-- USA-168 measurable Accountability and multiplication progress.
--
-- Semantic contract:
--   dos_person_commitments  = the challenge/goal ("Begin discipling 3 men")
--   dos_commitment_updates  = progress/evidence against that goal
--                             ("Philip -- started Sep 3")
--
-- Multiplication is Accountability progress, not Observed Fruit. fruit_events
-- is deliberately untouched by this migration.
--
-- target_count is the declared goal (the "3"). It is nullable, and null means
-- the Accountability is not measurable -- which is every one of the 14 existing
-- commitments, so they all keep behaving exactly as they do today.
--
-- subject_person_id / subject_person_name identify WHO a progress entry is
-- about, when the entry is about a person at all. Both nullable: the 5 existing
-- update rows have neither and remain plain progress notes, correctly excluded
-- from any distinct-subject count.
--
-- Counting contract (enforced in application code, not by a constraint):
--   distinct subjects = count(distinct coalesce(subject_person_id::text,
--                                               'name:' || lower(btrim(subject_person_name))))
--   ...over rows where either subject column is set.
-- A unique constraint would be wrong here: several progress updates about the
-- same subject over time are expected and must stay possible. Distinctness is a
-- read-time question, so it is answered at read time.
--
-- `on delete set null` keeps history: deleting or archiving the subject Person
-- clears the link and leaves the progress entry, its note and its date intact.
--
-- No RLS change. Both tables carry row-level policies and table-level grants
-- (not column-level), so new columns are covered by the existing policies
-- automatically.

alter table public.dos_person_commitments
  add column if not exists target_count integer;

alter table public.dos_commitment_updates
  add column if not exists subject_person_id uuid references public.missionary_field_people(id) on delete set null,
  add column if not exists subject_person_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'dos_person_commitments_target_count_check'
      and conrelid = 'public.dos_person_commitments'::regclass
  ) then
    alter table public.dos_person_commitments
      add constraint dos_person_commitments_target_count_check
      check (target_count is null or target_count > 0);
  end if;
end $$;

comment on column public.dos_person_commitments.target_count is
  'Declared goal for a measurable Accountability, e.g. 3 for "Begin discipling 3 men". Null means not measurable, which is the default and preserves the simple Accountability experience.';

comment on column public.dos_commitment_updates.subject_person_id is
  'Who this progress entry is about, when they already exist in DOS. Counted once per commitment however many updates mention them. Set null on Person delete so progress history survives.';

comment on column public.dos_commitment_updates.subject_person_name is
  'Who this progress entry is about, by name only, when they are not yet in DOS. Never a placeholder Person record. May later be linked by setting subject_person_id on this same row, which keeps the count correct.';

-- Progress lookups are always scoped to one commitment.
create index if not exists dos_commitment_updates_commitment_subject_idx
  on public.dos_commitment_updates(commitment_id, subject_person_id)
  where subject_person_id is not null;
