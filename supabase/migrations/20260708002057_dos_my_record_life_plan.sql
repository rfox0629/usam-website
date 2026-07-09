insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'dos-my-record-life-plans',
  'dos-my-record-life-plans',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    updated_at = now();

-- Uploads are handled through the authenticated DOS My Record API with the service role.
-- Keep Life Plan PDFs private; future mentor sharing should use scoped, user-approved signed links.

create table if not exists public.dos_user_life_plans (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.dos_user_records(id) on delete cascade,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  calling_statement text,
  decision_filters text[] not null default '{}'::text[],
  top_priorities jsonb not null default '[]'::jsonb,
  focus_allocation text,
  responsibilities text,
  rarely_do text,
  daily_reminder text,
  legacy_remembered_for text,
  legacy_family text,
  legacy_discipled text,
  legacy_church text,
  legacy_jesus text,
  original_date_written date,
  last_reviewed_date date,
  next_review_date date,
  review_rhythm text,
  review_history jsonb not null default '[]'::jsonb,
  attachment_bucket text,
  attachment_path text,
  attachment_file_name text,
  attachment_content_type text,
  attachment_uploaded_at timestamptz,
  share_eligible boolean not null default false,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_user_life_plan_unique_record unique (record_id),
  constraint dos_user_life_plan_visibility_check check (visibility = 'private'),
  constraint dos_user_life_plan_priorities_array_check check (jsonb_typeof(top_priorities) = 'array'),
  constraint dos_user_life_plan_review_history_array_check check (jsonb_typeof(review_history) = 'array'),
  constraint dos_user_life_plan_attachment_check check (
    (attachment_bucket is null and attachment_path is null)
    or (attachment_bucket = 'dos-my-record-life-plans' and attachment_path is not null)
  ),
  constraint dos_user_life_plan_review_dates_check check (
    next_review_date is null
    or last_reviewed_date is null
    or next_review_date >= last_reviewed_date
  )
);

create index if not exists dos_user_life_plans_workspace_user_idx
  on public.dos_user_life_plans(workspace_id, user_id, updated_at desc);

create index if not exists dos_user_life_plans_attachment_idx
  on public.dos_user_life_plans(workspace_id, user_id, attachment_bucket, attachment_path)
  where attachment_bucket is not null and attachment_path is not null;

drop trigger if exists set_dos_user_life_plans_updated_at on public.dos_user_life_plans;
create trigger set_dos_user_life_plans_updated_at
  before update on public.dos_user_life_plans
  for each row
  execute function public.set_dos_my_record_updated_at();

alter table public.dos_user_life_plans enable row level security;

revoke all on table public.dos_user_life_plans from anon;
revoke all on table public.dos_user_life_plans from authenticated;

grant select, insert, update, delete on table public.dos_user_life_plans to authenticated;
grant all on table public.dos_user_life_plans to service_role;

drop policy if exists "DOS users can manage own life plan" on public.dos_user_life_plans;
create policy "DOS users can manage own life plan"
  on public.dos_user_life_plans
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

comment on table public.dos_user_life_plans is
  'Private DOS My Record Life Plan scoped to one authenticated user and workspace. This stores calling focus, decision filters, priorities, focus allocation, responsibilities, rare activities, legacy notes, review rhythm, review history, and optional original PDF references. It does not create Field activity, Tables, Fruit, Reports, public Profile data, admin profile metrics, or circle scoring data. Future mentor sharing must remain user-controlled and section-specific.';

comment on column public.dos_user_life_plans.top_priorities is
  'User-authored Life Plan priority list stored as an ordered JSON array with labels and optional allocation percentages.';

comment on column public.dos_user_life_plans.review_history is
  'Private user-authored review history for Life Plan accountability and drift checks.';

comment on column public.dos_user_life_plans.share_eligible is
  'User-controlled future sharing eligibility flag. Life Plans remain private by default and are not exposed publicly.';

comment on column public.dos_user_life_plans.attachment_bucket is
  'Private Supabase Storage bucket for an original user-owned Life Plan PDF, when uploaded.';

comment on column public.dos_user_life_plans.attachment_path is
  'Private Supabase Storage object path for an original user-owned Life Plan PDF, when uploaded.';

notify pgrst, 'reload schema';
