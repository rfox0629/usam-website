alter table if exists public.people
  add column if not exists commitment_level integer,
  add column if not exists relationship_depth text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'people_commitment_level_check'
  ) then
    alter table public.people
      add constraint people_commitment_level_check
      check (commitment_level is null or commitment_level between -3 and 3);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'people_relationship_depth_check'
  ) then
    alter table public.people
      add constraint people_relationship_depth_check
      check (relationship_depth is null or relationship_depth in ('New', 'Growing', 'Strong'));
  end if;
end $$;

comment on column public.people.commitment_level is
  'Directional spiritual openness for DOS relationship care. This is not a score, judgment, or performance measure.';

comment on column public.people.relationship_depth is
  'Lightweight relationship depth between the owning workspace profile and this person.';

comment on column public.people.notes_private is
  'Private relationship notes for the owning organization. Do not expose through affiliate visibility or public views.';
