-- Household roster members can appear in Table logging and My Record, so they
-- must also exist as real missionary_field_people rows.

alter table public.missionary_field_people
  add column if not exists relationship_context text not null default 'other',
  add column if not exists role_in_my_life text not null default 'not_active',
  add column if not exists discipleship_stage text not null default 'not_started',
  add column if not exists field_visibility text not null default 'primary';

with roster_members as (
  select distinct on (
    missionary_team_members.household_id,
    lower(regexp_replace(trim(missionary_team_members.display_name), '[^[:alnum:]]+', '', 'g'))
  )
    missionary_team_members.household_id as workspace_id,
    trim(missionary_team_members.display_name) as person_name,
    nullif(trim(coalesce(missionary_team_members.relationship_to_workspace, '')), '') as relationship_to_workspace,
    nullif(trim(coalesce(missionary_team_members.role_title, '')), '') as role_title,
    lower(regexp_replace(trim(missionary_team_members.display_name), '[^[:alnum:]]+', '', 'g')) as normalized_name
  from public.missionary_team_members
  where missionary_team_members.household_id is not null
    and trim(coalesce(missionary_team_members.display_name, '')) <> ''
    and lower(trim(missionary_team_members.display_name)) not in ('god', 'new team member', 'unnamed team member')
    and lower(coalesce(missionary_team_members.status, 'active')) not in ('archived', 'declined', 'inactive')
  order by
    missionary_team_members.household_id,
    lower(regexp_replace(trim(missionary_team_members.display_name), '[^[:alnum:]]+', '', 'g')),
    case lower(coalesce(missionary_team_members.relationship_to_workspace, ''))
      when 'owner' then 0
      when 'spouse' then 1
      when 'child' then 2
      when 'household_member' then 3
      else 4
    end,
    missionary_team_members.sort_order nulls last,
    missionary_team_members.display_name
),
matched_people as (
  select
    missionary_field_people.id,
    roster_members.person_name,
    roster_members.relationship_to_workspace,
    roster_members.role_title,
    roster_members.workspace_id
  from public.missionary_field_people
  join roster_members
    on coalesce(missionary_field_people.workspace_id, missionary_field_people.household_id) = roster_members.workspace_id
   and lower(regexp_replace(trim(missionary_field_people.name), '[^[:alnum:]]+', '', 'g')) = roster_members.normalized_name
)
update public.missionary_field_people
set
  workspace_id = coalesce(public.missionary_field_people.workspace_id, matched_people.workspace_id),
  household_id = coalesce(public.missionary_field_people.household_id, matched_people.workspace_id),
  relationship_context = case
    when lower(coalesce(matched_people.relationship_to_workspace, '')) in ('spouse', 'child', 'household_member')
      and lower(coalesce(public.missionary_field_people.relationship_context, '')) in ('', 'other') then 'family'
    else coalesce(nullif(public.missionary_field_people.relationship_context, ''), 'family')
  end,
  relationship_type = coalesce(nullif(public.missionary_field_people.relationship_type, ''), 'new'),
  role_in_my_life = coalesce(nullif(public.missionary_field_people.role_in_my_life, ''), 'not_active'),
  discipleship_stage = coalesce(nullif(public.missionary_field_people.discipleship_stage, ''), 'not_started'),
  engagement_level = coalesce(nullif(public.missionary_field_people.engagement_level, ''), '0'),
  field_visibility = case
    when lower(coalesce(matched_people.relationship_to_workspace, '')) in ('spouse', 'child', 'household_member')
      and lower(coalesce(public.missionary_field_people.field_visibility, '')) in ('', 'hidden') then 'secondary'
    else coalesce(nullif(public.missionary_field_people.field_visibility, ''), 'secondary')
  end,
  household_notes = coalesce(
    nullif(public.missionary_field_people.household_notes, ''),
    concat_ws(
      E'\n',
      'Household roster member in this workspace.',
      case when matched_people.relationship_to_workspace is not null then 'Relationship: ' || matched_people.relationship_to_workspace || '.' end,
      case when matched_people.role_title is not null then 'Role: ' || matched_people.role_title || '.' end
    )
  ),
  status = case
    when lower(coalesce(public.missionary_field_people.status, '')) in ('archived', 'deleted') then 'active'
    else public.missionary_field_people.status
  end
from matched_people
where public.missionary_field_people.id = matched_people.id;

with roster_members as (
  select distinct on (
    missionary_team_members.household_id,
    lower(regexp_replace(trim(missionary_team_members.display_name), '[^[:alnum:]]+', '', 'g'))
  )
    missionary_team_members.household_id as workspace_id,
    trim(missionary_team_members.display_name) as person_name,
    nullif(trim(coalesce(missionary_team_members.relationship_to_workspace, '')), '') as relationship_to_workspace,
    nullif(trim(coalesce(missionary_team_members.role_title, '')), '') as role_title,
    lower(regexp_replace(trim(missionary_team_members.display_name), '[^[:alnum:]]+', '', 'g')) as normalized_name
  from public.missionary_team_members
  where missionary_team_members.household_id is not null
    and trim(coalesce(missionary_team_members.display_name, '')) <> ''
    and lower(trim(missionary_team_members.display_name)) not in ('god', 'new team member', 'unnamed team member')
    and lower(coalesce(missionary_team_members.status, 'active')) not in ('archived', 'declined', 'inactive')
  order by
    missionary_team_members.household_id,
    lower(regexp_replace(trim(missionary_team_members.display_name), '[^[:alnum:]]+', '', 'g')),
    case lower(coalesce(missionary_team_members.relationship_to_workspace, ''))
      when 'owner' then 0
      when 'spouse' then 1
      when 'child' then 2
      when 'household_member' then 3
      else 4
    end,
    missionary_team_members.sort_order nulls last,
    missionary_team_members.display_name
),
missing_people as (
  select roster_members.*
  from roster_members
  where not exists (
    select 1
    from public.missionary_field_people existing_people
    where coalesce(existing_people.workspace_id, existing_people.household_id) = roster_members.workspace_id
      and lower(regexp_replace(trim(existing_people.name), '[^[:alnum:]]+', '', 'g')) = roster_members.normalized_name
  )
)
insert into public.missionary_field_people (
  household_id,
  workspace_id,
  name,
  phone,
  church,
  relationship_type,
  relationship_context,
  role_in_my_life,
  discipleship_stage,
  engagement_level,
  field_visibility,
  household_notes,
  source,
  status
)
select
  workspace_id,
  workspace_id,
  person_name,
  null,
  null,
  'new',
  'family',
  'not_active',
  'not_started',
  '0',
  'secondary',
  concat_ws(
    E'\n',
    'Household roster member in this workspace.',
    case when relationship_to_workspace is not null then 'Relationship: ' || relationship_to_workspace || '.' end,
    case when role_title is not null then 'Role: ' || role_title || '.' end
  ),
  'field',
  'new'
from missing_people;

comment on column public.missionary_field_people.field_visibility is
  'Per-workspace Field list role: primary contacts show by default; secondary and hidden household participants remain full people and can be revealed intentionally for records and activity history.';

notify pgrst, 'reload schema';
