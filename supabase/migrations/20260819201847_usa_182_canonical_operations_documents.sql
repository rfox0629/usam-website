-- USA-182: promote the USA-181 finance document table to the canonical shared
-- organizational document library.
--
-- Both the table and its bucket were empty, so this reshape cost nothing and
-- avoided an organization-wide library permanently named "finance". A bylaws
-- document does not belong in a table called finance_documents.
--
-- The empty finance-documents bucket is left in place: Supabase blocks direct
-- deletion from storage tables, and forcing it is not worth it for an empty
-- bucket nothing references.

alter table if exists public.finance_documents rename to operations_documents;

alter table public.operations_documents
  add column if not exists category text not null default 'other',
  add column if not exists sensitivity text not null default 'normal',
  add column if not exists source text not null default 'operations_upload',
  add column if not exists storage_bucket text not null default 'operations-documents',
  add column if not exists hash_algorithm text not null default 'sha256',
  add column if not exists document_date date,
  add column if not exists tags text[] not null default array[]::text[],
  add column if not exists legacy_source_table text,
  add column if not exists legacy_source_id text,
  add column if not exists legacy_storage_bucket text,
  add column if not exists legacy_storage_path text,
  add column if not exists legacy_etag text,
  -- Reserved for later extraction/search. Nothing in this slice reads them.
  add column if not exists extracted_text text,
  add column if not exists extracted_at timestamptz;

alter table public.operations_documents drop constraint if exists operations_documents_category_check;
alter table public.operations_documents add constraint operations_documents_category_check
  check (category in (
    'corporate_legal','irs_tax','state_compliance','governance_board','finance_banking',
    'insurance','policies','contracts_agreements','missionaries_personnel','ministry_programs','other'
  ));

alter table public.operations_documents drop constraint if exists operations_documents_sensitivity_check;
alter table public.operations_documents add constraint operations_documents_sensitivity_check
  check (sensitivity in ('normal','finance_restricted','personnel_restricted','case_restricted','system_restricted'));

alter table public.operations_documents drop constraint if exists operations_documents_source_check;
alter table public.operations_documents add constraint operations_documents_source_check
  check (source in ('operations_upload','legacy_migration','generated','external_integration'));

alter table public.operations_documents drop constraint if exists operations_documents_hash_algorithm_check;
alter table public.operations_documents add constraint operations_documents_hash_algorithm_check
  check (hash_algorithm in ('sha256','md5_etag'));

-- A migrated record must carry its provenance back to the original.
alter table public.operations_documents drop constraint if exists operations_documents_legacy_provenance_check;
alter table public.operations_documents add constraint operations_documents_legacy_provenance_check
  check (
    source <> 'legacy_migration'
    or (legacy_source_table is not null and legacy_source_id is not null and legacy_storage_path is not null)
  );

create index if not exists operations_documents_category_idx
  on public.operations_documents(organization_id, category, uploaded_at desc);
create index if not exists operations_documents_sensitivity_idx
  on public.operations_documents(organization_id, sensitivity);
-- Re-running the legacy import can never create a second record for one source.
create unique index if not exists operations_documents_legacy_uidx
  on public.operations_documents(legacy_source_table, legacy_source_id)
  where legacy_source_id is not null;

comment on table public.operations_documents is
  'Canonical shared organizational document library. One document, one record, many contextual uses via document_references.';
comment on column public.operations_documents.storage_bucket is
  'Bucket holding the original. Legacy-migrated records point at the legacy bucket so no file is ever moved or copied.';

-- Contextual usage. Separate from the document so removing a reference can
-- never reach the file: there is no cascade from a reference to a document.
create table if not exists public.document_references (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.operations_documents(id) on delete cascade,
  reference_type text not null,
  reference_id text not null,
  context_note text,
  created_by text,
  created_at timestamptz not null default now(),
  constraint document_references_type_check check (reference_type in (
    'organization','tax_period','compliance_fact','compliance_filing','bank_statement',
    'reconciliation','form_990_workpaper','governance_record','missionary_application','submission'
  ))
);

create unique index if not exists document_references_unique_idx
  on public.document_references(document_id, reference_type, reference_id);
create index if not exists document_references_target_idx
  on public.document_references(reference_type, reference_id);

comment on table public.document_references is
  'Where a canonical document is used across Operations. Deleting a reference removes the usage link only; the document and its file are untouched.';

alter table public.document_references enable row level security;
revoke all on table public.document_references from anon;
revoke all on table public.document_references from authenticated;
grant select, insert, update, delete on table public.document_references to authenticated;

drop policy if exists "Admins manage document_references" on public.document_references;
create policy "Admins manage document_references" on public.document_references for all to authenticated
  using (exists (select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email')) and admin_users.role = 'admin'))
  with check (exists (select 1 from public.admin_users
    where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email')) and admin_users.role = 'admin'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('operations-documents','operations-documents',false,26214400,
  array['application/pdf','image/png','image/jpeg','text/csv','application/vnd.ms-excel',
        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;
