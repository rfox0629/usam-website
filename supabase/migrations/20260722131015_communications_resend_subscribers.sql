create extension if not exists pgcrypto;

create or replace function public.set_communications_updated_at()
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

create or replace function public.newsletter_phase1_recipient_allowed(value text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select lower(btrim(coalesce(value, ''))) in (
    'ryan@usamissionaries.org',
    'brooke.r.fox@gmail.com'
  );
$$;

create table if not exists public.communication_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text generated always as (lower(btrim(email))) stored,
  first_name text,
  last_name text,
  status text not null default 'subscribed',
  source text not null default 'public_subscribe',
  consented_at timestamptz,
  resubscribed_at timestamptz,
  unsubscribed_at timestamptz,
  suppression_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_email text,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_subscribers_email_normalized_key unique (email_normalized),
  constraint communication_subscribers_email_format_check check (
    position('@' in email_normalized) > 1
    and position('.' in split_part(email_normalized, '@', 2)) > 1
  ),
  constraint communication_subscribers_status_check check (
    status in ('pending', 'subscribed', 'unsubscribed', 'suppressed')
  )
);

create table if not exists public.communication_preferences (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.communication_subscribers(id) on delete cascade,
  channel text not null default 'email',
  topic text not null default 'newsletter',
  enabled boolean not null default true,
  source text not null default 'public_subscribe',
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_preferences_unique unique (subscriber_id, channel, topic),
  constraint communication_preferences_channel_check check (channel in ('email')),
  constraint communication_preferences_topic_check check (
    topic in ('newsletter', 'mission_updates', 'support_updates', 'prayer_updates')
  )
);

create table if not exists public.communication_tokens (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.communication_subscribers(id) on delete cascade,
  token_hash text not null,
  purpose text not null,
  status text not null default 'active',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by_email text,
  created_at timestamptz not null default now(),
  constraint communication_tokens_token_hash_key unique (token_hash),
  constraint communication_tokens_hash_length_check check (length(token_hash) = 64),
  constraint communication_tokens_purpose_check check (purpose in ('preferences', 'unsubscribe')),
  constraint communication_tokens_status_check check (status in ('active', 'used', 'revoked'))
);

create table if not exists public.communication_audit_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references public.communication_subscribers(id) on delete set null,
  actor_type text not null default 'system',
  actor_email text,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint communication_audit_events_actor_type_check check (
    actor_type in ('admin', 'public', 'system', 'webhook')
  )
);

create table if not exists public.newsletters (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  subject text not null,
  preview_text text,
  intro_text text,
  body_text text not null default '',
  cta_label text,
  cta_url text,
  hero_image_url text,
  status text not null default 'draft',
  created_by_email text,
  updated_by_email text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletters_slug_key unique (slug),
  constraint newsletters_status_check check (status in ('draft', 'in_review', 'published', 'archived')),
  constraint newsletters_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.newsletter_publications (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references public.newsletters(id) on delete cascade,
  slug text not null,
  title text not null,
  subject text not null,
  preview_text text,
  intro_text text,
  body_text text not null default '',
  cta_label text,
  cta_url text,
  hero_image_url text,
  html_snapshot text,
  text_snapshot text,
  status text not null default 'draft',
  archive_visible boolean not null default false,
  published_at timestamptz,
  created_by_email text,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_publications_newsletter_id_key unique (newsletter_id),
  constraint newsletter_publications_slug_key unique (slug),
  constraint newsletter_publications_status_check check (status in ('draft', 'published', 'archived')),
  constraint newsletter_publications_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.newsletter_sends (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid references public.newsletters(id) on delete set null,
  publication_id uuid references public.newsletter_publications(id) on delete set null,
  subscriber_id uuid references public.communication_subscribers(id) on delete set null,
  email text not null,
  email_normalized text generated always as (lower(btrim(email))) stored,
  send_type text not null default 'preview',
  status text not null default 'queued',
  provider text not null default 'resend',
  provider_message_id text,
  idempotency_key text not null,
  requested_by_email text,
  sent_at timestamptz,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_sends_idempotency_key_key unique (idempotency_key),
  constraint newsletter_sends_send_type_check check (send_type in ('preview', 'test', 'campaign')),
  constraint newsletter_sends_provider_check check (provider in ('resend')),
  constraint newsletter_sends_status_check check (
    status in ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed', 'skipped')
  ),
  constraint newsletter_sends_phase1_allowed_recipient_check check (
    public.newsletter_phase1_recipient_allowed(email_normalized)
  )
);

create table if not exists public.newsletter_delivery_events (
  id uuid primary key default gen_random_uuid(),
  send_id uuid references public.newsletter_sends(id) on delete set null,
  provider text not null default 'resend',
  provider_event_id text not null,
  provider_message_id text,
  event_type text not null,
  recipient_email text,
  recipient_email_normalized text generated always as (lower(btrim(coalesce(recipient_email, '')))) stored,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  duplicate_count integer not null default 0,
  constraint newsletter_delivery_events_provider_check check (provider in ('resend')),
  constraint newsletter_delivery_events_event_key unique (provider, provider_event_id),
  constraint newsletter_delivery_events_duplicate_count_check check (duplicate_count >= 0)
);

create index if not exists communication_subscribers_status_created_idx
  on public.communication_subscribers(status, created_at desc);

create index if not exists communication_preferences_subscriber_enabled_idx
  on public.communication_preferences(subscriber_id, enabled);

create index if not exists communication_tokens_subscriber_purpose_status_idx
  on public.communication_tokens(subscriber_id, purpose, status, expires_at desc);

create index if not exists communication_audit_events_subscriber_created_idx
  on public.communication_audit_events(subscriber_id, created_at desc);

create index if not exists newsletters_status_updated_idx
  on public.newsletters(status, updated_at desc);

create index if not exists newsletter_publications_public_archive_idx
  on public.newsletter_publications(published_at desc)
  where status = 'published' and archive_visible = true;

create index if not exists newsletter_sends_publication_created_idx
  on public.newsletter_sends(publication_id, created_at desc);

create index if not exists newsletter_sends_subscriber_created_idx
  on public.newsletter_sends(subscriber_id, created_at desc);

create unique index if not exists newsletter_sends_provider_message_id_idx
  on public.newsletter_sends(provider, provider_message_id)
  where provider_message_id is not null;

create index if not exists newsletter_delivery_events_message_idx
  on public.newsletter_delivery_events(provider, provider_message_id, received_at desc)
  where provider_message_id is not null;

drop trigger if exists set_communication_subscribers_updated_at on public.communication_subscribers;
create trigger set_communication_subscribers_updated_at
  before update on public.communication_subscribers
  for each row
  execute function public.set_communications_updated_at();

drop trigger if exists set_communication_preferences_updated_at on public.communication_preferences;
create trigger set_communication_preferences_updated_at
  before update on public.communication_preferences
  for each row
  execute function public.set_communications_updated_at();

drop trigger if exists set_newsletters_updated_at on public.newsletters;
create trigger set_newsletters_updated_at
  before update on public.newsletters
  for each row
  execute function public.set_communications_updated_at();

drop trigger if exists set_newsletter_publications_updated_at on public.newsletter_publications;
create trigger set_newsletter_publications_updated_at
  before update on public.newsletter_publications
  for each row
  execute function public.set_communications_updated_at();

drop trigger if exists set_newsletter_sends_updated_at on public.newsletter_sends;
create trigger set_newsletter_sends_updated_at
  before update on public.newsletter_sends
  for each row
  execute function public.set_communications_updated_at();

alter table public.communication_subscribers enable row level security;
alter table public.communication_preferences enable row level security;
alter table public.communication_tokens enable row level security;
alter table public.communication_audit_events enable row level security;
alter table public.newsletters enable row level security;
alter table public.newsletter_publications enable row level security;
alter table public.newsletter_sends enable row level security;
alter table public.newsletter_delivery_events enable row level security;

revoke all on table public.communication_subscribers from anon;
revoke all on table public.communication_subscribers from authenticated;
revoke all on table public.communication_preferences from anon;
revoke all on table public.communication_preferences from authenticated;
revoke all on table public.communication_tokens from anon;
revoke all on table public.communication_tokens from authenticated;
revoke all on table public.communication_audit_events from anon;
revoke all on table public.communication_audit_events from authenticated;
revoke all on table public.newsletters from anon;
revoke all on table public.newsletters from authenticated;
revoke all on table public.newsletter_sends from anon;
revoke all on table public.newsletter_sends from authenticated;
revoke all on table public.newsletter_delivery_events from anon;
revoke all on table public.newsletter_delivery_events from authenticated;

revoke all on table public.newsletter_publications from anon;
revoke all on table public.newsletter_publications from authenticated;

grant all on table public.communication_subscribers to service_role;
grant all on table public.communication_preferences to service_role;
grant all on table public.communication_tokens to service_role;
grant all on table public.communication_audit_events to service_role;
grant all on table public.newsletters to service_role;
grant all on table public.newsletter_publications to service_role;
grant all on table public.newsletter_sends to service_role;
grant all on table public.newsletter_delivery_events to service_role;

insert into public.communication_subscribers (
  email,
  first_name,
  last_name,
  status,
  source,
  consented_at,
  metadata
)
values
  (
    'ryan@usamissionaries.org',
    'Ryan',
    'Fox',
    'subscribed',
    'linear_seed',
    now(),
    '{"seeded_by":"USA-47"}'::jsonb
  ),
  (
    'brooke.r.fox@gmail.com',
    'Brooke',
    'Fox',
    'subscribed',
    'linear_seed',
    now(),
    '{"seeded_by":"USA-47"}'::jsonb
  )
on conflict on constraint communication_subscribers_email_normalized_key do update
set
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  status = 'subscribed',
  source = excluded.source,
  consented_at = coalesce(public.communication_subscribers.consented_at, excluded.consented_at),
  resubscribed_at = case
    when public.communication_subscribers.status = 'unsubscribed' then now()
    else public.communication_subscribers.resubscribed_at
  end,
  unsubscribed_at = null,
  suppression_reason = null,
  metadata = public.communication_subscribers.metadata || excluded.metadata,
  updated_by_email = 'system',
  updated_at = now();

insert into public.communication_preferences (
  subscriber_id,
  channel,
  topic,
  enabled,
  source,
  consented_at,
  metadata
)
select
  id,
  'email',
  'newsletter',
  true,
  'linear_seed',
  coalesce(consented_at, now()),
  '{"seeded_by":"USA-47"}'::jsonb
from public.communication_subscribers
where email_normalized in ('ryan@usamissionaries.org', 'brooke.r.fox@gmail.com')
on conflict on constraint communication_preferences_unique do update
set
  enabled = true,
  source = excluded.source,
  consented_at = coalesce(public.communication_preferences.consented_at, excluded.consented_at),
  unsubscribed_at = null,
  metadata = public.communication_preferences.metadata || excluded.metadata,
  updated_at = now();

insert into public.communication_audit_events (
  subscriber_id,
  actor_type,
  actor_email,
  event_type,
  details
)
select
  id,
  'system',
  'system',
  'seed_subscribed',
  jsonb_build_object('linear_issue', 'USA-47', 'email', email_normalized)
from public.communication_subscribers
where email_normalized in ('ryan@usamissionaries.org', 'brooke.r.fox@gmail.com');

insert into public.newsletters (
  slug,
  title,
  subject,
  preview_text,
  intro_text,
  body_text,
  cta_label,
  cta_url,
  status,
  created_by_email,
  updated_by_email
)
values (
  'phase-1-preview',
  'Phase 1 Communications Preview',
  'USA Missionaries field update preview',
  'A safe test issue for the Phase 1 Resend subscriber platform.',
  'This draft exists so the first preview send can be tested without publishing a public issue.',
  'The Phase 1 communications platform is connected to subscriber preferences, audit history, Resend delivery events, and a public archive for approved publications only.',
  'Open USA Missionaries',
  'https://usamissionaries.org',
  'draft',
  'system',
  'system'
)
on conflict on constraint newsletters_slug_key do nothing;

insert into public.newsletter_publications (
  newsletter_id,
  slug,
  title,
  subject,
  preview_text,
  intro_text,
  body_text,
  cta_label,
  cta_url,
  status,
  archive_visible,
  created_by_email,
  updated_by_email
)
select
  id,
  slug,
  title,
  subject,
  preview_text,
  intro_text,
  body_text,
  cta_label,
  cta_url,
  'draft',
  false,
  'system',
  'system'
from public.newsletters
where slug = 'phase-1-preview'
on conflict on constraint newsletter_publications_newsletter_id_key do nothing;

comment on table public.communication_subscribers is
  'Phase 1 communications subscriber identity table. Public routes write through service-role handlers; browser clients cannot read subscriber data.';

comment on table public.communication_preferences is
  'Auditable subscriber topic preferences. Preference changes are only allowed through confirmed token routes or admin routes.';

comment on table public.communication_tokens is
  'Hashed one-time or long-lived communication management tokens. Raw token values are never stored.';

comment on table public.newsletter_sends is
  'Resend send attempts for newsletter preview/test/campaign workflows. Phase 1 database check restricts recipients to Ryan and Brooke Fox.';
