import { AdminShell, type AdminNavKey } from "./AdminShell";
import { AdminActionLink } from "./AdminUI";
import {
  AdminResourceControlTable,
  type AdminResourceControlRow,
} from "./AdminResourceControlTable";

export function AdminPlaceholderPage({
  active,
  description,
  primaryActionHref,
  primaryActionLabel,
  rows,
  title,
}: {
  active: AdminNavKey;
  description: string;
  primaryActionHref?: string;
  primaryActionLabel?: string;
  rows?: readonly AdminResourceControlRow[];
  title: string;
}) {
  return (
    <AdminShell
      active={active}
      action={primaryActionHref && primaryActionLabel ? (
        <AdminActionLink href={primaryActionHref} variant="gold">
          {primaryActionLabel}
        </AdminActionLink>
      ) : undefined}
      description={description}
      title={title}
    >
      <AdminResourceControlTable
        emptyDescription="Records will appear here once this admin workflow is connected to live data."
        emptyTitle="No Records"
        rows={rows ?? []}
      />
    </AdminShell>
  );
}
