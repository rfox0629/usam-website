alter table public.dos_meeting_reviews
  add column if not exists submitted_first_name text,
  add column if not exists submitted_last_name text,
  add column if not exists overall_rating text;

alter table public.participant_reviews
  add column if not exists submitted_first_name text,
  add column if not exists submitted_last_name text,
  add column if not exists overall_rating text;

alter table public.dos_meeting_reviews
  drop constraint if exists dos_meeting_reviews_overall_rating_check,
  add constraint dos_meeting_reviews_overall_rating_check check (
    overall_rating is null
    or overall_rating in ('life_changing', 'very_meaningful', 'helpful', 'somewhat_helpful', 'not_very_helpful')
  );

alter table public.participant_reviews
  drop constraint if exists participant_reviews_overall_rating_check,
  add constraint participant_reviews_overall_rating_check check (
    overall_rating is null
    or overall_rating in ('life_changing', 'very_meaningful', 'helpful', 'somewhat_helpful', 'not_very_helpful')
  );

update public.dos_meeting_reviews
set
  submitted_first_name = split_part(btrim(submitted_name), ' ', 1),
  submitted_last_name = nullif(btrim(regexp_replace(btrim(submitted_name), '^[^[:space:]]+[[:space:]]*', '')), '')
where submitted_name is not null
  and btrim(submitted_name) <> ''
  and submitted_first_name is null
  and submitted_last_name is null;

update public.participant_reviews
set
  submitted_first_name = split_part(btrim(submitted_name), ' ', 1),
  submitted_last_name = nullif(btrim(regexp_replace(btrim(submitted_name), '^[^[:space:]]+[[:space:]]*', '')), '')
where submitted_name is not null
  and btrim(submitted_name) <> ''
  and submitted_first_name is null
  and submitted_last_name is null;

comment on column public.dos_meeting_reviews.submitted_first_name is
  'Quick Review submitted first name when the recipient form captures split name fields. The legacy submitted_name column remains populated.';

comment on column public.dos_meeting_reviews.submitted_last_name is
  'Quick Review submitted last name when the recipient form captures split name fields. The legacy submitted_name column remains populated.';

comment on column public.dos_meeting_reviews.overall_rating is
  'Recipient overall Quick Review rating stored as review metadata for later leader confirmation.';

comment on column public.participant_reviews.submitted_first_name is
  'Quick Review submitted first name when the recipient form captures split name fields. The legacy submitted_name column remains populated.';

comment on column public.participant_reviews.submitted_last_name is
  'Quick Review submitted last name when the recipient form captures split name fields. The legacy submitted_name column remains populated.';

comment on column public.participant_reviews.overall_rating is
  'Recipient overall Quick Review rating stored as review metadata for later leader confirmation.';

notify pgrst, 'reload schema';
