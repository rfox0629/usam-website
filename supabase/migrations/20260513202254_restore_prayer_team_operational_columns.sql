alter table public.prayer_partners
  add column if not exists church_affiliation text,
  add column if not exists availability text[];

alter table public.prayer_requests
  add column if not exists related_state text,
  add column if not exists related_region text;

update public.prayer_partners
set status = 'active'
where source = 'public_profile'
  and status = 'pending';

comment on column public.prayer_partners.church_affiliation is
  'Optional prayer partner church or ministry affiliation used by National Command Center prayer operations.';

comment on column public.prayer_partners.availability is
  'Optional availability windows selected by prayer partners or admins.';

comment on column public.prayer_requests.related_state is
  'Optional state label for prayer coverage and National Command Center filtering.';

comment on column public.prayer_requests.related_region is
  'Optional region label for prayer coverage and National Command Center filtering.';
