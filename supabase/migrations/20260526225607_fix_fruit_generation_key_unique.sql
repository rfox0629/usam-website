drop index if exists public.fruit_events_generation_key_unique;

create unique index if not exists fruit_events_generation_key_unique
  on public.fruit_events(generation_key);
