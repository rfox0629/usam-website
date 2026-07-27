import type { Metadata } from "next";
import { AdminShell } from "../../../_components/AdminShell";
import { BackupControlCenter } from "../../_components/BackupControlCenter";
import { loadBackupControlCenterData } from "@/src/lib/operations-center/backup-agent";

export const metadata: Metadata = {
  title: "Infrastructure Backups | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OperationsBackupsPage() {
  const data = await loadBackupControlCenterData();

  return (
    <AdminShell
      active="operations-center"
      description="Infrastructure backup status, local Mac Mini controls, restore-test proof, retention, history, and read-only code protection health."
      title="Operations Center"
    >
      <BackupControlCenter initialData={data} />
    </AdminShell>
  );
}
