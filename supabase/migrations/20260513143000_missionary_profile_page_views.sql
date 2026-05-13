create table if not exists public.missionary_profile_page_views (
  id uuid primary key default gen_random_uuid(),
  missionary_profile_id uuid not null references public.missionary_households(id) on delete cascade,
  page_path text not null,
  visitor_fingerprint text,
  session_fingerprint text,
  referrer text,
  user_agent text,
  device_type text not null default 'unknown',
  created_at timestamptz not null default now()
);

alter table public.missionary_profile_page_views
  add column if not exists missionary_profile_id uuid references public.missionary_households(id) on delete cascade,
  add column if not exists page_path text,
  add column if not exists visitor_fingerprint text,
  add column if not exists session_fingerprint text,
  add column if not exists referrer text,
  add column if not exists user_agent text,
  add column if not exists device_type text not null default 'unknown',
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  alter table public.missionary_profile_page_views
    add constraint missionary_profile_page_views_device_type_check
    check (device_type in ('desktop', 'mobile', 'tablet', 'bot', 'unknown'));
exception
  when duplicate_object then null;
end $$;

create index if not exists missionary_profile_page_views_profile_created_idx
  on public.missionary_profile_page_views (missionary_profile_id, created_at desc);

create index if not exists missionary_profile_page_views_profile_visitor_idx
  on public.missionary_profile_page_views (missionary_profile_id, visitor_fingerprint);

create index if not exists missionary_profile_page_views_created_idx
  on public.missionary_profile_page_views (created_at desc);

alter table public.missionary_profile_page_views enable row level security;

revoke all on table public.missionary_profile_page_views from anon, authenticated;
grant all on table public.missionary_profile_page_views to service_role;

create or replace view public.missionary_profile_view_rollups
with (security_invoker = true)
as
select
  missionary_profile_id,
  count(*)::integer as total_views,
  count(distinct visitor_fingerprint)::integer as unique_visitors,
  count(*) filter (where created_at >= now() - interval '7 days')::integer as last_7_days,
  count(distinct visitor_fingerprint) filter (where created_at >= now() - interval '7 days')::integer as last_7_unique_visitors,
  count(*) filter (where created_at >= now() - interval '30 days')::integer as last_30_days,
  count(distinct visitor_fingerprint) filter (where created_at >= now() - interval '30 days')::integer as last_30_unique_visitors
from public.missionary_profile_page_views
group by missionary_profile_id;

revoke all on table public.missionary_profile_view_rollups from anon, authenticated;
grant select on table public.missionary_profile_view_rollups to service_role;

comment on table public.missionary_profile_page_views is
  'Privacy-conscious public missionary profile visit analytics. Visitor/session identifiers are hashed before insert.';

comment on view public.missionary_profile_view_rollups is
  'Service-role profile analytics rollup for Missionary Workspace dashboard metrics.';
