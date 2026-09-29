-- Reverses 20260810120000_dos_group_location_and_recurrence.sql (USA-279).
-- Never run automatically. Run by hand only with founder authorization, after
-- a verified backup, and only if the forward migration must be undone.
--
-- Data note: after the forward migration, the settings route writes the group
-- location and recurrence into these columns. Dropping them discards those
-- values unless they are first copied back into dos_groups.settings, which is
-- what the app reads when the columns are absent. The copy below does that.
update public.dos_groups
set settings = coalesce(settings, '{}'::jsonb)
  || jsonb_strip_nulls(jsonb_build_object(
       'locationLabel', location_label,
       'locationAddress', location_address,
       'recurrenceEffectiveDate', recurrence_effective_date,
       'recurrenceEndDate', recurrence_end_date))
where location_label is not null
   or location_address is not null
   or recurrence_effective_date is not null
   or recurrence_end_date is not null;

alter table public.dos_groups
  drop column if exists location_label,
  drop column if exists location_address,
  drop column if exists recurrence_effective_date,
  drop column if exists recurrence_end_date;

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end $$;
