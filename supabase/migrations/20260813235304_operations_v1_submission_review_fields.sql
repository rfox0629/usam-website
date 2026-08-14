alter table public.form_submissions
  add column if not exists review_summary text,
  add column if not exists next_action text,
  add column if not exists follow_up_state text,
  add column if not exists person_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists last_reviewed_by text;

alter table public.form_submissions
  drop constraint if exists form_submissions_form_type_check;

alter table public.form_submissions
  add constraint form_submissions_form_type_check check (
    form_type in (
      'contact',
      'dos_walkthrough_request',
      'field_report_access',
      'financial_freedom',
      'general',
      'join_mission_interest',
      'major_gift',
      'missionary_application',
      'missionary_profile_review',
      'prayer_request',
      'prayer_team_application',
      'restoration',
      'support_giving',
      'system_waitlist'
    )
  );

create index if not exists form_submissions_operations_review_idx
  on public.form_submissions(form_type, status, follow_up_state, created_at desc);

create index if not exists form_submissions_operations_org_idx
  on public.form_submissions(organization_id, form_type, created_at desc);

drop policy if exists "Public can submit form submissions" on public.form_submissions;
create policy "Public can submit form submissions"
  on public.form_submissions
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and priority in ('normal', 'important', 'high', 'low', 'urgent')
    and form_type in (
      'contact',
      'dos_walkthrough_request',
      'field_report_access',
      'financial_freedom',
      'general',
      'join_mission_interest',
      'major_gift',
      'missionary_application',
      'missionary_profile_review',
      'prayer_request',
      'prayer_team_application',
      'restoration',
      'support_giving',
      'system_waitlist'
    )
    and assigned_team in ('prayer_team', 'support_team')
    and (
      (form_type in ('prayer_team_application', 'prayer_request') and assigned_team = 'prayer_team')
      or (form_type not in ('prayer_team_application', 'prayer_request') and assigned_team = 'support_team')
    )
  );

comment on column public.form_submissions.review_summary is
  'Operations-safe review summary. Do not use for raw sensitive response payloads.';

comment on column public.form_submissions.next_action is
  'Next operational action after protected review.';

comment on column public.form_submissions.follow_up_state is
  'Workflow-specific follow-up state for Operations queues.';
