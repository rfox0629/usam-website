\set ON_ERROR_STOP on
\pset pager off
\timing off

-- ---------------------------------------------------------------- fixtures
truncate public.dos_circle_placements, public.dos_circle_placement_batches cascade;
delete from public.dos_relationship_scores;
delete from public.missionary_field_people;
delete from public.missionary_households;

insert into public.missionary_households (id, display_name)
values ('11111111-1111-1111-1111-111111111111', 'Ryan'),
       ('22222222-2222-2222-2222-222222222222', 'Other workspace');

-- 20 people in Ryan's workspace, plus a private one, a household-only one,
-- and one person marked "discipling me".
insert into public.missionary_field_people (id, workspace_id, name, field_visibility, role_in_my_life)
select ('33333333-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
       '11111111-1111-1111-1111-111111111111',
       'Person ' || g,
       case when g = 19 then 'hidden' when g = 20 then 'secondary' else 'primary' end,
       case when g = 18 then 'discipling_me' else null end
from generate_series(1, 20) g;

insert into public.missionary_field_people (id, workspace_id, name)
values ('44444444-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Outsider');

-- legacy machine assignments: the rows that must survive untouched
insert into public.dos_relationship_scores (workspace_id, person_id, total_score, circle_assignment, assignment_source)
select '11111111-1111-1111-1111-111111111111',
       ('33333333-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
       34.5, 'twelve', 'automatic'
from generate_series(1, 20) g;

create or replace function pg_temp.pid(n integer) returns uuid language sql immutable as $$
  select ('33333333-0000-0000-0000-' || lpad($1::text, 12, '0'))::uuid
$$;

create or replace function pg_temp.confirm(key text, changes jsonb) returns jsonb language sql as $$
  select public.dos_confirm_circle_placements(jsonb_build_object(
    'workspace_id', '11111111-1111-1111-1111-111111111111',
    'operation_key', key,
    'confirmed_by_email', 'ryan@usamissionaries.org',
    'changes', changes));
$$;

create or replace function pg_temp.ok(label text, condition boolean) returns void language plpgsql as $$
begin
  if condition then raise notice 'PASS  %', label;
  else raise exception 'FAIL  %', label; end if;
end;
$$;

create or replace function pg_temp.raises(label text, key text, changes jsonb, expected text) returns void language plpgsql as $$
declare v_msg text;
begin
  begin
    perform pg_temp.confirm(key, changes);
    raise exception 'FAIL  % (no error was raised)', label;
  exception when others then
    v_msg := sqlerrm;
    if position('FAIL' in v_msg) = 1 then raise; end if;
    if position(expected in v_msg) = 0 then
      raise exception 'FAIL  % (expected %, got %)', label, expected, v_msg;
    end if;
    raise notice 'PASS  % [%]', label, left(v_msg, 90);
  end;
end;
$$;

-- ------------------------------------------------- 1. a fourth cannot enter My 3
select pg_temp.confirm('proof-my3-fill', jsonb_build_array(
  jsonb_build_object('person_id', pg_temp.pid(1), 'to', 'inner_3'),
  jsonb_build_object('person_id', pg_temp.pid(2), 'to', 'inner_3'),
  jsonb_build_object('person_id', pg_temp.pid(3), 'to', 'inner_3')));

select pg_temp.ok('three people fit in My 3',
  (select count(*) from public.dos_circle_placements where placement='inner_3' and effective_to is null) = 3);

select pg_temp.raises('a fourth person cannot enter My 3', 'proof-my3-fourth',
  jsonb_build_array(jsonb_build_object('person_id', pg_temp.pid(4), 'to', 'inner_3')),
  'circle_placement_over_capacity');

select pg_temp.ok('the refused fourth left no row behind',
  (select count(*) from public.dos_circle_placements where person_id = pg_temp.pid(4)) = 0);

select pg_temp.ok('the refused save left no batch behind',
  (select count(*) from public.dos_circle_placement_batches where operation_key = 'proof-my3-fourth') = 0);

-- ------------------------------------- 2. twelve cumulative cannot become thirteen
select pg_temp.confirm('proof-my12-fill', (
  select jsonb_agg(jsonb_build_object('person_id', pg_temp.pid(g), 'to', 'next_9'))
  from generate_series(4, 12) g));

select pg_temp.ok('My 12 holds twelve cumulatively',
  (select count(*) from public.dos_circle_placements
    where placement in ('inner_3','next_9') and effective_to is null) = 12);

select pg_temp.raises('a thirteenth cannot enter My 12', 'proof-my12-thirteen',
  jsonb_build_array(jsonb_build_object('person_id', pg_temp.pid(13), 'to', 'next_9')),
  'circle_placement_over_capacity');

select pg_temp.ok('My 12 still holds exactly twelve after the refusal',
  (select count(*) from public.dos_circle_placements
    where placement in ('inner_3','next_9') and effective_to is null) = 12);

-- a thirteenth person is welcome further out: My 70 has room
select pg_temp.confirm('proof-my70-ok', jsonb_build_array(
  jsonb_build_object('person_id', pg_temp.pid(13), 'to', 'next_58')));

select pg_temp.ok('the thirteenth relationship is held in My 70, not lost',
  (select placement from public.dos_circle_placements
    where person_id = pg_temp.pid(13) and effective_to is null) = 'next_58');

-- ------------------------------------------------- 3. moving preserves history
select pg_temp.confirm('proof-move', jsonb_build_array(
  jsonb_build_object('person_id', pg_temp.pid(13), 'to', 'next_50')));

select pg_temp.ok('a move leaves exactly one current row',
  (select count(*) from public.dos_circle_placements
    where person_id = pg_temp.pid(13) and effective_to is null) = 1);

select pg_temp.ok('a move preserves the previous placement as closed history',
  (select count(*) from public.dos_circle_placements
    where person_id = pg_temp.pid(13) and effective_to is not null and placement = 'next_58') = 1);

select pg_temp.ok('the closed row points at the row that replaced it',
  (select p.superseded_by = (select id from public.dos_circle_placements
                              where person_id = pg_temp.pid(13) and effective_to is null)
     from public.dos_circle_placements p
    where p.person_id = pg_temp.pid(13) and p.effective_to is not null and p.placement = 'next_58'));

select pg_temp.ok('history is readable as a dated sequence',
  (select count(*) from public.dos_circle_placements where person_id = pg_temp.pid(13)) = 2);

-- --------------------------------------------- 4. removing preserves history
select pg_temp.confirm('proof-remove', jsonb_build_array(
  jsonb_build_object('person_id', pg_temp.pid(13), 'to', 'not_reviewed')));

select pg_temp.ok('a removal leaves no current row',
  (select count(*) from public.dos_circle_placements
    where person_id = pg_temp.pid(13) and effective_to is null) = 0);

select pg_temp.ok('a removal preserves every earlier placement',
  (select count(*) from public.dos_circle_placements where person_id = pg_temp.pid(13)) = 2);

-- ------------------- 5. reviewed-not-placed differs from not-reviewed
select pg_temp.confirm('proof-reviewed-np', jsonb_build_array(
  jsonb_build_object('person_id', pg_temp.pid(14), 'to', 'reviewed_not_placed')));

select pg_temp.ok('reviewed-not-placed is a stored current row',
  (select placement from public.dos_circle_placements
    where person_id = pg_temp.pid(14) and effective_to is null) = 'reviewed_not_placed');

select pg_temp.ok('not reviewed is the absence of any current row',
  (select count(*) from public.dos_circle_placements
    where person_id = pg_temp.pid(15) and effective_to is null) = 0);

select pg_temp.ok('the two states are distinguishable in one query',
  (select count(*) from public.missionary_field_people person
     left join public.dos_circle_placements placement
       on placement.person_id = person.id and placement.effective_to is null
    where person.workspace_id = '11111111-1111-1111-1111-111111111111'
      and placement.id is null) = 7);

select pg_temp.ok('reviewed-not-placed never consumes capacity',
  (select coalesce(sum(case when placement <> 'reviewed_not_placed' then 1 else 0 end), 0)
     from public.dos_circle_placements where effective_to is null) = 12);

-- ------------------------------------------------------- 6. idempotent writes
select pg_temp.ok('a repeated operation key is reported as already applied',
  (pg_temp.confirm('proof-reviewed-np', jsonb_build_array(
    jsonb_build_object('person_id', pg_temp.pid(16), 'to', 'inner_3')))->>'status') = 'already_applied');

select pg_temp.ok('the repeat applied nothing',
  (select count(*) from public.dos_circle_placements where person_id = pg_temp.pid(16)) = 0);

select pg_temp.ok('one batch row per operation key',
  (select count(*) from public.dos_circle_placement_batches where operation_key = 'proof-reviewed-np') = 1);

-- ------------------------------------------------ 7. legacy values stay intact
select pg_temp.ok('every legacy machine row survives',
  (select count(*) from public.dos_relationship_scores) = 20);

select pg_temp.ok('every legacy row is still automatic and unedited',
  (select count(*) from public.dos_relationship_scores
    where assignment_source = 'automatic' and circle_assignment = 'twelve' and total_score = 34.5) = 20);

select pg_temp.ok('confirmed placement is a different table entirely',
  (select count(*) from public.dos_circle_placements p
     join public.dos_relationship_scores s on s.person_id = p.person_id
    where p.effective_to is null and p.placement::text = s.circle_assignment::text) = 0);

-- ------------------------------- 8. workspace scoping inside the transaction
select pg_temp.raises('a person from another workspace cannot be placed', 'proof-cross-workspace',
  jsonb_build_array(jsonb_build_object('person_id', '44444444-0000-0000-0000-000000000001', 'to', 'next_50')),
  'circle_placement_person_not_in_workspace');

select pg_temp.ok('the other workspace has no placements',
  (select count(*) from public.dos_circle_placements
    where workspace_id = '22222222-2222-2222-2222-222222222222') = 0);

-- private and household-only people may be placed when the caller has access
select pg_temp.confirm('proof-visibility', jsonb_build_array(
  jsonb_build_object('person_id', pg_temp.pid(19), 'to', 'next_50'),
  jsonb_build_object('person_id', pg_temp.pid(20), 'to', 'next_50')));

select pg_temp.ok('a hidden person can hold a confirmed placement',
  (select placement from public.dos_circle_placements
    where person_id = pg_temp.pid(19) and effective_to is null) = 'next_50');

select pg_temp.ok('a household-only person can hold a confirmed placement',
  (select placement from public.dos_circle_placements
    where person_id = pg_temp.pid(20) and effective_to is null) = 'next_50');

select pg_temp.ok('their visibility is still readable, so the surface can badge it',
  (select count(*) from public.dos_circle_placements p
     join public.missionary_field_people person on person.id = p.person_id
    where p.effective_to is null and person.field_visibility in ('hidden','secondary')) = 2);

-- --------------------------------- 9. a discipling-me person is never auto-placed
select pg_temp.ok('nobody was placed without an explicit change naming them',
  (select count(*) from public.dos_circle_placements
    where person_id = pg_temp.pid(18)) = 0);

-- ------------------------------------------- 10. malformed input is refused whole
select pg_temp.raises('an unknown target is refused', 'proof-bad-target',
  jsonb_build_array(jsonb_build_object('person_id', pg_temp.pid(17), 'to', 'my_3')),
  'circle_placement_unknown_target');

select pg_temp.raises('the same person twice in one save is refused', 'proof-dupe',
  jsonb_build_array(
    jsonb_build_object('person_id', pg_temp.pid(17), 'to', 'next_50'),
    jsonb_build_object('person_id', pg_temp.pid(17), 'to', 'next_58')),
  'circle_placement_duplicate_person');

select pg_temp.raises('an empty save is refused', 'proof-empty', '[]'::jsonb,
  'circle_placement_no_changes');

select pg_temp.raises('a save without an operation key is refused', 'short',
  jsonb_build_array(jsonb_build_object('person_id', pg_temp.pid(17), 'to', 'next_50')),
  'circle_placement_operation_key_required');

select pg_temp.ok('no refusal left a partial write',
  (select count(*) from public.dos_circle_placements where person_id = pg_temp.pid(17)) = 0);

-- a batch that is legal in part and illegal in whole is applied not at all
select pg_temp.raises('a mixed batch that breaks capacity applies none of itself', 'proof-mixed',
  jsonb_build_array(
    jsonb_build_object('person_id', pg_temp.pid(15), 'to', 'next_58'),
    jsonb_build_object('person_id', pg_temp.pid(16), 'to', 'inner_3')),
  'circle_placement_over_capacity');

select pg_temp.ok('the legal half of the refused batch was rolled back too',
  (select count(*) from public.dos_circle_placements where person_id = pg_temp.pid(15)) = 0);

select pg_temp.ok('final state is exactly the placements that were legally confirmed',
  (select count(*) from public.dos_circle_placements where effective_to is null) = 15);
