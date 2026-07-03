create extension if not exists pgcrypto;

create table if not exists public.dos_assessment_results (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  person_id uuid references public.missionary_field_people(id) on delete set null,
  secondary_person_id uuid references public.missionary_field_people(id) on delete set null,
  assessment_type text not null,
  assessment_title text not null,
  completed_at timestamptz not null default now(),
  completed_by_name text,
  completed_by_email text,
  overall_score integer not null,
  max_score integer not null,
  percentage integer not null,
  category_scores jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  source text not null default 'self',
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_assessment_results_assessment_type_check check (
    assessment_type ~ '^[a-z0-9][a-z0-9_-]{1,80}$'
  ),
  constraint dos_assessment_results_scores_check check (
    max_score > 0
    and overall_score >= 0
    and overall_score <= max_score
    and percentage >= 0
    and percentage <= 100
  ),
  constraint dos_assessment_results_source_check check (
    source in ('self', 'sent_link', 'missionary')
  )
);

create index if not exists dos_assessment_results_workspace_idx
  on public.dos_assessment_results(workspace_id, completed_at desc);

create index if not exists dos_assessment_results_person_idx
  on public.dos_assessment_results(person_id, assessment_type, completed_at desc)
  where person_id is not null;

create index if not exists dos_assessment_results_secondary_person_idx
  on public.dos_assessment_results(secondary_person_id, assessment_type, completed_at desc)
  where secondary_person_id is not null;

create or replace function public.set_dos_assessment_results_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_dos_assessment_results_updated_at on public.dos_assessment_results;
create trigger set_dos_assessment_results_updated_at
  before update on public.dos_assessment_results
  for each row
  execute function public.set_dos_assessment_results_updated_at();

alter table public.dos_assessment_results enable row level security;

revoke all on table public.dos_assessment_results from anon;
revoke all on table public.dos_assessment_results from authenticated;

grant select, insert, update on table public.dos_assessment_results to authenticated;
grant select, insert, update, delete on table public.dos_assessment_results to service_role;

drop policy if exists "Admins can manage DOS assessment results" on public.dos_assessment_results;
create policy "Admins can manage DOS assessment results"
  on public.dos_assessment_results
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
    )
  );

comment on table public.dos_assessment_results is
  'Private DOS assessment results attached to workspace people. These are internal profile-growth signals and are not public lookup records.';

comment on column public.dos_assessment_results.assessment_type is
  'Reusable assessment slug, for example marriage-assessment or friendship-assessment.';

comment on column public.dos_assessment_results.category_scores is
  'JSON category breakdown captured from the assessment result screen.';

comment on column public.dos_assessment_results.answers is
  'JSON answer payload captured at submission time for future assessment review.';
