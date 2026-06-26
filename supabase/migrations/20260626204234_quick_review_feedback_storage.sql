alter table public.dos_meeting_reviews
  add column if not exists felt_cared_for text,
  add column if not exists felt_heard_response text,
  add column if not exists conversation_helpful text,
  add column if not exists would_meet_again_response text,
  add column if not exists response_details jsonb not null default '{}'::jsonb;

alter table public.dos_meeting_reviews
  drop constraint if exists dos_meeting_reviews_status_check,
  add constraint dos_meeting_reviews_status_check check (
    status in ('pending_review', 'reviewed', 'approved', 'private', 'archived', 'submitted')
  ),
  drop constraint if exists dos_meeting_reviews_quick_feedback_answers_check,
  add constraint dos_meeting_reviews_quick_feedback_answers_check check (
    (felt_cared_for is null or felt_cared_for in ('yes', 'somewhat', 'no', 'skipped'))
    and (felt_heard_response is null or felt_heard_response in ('yes', 'somewhat', 'no', 'skipped'))
    and (conversation_helpful is null or conversation_helpful in ('yes', 'somewhat', 'no', 'skipped'))
    and (would_meet_again_response is null or would_meet_again_response in ('yes', 'somewhat', 'no', 'skipped'))
  );

alter table public.participant_reviews
  add column if not exists would_meet_again_response text;

alter table public.participant_reviews
  drop constraint if exists participant_reviews_rating_check,
  add constraint participant_reviews_rating_check check (
    (felt_cared_for is null or felt_cared_for in ('yes', 'somewhat', 'no', 'unsure', 'skipped'))
    and (felt_heard is null or felt_heard in ('yes', 'somewhat', 'no', 'unsure', 'skipped'))
    and (conversation_helpful is null or conversation_helpful in ('yes', 'somewhat', 'no', 'unsure', 'skipped'))
    and (would_meet_again_response is null or would_meet_again_response in ('yes', 'somewhat', 'no', 'skipped'))
  );

comment on column public.dos_meeting_reviews.response_details is
  'Recipient-facing Quick Review answers and mapped outcome selections. This stores feedback only and does not create Fruit.';

comment on column public.dos_meeting_reviews.felt_cared_for is
  'Quick Review recipient answer: yes, somewhat, no, or skipped.';

comment on column public.dos_meeting_reviews.felt_heard_response is
  'Quick Review recipient answer: yes, somewhat, no, or skipped. The legacy felt_heard boolean remains for older summaries.';

comment on column public.dos_meeting_reviews.conversation_helpful is
  'Quick Review recipient answer: yes, somewhat, no, or skipped.';

comment on column public.dos_meeting_reviews.would_meet_again_response is
  'Quick Review recipient answer: yes, somewhat, no, or skipped.';

comment on column public.participant_reviews.would_meet_again_response is
  'Quick Review recipient answer: yes, somewhat, no, or skipped. The legacy boolean remains for older summaries.';

comment on table public.dos_meeting_reviews is
  'Recipient feedback submitted through DOS review links. Quick Reviews feed contact history and Circle Engine inputs; they are not Fruit records.';

notify pgrst, 'reload schema';
