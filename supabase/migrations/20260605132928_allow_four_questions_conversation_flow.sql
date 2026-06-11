alter table public.missionary_tables
  drop constraint if exists missionary_tables_conversation_flow_key_check;

alter table public.missionary_tables
  add constraint missionary_tables_conversation_flow_key_check
  check (conversation_flow_key in ('none', 'kitchen_table_gospel', 'four_questions'));

comment on column public.missionary_tables.conversation_flow_key is
  'DOS MVP conversation flow used during the meeting. none is the universal default; kitchen_table_gospel and four_questions are currently USAM gated in the app.';
