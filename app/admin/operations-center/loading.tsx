import { AdminShell } from "../_components/AdminShell";

export default function OperationsCenterLoading() {
  return (
    <AdminShell
      active="operations-center"
      surface="light"
      title="Founder Command Center"
    >
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="h-28 animate-pulse rounded-lg border border-stone-200 bg-stone-100" key={index} />
          ))}
        </div>
        <div className="h-28 animate-pulse rounded-lg border border-stone-200 bg-stone-100" />
        <div className="h-56 animate-pulse rounded-lg border border-stone-200 bg-stone-100" />
        <div className="h-72 animate-pulse rounded-lg border border-stone-200 bg-stone-100" />
        <div className="h-40 animate-pulse rounded-lg border border-stone-200 bg-stone-100" />
      </div>
    </AdminShell>
  );
}
