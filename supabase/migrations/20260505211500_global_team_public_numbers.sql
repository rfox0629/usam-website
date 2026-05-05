do $$
declare
  fox_household uuid;
begin
  update public.missionary_team_members
  set public_number = lpad(regexp_replace(public_number, '\D', '', 'g'), 4, '0')
  where public_number is not null
    and btrim(public_number) <> ''
    and regexp_replace(public_number, '\D', '', 'g') ~ '^\d{1,4}$';

  select id into fox_household
  from public.missionary_households
  where slug = 'ryan-brooke-fox';

  if fox_household is not null then
    update public.missionary_team_members
    set public_number = '0001',
        sort_order = 1,
        is_public = true,
        status = 'active',
        updated_at = now()
    where household_id = fox_household
      and lower(display_name) = 'god';

    update public.missionary_team_members
    set public_number = seed.public_number,
        role_title = seed.role_title,
        sort_order = seed.sort_order,
        is_public = true,
        status = 'active',
        updated_at = now()
    from (
      values
        ('Ryan Fox', '0002', 'Missionary', 2),
        ('Brooke Fox', '0003', 'Missionary', 3),
        ('Parker Fox', '0004', null, 4),
        ('Oakley Fox', '0005', null, 5),
        ('Gunner Fox', '0006', null, 6),
        ('Axel Fox', '0007', null, 7),
        ('Jersey Fox', '0008', null, 8)
    ) as seed(display_name, public_number, role_title, sort_order)
    where missionary_team_members.household_id = fox_household
      and lower(missionary_team_members.display_name) = lower(seed.display_name);

    insert into public.missionary_team_members (
      household_id,
      display_name,
      public_number,
      role_title,
      sort_order,
      is_public,
      source,
      status
    )
    select
      fox_household,
      'God',
      '0001',
      null,
      1,
      true,
      'website_admin',
      'active'
    where not exists (
      select 1
      from public.missionary_team_members existing_member
      where existing_member.household_id = fox_household
        and lower(existing_member.display_name) = 'god'
    );

    insert into public.missionary_team_members (
      household_id,
      display_name,
      public_number,
      role_title,
      sort_order,
      is_public,
      source,
      status
    )
    select
      fox_household,
      seed.display_name,
      seed.public_number,
      seed.role_title,
      seed.sort_order,
      true,
      'website_admin',
      'active'
    from (
      values
        ('Ryan Fox', '0002', 'Missionary', 2),
        ('Brooke Fox', '0003', 'Missionary', 3),
        ('Parker Fox', '0004', null, 4),
        ('Oakley Fox', '0005', null, 5),
        ('Gunner Fox', '0006', null, 6),
        ('Axel Fox', '0007', null, 7),
        ('Jersey Fox', '0008', null, 8)
    ) as seed(display_name, public_number, role_title, sort_order)
    where not exists (
      select 1
      from public.missionary_team_members existing_member
      where existing_member.household_id = fox_household
        and lower(existing_member.display_name) = lower(seed.display_name)
    );
  end if;
end $$;

do $$
declare
  invalid_numbers text;
begin
  select string_agg(display_name || ' (' || id::text || '): ' || public_number, ', ')
  into invalid_numbers
  from public.missionary_team_members
  where public_number is not null
    and public_number !~ '^\d{4}$';

  if invalid_numbers is not null then
    raise exception 'Cannot add global public_number format constraint. Invalid public numbers: %', invalid_numbers;
  end if;
end $$;

do $$
declare
  duplicate_numbers text;
begin
  select string_agg(public_number || ' => ' || members, '; ')
  into duplicate_numbers
  from (
    select
      public_number,
      string_agg(display_name || ' (' || id::text || ')', ', ' order by display_name) as members
    from public.missionary_team_members
    where public_number is not null
    group by public_number
    having count(*) > 1
  ) duplicates;

  if duplicate_numbers is not null then
    raise exception 'Cannot add global public_number uniqueness constraint. Duplicate public numbers: %', duplicate_numbers;
  end if;
end $$;

alter table public.missionary_team_members
  drop constraint if exists missionary_team_members_household_number_unique;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_team_members_public_number_format_check'
      and conrelid = 'public.missionary_team_members'::regclass
  ) then
    alter table public.missionary_team_members
      add constraint missionary_team_members_public_number_format_check
      check (public_number is null or public_number ~ '^\d{4}$');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_team_members_public_number_unique'
      and conrelid = 'public.missionary_team_members'::regclass
  ) then
    alter table public.missionary_team_members
      add constraint missionary_team_members_public_number_unique
      unique (public_number);
  end if;
end $$;

comment on column public.missionary_team_members.public_number is
  'Global display-only USA Missionaries public roster number. UUID remains the backend relationship ID.';
