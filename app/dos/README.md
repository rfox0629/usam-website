# DOS Route Boundary

`/dos/app?workspace=...` is the mobile-first Field app for fast discipleship activity.

- Keep DOS-specific UI under `app/dos/app`.
- Do not import Command Center shells, admin navigation, profile management tools, or analytics panels here.
- Shared backend/data helpers are allowed when they remain UI-neutral.
- Legacy `/dos/[collectiveSlug]` prototype routes redirect to `/dos/app?workspace=[collectiveSlug]`.
- Demo and marketing previews belong under `/system/preview`, not inside the active DOS app route.
