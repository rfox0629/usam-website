alter table public.missionary_encounters
  add column if not exists internal_notes text,
  add column if not exists do_not_publish boolean not null default false,
  add column if not exists submission_type text not null default 'full_testimony';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'missionary_encounters_submission_type_check'
      and conrelid = 'public.missionary_encounters'::regclass
  ) then
    alter table public.missionary_encounters
      drop constraint missionary_encounters_submission_type_check;
  end if;

  alter table public.missionary_encounters
    add constraint missionary_encounters_submission_type_check
    check (submission_type in ('quick_response', 'full_testimony'));
end $$;

create index if not exists missionary_encounters_review_status_idx
  on public.missionary_encounters(missionary_household_id, status, do_not_publish, submission_type);

comment on column public.missionary_encounters.internal_notes is
  'Command Center-only review notes. Never publish or sync this text to Profiles or Field.';

comment on column public.missionary_encounters.do_not_publish is
  'Internal privacy gate for sensitive encounters. Approved Fruit must not be created while this is true.';

comment on column public.missionary_encounters.submission_type is
  'Review display type for Command Center: quick_response or full_testimony.';
