-- USA-180: Planning Center donor identity.
--
-- A cache of Planning Center Giving people, keyed strictly by the stable
-- Planning Center person id. This is not a person identity system: it holds no
-- merging, no matching, and no ministry relationships. The DOS `people` table
-- remains the canonical ministry-relationship record and is untouched.
--
-- pco_giving_records is not modified. Donation ids, amounts, designations,
-- attribution, and the sync semantics all stay exactly as they are; the Finance
-- read layer joins on pco_person_id.

create table if not exists public.pco_people (
  id uuid primary key default gen_random_uuid(),
  pco_person_id text not null,
  first_name text,
  last_name text,
  display_name text,
  email text,
  raw_payload jsonb not null default '{}'::jsonb,
  sync_run_id uuid references public.pco_giving_sync_runs(id) on delete set null,
  pco_updated_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Real UNIQUE constraint, not a partial index: `on conflict (pco_person_id)`
-- cannot infer a partial one, which is the defect that would have broken the
-- first live donation sync had it not been caught.
alter table public.pco_people
  drop constraint if exists pco_people_person_id_key;
alter table public.pco_people
  add constraint pco_people_person_id_key unique (pco_person_id);

create index if not exists pco_people_name_idx on public.pco_people(last_name, first_name);

comment on table public.pco_people is
  'Cache of Planning Center Giving people, keyed by stable Planning Center person id. Enrichment only: never matched by name, never merged, never a competing identity system.';

-- One audit surface for both syncs.
alter table public.pco_giving_sync_runs
  add column if not exists scope text not null default 'giving';

alter table public.pco_giving_sync_runs
  drop constraint if exists pco_giving_sync_runs_scope_check;
alter table public.pco_giving_sync_runs
  add constraint pco_giving_sync_runs_scope_check check (scope in ('giving', 'people'));

comment on column public.pco_giving_sync_runs.scope is
  'Which Planning Center sync produced this run: giving (donations) or people (donor identity).';

alter table public.pco_people enable row level security;
revoke all on table public.pco_people from anon;
revoke all on table public.pco_people from authenticated;
grant select, insert, update on table public.pco_people to authenticated;

drop policy if exists "Admins can manage PCO people" on public.pco_people;
create policy "Admins can manage PCO people"
  on public.pco_people
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  );

drop trigger if exists set_pco_people_updated_at on public.pco_people;
create trigger set_pco_people_updated_at
  before update on public.pco_people
  for each row execute function public.set_pco_giving_records_updated_at();
