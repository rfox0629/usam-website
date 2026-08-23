# USA-100 Supabase Migration History Reconciliation

**Date:** 2026-07-30
**Scope:** Read-only investigation for `rfox0629/usam-website` migration-history drift against Supabase project `usam-website` (`dbupuphezeqkiolprrlg`).

No migration was run. No SQL was executed. No `supabase db repair`, reset, rollback, push, pull, or history rewrite was performed. No production schema or data was changed.

## Evidence Sources

| Source | Evidence | Notes |
|---|---|---|
| Supabase MCP `list_projects` | `dbupuphezeqkiolprrlg` is `usam-website`, status `ACTIVE_HEALTHY` | Read-only metadata lookup. |
| Supabase MCP `list_migrations` | 70 applied remote migrations | Read-only migration-history lookup. |
| `backup/supabase-link/supabase/.temp/project-ref` | `dbupuphezeqkiolprrlg` | Saved local link matches the active project. |
| `../usam-website` local ref `origin/main` | commit `3b79b1a`, 125 migration files | Read via `git ls-tree`; the checked-out `main` is behind by 3 commits, but those commits do not change `supabase/migrations`. |

## Finding

The failure is real migration-history drift, not a simple branch freshness problem.

- Local canonical migration files on `origin/main`: **125**
- Applied remote migrations in Supabase `dbupuphezeqkiolprrlg`: **70**
- Exact local/remote matches by version and name: **41**
- Same migration name with different local and remote timestamp versions: **24**
- Remote-only migration names with no local file: **5**
- Local-only migration names not present in remote history: **60**

Supabase migration checks compare version identifiers, not just names. Because 29 remote versions are not present locally and 84 local versions are not present remotely, `supabase migration list`/CI correctly reports remote versions missing from the local migration directory.

## Drift Details

### Same Name, Different Version

These migrations appear to be the same logical migration by name, but Supabase records a different applied version than the local file.

| Migration name | Local version | Remote version |
|---|---:|---:|
| `missionary_profiles_foundation` | 20260501164602 | 20260501185143 |
| `create_admin_users_allowlist` | 20260501201146 | 20260501203837 |
| `create_financial_freedom_inquiries` | 20260501202545 | 20260501203857 |
| `optimize_admin_rls_policies` | 20260501203951 | 20260501204036 |
| `optimize_admin_rls_jwt_select` | 20260501204109 | 20260501204151 |
| `add_financial_freedom_consent_fields` | 20260501214201 | 20260501214245 |
| `harden_financial_freedom_updated_at_function` | 20260501214715 | 20260501214744 |
| `create_financial_freedom_uploads` | 20260501215702 | 20260501215741 |
| `dos_relationship_insights` | 20260507141016 | 20260507191335 |
| `dos_lightweight_meeting_logging` | 20260507202645 | 20260507203700 |
| `dos_meeting_outcome_markers` | 20260507211938 | 20260507212003 |
| `dos_discussion_guides_manual_movement` | 20260508123130 | 20260508123452 |
| `add_support_flyer_fields` | 20260511190906 | 20260512000859 |
| `giving_reconciliation_foundation` | 20260512073507 | 20260512124235 |
| `command_center_workspace_ids` | 20260507021718 | 20260513150034 |
| `dos_meetings_discipleship_engine` | 20260513162212 | 20260513163252 |
| `restore_prayer_team_signup_tables` | 20260513201000 | 20260513200806 |
| `prayer_team_signup_advisor_cleanup` | 20260513202000 | 20260513200945 |
| `dos_quick_reviews` | 20260513190000 | 20260513202001 |
| `restore_prayer_team_operational_columns` | 20260513212000 | 20260513202254 |
| `add_dos_quick_review_fk_indexes` | 20260513202819 | 20260513202838 |
| `add_quick_review_fruit_moderation_statuses` | 20260513203424 | 20260513204317 |
| `prayer_partner_application_lifecycle` | 20260513224500 | 20260513204740 |
| `dos_circle_relationship_intelligence` | 20260526121446 | 20260531200145 |

### Remote-Only Migration Names

These applied remote migrations have no same-name local migration file on `origin/main`.

| Remote version | Remote migration name | Risk |
|---|---|---|
| 20260511235105 | `create_support_commitments_for_donor_intake` | Medium: likely overlaps local support-commitment migration history, but provenance must be proven before adding a placeholder or renaming history. |
| 20260512122826 | `restore_form_submissions_inbox` | Medium: likely represents an applied repair or generated migration absent from local history. |
| 20260514170223 | `build_financial_intake_system` | Medium: likely applied manually or from a branch that never landed. |
| 20260514190043 | `create_aligned_insights_inquiries` | High: places Aligned Insights history inside the USAM production database; ownership and tenancy impact must be reviewed. |
| 20260728035152 | `communications_resend_subscribers` | High: recent applied migration absent from canonical local migrations; local inventory references uncommitted USA-47 migrations. |

### Remote-Only Versions

These remote versions are not present as local migration versions. The list includes both same-name timestamp mismatches and remote-only names.

```text
20260501185143_missionary_profiles_foundation.sql
20260501203837_create_admin_users_allowlist.sql
20260501203857_create_financial_freedom_inquiries.sql
20260501204036_optimize_admin_rls_policies.sql
20260501204151_optimize_admin_rls_jwt_select.sql
20260501214245_add_financial_freedom_consent_fields.sql
20260501214744_harden_financial_freedom_updated_at_function.sql
20260501215741_create_financial_freedom_uploads.sql
20260507191335_dos_relationship_insights.sql
20260507203700_dos_lightweight_meeting_logging.sql
20260507212003_dos_meeting_outcome_markers.sql
20260508123452_dos_discussion_guides_manual_movement.sql
20260511235105_create_support_commitments_for_donor_intake.sql
20260512000859_add_support_flyer_fields.sql
20260512122826_restore_form_submissions_inbox.sql
20260512124235_giving_reconciliation_foundation.sql
20260513150034_command_center_workspace_ids.sql
20260513163252_dos_meetings_discipleship_engine.sql
20260513200806_restore_prayer_team_signup_tables.sql
20260513200945_prayer_team_signup_advisor_cleanup.sql
20260513202001_dos_quick_reviews.sql
20260513202254_restore_prayer_team_operational_columns.sql
20260513202838_add_dos_quick_review_fk_indexes.sql
20260513204317_add_quick_review_fruit_moderation_statuses.sql
20260513204740_prayer_partner_application_lifecycle.sql
20260514170223_build_financial_intake_system.sql
20260514190043_create_aligned_insights_inquiries.sql
20260531200145_dos_circle_relationship_intelligence.sql
20260728035152_communications_resend_subscribers.sql
```

### Local-Only Migration Names

These local migration names do not appear by name in the remote migration history.

```text
20260501223000_create_prayer_command_center.sql
20260504162820_missionary_profile_features.sql
20260504163724_missionary_images_storage_bucket.sql
20260504172302_prayer_team_system.sql
20260505144117_missionary_fruit_items.sql
20260505145337_support_major_gift_system.sql
20260505150838_add_missionary_profile_photo_toggle.sql
20260505151233_add_missionary_profile_serving_scope.sql
20260505151644_add_missionary_profile_positioning.sql
20260505152100_sync_missionary_household_visibility.sql
20260505161300_missionary_team_members.sql
20260505162714_seed_ryan_fox_team_members.sql
20260505163304_create_support_commitments.sql
20260505174500_form_submissions_prayer_operations.sql
20260505193000_add_prayer_request_form_submission_type.sql
20260505203000_form_submissions_assigned_team_public_forms.sql
20260505211500_global_team_public_numbers.sql
20260505214500_update_support_team_submission_workflow.sql
20260505221500_expand_prayer_team_operations_hub.sql
20260505231032_ensure_missionary_team_members.sql
20260505232245_reserve_team_public_number_0001.sql
20260505233000_add_join_mission_interest_form_type.sql
20260505233732_add_missionary_profile_story_versions.sql
20260505234217_add_missionary_encounters.sql
20260505234500_add_missionary_profile_review_form_type.sql
20260506022146_system_access_codes.sql
20260506023500_system_access_codes_type_active.sql
20260506025711_ensure_prayer_team_tables.sql
20260506030136_ensure_form_submissions_table.sql
20260506121842_admin_access_permissions.sql
20260506144308_ensure_missionary_story_versions.sql
20260506170846_missionary_tables_encounters_fruit_pipeline.sql
20260506173235_missionary_fruit_review_flow.sql
20260506180150_command_center_field_people.sql
20260506181043_command_center_tables_structure.sql
20260506181808_command_center_review_fruit_connections.sql
20260507010809_ensure_missionary_field_people.sql
20260507014013_align_missionary_field_people.sql
20260509114750_ensure_missionary_workspace_visibility_columns.sql
20260511173247_support_commitment_pending_giving_setup.sql
20260511183318_normalize_major_gift_statuses.sql
20260511184759_missionary_workspace_mvp_meeting_types.sql
20260513143000_missionary_profile_page_views.sql
20260513151500_support_experience_flow_settings.sql
20260526154500_reviews_fruit_mvp_foundation.sql
20260526171500_fruit_intelligence_metadata.sql
20260526193000_reviews_fruit_moderation_controls.sql
20260526225607_fix_fruit_generation_key_unique.sql
20260526231500_align_dos_review_link_type.sql
20260528161719_dos_relationship_stewardship_model.sql
20260612204920_renumber_ryan_brooke_household_people.sql
20260625175625_dos_ministry_event_model.sql
20260625192547_guard_explicit_dos_fruit_sources.sql
20260625192634_dos_review_request_tokens.sql
20260626204234_quick_review_feedback_storage.sql
20260627201625_support_submission_profile_routing.sql
20260629134616_dos_person_field_visibility.sql
20260702194002_dos_table_discipleship_roles.sql
20260709180000_partners_documents_library.sql
20260713160238_dos_guided_resource_progress.sql
```

## Cause Classification

| Possible cause | Classification | Evidence |
|---|---|---|
| Missing local migration files | Confirmed | Five remote migration names have no local file on `origin/main`. |
| Remote-only historical migrations | Confirmed | Remote history includes applied versions that are absent locally, including `create_aligned_insights_inquiries` and `communications_resend_subscribers`. |
| Branch drift | Unlikely as primary cause | `origin/main` has the same 125 migration-file count as the checked-out local `main`; the 3 newer commits after `b90dbc7` do not touch `supabase/migrations`. |
| Linked-project mismatch | No evidence found | Supabase project listing, saved link metadata, and backup config all point to `dbupuphezeqkiolprrlg` / `usam-website`. |
| Previously applied manual or branch-only migrations | Probable | Same-name timestamp mismatches and remote-only names are consistent with migrations applied from generated branch files, local-only worktrees, or manual history changes before canonical files stabilized. |

## Reconciliation Plan

Do not run this plan without separate founder approval. USA-100 only documents the plan.

### Low Risk: Evidence Preservation

1. Save this report with the remote migration list, local migration list, project ref, source commit, and command provenance.
2. Preserve any local worktrees or branches that contain the missing remote-only migrations, especially USA-47 communications work referenced in `project-zero/USA-89-inventory/scan/build-feature-preservation.py`.
3. For each remote-only migration name, locate the original SQL file or reconstruct it only from a verified source such as the original branch, PR, deployment artifact, or audited database schema diff.

### Medium Risk: Local History Reconciliation

1. If original SQL files are found, add them to the local migration directory using the remote-applied version prefix exactly as recorded by Supabase.
2. For same-name timestamp mismatches, do not rename local files blindly. First compare file contents against the applied database state or original applied SQL.
3. If a remote version and local version contain identical SQL, prefer adding a provenance note and consider replacing the local filename only after review.
4. If SQL differs, classify it as a schema drift case, not only a migration-history case.

### High Risk: Remote History Repair

History repair, including `supabase db repair`, should be a last step and requires separate founder approval. It can make future migrations converge, but it rewrites the authoritative migration ledger and can mask unresolved schema differences.

Minimum prerequisites before any repair:

1. USA-86 verified backup with a successful restore test for `dbupuphezeqkiolprrlg`.
2. Fresh logical `pg_dump` and Supabase storage export within 24 hours of the repair window.
3. Supabase dashboard/PITR snapshot if the project plan supports it.
4. A written rollback plan with restore target, expected downtime, and decision owner.
5. A dry-run reconciliation matrix showing old remote version, proposed local file, SQL provenance, and exact repair command.

## Stop Conditions

Stop and escalate before remediation if any of the following are true:

- A remote-only migration cannot be traced to original SQL.
- A same-name migration has different SQL content locally and remotely.
- The Aligned Insights migration is confirmed to create or mutate tenant-owned data in the USAM production database.
- USA-86 has not completed a verified restore test.
- Founder approval for migration-history repair has not been explicitly recorded.

## Appendix A: Remote Applied Migrations

```text
20260501185143_missionary_profiles_foundation.sql
20260501203837_create_admin_users_allowlist.sql
20260501203857_create_financial_freedom_inquiries.sql
20260501204036_optimize_admin_rls_policies.sql
20260501204151_optimize_admin_rls_jwt_select.sql
20260501214245_add_financial_freedom_consent_fields.sql
20260501214744_harden_financial_freedom_updated_at_function.sql
20260501215741_create_financial_freedom_uploads.sql
20260507162211_dos_foundation_schema.sql
20260507162735_dos_foundation_advisor_cleanup.sql
20260507191335_dos_relationship_insights.sql
20260507203700_dos_lightweight_meeting_logging.sql
20260507212003_dos_meeting_outcome_markers.sql
20260508123452_dos_discussion_guides_manual_movement.sql
20260511235105_create_support_commitments_for_donor_intake.sql
20260512000859_add_support_flyer_fields.sql
20260512122826_restore_form_submissions_inbox.sql
20260512124235_giving_reconciliation_foundation.sql
20260513150034_command_center_workspace_ids.sql
20260513163252_dos_meetings_discipleship_engine.sql
20260513163633_missionary_workspace_mvp_meeting_types_guarded.sql
20260513200806_restore_prayer_team_signup_tables.sql
20260513200945_prayer_team_signup_advisor_cleanup.sql
20260513202001_dos_quick_reviews.sql
20260513202254_restore_prayer_team_operational_columns.sql
20260513202838_add_dos_quick_review_fk_indexes.sql
20260513204317_add_quick_review_fruit_moderation_statuses.sql
20260513204740_prayer_partner_application_lifecycle.sql
20260514170223_build_financial_intake_system.sql
20260514190043_create_aligned_insights_inquiries.sql
20260529173245_dos_field_people_household_mvp.sql
20260530171012_dos_prayer_logs.sql
20260531200145_dos_circle_relationship_intelligence.sql
20260531201235_dos_calendar_reminders_mvp.sql
20260531201359_dos_calendar_reminders_mvp_fk_indexes.sql
20260601174954_dos_calendar_google_read_import.sql
20260601180618_dos_calendar_read_import_fk_indexes.sql
20260601184834_usam_application_workflow.sql
20260601191526_dos_setup_household_placeholders.sql
20260601205200_link_ryan_brooke_usam_profile.sql
20260605132928_allow_four_questions_conversation_flow.sql
20260605164908_usam_application_photos_bucket.sql
20260606194623_usam_application_review_statuses.sql
20260627153000_public_profile_slug_fox_family.sql
20260627210000_dos_household_members_are_people.sql
20260629135120_dos_prayer_public_profile_bridge.sql
20260629212205_show_prayer_team_count.sql
20260630132126_canonical_person_prayer_partners.sql
20260701125400_prayer_partner_canonical_context.sql
20260703141054_dos_assessment_results.sql
20260703144217_quick_review_name_rating_metadata.sql
20260704033834_dos_my_record.sql
20260704171602_dos_my_record_prophetic_words.sql
20260704172801_dos_my_record_external_assessment_results.sql
20260706013016_dos_household_team_members_people.sql
20260706153343_dos_my_record_assessment_library_fields.sql
20260706155318_dos_my_record_learning_books.sql
20260707034007_dos_private_groups.sql
20260707132434_dos_unified_prayer_context.sql
20260707171021_seed_ryan_dos_groups.sql
20260707220719_dos_my_record_mentor_profile_fields.sql
20260708002057_dos_my_record_life_plan.sql
20260708151213_dos_table_invitations.sql
20260709160043_dos_group_join_requests.sql
20260711021920_dos_commitments_accountability.sql
20260712235050_dos_groups_simplification_shared_leadership.sql
20260713022111_dos_identity_shared_leadership.sql
20260713113226_dos_resource_assignments.sql
20260717143757_dos_public_groups_member_portal_foundation.sql
20260728035152_communications_resend_subscribers.sql
```

## Appendix B: Local Canonical Migrations

Source: `rfox0629/usam-website` local ref `origin/main` at `3b79b1a`.

```text
20260501164602_missionary_profiles_foundation.sql
20260501201146_create_admin_users_allowlist.sql
20260501202545_create_financial_freedom_inquiries.sql
20260501203951_optimize_admin_rls_policies.sql
20260501204109_optimize_admin_rls_jwt_select.sql
20260501214201_add_financial_freedom_consent_fields.sql
20260501214715_harden_financial_freedom_updated_at_function.sql
20260501215702_create_financial_freedom_uploads.sql
20260501223000_create_prayer_command_center.sql
20260504162820_missionary_profile_features.sql
20260504163724_missionary_images_storage_bucket.sql
20260504172302_prayer_team_system.sql
20260505144117_missionary_fruit_items.sql
20260505145337_support_major_gift_system.sql
20260505150838_add_missionary_profile_photo_toggle.sql
20260505151233_add_missionary_profile_serving_scope.sql
20260505151644_add_missionary_profile_positioning.sql
20260505152100_sync_missionary_household_visibility.sql
20260505161300_missionary_team_members.sql
20260505162714_seed_ryan_fox_team_members.sql
20260505163304_create_support_commitments.sql
20260505174500_form_submissions_prayer_operations.sql
20260505193000_add_prayer_request_form_submission_type.sql
20260505203000_form_submissions_assigned_team_public_forms.sql
20260505211500_global_team_public_numbers.sql
20260505214500_update_support_team_submission_workflow.sql
20260505221500_expand_prayer_team_operations_hub.sql
20260505231032_ensure_missionary_team_members.sql
20260505232245_reserve_team_public_number_0001.sql
20260505233000_add_join_mission_interest_form_type.sql
20260505233732_add_missionary_profile_story_versions.sql
20260505234217_add_missionary_encounters.sql
20260505234500_add_missionary_profile_review_form_type.sql
20260506022146_system_access_codes.sql
20260506023500_system_access_codes_type_active.sql
20260506025711_ensure_prayer_team_tables.sql
20260506030136_ensure_form_submissions_table.sql
20260506121842_admin_access_permissions.sql
20260506144308_ensure_missionary_story_versions.sql
20260506170846_missionary_tables_encounters_fruit_pipeline.sql
20260506173235_missionary_fruit_review_flow.sql
20260506180150_command_center_field_people.sql
20260506181043_command_center_tables_structure.sql
20260506181808_command_center_review_fruit_connections.sql
20260507010809_ensure_missionary_field_people.sql
20260507014013_align_missionary_field_people.sql
20260507021718_command_center_workspace_ids.sql
20260507141016_dos_relationship_insights.sql
20260507162211_dos_foundation_schema.sql
20260507162735_dos_foundation_advisor_cleanup.sql
20260507202645_dos_lightweight_meeting_logging.sql
20260507211938_dos_meeting_outcome_markers.sql
20260508123130_dos_discussion_guides_manual_movement.sql
20260509114750_ensure_missionary_workspace_visibility_columns.sql
20260511173247_support_commitment_pending_giving_setup.sql
20260511183318_normalize_major_gift_statuses.sql
20260511184759_missionary_workspace_mvp_meeting_types.sql
20260511190906_add_support_flyer_fields.sql
20260512073507_giving_reconciliation_foundation.sql
20260513143000_missionary_profile_page_views.sql
20260513151500_support_experience_flow_settings.sql
20260513162212_dos_meetings_discipleship_engine.sql
20260513163633_missionary_workspace_mvp_meeting_types_guarded.sql
20260513190000_dos_quick_reviews.sql
20260513201000_restore_prayer_team_signup_tables.sql
20260513202000_prayer_team_signup_advisor_cleanup.sql
20260513202819_add_dos_quick_review_fk_indexes.sql
20260513203424_add_quick_review_fruit_moderation_statuses.sql
20260513212000_restore_prayer_team_operational_columns.sql
20260513224500_prayer_partner_application_lifecycle.sql
20260526121446_dos_circle_relationship_intelligence.sql
20260526154500_reviews_fruit_mvp_foundation.sql
20260526171500_fruit_intelligence_metadata.sql
20260526193000_reviews_fruit_moderation_controls.sql
20260526225607_fix_fruit_generation_key_unique.sql
20260526231500_align_dos_review_link_type.sql
20260528161719_dos_relationship_stewardship_model.sql
20260529173245_dos_field_people_household_mvp.sql
20260530171012_dos_prayer_logs.sql
20260531201235_dos_calendar_reminders_mvp.sql
20260531201359_dos_calendar_reminders_mvp_fk_indexes.sql
20260601174954_dos_calendar_google_read_import.sql
20260601180618_dos_calendar_read_import_fk_indexes.sql
20260601184834_usam_application_workflow.sql
20260601191526_dos_setup_household_placeholders.sql
20260601205200_link_ryan_brooke_usam_profile.sql
20260605132928_allow_four_questions_conversation_flow.sql
20260605164908_usam_application_photos_bucket.sql
20260606194623_usam_application_review_statuses.sql
20260612204920_renumber_ryan_brooke_household_people.sql
20260625175625_dos_ministry_event_model.sql
20260625192547_guard_explicit_dos_fruit_sources.sql
20260625192634_dos_review_request_tokens.sql
20260626204234_quick_review_feedback_storage.sql
20260627153000_public_profile_slug_fox_family.sql
20260627201625_support_submission_profile_routing.sql
20260627210000_dos_household_members_are_people.sql
20260629134616_dos_person_field_visibility.sql
20260629135120_dos_prayer_public_profile_bridge.sql
20260629212205_show_prayer_team_count.sql
20260630132126_canonical_person_prayer_partners.sql
20260701125400_prayer_partner_canonical_context.sql
20260702194002_dos_table_discipleship_roles.sql
20260703141054_dos_assessment_results.sql
20260703144217_quick_review_name_rating_metadata.sql
20260704033834_dos_my_record.sql
20260704171602_dos_my_record_prophetic_words.sql
20260704172801_dos_my_record_external_assessment_results.sql
20260706013016_dos_household_team_members_people.sql
20260706153343_dos_my_record_assessment_library_fields.sql
20260706155318_dos_my_record_learning_books.sql
20260707034007_dos_private_groups.sql
20260707132434_dos_unified_prayer_context.sql
20260707171021_seed_ryan_dos_groups.sql
20260707220719_dos_my_record_mentor_profile_fields.sql
20260708002057_dos_my_record_life_plan.sql
20260708151213_dos_table_invitations.sql
20260709160043_dos_group_join_requests.sql
20260709180000_partners_documents_library.sql
20260711021920_dos_commitments_accountability.sql
20260712235050_dos_groups_simplification_shared_leadership.sql
20260713022111_dos_identity_shared_leadership.sql
20260713113226_dos_resource_assignments.sql
20260713160238_dos_guided_resource_progress.sql
20260717143757_dos_public_groups_member_portal_foundation.sql
```
