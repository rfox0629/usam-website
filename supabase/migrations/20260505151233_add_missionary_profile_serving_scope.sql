alter table public.missionary_households
  add column if not exists primary_state text,
  add column if not exists serving_scope text not null default 'nationwide',
  add column if not exists secondary_states text[];

alter table public.missionary_households
  drop constraint if exists missionary_households_serving_scope_check;

alter table public.missionary_households
  add constraint missionary_households_serving_scope_check
  check (serving_scope in ('local', 'statewide', 'regional', 'nationwide', 'global'));
