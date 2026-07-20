create extension if not exists pgcrypto;

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,
  source_page text,
  first_name text,
  last_name text,
  email text,
  phone text,
  message text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  priority text not null default 'normal',
  assigned_to text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_submissions_form_type_check check (
    form_type in (
      'financial_freedom',
      'major_gift',
      'contact',
      'support_giving',
      'prayer_team_application',
      'missionary_application',
      'general'
    )
  ),
  constraint form_submissions_status_check check (
    status in ('new', 'reviewed', 'follow_up', 'converted', 'archived')
  ),
  constraint form_submissions_priority_check check (
    priority in ('low', 'normal', 'high', 'urgent')
  )
);

create table if not exists public.prayer_partners (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  city text,
  state text,
  church_affiliation text,
  availability text[],
  email_alerts boolean not null default true,
  sms_alerts boolean not null default false,
  status text not null default 'active',
  permissions jsonb not null default '{}'::jsonb,
  recruited_by text,
  date_joined timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prayer_partners
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists church_affiliation text,
  add column if not exists availability text[],
  add column if not exists email_alerts boolean not null default true,
  add column if not exists sms_alerts boolean not null default false,
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists recruited_by text,
  add column if not exists recruited_by_household_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists recruited_by_household_name text,
  add column if not exists recruited_by_profile_slug text,
  add column if not exists source text,
  add column if not exists date_joined timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'prayer_partners'
      and column_name = 'name'
  ) then
    execute $sql$
      update public.prayer_partners
      set
        first_name = coalesce(first_name, nullif(split_part(name, ' ', 1), '')),
        last_name = coalesce(last_name, nullif(trim(substr(name, length(split_part(name, ' ', 1)) + 1)), '')),
        recruited_by = coalesce(recruited_by, recruited_by_household_name, source),
        date_joined = coalesce(date_joined, created_at)
    $sql$;
  end if;
end $$;

update public.prayer_partners
set name = coalesce(name, nullif(trim(concat_ws(' ', first_name, last_name)), ''))
where true;

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  request text not null,
  category text,
  urgency text not null default 'normal',
  status text not null default 'open',
  confidentiality_level text not null default 'general',
  related_household_id uuid references public.missionary_households(id) on delete set null,
  related_missionary_profile_id uuid references public.missionary_households(id) on delete set null,
  related_state text,
  related_region text,
  assigned_partner_ids uuid[],
  prayed_count int not null default 0,
  last_prayed_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prayer_requests
  add column if not exists request text,
  add column if not exists description text,
  add column if not exists urgency text not null default 'normal',
  add column if not exists confidentiality_level text not null default 'general',
  add column if not exists household_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists visibility text not null default 'team',
  add column if not exists related_household_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists related_missionary_profile_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists related_state text,
  add column if not exists related_region text,
  add column if not exists assigned_partner_ids uuid[],
  add column if not exists prayed_count int not null default 0,
  add column if not exists last_prayed_at timestamptz,
  add column if not exists answered_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'prayer_requests'
      and column_name = 'description'
  ) then
    execute $sql$
      update public.prayer_requests
      set request = coalesce(request, description, '')
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'prayer_requests'
      and column_name = 'household_id'
  ) then
    execute $sql$
      update public.prayer_requests
      set related_household_id = coalesce(related_household_id, household_id)
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'prayer_requests'
      and column_name = 'visibility'
  ) then
    execute $sql$
      update public.prayer_requests
      set confidentiality_level = coalesce(
        confidentiality_level,
        case
          when visibility = 'private' then 'confidential'
          else 'general'
        end
      )
    $sql$;
  end if;
end $$;

update public.prayer_requests
set
  request = coalesce(request, ''),
  description = coalesce(description, request, ''),
  household_id = coalesce(household_id, related_household_id),
  visibility = coalesce(
    visibility,
    case
      when confidentiality_level = 'general' then 'team'
      else 'private'
    end
  ),
  status = case when status = 'active' then 'open' else status end
where true;

alter table public.prayer_requests
  alter column request set not null,
  alter column status set default 'open';

alter table public.prayer_requests
  drop constraint if exists prayer_requests_status_check,
  drop constraint if exists prayer_requests_urgency_check,
  drop constraint if exists prayer_requests_confidentiality_level_check;

alter table public.prayer_requests
  add constraint prayer_requests_status_check check (status in ('open', 'covered', 'answered', 'archived', 'active')),
  add constraint prayer_requests_urgency_check check (urgency in ('normal', 'important', 'urgent')),
  add constraint prayer_requests_confidentiality_level_check check (
    confidentiality_level in ('general', 'missionary_couple', 'kitchen_table', 'confidential')
  );

create index if not exists form_submissions_status_created_idx
  on public.form_submissions(status, created_at desc);

create index if not exists form_submissions_type_status_idx
  on public.form_submissions(form_type, status, created_at desc);

create index if not exists form_submissions_email_created_idx
  on public.form_submissions(lower(email), created_at desc);

create index if not exists prayer_partners_email_lower_idx
  on public.prayer_partners(lower(email));

create index if not exists prayer_partners_status_joined_idx
  on public.prayer_partners(status, date_joined desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'prayer_partners_email_unique'
      and conrelid = 'public.prayer_partners'::regclass
  )
  and not exists (
    select 1
    from public.prayer_partners
    where email is not null
    group by lower(email)
    having count(*) > 1
  ) then
    alter table public.prayer_partners
      add constraint prayer_partners_email_unique unique (email);
  end if;
end $$;

create index if not exists prayer_requests_related_household_idx
  on public.prayer_requests(related_household_id, status);

create index if not exists prayer_requests_state_region_idx
  on public.prayer_requests(related_state, related_region, status);

create or replace function public.set_form_submissions_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_form_submissions_updated_at on public.form_submissions;
create trigger set_form_submissions_updated_at
  before update on public.form_submissions
  for each row
  execute function public.set_form_submissions_updated_at();

do $$
begin
  if to_regclass('public.financial_freedom_inquiries') is not null then
    execute $sql$
      insert into public.form_submissions (
        form_type,
        source_page,
        first_name,
        last_name,
        email,
        phone,
        message,
        payload,
        status,
        priority,
        created_at,
        updated_at
      )
      select
        'financial_freedom',
        '/financialfreedom',
        nullif(split_part(full_name, ' ', 1), ''),
        nullif(trim(substr(full_name, length(split_part(full_name, ' ', 1)) + 1)), ''),
        email,
        phone,
        main_financial_burden,
        jsonb_build_object(
          'financial_freedom_inquiry_id', id,
          'monthly_income', monthly_income,
          'monthly_expenses', monthly_expenses,
          'total_debt', total_debt,
          'desired_12_month_outcome', desired_12_month_outcome
        ),
        case when status = 'closed' then 'archived' else status end,
        'normal',
        created_at,
        coalesce(updated_at, created_at)
      from public.financial_freedom_inquiries source
      where not exists (
        select 1
        from public.form_submissions existing
        where existing.form_type = 'financial_freedom'
          and existing.payload ->> 'financial_freedom_inquiry_id' = source.id::text
      )
    $sql$;
  end if;

  if to_regclass('public.major_gift_inquiries') is not null then
    execute $sql$
      insert into public.form_submissions (
        form_type,
        source_page,
        first_name,
        last_name,
        email,
        phone,
        message,
        payload,
        status,
        priority,
        created_at,
        updated_at
      )
      select
        'major_gift',
        coalesce('/missionaries/' || nullif(profile_slug, ''), '/support'),
        first_name,
        last_name,
        email,
        phone,
        message,
        jsonb_build_object(
          'major_gift_inquiry_id', id,
          'household_id', household_id,
          'household_name', household_name,
          'profile_slug', profile_slug,
          'donation_types', donation_types,
          'projected_amount_range', projected_amount_range,
          'intended_for', intended_for
        ),
        case
          when status = 'contacted' then 'follow_up'
          when status = 'closed' then 'reviewed'
          else status
        end,
        case when projected_amount_range = '$100,000+' then 'urgent' else 'high' end,
        created_at,
        coalesce(updated_at, created_at)
      from public.major_gift_inquiries source
      where not exists (
        select 1
        from public.form_submissions existing
        where existing.form_type = 'major_gift'
          and existing.payload ->> 'major_gift_inquiry_id' = source.id::text
      )
    $sql$;
  end if;

  if to_regclass('public.support_commitments') is not null then
    execute $sql$
      insert into public.form_submissions (
        form_type,
        source_page,
        first_name,
        last_name,
        email,
        phone,
        message,
        payload,
        status,
        priority,
        created_at,
        updated_at
      )
      select
        'support_giving',
        coalesce('/missionaries/' || nullif(profile_slug, ''), '/support'),
        first_name,
        last_name,
        email,
        phone,
        message,
        jsonb_build_object(
          'support_commitment_id', id,
          'household_id', household_id,
          'household_name', household_name,
          'profile_slug', profile_slug,
          'gift_type', gift_type,
          'selected_amount', selected_amount,
          'other_amount', other_amount,
          'allocation_preference', allocation_preference
        ),
        case
          when status in ('new', 'reviewed', 'archived') then status
          when status = 'reconciled' then 'converted'
          when status = 'closed' then 'archived'
          else 'new'
        end,
        'normal',
        created_at,
        updated_at
      from public.support_commitments source
      where not exists (
        select 1
        from public.form_submissions existing
        where existing.form_type = 'support_giving'
          and existing.payload ->> 'support_commitment_id' = source.id::text
      )
    $sql$;
  end if;

  if to_regclass('public.prayer_partner_applications') is not null then
    execute $sql$
      insert into public.form_submissions (
        form_type,
        source_page,
        first_name,
        last_name,
        email,
        phone,
        message,
        payload,
        status,
        priority,
        created_at,
        updated_at
      )
      select
        'prayer_team_application',
        '/prayer/join',
        first_name,
        last_name,
        email,
        phone,
        motivation,
        jsonb_build_object(
          'prayer_partner_application_id', id,
          'city', city,
          'state', state,
          'church_affiliation', church_affiliation,
          'referral_source', referral_source,
          'availability', availability,
          'email_alerts', email_alerts,
          'sms_alerts', sms_alerts,
          'confidentiality_agreement', confidentiality_agreement
        ),
        case when status = 'approved' then 'converted' when status = 'declined' then 'archived' else 'new' end,
        'normal',
        created_at,
        created_at
      from public.prayer_partner_applications source
      where not exists (
        select 1
        from public.form_submissions existing
        where existing.form_type = 'prayer_team_application'
          and existing.payload ->> 'prayer_partner_application_id' = source.id::text
      )
    $sql$;
  end if;
end $$;

alter table public.form_submissions enable row level security;
alter table public.prayer_partners enable row level security;
alter table public.prayer_requests enable row level security;

grant insert on table public.form_submissions to anon, authenticated;
grant select, update on table public.form_submissions to authenticated;
grant select, insert, update on table public.prayer_partners to authenticated;
grant select on table public.prayer_requests to anon;
grant select, insert, update on table public.prayer_requests to authenticated;

revoke insert on table public.prayer_partners from anon;

drop policy if exists "Public can join missionary prayer teams" on public.prayer_partners;

drop policy if exists "Public can submit form submissions" on public.form_submissions;
create policy "Public can submit form submissions"
  on public.form_submissions
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and priority in ('low', 'normal', 'high', 'urgent')
    and form_type in (
      'financial_freedom',
      'major_gift',
      'contact',
      'support_giving',
      'prayer_team_application',
      'missionary_application',
      'general'
    )
  );

drop policy if exists "Admins can read form submissions" on public.form_submissions;
create policy "Admins can read form submissions"
  on public.form_submissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  );

drop policy if exists "Admins can update form submissions" on public.form_submissions;
create policy "Admins can update form submissions"
  on public.form_submissions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and admin_users.role = 'admin'
    )
  )
  with check (
    status in ('new', 'reviewed', 'follow_up', 'converted', 'archived')
    and priority in ('low', 'normal', 'high', 'urgent')
  );

drop policy if exists "Admins can manage prayer partners" on public.prayer_partners;
create policy "Admins can manage prayer partners"
  on public.prayer_partners
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and (
          admin_users.role = 'admin'
          or admin_users.prayer_permissions && array['prayer_admin', 'admin_prayer_manager']::text[]
        )
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and (
          admin_users.role = 'admin'
          or admin_users.prayer_permissions && array['prayer_admin', 'admin_prayer_manager']::text[]
        )
    )
  );

drop policy if exists "Admins can manage operational prayer requests" on public.prayer_requests;
create policy "Admins can manage operational prayer requests"
  on public.prayer_requests
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and (
          admin_users.role = 'admin'
          or admin_users.prayer_permissions && array[
            'view_general_requests',
            'view_missionary_couple_requests',
            'view_kitchen_table_alerts',
            'view_confidential_requests',
            'prayer_admin',
            'admin_prayer_manager'
          ]::text[]
        )
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where lower(admin_users.email) = lower(((select auth.jwt()) ->> 'email'))
        and (
          admin_users.role = 'admin'
          or admin_users.prayer_permissions && array['prayer_admin', 'admin_prayer_manager']::text[]
        )
    )
  );

drop policy if exists "Public can read active public prayer requests" on public.prayer_requests;
create policy "Public can read active public prayer requests"
  on public.prayer_requests
  for select
  to anon, authenticated
  using (
    status in ('active', 'open')
    and visibility = 'public'
    and confidentiality_level = 'general'
    and exists (
      select 1
      from public.missionary_households
      where missionary_households.id = coalesce(prayer_requests.household_id, prayer_requests.related_household_id)
        and missionary_households.public_visible = true
    )
  );

-- Future DOS integration entry points:
-- - insert prayer_requests when a kitchen table meeting is scheduled
-- - insert missionary-couple requests from DOS missionary workflows
-- - attach related_household_id when a public missionary profile receives a prayer request
-- - fan out prayer alerts to approved prayer_partners through email/SMS queues
