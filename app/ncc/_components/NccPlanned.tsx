import { AdminActionLink, AdminEmptyState } from "../../admin/_components/AdminUI";
import { NccShell } from "./NccShell";
import { getCurrentOrganization } from "../_lib/organization-context";
import { findNccNavItem } from "./nccNav";

export function NccPlanned({
  activeKey,
  crossLinks,
}: {
  activeKey: string;
  crossLinks?: ReadonlyArray<{ href: string; label: string }>;
}) {
  const navItem = findNccNavItem(activeKey);
  const title = navItem?.label ?? "Department";

  return (
    <NccShell active={activeKey} organization={getCurrentOrganization()} title={title}>
      <AdminEmptyState
        title="Planned"
        description={`${title} is on the NCC roadmap but has no built functionality yet. Nothing on this page is real data — it will be replaced with a working department once it's built.`}
        action={
          crossLinks && crossLinks.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {crossLinks.map((link) => (
                <AdminActionLink href={link.href} key={link.href}>
                  {link.label}
                </AdminActionLink>
              ))}
            </div>
          ) : undefined
        }
      />
    </NccShell>
  );
}
