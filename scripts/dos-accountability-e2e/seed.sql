-- USA-282 DELETE verification fixtures. Two isolated test workspaces, created
-- here and dropped at the end. Nothing else in the database is touched.
begin;

delete from missionary_households where slug in ('usa282-test-a','usa282-test-b');

insert into missionary_households (id, slug, display_name) values
  ('00000000-0000-4282-8000-0000000000a1', 'usa282-test-a', 'USA-282 Test Workspace A'),
  ('00000000-0000-4282-8000-0000000000b1', 'usa282-test-b', 'USA-282 Test Workspace B');

insert into dos_workspace_feature_flags (workspace_id, flag_key, enabled) values
  ('00000000-0000-4282-8000-0000000000a1', 'dos_commitments_accountability', true),
  ('00000000-0000-4282-8000-0000000000b1', 'dos_commitments_accountability', true);

insert into missionary_field_people (id, household_id, name) values
  ('00000000-0000-4282-8000-0000000000a2', '00000000-0000-4282-8000-0000000000a1', 'Test Person A'),
  ('00000000-0000-4282-8000-0000000000b2', '00000000-0000-4282-8000-0000000000b1', 'Test Person B');

-- A leader's rhythm, with two check-ins recorded against it and one recorded
-- without a schedule at all.
insert into dos_accountability_schedules (id, workspace_id, person_id, title, frequency, day_of_week, start_date, next_check_in, status) values
  ('00000000-0000-4282-8000-000000000101', '00000000-0000-4282-8000-0000000000a1', '00000000-0000-4282-8000-0000000000a2', 'Test rhythm', 'weekly', 1, '2026-09-01', '2026-09-20', 'active');

insert into dos_accountability_check_ins (id, workspace_id, schedule_id, person_id, check_in_date, general_update) values
  ('00000000-0000-4282-8000-000000000111', '00000000-0000-4282-8000-0000000000a1', '00000000-0000-4282-8000-000000000101', '00000000-0000-4282-8000-0000000000a2', '2026-09-06', 'First recorded check-in'),
  ('00000000-0000-4282-8000-000000000112', '00000000-0000-4282-8000-0000000000a1', '00000000-0000-4282-8000-000000000101', '00000000-0000-4282-8000-0000000000a2', '2026-09-13', 'Second recorded check-in');

-- A one-time goal, with progress recorded against it.
insert into dos_person_commitments (id, workspace_id, person_id, title, status, target_date) values
  ('00000000-0000-4282-8000-000000000201', '00000000-0000-4282-8000-0000000000a1', '00000000-0000-4282-8000-0000000000a2', 'Test goal', 'active', '2026-09-30');

insert into dos_commitment_updates (id, workspace_id, commitment_id, person_id, update_date, progress_note) values
  ('00000000-0000-4282-8000-000000000211', '00000000-0000-4282-8000-0000000000a1', '00000000-0000-4282-8000-000000000201', '00000000-0000-4282-8000-0000000000a2', '2026-09-08', 'First progress'),
  ('00000000-0000-4282-8000-000000000212', '00000000-0000-4282-8000-0000000000a1', '00000000-0000-4282-8000-000000000201', '00000000-0000-4282-8000-0000000000a2', '2026-09-15', 'Second progress');

-- A check-in written beside the goal, which must survive the goal's delete.
insert into dos_accountability_check_ins (id, workspace_id, schedule_id, person_id, check_in_date, general_update) values
  ('00000000-0000-4282-8000-000000000113', '00000000-0000-4282-8000-0000000000a1', null, '00000000-0000-4282-8000-0000000000a2', '2026-09-15', 'Check-in beside the goal');

-- A Journey assignment: its shadow commitment, and the follow-up schedule DOS
-- generated for it (marker in the title).
insert into dos_person_commitments (id, workspace_id, person_id, title, status, target_date) values
  ('00000000-0000-4282-8000-000000000202', '00000000-0000-4282-8000-0000000000a1', '00000000-0000-4282-8000-0000000000a2', 'Journey shadow commitment', 'active', '2026-10-05');

insert into dos_resource_assignments (id, workspace_id, resource_slug, person_id, status, linked_commitment_id) values
  ('00000000-0000-4282-8000-000000000301', '00000000-0000-4282-8000-0000000000a1', 'new-testament-14-days', '00000000-0000-4282-8000-0000000000a2', 'in_progress', '00000000-0000-4282-8000-000000000202');

insert into dos_accountability_schedules (id, workspace_id, person_id, title, frequency, day_of_week, start_date, next_check_in, status) values
  ('00000000-0000-4282-8000-000000000102', '00000000-0000-4282-8000-0000000000a1', '00000000-0000-4282-8000-0000000000a2', 'Growth follow-up due [resource-assignment:00000000-0000-4282-8000-000000000301:midpoint]', 'one_time', null, '2026-09-01', '2026-09-25', 'active');

-- A weekly rhythm whose next check-in fell four weeks ago: the leader has been
-- away. There is ONE row, because a rhythm carries one outstanding date --
-- this fixture exists to prove no catch-up rows appear behind it.
insert into dos_accountability_schedules (id, workspace_id, person_id, title, frequency, day_of_week, start_date, next_check_in, status) values
  ('00000000-0000-4282-8000-000000000104', '00000000-0000-4282-8000-0000000000a1', '00000000-0000-4282-8000-0000000000a2', 'Weekly with Kyle', 'weekly', 1, '2026-07-06', '2026-08-24', 'active');

-- Two check-ins already recorded under it, which must survive everything.
insert into dos_accountability_check_ins (id, workspace_id, schedule_id, person_id, check_in_date, general_update) values
  ('00000000-0000-4282-8000-000000000121', '00000000-0000-4282-8000-0000000000a1', '00000000-0000-4282-8000-000000000104', '00000000-0000-4282-8000-0000000000a2', '2026-08-10', 'Before the gap'),
  ('00000000-0000-4282-8000-000000000122', '00000000-0000-4282-8000-0000000000a1', '00000000-0000-4282-8000-000000000104', '00000000-0000-4282-8000-0000000000a2', '2026-08-17', 'Also before the gap');

-- A monthly rhythm anchored on the 31st. February has no 31st, so this is the
-- fixture that proves the month-end rule against the real recurrence code.
insert into dos_accountability_schedules (id, workspace_id, person_id, title, frequency, day_of_week, start_date, next_check_in, status) values
  ('00000000-0000-4282-8000-000000000105', '00000000-0000-4282-8000-0000000000a1', '00000000-0000-4282-8000-0000000000a2', 'Monthly with Derek', 'monthly', null, '2026-01-31', '2026-01-31', 'active');

-- A Thursday rhythm, for the founder's own example: answered on a Friday, the
-- next one is the Friday -- not dragged back to Thursday.
insert into dos_accountability_schedules (id, workspace_id, person_id, title, frequency, day_of_week, start_date, next_check_in, status) values
  ('00000000-0000-4282-8000-000000000106', '00000000-0000-4282-8000-0000000000a1', '00000000-0000-4282-8000-0000000000a2', 'Thursdays with Ben', 'weekly', 4, '2026-09-03', '2026-09-24', 'active');

-- Workspace B's own rhythm: a delete asked for against workspace A must not
-- find it.
insert into dos_accountability_schedules (id, workspace_id, person_id, title, frequency, day_of_week, start_date, next_check_in, status) values
  ('00000000-0000-4282-8000-000000000103', '00000000-0000-4282-8000-0000000000b1', '00000000-0000-4282-8000-0000000000b2', 'Other workspace rhythm', 'weekly', 1, '2026-09-01', '2026-09-20', 'active');

commit;
