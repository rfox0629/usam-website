insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'dos-my-record-assessments',
  'dos-my-record-assessments',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    updated_at = now();

-- Uploads are handled through the authenticated DOS My Record API with the service role.
-- Keep reports private; future sharing should use scoped, user-approved signed links.

alter table public.dos_user_external_assessment_results
  add column if not exists short_summary text,
  add column if not exists status text not null default 'completed',
  add column if not exists share_eligible boolean not null default false,
  add column if not exists attachment_bucket text,
  add column if not exists attachment_path text,
  add column if not exists attachment_file_name text,
  add column if not exists attachment_content_type text,
  add column if not exists attachment_uploaded_at timestamptz;

alter table public.dos_user_external_assessment_results
  drop constraint if exists dos_user_external_assessment_status_check;

alter table public.dos_user_external_assessment_results
  add constraint dos_user_external_assessment_status_check
  check (status in ('completed', 'not_started', 'draft'));

create index if not exists dos_user_external_assessment_results_status_idx
  on public.dos_user_external_assessment_results(workspace_id, user_id, status, date_taken desc);

create index if not exists dos_user_external_assessment_results_attachment_idx
  on public.dos_user_external_assessment_results(workspace_id, user_id, attachment_bucket, attachment_path)
  where attachment_bucket is not null and attachment_path is not null;

comment on column public.dos_user_external_assessment_results.short_summary is
  'User-authored short assessment summary for the private My Record assessment library. Do not store proprietary assessment explanation text here.';

comment on column public.dos_user_external_assessment_results.status is
  'Private My Record assessment library status: completed, not_started, or draft.';

comment on column public.dos_user_external_assessment_results.share_eligible is
  'User-controlled future sharing eligibility flag. Results remain private by default and are not exposed publicly.';

comment on column public.dos_user_external_assessment_results.attachment_bucket is
  'Private Supabase Storage bucket for an original user-owned assessment report, when uploaded.';

comment on column public.dos_user_external_assessment_results.attachment_path is
  'Private Supabase Storage object path for an original user-owned assessment report, when uploaded.';

comment on column public.dos_user_external_assessment_results.attachment_file_name is
  'Original report filename for user display only.';

comment on column public.dos_user_external_assessment_results.attachment_content_type is
  'Original report MIME type for user display only.';

comment on table public.dos_user_external_assessment_results is
  'Private DOS My Record manual external assessment results scoped to one authenticated user and workspace. This stores user-owned results, user-authored summaries, brief general interpretations, and optional original report references only. It must not copy external assessment questions, scoring systems, proprietary explanation tables, or copyrighted manuals. These do not create Field activity, Tables, Fruit, Reports, public Profile data, admin profile metrics, or circle scoring data.';

notify pgrst, 'reload schema';
