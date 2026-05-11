# Admin Auth Setup

USAM admin access uses Supabase Auth plus the `public.admin_users` allowlist table. A user must have both:

- a confirmed Supabase Auth user with the same email
- an active `public.admin_users` row for that email

The current production admin email is `ryan@usamissionaries.org`.

## Supabase URL Configuration

In Supabase Dashboard, open Authentication -> URL Configuration.

Set Site URL:

```text
https://new.usamissionaries.org
```

Allowed Redirect URLs should include:

```text
https://new.usamissionaries.org/**
https://new.usamissionaries.org/update-password
http://localhost:3000/**
http://localhost:3000/update-password
```

Keep the localhost URLs so local development password-reset and auth flows keep working. Production reset emails should redirect to:

```text
https://new.usamissionaries.org/update-password
```

## Create Or Restore An Admin User

Create or confirm the allowlist row:

```sql
insert into public.admin_users (email, role, is_active)
values ('ryan@usamissionaries.org', 'admin', true)
on conflict (email)
do update set
  role = excluded.role,
  is_active = excluded.is_active;
```

Then create a Supabase Auth user for the same email in Authentication -> Users, or use the Supabase Admin API from a server-only script with `SUPABASE_SERVICE_ROLE_KEY`. Confirm the email and send a password recovery link to:

```text
https://new.usamissionaries.org/update-password
```

Do not expose the service role key in client code or `NEXT_PUBLIC_*` environment variables.

## How Access Is Checked

`/admin/*` routes are protected by `app/admin/layout.tsx`, which calls `getAdminAuthorization()` from `src/lib/admin-auth.ts`.

The check requires:

- `supabase.auth.getUser()` returns a signed-in user
- `public.admin_users` exposes a matching active row through RLS
- `role` is one of `admin`, `editor`, or `viewer`

The app does not use an environment-variable allowlist for admin dashboard access.
