alter table public.missionary_team_members
  add column if not exists invite_email text,
  add column if not exists invite_phone text,
  add column if not exists invite_phone_normalized text,
  add column if not exists account_linked_at timestamptz,
  add column if not exists relationship_to_workspace text;

do $$
begin
  alter table public.missionary_team_members
    drop constraint if exists missionary_team_members_status_check;

  alter table public.missionary_team_members
    add constraint missionary_team_members_status_check
    check (status in ('pending', 'active', 'declined', 'inactive', 'hidden', 'archived'));

  alter table public.missionary_team_members
    drop constraint if exists missionary_team_members_relationship_to_workspace_check;

  alter table public.missionary_team_members
    add constraint missionary_team_members_relationship_to_workspace_check
    check (
      relationship_to_workspace is null
      or relationship_to_workspace in ('owner', 'spouse', 'household_member', 'child', 'other')
    );
end $$;

update public.missionary_team_members
set invite_email = lower(nullif(btrim(dos_user_id), ''))
where invite_email is null
  and dos_user_id is not null
  and dos_user_id like '%@%';

update public.missionary_team_members
set invite_phone_normalized = nullif(regexp_replace(invite_phone, '\D', '', 'g'), '')
where invite_phone is not null
  and invite_phone_normalized is null;

create index if not exists missionary_team_members_invite_email_idx
  on public.missionary_team_members(lower(invite_email))
  where invite_email is not null;

create index if not exists missionary_team_members_invite_phone_normalized_idx
  on public.missionary_team_members(invite_phone_normalized)
  where invite_phone_normalized is not null;

create index if not exists missionary_team_members_household_relationship_idx
  on public.missionary_team_members(household_id, relationship_to_workspace, status);

comment on column public.missionary_team_members.invite_email is
  'Private DOS household invitation email used to link a future user account to an existing workspace member placeholder.';

comment on column public.missionary_team_members.invite_phone is
  'Private DOS household invitation phone used only for workspace member placeholder matching.';

comment on column public.missionary_team_members.account_linked_at is
  'When a pending DOS household placeholder was linked to a signed-in user identity.';

comment on column public.missionary_team_members.relationship_to_workspace is
  'Private DOS workspace household role. This is not the missionary_field_people relationship model.';
