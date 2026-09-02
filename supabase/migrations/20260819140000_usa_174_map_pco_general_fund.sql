-- USA-174: classify USA Missionaries' Planning Center General fund.
--
-- Keyed on the stable Planning Center Fund id 469404, not the display string.
-- Source evidence from the two founder-triggered live syncs on 2026-08-19:
--   * GET /giving/v2/funds returned exactly one fund for this organization;
--   * all 42 imported gifts (2025-10-17 .. 2026-08-18, 15 distinct donors,
--     6 recurring schedules) carry a single designation whose
--     relationships.fund.data.id is 469404;
--   * no missionary-specific or campaign-specific fund exists.
-- A single-fund Giving account whose fund receives every gift is by definition
-- the organization's general/unrestricted fund.
--
-- General only. No missionary attribution is created here.
insert into public.pco_designation_mappings (
  pco_fund_id,
  fund_name,
  target_kind,
  missionary_profile_id,
  notes,
  created_by
)
values (
  '469404',
  'General',
  'general',
  null,
  'USA Missionaries general/unrestricted fund. Verified 2026-08-19: sole fund returned by /giving/v2/funds and the designation target of all 42 imported gifts.',
  'USA-174'
)
on conflict (pco_fund_id) where pco_fund_id is not null do nothing;

-- Reclassify gifts imported before the mapping existed, through the same
-- explicit rule the importer applies: fund mapping wins, single-designation
-- gifts only, never a name match.
update public.pco_giving_records r
set attribution_kind = m.target_kind,
    attribution_source = 'fund_mapping',
    attributed_missionary_profile_id = m.missionary_profile_id
from public.pco_designation_mappings m
where r.pco_fund_id = m.pco_fund_id
  and m.pco_fund_id is not null
  and r.designation_count <= 1
  and r.attribution_kind = 'unmapped';
