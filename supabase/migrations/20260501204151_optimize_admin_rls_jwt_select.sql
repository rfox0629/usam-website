drop policy if exists "Admins can read their own allowlist row" on public.admin_users;
create policy "Admins can read their own allowlist row"
  on public.admin_users
  for select
  to authenticated
  using (
    lower(email) = lower(((select auth.jwt()) ->> 'email'))
  );

drop policy if exists "Admins can read financial freedom inquiries" on public.financial_freedom_inquiries;
create policy "Admins can read financial freedom inquiries"
  on public.financial_freedom_inquiries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
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
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
    )
    and status in ('new', 'reviewed', 'follow_up', 'closed')
  );
