do $$
declare
  fox_household uuid;
begin
  if to_regclass('public.missionary_team_members') is not null then
    select id into fox_household
    from public.missionary_households
    where slug = 'ryan-brooke-fox';

    update public.missionary_team_members
    set public_number = lpad(regexp_replace(public_number, '\D', '', 'g'), 4, '0')
    where public_number is not null
      and btrim(public_number) <> ''
      and regexp_replace(public_number, '\D', '', 'g') ~ '^\d{1,4}$';

    delete from public.missionary_team_members
    where public_number = '0001'
      or lower(display_name) = 'new team member'
      or (
        fox_household is not null
        and household_id = fox_household
        and lower(display_name) in (
          'god',
          'ryan fox',
          'brooke fox',
          'parker fox',
          'oakley fox',
          'gunner fox',
          'axel fox',
          'jersey fox'
        )
      );

    alter table public.missionary_team_members
      drop constraint if exists missionary_team_members_public_number_format_check;

    alter table public.missionary_team_members
      add constraint missionary_team_members_public_number_format_check
      check (
        public_number is null
        or (
          public_number ~ '^\d{4}$'
          and public_number <> '0001'
        )
      );

    comment on column public.missionary_team_members.public_number is
      'Global display-only USA Missionaries roster number. UUID remains the backend relationship ID. 0001 is reserved and must not be assigned to a stored team member.';
  end if;
end $$;
