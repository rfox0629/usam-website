create table if not exists public.prayer_partners (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  city text,
  state text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.prayer_partners
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists region text,
  add column if not exists church_affiliation text,
  add column if not exists availability text[],
  add column if not exists email_alerts boolean default true,
  add column if not exists sms_alerts boolean default false,
  add column if not exists status text default 'active',
  add column if not exists permissions jsonb default '{}'::jsonb,
  add column if not exists assigned_coverage jsonb default '{}'::jsonb,
  add column if not exists internal_notes text,
  add column if not exists recruited_by text,
  add column if not exists recruited_by_household_id uuid,
  add column if not exists recruited_by_household_name text,
  add column if not exists recruited_by_household_number text,
  add column if not exists recruited_by_profile_slug text,
  add column if not exists source text,
  add column if not exists date_joined timestamptz default now(),
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.prayer_partners
set
  assigned_coverage = coalesce(assigned_coverage, '{}'::jsonb),
  date_joined = coalesce(date_joined, created_at, now()),
  email_alerts = coalesce(email_alerts, true),
  permissions = coalesce(permissions, '{}'::jsonb),
  sms_alerts = coalesce(sms_alerts, false),
  status = coalesce(nullif(status, ''), 'active');

alter table public.prayer_partners
  alter column status set default 'active',
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.prayer_partners
  drop constraint if exists prayer_partners_status_check;

alter table public.prayer_partners
  add constraint prayer_partners_status_check
  check (status in ('active', 'inactive', 'pending', 'declined', 'archived'));

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  title text,
  request text,
  category text,
  urgency text default 'normal',
  status text default 'open',
  assigned_partner_ids uuid[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.prayer_requests
  add column if not exists title text,
  add column if not exists request text,
  add column if not exists description text,
  add column if not exists category text,
  add column if not exists urgency text default 'normal',
  add column if not exists status text default 'open',
  add column if not exists visibility text default 'team',
  add column if not exists confidentiality_level text default 'general',
  add column if not exists household_id uuid,
  add column if not exists related_household_id uuid,
  add column if not exists related_missionary_profile_id uuid,
  add column if not exists related_state text,
  add column if not exists related_region text,
  add column if not exists assigned_partner_ids uuid[],
  add column if not exists prayer_notes text,
  add column if not exists prayed_count int default 0,
  add column if not exists last_prayed_at timestamptz,
  add column if not exists answered_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.prayer_requests
set
  confidentiality_level = coalesce(nullif(confidentiality_level, ''), 'general'),
  description = coalesce(description, request),
  prayed_count = coalesce(prayed_count, 0),
  request = coalesce(request, description, ''),
  status = case
    when status = 'active' then 'open'
    else coalesce(nullif(status, ''), 'open')
  end,
  urgency = coalesce(nullif(urgency, ''), 'normal'),
  visibility = coalesce(nullif(visibility, ''), 'team');

alter table public.prayer_requests
  alter column urgency set default 'normal',
  alter column status set default 'open',
  alter column visibility set default 'team',
  alter column confidentiality_level set default 'general',
  alter column prayed_count set default 0,
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.prayer_requests
  drop constraint if exists prayer_requests_status_check,
  drop constraint if exists prayer_requests_urgency_check,
  drop constraint if exists prayer_requests_visibility_check,
  drop constraint if exists prayer_requests_confidentiality_level_check;

alter table public.prayer_requests
  add constraint prayer_requests_status_check
  check (status in ('open', 'covered', 'answered', 'archived', 'active')),
  add constraint prayer_requests_urgency_check
  check (urgency in ('normal', 'important', 'urgent')),
  add constraint prayer_requests_visibility_check
  check (visibility in ('public', 'team', 'private')),
  add constraint prayer_requests_confidentiality_level_check
  check (confidentiality_level in ('general', 'missionary_couple', 'kitchen_table', 'confidential'));

create index if not exists prayer_partners_email_lower_idx
  on public.prayer_partners(lower(email));

create index if not exists prayer_partners_status_joined_idx
  on public.prayer_partners(status, date_joined desc);

create index if not exists prayer_partners_state_region_idx
  on public.prayer_partners(state, region);

create index if not exists prayer_requests_status_urgency_idx
  on public.prayer_requests(status, urgency, created_at desc);

create index if not exists prayer_requests_related_household_idx
  on public.prayer_requests(related_household_id, status);

create index if not exists prayer_requests_household_status_idx
  on public.prayer_requests(household_id, status);

create index if not exists prayer_requests_visibility_status_idx
  on public.prayer_requests(visibility, status);

create or replace function public.set_prayer_team_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_prayer_partners_updated_at on public.prayer_partners;
create trigger set_prayer_partners_updated_at
  before update on public.prayer_partners
  for each row
  execute function public.set_prayer_team_updated_at();

drop trigger if exists set_prayer_requests_updated_at on public.prayer_requests;
create trigger set_prayer_requests_updated_at
  before update on public.prayer_requests
  for each row
  execute function public.set_prayer_team_updated_at();

alter table public.prayer_partners enable row level security;
alter table public.prayer_requests enable row level security;

revoke all on table public.prayer_partners from anon;
revoke all on table public.prayer_partners from authenticated;
revoke all on table public.prayer_requests from anon;
revoke all on table public.prayer_requests from authenticated;

grant select, insert, update on table public.prayer_partners to authenticated;
grant select on table public.prayer_requests to anon;
grant select, insert, update on table public.prayer_requests to authenticated;

drop policy if exists "Admins can manage prayer partners" on public.prayer_partners;
create policy "Admins can manage prayer partners"
  on public.prayer_partners
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower((auth.jwt() ->> 'email'))
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower((auth.jwt() ->> 'email'))
    )
  );

drop policy if exists "Admins can manage prayer requests" on public.prayer_requests;
create policy "Admins can manage prayer requests"
  on public.prayer_requests
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower((auth.jwt() ->> 'email'))
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower((auth.jwt() ->> 'email'))
    )
  );

drop policy if exists "Public can read active public prayer requests" on public.prayer_requests;
create policy "Public can read active public prayer requests"
  on public.prayer_requests
  for select
  to anon
  using (
    visibility = 'public'
    and status in ('active', 'open')
  );
