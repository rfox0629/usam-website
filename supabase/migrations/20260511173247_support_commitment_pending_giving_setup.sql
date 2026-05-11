alter table public.support_commitments
  add column if not exists submitted_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz,
  add column if not exists admin_notes text;

update public.support_commitments
set status = case status
  when 'new' then 'pending_giving_setup'
  when 'reviewed' then 'needs_follow_up'
  when 'reconciled' then 'active'
  when 'closed' then 'incomplete'
  when 'archived' then 'cancelled'
  else status
end
where status in ('new', 'reviewed', 'reconciled', 'closed', 'archived');

alter table public.support_commitments
  drop constraint if exists support_commitments_status_check;

alter table public.support_commitments
  add constraint support_commitments_status_check
  check (status in ('pending_giving_setup', 'active', 'incomplete', 'cancelled', 'needs_follow_up'));

create index if not exists support_commitments_household_status_idx
  on public.support_commitments(household_id, status, submitted_at desc);

drop policy if exists "Public can submit support commitments" on public.support_commitments;
create policy "Public can submit support commitments"
  on public.support_commitments
  for insert
  to anon, authenticated
  with check (
    status = 'pending_giving_setup'
    and completed_at is null
    and source in ('missionary_profile', 'general_support_page')
    and gift_type in ('monthly', 'one_time')
    and length(trim(first_name)) > 0
    and length(trim(last_name)) > 0
    and position('@' in email) > 1
  );

drop policy if exists "Admins can update support commitments" on public.support_commitments;
create policy "Admins can update support commitments"
  on public.support_commitments
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
    and status in ('pending_giving_setup', 'active', 'incomplete', 'cancelled', 'needs_follow_up')
  );

comment on table public.support_commitments is
  'Public donor support intent records. Pending Giving Setup does not update public support progress; only Active confirmed monthly commitments should be reconciled into monthly committed totals.';

comment on column public.support_commitments.status is
  'Donor intent reconciliation status: pending_giving_setup, active, incomplete, cancelled, or needs_follow_up.';

comment on column public.support_commitments.submitted_at is
  'Public form submission timestamp. This is separate from completed_at because the giving platform confirms actual giving later.';
