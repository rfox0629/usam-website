# `audit_log` — implementation-ready contract

**USA-110 Stage 0.** **Contract only. No migration is applied by this document.**
Application is gated on **USA-86** (verified restore) and **USA-100** (migration-history drift), per USA-109.

---

## 1. Why

There is **no audit table in the current schema.** One existed in the legacy `USA-Missionaries/dos-platform` repository and was not carried forward. Governance, Compliance, and Finance in Operations V2 each fail their first real question without one — "who changed this, and when?" — and every permission dispute is unresolvable.

USA-109 places `audit_log` in **Stage 1**, additive, before Governance (Operations V2 module 6).

---

## 2. Design principles

1. **Append-only.** No `UPDATE`, no `DELETE`, enforced by RLS and trigger — not convention.
2. **Never a second source of truth.** The audit log records *that a thing happened*; the domain tables remain authoritative for *what is true now*.
3. **Never stores secrets or private content.** It records references and shapes, not bodies. See §6.
4. **Writable by the system, readable by permission.** Applications never delete; auditors never write.
5. **Cheap to write, or it will be skipped.** One insert, no joins, no lookups on the write path.

---

## 3. Event shape

```sql
create table public.audit_log (
  id               bigint generated always as identity primary key,
  occurred_at      timestamptz  not null default now(),

  -- ── Actor ────────────────────────────────────────────────
  actor_account_id uuid         references auth.users(id) on delete set null,
  actor_identity_id uuid,       -- FK added in Stage 1 once `identities` exists
  actor_profile_id uuid         references public.profiles(id) on delete set null,
  actor_type       text         not null,   -- user | system | automation | support
  actor_label      text,                    -- display name at time of action

  -- ── Scope ────────────────────────────────────────────────
  tenant_id        uuid,        -- Workspace V2 container (see workspace-terminology.md)
  organization_id  uuid         references public.organizations(id) on delete set null,
  household_id     uuid         references public.missionary_households(id) on delete set null,

  -- ── Action ───────────────────────────────────────────────
  action           text         not null,   -- verb, dotted — see §4
  entity_table     text         not null,
  entity_id        uuid,
  entity_label     text,                    -- human-readable at time of action

  -- ── Change metadata ──────────────────────────────────────
  changed_fields   text[]       not null default '{}',
  before_ref       jsonb        not null default '{}'::jsonb,
  after_ref        jsonb        not null default '{}'::jsonb,

  -- ── Context ──────────────────────────────────────────────
  request_id       uuid,
  source           text         not null default 'app', -- app | api | job | migration | support
  ip_hash          text,                    -- hashed, never raw
  user_agent       text,

  -- ── Retention ────────────────────────────────────────────
  sensitivity      text         not null default 'standard',
  retain_until     date,

  constraint audit_log_actor_type_check
    check (actor_type in ('user','system','automation','support')),
  constraint audit_log_source_check
    check (source in ('app','api','job','migration','support')),
  constraint audit_log_sensitivity_check
    check (sensitivity in ('standard','sensitive','restricted')),
  constraint audit_log_action_shape_check
    check (action ~ '^[a-z_]+\.[a-z_]+$'),
  constraint audit_log_entity_table_not_empty
    check (length(btrim(entity_table)) > 0),

  -- The privacy invariant. Same technique as visibility_rules.
  constraint audit_log_no_content_in_before
    check (not (before_ref ? 'content' or before_ref ? 'body' or before_ref ? 'note'
             or before_ref ? 'password' or before_ref ? 'token')),
  constraint audit_log_no_content_in_after
    check (not (after_ref ? 'content' or after_ref ? 'body' or after_ref ? 'note'
             or after_ref ? 'password' or after_ref ? 'token'))
);
```

**Scope columns are deliberately all nullable and all present.** During the compatibility period `tenant_id` will be null (no `workspaces` table yet) while `household_id` and `organization_id` carry the scope. After Stage 5, `tenant_id` becomes the primary scope and the others remain for lineage. This lets the audit log ship in Stage 1 and stay correct through Stage 5 without a rewrite.

### Indexes

```sql
create index audit_log_tenant_time_idx    on public.audit_log (tenant_id, occurred_at desc);
create index audit_log_org_time_idx       on public.audit_log (organization_id, occurred_at desc);
create index audit_log_household_time_idx on public.audit_log (household_id, occurred_at desc);
create index audit_log_entity_idx         on public.audit_log (entity_table, entity_id, occurred_at desc);
create index audit_log_actor_idx          on public.audit_log (actor_identity_id, occurred_at desc);
```

---

## 4. Action vocabulary

`domain.verb`, lowercase, dotted, enforced by `audit_log_action_shape_check`.

| Domain | Actions |
|---|---|
| `identity` | `created` `linked` `unlinked` `merged` `merge_reverted` |
| `membership` | `requested` `granted` `role_changed` `suspended` `revoked` |
| `application` | `started` `submitted` `reviewed` `approved` `rejected` `withdrawn` |
| `workspace` | `created` `renamed` `reparented` `suspended` `archived` |
| `capability` | `granted` `revoked` |
| `document` | `uploaded` `downloaded` `replaced` `deleted` `retention_set` |
| `finance` | `recorded` `adjusted` `reconciled` `exported` |
| `governance` | `minute_recorded` `resolution_passed` `policy_published` |
| `compliance` | `filing_submitted` `check_recorded` `expiry_flagged` |
| `visibility` | `rule_created` `rule_paused` `rule_ended` |
| `support` | `session_started` `session_ended` |
| `auth` | `signed_in` `signed_out` `password_reset` `mfa_changed` |

**Required, not optional:** every `identity.*`, `membership.*`, `capability.*`, `visibility.*`, `governance.*`, `finance.*`, and `support.*` event **must** be logged. Failing to write the audit row must fail the operation for these domains.

---

## 5. `before_ref` / `after_ref` — references, never content

These hold **shapes and identifiers**, not values.

✅ Permitted:
```json
{ "status": "pending", "role": "member", "document_id": "…", "amount_band": "1000-4999" }
```

❌ Forbidden (and blocked by CHECK):
```json
{ "content": "…", "body": "…", "note": "…", "password": "…", "token": "…" }
```

**Rule:** if a field would be forbidden from rolling up under USA-109 §2.7, it must not appear here either. For sensitive numerics record a **band**, not the figure. For free text record **`changed_fields`** only — that a field changed, never its old and new text.

---

## 6. Privacy and the never-audited list

The audit log must not become a back door into content that the privacy invariants forbid.

**Never written to `audit_log`, in any field:**

- Journal entry content · private prayer content · private meeting notes
- Assessment raw responses · life-plan content
- Pastoral care and confession content
- Donor-identified giving amounts (band only, and only where a `visibility_rule` permits)
- Board minute content · direct-message content
- Passwords, tokens, keys, session identifiers
- Raw IP addresses — `ip_hash` only

**What *is* recorded for these entities:** that an event occurred, by whom, when, on which entity id, and which field names changed. `entity_label` must be omitted where the label itself is private content.

**Personal Workspace rule:** actions inside a Personal Workspace are audited **for the owner's own visibility only**. No organization or network role may read them. This is enforced by RLS (§8), not by UI.

---

## 7. Retention

| `sensitivity` | Default retention | Applies to |
|---|---|---|
| `standard` | **7 years** | Membership, workspace, capability, document, application |
| `sensitive` | **7 years** | Finance, governance, compliance — statutory |
| `restricted` | **13 months** | `auth.*`, `support.*`, anything touching a Personal Workspace |

- `retain_until` is set at write time from `sensitivity`; a nightly job deletes only rows past `retain_until`. **This is the single permitted exception to append-only**, performed by a dedicated role, and it is itself audited (`audit_log` receives a `retention.purged` summary row).
- **GDPR erasure:** audit rows are *anonymized*, not deleted — `actor_label`, `entity_label`, `user_agent`, `ip_hash` are nulled; the event and its timestamps survive. Erasing the audit trail of a financial or governance action is not lawful in most jurisdictions and is not offered.

---

## 8. Append-only enforcement and RLS

```sql
alter table public.audit_log enable row level security;

-- No UPDATE policy and no DELETE policy exist. Absence is the enforcement.
-- Additionally, belt and braces:
create or replace function public.audit_log_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_log is append-only (attempted %)', tg_op;
end $$;

create trigger audit_log_no_update before update on public.audit_log
  for each row execute function public.audit_log_immutable();
create trigger audit_log_no_delete before delete on public.audit_log
  for each row execute function public.audit_log_immutable();
```

The retention job runs as a dedicated role that is exempted by a narrowly-scoped policy keyed on `retain_until < current_date`. **No application role may delete under any condition.**

**Read policies:**

| Reader | May read |
|---|---|
| Workspace Owner / Admin | Rows scoped to their workspace |
| Governance / Board | `governance.*`, `compliance.*`, `finance.*` in their organization |
| Finance | `finance.*` in their organization |
| Personal Workspace Owner | Their own rows — **nobody else's, ever** |
| Network roles | **Nothing.** Audit rows never roll up. Aggregate counts only, if ever. |
| Support | Metadata only, never `before_ref`/`after_ref`, and every read writes a `support.session_started` row |

---

## 9. Write path

One insert, no joins, no reads. Batched within the request transaction.

```
performAction()
  → domain write
  → audit_log insert (same transaction)
  → commit
```

For the required domains in §4, **a failed audit write fails the transaction.** For everything else it is best-effort and logged as an error, so audit infrastructure can never take the product down for a low-stakes action.

---

## 10. Acceptance criteria for Stage 1 application

1. Table, indexes, triggers, and RLS created exactly as above.
2. `UPDATE` and `DELETE` both raise, verified by test.
3. A `before_ref` containing `content`, `body`, `note`, `password`, or `token` is rejected by CHECK, verified by test.
4. `action` not matching `^[a-z_]+\.[a-z_]+$` is rejected, verified by test.
5. Personal Workspace rows are unreadable by an organization admin, verified by an RLS test.
6. No existing table is modified. Purely additive.
7. Rollback is `drop table public.audit_log cascade` — nothing depends on it at creation time.

---

## 11. Explicitly deferred

- Wiring call sites — Stage 1 creates the table; instrumentation lands with each module.
- `actor_identity_id` FK — added when `identities` exists, same stage, after the table.
- `tenant_id` FK — added in Stage 5 with `workspaces`.
- Tamper-evidence (hash chaining) — genuinely useful for governance, disproportionate now. Revisit if a board or auditor asks.
- Streaming to external SIEM — no requirement exists.
