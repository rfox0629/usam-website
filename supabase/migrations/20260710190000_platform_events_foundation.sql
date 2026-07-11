create table if not exists public.platform_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  event_type text not null,
  subject_type text not null,
  subject_id uuid not null,
  actor_type text not null default 'public',
  actor_id text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  correlation_id uuid not null default gen_random_uuid(),
  schema_version smallint not null default 1,
  created_at timestamptz not null default now(),
  constraint platform_events_actor_type_check check (actor_type in ('public', 'admin', 'system')),
  constraint platform_events_dedupe unique (subject_type, subject_id, event_type)
);

create index if not exists platform_events_organization_id_idx
  on public.platform_events(organization_id);

create index if not exists platform_events_event_type_idx
  on public.platform_events(event_type, occurred_at desc);

create index if not exists platform_events_subject_idx
  on public.platform_events(subject_type, subject_id);

alter table public.platform_events enable row level security;

revoke all on table public.platform_events from anon;
revoke all on table public.platform_events from authenticated;

grant all on table public.platform_events to service_role;

comment on table public.platform_events is
  'Append-only record of meaningful domain facts (Phase 0: missionary application submitted, major gift inquiry submitted). '
  'Written and read exclusively by server code via the service role -- no anon or authenticated client access is granted by design. '
  'This table records domain facts, not the permanent audit log for every administrative action, document access, permission change, '
  'notification delivery, or automated consumer action -- those remain separate concerns and should not be collapsed into this table '
  'without a deliberate decision to do so.';

comment on column public.platform_events.organization_id is
  'The organization whose books/records this event belongs to. Resolved server-side to the seeded USA Missionaries '
  'organization row today; never hardcoded to a literal UUID.';

comment on column public.platform_events.event_type is
  'Dot-namespaced event name, e.g. usam_application.submitted, major_gift_inquiry.submitted.';

comment on column public.platform_events.subject_type is
  'The domain entity type this event is about, e.g. usam_missionary_application, major_gift_inquiry.';

comment on column public.platform_events.subject_id is
  'The primary key of the source row in its owning table (usam_missionary_applications.id, major_gift_inquiries.id, etc).';

comment on column public.platform_events.actor_type is
  'Who/what caused this event: public (an unauthenticated form submission), admin (a signed-in admin action), or system.';

comment on column public.platform_events.payload is
  'Minimum operational metadata needed by consumers (e.g. notification status). Must never contain raw narratives, prayer '
  'content, full financial details, provider responses, or personal information beyond what is already referenced by subject_id.';
