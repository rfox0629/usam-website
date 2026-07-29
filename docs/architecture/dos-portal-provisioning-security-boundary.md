# DOS Portal Provisioning Security Boundary

USA-117 is an immediate security-containment change for `POST /api/dos/portal/workspaces`.
It closes the anonymous service-role vulnerability. It does not implement the canonical
Workspace V2 provisioner, tenant memberships, capability grants, or the canonical
`audit_log`.

## Implemented now

- The endpoint performs explicit authentication before payload parsing can reach
  provisioning logic.
- The endpoint performs explicit authorization before any service-role client is
  created or used.
- During the compatibility stage, authorized operators are the existing
  authenticated admin/editor roles from the current admin authorization system.
- Rejected requests fail closed with generic status codes:
  - anonymous: `401`
  - authenticated but unauthorized: `403`
  - authorization or service-role configuration failure: `500`
- Middleware bypass does not grant access because the route performs its own
  authorization check.
- The unauthenticated DOS portal client does not call this endpoint. It routes
  visitors toward sign-in/setup instead of attempting anonymous provisioning.

## Interim scope

The current authorization boundary is intentionally global. It says an authenticated
admin/editor operator may invoke the compatibility provisioning route. It does not
prove Workspace V2 tenant ownership, scoped capability, or tenant-local role
membership because those primitives do not exist yet.

This temporary boundary must not become the permanent Workspace V2 authorization
model. The target model remains:

```text
ALLOW iff Capability(tenant, app) AND Role(identity, tenant, permission) AND Scope(tenant, record)
```

Tenant-scoped capability enforcement is deferred until the Constitution's workspace
membership and capability stages create the necessary tables, roles, and scope checks.

## Caller inventory

Repository search for `/api/dos/portal/workspaces` should find regression tests
and this document only; the route itself lives at
`app/api/dos/portal/workspaces/route.ts`. The previous public DOS client-side
caller was removed because the Founder confirmed there is no legitimate
unauthenticated caller of the provisioning endpoint.

No webhook, external integration, server job, or unauthenticated setup flow should
depend on this route. If a first-party UI needs to invoke it during the compatibility
stage, that UI must run inside an authenticated DOS/admin operator surface and rely
on the route's own authorization check.

## Audit logging

USA-117 cannot honestly mark provisioning audit logging complete. The canonical
`audit_log` table has not been created in the current schema. The contract lives in
`docs/architecture/audit-log-contract.md`, which places `audit_log` in Stage 1 as an
additive table and defines later instrumentation rules.

This PR therefore does not invent a temporary audit system, does not add a migration,
and does not claim the "authorized access is tenant-scoped and audited" acceptance
criterion is complete. That criterion remains deferred to the Constitution stages
that create tenant memberships, capabilities, and canonical `audit_log`
instrumentation.
