import { AdminShell } from "../_components/AdminShell";
import { AdminBadge, adminFont } from "../_components/AdminUI";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-stone-900/80 ${className}`} />;
}

function LoadingCard({ label }: { label: string }) {
  return (
    <section className="border border-stone-800/75 bg-[#080808]/90 p-4">
      <p
        className="text-[10px] uppercase tracking-[0.18em] text-stone-500"
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      >
        {label}
      </p>
      <SkeletonBlock className="mt-4 h-8 w-16" />
      <SkeletonBlock className="mt-4 h-3 w-full" />
      <SkeletonBlock className="mt-2 h-3 w-2/3" />
    </section>
  );
}

export default function OperationsCenterLoading() {
  return (
    <AdminShell active="operations-center" title="Operations Center">
      <div className="space-y-6">
        <section className="grid gap-3 lg:grid-cols-2">
          <LoadingCard label="Dispatcher" />
          <LoadingCard label="Linear" />
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {["Executing", "Queued", "In Review", "Blocked", "Idle / Monitoring", "Stale / Offline"].map((label) => (
            <LoadingCard key={label} label={label} />
          ))}
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          {["Codex", "Claude"].map((agent) => (
            <section className="border border-stone-800/75 bg-[#080808]/90 p-4" key={agent}>
              <div className="flex items-center justify-between gap-3">
                <p
                  className="text-[10px] uppercase tracking-[0.18em] text-stone-500"
                  style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                >
                  {agent}
                </p>
                <AdminBadge tone="muted">Loading</AdminBadge>
              </div>
              <SkeletonBlock className="mt-4 h-5 w-40" />
              <SkeletonBlock className="mt-4 h-3 w-full" />
            </section>
          ))}
        </section>
      </div>
    </AdminShell>
  );
}
