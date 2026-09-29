-- Rollback for USA-289 DOS access requests.
--
-- This DELETES every DOS access request and every recorded email attempt.
-- Export both tables first if any real request has been submitted:
--
--   copy (select * from public.dos_access_requests) to stdout with csv header;
--   copy (select * from public.dos_access_request_email_attempts) to stdout with csv header;
--
-- It does not touch anything approval created (auth users, profiles,
-- collectives, missionary_households, team members). Those are ordinary DOS
-- records once created and belong to the person who was given access.

drop table if exists public.dos_access_request_email_attempts;
drop trigger if exists set_dos_access_requests_updated_at on public.dos_access_requests;
drop table if exists public.dos_access_requests;
drop function if exists public.set_dos_access_requests_updated_at();
