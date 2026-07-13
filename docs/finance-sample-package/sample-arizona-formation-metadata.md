# Sample Arizona Formation Metadata — SYNTHETIC (Staging Test Data Only)

Fabricated entity details, for testing the Arizona Annual Report workspace
only. Not the organization's real formation document content.

| Field | Synthetic Value |
|---|---|
| Entity Name | Sample Organization, Inc. |
| Entity Type | Arizona Nonprofit Corporation |
| Entity Number | A-99999999 (synthetic, not a real AZCC entity number) |
| Formation Date | 2022-03-15 (synthetic) |
| Statutory Agent | Sample Registered Agent Services LLC |
| Statutory Agent Address | 123 Sample Street, Phoenix, AZ 85001 (synthetic) |
| Principal Office Address | 123 Sample Street, Phoenix, AZ 85001 (synthetic) |
| First Annual Report Due | August 3, 2026 (real — matches the formation approval letter) |

Note: the due date row above is the one real fact in this file (already
encoded in `src/lib/compliance/types.ts`); every other value is fabricated
for testing document upload and metadata display only.
