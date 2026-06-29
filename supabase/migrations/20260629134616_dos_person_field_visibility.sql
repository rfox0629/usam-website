alter table public.missionary_field_people
  add column if not exists field_visibility text not null default 'primary';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_field_people_field_visibility_check'
      and conrelid = 'public.missionary_field_people'::regclass
  ) then
    alter table public.missionary_field_people
      add constraint missionary_field_people_field_visibility_check
      check (field_visibility in ('primary', 'secondary', 'hidden'));
  end if;
end $$;

create index if not exists missionary_field_people_workspace_visibility_idx
  on public.missionary_field_people(workspace_id, field_visibility, updated_at desc)
  where workspace_id is not null;

create index if not exists missionary_field_people_household_visibility_idx
  on public.missionary_field_people(household_id, field_visibility, updated_at desc);

update public.missionary_field_people
set field_visibility = 'secondary'
where field_visibility = 'primary'
  and (
    household_notes ilike 'Spouse in % household.%'
    or household_notes ilike 'Child in % household.%'
  );

with ryan_workspaces as (
  select id
  from public.missionary_households
  where slug in ('ryan-fox', 'ryan-brooke-fox')
    or public_slug = 'fox-family'
    or lower(display_name) in ('ryan fox', 'ryan & brooke fox', 'ryan and brooke fox')
),
normalized_people as (
  select
    missionary_field_people.id,
    lower(regexp_replace(trim(missionary_field_people.name), '[^[:alnum:]]+', '', 'g')) as normalized_name,
    missionary_field_people.household_notes
  from public.missionary_field_people
  join ryan_workspaces
    on ryan_workspaces.id = coalesce(missionary_field_people.workspace_id, missionary_field_people.household_id)
)
update public.missionary_field_people
set field_visibility = case
  when normalized_people.normalized_name in ('nathanielbliss', 'jaredvanravenhorst') then 'primary'
  when normalized_people.normalized_name = 'angiebliss' then 'secondary'
  when normalized_people.normalized_name = 'heathervanravenhorst'
    then 'secondary'
  else missionary_field_people.field_visibility
end
from normalized_people
where missionary_field_people.id = normalized_people.id
  and normalized_people.normalized_name in (
    'angiebliss',
    'heathervanravenhorst',
    'jaredvanravenhorst',
    'nathanielbliss'
  );

comment on column public.missionary_field_people.field_visibility is
  'Per-workspace Field list role: primary contacts show by default, secondary household participants show when included, hidden rows stay off the Field list while remaining selectable for Tables and retained for activity history.';

notify pgrst, 'reload schema';
