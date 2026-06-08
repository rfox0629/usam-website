update public.form_submissions
set status = 'needs_follow_up'
where assigned_team = 'support_team'
  and status = 'follow_up';

update public.form_submissions
set priority = case
  when priority = 'low' then 'normal'
  when priority = 'urgent' then 'high'
  else priority
end
where assigned_team = 'support_team'
  and priority in ('low', 'urgent');

alter table public.form_submissions
  drop constraint if exists form_submissions_status_check;

alter table public.form_submissions
  add constraint form_submissions_status_check check (
    status in ('new', 'reviewed', 'needs_follow_up', 'contacted', 'converted', 'archived', 'follow_up')
  );

alter table public.form_submissions
  drop constraint if exists form_submissions_priority_check;

alter table public.form_submissions
  add constraint form_submissions_priority_check check (
    priority in ('normal', 'important', 'high', 'low', 'urgent')
  );

create index if not exists form_submissions_assigned_team_status_idx
  on public.form_submissions(assigned_team, status, created_at desc);

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
