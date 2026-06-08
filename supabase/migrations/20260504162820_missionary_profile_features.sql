alter table public.missionary_households
  add column if not exists show_household boolean not null default true,
  add column if not exists show_story boolean not null default true,
  add column if not exists show_fruit boolean not null default true,
  add column if not exists show_support boolean not null default true,
  add column if not exists show_prayer boolean not null default true,
  add column if not exists fruit_from_field text,
  add column if not exists support_mode text not null default 'household',
  add column if not exists support_target_household_id uuid references public.missionary_households(id) on delete set null,
  add column if not exists support_target_fund text,
  add column if not exists support_public_label text,
  add column if not exists support_button_label text,
  add column if not exists support_explanation text,
  add column if not exists prayer_cta_label text,
  add column if not exists prayer_destination text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'missionary_households_support_mode_check'
      and conrelid = 'public.missionary_households'::regclass
  ) then
    alter table public.missionary_households
      add constraint missionary_households_support_mode_check
      check (
        support_mode in (
          'household',
          'general_fund',
          'state_leader',
          'regional_leader',
          'national_leadership',
          'household_nomination',
          'hidden'
        )
      );
  end if;
end $$;

create index if not exists missionary_households_support_target_idx
  on public.missionary_households(support_target_household_id);

update public.missionary_households
set show_support = true
where show_support is distinct from true
  and exists (
    select 1
    from public.missionary_support_settings
    where missionary_support_settings.household_id = missionary_households.id
      and missionary_support_settings.show_support = true
  );
