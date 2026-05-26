alter table public.dos_review_links
  alter column review_type set default 'review',
  drop constraint if exists dos_review_links_review_type_check,
  add constraint dos_review_links_review_type_check check (
    review_type in ('review', 'quick_check_in', 'ministry_experience', 'full_testimony', 'testimony')
  );

alter table public.dos_meeting_reviews
  alter column review_type set default 'review',
  drop constraint if exists dos_meeting_reviews_review_type_check,
  add constraint dos_meeting_reviews_review_type_check check (
    review_type in ('review', 'quick_check_in', 'ministry_experience', 'full_testimony')
  );
