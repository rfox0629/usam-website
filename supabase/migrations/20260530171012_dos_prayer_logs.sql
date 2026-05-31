create table if not exists public.prayer_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  prayer_request_id uuid references public.prayer_requests(id) on delete cascade,
  field_person_id uuid references public.missionary_field_people(id) on delete cascade,
  prayed_at timestamptz not null default now(),
  note text,
  prayed_by_user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists prayer_logs_workspace_prayed_at_idx
  on public.prayer_logs(workspace_id, prayed_at desc);

create index if not exists prayer_logs_field_person_idx
  on public.prayer_logs(field_person_id);

create index if not exists prayer_logs_request_idx
  on public.prayer_logs(prayer_request_id);

alter table public.prayer_logs enable row level security;

revoke all on table public.prayer_logs from anon;
revoke all on table public.prayer_logs from authenticated;

grant all on table public.prayer_logs to service_role;

comment on table public.prayer_logs is
  'Internal DOS prayer activity logs. Server routes should write these records; no public or direct client access is granted by default.';
