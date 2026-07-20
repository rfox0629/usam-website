create index if not exists prayer_partners_missionary_profile_idx
  on public.prayer_partners(missionary_profile_id);

create index if not exists prayer_requests_related_missionary_profile_idx
  on public.prayer_requests(related_missionary_profile_id);

drop policy if exists "Public can read approved household prayer requests" on public.prayer_requests;
create policy "Public can read approved household prayer requests"
  on public.prayer_requests
  for select
  to anon
  using (
    visibility = 'public'
    and status in ('active', 'open')
    and exists (
      select 1
      from public.missionary_households
      where missionary_households.id = prayer_requests.household_id
        and missionary_households.public_visible = true
        and missionary_households.show_prayer is not false
    )
  );
