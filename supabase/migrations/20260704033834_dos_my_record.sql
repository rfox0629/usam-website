create extension if not exists pgcrypto;

create table if not exists public.dos_user_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  current_season_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_user_records_workspace_user_unique unique (workspace_id, user_id)
);

create table if not exists public.dos_user_journal_entries (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.dos_user_records(id) on delete cascade,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  minutes_spent integer not null default 0,
  started_at timestamptz,
  stopped_at timestamptz,
  bible_passage text,
  notes text,
  lord_highlight text,
  prayer_response text,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_user_journal_minutes_check check (minutes_spent >= 0 and minutes_spent <= 1440),
  constraint dos_user_journal_timer_check check (stopped_at is null or started_at is null or stopped_at >= started_at)
);

create table if not exists public.dos_user_prayer_logs (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.dos_user_records(id) on delete cascade,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  field_person_id uuid references public.missionary_field_people(id) on delete set null,
  prayed_at timestamptz not null default now(),
  minutes_spent integer not null default 0,
  prayer_focus text,
  notes text,
  answered_status text not null default 'open',
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_user_prayer_minutes_check check (minutes_spent >= 0 and minutes_spent <= 1440),
  constraint dos_user_prayer_answered_status_check check (answered_status in ('open', 'answered', 'watching'))
);

create table if not exists public.dos_user_mentor_relationships (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.dos_user_records(id) on delete cascade,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  field_person_id uuid references public.missionary_field_people(id) on delete set null,
  mentor_name text not null,
  relationship_label text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_user_mentor_name_not_empty check (length(btrim(mentor_name)) > 0),
  constraint dos_user_mentor_status_check check (status in ('active', 'archived'))
);

create table if not exists public.dos_user_mentor_meetings (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.dos_user_records(id) on delete cascade,
  relationship_id uuid references public.dos_user_mentor_relationships(id) on delete set null,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  field_person_id uuid references public.missionary_field_people(id) on delete set null,
  mentor_name text not null,
  meeting_date date not null default current_date,
  duration_minutes integer not null default 0,
  notes text,
  discussed text,
  counsel_received text,
  action_steps text,
  follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_user_mentor_meeting_name_not_empty check (length(btrim(mentor_name)) > 0),
  constraint dos_user_mentor_meeting_minutes_check check (duration_minutes >= 0 and duration_minutes <= 1440)
);

create table if not exists public.dos_user_assessment_results (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.dos_user_records(id) on delete cascade,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_resource_id text,
  assessment_slug text not null,
  assessment_name text not null,
  completed_at timestamptz not null default now(),
  overall_score integer not null default 0,
  max_score integer not null default 0,
  percentage numeric(5,2) not null default 0,
  category_scores jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_user_assessment_slug_not_empty check (length(btrim(assessment_slug)) > 0),
  constraint dos_user_assessment_name_not_empty check (length(btrim(assessment_name)) > 0),
  constraint dos_user_assessment_score_check check (overall_score >= 0 and max_score >= 0 and overall_score <= max_score),
  constraint dos_user_assessment_percentage_check check (percentage >= 0 and percentage <= 100),
  constraint dos_user_assessment_visibility_check check (visibility = 'private')
);

create index if not exists dos_user_records_workspace_user_idx
  on public.dos_user_records(workspace_id, user_id);

create index if not exists dos_user_journal_entries_record_date_idx
  on public.dos_user_journal_entries(record_id, entry_date desc, created_at desc);

create index if not exists dos_user_prayer_logs_record_prayed_idx
  on public.dos_user_prayer_logs(record_id, prayed_at desc);

create index if not exists dos_user_prayer_logs_field_person_idx
  on public.dos_user_prayer_logs(field_person_id);

create index if not exists dos_user_mentor_relationships_record_status_idx
  on public.dos_user_mentor_relationships(record_id, status, updated_at desc);

create unique index if not exists dos_user_mentor_relationships_unique_field_person_idx
  on public.dos_user_mentor_relationships(workspace_id, user_id, field_person_id)
  where field_person_id is not null and status = 'active';

create index if not exists dos_user_mentor_meetings_record_date_idx
  on public.dos_user_mentor_meetings(record_id, meeting_date desc, created_at desc);

create index if not exists dos_user_assessment_results_record_completed_idx
  on public.dos_user_assessment_results(record_id, completed_at desc);

create index if not exists dos_user_assessment_results_slug_completed_idx
  on public.dos_user_assessment_results(workspace_id, user_id, assessment_slug, completed_at desc);

create or replace function public.set_dos_my_record_updated_at()
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

drop trigger if exists set_dos_user_records_updated_at on public.dos_user_records;
create trigger set_dos_user_records_updated_at
  before update on public.dos_user_records
  for each row
  execute function public.set_dos_my_record_updated_at();

drop trigger if exists set_dos_user_journal_entries_updated_at on public.dos_user_journal_entries;
create trigger set_dos_user_journal_entries_updated_at
  before update on public.dos_user_journal_entries
  for each row
  execute function public.set_dos_my_record_updated_at();

drop trigger if exists set_dos_user_prayer_logs_updated_at on public.dos_user_prayer_logs;
create trigger set_dos_user_prayer_logs_updated_at
  before update on public.dos_user_prayer_logs
  for each row
  execute function public.set_dos_my_record_updated_at();

drop trigger if exists set_dos_user_mentor_relationships_updated_at on public.dos_user_mentor_relationships;
create trigger set_dos_user_mentor_relationships_updated_at
  before update on public.dos_user_mentor_relationships
  for each row
  execute function public.set_dos_my_record_updated_at();

drop trigger if exists set_dos_user_mentor_meetings_updated_at on public.dos_user_mentor_meetings;
create trigger set_dos_user_mentor_meetings_updated_at
  before update on public.dos_user_mentor_meetings
  for each row
  execute function public.set_dos_my_record_updated_at();

drop trigger if exists set_dos_user_assessment_results_updated_at on public.dos_user_assessment_results;
create trigger set_dos_user_assessment_results_updated_at
  before update on public.dos_user_assessment_results
  for each row
  execute function public.set_dos_my_record_updated_at();

alter table public.dos_user_records enable row level security;
alter table public.dos_user_journal_entries enable row level security;
alter table public.dos_user_prayer_logs enable row level security;
alter table public.dos_user_mentor_relationships enable row level security;
alter table public.dos_user_mentor_meetings enable row level security;
alter table public.dos_user_assessment_results enable row level security;

revoke all on table public.dos_user_records from anon;
revoke all on table public.dos_user_journal_entries from anon;
revoke all on table public.dos_user_prayer_logs from anon;
revoke all on table public.dos_user_mentor_relationships from anon;
revoke all on table public.dos_user_mentor_meetings from anon;
revoke all on table public.dos_user_assessment_results from anon;

revoke all on table public.dos_user_records from authenticated;
revoke all on table public.dos_user_journal_entries from authenticated;
revoke all on table public.dos_user_prayer_logs from authenticated;
revoke all on table public.dos_user_mentor_relationships from authenticated;
revoke all on table public.dos_user_mentor_meetings from authenticated;
revoke all on table public.dos_user_assessment_results from authenticated;

grant select, insert, update, delete on table public.dos_user_records to authenticated;
grant select, insert, update, delete on table public.dos_user_journal_entries to authenticated;
grant select, insert, update, delete on table public.dos_user_prayer_logs to authenticated;
grant select, insert, update, delete on table public.dos_user_mentor_relationships to authenticated;
grant select, insert, update, delete on table public.dos_user_mentor_meetings to authenticated;
grant select, insert, update, delete on table public.dos_user_assessment_results to authenticated;

grant all on table public.dos_user_records to service_role;
grant all on table public.dos_user_journal_entries to service_role;
grant all on table public.dos_user_prayer_logs to service_role;
grant all on table public.dos_user_mentor_relationships to service_role;
grant all on table public.dos_user_mentor_meetings to service_role;
grant all on table public.dos_user_assessment_results to service_role;

drop policy if exists "DOS users can manage own record" on public.dos_user_records;
create policy "DOS users can manage own record"
  on public.dos_user_records
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "DOS users can manage own journal" on public.dos_user_journal_entries;
create policy "DOS users can manage own journal"
  on public.dos_user_journal_entries
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "DOS users can manage own prayer logs" on public.dos_user_prayer_logs;
create policy "DOS users can manage own prayer logs"
  on public.dos_user_prayer_logs
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "DOS users can manage own mentors" on public.dos_user_mentor_relationships;
create policy "DOS users can manage own mentors"
  on public.dos_user_mentor_relationships
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "DOS users can manage own mentor meetings" on public.dos_user_mentor_meetings;
create policy "DOS users can manage own mentor meetings"
  on public.dos_user_mentor_meetings
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "DOS users can manage own assessment results" on public.dos_user_assessment_results;
create policy "DOS users can manage own assessment results"
  on public.dos_user_assessment_results
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

comment on table public.dos_user_records is
  'Private DOS My Record profile for the authenticated user in a workspace. This is not Field, Tables, Fruit, public Profiles, or circle scoring data. Future sharing grants, mentor requests, report exports, and AI summaries should reference this record and preserve user-controlled permissions.';

comment on table public.dos_user_journal_entries is
  'Private DOS My Record quiet time and journal entries scoped to one authenticated user and workspace.';

comment on table public.dos_user_prayer_logs is
  'Private DOS My Record prayer time logs. These do not count as ministry table meetings, Field activity, Fruit, or circle metrics.';

comment on table public.dos_user_mentor_relationships is
  'Private DOS My Record mentors, representing who is pouring into the user. Existing Field contacts can be linked without creating ministry activity.';

comment on table public.dos_user_mentor_meetings is
  'Private DOS My Record mentor meeting history. These are personal discipleship history records, not ministry Tables.';

comment on table public.dos_user_assessment_results is
  'Private DOS My Record assessment results from DOS Library assessment definitions. These do not create Field activity, Tables, Fruit, public Profile data, or circle scoring data.';

notify pgrst, 'reload schema';
