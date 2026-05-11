# Admin Route Boundary

`/admin` is the Command Center for leadership, management, analytics, submissions, teams, profiles, settings, and website administration.

- Keep Command Center UI under `app/admin`.
- Do not import DOS mobile app layouts or route-specific field workflow components here.
- Shared UI should be generic primitives only, such as buttons, cards, form fields, or neutral helpers.
- Command Center may read, review, manage, approve, and report on shared Supabase data written by DOS.
