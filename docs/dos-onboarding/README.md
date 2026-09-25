# DOS onboarding (USA-289)

## The paths

| Visitor | Where they go | Record | Review |
|---|---|---|---|
| Wants **DOS for themselves** | `/dos/setup` → "For me" | `dos_access_requests`, `request_type = individual` | Operations → Submissions → **DOS Access Request** |
| Wants **DOS for their church, ministry, or team** | `/dos/setup` → "For my organization" | `dos_access_requests`, `request_type = organization` | Operations → Submissions → **DOS Access Request** |
| Applying to **serve as a USA Missionaries missionary** | `/join`, the invite-gated USA Missionaries application. `/dos/setup` only links there. | `usam_missionary_applications` (unchanged) | Operations → **Missionaries** (unchanged) |

### What changed

Before this change, `/dos/setup` did several things wrong:

- **Mixed the two processes.** "Complete USA Missionaries Setup" collected a full missionary application (testimony, photos, prayer partners, support budget, references) and posted it to the legacy `/api/join/submit`. That duplicated `/join`.
- **Kept organization requests in the browser.** "Bring DOS to My Organization" wrote only to the browser's localStorage, so nothing ever reached the team.
- **Asked for a password it never used.** No account was created at that step.
- **Hard-coded the "Enter DOS" link.** It pointed at `/dos/ryan-fox`.

### Saved drafts from the earlier page

Drafts saved by the earlier page (`dos-unified-setup-draft-v1`, `dos-unified-setup-submitted-v1`) are read and never deleted.

- **Unfinished organization request:** carried into the new form, with a note that it never reached the team.
- **Unfinished missionary application:** shown as a notice linking to `/join`, with "Show my saved answers" so nothing is lost. Its contact details prefill the DOS form.
- **Missionary application already submitted from this device:** the page says so and asks for nothing.

## Lifecycle

1. **Visitor starts.** "Get Started" on the public DOS page (discipleshipoperatingsystem.com) or on `/dos` opens `https://usamissionaries.org/dos/setup`. No account is needed.
2. **Five steps.**
   - Who it's for
   - About you: name, email, optional phone and location
   - Context: role and church for an individual; name, type, role, and size for an organization
   - How you'll use DOS
   - Review, with an acknowledgement

   Answers save to the device as the visitor types. Back, Edit, and resume after reload all work.
3. **Submit.** `POST /api/dos/access-requests` stores one row with a unique ID, a reference code (`DOS-XXXXXX`), a timestamp, the answers, the contact details, the path, and status `submitted`.
   - Duplicate submits return the original request (unique `submission_key`).
   - A second open request for the same email is refused (partial unique index).
   - No account, workspace, or membership is created.
   - A best-effort notice goes to `DOS_ACCESS_REQUEST_ADMIN_EMAIL` / `ADMIN_APPLICATION_EMAIL`.
4. **Confirmation.** "Awaiting review", with the reference code and what happens next.
5. **Operations review** at `/operations/submissions/dos-access/[id]`.
   - Viewing requires the `ministry_forms` workflow. Deciding requires an admin or editor in `admin_users`.
   - Approve and Decline each record the reviewer's email and ID, the time, the decision, and a note.
   - Decisions are compare-and-set from `submitted`.
   - Decline creates nothing and sends nothing.
6. **Approval provisioning.** Retry-safe; each step is recorded in `provisioning_outcome`, and an expiring lock stops two runs at once.
   - **Sign-in account:** `auth.admin.createUser` with the email confirmed and no password. An email that already has an account is reused, never duplicated.
   - **Individual who already has a DOS workspace:** linked, not recreated. People, groups, Journeys, and reading plans stay where they are.
   - **Otherwise:** a workspace is created with the same record shape as the admin DOS portal provisioner (organization, `missionary_households`, collective with the same slug, profile, memberships, owner team member), plus the owner's own People record.
   - **Readiness check:** `getDosWorkspaceAccess`, the app's own resolver, must allow this email into the workspace before `access_status = ready`.
7. **Welcome email** through the existing Resend helper, sent only when access is ready. It covers:
   - sign-in: an email link for new accounts, or the existing way for existing accounts; never a password or a token
   - where DOS lives
   - iPhone steps: Safari → Share → Add to Home Screen
   - Android steps: Chrome → ⋮ → Install app / Add to Home screen
   - the support contact
   - the walkthrough video, only when `DOS_WALKTHROUGH_VIDEO_URL` is set

   Every attempt is logged in `dos_access_request_email_attempts`. Failures show in Operations with **Retry welcome email**. "Accepted by Resend" is not proof of delivery.

The DOS sign-in page (`/login?next=/dos…`) now offers **Email me a sign-in link** and **Set or reset password**, so accounts created without a password can sign in.

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `RESEND_API_KEY` | existing; required to send | none (attempts are recorded as "not sent") |
| `DOS_EMAIL_FROM` | From address for DOS emails | falls back to `JOIN_EMAIL_FROM` → `PRAYER_EMAIL_FROM` → `EMAIL_FROM` |
| `DOS_SUPPORT_EMAIL` | support contact and Reply-To | `ADMIN_APPLICATION_EMAIL` → `ryan@usamissionaries.org` |
| `DOS_ACCESS_REQUEST_ADMIN_EMAIL` | new-request notice | `ADMIN_APPLICATION_EMAIL` |
| `DOS_WALKTHROUGH_VIDEO_URL` | set **only** after the video is published and verified | unset |

## Deploying

1. **Applied to production 2026-09-25** (after founder approval) as Supabase version `20260925174009`. The file is named to match that version, so local and remote history agree. The rollback file sits next to it.
   - **Before it was applied,** submissions fell back to `form_submissions` as DOS Walkthrough rows carrying the reference code. That fallback stays in the code as a safety net.
2. Merge the PR and let Vercel deploy.
3. Submit a test request, approve it in Operations, and confirm the email arrives in a real inbox.

## Sign out

- **Before:** DOS "Sign out" was a GET link to the POST-only `/api/access/logout` (HTTP 405), and that handler only cleared the System `usam_access` cookie, never the Supabase session DOS uses.
- **Now:**
  - The route ends the Supabase session and clears `usam_access`.
  - A real GET navigation redirects to `/login?next=/dos&signedOut=1`; prefetches are ignored.
  - Both DOS Sign out controls POST a form.

## Evidence

The screenshots in `evidence/` come from a production build (`next build` + `next start`) against the repo's migrations on local Postgres 16, served through PostgREST 12, with a small Supabase Auth stub (`local-walkthrough/`). All data is synthetic. Resend was not configured locally, so the email path is shown as the recorded "not sent" failure with Retry.
