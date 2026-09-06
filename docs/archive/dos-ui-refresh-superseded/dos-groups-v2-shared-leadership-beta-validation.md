# DOS Groups V2 Shared Leadership Beta Validation

Status: Not executed.

Do not mark this validation as passed until it has been run with two separate authenticated DOS accounts in a preview or production-equivalent environment after the migrations are applied.

## Preconditions

- Apply, in order, to the target beta database:
  - `20260712235050_dos_groups_simplification_shared_leadership.sql`
  - `20260713022111_dos_identity_shared_leadership.sql`
- Ryan is enabled through `dos_workspace_feature_flags.flag_key = 'dos_groups_simplified_v2'`.
- Dirk remains disabled until the Ryan/Brandon flow is verified.
- Brandon exists as a Field person in Ryan's workspace with unique verified contact evidence, or an admin verifies the `dos_identity_links` row manually.
- Use two separate authenticated accounts:
  - Ryan
  - Brandon

## Validation Sequence

1. Ryan sees existing group.
2. Brandon cannot see it initially.
3. Ryan assigns Brandon as co-leader.
4. Brandon's authenticated account links through verified identity.
5. Brandon now sees the shared group.
6. Brandon cannot access Ryan's unrelated workspace.
7. Brandon starts a gathering while Ryan is absent.
8. Brandon records attendance.
9. Brandon records shared prayer.
10. Ryan sees the shared gathering.
11. Ryan receives no personal meeting credit.
12. Brandon receives leadership/time credit.
13. Organization receives one gathering.
14. Participant receives one attendance event.
15. Ryan creates a private note.
16. Brandon cannot view it.
17. Brandon creates a private note.
18. Ryan cannot view it.
19. Ryan removes Brandon as co-leader.
20. Brandon immediately loses access.
21. Existing public URLs remain unchanged.
22. Dirk legacy behavior remains unchanged.

## Evidence To Capture

- Screenshots for Ryan before/after assigning Brandon.
- Screenshots for Brandon before assignment, after assignment, and after removal.
- Network responses for forbidden private surfaces.
- Database row counts for one gathering and one attendance event.
- Metric attribution showing Brandon leadership/time credit and no Ryan personal meeting credit for the gathering Ryan missed.
- Console log showing no client errors during desktop and mobile smoke.

## Pass Criteria

- Shared group objects are visible to verified active leaders according to role.
- Private workspace data remains hidden from shared group collaborators.
- Removed memberships revoke access without delay.
- Public group pages and public directory do not expose internal records.
- Dirk remains on legacy Groups until explicitly enabled by the rollout flag.
