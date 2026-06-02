create extension if not exists pgcrypto;

create table if not exists public.financial_freedom_inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  help_budget boolean default false,
  help_debt boolean default false,
  help_savings boolean default false,
  help_retirement boolean default false,
  help_generosity boolean default false,
  help_overall_plan boolean default false,
  monthly_income numeric,
  monthly_expenses numeric,
  current_savings numeric,
  total_debt numeric,
  monthly_debt_payments numeric,
  monthly_giving numeric,
  main_financial_burden text,
  desired_12_month_outcome text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint financial_freedom_inquiries_status_check check (
    status in ('new', 'reviewed', 'follow_up', 'closed')
  )
);

create index if not exists financial_freedom_inquiries_created_at_idx
  on public.financial_freedom_inquiries(created_at desc);

create index if not exists financial_freedom_inquiries_status_idx
  on public.financial_freedom_inquiries(status);

alter table public.financial_freedom_inquiries enable row level security;

revoke all on table public.financial_freedom_inquiries from anon;
revoke all on table public.financial_freedom_inquiries from authenticated;

grant insert on table public.financial_freedom_inquiries to anon;
grant insert on table public.financial_freedom_inquiries to authenticated;
grant select on table public.financial_freedom_inquiries to authenticated;
grant update(status) on table public.financial_freedom_inquiries to authenticated;

drop policy if exists "Public can submit financial freedom inquiries" on public.financial_freedom_inquiries;
create policy "Public can submit financial freedom inquiries"
  on public.financial_freedom_inquiries
  for insert
  to anon, authenticated
  with check (status = 'new');

drop policy if exists "Admins can read financial freedom inquiries" on public.financial_freedom_inquiries;
create policy "Admins can read financial freedom inquiries"
  on public.financial_freedom_inquiries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
    )
  );

drop policy if exists "Admins can update financial freedom inquiry status" on public.financial_freedom_inquiries;
create policy "Admins can update financial freedom inquiry status"
  on public.financial_freedom_inquiries
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
    )
    and status in ('new', 'reviewed', 'follow_up', 'closed')
  );;
