create table if not exists public.system_access_codes (
  id uuid primary key default gen_random_uuid(),
  code_type text not null unique,
  code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint system_access_codes_type_check check (code_type in ('system', 'team', 'preview')),
  constraint system_access_codes_code_not_blank check (btrim(code) <> '')
);

create index if not exists system_access_codes_type_active_idx
  on public.system_access_codes(code_type, is_active);

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
