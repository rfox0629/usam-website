create table if not exists public.system_access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  type text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_access_codes
  add column if not exists code text,
  add column if not exists type text,
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'system_access_codes'
      and column_name = 'code_type'
  ) then
    execute 'update public.system_access_codes set type = coalesce(nullif(type, ''''), code_type) where type is null or btrim(type) = ''''';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'system_access_codes'
      and column_name = 'is_active'
  ) then
    execute 'update public.system_access_codes set active = coalesce(is_active, true) where active is null';
  end if;
end $$;

update public.system_access_codes
set active = true
where active is null;

alter table public.system_access_codes
  alter column code set not null,
  alter column type set not null,
  alter column active set not null,
  alter column active set default true;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'system_access_codes_type_check'
      and conrelid = 'public.system_access_codes'::regclass
  ) then
    alter table public.system_access_codes
      drop constraint system_access_codes_type_check;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'system_access_codes_access_type_check'
      and conrelid = 'public.system_access_codes'::regclass
  ) then
    alter table public.system_access_codes
      add constraint system_access_codes_access_type_check
      check (type in ('system', 'team', 'preview'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'system_access_codes_code_not_blank'
      and conrelid = 'public.system_access_codes'::regclass
  ) then
    alter table public.system_access_codes
      add constraint system_access_codes_code_not_blank
      check (btrim(code) <> '');
  end if;
end $$;

create unique index if not exists system_access_codes_type_unique
  on public.system_access_codes(type);

create index if not exists system_access_codes_access_lookup_idx
  on public.system_access_codes(type, active);

alter table public.system_access_codes enable row level security;

revoke all on table public.system_access_codes from anon;
revoke all on table public.system_access_codes from authenticated;

create or replace function public.set_system_access_codes_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_system_access_codes_updated_at on public.system_access_codes;
create trigger set_system_access_codes_updated_at
  before update on public.system_access_codes
  for each row
  execute function public.set_system_access_codes_updated_at();

comment on table public.system_access_codes is
  'Server-only system, team, and DOS preview access codes managed from Admin Settings.';
