-- Rollback for USA-278. Drops only the additive share-assignment table;
-- completed results in public.dos_assessment_results are preserved.
drop table if exists public.dos_resource_share_assignments;
