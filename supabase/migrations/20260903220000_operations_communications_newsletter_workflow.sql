-- Operations Communications V1.
--
-- The eight communication_* tables from USA-47 already exist and hold real
-- data, so nothing is recreated here. This adds only the review workflow the
-- existing schema lacks: the newsletter status vocabulary stopped at
-- draft/published/archived, which cannot express "approved for send".
--
-- The phase-1 recipient CHECK on communication_sends is deliberately LEFT IN
-- PLACE. It restricts every send row to Ryan or Brooke, which makes a donor
-- broadcast structurally impossible until it is lifted by an explicit,
-- founder-authorized migration.

alter table public.communication_newsletters
  add column if not exists planned_send_at timestamptz,
  add column if not exists ready_at timestamptz,
  add column if not exists last_test_sent_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by_email text,
  add column if not exists sent_at timestamptz,
  add column if not exists cancelled_at timestamptz;

alter table public.communication_newsletters
  drop constraint if exists communication_newsletters_status_check;

alter table public.communication_newsletters
  add constraint communication_newsletters_status_check
  check (status = any (array[
    'draft', 'ready_for_review', 'test_sent', 'approved', 'scheduled', 'sent', 'cancelled',
    -- Retained so existing rows and the public archive keep working.
    'published', 'archived'
  ]));

-- Approval must name a person and a time; the UI cannot fabricate either.
alter table public.communication_newsletters
  drop constraint if exists communication_newsletters_approval_check;

alter table public.communication_newsletters
  add constraint communication_newsletters_approval_check
  check (
    status not in ('approved', 'scheduled', 'sent')
    or (approved_at is not null and approved_by_email is not null)
  );

comment on column public.communication_newsletters.approved_by_email is
  'Who approved this newsletter for send. Required before status can reach approved, scheduled, or sent.';
comment on column public.communication_newsletters.last_test_sent_at is
  'Last successful test send. A newsletter cannot be approved without one.';

-- The later one-time reconciled audience import needs its own source value so
-- imported contacts stay distinguishable from website signups forever.
alter table public.communication_subscribers
  drop constraint if exists communication_subscribers_source_check;

alter table public.communication_subscribers
  add constraint communication_subscribers_source_check
  check (source = any (array['website', 'admin', 'seed', 'preference_center', 'webhook', 'import']));

alter table public.communication_subscriber_events
  drop constraint if exists communication_subscriber_events_source_check;

alter table public.communication_subscriber_events
  add constraint communication_subscriber_events_source_check
  check (source = any (array['website', 'admin', 'preference_center', 'unsubscribe', 'webhook', 'seed', 'system', 'import']));

create index if not exists communication_newsletters_status_idx
  on public.communication_newsletters(status, planned_send_at desc nulls last);
create index if not exists communication_subscribers_status_idx
  on public.communication_subscribers(status, created_at desc);
