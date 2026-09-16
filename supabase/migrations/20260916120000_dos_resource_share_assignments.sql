-- USA-278: sending a Library resource to the people it is for.
--
-- One couple assessment assignment carries two identifiable participants and
-- separately attributed answers. Both spouses reach the same assignment when
-- both have People records, so results are never duplicated. A spouse who has
-- no contact record is kept as a named participant on the assignment -- no
-- contact is created, and no spouse is inferred from a surname.
--
-- Additive only. Existing assessments, responses and Journey assignments in
-- public.dos_resource_assignments are untouched: Journey keeps its own table
-- and its own behavior.

create extension if not exists pgcrypto;

create table if not exists public.dos_resource_share_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  resource_slug text not null,
  -- The canonical participant. Always a real person in this workspace.
  primary_person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  -- The spouse, when they have their own People record. Null is normal: the
  -- name below is enough to attribute answers, and the record can be linked
  -- later without losing responses.
  secondary_person_id uuid references public.missionary_field_people(id) on delete set null,
  primary_participant_name text not null,
  secondary_participant_name text not null,
  primary_participant_role text not null,
  secondary_participant_role text not null,
  requested_by_user_id uuid,
  requested_by_name text,
  status text not null default 'link_ready',
  -- Unguessable and revocable. Possession of the token grants the joint
  -- assessment experience and nothing else.
  token text not null,
  expires_at timestamptz not null,
  opened_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  revoked_at timestamptz,
  -- Draft answers, keyed question id -> participant role -> 0-10 score, so a
  -- couple can stop and resume. Replaced by the result row on completion.
  responses jsonb not null default '{}'::jsonb,
  result_id uuid references public.dos_assessment_results(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_resource_share_assignments_slug_check
    check (resource_slug ~ '^[a-z0-9][a-z0-9-]{1,120}$'),
  constraint dos_resource_share_assignments_status_check
    check (status in ('link_ready', 'in_progress', 'completed', 'expired', 'revoked')),
  constraint dos_resource_share_assignments_token_check
    check (token ~ '^[A-Za-z0-9_-]{16,96}$'),
  constraint dos_resource_share_assignments_participant_names_check
    check (
      length(btrim(primary_participant_name)) > 0
      and length(btrim(secondary_participant_name)) > 0
    ),
  constraint dos_resource_share_assignments_distinct_people_check
    check (secondary_person_id is null or secondary_person_id <> primary_person_id),
  constraint dos_resource_share_assignments_completed_check
    check ((status = 'completed') = (completed_at is not null)),
  constraint dos_resource_share_assignments_revoked_check
    check ((status = 'revoked') = (revoked_at is not null))
);

create unique index if not exists dos_resource_share_assignments_token_key
  on public.dos_resource_share_assignments(token);

-- One open assignment per person per resource. A completed, expired or
-- revoked assessment never blocks a new one, so repeat assessments stay
-- distinct records.
create unique index if not exists dos_resource_share_assignments_open_unique
  on public.dos_resource_share_assignments(workspace_id, resource_slug, primary_person_id)
  where status in ('link_ready', 'in_progress');

create index if not exists dos_resource_share_assignments_workspace_idx
  on public.dos_resource_share_assignments(workspace_id, resource_slug, status, created_at desc);

create index if not exists dos_resource_share_assignments_primary_person_idx
  on public.dos_resource_share_assignments(primary_person_id, status, created_at desc);

create index if not exists dos_resource_share_assignments_secondary_person_idx
  on public.dos_resource_share_assignments(secondary_person_id, status, created_at desc)
  where secondary_person_id is not null;

drop trigger if exists set_dos_resource_share_assignments_updated_at on public.dos_resource_share_assignments;
create trigger set_dos_resource_share_assignments_updated_at
  before update on public.dos_resource_share_assignments
  for each row
  execute function public.set_dos_updated_at();

alter table public.dos_resource_share_assignments enable row level security;

-- The recipient experience never touches this table directly: the public
-- route reads and writes it through the service role, scoped to one token.
revoke all on table public.dos_resource_share_assignments from anon;
revoke all on table public.dos_resource_share_assignments from authenticated;

grant select, insert, update on table public.dos_resource_share_assignments to authenticated;
grant select, insert, update, delete on table public.dos_resource_share_assignments to service_role;

drop policy if exists "DOS admins can read resource share assignments" on public.dos_resource_share_assignments;
create policy "DOS admins can read resource share assignments"
  on public.dos_resource_share_assignments
  for select
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor', 'viewer']));

drop policy if exists "DOS editors can manage resource share assignments" on public.dos_resource_share_assignments;
create policy "DOS editors can manage resource share assignments"
  on public.dos_resource_share_assignments
  for all
  to authenticated
  using (public.can_access_dos_workspace(workspace_id, array['admin', 'editor']))
  with check (public.can_access_dos_workspace(workspace_id, array['admin', 'editor']));

comment on table public.dos_resource_share_assignments is
  'Workspace-scoped assignments of a sendable DOS Library resource to the people it is for. One row is one couple assessment: two identifiable participants, separately attributed answers, and one revocable public token. Library remains the source of truth for the resource itself.';

comment on column public.dos_resource_share_assignments.secondary_person_id is
  'The spouse''s People record when one exists. Null keeps the entered name as the participant; linking later must not lose responses. Never inferred from a matching surname.';

comment on column public.dos_resource_share_assignments.responses is
  'Draft joint answers keyed question id -> participant role -> 0-10 score, so the couple can resume. The completed result lives in public.dos_assessment_results.';

comment on column public.dos_resource_share_assignments.token is
  'Unguessable, revocable public link token. Possession grants only the assigned assessment experience -- never contact records, notes, or other assignments.';

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
