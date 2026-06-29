alter table public.prayer_requests
  add column if not exists person_tags text[] not null default '{}'::text[],
  add column if not exists linked_person_ids uuid[] not null default '{}'::uuid[],
  add column if not exists created_by uuid,
  add column if not exists answer_testimony text;

update public.prayer_requests
set
  workspace_id = coalesce(workspace_id, household_id, related_household_id, related_missionary_profile_id),
  person_tags = coalesce(person_tags, '{}'::text[]),
  linked_person_ids = coalesce(linked_person_ids, '{}'::uuid[]),
  source = case
    when source = 'missionary_workspace' then 'dos'
    when source in ('public_form', 'admin_added', 'dos', 'prayer_team') then source
    else 'public_form'
  end
where workspace_id is null
  or person_tags is null
  or linked_person_ids is null
  or source = 'missionary_workspace'
  or source not in ('public_form', 'admin_added', 'dos', 'prayer_team');

alter table public.prayer_requests
  drop constraint if exists prayer_requests_source_check;

alter table public.prayer_requests
  add constraint prayer_requests_source_check
  check (source in ('public_form', 'admin_added', 'dos', 'prayer_team'));

create index if not exists prayer_requests_workspace_visibility_status_idx
  on public.prayer_requests(workspace_id, visibility, status, created_at desc);

create index if not exists prayer_requests_related_profile_visibility_status_idx
  on public.prayer_requests(related_missionary_profile_id, visibility, status, created_at desc);

create index if not exists prayer_requests_person_tags_gin_idx
  on public.prayer_requests using gin(person_tags);

drop policy if exists "Public can read active public prayer requests" on public.prayer_requests;
drop policy if exists "Public can read approved household prayer requests" on public.prayer_requests;
create policy "Public can read approved household prayer requests"
  on public.prayer_requests
  for select
  to anon
  using (
    visibility = 'public'
    and status in ('active', 'open')
    and exists (
      select 1
      from public.missionary_households
      where missionary_households.id = coalesce(
          prayer_requests.workspace_id,
          prayer_requests.household_id,
          prayer_requests.related_household_id,
          prayer_requests.related_missionary_profile_id
        )
        and missionary_households.public_visible = true
        and missionary_households.show_prayer is not false
    )
  );

do $$
declare
  fox_household_id uuid;
begin
  select id
  into fox_household_id
  from public.missionary_households
  where public_slug = 'fox-family'
    or slug in ('fox-family', 'ryan-fox', 'ryan-brooke-fox')
    or 'fox-family' = any(coalesce(public_slug_aliases, '{}'::text[]))
  order by case
    when public_slug = 'fox-family' then 0
    when slug = 'ryan-brooke-fox' then 1
    else 2
  end
  limit 1;

  if fox_household_id is not null then
    insert into public.prayer_requests (
      workspace_id,
      household_id,
      related_household_id,
      related_missionary_profile_id,
      title,
      request,
      description,
      category,
      urgency,
      status,
      visibility,
      confidentiality_level,
      source,
      person_tags
    )
    select
      fox_household_id,
      fox_household_id,
      fox_household_id,
      fox_household_id,
      'Pray for open doors',
      'Pray for Ryan, Brooke, and the Fox Family as they follow up with families and leaders across their mission field.',
      'Pray for Ryan, Brooke, and the Fox Family as they follow up with families and leaders across their mission field.',
      'Ministry',
      'normal',
      'open',
      'public',
      'general',
      'dos',
      array['Ryan Fox', 'Brooke Fox', 'Family/Household']::text[]
    where not exists (
      select 1
      from public.prayer_requests
      where workspace_id = fox_household_id
        and source = 'dos'
        and visibility = 'public'
        and title = 'Pray for open doors'
    );

    insert into public.prayer_requests (
      workspace_id,
      household_id,
      related_household_id,
      related_missionary_profile_id,
      title,
      request,
      description,
      category,
      urgency,
      status,
      visibility,
      confidentiality_level,
      source,
      person_tags
    )
    select
      fox_household_id,
      fox_household_id,
      fox_household_id,
      fox_household_id,
      'Private household covering',
      'Internal request for the Fox Family prayer workflow. This should not appear publicly.',
      'Internal request for the Fox Family prayer workflow. This should not appear publicly.',
      'Family',
      'normal',
      'open',
      'private',
      'missionary_couple',
      'dos',
      array['Family/Household']::text[]
    where not exists (
      select 1
      from public.prayer_requests
      where workspace_id = fox_household_id
        and source = 'dos'
        and visibility = 'private'
        and title = 'Private household covering'
    );
  end if;
end $$;

comment on column public.prayer_requests.person_tags is
  'Public/display-oriented prayer request tags such as Ryan, Brooke, Family/Household, or household member names. These are not DOS role or auth fields.';

comment on column public.prayer_requests.linked_person_ids is
  'Optional DOS/Field person identifiers used for internal filtering. Public profile rendering must not expose raw person IDs.';

comment on column public.prayer_requests.answer_testimony is
  'Optional answered prayer testimony for internal/admin use and future approved public display.';
