create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'dos_circle_assignment') then
    create type public.dos_circle_assignment as enum ('three', 'twelve', 'seventy', 'field');
  end if;

  if not exists (select 1 from pg_type where typname = 'dos_circle_assignment_source') then
    create type public.dos_circle_assignment_source as enum ('automatic', 'manual');
  end if;
end $$;

create table if not exists public.dos_circle_scoring_configs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  meeting_frequency_weight integer not null default 30,
  time_invested_weight integer not null default 15,
  discipleship_progress_weight integer not null default 25,
  fruit_weight integer not null default 20,
  momentum_weight integer not null default 10,
  multiplication_weight integer not null default 20,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_circle_scoring_configs_weights_check check (
    meeting_frequency_weight >= 0
    and time_invested_weight >= 0
    and discipleship_progress_weight >= 0
    and fruit_weight >= 0
    and momentum_weight >= 0
    and multiplication_weight >= 0
  )
);

create unique index if not exists dos_circle_scoring_configs_one_active_idx
  on public.dos_circle_scoring_configs(workspace_id)
  where is_active is true;

create unique index if not exists dos_circle_scoring_configs_workspace_unique_idx
  on public.dos_circle_scoring_configs(workspace_id);

create table if not exists public.dos_relationship_scores (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  total_score numeric(5, 2) not null default 0,
  meeting_frequency_score numeric(5, 2) not null default 0,
  time_invested_score numeric(5, 2) not null default 0,
  discipleship_progress_score numeric(5, 2) not null default 0,
  fruit_score numeric(5, 2) not null default 0,
  momentum_score numeric(5, 2) not null default 0,
  multiplication_score numeric(5, 2) not null default 0,
  circle_assignment public.dos_circle_assignment not null default 'field',
  assignment_source public.dos_circle_assignment_source not null default 'automatic',
  confidence_score numeric(5, 2) not null default 0,
  score_explanation jsonb not null default '{}'::jsonb,
  last_calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_relationship_scores_unique_person unique (workspace_id, person_id)
);

create index if not exists dos_relationship_scores_workspace_circle_idx
  on public.dos_relationship_scores(workspace_id, circle_assignment, total_score desc);

create index if not exists dos_relationship_scores_person_idx
  on public.dos_relationship_scores(person_id, last_calculated_at desc);

create table if not exists public.dos_circle_overrides (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  manual_circle public.dos_circle_assignment not null,
  locked boolean not null default true,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_circle_overrides_unique_person unique (workspace_id, person_id)
);

create index if not exists dos_circle_overrides_workspace_idx
  on public.dos_circle_overrides(workspace_id, locked, manual_circle);

create table if not exists public.dos_relationship_score_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  previous_score numeric(5, 2),
  new_score numeric(5, 2) not null,
  previous_circle public.dos_circle_assignment,
  new_circle public.dos_circle_assignment not null,
  movement_reason jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now()
);

create index if not exists dos_relationship_score_history_person_idx
  on public.dos_relationship_score_history(workspace_id, person_id, calculated_at desc);

create or replace function public.set_dos_circle_updated_at()
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

drop trigger if exists set_dos_circle_scoring_configs_updated_at on public.dos_circle_scoring_configs;
create trigger set_dos_circle_scoring_configs_updated_at
  before update on public.dos_circle_scoring_configs
  for each row
  execute function public.set_dos_circle_updated_at();

drop trigger if exists set_dos_relationship_scores_updated_at on public.dos_relationship_scores;
create trigger set_dos_relationship_scores_updated_at
  before update on public.dos_relationship_scores
  for each row
  execute function public.set_dos_circle_updated_at();

drop trigger if exists set_dos_circle_overrides_updated_at on public.dos_circle_overrides;
create trigger set_dos_circle_overrides_updated_at
  before update on public.dos_circle_overrides
  for each row
  execute function public.set_dos_circle_updated_at();

alter table public.dos_circle_scoring_configs enable row level security;
alter table public.dos_relationship_scores enable row level security;
alter table public.dos_circle_overrides enable row level security;
alter table public.dos_relationship_score_history enable row level security;

revoke all on table public.dos_circle_scoring_configs from anon;
revoke all on table public.dos_relationship_scores from anon;
revoke all on table public.dos_circle_overrides from anon;
revoke all on table public.dos_relationship_score_history from anon;

grant select, insert, update on table public.dos_circle_scoring_configs to authenticated;
grant select, insert, update on table public.dos_relationship_scores to authenticated;
grant select, insert, update, delete on table public.dos_circle_overrides to authenticated;
grant select, insert on table public.dos_relationship_score_history to authenticated;

drop policy if exists "Admins can manage DOS circle configs" on public.dos_circle_scoring_configs;
create policy "Admins can manage DOS circle configs"
  on public.dos_circle_scoring_configs
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true) is true
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true) is true
    )
  );

drop policy if exists "Admins can manage DOS relationship scores" on public.dos_relationship_scores;
create policy "Admins can manage DOS relationship scores"
  on public.dos_relationship_scores
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true) is true
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true) is true
    )
  );

drop policy if exists "Admins can manage DOS circle overrides" on public.dos_circle_overrides;
create policy "Admins can manage DOS circle overrides"
  on public.dos_circle_overrides
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true) is true
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true) is true
    )
  );

drop policy if exists "Admins can read DOS score history" on public.dos_relationship_score_history;
create policy "Admins can read DOS score history"
  on public.dos_relationship_score_history
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true) is true
    )
  );

drop policy if exists "Admins can insert DOS score history" on public.dos_relationship_score_history;
create policy "Admins can insert DOS score history"
  on public.dos_relationship_score_history
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role in ('admin', 'editor')
        and coalesce(admin_users.is_active, true) is true
    )
  );

comment on table public.dos_circle_scoring_configs is
  'Workspace-scoped DOS relationship intelligence weights. This tunes focus and stewardship, not public profile value.';

comment on table public.dos_relationship_scores is
  'Computed private relationship focus scores for My 3, My 12, My 70, and Field.';

comment on table public.dos_circle_overrides is
  'Manual locked circle assignments for pastoral judgment and workspace stewardship.';

comment on table public.dos_relationship_score_history is
  'Movement history for relationship focus changes over time.';

notify pgrst, 'reload schema';
