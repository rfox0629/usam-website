comment on column public.usam_missionary_applications.workspace_id is
  'DOS workspace that owns this USA Missionaries application. Existing users should attach here instead of creating duplicate workspace/profile rows.';

comment on column public.usam_missionary_applications.missionary_profile_id is
  'Existing missionary_households row used for the USA Missionaries public profile/fundraising layer. Prefer linking to the current DOS workspace household before creating any new profile record.';

do $$
declare
  existing_application_id uuid;
  fox_household_id uuid;
  linked_application_status text;
  linked_profile_status text;
  linked_reviewed_at timestamptz;
  linked_submitted_at timestamptz;
  usam_organization_id uuid;
begin
  if to_regclass('public.missionary_households') is null
    or to_regclass('public.organizations') is null
    or to_regclass('public.usam_missionary_applications') is null then
    return;
  end if;

  insert into public.organizations (name, slug, type, branding_mode)
  values ('USA Missionaries', 'usa-missionaries', 'ministry', 'usam')
  on conflict (slug) do update
    set branding_mode = 'usam',
        name = excluded.name,
        type = excluded.type,
        updated_at = now()
  returning id into usam_organization_id;

  select id
  into fox_household_id
  from public.missionary_households
  where slug = 'ryan-brooke-fox'
  limit 1;

  if fox_household_id is null then
    return;
  end if;

  select
    case
      when coalesce(public_visible, false) = true and coalesce(show_household, true) <> false then 'active'
      when usam_application_status in ('approved', 'pending_review', 'application_submitted', 'application_started') then usam_application_status
      else 'approved'
    end,
    case
      when coalesce(public_visible, false) = true and coalesce(show_household, true) <> false then 'published'
      when usam_profile_status in ('approved', 'archived', 'draft', 'hidden', 'published', 'under_review') then usam_profile_status
      else 'draft'
    end,
    coalesce(usam_application_submitted_at, now()),
    case
      when coalesce(public_visible, false) = true and coalesce(show_household, true) <> false then coalesce(usam_application_reviewed_at, now())
      else usam_application_reviewed_at
    end
  into linked_application_status,
       linked_profile_status,
       linked_submitted_at,
       linked_reviewed_at
  from public.missionary_households
  where id = fox_household_id;

  select id
  into existing_application_id
  from public.usam_missionary_applications
  where workspace_id = fox_household_id
    and coalesce(organization_id, usam_organization_id) = usam_organization_id
    and status not in ('rejected', 'archived')
  order by created_at desc
  limit 1;

  if existing_application_id is null then
    insert into public.usam_missionary_applications (
      applicant_name,
      calling_focus,
      contact_payload,
      location,
      missionary_profile_id,
      organization_id,
      prayer_needs,
      profile_photo_url,
      reviewed_at,
      status,
      story_testimony,
      submitted_at,
      workspace_id
    )
    select
      coalesce(nullif(btrim(display_name), ''), 'Ryan + Brooke Fox'),
      nullif(btrim(short_mission), ''),
      '{}'::jsonb,
      nullif(btrim(location), ''),
      id,
      usam_organization_id,
      nullif(btrim(support_explanation), ''),
      nullif(btrim(profile_image_url), ''),
      linked_reviewed_at,
      linked_application_status,
      nullif(btrim(coalesce(original_story, public_story, story)), ''),
      linked_submitted_at,
      id
    from public.missionary_households
    where id = fox_household_id
    returning id into existing_application_id;
  else
    update public.usam_missionary_applications
    set calling_focus = coalesce(nullif(btrim(calling_focus), ''), nullif(btrim(h.short_mission), '')),
        location = coalesce(nullif(btrim(usam_missionary_applications.location), ''), nullif(btrim(h.location), '')),
        missionary_profile_id = fox_household_id,
        organization_id = usam_organization_id,
        prayer_needs = coalesce(nullif(btrim(prayer_needs), ''), nullif(btrim(h.support_explanation), '')),
        profile_photo_url = coalesce(nullif(btrim(usam_missionary_applications.profile_photo_url), ''), nullif(btrim(h.profile_image_url), '')),
        reviewed_at = coalesce(usam_missionary_applications.reviewed_at, linked_reviewed_at),
        status = case
          when usam_missionary_applications.status in ('rejected', 'archived') then linked_application_status
          else usam_missionary_applications.status
        end,
        story_testimony = coalesce(nullif(btrim(story_testimony), ''), nullif(btrim(coalesce(h.original_story, h.public_story, h.story)), '')),
        submitted_at = coalesce(usam_missionary_applications.submitted_at, linked_submitted_at),
        updated_at = now()
    from public.missionary_households h
    where usam_missionary_applications.id = existing_application_id
      and h.id = fox_household_id;
  end if;

  update public.missionary_households
  set usam_application_id = existing_application_id,
      usam_application_status = linked_application_status,
      usam_application_submitted_at = linked_submitted_at,
      usam_application_reviewed_at = linked_reviewed_at,
      usam_profile_status = linked_profile_status,
      updated_at = now()
  where id = fox_household_id;
end $$;
