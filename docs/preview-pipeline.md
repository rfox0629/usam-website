# Preview Pipeline

Dispatcher builds must move through:

`Build -> Validate -> Protected Preview URL -> Engineering Approval -> Continue`

V1 uses Vercel's existing Git preview deployment flow. No custom preview subdomain, DNS change, production deploy, or production database mutation is required.

## Vercel

- `vercel.json` explicitly keeps `dispatcher/**` branch deployments enabled.
- `github.autoJobCancelation` is disabled so review builds are not hidden by automatic cancellation of earlier pushes.
- Vercel should have Deployment Protection set to Standard Protection or stricter for preview URLs.
- Internal `/admin/*` routes remain protected by the existing Supabase Auth plus `admin_users` authorization in `app/admin/layout.tsx`.
- Linear `In Review` is a technical state only. It must not pause unrelated eligible dispatcher work after a protected preview URL and engineering approval are available.

## Dispatcher Completion

After `npm ci`, typecheck/build, and focused validation pass, run:

```bash
POST_LINEAR_COMMENT=true \
LINEAR_API_KEY=... \
LINEAR_ISSUE_ID=USA-52 \
PREVIEW_REVIEW_ROUTE=/admin/operations-center \
VERCEL_BRANCH_URL="$VERCEL_BRANCH_URL" \
VALIDATION_SUMMARY_FILE=.codex/validation-summary.md \
PREVIEW_DESKTOP_SCREENSHOT=.codex/screenshots/operations-center-desktop.png \
PREVIEW_MOBILE_SCREENSHOT=.codex/screenshots/operations-center-mobile.png \
node scripts/dispatcher-preview-completion.mjs
```

The script posts a Linear comment with:

- protected preview URL
- exact route to review
- code-review-ready vs product-preview-ready status
- validation summary
- desktop/mobile screenshots when captured
- live-vs-unavailable data notes

If no preview URL is available, the dispatcher must provide `PREVIEW_BLOCKED_REASON` and, when useful, `PREVIEW_REQUIRED_ACTION`. The script reports `preview-blocked` and exits non-zero so the issue cannot be treated as founder-review-ready.

## URL Sources

Preferred preview URL source order:

1. `PREVIEW_URL`
2. `VERCEL_BRANCH_URL`
3. `NEXT_PUBLIC_VERCEL_BRANCH_URL`
4. `VERCEL_URL`
5. `NEXT_PUBLIC_VERCEL_URL`

As a fallback only, set `ALLOW_DERIVED_PREVIEW_URL=true` with `VERCEL_PROJECT_NAME`, `VERCEL_SCOPE_SLUG`, and the branch name so the script can derive the standard Vercel branch URL.

## USA-52 Recovery Status

USA-52 route: `/admin/operations-center`

USA-62 recovered the USA-52 implementation into a real dispatcher review branch and added this preview workflow so future completed lanes can publish protected review URLs before founder/product review.
