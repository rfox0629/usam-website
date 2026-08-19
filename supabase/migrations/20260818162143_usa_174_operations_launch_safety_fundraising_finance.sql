alter table public.usam_missionary_applications
  add column if not exists proposed_monthly_need numeric(12,2),
  add column if not exists admin_approved_monthly_goal numeric(12,2),
  add column if not exists excess_support_agreement_accepted boolean not null default false,
  add column if not exists excess_support_agreement_accepted_at timestamptz,
  add column if not exists excess_support_agreement_version text;

alter table public.usam_missionary_applications
  drop constraint if exists usam_missionary_applications_proposed_monthly_need_check;

alter table public.usam_missionary_applications
  add constraint usam_missionary_applications_proposed_monthly_need_check
  check (proposed_monthly_need is null or proposed_monthly_need >= 0);

alter table public.usam_missionary_applications
  drop constraint if exists usam_missionary_applications_admin_goal_check;

alter table public.usam_missionary_applications
  add constraint usam_missionary_applications_admin_goal_check
  check (admin_approved_monthly_goal is null or admin_approved_monthly_goal >= 0);

update public.usam_missionary_applications
set proposed_monthly_need = coalesce(proposed_monthly_need, monthly_budget, support_goal)
where proposed_monthly_need is null
  and coalesce(monthly_budget, support_goal) is not null;

update public.usam_missionary_applications
set admin_approved_monthly_goal = coalesce(admin_approved_monthly_goal, support_goal)
where admin_approved_monthly_goal is null
  and support_goal is not null
  and status in ('approved', 'active');

create index if not exists usam_missionary_applications_launch_finance_idx
  on public.usam_missionary_applications(status, admin_approved_monthly_goal, proposed_monthly_need, submitted_at desc);

comment on column public.usam_missionary_applications.proposed_monthly_need is
  'Applicant-proposed monthly support need captured from /join. This is not the approved public support goal.';

comment on column public.usam_missionary_applications.admin_approved_monthly_goal is
  'Operations-approved monthly support goal for public profile/support setup.';

comment on column public.usam_missionary_applications.excess_support_agreement_accepted is
  'Whether the applicant agreed that support above the approved goal may be stewarded by USA Missionaries.';

comment on column public.usam_missionary_applications.excess_support_agreement_accepted_at is
  'Timestamp when the excess-support agreement was accepted.';

comment on column public.usam_missionary_applications.excess_support_agreement_version is
  'Version key for the exact excess-support agreement accepted during application submission.';
