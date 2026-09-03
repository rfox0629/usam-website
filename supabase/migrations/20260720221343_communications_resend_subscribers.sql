create extension if not exists pgcrypto;

create table if not exists public.communication_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  first_name text,
  last_name text,
  status text not null default 'pending',
  source text not null default 'website',
  manage_token_hash text,
  manage_token_issued_at timestamptz,
  confirmed_at timestamptz,
  subscribed_at timestamptz,
  unsubscribed_at timestamptz,
  suppressed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_subscribers_email_lower_check check (email = lower(email)),
  constraint communication_subscribers_email_shape_check check (
    position('@' in email) > 1
    and position('.' in split_part(email, '@', 2)) > 1
    and email !~ '[[:space:]]'
  ),
  constraint communication_subscribers_status_check check (
    status in ('pending', 'subscribed', 'unsubscribed', 'bounced', 'complained')
  ),
  constraint communication_subscribers_source_check check (
    source in ('website', 'admin', 'seed', 'preference_center', 'webhook')
  ),
  constraint communication_subscribers_manage_token_hash_check check (
    manage_token_hash is null or length(manage_token_hash) = 64
  )
);

create unique index if not exists communication_subscribers_email_lower_unique
  on public.communication_subscribers(lower(email));

create unique index if not exists communication_subscribers_manage_token_hash_unique
  on public.communication_subscribers(manage_token_hash)
  where manage_token_hash is not null;

create index if not exists communication_subscribers_status_created_idx
  on public.communication_subscribers(status, created_at desc);

create table if not exists public.communication_subscriber_tokens (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.communication_subscribers(id) on delete cascade,
  token_hash text not null,
  purpose text not null default 'manage_preferences',
  status text not null default 'active',
  expires_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_subscriber_tokens_hash_check check (length(token_hash) = 64),
  constraint communication_subscriber_tokens_purpose_check check (purpose in ('manage_preferences')),
  constraint communication_subscriber_tokens_status_check check (status in ('active', 'revoked', 'expired'))
);

create unique index if not exists communication_subscriber_tokens_hash_unique
  on public.communication_subscriber_tokens(token_hash);

create index if not exists communication_subscriber_tokens_subscriber_status_idx
  on public.communication_subscriber_tokens(subscriber_id, status, created_at desc);

create table if not exists public.communication_preferences (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.communication_subscribers(id) on delete cascade,
  channel text not null default 'email',
  topic text not null,
  enabled boolean not null default true,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_preferences_channel_check check (channel in ('email')),
  constraint communication_preferences_topic_check check (
    topic in ('field_updates', 'prayer_updates', 'support_updates')
  )
);

create unique index if not exists communication_preferences_subscriber_topic_unique
  on public.communication_preferences(subscriber_id, channel, topic);

create index if not exists communication_preferences_topic_enabled_idx
  on public.communication_preferences(topic, enabled, updated_at desc);

create table if not exists public.communication_newsletters (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subject text not null,
  preheader text,
  summary text,
  body_markdown text not null default '',
  sections jsonb not null default '[]'::jsonb,
  cta_label text,
  cta_url text,
  status text not null default 'draft',
  published_at timestamptz,
  created_by_email text,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_newsletters_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint communication_newsletters_title_check check (length(btrim(title)) > 0),
  constraint communication_newsletters_subject_check check (length(btrim(subject)) > 0),
  constraint communication_newsletters_sections_array_check check (jsonb_typeof(sections) = 'array'),
  constraint communication_newsletters_status_check check (status in ('draft', 'published', 'archived')),
  constraint communication_newsletters_published_at_check check (
    status <> 'published' or published_at is not null
  )
);

create index if not exists communication_newsletters_archive_idx
  on public.communication_newsletters(status, published_at desc, slug)
  where status = 'published';

create table if not exists public.communication_publications (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid not null references public.communication_newsletters(id) on delete cascade,
  status text not null default 'published',
  published_at timestamptz not null default now(),
  archive_url text,
  subject_snapshot text not null,
  html_snapshot text,
  text_snapshot text,
  created_by_email text,
  created_at timestamptz not null default now(),
  constraint communication_publications_status_check check (status in ('published', 'archived')),
  constraint communication_publications_subject_snapshot_check check (length(btrim(subject_snapshot)) > 0)
);

create index if not exists communication_publications_newsletter_published_idx
  on public.communication_publications(newsletter_id, published_at desc);

create table if not exists public.communication_sends (
  id uuid primary key default gen_random_uuid(),
  newsletter_id uuid references public.communication_newsletters(id) on delete set null,
  publication_id uuid references public.communication_publications(id) on delete set null,
  subscriber_id uuid references public.communication_subscribers(id) on delete set null,
  send_type text not null default 'preview',
  recipient_email text not null,
  status text not null default 'queued',
  provider text not null default 'resend',
  resend_email_id text,
  idempotency_key text not null,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_sends_recipient_lower_check check (recipient_email = lower(recipient_email)),
  constraint communication_sends_phase1_recipient_check check (
    lower(recipient_email) in ('ryan@usamissionaries.org', 'brooke.r.fox@gmail.com')
  ),
  constraint communication_sends_send_type_check check (send_type in ('preview', 'test', 'broadcast')),
  constraint communication_sends_status_check check (
    status in ('queued', 'sent', 'skipped', 'failed', 'blocked', 'delivered', 'bounced', 'complained')
  ),
  constraint communication_sends_provider_check check (provider in ('resend'))
);

create unique index if not exists communication_sends_idempotency_key_unique
  on public.communication_sends(idempotency_key);

create index if not exists communication_sends_newsletter_created_idx
  on public.communication_sends(newsletter_id, created_at desc)
  where newsletter_id is not null;

create index if not exists communication_sends_subscriber_created_idx
  on public.communication_sends(subscriber_id, created_at desc)
  where subscriber_id is not null;

create index if not exists communication_sends_resend_email_id_idx
  on public.communication_sends(resend_email_id)
  where resend_email_id is not null;

create table if not exists public.communication_delivery_events (
  id uuid primary key default gen_random_uuid(),
  send_id uuid references public.communication_sends(id) on delete set null,
  subscriber_id uuid references public.communication_subscribers(id) on delete set null,
  resend_email_id text,
  svix_id text unique not null,
  event_type text not null,
  event_created_at timestamptz,
  payload jsonb not null,
  processing_status text not null default 'recorded',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint communication_delivery_events_svix_id_check check (length(btrim(svix_id)) > 0),
  constraint communication_delivery_events_event_type_check check (length(btrim(event_type)) > 0),
  constraint communication_delivery_events_payload_object_check check (jsonb_typeof(payload) = 'object'),
  constraint communication_delivery_events_processing_status_check check (
    processing_status in ('recorded', 'duplicate', 'processed', 'failed')
  )
);

create index if not exists communication_delivery_events_send_created_idx
  on public.communication_delivery_events(send_id, event_created_at desc)
  where send_id is not null;

create index if not exists communication_delivery_events_subscriber_created_idx
  on public.communication_delivery_events(subscriber_id, event_created_at desc)
  where subscriber_id is not null;

create index if not exists communication_delivery_events_resend_email_idx
  on public.communication_delivery_events(resend_email_id, event_created_at desc)
  where resend_email_id is not null;

create table if not exists public.communication_subscriber_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references public.communication_subscribers(id) on delete set null,
  event_type text not null,
  source text not null default 'system',
  actor_email text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint communication_subscriber_events_event_type_check check (length(btrim(event_type)) > 0),
  constraint communication_subscriber_events_source_check check (
    source in ('website', 'admin', 'preference_center', 'unsubscribe', 'webhook', 'seed', 'system')
  ),
  constraint communication_subscriber_events_payload_object_check check (jsonb_typeof(payload) = 'object')
);

create index if not exists communication_subscriber_events_subscriber_created_idx
  on public.communication_subscriber_events(subscriber_id, created_at desc)
  where subscriber_id is not null;

do $$
declare
  table_name text;
  trigger_name text;
  tables text[] := array[
    'communication_subscribers',
    'communication_subscriber_tokens',
    'communication_preferences',
    'communication_newsletters',
    'communication_sends'
  ];
begin
  foreach table_name in array tables loop
    trigger_name := 'set_' || table_name || '_updated_at';
    execute format('drop trigger if exists %I on public.%I', trigger_name, table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_dos_updated_at()',
      trigger_name,
      table_name
    );
  end loop;
end $$;

alter table public.communication_subscribers enable row level security;
alter table public.communication_subscriber_tokens enable row level security;
alter table public.communication_preferences enable row level security;
alter table public.communication_newsletters enable row level security;
alter table public.communication_publications enable row level security;
alter table public.communication_sends enable row level security;
alter table public.communication_delivery_events enable row level security;
alter table public.communication_subscriber_events enable row level security;

revoke all on table public.communication_subscribers from anon;
revoke all on table public.communication_subscribers from authenticated;
revoke all on table public.communication_subscriber_tokens from anon;
revoke all on table public.communication_subscriber_tokens from authenticated;
revoke all on table public.communication_preferences from anon;
revoke all on table public.communication_preferences from authenticated;
revoke all on table public.communication_newsletters from anon;
revoke all on table public.communication_newsletters from authenticated;
revoke all on table public.communication_publications from anon;
revoke all on table public.communication_publications from authenticated;
revoke all on table public.communication_sends from anon;
revoke all on table public.communication_sends from authenticated;
revoke all on table public.communication_delivery_events from anon;
revoke all on table public.communication_delivery_events from authenticated;
revoke all on table public.communication_subscriber_events from anon;
revoke all on table public.communication_subscriber_events from authenticated;

grant select, insert, update, delete on table public.communication_subscribers to service_role;
grant select, insert, update, delete on table public.communication_subscriber_tokens to service_role;
grant select, insert, update, delete on table public.communication_preferences to service_role;
grant select, insert, update, delete on table public.communication_newsletters to service_role;
grant select, insert, update, delete on table public.communication_publications to service_role;
grant select, insert, update, delete on table public.communication_sends to service_role;
grant select, insert, update, delete on table public.communication_delivery_events to service_role;
grant select, insert, update, delete on table public.communication_subscriber_events to service_role;

with seeded_subscribers as (
  insert into public.communication_subscribers (
    email,
    first_name,
    last_name,
    status,
    source,
    confirmed_at,
    subscribed_at,
    metadata
  )
  values
    (
      'ryan@usamissionaries.org',
      'Ryan',
      'Fox',
      'subscribed',
      'seed',
      now(),
      now(),
      '{"seed":"USA-47"}'::jsonb
    ),
    (
      'brooke.r.fox@gmail.com',
      'Brooke',
      'Fox',
      'subscribed',
      'seed',
      now(),
      now(),
      '{"seed":"USA-47"}'::jsonb
    )
  on conflict (email) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        status = 'subscribed',
        source = 'seed',
        confirmed_at = coalesce(public.communication_subscribers.confirmed_at, now()),
        subscribed_at = coalesce(public.communication_subscribers.subscribed_at, now()),
        unsubscribed_at = null,
        suppressed_at = null,
        metadata = coalesce(public.communication_subscribers.metadata, '{}'::jsonb) || '{"seed":"USA-47"}'::jsonb,
        updated_at = now()
  returning id, email
),
seed_topics as (
  select seeded_subscribers.id as subscriber_id, topic
  from seeded_subscribers
  cross join (
    values ('field_updates'), ('prayer_updates'), ('support_updates')
  ) as topics(topic)
)
insert into public.communication_preferences (
  subscriber_id,
  channel,
  topic,
  enabled,
  consented_at
)
select
  subscriber_id,
  'email',
  topic,
  true,
  now()
from seed_topics
on conflict (subscriber_id, channel, topic) do update
  set enabled = true,
      consented_at = coalesce(public.communication_preferences.consented_at, now()),
      unsubscribed_at = null,
      updated_at = now();

insert into public.communication_subscriber_events (
  subscriber_id,
  event_type,
  source,
  payload
)
select
  id,
  'seeded_subscribed_user',
  'seed',
  jsonb_build_object('issue', 'USA-47', 'email', email)
from public.communication_subscribers
where email in ('ryan@usamissionaries.org', 'brooke.r.fox@gmail.com')
  and not exists (
    select 1
    from public.communication_subscriber_events existing
    where existing.subscriber_id = public.communication_subscribers.id
      and existing.event_type = 'seeded_subscribed_user'
  );

insert into public.communication_newsletters (
  slug,
  title,
  subject,
  preheader,
  summary,
  body_markdown,
  sections,
  cta_label,
  cta_url,
  status,
  published_at,
  created_by_email,
  updated_by_email
)
values (
  'field-update-phase-1-preview',
  'Field Update: Phase 1 Preview',
  'USA Missionaries Field Update Preview',
  'A preview issue for the Phase 1 newsletter system.',
  'A short field update used to validate newsletter rendering, archive display, and safe test sends.',
  'This preview issue confirms the first newsletter template, subscriber records, preference links, unsubscribe handling, Resend delivery logging, and the public archive.',
  '[
    {
      "heading": "Kitchen Tables",
      "body": "The newsletter format keeps field updates clear, compact, and easy to scan on mobile."
    },
    {
      "heading": "Prayer",
      "body": "Prayer updates are separated as a preference so subscribers can choose what they receive."
    },
    {
      "heading": "Support",
      "body": "Phase 1 sends are limited to Ryan and Brooke while the platform is validated."
    }
  ]'::jsonb,
  'Visit USA Missionaries',
  'https://usamissionaries.org',
  'published',
  now(),
  'system',
  'system'
)
on conflict (slug) do update
  set title = excluded.title,
      subject = excluded.subject,
      preheader = excluded.preheader,
      summary = excluded.summary,
      body_markdown = excluded.body_markdown,
      sections = excluded.sections,
      cta_label = excluded.cta_label,
      cta_url = excluded.cta_url,
      status = excluded.status,
      published_at = coalesce(public.communication_newsletters.published_at, excluded.published_at),
      updated_by_email = excluded.updated_by_email,
      updated_at = now();

insert into public.communication_publications (
  newsletter_id,
  status,
  published_at,
  archive_url,
  subject_snapshot,
  text_snapshot,
  created_by_email
)
select
  newsletter.id,
  'published',
  newsletter.published_at,
  '/newsletter/' || newsletter.slug,
  newsletter.subject,
  newsletter.summary,
  'system'
from public.communication_newsletters newsletter
where newsletter.slug = 'field-update-phase-1-preview'
  and not exists (
    select 1
    from public.communication_publications publication
    where publication.newsletter_id = newsletter.id
      and publication.archive_url = '/newsletter/field-update-phase-1-preview'
  );

comment on table public.communication_subscribers is
  'Newsletter subscribers and current subscription state. Preference center links use hashed manage tokens only; plaintext tokens are never stored.';

comment on table public.communication_subscriber_tokens is
  'Hashed subscriber preference-management tokens. Multiple active tokens are allowed so older newsletter links continue to work.';

comment on table public.communication_preferences is
  'Per-subscriber email topic consent separated from prayer, donor, DOS group, and support workflows.';

comment on table public.communication_newsletters is
  'Newsletter issues for the public archive and preview/test-send workflow.';

comment on table public.communication_publications is
  'Publication snapshots for auditable archive history.';

comment on table public.communication_sends is
  'Resend send audit. Phase 1 database constraint allows only Ryan Fox and Brooke Fox as recipients.';

comment on table public.communication_delivery_events is
  'Verified Resend webhook delivery events recorded idempotently by svix-id.';

comment on table public.communication_subscriber_events is
  'Subscriber lifecycle audit for subscribe, resubscribe, preference, unsubscribe, suppression, and seed events.';

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
