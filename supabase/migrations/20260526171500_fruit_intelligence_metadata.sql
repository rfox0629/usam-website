alter table public.fruit_events
  add column if not exists generation_key text,
  add column if not exists generated_by text not null default 'manual',
  add column if not exists debug_context jsonb not null default '{}'::jsonb;

create unique index if not exists fruit_events_generation_key_unique
  on public.fruit_events(generation_key)
  where generation_key is not null;

create index if not exists fruit_events_generated_by_idx
  on public.fruit_events(generated_by, occurred_at desc);

comment on column public.fruit_events.generation_key is
  'Stable idempotency key for automatic Fruit Intelligence generation.';

comment on column public.fruit_events.generated_by is
  'Generator that created the event: manual, reflection_keywords, review_submission, testimony_keywords, engagement_pattern, or similar.';

comment on column public.fruit_events.debug_context is
  'Lightweight admin/debug metadata describing why the Fruit event was generated.';
