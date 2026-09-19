-- Rollback for USA-281 share assignment removal.
--
-- Dropping these columns restores the previous shape. Nothing is deleted: no
-- assessment, no response, no result.
--
-- What it does change, stated plainly:
--
--   A COMPLETED assessment that was removed becomes visible again on both
--   participants' records, and its public link becomes reachable again.
--   Dropping public_access_revoked_at drops the only record that the link was
--   ever withdrawn, so every such link reopens. If that matters, revoke those
--   links through the product before rolling back. Do not delete the rows:
--   the answers are the couple's.
--
--   An UNFINISHED assessment that was removed stays gone and its link stays
--   dead, because removal also set status = 'revoked' and revoked_at, and this
--   rollback does not touch either. That is the correct outcome. A public link
--   that was revoked should not come back to life because a column was
--   dropped.
--
-- The rollback below names the completed rows it is about to re-expose, so the
-- operator sees them before anything is dropped.

do $$
declare
  affected int;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dos_resource_share_assignments'
      and column_name = 'removed_at'
  ) then
    select count(*) into affected
    from public.dos_resource_share_assignments
    where removed_at is not null and status = 'completed';

    if affected > 0 then
      raise notice 'Rollback will re-expose % completed assessment(s) and reopen their public links.', affected;
    end if;
  end if;
end $$;

drop index if exists public.dos_resource_share_assignments_public_access_idx;
drop index if exists public.dos_resource_share_assignments_secondary_active_idx;
drop index if exists public.dos_resource_share_assignments_primary_active_idx;

alter table public.dos_resource_share_assignments
  drop column if exists public_access_revoked_at,
  drop column if exists removed_by_user_id,
  drop column if exists removed_at;
