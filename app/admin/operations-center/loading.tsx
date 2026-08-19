import { AdminShell } from "../_components/AdminShell";

export default function OperationsCenterLoading() {
  return (
    <AdminShell
      active="operations-center"
      description="Loading read-only workforce status."
      title="Operations Center"
    >
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="h-40 animate-pulse border border-stone-800/75 bg-stone-950/70" key={item} />
        ))}
      </div>
    </AdminShell>
  );
}
