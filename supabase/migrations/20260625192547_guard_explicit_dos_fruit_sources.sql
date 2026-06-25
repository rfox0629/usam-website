delete from public.fruit_events
where generated_by = 'engagement_pattern'
  or source_type = 'system'
  or generation_key like 'engagement:%'
  or (
    title = 'Church Engagement'
    and fruit_type = 'Church Visit'
    and generated_by not in ('leader_review', 'quick_review', 'record_fruit', 'testimony_review')
  );

update public.fruit_events
set generated_by = case generated_by
  when 'reflection_keywords' then 'leader_review'
  when 'review_submission' then 'quick_review'
  when 'review_selected_outcome' then 'quick_review'
  when 'testimony_keywords' then 'testimony_review'
  when 'manual' then 'record_fruit'
  else generated_by
end
where generated_by in ('reflection_keywords', 'review_submission', 'review_selected_outcome', 'testimony_keywords', 'manual');

update public.fruit_events
set generated_by = case source_type
  when 'leader_reflection' then 'leader_review'
  when 'participant_review' then 'quick_review'
  when 'testimony' then 'testimony_review'
  when 'manual' then 'record_fruit'
  else generated_by
end
where generated_by not in ('record_fruit', 'quick_review', 'testimony_review', 'leader_review')
  and source_type in ('leader_reflection', 'participant_review', 'testimony', 'manual');

delete from public.fruit_events
where source_type not in ('leader_reflection', 'participant_review', 'testimony', 'manual')
  or generated_by not in ('record_fruit', 'quick_review', 'testimony_review', 'leader_review');

alter table public.fruit_events
  drop constraint if exists fruit_events_source_type_check;

alter table public.fruit_events
  add constraint fruit_events_source_type_check check (
    source_type in ('leader_reflection', 'participant_review', 'testimony', 'manual')
  );

alter table public.fruit_events
  drop constraint if exists fruit_events_generated_by_check;

alter table public.fruit_events
  add constraint fruit_events_generated_by_check check (
    generated_by in ('record_fruit', 'quick_review', 'testimony_review', 'leader_review')
  );

comment on constraint fruit_events_generated_by_check on public.fruit_events is
  'Fruit events must come from an explicit user action, not passive person, table, import, demo, or relationship creation.';

comment on column public.fruit_events.generated_by is
  'Explicit user action that created the event: record_fruit, quick_review, testimony_review, or leader_review.';
