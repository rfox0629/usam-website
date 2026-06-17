function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[#DCEBFF] ${className}`} />;
}

function LoadingCard({ title, wide = false }: { title: string; wide?: boolean }) {
  return (
    <div className={`rounded-[22px] border border-[#DCEBFF] bg-white p-3 shadow-[0_12px_30px_rgba(37,99,235,0.055)] ${wide ? "md:col-span-2" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563EB]">{title}</p>
        <SkeletonBlock className="h-6 w-12 rounded-full bg-[#EBF2FF]" />
      </div>
      <SkeletonBlock className="mt-4 h-4 w-2/3 bg-[#EBF2FF]" />
      <SkeletonBlock className="mt-3 h-3 w-full rounded-full" />
    </div>
  );
}

export default function DosAppLoading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#F8FBFF_0%,#F6F8FF_56%,#FFFFFF_100%)] px-4 py-7 text-[#0F172A] sm:flex sm:items-center sm:justify-center sm:p-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[430px] flex-col rounded-[34px] border border-[#DCEBFF] bg-white/94 p-5 shadow-[0_18px_60px_rgba(37,99,235,0.12)] md:min-h-[680px] md:max-w-[880px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-black uppercase tracking-[0.12em] text-[#2563EB]">DOS</p>
            <h1 className="mt-3 text-4xl font-black leading-[0.92] tracking-[-0.035em] text-[#020617]">Opening DOS</h1>
            <p className="mt-3 text-sm font-semibold text-[#64748B]">Preparing your field dashboard</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#BFDBFE] bg-[#EBF2FF] text-sm font-black text-[#2563EB] shadow-[0_10px_24px_rgba(37,99,235,0.12)]">
            3
          </div>
        </div>

        <div className="mt-7 grid gap-3 md:grid-cols-2">
          <LoadingCard title="Dashboard" wide />
          <LoadingCard title="Field Health" />
          <LoadingCard title="Top Time Investments" />
        </div>

        <div className="mt-auto pt-6">
          <div className="mx-auto grid w-full grid-cols-3 gap-1 rounded-full border border-white/75 bg-white/62 p-1.5 shadow-[0_24px_55px_rgba(148,163,184,0.22)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/58">
            {["Home", "Table", "Apps"].map((item, index) => (
              <div className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold ${index === 0 ? "bg-[#EBF2FF] text-[#2563EB]" : "text-[#94A3B8]"}`} key={item}>
                <SkeletonBlock className={`h-4 w-4 rounded-full ${index === 0 ? "bg-[#2563EB]/35" : ""}`} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
