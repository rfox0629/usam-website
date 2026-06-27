alter table public.support_commitments
  add column if not exists missionary_profile_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists profile_match_status text not null default 'unassigned',
  add column if not exists profile_match_source text,
  add column if not exists profile_match_query text;

alter table public.support_commitments
  drop constraint if exists support_commitments_profile_match_status_check;

alter table public.support_commitments
  add constraint support_commitments_profile_match_status_check
  check (profile_match_status in ('matched', 'manual', 'needs_review', 'unassigned'));

update public.support_commitments
set
  missionary_profile_id = coalesce(missionary_profile_id, household_id),
  profile_match_status = case
    when coalesce(missionary_profile_id, household_id) is not null and profile_match_status = 'unassigned' then 'matched'
    else profile_match_status
  end,
  profile_match_source = case
    when coalesce(missionary_profile_id, household_id) is not null and profile_match_source is null then 'backfill_household_id'
    else profile_match_source
  end
where household_id is not null
  and missionary_profile_id is null;

create index if not exists support_commitments_profile_created_idx
  on public.support_commitments(missionary_profile_id, submitted_at desc);

create index if not exists support_commitments_profile_match_status_idx
  on public.support_commitments(profile_match_status, submitted_at desc);

alter table public.major_gift_inquiries
  add column if not exists missionary_profile_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists profile_match_status text not null default 'unassigned',
  add column if not exists profile_match_source text,
  add column if not exists profile_match_query text;

alter table public.major_gift_inquiries
  drop constraint if exists major_gift_inquiries_profile_match_status_check;

alter table public.major_gift_inquiries
  add constraint major_gift_inquiries_profile_match_status_check
  check (profile_match_status in ('matched', 'manual', 'needs_review', 'unassigned'));

update public.major_gift_inquiries
set
  missionary_profile_id = coalesce(missionary_profile_id, household_id),
  profile_match_status = case
    when coalesce(missionary_profile_id, household_id) is not null and profile_match_status = 'unassigned' then 'matched'
    else profile_match_status
  end,
  profile_match_source = case
    when coalesce(missionary_profile_id, household_id) is not null and profile_match_source is null then 'backfill_household_id'
    else profile_match_source
  end
where household_id is not null
  and missionary_profile_id is null;

create index if not exists major_gift_inquiries_profile_created_idx
  on public.major_gift_inquiries(missionary_profile_id, created_at desc);

create index if not exists major_gift_inquiries_profile_match_status_idx
  on public.major_gift_inquiries(profile_match_status, created_at desc);

create or replace function public.sync_support_submission_profile_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.missionary_profile_id is null and new.household_id is not null then
    new.missionary_profile_id = new.household_id;
  end if;

  if new.household_id is null and new.missionary_profile_id is not null then
    new.household_id = new.missionary_profile_id;
  end if;

  if new.missionary_profile_id is not null and new.profile_match_status = 'unassigned' then
    new.profile_match_status = 'matched';
  end if;

  return new;
end;
$$;

drop trigger if exists sync_support_commitments_profile_fields on public.support_commitments;
create trigger sync_support_commitments_profile_fields
  before insert or update on public.support_commitments
  for each row
  execute function public.sync_support_submission_profile_fields();

drop trigger if exists sync_major_gift_inquiries_profile_fields on public.major_gift_inquiries;
create trigger sync_major_gift_inquiries_profile_fields
  before insert or update on public.major_gift_inquiries
  for each row
  execute function public.sync_support_submission_profile_fields();

comment on column public.support_commitments.missionary_profile_id is
  'Canonical public missionary profile linked to this donor support intent. Mirrors household_id for compatibility with older support views.';

comment on column public.support_commitments.profile_match_status is
  'Profile assignment state for finance review: matched, manual, needs_review, or unassigned.';

comment on column public.support_commitments.profile_match_source is
  'How the public missionary profile link was resolved, such as public_profile_id, public_slug, public_name, team_member_name, finance_admin, or backfill_household_id.';

comment on column public.support_commitments.profile_match_query is
  'Submitted missionary name, slug, or selection text used for profile matching.';

comment on column public.major_gift_inquiries.missionary_profile_id is
  'Canonical public missionary profile linked to this major gift inquiry. Mirrors household_id for compatibility with older support views.';

comment on column public.major_gift_inquiries.profile_match_status is
  'Profile assignment state for finance review: matched, manual, needs_review, or unassigned.';

comment on column public.major_gift_inquiries.profile_match_source is
  'How the public missionary profile link was resolved, such as public_profile_id, public_slug, public_name, team_member_name, finance_admin, or backfill_household_id.';

comment on column public.major_gift_inquiries.profile_match_query is
  'Submitted missionary name, slug, or selection text used for profile matching.';
