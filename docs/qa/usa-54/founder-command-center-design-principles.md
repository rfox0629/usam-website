# USA-54 Founder Command Center Design Principles

## Research Reviewed

- Linear Custom Views: durable filtered issue/project views, one-off issue lists, and project views for monitoring state.
  https://linear.app/docs/custom-views
- Linear Dashboards: one-page aggregation, metric blocks, tables, filters, and drill-down from overview to detail.
  https://linear.app/docs/dashboards
- Linear GraphQL API: server-side issue reads by identifier, GraphQL endpoint, authentication, and partial error handling.
  https://linear.app/developers/graphql
- Vercel Deployment Protection: protected preview access, Vercel authentication, shareable links, and protection bypass constraints.
  https://vercel.com/docs/deployment-protection/methods-to-protect-deployments
- UK Government Design Principles and GOV.UK data guidance: start with user needs, do less, simplify complex services, show clear and accurate data.
  https://www.gov.uk/guidance/government-design-principles
  https://brand.design-system.service.gov.uk/data/
- Government Analysis Function dashboard guidance: inverted pyramid, minimal scrolling, no horizontal scrolling, limited visual clutter, responsive testing.
  https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-testing-dashboards-for-design-and-accessibility/
- Carbon data table guidance: use tables for locating specific items, expansion for secondary detail, and avoid spreadsheet-style overload.
  https://carbondesignsystem.com/components/data-table/usage/

## Principles Applied

1. Treat the page as an executive inbox.
   The screen answers four questions first: what needs Ryan, what is open, what is blocked, and what just finished. Counts are compact, and detailed explanation stays out of the main flow.

2. Put the founder decision queue first.
   Needs My Attention shows only usable review packages. A Linear status alone is not enough. The item must have a non-Linear review/preview link, an estimated review time, and an exact decision request.

3. Use an Open Work running list.
   Open Work uses Linear-style rows grouped by product/department. Each row shows issue ID, title, product, status, runner, meaningful update, and blocker. Completed items are removed from this list.

4. Separate completion from activity.
   Completed Recently is a short list of meaningful completions. It does not show poll logs or generic update noise.

5. Keep runner health secondary and truthful.
   Claude, Codex, and dispatcher health are compact footer rows. Exact remaining usage appears only when a provider/account source supplies a percentage. Otherwise the copy states that exact remaining allowance is unavailable and reports observed status only.

6. Make readiness obvious.
   Status labels and source pills mark `Live`, `Available`, `Estimated`, or `Unavailable`. Review buttons appear only on review-ready items.

7. Preserve the operating model.
   Linear remains the hidden system of record, dispatcher remains the execution engine, and ChatGPT threads remain strategy/deep-discussion spaces. V1 only provides visibility, review, and concise controls.

8. Keep controls safe.
   Approve, Request Changes, Hold, and runner override write sanitized server-side outbox entries. They do not mutate Linear directly, start shell commands, or expose secrets/raw logs.

9. Design for desktop and mobile.
   Desktop uses a black left nav and white main workspace. Mobile stacks each row with no forced horizontal scrolling.

## Tracked Issue Audit Set

The V1 Linear read contract tracks USA-50 through USA-55, USA-60 through USA-64, and USA-68. When `OPERATIONS_CENTER_LINEAR_API_KEY` or `LINEAR_API_KEY` is configured, the dashboard fetches those issues server-side by identifier and maps them into the founder categories.

## Data Labels

- `Live`: direct Linear API data or another live source.
- `Available`: sanitized dispatcher/operations data was read successfully.
- `Estimated`: value is explicitly marked estimated by the source.
- `Unavailable`: no trustworthy source is configured or readable.
