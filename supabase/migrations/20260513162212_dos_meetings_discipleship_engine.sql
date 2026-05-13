alter table public.missionary_tables
  add column if not exists conversation_flow_key text not null default 'none',
  add column if not exists conversation_responses jsonb not null default '{}'::jsonb,
  add column if not exists recommended_resources jsonb not null default '[]'::jsonb;

update public.missionary_tables
set conversation_flow_key = 'none'
where conversation_flow_key is null
  or conversation_flow_key not in ('none', 'kitchen_table_gospel');

alter table public.missionary_tables
  drop constraint if exists missionary_tables_conversation_flow_key_check;

alter table public.missionary_tables
  add constraint missionary_tables_conversation_flow_key_check
  check (conversation_flow_key in ('none', 'kitchen_table_gospel'));

create index if not exists missionary_tables_workspace_flow_date_idx
  on public.missionary_tables(workspace_id, conversation_flow_key, table_date desc, created_at desc);

create index if not exists missionary_tables_conversation_responses_idx
  on public.missionary_tables using gin(conversation_responses);

comment on column public.missionary_tables.conversation_flow_key is
  'DOS MVP conversation flow used during the meeting. none is the universal default; kitchen_table_gospel is currently USAM gated in the app.';

comment on column public.missionary_tables.conversation_responses is
  'Flexible private JSONB answers for DOS conversation flows. Responses belong to the meeting, not People or public Profile data.';

comment on column public.missionary_tables.recommended_resources is
  'Queued DOS follow-up resource recommendations derived from conversation responses. Future SMS/email/share actions should use this queue without sending automatically.';
