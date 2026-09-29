# Rollback and reference scripts

Scripts here are **never** executed automatically. They are kept out of
`supabase/migrations` because the Supabase CLI and the Supabase GitHub
integration treat every `.sql` file in that directory as a forward migration,
so a rollback stored there would drop objects on the next deploy.

| Script | Reverses | Production version |
|---|---|---|
| `20260908190059_usa_246_planned_vs_actual_meeting_time_rollback.sql` | `supabase/migrations/20260908190059_usa_246_planned_vs_actual_meeting_time.sql` | `20260908190059` |
| `20260909014931_usa_246_booking_write_path_rollback.sql` | `supabase/migrations/20260909014931_usa_246_booking_write_path.sql` | `20260909014931` |
| `20260909021813_usa_246_booking_host_availability_rollback.sql` | `supabase/migrations/20260909021813_usa_246_booking_host_availability.sql` | `20260909021813` |
| `20260910010115_usa_247_circle_placements_rollback.sql` | `supabase/migrations/20260910010115_usa_247_circle_placements.sql` | `20260910010115` |
| `20260910151053_dos_person_feedback_import_rollback.sql` | `supabase/migrations/20260910151053_dos_person_feedback_import.sql` | `20260910151053` |
| `20260911160000_dos_group_gathering_covered_journey_rollback.sql` | `supabase/migrations/20260911160000_dos_group_gathering_covered_journey.sql` | `20260911160000` |
| `20260914183331_usa_275_discipleship_connections_rollback.sql` | `supabase/migrations/20260914183331_usa_275_discipleship_connections.sql` | `20260914183331` |
| `20260916190608_dos_resource_share_assignments_rollback.sql` | `supabase/migrations/20260916190608_dos_resource_share_assignments.sql` | `20260916190608` |
| `20260916200613_dos_meeting_start_time_rollback.sql` | `supabase/migrations/20260916200613_dos_meeting_start_time.sql` | `20260916200613` |
| `20260916203633_dos_meeting_start_time_repair_rollback.sql` | `supabase/migrations/20260916203633_dos_meeting_start_time_repair.sql` | `20260916203633` |
| `20260917190000_usa_280_person_merge_coverage_rollback.sql` | `supabase/migrations/20260917190000_usa_280_person_merge_coverage.sql` | `20260917190000` |
| `20260918204612_usa_281_resource_assignment_removal_rollback.sql` | `supabase/migrations/20260918204612_usa_281_resource_assignment_removal.sql` | `20260918204612` |
| `20260918205128_usa_281_active_assignment_index_rollback.sql` | `supabase/migrations/20260918205128_usa_281_active_assignment_index.sql` | `20260918205128` |
| `20260919011651_usa_281_share_assignment_removal_rollback.sql` | `supabase/migrations/20260919011651_usa_281_share_assignment_removal.sql` | `20260919011651` |
| `20260920103132_dos_ministry_event_model_rollback.sql` | `supabase/migrations/20260920103132_dos_ministry_event_model.sql` | `20260920103132` |
| `20260920103336_dos_table_discipleship_roles_rollback.sql` | `supabase/migrations/20260920103336_dos_table_discipleship_roles.sql` | `20260920103336` |
| `20260925173335_usa_282_stopped_accountability_schedules_rollback.sql` | `supabase/migrations/20260925173335_usa_282_stopped_accountability_schedules.sql` | `20260925173335` |
| `20260925174009_usa_289_dos_access_requests_rollback.sql` | `supabase/migrations/20260925174009_usa_289_dos_access_requests.sql` | `20260925174009` |

Rules:

- Run a rollback by hand only, with founder authorization, after taking the
  snapshot described in its header.
- After running one, remove the matching row from
  `supabase_migrations.schema_migrations` so the ledger reflects the database.
- `npm run check:migrations` fails if a rollback file is placed in
  `supabase/migrations` again (USA-279).
