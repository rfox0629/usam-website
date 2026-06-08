create table if not exists public.missionary_encounters (
  id uuid primary key default gen_random_uuid(),
  missionary_profile_id uuid,
  missionary_household_id uuid references public.missionary_households(id) on delete cascade,
  submitter_name text,
  submitter_email text,
  submitter_phone text,
  encounter_date date,
  original_testimony text not null,
  public_summary text,
  permission_to_share boolean not null default false,
  status text not null default 'new',
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint missionary_encounters_status_check
    check (status in ('new', 'reviewed', 'published', 'hidden', 'archived')),
  constraint missionary_encounters_source_check
    check (source in ('manual', 'public_form', 'dos'))
);

alter table public.missionary_encounters
  add column if not exists missionary_profile_id uuid,
  add column if not exists missionary_household_id uuid references public.missionary_households(id) on delete cascade,
  add column if not exists submitter_name text,
  add column if not exists submitter_email text,
  add column if not exists submitter_phone text,
  add column if not exists encounter_date date,
  add column if not exists original_testimony text,
  add column if not exists public_summary text,
  add column if not exists permission_to_share boolean not null default false,
  add column if not exists status text not null default 'new',
  add column if not exists source text not null default 'manual',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists missionary_encounters_household_status_date_idx
  on public.missionary_encounters(missionary_household_id, status, encounter_date desc, created_at desc);

create index if not exists missionary_encounters_profile_status_date_idx
  on public.missionary_encounters(missionary_profile_id, status, encounter_date desc, created_at desc);

alter table public.missionary_encounters enable row level security;

create or replace function public.set_missionary_encounters_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_missionary_encounters_updated_at on public.missionary_encounters;
create trigger set_missionary_encounters_updated_at
  before update on public.missionary_encounters
  for each row
  execute function public.set_missionary_encounters_updated_at();

do $$
begin
  if to_regclass('public.form_submissions') is not null then
    insert into public.missionary_encounters (
      missionary_profile_id,
      missionary_household_id,
      submitter_name,
      submitter_email,
      submitter_phone,
      encounter_date,
      original_testimony,
      public_summary,
      permission_to_share,
      status,
      source,
      created_at,
      updated_at
    )
    select
      case
        when nullif(form_submissions.payload->>'missionary_profile_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then nullif(form_submissions.payload->>'missionary_profile_id', '')::uuid
        else null
      end,
      coalesce(
        case
          when nullif(form_submissions.payload->>'missionary_household_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then nullif(form_submissions.payload->>'missionary_household_id', '')::uuid
          else null
        end,
        case
          when nullif(form_submissions.payload->>'household_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then nullif(form_submissions.payload->>'household_id', '')::uuid
          else null
        end,
        case
          when nullif(form_submissions.payload->>'missionary_profile_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then nullif(form_submissions.payload->>'missionary_profile_id', '')::uuid
          else null
        end
      ),
      nullif(coalesce(
        form_submissions.payload->>'submitter_name',
        trim(concat_ws(' ', form_submissions.first_name, form_submissions.last_name))
      ), ''),
      form_submissions.email,
      form_submissions.phone,
      case
        when nullif(form_submissions.payload->>'encounter_date', '') ~ '^\d{4}-\d{2}-\d{2}$'
          then nullif(form_submissions.payload->>'encounter_date', '')::date
        else null
      end,
      coalesce(
        nullif(form_submissions.payload->>'review_text', ''),
        nullif(form_submissions.payload->>'testimony_text', ''),
        nullif(form_submissions.payload->>'testimony', ''),
        nullif(form_submissions.payload->>'review', ''),
        nullif(form_submissions.message, '')
      ),
      nullif(form_submissions.payload->>'public_summary', ''),
      lower(coalesce(form_submissions.payload->>'permission_to_share', form_submissions.payload->>'permission', '')) in ('true', 'yes', '1', 'y'),
      case
        when form_submissions.payload->>'profile_encounter_status' in ('new', 'reviewed', 'published', 'hidden', 'archived')
          then form_submissions.payload->>'profile_encounter_status'
        when form_submissions.status in ('new', 'reviewed', 'published', 'hidden', 'archived')
          then form_submissions.status
        else 'new'
      end,
      'public_form',
      form_submissions.created_at,
      coalesce(form_submissions.updated_at, form_submissions.created_at)
    from public.form_submissions
    where form_submissions.form_type = 'missionary_profile_review'
      and coalesce(
        nullif(form_submissions.payload->>'review_text', ''),
        nullif(form_submissions.payload->>'testimony_text', ''),
        nullif(form_submissions.payload->>'testimony', ''),
        nullif(form_submissions.payload->>'review', ''),
        nullif(form_submissions.message, '')
      ) is not null
      and not exists (
        select 1
        from public.missionary_encounters existing_encounter
        where existing_encounter.source = 'public_form'
          and existing_encounter.created_at = form_submissions.created_at
          and coalesce(existing_encounter.submitter_email, '') = coalesce(form_submissions.email, '')
          and existing_encounter.original_testimony = coalesce(
            nullif(form_submissions.payload->>'review_text', ''),
            nullif(form_submissions.payload->>'testimony_text', ''),
            nullif(form_submissions.payload->>'testimony', ''),
            nullif(form_submissions.payload->>'review', ''),
            nullif(form_submissions.message, '')
          )
      );
  end if;
end $$;

comment on table public.missionary_encounters is
  'Command Center raw intake for testimonies, forms, reviews, and story material connected to missionary profiles. Field can create encounters later. Encounters are never public until reviewed and derived into Fruit.';

comment on column public.missionary_encounters.original_testimony is
  'Exact submitted or entered words. Do not rewrite automatically.';

comment on column public.missionary_encounters.public_summary is
  'Admin-reviewed summary for review workflow. This is not a Fruit record until explicitly structured and approved.';
