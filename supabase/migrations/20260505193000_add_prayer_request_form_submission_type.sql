alter table public.form_submissions
  drop constraint if exists form_submissions_form_type_check;

alter table public.form_submissions
  add constraint form_submissions_form_type_check check (
    form_type in (
      'financial_freedom',
      'major_gift',
      'contact',
      'support_giving',
      'prayer_team_application',
      'prayer_request',
      'missionary_application',
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
    and priority in ('low', 'normal', 'high', 'urgent')
    and form_type in (
      'financial_freedom',
      'major_gift',
      'contact',
      'support_giving',
      'prayer_team_application',
      'prayer_request',
      'missionary_application',
      'general'
    )
  );
