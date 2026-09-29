-- Person-level feedback that belongs to no meeting.
--
-- Some feedback predates any meeting DOS recorded: a Planning Center reflection
-- submitted in May when the first logged meeting is in July. It belongs to the
-- Person, not to a meeting, and must not be attached to a later meeting that
-- it had nothing to do with.
--
-- Additive and backward compatible:
--   * meeting_id becomes nullable. Every existing row keeps its meeting, and
--     every existing reader filters by meeting_id, so a row without one is
--     simply not visible to code that predates it.
--   * A row must still belong to something: a meeting or a Person.
--   * An imported submission is unique per source system, form and submission,
--     so running the same import twice writes it once.
-- Nothing existing is updated or deleted.

alter table public.dos_meeting_reviews
  alter column meeting_id drop not null;

alter table public.dos_meeting_reviews
  drop constraint if exists dos_meeting_reviews_subject_check,
  add constraint dos_meeting_reviews_subject_check
    check (meeting_id is not null or reviewer_person_id is not null);

create index if not exists dos_meeting_reviews_reviewer_person_idx
  on public.dos_meeting_reviews (workspace_id, reviewer_person_id)
  where reviewer_person_id is not null;

create unique index if not exists dos_meeting_reviews_import_source_unique
  on public.dos_meeting_reviews (
    workspace_id,
    (response_details #>> '{import,system}'),
    (response_details #>> '{import,form_id}'),
    (response_details #>> '{import,submission_id}')
  )
  where response_details ? 'import';
