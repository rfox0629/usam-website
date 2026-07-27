# USA-54 Founder Command Center Design Principles

Date: 2026-07-22

## Sources Reviewed

- Linear Custom Views and Dashboards: portfolio views should show filtered, durable slices of current work and support drill-through when detail is needed.
  - https://linear.app/docs/custom-views
  - https://linear.app/docs/dashboards
- Linear GraphQL API: live Linear data belongs behind a server-side API boundary; clients should not receive tokens, and polling should stay narrow.
  - https://linear.app/developers/graphql
- Vercel generated preview URLs and deployment protection: review-ready work needs a direct preview URL, and protected preview access is a deployment concern.
  - https://vercel.com/docs/deployments/generated-urls
  - https://vercel.com/docs/deployment-protection
- ONS dashboard guidance: put the most important insight first, avoid making the user interpret too much, and keep dashboards responsive and accessible.
  - https://service-manual.ons.gov.uk/data-visualisation/guidance/dashboards
- Carbon data table guidance: use tables only when exact values and comparison matter; otherwise keep dense summaries and progressively reveal detail.
  - https://carbondesignsystem.com/components/data-table/usage/

## Principles Applied

1. Put founder decisions first.
   The top of the page shows only review packages that have usable links or enough evidence to support a decision. Bare `In Review` issues stay out of the attention queue.

2. Separate portfolio from issue detail.
   The home screen shows category, current work, status, runner, latest update, and next milestone. Linear links remain the drill-through path.

3. Make readiness obvious.
   Review cards include the product, issue, what changed, review or preview link, estimated review time, and the exact decision requested.

4. Be truthful about AI capacity.
   Runner status uses live health only when the server-side dispatcher source is configured. Otherwise it shows audited observations and `Unknown`, never inferred remaining usage.

5. Keep multiple products scannable.
   Categories match the intended pinned-thread/product model: ministry strategy, public website, DOS, Kitchen Table Gospel, NCC/Operations, communications, AI workforce, and finance/compliance.

6. Preserve the operating model.
   No embedded chat, no large new-work box, no public raw logs, no shell controls, and no public exposure of Linear or dispatcher credentials.

7. Make controls safe by default.
   Approve, Request Changes, Hold, and runner override controls write only to configured server-side outboxes. If those paths are missing, the dashboard reports the action channel as unavailable.

8. Keep mobile equal to desktop.
   The page uses stacked cards and responsive rows with no forced table min-width or horizontal dragging requirement.
