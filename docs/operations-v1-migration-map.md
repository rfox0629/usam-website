# Operations V1 Migration Map

USA-172 internal engineering map. Do not surface these build states as user-facing navigation chips.

| Area | Status | Current decision |
| --- | --- | --- |
| Home | Native | Operations Home is the awareness surface for current submissions and onboarding signals. It must keep sanitized metadata only. |
| Submissions | Native | Generic `form_submissions` review lives in `/operations/submissions` with protected detail pages and type/source filtering. |
| Missionaries / Onboarding | Native | `/operations/missionaries` and `/operations/missionaries/[id]` review `usam_missionary_applications` directly. Legacy admin is fallback only. |
| People | Next migration | Keep placeholder destination until the shared People/Your Field operational model is wired without duplicating FD data. |
| Finance & Compliance | Legacy fallback | Existing finance/support records stay in legacy admin until Operations finance read/write parity is scoped. |
| Documents | Later | Document controls are not part of Operations V1 launch. Keep route as a quiet destination. |
| Organizations | Next migration | Organization views exist in legacy admin; migrate module by module after Missionaries and Submissions stabilize. |
| Dashboards | Later | Avoid broad dashboards until native operational workflows produce reliable signals. |
| System / Developer | Native | Keep visually separated from ministry operations; use for platform readiness, not ministry review workflows. |

## Guardrails

- `/operations` is the normal path for new missionary review.
- `/admin` remains available as Legacy Admin/fallback where parity does not exist yet.
- Do not create duplicate submission, candidate, person, or provisioner tables.
- `/join` continues writing canonical `usam_missionary_applications` until USA-129 migrates provisioning.
- Restoration answers remain detail-only behind Operations authorization.
