# Admin Route Boundary

`/admin` is the protected administrative surface. It currently contains the USAM National Command Center, Missionary Workspaces, and scoped Prayer/Support Team tools. Future organization/church dashboards should live in this protected area but remain organization-scoped.

- Keep Command Center UI under `app/admin`.
- Do not import DOS mobile app layouts or route-specific field workflow components here.
- Shared UI should be generic primitives only, such as buttons, cards, form fields, or neutral helpers.
- Command Center may read, review, manage, approve, and report on shared Supabase data written by DOS.
- DOS Core is platform data. USAM-specific profile, fundraising, prayer team, support team, and public publishing features are network-level unlocks, not assumptions every DOS user receives.
- Activity must not roll up to an organization/church dashboard unless the user or workspace has opted into sharing.
