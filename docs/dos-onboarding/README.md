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

1. **Visitor starts.** "Get Started" on the public DOS page (discipleshipoperatingsystem.com) or "Request DOS access" on the DOS sign-in page opens `https://usamissionaries.org/dos/setup`. No account is needed, and submitting grants nothing.
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
7. **Welcome email** through the existing Resend helper, sent only when access is ready. See [Welcome email](#welcome-email). Every attempt is logged in `dos_access_request_email_attempts`. Failures show in Operations with **Retry welcome email**. "Accepted by Resend" is not proof of delivery.

## Signing in and entry points

There is one way to ask for DOS and one way to sign in:

| Who | Where | What it does |
|---|---|---|
| Wants DOS | `/dos/setup` | Sends a request. Creates no account and grants nothing. |
| Approved, or already has DOS | `/dos/sign-in` | The DOS sign-in page. Then `/dos` opens their workspace. |
| Applying to serve with USA Missionaries | `/join` | The missionary application. Separate from DOS. |
| Staff | `/login?next=/operations` ("Operations Sign In") | Not linked from DOS pages or DOS emails. |

**DOS sign-in page (`/dos/sign-in`).**
- One email field, a password, **Sign in**, and **Email me a sign-in link**. Enter signs in with the password.
- **Forgot or set password** and **Request DOS access** sit below as secondary links.
- The link never creates an account (`shouldCreateUser: false`), and its notice doesn't reveal whether the address has DOS.
- After sign-in the person goes to `/dos`, or to a `next` DOS page that passes `safeDosNextPath`. Sign-in, signup and setup URLs are never used as destinations.
- The 2-minute walkthrough is on the page before sign-in: a poster with a centered play button, captions (`dos-walkthrough-v1.en.vtt`), and the steps as text.

**`/dos`.** Signed out → `/dos/sign-in`. Signed in with exactly one real (non-test) workspace → that workspace. Several → a chooser. None → "Your DOS access isn't set up yet", with Request DOS access and Sign out. The old signed-out "Start your DOS field" form is gone; it created nothing and only forwarded to sign-in.

**Old links.**

| URL | Now |
|---|---|
| `/dos/signup`, `/dos/sign-up`, `/dos/register` | `/dos/setup` (HTTP 307) |
| `/dos/login`, `/dos/signin` | `/dos/sign-in`, keeping `next` (HTTP 307) |
| `/login?next=/dos…` | `/dos/sign-in`, keeping `next`, errors and notices |
| `/dos/onboarding` | `/dos/setup` |

Before this change, `/dos/signup` had no route, so it opened the workspace page for a workspace named "signup" and offered "Create a personal DOS workspace".

**Routes that can create accounts or workspaces.**

| Route | Who can use it |
|---|---|
| Approving a request in Operations (`src/lib/dos/access-requests.ts`) | Operations admin or editor |
| `POST /api/dos/portal/workspaces` | admin or editor (staff provisioning tool) |
| `POST /api/admin/organizations` | editor |
| `POST /api/join/submit` | **Closed (410).** It was public, took a password, and created a confirmed account plus a workspace without review. Nothing calls it; `/join` uses `/api/join/application`. The live route now only returns 410: it imports no database client and no setting reopens it. The old code is kept, uncompiled, at `docs/architecture/legacy-join-submit/route.ts.reference` for the provisioner contract test. |

Sign-in never creates users, and no route calls `signUp`. Existing accounts, workspaces and saved drafts are untouched.

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `RESEND_API_KEY` | existing; required to send | none (attempts are recorded as "not sent") |
| `DOS_EMAIL_FROM` | From address for DOS emails | falls back to `JOIN_EMAIL_FROM` → `PRAYER_EMAIL_FROM` → `EMAIL_FROM` |
| `DOS_SUPPORT_EMAIL` | support contact and Reply-To | `ADMIN_APPLICATION_EMAIL` → `ryan@usamissionaries.org` |
| `DOS_ACCESS_REQUEST_ADMIN_EMAIL` | new-request notice | `ADMIN_APPLICATION_EMAIL` |
| `DOS_WALKTHROUGH_VIDEO_URL` | optional override for the walkthrough link (https only) | the hosted `/dos/walkthrough` page |

## Deploying

1. **Applied to production 2026-09-25** (after founder approval) as Supabase version `20260925174009`. The file is named to match that version, so local and remote history agree. The rollback file sits next to it.
   - **Before it was applied,** submissions fell back to `form_submissions` as DOS Walkthrough rows carrying the reference code. That fallback stays in the code as a safety net.
2. Merge the PR and let Vercel deploy.
3. Submit a test request, approve it in Operations, and confirm the email arrives in a real inbox.

## Sign out

- **Before:** DOS "Sign out" was a GET link to the POST-only `/api/access/logout` (HTTP 405), and that handler only cleared the System `usam_access` cookie, never the Supabase session DOS uses.
- **Now:**
  - The route ends the Supabase session and clears `usam_access`.
  - A real GET navigation redirects to `/dos/sign-in?signedOut=1`; prefetches are ignored.
  - Both DOS Sign out controls POST a form.

## Evidence

The screenshots in `evidence/` come from a production build (`next build` + `next start`) against the repo's migrations on local Postgres 16, served through PostgREST 12, with a small Supabase Auth stub (`local-walkthrough/`). All data is synthetic. Resend was not configured locally, so the email path is shown as the recorded "not sent" failure with Retry.

### Select menus

The form's four dropdowns ("Which best describes you?", "How did you hear about DOS?", organization type, and size) no longer use the browser's native `<select>`. Its open menu is drawn by the operating system and cannot match the DOS form. Each is now a select-only combobox: a button with `aria-haspopup="listbox"` and a `role="listbox"` menu.

- **Keyboard:** Arrow keys, Home/End, Enter/Space, Escape, Tab, and type-ahead.
- **Focus and names:** a visible focus ring, and the field's question as the accessible name.
- **Unchanged behavior:** answers still save to the device, and a missing required answer still focuses the field and marks it invalid.

`evidence/select-menus/` holds Chrome screenshots of each menu open and closed at 1440×900 and 390×844, taken from a production build.

## Videos

There are two videos, and they are separate deliverables.

| Video | Where | Length | Purpose |
|---|---|---|---|
| **Bumper** | public DOS page, "A memory and an accountability partner" section | 22 s, silent | promotional |
| **Instructional walkthrough** | the DOS sign-in page and `https://usamissionaries.org/dos/walkthrough` | 1:52, silent, captions, steps written on screen | how to start |

- **What they show:** real DOS screens from the demo route, with every person's name replaced by a synthetic cast for the capture build only.
- **Walkthrough steps:** Sign in ("Email me a sign-in link"), Home, People and a person's record, Meetings, Prayer, and adding DOS to a phone. The page lists the same steps as text, with buttons that jump to each one.
- **Files:** `public/videos/dos/*-v1-*`. Each video has a 1080p and a 720p MP4 (H.264, index at the front, no audio track) and a poster. The walkthrough also has VP9 WebM copies (listed first, so browsers without H.264 still play it) and English captions. Its sources live in `src/lib/dos/walkthrough.ts`.
- **Delivery:** phones get the 720p file. Nothing but the poster loads until the video is needed. `/videos/*` is cached `immutable`, so a new cut needs a new filename.

## Welcome email

Approvals send the email built by `buildDosWelcomeEmail` in `src/lib/dos/access-request-email.ts`. It is gated in code by `dosWelcomeEmailRedesignLive`:

| Design | Builder | Sent to approvals |
|---|---|---|
| **Current** ("Your DOS access is ready") | `buildDosWelcomeEmailCurrent`, unchanged from production | **Yes**, while `dosWelcomeEmailRedesignLive = false` |
| **Redesign** ("Your DOS workspace is ready") | `buildDosWelcomeEmailRedesign` | Not yet. It goes live only after the founder reviews a real Gmail test and the constant is switched to `true` in a reviewed PR. There is no environment switch. |

The redesign:

1. **Header:** DOS logo, "DOS / Discipleship Operating System".
2. **Message:** "{Name}, your workspace is ready.", then one line: existing workspace kept as it was, the organization's workspace, or a new one.
3. **One button, Open DOS,** to `{site}/dos`. It is the only link. `/dos` sends each person to sign-in and then to their own workspace, so no workspace slug is in the email.
4. **Sign-in line:** new accounts: "On the sign-in screen, choose Email me a sign-in link." Existing accounts: "Sign in the way you usually do."
5. **Keep DOS on your phone:** iPhone (Safari → Share → Add to Home Screen) and Android (Chrome → ⋮ → Install app).
6. **Help:** "Just reply to this email." Replies go to `DOS_SUPPORT_EMAIL`.

No video image, walkthrough button, login URL, password or token. Gmail-safe markup: tables, inline styles, 560px wide, one absolute PNG with alt text. A plain-text version is sent with it.

**Preview and test:** Operations → Submissions → a ready DOS request → **Preview the redesigned welcome email** (`/operations/submissions/dos-access/welcome-email`). The **Design** menu switches between the redesign and the current email; both show at desktop and phone widths with the plain text. **Send a test of the redesign** sends the redesign, marked [Test], only to the signed-in admin. It never emails an applicant, never resends a request's welcome email, and writes nothing to any request or `dos_access_request_email_attempts`.

Evidence: `evidence/entry-flow/` (sign-in page, video, `/dos` states, Operations sign-in, redesigned email at 700px and 375px). The harness is `local-walkthrough/entry-flow.mjs`.
