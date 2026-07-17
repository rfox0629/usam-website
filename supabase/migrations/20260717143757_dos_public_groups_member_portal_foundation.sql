create extension if not exists pgcrypto;

create schema if not exists private_dos;

revoke all on schema private_dos from public;
grant usage on schema private_dos to authenticated;
grant usage on schema private_dos to service_role;

create table if not exists public.public_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  personal_ministry_entity_id uuid,
  hostname text not null,
  base_path text not null default '/groups',
  display_name text not null,
  logo_url text,
  brand jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_sites_owner_check check (
    (organization_id is not null and personal_ministry_entity_id is null)
    or (organization_id is null and personal_ministry_entity_id is not null)
  ),
  constraint public_sites_hostname_check check (length(btrim(hostname)) > 0 and hostname = lower(hostname)),
  constraint public_sites_base_path_check check (base_path ~ '^/[a-z0-9/_-]*$'),
  constraint public_sites_display_name_check check (length(btrim(display_name)) > 0),
  constraint public_sites_status_check check (status in ('active', 'inactive', 'archived'))
);

create unique index if not exists public_sites_hostname_base_path_unique
  on public.public_sites(lower(hostname), base_path);

create unique index if not exists public_sites_default_organization_unique
  on public.public_sites(organization_id)
  where organization_id is not null
    and is_default = true
    and status = 'active';

create unique index if not exists public_sites_default_personal_entity_unique
  on public.public_sites(personal_ministry_entity_id)
  where personal_ministry_entity_id is not null
    and is_default = true
    and status = 'active';

drop trigger if exists set_public_sites_updated_at on public.public_sites;
create trigger set_public_sites_updated_at
  before update on public.public_sites
  for each row
  execute function public.set_dos_updated_at();

alter table public.dos_groups
  add column if not exists public_site_id uuid references public.public_sites(id) on delete set null,
  add column if not exists public_status text not null default 'draft',
  add column if not exists member_access_enabled boolean not null default true,
  add column if not exists member_visible_location_mode text not null default 'general',
  add column if not exists created_by_identity_id uuid references public.dos_identity_links(id) on delete set null;

do $$
begin
  alter table public.dos_groups
    drop constraint if exists dos_groups_public_status_check,
    drop constraint if exists dos_groups_member_visible_location_mode_check;

  alter table public.dos_groups
    add constraint dos_groups_public_status_check
      check (public_status in ('draft', 'published', 'paused', 'archived')),
    add constraint dos_groups_member_visible_location_mode_check
      check (member_visible_location_mode in ('hidden', 'general', 'exact'));
end $$;

create index if not exists dos_groups_public_site_status_idx
  on public.dos_groups(public_site_id, public_status, active, slug)
  where public_site_id is not null;

create index if not exists dos_groups_organization_public_idx
  on public.dos_groups(organization_id, public_status, active, slug)
  where organization_id is not null;

create unique index if not exists dos_groups_public_site_slug_unique
  on public.dos_groups(public_site_id, slug)
  where public_site_id is not null
    and public_status = 'published'
    and active = true;

create index if not exists dos_groups_created_by_identity_idx
  on public.dos_groups(created_by_identity_id)
  where created_by_identity_id is not null;

alter table public.dos_group_join_requests
  add column if not exists public_site_id uuid references public.public_sites(id) on delete set null,
  add column if not exists source_hostname text;

create index if not exists dos_group_join_requests_public_site_status_idx
  on public.dos_group_join_requests(public_site_id, status, submitted_at desc)
  where public_site_id is not null;

create table if not exists public.dos_group_member_identities (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.dos_groups(id) on delete cascade,
  group_member_id uuid not null references public.dos_group_members(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  verified_email text,
  verified_phone text,
  status text not null default 'invited',
  verification_method text not null default 'leader_approval',
  verified_at timestamptz,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_group_member_identities_status_check check (
    status in ('candidate', 'invited', 'verified', 'revoked', 'inactive')
  ),
  constraint dos_group_member_identities_method_check check (length(btrim(verification_method)) > 0),
  constraint dos_group_member_identities_verified_check check (
    status <> 'verified'
    or verified_at is not null
  )
);

create unique index if not exists dos_group_member_identities_group_person_unique
  on public.dos_group_member_identities(group_id, person_id);

create unique index if not exists dos_group_member_identities_group_member_unique
  on public.dos_group_member_identities(group_member_id);

create unique index if not exists dos_group_member_identities_active_email_unique
  on public.dos_group_member_identities(group_id, lower(verified_email))
  where verified_email is not null
    and status in ('invited', 'verified');

create unique index if not exists dos_group_member_identities_active_phone_unique
  on public.dos_group_member_identities(group_id, verified_phone)
  where verified_phone is not null
    and status in ('invited', 'verified');

create index if not exists dos_group_member_identities_auth_user_idx
  on public.dos_group_member_identities(auth_user_id, status)
  where auth_user_id is not null;

create table if not exists public.dos_group_member_access_tokens (
  id uuid primary key default gen_random_uuid(),
  member_identity_id uuid not null references public.dos_group_member_identities(id) on delete cascade,
  group_id uuid not null references public.dos_groups(id) on delete cascade,
  token_hash text not null,
  purpose text not null default 'member_access',
  status text not null default 'active',
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_person_id uuid references public.missionary_field_people(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_group_member_access_tokens_hash_check check (length(token_hash) >= 64),
  constraint dos_group_member_access_tokens_purpose_check check (purpose in ('member_access')),
  constraint dos_group_member_access_tokens_status_check check (
    status in ('active', 'used', 'revoked', 'expired')
  )
);

create unique index if not exists dos_group_member_access_tokens_hash_unique
  on public.dos_group_member_access_tokens(token_hash);

create index if not exists dos_group_member_access_tokens_identity_status_idx
  on public.dos_group_member_access_tokens(member_identity_id, status, expires_at desc);

create table if not exists public.dos_group_member_sessions (
  id uuid primary key default gen_random_uuid(),
  member_identity_id uuid not null references public.dos_group_member_identities(id) on delete cascade,
  group_id uuid not null references public.dos_groups(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  session_token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_group_member_sessions_hash_check check (length(session_token_hash) >= 64)
);

create unique index if not exists dos_group_member_sessions_hash_unique
  on public.dos_group_member_sessions(session_token_hash);

create index if not exists dos_group_member_sessions_identity_active_idx
  on public.dos_group_member_sessions(member_identity_id, expires_at desc)
  where revoked_at is null;

create table if not exists public.dos_group_rsvps (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.dos_groups(id) on delete cascade,
  gathering_id uuid not null references public.dos_group_gatherings(id) on delete cascade,
  group_member_id uuid not null references public.dos_group_members(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  response text not null,
  note text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_group_rsvps_response_check check (response in ('going', 'not_going', 'maybe')),
  constraint dos_group_rsvps_status_check check (status in ('active', 'canceled'))
);

create unique index if not exists dos_group_rsvps_gathering_person_unique
  on public.dos_group_rsvps(gathering_id, person_id);

create index if not exists dos_group_rsvps_group_gathering_idx
  on public.dos_group_rsvps(group_id, gathering_id, response, updated_at desc);

create table if not exists public.dos_group_updates (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.dos_groups(id) on delete cascade,
  gathering_id uuid references public.dos_group_gatherings(id) on delete set null,
  title text not null,
  body text,
  visibility text not null default 'group_members',
  status text not null default 'draft',
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_person_id uuid references public.missionary_field_people(id) on delete set null,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_group_updates_title_check check (length(btrim(title)) > 0),
  constraint dos_group_updates_visibility_check check (
    visibility in ('public', 'group_members', 'leaders')
  ),
  constraint dos_group_updates_status_check check (
    status in ('draft', 'published', 'archived')
  )
);

create index if not exists dos_group_updates_public_idx
  on public.dos_group_updates(group_id, visibility, status, published_at desc)
  where status = 'published';

create table if not exists public.dos_group_member_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  member_identity_id uuid not null references public.dos_group_member_identities(id) on delete cascade,
  group_id uuid not null references public.dos_groups(id) on delete cascade,
  person_id uuid not null references public.missionary_field_people(id) on delete cascade,
  channel text not null,
  notification_type text not null,
  enabled boolean not null default true,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_group_member_notification_preferences_channel_check check (channel in ('email', 'sms')),
  constraint dos_group_member_notification_preferences_type_check check (
    notification_type in ('gathering_reminder', 'schedule_change', 'cancellation', 'announcement', 'prayer_update', 'rsvp_reminder', 'member_access')
  )
);

create unique index if not exists dos_group_member_notification_preferences_unique
  on public.dos_group_member_notification_preferences(member_identity_id, group_id, channel, notification_type);

create table if not exists public.dos_group_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.dos_groups(id) on delete cascade,
  member_identity_id uuid references public.dos_group_member_identities(id) on delete set null,
  person_id uuid references public.missionary_field_people(id) on delete set null,
  channel text not null,
  notification_type text not null,
  dedupe_key text not null,
  destination text,
  status text not null default 'queued',
  provider text,
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_group_notification_deliveries_channel_check check (channel in ('email', 'sms')),
  constraint dos_group_notification_deliveries_status_check check (
    status in ('queued', 'sent', 'skipped', 'failed')
  )
);

create unique index if not exists dos_group_notification_deliveries_dedupe_unique
  on public.dos_group_notification_deliveries(group_id, dedupe_key);

do $$
declare
  table_name text;
  trigger_name text;
  tables text[] := array[
    'dos_group_member_identities',
    'dos_group_member_access_tokens',
    'dos_group_member_sessions',
    'dos_group_rsvps',
    'dos_group_updates',
    'dos_group_member_notification_preferences',
    'dos_group_notification_deliveries'
  ];
begin
  foreach table_name in array tables loop
    trigger_name := 'set_' || table_name || '_updated_at';
    execute format('drop trigger if exists %I on public.%I', trigger_name, table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_dos_updated_at()',
      trigger_name,
      table_name
    );
  end loop;
end $$;

alter table public.public_sites enable row level security;
alter table public.dos_group_member_identities enable row level security;
alter table public.dos_group_member_access_tokens enable row level security;
alter table public.dos_group_member_sessions enable row level security;
alter table public.dos_group_rsvps enable row level security;
alter table public.dos_group_updates enable row level security;
alter table public.dos_group_member_notification_preferences enable row level security;
alter table public.dos_group_notification_deliveries enable row level security;

revoke all on table public.public_sites from anon;
revoke all on table public.public_sites from authenticated;
revoke all on table public.dos_group_member_identities from anon;
revoke all on table public.dos_group_member_identities from authenticated;
revoke all on table public.dos_group_member_access_tokens from anon;
revoke all on table public.dos_group_member_access_tokens from authenticated;
revoke all on table public.dos_group_member_sessions from anon;
revoke all on table public.dos_group_member_sessions from authenticated;
revoke all on table public.dos_group_rsvps from anon;
revoke all on table public.dos_group_rsvps from authenticated;
revoke all on table public.dos_group_updates from anon;
revoke all on table public.dos_group_updates from authenticated;
revoke all on table public.dos_group_member_notification_preferences from anon;
revoke all on table public.dos_group_member_notification_preferences from authenticated;
revoke all on table public.dos_group_notification_deliveries from anon;
revoke all on table public.dos_group_notification_deliveries from authenticated;

grant select on table public.public_sites to anon;
grant select on table public.public_sites to authenticated;
grant select, insert, update, delete on table public.public_sites to service_role;
grant select, insert, update, delete on table public.dos_group_member_identities to service_role;
grant select, insert, update, delete on table public.dos_group_member_access_tokens to service_role;
grant select, insert, update, delete on table public.dos_group_member_sessions to service_role;
grant select, insert, update, delete on table public.dos_group_rsvps to service_role;
grant select, insert, update, delete on table public.dos_group_updates to service_role;
grant select, insert, update, delete on table public.dos_group_member_notification_preferences to service_role;
grant select, insert, update, delete on table public.dos_group_notification_deliveries to service_role;

drop policy if exists "Public can read active public sites" on public.public_sites;
create policy "Public can read active public sites"
  on public.public_sites
  for select
  to anon, authenticated
  using (status = 'active');

do $$
declare
  usam_organization_id uuid;
  usam_public_site_id uuid;
begin
  select id
  into usam_organization_id
  from public.organizations
  where slug = 'usa-missionaries'
  limit 1;

  if usam_organization_id is not null then
    insert into public.public_sites (
      organization_id,
      hostname,
      base_path,
      display_name,
      logo_url,
      brand,
      status,
      is_default
    )
    values (
      usam_organization_id,
      'usamissionaries.org',
      '/groups',
      'USA Missionaries',
      '/brand/logo/usam-website-logo.png',
      '{"primaryColor":"#C2A14E","surfaceColor":"#0B0D10","templateBranding":"usam"}'::jsonb,
      'active',
      true
    )
    on conflict do nothing;

    select id
    into usam_public_site_id
    from public.public_sites
    where lower(hostname) = 'usamissionaries.org'
      and base_path = '/groups'
    limit 1;

    update public.public_sites
    set organization_id = usam_organization_id,
        display_name = 'USA Missionaries',
        logo_url = '/brand/logo/usam-website-logo.png',
        brand = coalesce(brand, '{}'::jsonb) || '{"primaryColor":"#C2A14E","surfaceColor":"#0B0D10","templateBranding":"usam"}'::jsonb,
        status = 'active',
        is_default = true,
        updated_at = now()
    where id = usam_public_site_id;

    update public.dos_groups
    set organization_id = coalesce(organization_id, usam_organization_id),
        public_site_id = coalesce(public_site_id, usam_public_site_id),
        public_status = case
          when public_status = 'draft' and active is not false then 'published'
          else public_status
        end,
        member_access_enabled = true,
        updated_at = now()
    where active is not false
      and (
        organization_id = usam_organization_id
        or organization_id is null
      )
      and public_site_id is null;
  end if;
end $$;

comment on table public.public_sites is
  'Public presentation layer for DOS-owned groups. A public site belongs to an organization today and can later belong to a personal ministry entity without changing group history.';

comment on column public.public_sites.base_path is
  'Route prefix for this public site, such as /groups. Full URLs are resolved from hostname, base_path, and group slug rather than stored as group identity.';

comment on column public.dos_groups.public_site_id is
  'Public site where this group is published. Slugs are unique per public site, not globally.';

comment on column public.dos_groups.public_status is
  'Publishing state for public group pages. Existing active USA Missionaries groups are backfilled as published to preserve /groups URLs.';

comment on column public.dos_groups.member_visible_location_mode is
  'Controls how much location detail lightweight members may see: hidden, general, or exact. Public visitors never receive more than public-safe location text.';

comment on table public.dos_group_member_identities is
  'Lightweight group-member identity bridge. It links an active group membership to verified contact evidence without granting a DOS workspace.';

comment on table public.dos_group_member_access_tokens is
  'Hashed, expiring, scoped member-access invitation tokens. Plain tokens are never stored.';

comment on table public.dos_group_member_sessions is
  'Hashed member portal sessions. Access is valid only while the identity and group membership remain active.';

comment on table public.dos_group_rsvps is
  'Member RSVP records for DOS group gatherings. RSVP does not count as leader-confirmed attendance.';

comment on table public.dos_group_updates is
  'Concise group updates for public, member-visible, or leader-only audiences. This is not a social feed.';

comment on table public.dos_group_member_notification_preferences is
  'Per-member group notification consent/preferences separated from donor, newsletter, or marketing communication.';

comment on table public.dos_group_notification_deliveries is
  'Narrow group notification delivery audit with dedupe keys to prevent duplicate sends.';

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
