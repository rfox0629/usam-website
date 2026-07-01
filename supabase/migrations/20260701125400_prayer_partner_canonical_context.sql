alter table public.missionary_field_people
  add column if not exists relationship_context text not null default 'other';

update public.missionary_field_people
set relationship_context = case
  when lower(coalesce(relationship_context, '')) in ('family', 'friend', 'work', 'church', 'community', 'outreach', 'neighbor', 'ministry_partner', 'other')
    then lower(relationship_context)
  when lower(coalesce(relationship_context, '')) in ('ministry partner', 'church / ministry partner', 'church ministry partner')
    then 'ministry_partner'
  when lower(coalesce(relationship_context, '')) in ('neighbour')
    then 'neighbor'
  else 'other'
end
where relationship_context is null
  or lower(coalesce(relationship_context, '')) not in ('family', 'friend', 'work', 'church', 'community', 'outreach', 'neighbor', 'ministry_partner', 'other');

alter table public.missionary_field_people
  alter column relationship_context set default 'other',
  alter column relationship_context set not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'missionary_field_people_relationship_context_check'
      and conrelid = 'public.missionary_field_people'::regclass
  ) then
    alter table public.missionary_field_people
      drop constraint missionary_field_people_relationship_context_check;
  end if;

  alter table public.missionary_field_people
    add constraint missionary_field_people_relationship_context_check
    check (relationship_context in ('family', 'friend', 'work', 'church', 'community', 'outreach', 'neighbor', 'ministry_partner', 'other'));
end $$;

comment on column public.missionary_field_people.relationship_context is
  'Canonical Field relationship context for this person. Prayer partner screens read and update this person field instead of storing a separate prayer relationship taxonomy.';

alter table public.prayer_partners
  add column if not exists prayer_team text not null default 'household_family';

update public.prayer_partners
set prayer_team = 'household_family'
where prayer_team is null
  or btrim(prayer_team) = '';

alter table public.prayer_partners
  alter column prayer_team set default 'household_family',
  alter column prayer_team set not null;

create index if not exists prayer_partners_scope_team_status_idx
  on public.prayer_partners(
    coalesce(recruited_by_household_id, workspace_id, missionary_profile_id),
    prayer_team,
    status
  );

comment on column public.prayer_partners.prayer_team is
  'Prayer coverage target for this partner. Use household_family for household-level coverage or member:<missionary_team_members.id> for a specific workspace member.';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'prayer_partners_status_check'
      and conrelid = 'public.prayer_partners'::regclass
  ) then
    alter table public.prayer_partners
      drop constraint prayer_partners_status_check;
  end if;

  alter table public.prayer_partners
    add constraint prayer_partners_status_check
    check (status in ('pending', 'active', 'paused', 'inactive', 'declined', 'archived'));
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'person_roles_status_check'
      and conrelid = 'public.person_roles'::regclass
  ) then
    alter table public.person_roles
      drop constraint person_roles_status_check;
  end if;

  alter table public.person_roles
    add constraint person_roles_status_check
    check (status in ('active', 'archived', 'declined', 'inactive', 'invited', 'pending', 'paused'));
end $$;

update public.person_roles
set metadata = coalesce(metadata, '{}'::jsonb)
  || jsonb_build_object('legacy_prayer_partner_how_heard', prayer_partners.how_heard)
from public.prayer_partners
where person_roles.role_record_table = 'prayer_partners'
  and person_roles.role_record_id = prayer_partners.id
  and prayer_partners.how_heard is not null
  and btrim(prayer_partners.how_heard) <> ''
  and prayer_partners.how_heard not in (
    'invited_by_me',
    'public_profile',
    'friend_referral',
    'church_ministry',
    'social_media',
    'website',
    'other'
  )
  and not (coalesce(person_roles.metadata, '{}'::jsonb) ? 'legacy_prayer_partner_how_heard');

with mapped_context as (
  select
    prayer_partners.field_person_id,
    case
      when lower(btrim(prayer_partners.how_heard)) = 'family' then 'family'
      when lower(btrim(prayer_partners.how_heard)) = 'friend' and prayer_partners.source in ('admin_added', 'dos', 'import') then 'friend'
      when lower(btrim(prayer_partners.how_heard)) in ('work', 'coworker', 'co-worker') then 'work'
      when lower(btrim(prayer_partners.how_heard)) = 'church' then 'church'
      when lower(btrim(prayer_partners.how_heard)) = 'community' then 'community'
      when lower(btrim(prayer_partners.how_heard)) = 'outreach' then 'outreach'
      when lower(btrim(prayer_partners.how_heard)) in ('neighbor', 'neighbour') then 'neighbor'
      when lower(btrim(prayer_partners.how_heard)) in ('ministry partner', 'church / ministry partner', 'church ministry partner') then 'ministry_partner'
      else null
    end as relationship_context
  from public.prayer_partners
  where prayer_partners.field_person_id is not null
)
update public.missionary_field_people
set relationship_context = mapped_context.relationship_context
from mapped_context
where missionary_field_people.id = mapped_context.field_person_id
  and mapped_context.relationship_context is not null
  and coalesce(missionary_field_people.relationship_context, 'other') = 'other';

update public.prayer_partners
set how_heard = case
  when lower(btrim(how_heard)) in ('invited_by_this_household', 'invited_by_household', 'invited by this household', 'invited by household', 'invited by me') then 'invited_by_me'
  when lower(btrim(how_heard)) in ('from a friend', 'friend referral') then 'friend_referral'
  when lower(btrim(how_heard)) = 'friend' and source not in ('admin_added', 'dos', 'import') then 'friend_referral'
  when lower(btrim(how_heard)) in ('church_ministry_partner', 'church or ministry partner', 'church / ministry', 'church / ministry partner', 'church ministry', 'church/ministry') then 'church_ministry'
  when lower(btrim(how_heard)) in ('social media', 'social_media') then 'social_media'
  when lower(btrim(how_heard)) in ('joined from public profile', 'public profile', 'public_profile') then 'public_profile'
  when lower(btrim(how_heard)) = 'website' then 'website'
  when source = 'public_profile' and (how_heard is null or btrim(how_heard) = '') then 'public_profile'
  when how_heard in ('invited_by_me', 'public_profile', 'friend_referral', 'church_ministry', 'social_media', 'website', 'other') then how_heard
  else 'other'
end
where how_heard is null
  or btrim(how_heard) = ''
  or how_heard not in ('invited_by_me', 'public_profile', 'friend_referral', 'church_ministry', 'social_media', 'website', 'other');

update public.prayer_partners
set status = 'paused'
where status = 'inactive';

update public.person_roles
set status = 'paused'
where role = 'prayer_partner'
  and status = 'inactive';

update public.person_roles
set metadata = coalesce(metadata, '{}'::jsonb)
  || jsonb_build_object(
    'prayer_team',
    coalesce(prayer_partners.prayer_team, 'household_family'),
    'how_joined',
    prayer_partners.how_heard
  )
from public.prayer_partners
where person_roles.role_record_table = 'prayer_partners'
  and person_roles.role_record_id = prayer_partners.id
  and person_roles.role = 'prayer_partner';
