alter table public.missionary_support_settings
  add column if not exists enable_monthly_partnership boolean not null default true,
  add column if not exists enable_one_time_gift boolean not null default true,
  add column if not exists monthly_support_description text,
  add column if not exists one_time_support_description text;

update public.missionary_support_settings
set
  monthly_button_label = 'Support Monthly',
  one_time_button_label = 'Give One Time',
  major_gift_button_label = 'Contact About Major Gift'
where true;

comment on column public.missionary_support_settings.enable_monthly_partnership is
  'Controls whether the public profile shows the standardized Support Monthly flow.';

comment on column public.missionary_support_settings.enable_one_time_gift is
  'Controls whether the public profile shows the standardized Give One Time flow.';

comment on column public.missionary_support_settings.monthly_support_description is
  'Optional short public copy for the monthly partnership support flow.';

comment on column public.missionary_support_settings.one_time_support_description is
  'Optional short public copy for the one-time gift support flow.';
