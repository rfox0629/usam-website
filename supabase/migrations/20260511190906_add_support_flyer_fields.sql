alter table public.missionary_support_settings
  add column if not exists flyer_headline text,
  add column if not exists flyer_support_appeal text,
  add column if not exists flyer_prayer_ask text,
  add column if not exists flyer_note text;

comment on column public.missionary_support_settings.flyer_headline is
  'Optional missionary-edited headline for the public support flyer.';
comment on column public.missionary_support_settings.flyer_support_appeal is
  'Optional missionary-edited support appeal copy for the public support flyer.';
comment on column public.missionary_support_settings.flyer_prayer_ask is
  'Optional missionary-edited prayer/support ask for the public support flyer.';
comment on column public.missionary_support_settings.flyer_note is
  'Optional missionary-edited note for the public support flyer.';
