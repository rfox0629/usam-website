function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[#E2E8F0] ${className}`} />;
}

export default function DosWorkspaceLoading() {
  return (
    <main className="min-h-screen bg-[#FAFBFD] px-4 py-8 text-[#0F172A] sm:flex sm:items-center sm:justify-center sm:p-6">
      <div className="mx-auto w-full max-w-[430px] rounded-[34px] border border-[#E2E8F0] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:max-w-[560px]">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]">DOS</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">Loading your field</h1>
        <div className="mt-7 rounded-[28px] border border-[#E2E8F0] bg-[#F8FAFC] p-5">
          <SkeletonBlock className="mx-auto h-44 w-44 rounded-full bg-[#DBEAFE]" />
          <SkeletonBlock className="mt-6 h-11 w-full rounded-full bg-[#2563EB]/20" />
        </div>
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => (
            <div className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3" key={item}>
              <SkeletonBlock className="h-9 w-9 rounded-full" />
              <div className="min-w-0 flex-1">
                <SkeletonBlock className="h-3 w-32" />
                <SkeletonBlock className="mt-2 h-2 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
