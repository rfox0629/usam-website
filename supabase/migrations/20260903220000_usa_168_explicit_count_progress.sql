-- USA-168: explicit numeric progress for a count target.
--
-- "Read Scripture 3 times" counted how many update ROWS existed, so adding
-- two readings at once was impossible: it either read as one, or forced two
-- fabricated updates on a day when only one thing was recorded. Row count was
-- never an approved contract, only the shape the data happened to have.
--
-- progress_amount is what the leader actually entered. Nullable, because every
-- existing row predates the question and none of them can be given a truthful
-- answer now; those rows keep counting as one, which is what they have always
-- meant. Newly created count progress always writes an explicit positive
-- number, so the fallback is compatibility rather than the contract.
--
--   count progress = sum(coalesce(progress_amount, 1)) over the goal's updates
--
-- People targets do NOT use this column. A person is confirmed or not, and
-- confirming Philip twice is still one Philip, so that side keeps counting
-- distinct subjects.
--
-- No backfill. No historical row is rewritten. No RLS change: the table
-- carries row-level policies and table-level grants, so a new column is
-- covered by the policies already there.

alter table public.dos_commitment_updates
  add column if not exists progress_amount integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'dos_commitment_updates_progress_amount_check'
      and conrelid = 'public.dos_commitment_updates'::regclass
  ) then
    alter table public.dos_commitment_updates
      add constraint dos_commitment_updates_progress_amount_check
      check (progress_amount is null or progress_amount > 0);
  end if;
end $$;

comment on column public.dos_commitment_updates.progress_amount is
  'How much progress this update records against a count target, as entered. Null on rows written before the column existed, which count as one. Never used for people targets, which count distinct confirmed subjects.';
