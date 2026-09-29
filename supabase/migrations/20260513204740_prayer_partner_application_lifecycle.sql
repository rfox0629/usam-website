alter table public.prayer_partners
  add column if not exists approved_at timestamp with time zone,
  add column if not exists approved_by text;

alter table public.missionary_team_members
  drop constraint if exists missionary_team_members_status_check;

alter table public.missionary_team_members
  add constraint missionary_team_members_status_check
  check (status in ('pending', 'active', 'declined', 'inactive', 'hidden', 'archived'));

update public.prayer_partners
set status = 'pending'
where source = 'public_profile'
  and status = 'active'
  and approved_at is null;

update public.missionary_team_members member
set status = 'pending',
    is_public = false
from public.prayer_partners partner
where partner.source = 'public_profile'
  and partner.status = 'pending'
  and member.household_id = coalesce(
    partner.recruited_by_household_id,
    partner.workspace_id,
    partner.missionary_profile_id
  )
  and lower(member.display_name) = lower(
    coalesce(
      nullif(partner.name, ''),
      nullif(trim(concat_ws(' ', partner.first_name, partner.last_name)), ''),
      partner.email
    )
  )
  and member.role_title = 'Prayer Partner'
  and member.source = 'public_form'
  and member.is_public = false;

create index if not exists prayer_partners_status_created_idx
  on public.prayer_partners(status, created_at desc);

create index if not exists prayer_partners_household_status_created_idx
  on public.prayer_partners(recruited_by_household_id, status, created_at desc);

create index if not exists missionary_team_members_household_role_status_idx
  on public.missionary_team_members(household_id, role_title, status);

comment on column public.prayer_partners.approved_at is
  'When a pending public prayer team application was approved by NCC Prayer Team leadership.';

comment on column public.prayer_partners.approved_by is
  'Admin email or identifier that approved the prayer partner application.';

comment on column public.prayer_partners.status is
  'Prayer partner lifecycle: pending applications, active approved partners, declined applications, inactive partners, or archived records.';
