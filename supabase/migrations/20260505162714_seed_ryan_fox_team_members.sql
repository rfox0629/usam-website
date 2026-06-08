do $$
declare
  fox_household uuid;
begin
  select id into fox_household
  from public.missionary_households
  where slug = 'ryan-brooke-fox';

  if fox_household is not null then
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
        ('Ryan Fox', '#001', 'Missionary', 1),
        ('Brooke Fox', '#002', 'Missionary', 2),
        ('Parker Fox', '#003', null, 3),
        ('Oakley Fox', '#004', null, 4),
        ('Gunner Fox', '#005', null, 5),
        ('Axel Fox', '#006', null, 6),
        ('Jersey Fox', '#007', null, 7)
    ) as seed(display_name, public_number, role_title, sort_order)
    where not exists (
      select 1
      from public.missionary_team_members existing_member
      where existing_member.household_id = fox_household
        and (
          existing_member.public_number = seed.public_number
          or lower(existing_member.display_name) = lower(seed.display_name)
        )
    );
  end if;
end $$;
