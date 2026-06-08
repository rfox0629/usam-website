alter table public.missionary_households
  add column if not exists show_photos boolean not null default true;
