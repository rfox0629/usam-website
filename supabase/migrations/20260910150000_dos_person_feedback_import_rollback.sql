-- Rollback for 20260910150000_dos_person_feedback_import.sql
--
-- Refuses to run while any Person-level feedback exists, because restoring
-- NOT NULL would otherwise fail halfway or, worse, invite someone to "fix" it
-- by attaching that feedback to an unrelated meeting. Export those rows first:
--
--   copy (select * from public.dos_meeting_reviews where meeting_id is null) to stdout with csv header;
--
-- then remove them deliberately, then run this.

do $$
begin
  if exists (select 1 from public.dos_meeting_reviews where meeting_id is null) then
    raise exception 'Person-level feedback without a meeting exists. Export and remove it before rolling back.';
  end if;
end;
$$;

drop index if exists public.dos_meeting_reviews_import_source_unique;
drop index if exists public.dos_meeting_reviews_reviewer_person_idx;

alter table public.dos_meeting_reviews
  drop constraint if exists dos_meeting_reviews_subject_check;

alter table public.dos_meeting_reviews
  alter column meeting_id set not null;
