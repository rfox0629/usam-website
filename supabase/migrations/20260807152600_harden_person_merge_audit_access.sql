alter table public.dos_person_merge_log enable row level security;

revoke all on table public.dos_person_merge_log from anon;
revoke all on table public.dos_person_merge_log from authenticated;

grant select, insert, update, delete on table public.dos_person_merge_log to service_role;

revoke execute on function public.preview_person_merge(uuid, uuid) from public;
revoke execute on function public.preview_person_merge(uuid, uuid) from anon;
revoke execute on function public.preview_person_merge(uuid, uuid) from authenticated;
grant execute on function public.preview_person_merge(uuid, uuid) to service_role;

revoke execute on function public.merge_person_records(uuid, uuid, uuid) from public;
revoke execute on function public.merge_person_records(uuid, uuid, uuid) from anon;
revoke execute on function public.merge_person_records(uuid, uuid, uuid) from authenticated;
grant execute on function public.merge_person_records(uuid, uuid, uuid) to service_role;

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
