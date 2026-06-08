create extension if not exists pgcrypto;

create table if not exists public.prayer_partners (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  name text,
  email text unique,
  phone text,
  city text,
  state text,
  region text,
  church_affiliation text,
  availability text[],
  email_alerts boolean default true,
  sms_alerts boolean default false,
  status text default 'active',
  permissions jsonb default '{}'::jsonb,
  assigned_coverage jsonb default '{}'::jsonb,
  internal_notes text,
  recruited_by text,
  recruited_by_household_id uuid references public.missionary_households(id) on delete set null,
  recruited_by_household_name text,
  recruited_by_household_number text,
  recruited_by_profile_slug text,
  source text,
  date_joined timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.prayer_partners
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists name text,
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
  add column if not exists recruited_by_household_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists recruited_by_household_name text,
  add column if not exists recruited_by_household_number text,
  add column if not exists recruited_by_profile_slug text,
  add column if not exists source text,
  add column if not exists date_joined timestamptz default now();

update public.prayer_partners
set
  assigned_coverage = coalesce(assigned_coverage, '{}'::jsonb),
  date_joined = coalesce(date_joined, created_at),
  email_alerts = coalesce(email_alerts, true),
  permissions = coalesce(permissions, '{}'::jsonb),
  sms_alerts = coalesce(sms_alerts, false),
  status = coalesce(status, 'active')
where true;

alter table public.prayer_partners
  drop constraint if exists prayer_partners_status_check;

alter table public.prayer_partners
  add constraint prayer_partners_status_check check (
    status in ('active', 'inactive', 'pending', 'declined', 'archived')
  );

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  request text not null,
  category text,
  urgency text default 'normal',
  status text default 'open',
  confidentiality_level text default 'general',
  related_household_id uuid nullable references public.missionary_households(id) on delete set null,
  related_missionary_profile_id uuid nullable references public.missionary_households(id) on delete set null,
  related_state text,
  related_region text,
  assigned_partner_ids uuid[],
  prayer_notes text,
  prayed_count int default 0,
  last_prayed_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.prayer_requests
  add column if not exists request text,
  add column if not exists description text,
  add column if not exists category text,
  add column if not exists urgency text default 'normal',
  add column if not exists status text default 'open',
  add column if not exists confidentiality_level text default 'general',
  add column if not exists household_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists visibility text default 'team',
  add column if not exists related_household_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists related_missionary_profile_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists related_state text,
  add column if not exists related_region text,
  add column if not exists assigned_partner_ids uuid[],
  add column if not exists prayer_notes text,
  add column if not exists prayed_count int default 0,
  add column if not exists last_prayed_at timestamptz,
  add column if not exists answered_at timestamptz;

update public.prayer_requests
set
  request = coalesce(request, description, ''),
  description = coalesce(description, request, ''),
  household_id = coalesce(household_id, related_household_id),
  related_household_id = coalesce(related_household_id, household_id),
  status = case when status = 'active' then 'open' else coalesce(status, 'open') end,
  urgency = coalesce(urgency, 'normal'),
  confidentiality_level = coalesce(confidentiality_level, 'general'),
  prayed_count = coalesce(prayed_count, 0)
where true;

alter table public.prayer_requests
  alter column request set not null,
  alter column status set default 'open',
  alter column urgency set default 'normal',
  alter column confidentiality_level set default 'general',
  alter column prayed_count set default 0;

alter table public.prayer_requests
  drop constraint if exists prayer_requests_status_check,
  drop constraint if exists prayer_requests_urgency_check,
  drop constraint if exists prayer_requests_confidentiality_level_check;

alter table public.prayer_requests
  add constraint prayer_requests_status_check check (status in ('open', 'covered', 'answered', 'archived')),
  add constraint prayer_requests_urgency_check check (urgency in ('normal', 'important', 'urgent')),
  add constraint prayer_requests_confidentiality_level_check check (
    confidentiality_level in ('general', 'missionary_couple', 'kitchen_table', 'confidential')
  );

alter table public.form_submissions
  drop constraint if exists form_submissions_status_check,
  drop constraint if exists form_submissions_priority_check;

alter table public.form_submissions
  add constraint form_submissions_status_check check (
    status in ('new', 'reviewed', 'needs_follow_up', 'contacted', 'converted', 'archived', 'follow_up')
  ),
  add constraint form_submissions_priority_check check (
    priority in ('normal', 'important', 'high', 'low', 'urgent')
  );

create index if not exists prayer_partners_status_state_idx
  on public.prayer_partners(status, state, region);

create index if not exists prayer_partners_date_joined_idx
  on public.prayer_partners(date_joined desc);

create index if not exists prayer_requests_status_urgency_idx
  on public.prayer_requests(status, urgency, created_at desc);

create index if not exists prayer_requests_related_state_region_idx
  on public.prayer_requests(related_state, related_region, status);

create index if not exists prayer_requests_last_prayed_idx
  on public.prayer_requests(last_prayed_at desc);

-- Future DOS integration entry points:
-- - DOS can insert a prayer_requests row when a Kitchen Table is scheduled.
-- - DOS can insert missionary-couple requests when a missionary submits a prayer request.
-- - DOS can attach related_household_id when a household needs prayer coverage.
-- - DOS can queue prayer alerts to approved partners after email/SMS notification services are connected.
