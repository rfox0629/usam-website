create table if not exists public.financial_intake_links (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  contact_email text,
  organization_name text,
  status text not null default 'active' check (status in ('active', 'submitted', 'expired', 'disabled')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

create table if not exists public.financial_intake_submissions (
  id uuid primary key default gen_random_uuid(),
  link_id uuid references public.financial_intake_links(id) on delete set null,
  token text not null,
  organization_profile jsonb,
  financial_systems jsonb,
  reporting_visibility jsonb,
  payroll_staffing jsonb,
  giving_funds jsonb,
  banking_cash_debt jsonb,
  internal_controls jsonb,
  pain_points_goals jsonb,
  uploads jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_intake_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.financial_intake_submissions(id) on delete cascade,
  file_label text,
  file_name text,
  file_path text,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists financial_intake_links_token_idx on public.financial_intake_links(token);
create index if not exists financial_intake_links_status_idx on public.financial_intake_links(status);
create index if not exists financial_intake_submissions_link_id_idx on public.financial_intake_submissions(link_id);
create index if not exists financial_intake_files_submission_id_idx on public.financial_intake_files(submission_id);

create or replace function public.set_financial_intake_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_financial_intake_submissions_updated_at on public.financial_intake_submissions;
create trigger set_financial_intake_submissions_updated_at
before update on public.financial_intake_submissions
for each row execute function public.set_financial_intake_updated_at();

alter table public.financial_intake_links enable row level security;
alter table public.financial_intake_submissions enable row level security;
alter table public.financial_intake_files enable row level security;

-- MVP: no anon/authenticated direct table access. Server routes use service role, which bypasses RLS.
revoke all on public.financial_intake_links from anon, authenticated;
revoke all on public.financial_intake_submissions from anon, authenticated;
revoke all on public.financial_intake_files from anon, authenticated;

drop policy if exists "financial intake links service role only" on public.financial_intake_links;
drop policy if exists "financial intake submissions service role only" on public.financial_intake_submissions;
drop policy if exists "financial intake files service role only" on public.financial_intake_files;

create policy "financial intake links service role only"
on public.financial_intake_links
for all
to service_role
using (true)
with check (true);

create policy "financial intake submissions service role only"
on public.financial_intake_submissions
for all
to service_role
using (true)
with check (true);

create policy "financial intake files service role only"
on public.financial_intake_files
for all
to service_role
using (true)
with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'financial-intake-files',
  'financial-intake-files',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "financial intake storage service role only" on storage.objects;
create policy "financial intake storage service role only"
on storage.objects
for all
to service_role
using (bucket_id = 'financial-intake-files')
with check (bucket_id = 'financial-intake-files');;
