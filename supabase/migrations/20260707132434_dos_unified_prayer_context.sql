alter table public.prayer_requests
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists group_id uuid references public.dos_groups(id) on delete set null,
  add column if not exists gathering_id uuid references public.dos_group_gatherings(id) on delete set null,
  add column if not exists meeting_id uuid references public.missionary_tables(id) on delete set null,
  add column if not exists created_by_person_id uuid references public.missionary_field_people(id) on delete set null,
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists priority text not null default 'normal',
  add column if not exists follow_up_at timestamptz;

alter table public.prayer_requests
  drop constraint if exists prayer_requests_visibility_check,
  drop constraint if exists prayer_requests_status_check,
  drop constraint if exists prayer_requests_priority_check,
  drop constraint if exists prayer_requests_source_check;

alter table public.prayer_requests
  add constraint prayer_requests_visibility_check
  check (visibility in ('private', 'group_members', 'group_leaders', 'organization', 'public_profile', 'team', 'public')),
  add constraint prayer_requests_status_check
  check (status in ('active', 'answered', 'archived', 'covered', 'open')),
  add constraint prayer_requests_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent')),
  add constraint prayer_requests_source_check
  check (source in ('public_form', 'admin_added', 'dos', 'dos_group', 'dos_table', 'prayer_team'));

update public.prayer_requests
set
  workspace_id = coalesce(workspace_id, household_id, related_household_id, related_missionary_profile_id),
  priority = case
    when priority in ('low', 'normal', 'high', 'urgent') then priority
    when urgency = 'urgent' then 'urgent'
    when urgency = 'important' then 'high'
    else 'normal'
  end,
  status = case
    when status in ('open', 'covered') then 'active'
    when status in ('answered', 'archived') then status
    else 'active'
  end,
  visibility = case
    when visibility = 'public' then 'public_profile'
    when visibility = 'team' then 'organization'
    when visibility in ('private', 'group_members', 'group_leaders', 'organization', 'public_profile') then visibility
    else 'private'
  end;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'prayer_requests'
      and column_name = 'created_by'
  ) then
    execute $sql$
      update public.prayer_requests
      set created_by_user_id = coalesce(created_by_user_id, created_by)
      where created_by_user_id is null
        and created_by is not null
    $sql$;
  end if;
end $$;

alter table public.prayer_requests
  alter column visibility set default 'private',
  alter column status set default 'active',
  alter column priority set default 'normal';

create index if not exists prayer_requests_workspace_status_priority_idx
  on public.prayer_requests(workspace_id, status, priority, follow_up_at, created_at desc);

create index if not exists prayer_requests_group_status_idx
  on public.prayer_requests(group_id, status, created_at desc)
  where group_id is not null;

create index if not exists prayer_requests_gathering_idx
  on public.prayer_requests(gathering_id, created_at desc)
  where gathering_id is not null;

create index if not exists prayer_requests_meeting_idx
  on public.prayer_requests(meeting_id, created_at desc)
  where meeting_id is not null;

create index if not exists prayer_requests_field_person_status_idx
  on public.prayer_requests(field_person_id, status, created_at desc)
  where field_person_id is not null;

create index if not exists prayer_requests_created_by_person_idx
  on public.prayer_requests(created_by_person_id, created_at desc)
  where created_by_person_id is not null;

do $$
begin
  if to_regclass('public.dos_group_prayer_requests') is not null then
    execute $sql$
      insert into public.prayer_requests (
        workspace_id,
        organization_id,
        household_id,
        related_household_id,
        related_missionary_profile_id,
        group_id,
        field_person_id,
        title,
        request,
        description,
        category,
        urgency,
        priority,
        status,
        visibility,
        confidentiality_level,
        source,
        answered_at,
        created_at,
        updated_at
      )
      select
        groups.workspace_id,
        groups.organization_id,
        groups.workspace_id,
        groups.workspace_id,
        groups.workspace_id,
        group_prayers.group_id,
        group_prayers.person_id,
        group_prayers.title,
        coalesce(group_prayers.description, group_prayers.title),
        group_prayers.description,
        'Ministry',
        'normal',
        'normal',
        case
          when group_prayers.status in ('answered', 'archived') then group_prayers.status
          else 'active'
        end,
        'private',
        'missionary_couple',
        'dos_group',
        group_prayers.answered_at,
        coalesce(group_prayers.created_at, now()),
        coalesce(group_prayers.updated_at, group_prayers.created_at, now())
      from public.dos_group_prayer_requests group_prayers
      join public.dos_groups groups on groups.id = group_prayers.group_id
      where not exists (
        select 1
        from public.prayer_requests existing
        where existing.group_id = group_prayers.group_id
          and existing.source = 'dos_group'
          and existing.title = group_prayers.title
          and coalesce(existing.created_at, 'epoch'::timestamptz) = coalesce(group_prayers.created_at, now())
      )
    $sql$;

    drop table public.dos_group_prayer_requests;
  end if;
end $$;

drop policy if exists "Public can read active public prayer requests" on public.prayer_requests;
drop policy if exists "Public can read approved household prayer requests" on public.prayer_requests;
create policy "Public can read approved household prayer requests"
  on public.prayer_requests
  for select
  to anon
  using (
    visibility = 'public_profile'
    and status = 'active'
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

grant select on table public.prayer_requests to anon;
grant select, insert, update, delete on table public.prayer_requests to authenticated;
grant select, insert, update, delete on table public.prayer_requests to service_role;

comment on column public.prayer_requests.group_id is
  'Optional DOS group context for unified prayer requests. Private by default and never public unless visibility is public_profile.';

comment on column public.prayer_requests.gathering_id is
  'Optional DOS group gathering context for unified prayer requests.';

comment on column public.prayer_requests.meeting_id is
  'Optional Table/meeting context for unified DOS prayer requests.';

comment on column public.prayer_requests.priority is
  'Prayer hub priority used for Pray Today, High Priority, and follow-up filters.';

comment on column public.prayer_requests.follow_up_at is
  'Optional follow-up date for DOS prayer hub reminders.';
