import { AdminShell } from "../_components/AdminShell";

export default function OperationsCenterLoading() {
  return (
    <AdminShell
      active="operations-center"
      description="Visibility, review, runner capacity."
      surface="light"
      title="Founder Command Center"
    >
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="h-28 animate-pulse rounded-lg border border-stone-200 bg-stone-100" key={index} />
          ))}
        </div>
        <div className="h-52 animate-pulse rounded-lg border border-stone-200 bg-stone-100" />
        <div className="grid gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="h-64 animate-pulse rounded-lg border border-stone-200 bg-stone-100" key={index} />
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
