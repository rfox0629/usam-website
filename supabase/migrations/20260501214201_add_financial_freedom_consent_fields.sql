alter table public.financial_freedom_inquiries
  add column if not exists consent_not_advice boolean not null default false,
  add column if not exists consent_voluntary_submission boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_financial_freedom_inquiries_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_financial_freedom_inquiries_updated_at on public.financial_freedom_inquiries;
create trigger set_financial_freedom_inquiries_updated_at
  before update on public.financial_freedom_inquiries
  for each row
  execute function public.set_financial_freedom_inquiries_updated_at();

drop policy if exists "Public can submit financial freedom inquiries" on public.financial_freedom_inquiries;
create policy "Public can submit financial freedom inquiries"
  on public.financial_freedom_inquiries
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and consent_not_advice = true
    and consent_voluntary_submission = true
  );
