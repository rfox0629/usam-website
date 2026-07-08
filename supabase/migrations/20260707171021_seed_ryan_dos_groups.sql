do $$
declare
  next_local_date date;
  next_starts_at timestamptz;
  ryan_leader_person_id uuid;
  ryan_workspace_id uuid;
  seed_group record;
  seed_group_id uuid;
  usam_organization_id uuid;
begin
  if to_regclass('public.dos_groups') is null
    or to_regclass('public.dos_group_members') is null
    or to_regclass('public.dos_group_gatherings') is null
    or to_regclass('public.dos_group_resources') is null
    or to_regclass('public.missionary_households') is null then
    return;
  end if;

  select id
  into ryan_workspace_id
  from public.missionary_households
  where slug in ('ryan-fox', 'ryan-brooke-fox')
     or public_slug = 'fox-family'
  order by case
    when slug = 'ryan-fox' then 0
    when slug = 'ryan-brooke-fox' then 1
    when public_slug = 'fox-family' then 2
    else 3
  end
  limit 1;

  if ryan_workspace_id is null then
    return;
  end if;

  select id
  into usam_organization_id
  from public.organizations
  where slug = 'usa-missionaries'
  limit 1;

  select id
  into ryan_leader_person_id
  from public.missionary_field_people
  where coalesce(workspace_id, household_id) = ryan_workspace_id
    and coalesce(status, 'active') not in ('archived', 'deleted')
    and (
      lower(btrim(name)) = 'ryan fox'
      or lower(btrim(name)) = 'ryan'
      or lower(name) like '%ryan%fox%'
    )
  order by case
    when lower(btrim(name)) = 'ryan fox' then 0
    when lower(name) like '%ryan%fox%' then 1
    when lower(btrim(name)) = 'ryan' then 2
    else 3
  end,
  case coalesce(field_visibility, 'primary')
    when 'primary' then 0
    when 'secondary' then 1
    else 2
  end,
  updated_at desc nulls last,
  created_at asc
  limit 1;

  for seed_group in
    select *
    from (
      values
        (
          '2three2',
          '2three2',
          'A men''s discipleship group where we run together, pair up two-by-two, pray for one another, and pursue righteousness, faith, love, and peace.',
          'Run. Pray. Pursue.',
          '2 Timothy 2:22',
          'Flee also youthful lusts; but pursue righteousness, faith, love, peace with those who call on the Lord out of a pure heart.',
          'running',
          'Weekly · Saturday · 7:00 AM',
          'Lebanon Hills Trailhead, Eagan, MN',
          'Saturday Run & Prayer',
          'Run together, pair up two-by-two, and pray along the trail.',
          6,
          interval '7 hours',
          interval '75 minutes'
        ),
        (
          'tuesday-mens-group',
          'Tuesday Men''s Group',
          'A weekly gathering focused on Scripture, accountability, prayer, and helping men pursue Christ together.',
          'Grow together.',
          null,
          null,
          'discipleship',
          'Weekly · Tuesday · 6:00 AM',
          'Location TBD',
          'Tuesday Men''s Group',
          'Scripture, accountability, prayer, and next steps together.',
          2,
          interval '6 hours',
          interval '60 minutes'
        ),
        (
          'wednesday-mens-group',
          'Wednesday Men''s Group',
          'An evening gathering where men encourage one another, study Scripture, pray together, and build authentic Christian community.',
          'Brotherhood. Prayer. Discipleship.',
          null,
          null,
          'discipleship',
          'Weekly · Wednesday · Evening',
          'Location TBD',
          'Wednesday Men''s Group',
          'Encouragement, Scripture, prayer, and authentic Christian community.',
          3,
          interval '18 hours',
          interval '75 minutes'
        )
    ) as groups(
      slug,
      name,
      description,
      tagline,
      scripture_reference,
      scripture_text,
      group_type,
      rhythm_label,
      default_location,
      gathering_title,
      gathering_description,
      week_day,
      start_offset,
      duration
    )
  loop
    insert into public.dos_groups (
      workspace_id,
      organization_id,
      name,
      slug,
      description,
      tagline,
      scripture_reference,
      scripture_text,
      type,
      visibility,
      rhythm_label,
      default_location,
      leader_person_id,
      active
    )
    values (
      ryan_workspace_id,
      usam_organization_id,
      seed_group.name,
      seed_group.slug,
      seed_group.description,
      seed_group.tagline,
      seed_group.scripture_reference,
      seed_group.scripture_text,
      seed_group.group_type,
      'private',
      seed_group.rhythm_label,
      seed_group.default_location,
      ryan_leader_person_id,
      true
    )
    on conflict (workspace_id, slug) do update
    set organization_id = excluded.organization_id,
        name = excluded.name,
        description = excluded.description,
        tagline = excluded.tagline,
        scripture_reference = excluded.scripture_reference,
        scripture_text = excluded.scripture_text,
        type = excluded.type,
        visibility = 'private',
        rhythm_label = excluded.rhythm_label,
        default_location = excluded.default_location,
        leader_person_id = coalesce(excluded.leader_person_id, public.dos_groups.leader_person_id),
        active = true,
        updated_at = now()
    returning id into seed_group_id;

    if ryan_leader_person_id is not null then
      insert into public.dos_group_members (
        group_id,
        person_id,
        role,
        status,
        notes
      )
      values (
        seed_group_id,
        ryan_leader_person_id,
        'leader',
        'active',
        'Seeded from the existing Ryan Fox person record.'
      )
      on conflict (group_id, person_id) do update
      set role = 'leader',
          status = 'active',
          updated_at = now();
    end if;

    next_local_date := (now() at time zone 'America/Chicago')::date
      + ((seed_group.week_day - extract(dow from now() at time zone 'America/Chicago')::int + 7) % 7);
    next_starts_at := (next_local_date::timestamp + seed_group.start_offset) at time zone 'America/Chicago';

    if next_starts_at <= now() then
      next_starts_at := ((next_local_date + 7)::timestamp + seed_group.start_offset) at time zone 'America/Chicago';
    end if;

    with future_gatherings as (
      select
        existing.id,
        (row_number() over (order by existing.starts_at) - 1)::int as offset_week
      from public.dos_group_gatherings existing
      where existing.group_id = seed_group_id
        and existing.status = 'scheduled'
        and existing.starts_at >= now()
        and lower(btrim(existing.title)) = lower(btrim(seed_group.gathering_title))
      order by existing.starts_at
      limit 3
    )
    update public.dos_group_gatherings gatherings
    set starts_at = next_starts_at + (future_gatherings.offset_week * interval '7 days'),
        ends_at = next_starts_at + (future_gatherings.offset_week * interval '7 days') + seed_group.duration,
        location = seed_group.default_location,
        description = seed_group.gathering_description,
        updated_at = now()
    from future_gatherings
    where gatherings.id = future_gatherings.id;

    insert into public.dos_group_gatherings (
      group_id,
      title,
      starts_at,
      ends_at,
      location,
      description,
      status
    )
    select
      seed_group_id,
      seed_group.gathering_title,
      next_starts_at,
      next_starts_at + seed_group.duration,
      seed_group.default_location,
      seed_group.gathering_description,
      'scheduled'
    where not exists (
      select 1
      from public.dos_group_gatherings existing
      where existing.group_id = seed_group_id
        and existing.status = 'scheduled'
        and existing.starts_at >= now()
    );

    if seed_group.slug = '2three2' then
      insert into public.dos_group_resources (
        group_id,
        title,
        description,
        url,
        resource_type,
        sort_order
      )
      select
        seed_group_id,
        '2 Timothy 2:22',
        'Verse anchor for the 2three2 rhythm.',
        null,
        'scripture',
        10
      where not exists (
        select 1
        from public.dos_group_resources existing
        where existing.group_id = seed_group_id
          and lower(btrim(existing.title)) = '2 timothy 2:22'
      );
    end if;
  end loop;
end $$;
