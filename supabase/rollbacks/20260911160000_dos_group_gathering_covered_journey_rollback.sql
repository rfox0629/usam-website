alter table public.dos_group_gatherings
  drop column if exists covered_summary,
  drop column if exists journey_resource_slug,
  drop column if exists journey_session_id;
