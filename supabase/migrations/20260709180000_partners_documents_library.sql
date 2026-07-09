insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'partners-documents',
  'partners-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

create table if not exists public.partners_documents (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,
  doc_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists partners_documents_file_path_idx
  on public.partners_documents(file_path);

create index if not exists partners_documents_group_name_idx
  on public.partners_documents(group_name);

alter table public.partners_documents enable row level security;

-- Access is exclusively server-side via the service role: the admin upload/manage
-- UI (behind Supabase Auth + admin_users) and the /partners document route (behind
-- the PARTNERS_ACCESS_KEY cookie gate) both use the service-role client, which
-- bypasses RLS. No anon/authenticated policies are defined on purpose, matching
-- the private usam-application-photos bucket.
revoke all on table public.partners_documents from anon;
revoke all on table public.partners_documents from authenticated;
