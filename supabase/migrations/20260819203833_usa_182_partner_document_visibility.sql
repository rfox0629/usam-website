-- USA-182: founder access decisions for the legacy partner document surface.
--
-- The legacy /partners library is gated by a single shared passphrase, not by
-- individual identity. Two documents should not sit behind it:
--
--   * Compensation & Housing Allowance — personnel data. Canonically classified
--     personnel_restricted; a shared partner passphrase undermines that.
--   * EIN confirmation letter — the original IRS letter carries organization
--     address and account detail beyond the EIN itself.
--
-- Staying partner-visible by founder decision: IRS determination letter,
-- Articles of Incorporation, Arizona formation approval, and Bylaws.
--
-- Nothing is deleted. The files, rows, and the /admin view are untouched; only
-- the partner-facing surface is narrowed.

alter table public.partners_documents
  add column if not exists partner_visible boolean not null default true;

comment on column public.partners_documents.partner_visible is
  'Whether this legacy document is served through the shared-passphrase /partners surface. False keeps it internal without removing the document.';

update public.partners_documents
set partner_visible = false
where doc_name ilike '%compensation%'
   or doc_name ilike '%housing allowance%'
   or doc_name = 'EIN'
   or doc_name ilike '%EIN confirmation%';
