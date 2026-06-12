do $$
declare
  fox_household uuid;
begin
  select id into fox_household
  from public.missionary_households
  where slug = 'ryan-brooke-fox';

  if fox_household is not null then
    update public.missionary_people
    set missionary_number = seed.temp_number
    from (
      values
        ('Ryan', 'Fox', '__renumber_002__'),
        ('Brooke', 'Fox', '__renumber_003__'),
        ('Parker', 'Fox', '__renumber_004__'),
        ('Oakley', 'Fox', '__renumber_005__'),
        ('Gunner', 'Fox', '__renumber_006__'),
        ('Axel', 'Fox', '__renumber_007__'),
        ('Jersey', 'Fox', '__renumber_008__')
    ) as seed(first_name, last_name, temp_number)
    where missionary_people.household_id = fox_household
      and lower(missionary_people.first_name) = lower(seed.first_name)
      and lower(coalesce(missionary_people.last_name, '')) = lower(seed.last_name)
      and missionary_people.missionary_number <> seed.temp_number;

    update public.missionary_people
    set missionary_number = seed.missionary_number,
        sort_order = seed.sort_order
    from (
      values
        ('Ryan', 'Fox', '002', 1),
        ('Brooke', 'Fox', '003', 2),
        ('Parker', 'Fox', '004', 3),
        ('Oakley', 'Fox', '005', 4),
        ('Gunner', 'Fox', '006', 5),
        ('Axel', 'Fox', '007', 6),
        ('Jersey', 'Fox', '008', 7)
    ) as seed(first_name, last_name, missionary_number, sort_order)
    where missionary_people.household_id = fox_household
      and lower(missionary_people.first_name) = lower(seed.first_name)
      and lower(coalesce(missionary_people.last_name, '')) = lower(seed.last_name);
  end if;
end $$;
