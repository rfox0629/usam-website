alter table public.missionary_tables
  add column if not exists table_role text not null default 'ministering',
  add column if not exists growth_what_god_taught text,
  add column if not exists growth_scriptures text,
  add column if not exists growth_action_step text,
  add column if not exists growth_mentor_assignment text,
  add column if not exists growth_follow_up_needed boolean not null default false,
  add column if not exists planning_decisions text,
  add column if not exists planning_action_items text,
  add column if not exists planning_follow_up text;

update public.missionary_tables
set table_role = 'ministering'
where table_role is null
  or table_role not in ('ministering', 'being_mentored', 'mutual_discipleship', 'leadership_planning');

update public.missionary_tables
set growth_follow_up_needed = false
where growth_follow_up_needed is null;

alter table public.missionary_tables
  alter column table_role set default 'ministering',
  alter column table_role set not null,
  alter column growth_follow_up_needed set default false,
  alter column growth_follow_up_needed set not null,
  drop constraint if exists missionary_tables_table_role_check,
  add constraint missionary_tables_table_role_check
    check (table_role in ('ministering', 'being_mentored', 'mutual_discipleship', 'leadership_planning'));

create index if not exists missionary_tables_workspace_role_date_idx
  on public.missionary_tables(workspace_id, table_role, table_date desc, created_at desc);

alter table public.missionary_field_people
  add column if not exists discipleship_relationship text;

alter table public.missionary_field_people
  drop constraint if exists missionary_field_people_discipleship_relationship_check,
  add constraint missionary_field_people_discipleship_relationship_check
    check (
      discipleship_relationship is null
      or discipleship_relationship in ('mentor', 'mentee', 'peer', 'pastor', 'coach', 'spiritual_parent', 'family', 'friend', 'other')
    );

comment on column public.missionary_tables.table_role is
  'DOS table role: whether the missionary was ministering, being mentored, mutually discipling, or doing leadership planning.';

comment on column public.missionary_tables.growth_what_god_taught is
  'Private growth reflection for tables where the missionary received discipleship.';

comment on column public.missionary_tables.growth_scriptures is
  'Optional Scriptures discussed during received or mutual discipleship.';

comment on column public.missionary_tables.growth_action_step is
  'Private action step from received or mutual discipleship.';

comment on column public.missionary_tables.growth_mentor_assignment is
  'Optional mentor assignment from received or mutual discipleship.';

comment on column public.missionary_tables.growth_follow_up_needed is
  'Whether the received-growth reflection needs follow-up.';

comment on column public.missionary_tables.planning_decisions is
  'Private leadership planning decisions from this table.';

comment on column public.missionary_tables.planning_action_items is
  'Private leadership planning action items from this table.';

comment on column public.missionary_tables.planning_follow_up is
  'Private leadership planning follow-up notes from this table.';

comment on column public.missionary_field_people.discipleship_relationship is
  'Optional DOS context label for the discipleship relationship. This does not affect permissions, scoring, or reporting.';
