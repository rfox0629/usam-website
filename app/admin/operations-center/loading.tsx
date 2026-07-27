import { AdminShell } from "../_components/AdminShell";

export default function OperationsCenterLoading() {
  return (
    <AdminShell
      active="operations-center"
      description="Loading founder review, active work, and runner status."
      title="Founder Command Center"
      workspace="light"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="h-28 animate-pulse rounded-lg border border-[#ded8ca] bg-white" key={item} />
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <div className="h-96 animate-pulse rounded-lg border border-[#ded8ca] bg-white" />
        <div className="h-96 animate-pulse rounded-lg border border-[#ded8ca] bg-white" />
      </div>
    </AdminShell>
  );
}
