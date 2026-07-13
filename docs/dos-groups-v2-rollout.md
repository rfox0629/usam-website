# DOS Groups V2 Rollout

Groups V2 is controlled by the workspace feature flag:

`dos_groups_simplified_v2`

The implementation is shared for every DOS workspace. There is no Ryan-specific or Dirk-specific Groups product path. The initial migration enables the flag only for Ryan's workspace so the new schema, authorization, templates, and workflows can be validated against live data before expanding the beta.

## Initial State

- Ryan workspace (`ryan-fox`, public alias `fox-family`): enabled by the migration for validation.
- Dirk workspace (`dirk-bond`, public alias `bond-family`): legacy Groups remains active.
- Other workspaces: legacy Groups remains active.

## Enable Dirk For Beta

After Ryan validation passes, enable Dirk with the same feature flag. This is a configuration change, not a code change:

```sql
insert into public.dos_workspace_feature_flags (
  workspace_id,
  flag_key,
  enabled,
  metadata
)
select
  missionary_households.id,
  'dos_groups_simplified_v2',
  true,
  '{"rollout_stage":"dirk_beta","enabled_for":"dirk_validation","legacy_preserved":true}'::jsonb
from public.missionary_households
where missionary_households.slug = 'dirk-bond'
   or missionary_households.public_slug = 'bond-family'
on conflict (workspace_id, flag_key) do update
  set enabled = excluded.enabled,
      metadata = public.dos_workspace_feature_flags.metadata || excluded.metadata,
      updated_at = now();
```

## Roll Back A Workspace

```sql
update public.dos_workspace_feature_flags
set enabled = false,
    metadata = metadata || '{"rollback_reason":"manual_beta_rollback"}'::jsonb,
    updated_at = now()
where flag_key = 'dos_groups_simplified_v2'
  and workspace_id = (
    select id
    from public.missionary_households
    where slug = 'dirk-bond'
       or public_slug = 'bond-family'
    limit 1
  );
```

## Standard Rollout

After Ryan and Dirk validation, Groups V2 should become the standard eligible DOS experience. At that point, use a broad `dos_workspace_feature_flags` backfill or an organization-level default, while retaining per-workspace disable/rollback rows.

Do not create separate Ryan and Dirk Groups components, APIs, or schemas.
