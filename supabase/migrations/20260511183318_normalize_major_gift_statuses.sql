alter table public.major_gift_inquiries
  drop constraint if exists major_gift_inquiries_status_check;

update public.major_gift_inquiries
set status = 'needs_follow_up'
where status = 'reviewed';

alter table public.major_gift_inquiries
  add constraint major_gift_inquiries_status_check check (
    status in ('new', 'needs_follow_up', 'contacted', 'closed', 'archived')
  );

drop policy if exists "Admins can update major gift inquiries" on public.major_gift_inquiries;
create policy "Admins can update major gift inquiries"
  on public.major_gift_inquiries
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
    and status in ('new', 'needs_follow_up', 'contacted', 'closed', 'archived')
  );

comment on column public.major_gift_inquiries.status is
  'Major gift follow-up status: new, needs_follow_up, contacted, closed, or archived.';
