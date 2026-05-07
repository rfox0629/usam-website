create index if not exists collective_memberships_profile_idx
  on public.collective_memberships(profile_id);

create index if not exists discipleship_relationships_owner_idx
  on public.discipleship_relationships(owner_organization_id);

create index if not exists meeting_ministers_collective_idx
  on public.meeting_ministers(collective_id);

create index if not exists meetings_primary_collective_idx
  on public.meetings(primary_collective_id);

create index if not exists network_memberships_profile_idx
  on public.network_memberships(profile_id);

create index if not exists organization_memberships_profile_idx
  on public.organization_memberships(profile_id);

create index if not exists product_feedback_collective_idx
  on public.product_feedback(collective_id);

create index if not exists product_feedback_submitted_by_profile_idx
  on public.product_feedback(submitted_by_profile_id);

create index if not exists visibility_rules_affiliate_idx
  on public.visibility_rules(affiliate_organization_id);

create index if not exists visibility_rules_collective_idx
  on public.visibility_rules(collective_id);

create index if not exists visibility_rules_profile_idx
  on public.visibility_rules(profile_id);

do $$
declare
  dos_table_name text;
  dos_tables text[] := array[
    'organizations',
    'networks',
    'collectives',
    'profiles',
    'people',
    'organization_memberships',
    'network_memberships',
    'collective_memberships',
    'discipleship_relationships',
    'meetings',
    'meeting_ministers',
    'meeting_people',
    'visibility_rules',
    'product_feedback'
  ];
begin
  foreach dos_table_name in array dos_tables loop
    execute format('drop policy if exists "DOS editors can write" on public.%I', dos_table_name);
    execute format('drop policy if exists "DOS editors can insert" on public.%I', dos_table_name);
    execute format('drop policy if exists "DOS editors can update" on public.%I', dos_table_name);
    execute format('drop policy if exists "DOS editors can delete" on public.%I', dos_table_name);

    execute format(
      'create policy "DOS editors can insert" on public.%I for insert to authenticated with check (public.is_dos_admin(array[''admin'', ''editor'']))',
      dos_table_name
    );

    execute format(
      'create policy "DOS editors can update" on public.%I for update to authenticated using (public.is_dos_admin(array[''admin'', ''editor''])) with check (public.is_dos_admin(array[''admin'', ''editor'']))',
      dos_table_name
    );

    execute format(
      'create policy "DOS editors can delete" on public.%I for delete to authenticated using (public.is_dos_admin(array[''admin'', ''editor'']))',
      dos_table_name
    );
  end loop;
end $$;
