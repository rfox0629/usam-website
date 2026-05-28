alter table public.missionary_field_people
  add column if not exists relationship_context text not null default 'other',
  add column if not exists role_in_my_life text not null default 'not_active',
  add column if not exists discipleship_stage text not null default 'not_started';

update public.missionary_field_people
set relationship_context = case
    when lower(coalesce(relationship_type, '')) like '%family%' then 'family'
    when lower(coalesce(relationship_type, '')) similar to '%(work|coworker|co-worker|job|marketplace)%' then 'work'
    when lower(coalesce(relationship_type, '')) similar to '%(church|ministry|small group)%' then 'church'
    when lower(coalesce(relationship_type, '')) like '%friend%' then 'friend'
    when lower(coalesce(relationship_type, '')) similar to '%(outreach|new contact|evangelism)%' then 'outreach'
    when lower(coalesce(relationship_type, '')) similar to '%(community|neighbor|neighbour)%' then 'community'
    else relationship_context
  end,
  role_in_my_life = case
    when lower(coalesce(relationship_type, '')) like '%mentor%' then 'mentoring_me'
    when lower(coalesce(relationship_type, '')) similar to '%(discipling them|i am discipling|disciple)%' then 'discipling_them'
    when lower(coalesce(relationship_type, '')) similar to '%(walking|walk with)%' then 'walking_with_them'
    when lower(coalesce(relationship_type, '')) similar to '%(peer|co-labor|collaborator|co labor)%' then 'peer_encouragement'
    when lower(coalesce(status, '')) in ('active', 'follow_up', 'discipleship') then 'walking_with_them'
    else role_in_my_life
  end,
  discipleship_stage = case
    when lower(coalesce(relationship_type, '')) similar to '%(disciple maker|disciple_maker|multiplying|started discipling others)%' then 'disciple_maker'
    when lower(coalesce(relationship_type, '')) similar to '%(discipling|discipleship|disciple)%'
      or lower(coalesce(status, '')) = 'discipleship' then 'discipling'
    when lower(coalesce(relationship_type, '')) similar to '%(walking with|walking_with|growing)%'
      or lower(coalesce(status, '')) in ('active', 'follow_up') then 'walking_with'
    when lower(coalesce(relationship_type, '')) similar to '%(exploring|curious|open)%'
      or lower(coalesce(engagement_level, '')) similar to '%(exploring|curious|open)%' then 'exploring'
    when lower(coalesce(relationship_type, '')) similar to '%(new|not started|not_started)%'
      or lower(coalesce(status, '')) = 'new' then 'not_started'
    else discipleship_stage
  end;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'missionary_field_people_relationship_context_check'
      and conrelid = 'public.missionary_field_people'::regclass
  ) then
    alter table public.missionary_field_people
      drop constraint missionary_field_people_relationship_context_check;
  end if;

  alter table public.missionary_field_people
    add constraint missionary_field_people_relationship_context_check
    check (relationship_context in ('family', 'work', 'church', 'friend', 'outreach', 'community', 'other'));

  if exists (
    select 1
    from pg_constraint
    where conname = 'missionary_field_people_role_in_my_life_check'
      and conrelid = 'public.missionary_field_people'::regclass
  ) then
    alter table public.missionary_field_people
      drop constraint missionary_field_people_role_in_my_life_check;
  end if;

  alter table public.missionary_field_people
    add constraint missionary_field_people_role_in_my_life_check
    check (role_in_my_life in ('discipling_them', 'walking_with_them', 'mentoring_me', 'peer_encouragement', 'not_active'));

  if exists (
    select 1
    from pg_constraint
    where conname = 'missionary_field_people_discipleship_stage_check'
      and conrelid = 'public.missionary_field_people'::regclass
  ) then
    alter table public.missionary_field_people
      drop constraint missionary_field_people_discipleship_stage_check;
  end if;

  alter table public.missionary_field_people
    add constraint missionary_field_people_discipleship_stage_check
    check (discipleship_stage in ('not_started', 'exploring', 'walking_with', 'discipling', 'disciple_maker'));
end $$;

comment on column public.missionary_field_people.relationship_context is
  'DOS relationship stewardship context: where this relationship exists.';

comment on column public.missionary_field_people.role_in_my_life is
  'DOS relationship stewardship role: how this person relates to the missionary right now.';

comment on column public.missionary_field_people.discipleship_stage is
  'DOS discipleship movement stage for this person.';
