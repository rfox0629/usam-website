alter table public.missionary_households
  add column if not exists public_slug text,
  add column if not exists public_display_name text,
  add column if not exists public_slug_aliases text[] not null default '{}'::text[];

create unique index if not exists missionary_households_public_slug_uidx
  on public.missionary_households (lower(public_slug))
  where public_slug is not null;

create index if not exists missionary_households_public_slug_aliases_gin_idx
  on public.missionary_households using gin (public_slug_aliases);

comment on column public.missionary_households.public_slug is
  'Canonical public Profiles URL slug. This is intentionally separate from the private DOS/workspace slug.';

comment on column public.missionary_households.public_display_name is
  'Public-facing Profiles display name. Leave null to use the workspace display_name.';

comment on column public.missionary_households.public_slug_aliases is
  'Legacy public profile slugs that should resolve to the canonical public_slug without changing DOS workspace routing.';

do $$
declare
  fox_household_id uuid;
begin
  select id
  into fox_household_id
  from public.missionary_households
  where slug in ('ryan-brooke-fox', 'ryan-fox')
  order by case slug when 'ryan-brooke-fox' then 0 else 1 end
  limit 1;

  if fox_household_id is null then
    return;
  end if;

  update public.missionary_households
  set public_slug = 'fox-family',
      public_display_name = 'Fox Family',
      public_slug_aliases = (
        select array_agg(distinct alias_slug order by alias_slug)
        from unnest(coalesce(public_slug_aliases, '{}'::text[]) || array['ryan-fox', 'ryan-brooke-fox']) as alias_slug
      ),
      show_household = true,
      show_team = true,
      show_support = true,
      public_visible = true,
      updated_at = now()
  where id = fox_household_id;

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
  values
    (fox_household_id, 'Ryan Fox', '0002', 'Missionary', 1, true, 'website_admin', 'active'),
    (fox_household_id, 'Brooke Fox', '0003', 'Missionary', 2, true, 'website_admin', 'active'),
    (fox_household_id, 'Parker Fox', '0004', null, 3, true, 'website_admin', 'active'),
    (fox_household_id, 'Oakley Fox', '0005', null, 4, true, 'website_admin', 'active'),
    (fox_household_id, 'Gunner Fox', '0006', null, 5, true, 'website_admin', 'active'),
    (fox_household_id, 'Axel Fox', '0007', null, 6, true, 'website_admin', 'active'),
    (fox_household_id, 'Jersey Fox', '0008', null, 7, true, 'website_admin', 'active')
  on conflict (public_number) do update
  set display_name = excluded.display_name,
      household_id = excluded.household_id,
      role_title = excluded.role_title,
      sort_order = excluded.sort_order,
      is_public = true,
      status = 'active',
      updated_at = now();
end $$;
