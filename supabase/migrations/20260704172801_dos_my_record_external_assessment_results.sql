create table if not exists public.dos_user_external_assessment_results (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.dos_user_records(id) on delete cascade,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_name text not null,
  category text,
  official_assessment_url text,
  date_taken date not null default current_date,
  result_type text,
  top_strengths text[] not null default '{}'::text[],
  scores_details text,
  notes text,
  attachment_url text,
  retake_reminder_date date,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_user_external_assessment_name_not_empty check (length(btrim(assessment_name)) > 0),
  constraint dos_user_external_assessment_visibility_check check (visibility = 'private'),
  constraint dos_user_external_assessment_official_url_check check (
    official_assessment_url is null
    or official_assessment_url ~* '^https?://'
  ),
  constraint dos_user_external_assessment_attachment_url_check check (
    attachment_url is null
    or attachment_url ~* '^https?://'
  )
);

create index if not exists dos_user_external_assessment_results_record_date_idx
  on public.dos_user_external_assessment_results(record_id, date_taken desc, created_at desc);

create index if not exists dos_user_external_assessment_results_category_idx
  on public.dos_user_external_assessment_results(workspace_id, user_id, category, date_taken desc);

create index if not exists dos_user_external_assessment_results_retake_idx
  on public.dos_user_external_assessment_results(workspace_id, user_id, retake_reminder_date)
  where retake_reminder_date is not null;

drop trigger if exists set_dos_user_external_assessment_results_updated_at on public.dos_user_external_assessment_results;
create trigger set_dos_user_external_assessment_results_updated_at
  before update on public.dos_user_external_assessment_results
  for each row
  execute function public.set_dos_my_record_updated_at();

alter table public.dos_user_external_assessment_results enable row level security;

revoke all on table public.dos_user_external_assessment_results from anon;
revoke all on table public.dos_user_external_assessment_results from authenticated;

grant select, insert, update, delete on table public.dos_user_external_assessment_results to authenticated;
grant all on table public.dos_user_external_assessment_results to service_role;

drop policy if exists "DOS users can manage own external assessment results" on public.dos_user_external_assessment_results;
create policy "DOS users can manage own external assessment results"
  on public.dos_user_external_assessment_results
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

comment on table public.dos_user_external_assessment_results is
  'Private DOS My Record manual external assessment results scoped to one authenticated user and workspace. This stores user-entered summaries only and must not copy external assessment questions, scoring systems, or proprietary content. These do not create Field activity, Tables, Fruit, Reports, public Profile data, admin profile metrics, or circle scoring data.';

notify pgrst, 'reload schema';
