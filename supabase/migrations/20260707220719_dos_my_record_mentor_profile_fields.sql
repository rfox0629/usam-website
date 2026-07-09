alter table public.dos_user_mentor_relationships
  add column if not exists mentor_email text,
  add column if not exists mentor_phone text,
  add column if not exists meeting_rhythm text;

comment on column public.dos_user_mentor_relationships.mentor_email is
  'Private My Record mentor email saved by the user. Not public profile, Field, Table, Fruit, or circle metric data.';

comment on column public.dos_user_mentor_relationships.mentor_phone is
  'Private My Record mentor phone saved by the user. Not public profile, Field, Table, Fruit, or circle metric data.';

comment on column public.dos_user_mentor_relationships.meeting_rhythm is
  'Optional user-authored mentor meeting rhythm such as weekly, 2x/week, monthly, as needed, or custom.';

comment on table public.dos_user_mentor_relationships is
  'Private DOS My Record mentors, representing who is pouring into the user. Existing Field contacts can be linked without creating ministry activity. Mentor profile fields are private by default and future share-compatible.';
