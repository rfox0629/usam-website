alter table public.missionary_households
  add column if not exists original_story text,
  add column if not exists public_story text;

update public.missionary_households
set public_story = story
where public_story is null
  and story is not null;

comment on column public.missionary_households.original_story is
  'Raw missionary household story from intake forms or admin paste. Preserved as submitted.';

comment on column public.missionary_households.public_story is
  'Edited public story version prepared for profile display. Existing story remains the current public compatibility column.';
