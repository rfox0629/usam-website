create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,
  assigned_team text not null,
  source_page text,
  name text,
  email text,
  phone text,
  payload jsonb default '{}'::jsonb,
  status text default 'new',
  priority text default 'normal',
  assigned_to text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.form_submissions
  add column if not exists form_type text,
  add column if not exists assigned_team text,
  add column if not exists source_page text,
  add column if not exists name text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists message text,
  add column if not exists payload jsonb default '{}'::jsonb,
  add column if not exists status text default 'new',
  add column if not exists priority text default 'normal',
  add column if not exists assigned_to text,
  add column if not exists internal_notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.form_submissions
set
  assigned_team = coalesce(
    nullif(assigned_team, ''),
    case
      when form_type in ('prayer_team_application', 'prayer_request') then 'prayer_team'
      else 'support_team'
    end
  ),
  name = coalesce(nullif(name, ''), nullif(trim(concat_ws(' ', first_name, last_name)), '')),
  payload = coalesce(payload, '{}'::jsonb),
  priority = case
    when priority = 'urgent' then 'high'
    when priority = 'low' then 'normal'
    else coalesce(nullif(priority, ''), 'normal')
  end,
  status = case
    when status = 'follow_up' then 'needs_follow_up'
    else coalesce(nullif(status, ''), 'new')
  end;

alter table public.form_submissions
  alter column form_type set not null,
  alter column assigned_team set default 'support_team',
  alter column assigned_team set not null,
  alter column payload set default '{}'::jsonb,
  alter column status set default 'new',
  alter column priority set default 'normal',
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.form_submissions
  drop constraint if exists form_submissions_assigned_team_check,
  drop constraint if exists form_submissions_form_type_check,
  drop constraint if exists form_submissions_priority_check,
  drop constraint if exists form_submissions_status_check;

alter table public.form_submissions
  add constraint form_submissions_assigned_team_check
  check (assigned_team in ('prayer_team', 'support_team')),
  add constraint form_submissions_form_type_check
  check (
    form_type in (
      'contact',
      'field_report_access',
      'financial_freedom',
      'general',
      'join_mission_interest',
      'major_gift',
      'missionary_application',
      'missionary_profile_review',
      'prayer_request',
      'prayer_team_application',
      'support_giving',
      'system_waitlist'
    )
  ),
  add constraint form_submissions_priority_check
  check (priority in ('normal', 'important', 'high', 'urgent', 'low')),
  add constraint form_submissions_status_check
  check (status in ('new', 'reviewed', 'needs_follow_up', 'follow_up', 'contacted', 'converted', 'archived'));

create index if not exists form_submissions_form_type_idx
  on public.form_submissions(form_type);

create index if not exists form_submissions_status_idx
  on public.form_submissions(status);

create index if not exists form_submissions_assigned_team_idx
  on public.form_submissions(assigned_team);

create index if not exists form_submissions_created_at_idx
  on public.form_submissions(created_at desc);

create index if not exists form_submissions_assigned_team_status_idx
  on public.form_submissions(assigned_team, status, created_at desc);

create index if not exists form_submissions_email_created_idx
  on public.form_submissions(lower(email), created_at desc);

create or replace function public.set_form_submissions_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_form_submissions_updated_at on public.form_submissions;
create trigger set_form_submissions_updated_at
  before update on public.form_submissions
  for each row
  execute function public.set_form_submissions_updated_at();

alter table public.form_submissions enable row level security;

revoke all on table public.form_submissions from anon;
revoke all on table public.form_submissions from authenticated;

grant insert on table public.form_submissions to anon, authenticated;
grant select, update on table public.form_submissions to authenticated;

drop policy if exists "Public can submit form submissions" on public.form_submissions;
create policy "Public can submit form submissions"
  on public.form_submissions
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and priority in ('normal', 'important', 'high', 'urgent', 'low')
    and assigned_team in ('prayer_team', 'support_team')
    and (
      (form_type in ('prayer_team_application', 'prayer_request') and assigned_team = 'prayer_team')
      or (form_type not in ('prayer_team_application', 'prayer_request') and assigned_team = 'support_team')
    )
  );

drop policy if exists "Admins can read form submissions" on public.form_submissions;
create policy "Admins can read form submissions"
  on public.form_submissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower((auth.jwt() ->> 'email'))
    )
  );

drop policy if exists "Admins can update form submissions" on public.form_submissions;
create policy "Admins can update form submissions"
  on public.form_submissions
  for update
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
