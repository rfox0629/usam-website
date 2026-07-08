create table if not exists public.dos_user_prophetic_words (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.dos_user_records(id) on delete cascade,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date_received date not null default current_date,
  given_by text,
  context text,
  word_text text not null,
  scripture_references text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  status text not null default 'received',
  confirmations text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_user_prophetic_word_text_not_empty check (length(btrim(word_text)) > 0),
  constraint dos_user_prophetic_word_status_check check (status in ('received', 'testing', 'confirmed', 'fulfilled', 'archived'))
);

create index if not exists dos_user_prophetic_words_record_date_idx
  on public.dos_user_prophetic_words(record_id, date_received desc, created_at desc);

create index if not exists dos_user_prophetic_words_status_idx
  on public.dos_user_prophetic_words(workspace_id, user_id, status, date_received desc);

drop trigger if exists set_dos_user_prophetic_words_updated_at on public.dos_user_prophetic_words;
create trigger set_dos_user_prophetic_words_updated_at
  before update on public.dos_user_prophetic_words
  for each row
  execute function public.set_dos_my_record_updated_at();

alter table public.dos_user_prophetic_words enable row level security;

revoke all on table public.dos_user_prophetic_words from anon;
revoke all on table public.dos_user_prophetic_words from authenticated;

grant select, insert, update, delete on table public.dos_user_prophetic_words to authenticated;
grant all on table public.dos_user_prophetic_words to service_role;

drop policy if exists "DOS users can manage own prophetic words" on public.dos_user_prophetic_words;
create policy "DOS users can manage own prophetic words"
  on public.dos_user_prophetic_words
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

comment on table public.dos_user_prophetic_words is
  'Private DOS My Record prophetic words scoped to one authenticated user and workspace. These do not create Field activity, Tables, Fruit, Reports, public Profile data, admin profile metrics, or circle scoring data.';

notify pgrst, 'reload schema';
