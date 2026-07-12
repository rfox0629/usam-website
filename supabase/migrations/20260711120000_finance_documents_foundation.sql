-- Finance Documents foundation (NCC Finance Phase 1).
--
-- NOT APPLIED to any database as part of this task. This file exists so the
-- Finance Documents interface on the ncc-overhaul-phase1 branch has a real,
-- reviewable migration to build against. It directly mirrors the proven
-- partners_documents pattern (private storage bucket, category grouping,
-- service-role-only access) rather than inventing new infrastructure -- see
-- docs/ncc-architecture.md §20 Phase 1 and supabase/migrations/*_partners_documents*.sql.
--
-- Do not run this against the shared production Supabase project without a
-- deliberate, reviewed decision to do so -- there is currently no isolated
-- staging database for this repository (see docs/track-b-platform-events-status.md
-- for the same staging gap, which applies equally here).

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'finance-documents',
  'finance-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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

create table if not exists public.finance_documents (
  id uuid primary key default gen_random_uuid(),
  group_name text not null,
  doc_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists finance_documents_file_path_idx
  on public.finance_documents(file_path);

create index if not exists finance_documents_group_name_idx
  on public.finance_documents(group_name);

alter table public.finance_documents enable row level security;

-- Access is exclusively server-side via the service role, matching
-- partners_documents exactly: the Finance Documents admin UI (behind
-- Supabase Auth + admin_users) uses the service-role client, which bypasses
-- RLS. No anon/authenticated policies are defined on purpose -- finance
-- records must never be reachable by a public or authenticated-but-non-admin
-- client, and there is no public-facing Finance document route (unlike
-- /partners, which has a signed-URL-gated public reader).
revoke all on table public.finance_documents from anon;
revoke all on table public.finance_documents from authenticated;
