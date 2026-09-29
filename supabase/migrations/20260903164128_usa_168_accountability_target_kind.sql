-- USA-168: what the measurable target actually counts.
--
-- target_count alone cannot tell these apart:
--
--   "Begin discipling 3 men"          target_count = 3
--   "Read the Bible 3 times this week" target_count = 3
--
-- The first counts PEOPLE and needs named subjects; the second counts
-- occurrences and must never be asked "who are they discipling?". Nothing in
-- the row carried that distinction: title and description are free text,
-- and category is a topical taxonomy the canonical Accountability form does
-- not even collect. So the user is asked, once, and only when they have
-- actually entered a number.
--
-- target_kind describes what the NUMBER represents, not the subject record.
--
--   target_count is null                  -> ordinary Accountability
--   target_count = 3, target_kind='people'-> measurable people goal
--   target_count = 3, target_kind='count' -> generic measurable goal
--
-- Nullable with no default and no backfill. Every one of the 14 existing
-- commitments keeps target_kind null and behaves exactly as it does today --
-- all 14 also have target_count null, so none of them is measurable at all.
-- This value is never inferred from title, category or description.
--
-- No RLS change. dos_person_commitments carries row-level policies and
-- table-level grants, so a new column is covered by the existing policies.

alter table public.dos_person_commitments
  add column if not exists target_kind text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'dos_person_commitments_target_kind_check'
      and conrelid = 'public.dos_person_commitments'::regclass
  ) then
    alter table public.dos_person_commitments
      add constraint dos_person_commitments_target_kind_check
      check (target_kind is null or target_kind in ('people', 'count'));
  end if;
end $$;

comment on column public.dos_person_commitments.target_kind is
  'What target_count counts: ''people'' for a goal needing named subjects ("Begin discipling 3 men"), ''count'' for a generic numeric goal ("Read the Bible 3 times this week"). Null means the Accountability is not measurable. Always chosen explicitly by the user, never inferred from the title.';
