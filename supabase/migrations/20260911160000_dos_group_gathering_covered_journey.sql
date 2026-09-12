-- Group gathering: what the group covered, and a link to the group's Journey.
-- Additive and nullable. Applied only with founder authorization; the app
-- detects the columns and hides these fields until they exist.
alter table public.dos_group_gatherings
  add column if not exists covered_summary text,
  add column if not exists journey_resource_slug text,
  add column if not exists journey_session_id text;
