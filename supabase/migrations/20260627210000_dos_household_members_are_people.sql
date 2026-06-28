-- Kitchen Tables are attended by people, not household text fields.
-- Preserve spouse/child context while backfilling named household members in
-- the launch Fox Family workspace as selectable missionary_field_people rows.

with target_workspaces as (
  select id
  from public.missionary_households
  where public_slug = 'fox-family'
    or slug in ('ryan-fox', 'ryan-brooke-fox')
),
source_people as (
  select
    missionary_field_people.id,
    coalesce(missionary_field_people.workspace_id, missionary_field_people.household_id) as workspace_id,
    coalesce(missionary_field_people.household_id, missionary_field_people.workspace_id) as household_id,
    trim(missionary_field_people.name) as anchor_name,
    missionary_field_people.church,
    missionary_field_people.children_names,
    missionary_field_people.engagement_level,
    missionary_field_people.household_notes,
    missionary_field_people.spouse_name
  from public.missionary_field_people
  join target_workspaces
    on target_workspaces.id = coalesce(missionary_field_people.workspace_id, missionary_field_people.household_id)
  where coalesce(missionary_field_people.workspace_id, missionary_field_people.household_id) is not null
    and trim(coalesce(missionary_field_people.name, '')) <> ''
),
raw_household_members as (
  select
    id as anchor_id,
    workspace_id,
    household_id,
    anchor_name,
    church,
    children_names,
    engagement_level,
    household_notes,
    trim(spouse_name) as member_name,
    'spouse'::text as relationship
  from source_people
  where trim(coalesce(spouse_name, '')) <> ''

  union all

  select
    source_people.id as anchor_id,
    source_people.workspace_id,
    source_people.household_id,
    source_people.anchor_name,
    source_people.church,
    source_people.children_names,
    source_people.engagement_level,
    source_people.household_notes,
    trim(child_name) as member_name,
    'child'::text as relationship
  from source_people
  cross join lateral regexp_split_to_table(coalesce(source_people.children_names, ''), E'[,;\\n]+') as child_name
  where trim(child_name) <> ''
),
deduped_household_members as (
  select distinct on (
    workspace_id,
    lower(regexp_replace(member_name, '[[:space:]]+', ' ', 'g'))
  )
    anchor_id,
    workspace_id,
    household_id,
    anchor_name,
    church,
    children_names,
    engagement_level,
    household_notes,
    regexp_replace(member_name, '[[:space:]]+', ' ', 'g') as member_name,
    lower(regexp_replace(member_name, '[[:space:]]+', ' ', 'g')) as normalized_member_name,
    relationship
  from raw_household_members
  where trim(member_name) <> ''
    and lower(regexp_replace(member_name, '[[:space:]]+', ' ', 'g'))
      <> lower(regexp_replace(anchor_name, '[[:space:]]+', ' ', 'g'))
  order by
    workspace_id,
    lower(regexp_replace(member_name, '[[:space:]]+', ' ', 'g')),
    case relationship when 'spouse' then 0 else 1 end,
    anchor_name
),
missing_household_members as (
  select deduped_household_members.*
  from deduped_household_members
  where not exists (
    select 1
    from public.missionary_field_people existing_people
    where coalesce(existing_people.workspace_id, existing_people.household_id) = deduped_household_members.workspace_id
      and lower(regexp_replace(trim(existing_people.name), '[[:space:]]+', ' ', 'g')) = deduped_household_members.normalized_member_name
  )
)
insert into public.missionary_field_people (
  household_id,
  workspace_id,
  name,
  phone,
  church,
  relationship_type,
  engagement_level,
  spouse_name,
  children_names,
  household_notes,
  source,
  status
)
select
  household_id,
  workspace_id,
  member_name,
  null,
  nullif(church, ''),
  'new',
  coalesce(nullif(engagement_level, ''), '0'),
  case when relationship = 'spouse' then anchor_name else null end,
  case when relationship = 'spouse' then nullif(children_names, '') else null end,
  concat_ws(
    E'\n',
    case
      when relationship = 'spouse' then 'Spouse in ' || anchor_name || '''s household.'
      else 'Child in ' || anchor_name || '''s household.'
    end,
    nullif(household_notes, '')
  ),
  'field',
  'new'
from missing_household_members;

comment on column public.missionary_field_people.spouse_name is
  'Optional DOS household context. Spouses who may attend Tables should also exist as their own missionary_field_people rows so attendance remains person-based.';

comment on column public.missionary_field_people.children_names is
  'Optional DOS household context. Children who may attend Tables should also exist as their own missionary_field_people rows so attendance remains person-based.';

notify pgrst, 'reload schema';
