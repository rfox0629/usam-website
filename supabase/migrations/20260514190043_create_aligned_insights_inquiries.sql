create table if not exists public.aligned_insights_inquiries (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  organization_name text not null,
  organization_type text not null,
  annual_revenue text not null,
  looking_for text,
  message text,
  source text not null default 'alignedinsights.tech',
  status text not null default 'New'
    check (status in ('New', 'Contacted', 'Intake Sent', 'Reviewing', 'Completed')),
  intake_email_sent_at timestamptz,
  intake_email_sent_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aligned_insights_inquiries_email_idx
on public.aligned_insights_inquiries (email);

create index if not exists aligned_insights_inquiries_status_created_at_idx
on public.aligned_insights_inquiries (status, created_at desc);

alter table public.aligned_insights_inquiries enable row level security;

revoke all on public.aligned_insights_inquiries from anon, authenticated;

drop policy if exists "aligned insights inquiries service role only"
on public.aligned_insights_inquiries;

create policy "aligned insights inquiries service role only"
on public.aligned_insights_inquiries
for all
to service_role
using (true)
with check (true);;
