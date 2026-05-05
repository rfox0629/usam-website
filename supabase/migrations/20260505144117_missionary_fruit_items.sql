create extension if not exists pgcrypto;

create table if not exists public.missionary_fruit_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.missionary_households(id) on delete cascade,
  source text not null default 'website_admin',
  source_app text,
  source_external_id text,
  title text,
  body text not null,
  category text,
  testimony_date date,
  submitted_by_name text,
  submitted_by_user_id text,
  permission_to_share boolean not null default false,
  missionary_public_approved boolean not null default false,
  visibility text not null default 'private',
  status text not null default 'draft',
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint missionary_fruit_items_source_check check (source in ('website_admin', 'dos', 'public_form')),
  constraint missionary_fruit_items_status_check check (status in ('draft', 'published', 'hidden', 'archived')),
  constraint missionary_fruit_items_visibility_check check (visibility in ('private', 'internal', 'public'))
);

create index if not exists missionary_fruit_items_household_status_idx
  on public.missionary_fruit_items(household_id, status);

create index if not exists missionary_fruit_items_public_profile_idx
  on public.missionary_fruit_items(
    household_id,
    is_featured desc,
    sort_order asc,
    testimony_date desc nulls last,
    created_at desc
  )
  where status = 'published'
    and visibility = 'public'
    and permission_to_share = true
    and missionary_public_approved = true;

create unique index if not exists missionary_fruit_items_source_external_unique
  on public.missionary_fruit_items(source, source_app, source_external_id)
  where source_external_id is not null;

create or replace function public.set_missionary_fruit_items_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_missionary_fruit_items_updated_at on public.missionary_fruit_items;
create trigger set_missionary_fruit_items_updated_at
  before update on public.missionary_fruit_items
  for each row
  execute function public.set_missionary_fruit_items_updated_at();

alter table public.missionary_fruit_items enable row level security;

revoke all on table public.missionary_fruit_items from anon;
revoke all on table public.missionary_fruit_items from authenticated;

grant select on table public.missionary_fruit_items to anon;
grant select, insert, update on table public.missionary_fruit_items to authenticated;

drop policy if exists "Public can read approved missionary fruit" on public.missionary_fruit_items;
create policy "Public can read approved missionary fruit"
  on public.missionary_fruit_items
  for select
  to anon, authenticated
  using (
    status = 'published'
    and visibility = 'public'
    and permission_to_share = true
    and missionary_public_approved = true
    and exists (
      select 1
      from public.missionary_households
      where missionary_households.id = missionary_fruit_items.household_id
        and missionary_households.public_visible = true
    )
  );

drop policy if exists "Admins can read missionary fruit" on public.missionary_fruit_items;
create policy "Admins can read missionary fruit"
  on public.missionary_fruit_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  );

drop policy if exists "Admins can insert missionary fruit" on public.missionary_fruit_items;
create policy "Admins can insert missionary fruit"
  on public.missionary_fruit_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  );

drop policy if exists "Admins can update missionary fruit" on public.missionary_fruit_items;
create policy "Admins can update missionary fruit"
  on public.missionary_fruit_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  );

insert into public.missionary_fruit_items (
  household_id,
  source,
  title,
  body,
  category,
  visibility,
  status,
  permission_to_share,
  missionary_public_approved,
  is_featured,
  sort_order
)
select
  missionary_households.id,
  'website_admin',
  'Field Fruit',
  trim(fruit_item.body),
  'Field Fruit',
  'private',
  'draft',
  false,
  false,
  false,
  fruit_item.ordinality
from public.missionary_households
cross join lateral regexp_split_to_table(coalesce(missionary_households.fruit_from_field, ''), E'\\n\\s*\\n') with ordinality as fruit_item(body, ordinality)
where trim(fruit_item.body) <> ''
  and not exists (
    select 1
    from public.missionary_fruit_items existing
    where existing.household_id = missionary_households.id
      and existing.source = 'website_admin'
      and existing.body = trim(fruit_item.body)
  );
