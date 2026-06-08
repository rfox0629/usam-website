insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'missionary-images',
  'missionary-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    updated_at = now();

drop policy if exists "Public can read missionary images" on storage.objects;
create policy "Public can read missionary images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'missionary-images');

drop policy if exists "Admins can upload missionary images" on storage.objects;
create policy "Admins can upload missionary images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'missionary-images'
    and exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
    )
  );

drop policy if exists "Admins can replace missionary images" on storage.objects;
create policy "Admins can replace missionary images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'missionary-images'
    and exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
    )
  )
  with check (
    bucket_id = 'missionary-images'
    and exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
    )
  );

grant select on table storage.objects to anon;
grant select, insert, update on table storage.objects to authenticated;

drop policy if exists "Admins can read missionary households" on public.missionary_households;
create policy "Admins can read missionary households"
  on public.missionary_households
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
    )
  );

drop policy if exists "Admins can update missionary household images" on public.missionary_households;
create policy "Admins can update missionary household images"
  on public.missionary_households
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
  );

revoke update on table public.missionary_households from authenticated;
grant select on table public.missionary_households to authenticated;
grant update (profile_image_url, hero_image_url, updated_at) on table public.missionary_households to authenticated;
