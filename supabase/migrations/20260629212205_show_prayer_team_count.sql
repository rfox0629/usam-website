alter table public.missionary_households
  add column if not exists show_prayer_team_count boolean not null default true;

comment on column public.missionary_households.show_prayer_team_count is
  'Controls whether the public missionary profile shows the prayer team partner count. Partner names are never public.';
