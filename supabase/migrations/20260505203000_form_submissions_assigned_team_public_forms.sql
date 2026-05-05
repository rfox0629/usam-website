alter table public.form_submissions
  add column if not exists assigned_team text;

update public.form_submissions
set assigned_team = case
  when form_type in ('prayer_team_application', 'prayer_request') then 'prayer_team'
  else 'support_team'
end
where assigned_team is null or btrim(assigned_team) = '';

alter table public.form_submissions
  alter column assigned_team set default 'support_team',
  alter column assigned_team set not null;

alter table public.form_submissions
  drop constraint if exists form_submissions_assigned_team_check;

alter table public.form_submissions
  add constraint form_submissions_assigned_team_check check (
    assigned_team in ('prayer_team', 'support_team')
  );

alter table public.form_submissions
  drop constraint if exists form_submissions_form_type_check;

alter table public.form_submissions
  add constraint form_submissions_form_type_check check (
    form_type in (
      'financial_freedom',
      'field_report_access',
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

create index if not exists form_submissions_form_type_idx
  on public.form_submissions(form_type);

create index if not exists form_submissions_status_idx
  on public.form_submissions(status);

create index if not exists form_submissions_assigned_team_idx
  on public.form_submissions(assigned_team);

create index if not exists form_submissions_created_at_idx
  on public.form_submissions(created_at desc);

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
      'field_report_access',
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
