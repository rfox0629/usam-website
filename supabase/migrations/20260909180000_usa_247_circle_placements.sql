-- USA-247 production-backed circle placement (founder decisions, 2026-09-09).
--
-- Purely additive. Nothing existing is altered, dropped, backfilled or read
-- differently by this migration:
--   * dos_relationship_scores keeps all 121 machine rows exactly as they are.
--     They are historical evidence. Nothing here writes, nulls or promotes
--     them, and no trusted count reads them.
--   * dos_circle_overrides (0 rows, legacy enum three/twelve/seventy/field) is
--     left in place untouched. Confirmed placement uses the new table because
--     the old one has no effective dating and no reviewed-not-placed state.
--
-- Two new tables:
--   dos_circle_placements        effective-dated confirmation history
--   dos_circle_placement_batches one review-and-save action, for idempotency
--                                and audit provenance
--
-- One transactional function, dos_confirm_circle_placements, which is the only
-- supported way to change placement. It holds a per-workspace advisory lock,
-- so two concurrent saves are applied one after the other and the second sees
-- the first's rows before its own capacity check runs.

-- Three distinct states, per founder decision 4:
--   no current row                        -> not reviewed
--   placement = 'reviewed_not_placed'     -> reviewed, deliberately not placed
--   placement in the four tiers           -> confirmed placement
--
-- Tier names are the stored, exclusive model. The cumulative circles a
-- missionary reads (My 3 / My 12 / My 70 / My 120) are derived, never stored.
create table if not exists public.dos_circle_placements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  placement text not null,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  superseded_by uuid references public.dos_circle_placements(id) on delete set null,
  batch_id uuid,
  confirmed_by uuid,
  confirmed_by_email text,
  reason text,
  created_at timestamptz not null default now(),
  constraint dos_circle_placements_placement_check
    check (placement in ('inner_3', 'next_9', 'next_58', 'next_50', 'reviewed_not_placed')),
  constraint dos_circle_placements_effective_range_check
    check (effective_to is null or effective_to >= effective_from)
);

-- Exactly one current row per person per workspace. This is the constraint
-- that makes "current placement" unambiguous and makes a double-apply of the
-- same change impossible even if the function were bypassed.
create unique index if not exists dos_circle_placements_current_unique
  on public.dos_circle_placements (workspace_id, person_id)
  where effective_to is null;

create index if not exists dos_circle_placements_workspace_current_idx
  on public.dos_circle_placements (workspace_id, placement)
  where effective_to is null;

create index if not exists dos_circle_placements_person_history_idx
  on public.dos_circle_placements (workspace_id, person_id, effective_from desc);

-- One row per confirmed review-and-save. A retry with the same operation key
-- returns this row instead of applying anything a second time.
create table if not exists public.dos_circle_placement_batches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  operation_key text not null,
  changes jsonb not null,
  applied_count integer not null default 0,
  confirmed_by uuid,
  confirmed_by_email text,
  created_at timestamptz not null default now(),
  constraint dos_circle_placement_batches_operation_key_check
    check (length(operation_key) between 8 and 128)
);

create unique index if not exists dos_circle_placement_batches_operation_key_unique
  on public.dos_circle_placement_batches (workspace_id, operation_key);

alter table public.dos_circle_placements
  drop constraint if exists dos_circle_placements_batch_fk,
  add constraint dos_circle_placements_batch_fk
    foreign key (batch_id) references public.dos_circle_placement_batches(id) on delete set null;

alter table public.dos_circle_placements enable row level security;
alter table public.dos_circle_placement_batches enable row level security;

-- Same operator model as missionary_field_people and dos_circle_overrides.
-- The application additionally scopes every call to a workspace the caller has
-- been granted, in requireDosWorkspaceRouteAccess; this policy is the backstop
-- for any direct API access.
drop policy if exists "Admins can manage DOS circle placements" on public.dos_circle_placements;
create policy "Admins can manage DOS circle placements"
  on public.dos_circle_placements
  for all
  using (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower((select auth.jwt() ->> 'email'))
        and admin_users.role = any (array['admin', 'editor'])
        and coalesce(admin_users.is_active, true) is true
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower((select auth.jwt() ->> 'email'))
        and admin_users.role = any (array['admin', 'editor'])
        and coalesce(admin_users.is_active, true) is true
    )
  );

drop policy if exists "Admins can manage DOS circle placement batches" on public.dos_circle_placement_batches;
create policy "Admins can manage DOS circle placement batches"
  on public.dos_circle_placement_batches
  for all
  using (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower((select auth.jwt() ->> 'email'))
        and admin_users.role = any (array['admin', 'editor'])
        and coalesce(admin_users.is_active, true) is true
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where lower(admin_users.email) = lower((select auth.jwt() ->> 'email'))
        and admin_users.role = any (array['admin', 'editor'])
        and coalesce(admin_users.is_active, true) is true
    )
  );

-- The cumulative capacity rule, in one place, so the transaction and the
-- application cannot disagree about what is legal.
--   My 3   holds at most 3   (inner_3)
--   My 12  holds at most 12  (inner_3 + next_9)
--   My 70  holds at most 70  (inner_3 + next_9 + next_58)
--   My 120 holds at most 120 (all four tiers)
-- A fourth person in My 3 is refused however empty the outer rings are.
create or replace function public.dos_circle_capacity_conflicts(p_counts jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  with tier as (
    select
      coalesce((p_counts->>'inner_3')::integer, 0) as inner_3,
      coalesce((p_counts->>'next_9')::integer, 0) as next_9,
      coalesce((p_counts->>'next_58')::integer, 0) as next_58,
      coalesce((p_counts->>'next_50')::integer, 0) as next_50
  ),
  view_used as (
    select 'my_3' as view, 'My 3' as label, 3 as capacity, inner_3 as used from tier
    union all
    select 'my_12', 'My 12', 12, inner_3 + next_9 from tier
    union all
    select 'my_70', 'My 70', 70, inner_3 + next_9 + next_58 from tier
    union all
    select 'my_120', 'My 120', 120, inner_3 + next_9 + next_58 + next_50 from tier
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object('view', view, 'label', label, 'capacity', capacity, 'used', used, 'over_by', used - capacity)
      order by capacity
    ),
    '[]'::jsonb
  )
  from view_used
  where used > capacity;
$$;

-- The only supported way to change circle placement.
--
-- Serialized per workspace with an advisory transaction lock, so two
-- simultaneous saves cannot both pass a capacity check and then both commit.
-- The second waits, then recomputes counts from the rows the first committed.
--
-- Idempotent on (workspace_id, operation_key): a retry returns the original
-- batch and changes nothing.
--
-- Raises on any rule failure, which rolls the whole batch back. A partially
-- applied save is not possible.
create or replace function public.dos_confirm_circle_placements(p_input jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace_id uuid := (p_input->>'workspace_id')::uuid;
  v_operation_key text := nullif(trim(p_input->>'operation_key'), '');
  v_confirmed_by uuid := nullif(p_input->>'confirmed_by', '')::uuid;
  v_confirmed_by_email text := nullif(trim(p_input->>'confirmed_by_email'), '');
  v_reason text := nullif(trim(p_input->>'reason'), '');
  v_changes jsonb := coalesce(p_input->'changes', '[]'::jsonb);
  v_now timestamptz := now();
  v_batch public.dos_circle_placement_batches%rowtype;
  v_batch_id uuid;
  v_counts jsonb;
  v_conflicts jsonb;
  v_applied integer := 0;
  v_change jsonb;
  v_person_id uuid;
  v_to text;
  v_current text;
  v_unknown integer;
  v_duplicates integer;
begin
  if v_workspace_id is null then
    raise exception 'circle_placement_workspace_required';
  end if;

  if v_operation_key is null or length(v_operation_key) < 8 then
    raise exception 'circle_placement_operation_key_required';
  end if;

  if jsonb_typeof(v_changes) <> 'array' or jsonb_array_length(v_changes) = 0 then
    raise exception 'circle_placement_no_changes';
  end if;

  perform pg_advisory_xact_lock(hashtext('dos_circle_placements:' || v_workspace_id::text));

  -- Idempotency, checked inside the lock so two concurrent retries of the same
  -- key cannot both apply.
  select * into v_batch
    from public.dos_circle_placement_batches
   where workspace_id = v_workspace_id
     and operation_key = v_operation_key;

  if found then
    return jsonb_build_object(
      'status', 'already_applied',
      'batch_id', v_batch.id,
      'applied_count', v_batch.applied_count,
      'changes', v_batch.changes
    );
  end if;

  -- Every change must name a distinct person in this workspace. This is the
  -- transaction's own scoping check; it does not replace route authorization.
  select count(*) into v_duplicates
    from (
      select (value->>'person_id')::uuid as person_id
        from jsonb_array_elements(v_changes)
      group by 1
      having count(*) > 1
    ) duplicated;

  if v_duplicates > 0 then
    raise exception 'circle_placement_duplicate_person';
  end if;

  select count(*) into v_unknown
    from jsonb_array_elements(v_changes) as change
    left join public.missionary_field_people person
      on person.id = (change.value->>'person_id')::uuid
     and person.workspace_id = v_workspace_id
   where person.id is null;

  if v_unknown > 0 then
    raise exception 'circle_placement_person_not_in_workspace';
  end if;

  for v_change in select value from jsonb_array_elements(v_changes) loop
    v_to := nullif(trim(v_change->>'to'), '');

    if v_to is null then
      raise exception 'circle_placement_target_required';
    end if;

    if v_to <> 'not_reviewed'
      and v_to not in ('inner_3', 'next_9', 'next_58', 'next_50', 'reviewed_not_placed') then
      raise exception 'circle_placement_unknown_target';
    end if;
  end loop;

  -- Apply: close the current row, then open a new one. History is preserved by
  -- closing rather than updating, for moves and for removals alike.
  insert into public.dos_circle_placement_batches
    (workspace_id, operation_key, changes, applied_count, confirmed_by, confirmed_by_email)
  values
    (v_workspace_id, v_operation_key, v_changes, 0, v_confirmed_by, v_confirmed_by_email)
  returning id into v_batch_id;

  for v_change in select value from jsonb_array_elements(v_changes) loop
    v_person_id := (v_change->>'person_id')::uuid;
    v_to := trim(v_change->>'to');

    select placement into v_current
      from public.dos_circle_placements
     where workspace_id = v_workspace_id
       and person_id = v_person_id
       and effective_to is null;

    if v_current is not distinct from nullif(v_to, 'not_reviewed') then
      continue;
    end if;

    update public.dos_circle_placements
       set effective_to = v_now
     where workspace_id = v_workspace_id
       and person_id = v_person_id
       and effective_to is null;

    -- 'not_reviewed' returns the person to the absence state: the history rows
    -- stay, closed, and no current row remains.
    if v_to <> 'not_reviewed' then
      insert into public.dos_circle_placements
        (workspace_id, person_id, placement, effective_from, batch_id, confirmed_by, confirmed_by_email, reason)
      values
        (v_workspace_id, v_person_id, v_to, v_now, v_batch_id, v_confirmed_by, v_confirmed_by_email, v_reason);
    end if;

    update public.dos_circle_placements
       set superseded_by = (
             select id from public.dos_circle_placements
              where workspace_id = v_workspace_id and person_id = v_person_id and effective_to is null
           )
     where workspace_id = v_workspace_id
       and person_id = v_person_id
       and effective_to = v_now;

    v_applied := v_applied + 1;
  end loop;

  -- Capacity is checked after the writes and inside the lock, against the rows
  -- this transaction can see. Because the lock serializes the workspace, those
  -- rows already include every committed concurrent save.
  select jsonb_object_agg(placement, n) into v_counts
    from (
      select placement, count(*) as n
        from public.dos_circle_placements
       where workspace_id = v_workspace_id
         and effective_to is null
         and placement <> 'reviewed_not_placed'
      group by placement
    ) tallied;

  v_conflicts := public.dos_circle_capacity_conflicts(coalesce(v_counts, '{}'::jsonb));

  if jsonb_array_length(v_conflicts) > 0 then
    raise exception 'circle_placement_over_capacity: %', v_conflicts::text;
  end if;

  update public.dos_circle_placement_batches
     set applied_count = v_applied
   where id = v_batch_id;

  return jsonb_build_object(
    'status', 'applied',
    'batch_id', v_batch_id,
    'applied_count', v_applied,
    'changes', v_changes,
    'counts', coalesce(v_counts, '{}'::jsonb)
  );
end;
$$;

comment on table public.dos_circle_placements is
  'USA-247. Effective-dated, human-confirmed circle placement. effective_to is null means current. Absence of a current row means not reviewed. Machine values in dos_relationship_scores are historical evidence and are never read as placement.';

comment on table public.dos_circle_placement_batches is
  'USA-247. One confirmed review-and-save action. Unique on (workspace_id, operation_key), which makes dos_confirm_circle_placements idempotent.';

-- Applied to production 2026-09-10 as a follow-up: the two new tables picked up
-- the schema default grant to `anon`, which dos_circle_overrides and
-- missionary_field_people do not carry. RLS already refused anonymous access,
-- so this changes no behaviour; it removes a privilege that should never have
-- been there. Confirmed placement is operator data and is never public.
revoke all on public.dos_circle_placements from anon;
revoke all on public.dos_circle_placement_batches from anon;
