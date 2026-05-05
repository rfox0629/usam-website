alter table public.form_submissions
  drop constraint if exists form_submissions_form_type_check;

alter table public.form_submissions
  add constraint form_submissions_form_type_check check (
    form_type in (
      'financial_freedom',
      'field_report_access',
      'join_mission_interest',
      'major_gift',
      'contact',
      'support_giving',
      'prayer_team_application',
      'prayer_request',
      'missionary_application',
      'system_waitlist',
      'general'
    )
  );

drop policy if exists "Public can submit form submissions" on public.form_submissions;
create policy "Public can submit form submissions"
  on public.form_submissions
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and priority in ('normal', 'important', 'high', 'low', 'urgent')
    and form_type in (
      'financial_freedom',
      'field_report_access',
      'join_mission_interest',
      'major_gift',
      'contact',
      'support_giving',
      'prayer_team_application',
      'prayer_request',
      'missionary_application',
      'system_waitlist',
      'general'
    )
    and assigned_team in ('prayer_team', 'support_team')
    and (
      (form_type in ('prayer_team_application', 'prayer_request') and assigned_team = 'prayer_team')
      or (form_type not in ('prayer_team_application', 'prayer_request') and assigned_team = 'support_team')
    )
  );
