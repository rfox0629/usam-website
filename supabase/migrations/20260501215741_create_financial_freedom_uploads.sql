insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'financial-freedom-uploads',
  'financial-freedom-uploads',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

create table if not exists public.financial_freedom_uploads (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.financial_freedom_inquiries(id) on delete cascade,
  file_path text not null,
  file_name text,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists financial_freedom_uploads_inquiry_id_idx
  on public.financial_freedom_uploads(inquiry_id);

create unique index if not exists financial_freedom_uploads_file_path_idx
  on public.financial_freedom_uploads(file_path);

alter table public.financial_freedom_uploads enable row level security;

revoke all on table public.financial_freedom_uploads from anon;
revoke all on table public.financial_freedom_uploads from authenticated;

grant select on table public.financial_freedom_uploads to authenticated;

drop policy if exists "Admins can read financial freedom uploads" on public.financial_freedom_uploads;
create policy "Admins can read financial freedom uploads"
  on public.financial_freedom_uploads
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
    )
  );

drop policy if exists "Admins can read financial freedom upload objects" on storage.objects;
create policy "Admins can read financial freedom upload objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'financial-freedom-uploads'
    and exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
    )
  );
