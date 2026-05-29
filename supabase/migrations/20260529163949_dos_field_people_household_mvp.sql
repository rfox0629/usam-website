alter table public.missionary_field_people
  add column if not exists spouse_name text,
  add column if not exists children_names text,
  add column if not exists household_notes text;

comment on column public.missionary_field_people.spouse_name is
  'Optional DOS field person household context. This is about the person being ministered to, not workspace ownership.';

comment on column public.missionary_field_people.children_names is
  'Optional DOS field person household context for children names or simple family notes.';

comment on column public.missionary_field_people.household_notes is
  'Optional DOS field person household notes. Do not confuse with missionary_field_people.household_id workspace scope.';
