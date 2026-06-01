create index if not exists connected_calendars_user_id_idx
  on public.connected_calendars(user_id);

create index if not exists relationship_reminders_person_id_idx
  on public.relationship_reminders(person_id);
