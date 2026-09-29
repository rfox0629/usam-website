create index if not exists dos_review_links_meeting_fk_idx
  on public.dos_review_links(meeting_id);

create index if not exists dos_review_links_reviewer_person_fk_idx
  on public.dos_review_links(reviewer_person_id)
  where reviewer_person_id is not null;

create index if not exists dos_meeting_reviews_review_link_fk_idx
  on public.dos_meeting_reviews(review_link_id)
  where review_link_id is not null;

create index if not exists dos_meeting_reviews_fruit_item_fk_idx
  on public.dos_meeting_reviews(fruit_item_id)
  where fruit_item_id is not null;
