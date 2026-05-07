do $$
declare
  usam_id uuid;
  river_valley_id uuid;
  young_adults_id uuid;
  marriage_ministry_id uuid;
  fox_collective_id uuid;
  ryan_profile_id uuid;
  brooke_profile_id uuid;
  leif_profile_id uuid;
  kyle_profile_id uuid;
  kitchen_table_id uuid;
begin
  insert into public.organizations (name, slug, type, branding_mode)
  values
    ('USA Missionaries', 'usa-missionaries', 'ministry', 'usam'),
    ('River Valley Church', 'river-valley-church', 'church', 'affiliate')
  on conflict (slug) do update
  set name = excluded.name,
      type = excluded.type,
      branding_mode = excluded.branding_mode,
      updated_at = now();

  select id into usam_id
  from public.organizations
  where slug = 'usa-missionaries';

  select id into river_valley_id
  from public.organizations
  where slug = 'river-valley-church';

  insert into public.networks (organization_id, name, slug, description)
  values
    (river_valley_id, 'Young Adults', 'young-adults', 'Young adult discipleship and ministry network.'),
    (river_valley_id, 'Marriage Ministry', 'marriage-ministry', 'Marriage ministry discipleship and care network.')
  on conflict (organization_id, slug) do update
  set name = excluded.name,
      description = excluded.description,
      updated_at = now();

  select id into young_adults_id
  from public.networks
  where organization_id = river_valley_id
    and slug = 'young-adults';

  select id into marriage_ministry_id
  from public.networks
  where organization_id = river_valley_id
    and slug = 'marriage-ministry';

  insert into public.collectives (owner_organization_id, name, type, slug)
  values (usam_id, 'Fox Family', 'family', 'fox-family')
  on conflict (owner_organization_id, slug) do update
  set name = excluded.name,
      type = excluded.type,
      updated_at = now();

  select id into fox_collective_id
  from public.collectives
  where owner_organization_id = usam_id
    and slug = 'fox-family';

  insert into public.profiles (owner_organization_id, primary_collective_id, first_name, last_name, email, phone)
  select usam_id, fox_collective_id, 'Ryan', 'Fox', null, null
  where not exists (
    select 1 from public.profiles
    where owner_organization_id = usam_id
      and first_name = 'Ryan'
      and last_name = 'Fox'
  );

  insert into public.profiles (owner_organization_id, primary_collective_id, first_name, last_name, email, phone)
  select usam_id, fox_collective_id, 'Brooke', 'Fox', null, null
  where not exists (
    select 1 from public.profiles
    where owner_organization_id = usam_id
      and first_name = 'Brooke'
      and last_name = 'Fox'
  );

  insert into public.profiles (owner_organization_id, primary_collective_id, first_name, last_name, email, phone)
  select usam_id, null, 'Leif', '', null, null
  where not exists (
    select 1 from public.profiles
    where owner_organization_id = usam_id
      and first_name = 'Leif'
      and last_name = ''
  );

  insert into public.profiles (owner_organization_id, primary_collective_id, first_name, last_name, email, phone)
  select usam_id, null, 'Kyle', '', null, null
  where not exists (
    select 1 from public.profiles
    where owner_organization_id = usam_id
      and first_name = 'Kyle'
      and last_name = ''
  );

  select id into ryan_profile_id
  from public.profiles
  where owner_organization_id = usam_id
    and first_name = 'Ryan'
    and last_name = 'Fox'
  order by created_at
  limit 1;

  select id into brooke_profile_id
  from public.profiles
  where owner_organization_id = usam_id
    and first_name = 'Brooke'
    and last_name = 'Fox'
  order by created_at
  limit 1;

  select id into leif_profile_id
  from public.profiles
  where owner_organization_id = usam_id
    and first_name = 'Leif'
  order by created_at
  limit 1;

  select id into kyle_profile_id
  from public.profiles
  where owner_organization_id = usam_id
    and first_name = 'Kyle'
  order by created_at
  limit 1;

  update public.profiles
  set primary_collective_id = fox_collective_id,
      updated_at = now()
  where id in (ryan_profile_id, brooke_profile_id);

  insert into public.organization_memberships (organization_id, profile_id, role, status)
  values
    (usam_id, ryan_profile_id, 'owner', 'active'),
    (usam_id, brooke_profile_id, 'member', 'active')
  on conflict (organization_id, profile_id) do update
  set role = excluded.role,
      status = excluded.status,
      updated_at = now();

  insert into public.collective_memberships (collective_id, profile_id, role, status)
  values
    (fox_collective_id, ryan_profile_id, 'leader', 'active'),
    (fox_collective_id, brooke_profile_id, 'member', 'active')
  on conflict (collective_id, profile_id) do update
  set role = excluded.role,
      status = excluded.status,
      updated_at = now();

  insert into public.network_memberships (network_id, profile_id, role, status)
  values
    (young_adults_id, leif_profile_id, 'member', 'active'),
    (marriage_ministry_id, kyle_profile_id, 'member', 'active')
  on conflict (network_id, profile_id) do update
  set role = excluded.role,
      status = excluded.status,
      updated_at = now();

  insert into public.visibility_rules (
    owner_organization_id,
    affiliate_organization_id,
    profile_id,
    collective_id,
    share_activity_summary,
    share_meeting_counts,
    share_unique_people_counts,
    share_names,
    share_private_notes,
    status
  )
  values (
    usam_id,
    river_valley_id,
    ryan_profile_id,
    null,
    true,
    true,
    true,
    false,
    false,
    'active'
  )
  on conflict (owner_organization_id, affiliate_organization_id, profile_id, collective_id) do update
  set share_activity_summary = excluded.share_activity_summary,
      share_meeting_counts = excluded.share_meeting_counts,
      share_unique_people_counts = excluded.share_unique_people_counts,
      share_names = excluded.share_names,
      share_private_notes = false,
      status = excluded.status,
      updated_at = now();

  insert into public.discipleship_relationships (
    owner_organization_id,
    discipler_profile_id,
    disciple_profile_id,
    style,
    strength,
    status,
    started_at,
    notes_private
  )
  values
    (usam_id, ryan_profile_id, leif_profile_id, 'mentor', 'primary', 'active', current_date, null),
    (usam_id, leif_profile_id, kyle_profile_id, 'mentor', 'primary', 'active', current_date, null)
  on conflict do nothing;

  insert into public.meetings (
    owner_organization_id,
    created_by_profile_id,
    primary_collective_id,
    type,
    title,
    meeting_date,
    location,
    notes_private
  )
  select
    usam_id,
    ryan_profile_id,
    fox_collective_id,
    'kitchen_table',
    'Fox Family Kitchen Table',
    current_date,
    null,
    'Seed meeting for DOS foundation MVP.'
  where not exists (
    select 1
    from public.meetings
    where owner_organization_id = usam_id
      and created_by_profile_id = ryan_profile_id
      and primary_collective_id = fox_collective_id
      and type = 'kitchen_table'
      and meeting_date = current_date
      and lower(trim(title)) = 'fox family kitchen table'
  )
  returning id into kitchen_table_id;

  if kitchen_table_id is null then
    select id into kitchen_table_id
    from public.meetings
    where owner_organization_id = usam_id
      and created_by_profile_id = ryan_profile_id
      and primary_collective_id = fox_collective_id
      and type = 'kitchen_table'
      and meeting_date = current_date
      and lower(trim(title)) = 'fox family kitchen table'
    order by created_at
    limit 1;
  end if;

  insert into public.meeting_ministers (meeting_id, profile_id, collective_id, role)
  values
    (kitchen_table_id, ryan_profile_id, fox_collective_id, 'lead'),
    (kitchen_table_id, brooke_profile_id, fox_collective_id, 'minister')
  on conflict (meeting_id, profile_id) do update
  set collective_id = excluded.collective_id,
      role = excluded.role;

  insert into public.product_feedback (
    organization_id,
    submitted_by_profile_id,
    collective_id,
    page_path,
    category,
    message_text,
    status,
    admin_notes
  )
  select
    usam_id,
    ryan_profile_id,
    fox_collective_id,
    '/system/preview',
    'feature_idea',
    'Add a simple way to see active discipleship chains from the DOS home screen.',
    'new',
    'Seed feedback item for the DOS foundation sprint.'
  where not exists (
    select 1
    from public.product_feedback
    where organization_id = usam_id
      and submitted_by_profile_id = ryan_profile_id
      and category = 'feature_idea'
      and message_text = 'Add a simple way to see active discipleship chains from the DOS home screen.'
  );
end $$;
