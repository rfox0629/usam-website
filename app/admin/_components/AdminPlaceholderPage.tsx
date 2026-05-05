import Link from "next/link";
import { AdminShell, type AdminNavKey } from "./AdminShell";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export function AdminPlaceholderPage({
  active,
  description,
  title,
}: {
  active: AdminNavKey;
  description: string;
  title: string;
}) {
  return (
    <AdminShell active={active} description={description} title={title}>
      <section className="max-w-3xl border border-stone-800/80 bg-[#080808] p-6 md:p-7">
        <p className="text-sm leading-7 text-stone-400">
          This admin module is reserved for future workflows. It is protected, available from the admin sidebar, and ready for implementation when the workflow is defined.
        </p>
        <div className="mt-6">
          <Link
            className="inline-flex min-h-10 items-center justify-center border border-stone-700 px-4 text-xs uppercase tracking-[0.14em] text-stone-200 transition-colors hover:border-[#C9A24A] hover:text-[#E4C465]"
            href="/admin/dashboard"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            Back to Dashboard
          </Link>
        </div>
      </section>
    </AdminShell>
  );
}
