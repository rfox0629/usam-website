insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'dos-my-record-learning',
  'dos-my-record-learning',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    updated_at = now();

-- Uploads are handled through the authenticated DOS My Record API with the service role.
-- Keep highlight images private; future mentor sharing should use scoped, user-approved signed links.

create table if not exists public.dos_user_learning_books (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.dos_user_records(id) on delete cascade,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  status text not null default 'reading',
  started_on date,
  finished_on date,
  personal_application text,
  final_summary text,
  share_eligible boolean not null default false,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_user_learning_book_title_not_empty check (length(btrim(title)) > 0),
  constraint dos_user_learning_book_status_check check (status in ('planned', 'reading', 'finished', 'paused', 'archived')),
  constraint dos_user_learning_book_date_order_check check (finished_on is null or started_on is null or finished_on >= started_on),
  constraint dos_user_learning_book_visibility_check check (visibility = 'private')
);

create table if not exists public.dos_user_learning_chapter_notes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.dos_user_learning_books(id) on delete cascade,
  record_id uuid not null references public.dos_user_records(id) on delete cascade,
  workspace_id uuid not null references public.missionary_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_label text not null,
  chapter_number integer,
  highlights text,
  notes text,
  personal_application text,
  highlight_image_bucket text,
  highlight_image_path text,
  highlight_image_file_name text,
  highlight_image_content_type text,
  highlight_image_uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dos_user_learning_chapter_label_not_empty check (length(btrim(chapter_label)) > 0),
  constraint dos_user_learning_chapter_number_check check (chapter_number is null or chapter_number >= 0)
);

create index if not exists dos_user_learning_books_record_status_idx
  on public.dos_user_learning_books(record_id, status, updated_at desc);

create index if not exists dos_user_learning_books_finished_idx
  on public.dos_user_learning_books(workspace_id, user_id, finished_on desc)
  where finished_on is not null;

create index if not exists dos_user_learning_chapter_notes_book_idx
  on public.dos_user_learning_chapter_notes(book_id, (coalesce(chapter_number, 999999)), created_at);

create index if not exists dos_user_learning_chapter_notes_image_idx
  on public.dos_user_learning_chapter_notes(workspace_id, user_id, highlight_image_bucket, highlight_image_path)
  where highlight_image_bucket is not null and highlight_image_path is not null;

drop trigger if exists set_dos_user_learning_books_updated_at on public.dos_user_learning_books;
create trigger set_dos_user_learning_books_updated_at
  before update on public.dos_user_learning_books
  for each row
  execute function public.set_dos_my_record_updated_at();

drop trigger if exists set_dos_user_learning_chapter_notes_updated_at on public.dos_user_learning_chapter_notes;
create trigger set_dos_user_learning_chapter_notes_updated_at
  before update on public.dos_user_learning_chapter_notes
  for each row
  execute function public.set_dos_my_record_updated_at();

alter table public.dos_user_learning_books enable row level security;
alter table public.dos_user_learning_chapter_notes enable row level security;

revoke all on table public.dos_user_learning_books from anon;
revoke all on table public.dos_user_learning_chapter_notes from anon;
revoke all on table public.dos_user_learning_books from authenticated;
revoke all on table public.dos_user_learning_chapter_notes from authenticated;

grant select, insert, update, delete on table public.dos_user_learning_books to authenticated;
grant select, insert, update, delete on table public.dos_user_learning_chapter_notes to authenticated;
grant all on table public.dos_user_learning_books to service_role;
grant all on table public.dos_user_learning_chapter_notes to service_role;

drop policy if exists "DOS users can manage own learning books" on public.dos_user_learning_books;
create policy "DOS users can manage own learning books"
  on public.dos_user_learning_books
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "DOS users can manage own learning chapter notes" on public.dos_user_learning_chapter_notes;
create policy "DOS users can manage own learning chapter notes"
  on public.dos_user_learning_chapter_notes
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

comment on table public.dos_user_learning_books is
  'Private DOS My Record Learning / Book Notes records scoped to one authenticated user and workspace. These store user-owned book progress, personal application, and final summaries. They do not create Field activity, Tables, Fruit, Reports, public Profile data, admin profile metrics, or circle scoring data. Future mentor sharing must remain user-controlled and section-specific.';

comment on table public.dos_user_learning_chapter_notes is
  'Private DOS My Record chapter notes and highlight image references scoped to one authenticated user and workspace. Highlight photos/screenshots remain private by default and are only share-compatible later through explicit user permission.';

notify pgrst, 'reload schema';
