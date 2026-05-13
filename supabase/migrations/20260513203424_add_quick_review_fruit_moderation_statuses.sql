do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'missionary_fruit_items_cc_status_check'
      and conrelid = 'public.missionary_fruit_items'::regclass
  ) then
    alter table public.missionary_fruit_items
      drop constraint missionary_fruit_items_cc_status_check;
  end if;

  alter table public.missionary_fruit_items
    add constraint missionary_fruit_items_cc_status_check
    check (cc_status in ('draft', 'pending_review', 'approved', 'private', 'archived'));
end $$;

update public.missionary_fruit_items
set cc_status = 'pending_review',
    updated_at = now()
where source_app = 'dos_quick_review'
  and cc_status = 'draft';

create index if not exists missionary_fruit_items_quick_review_pending_idx
  on public.missionary_fruit_items(workspace_id, testimony_date desc nulls last, created_at desc)
  where source_app = 'dos_quick_review'
    and cc_status = 'pending_review';

comment on column public.missionary_fruit_items.cc_status is
  'Missionary Workspace review state for Fruit: draft, pending_review, approved, private, or archived. Public publishing still requires status, visibility, permission, and missionary_public_approved.';
