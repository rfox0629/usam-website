const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-stone-900 ${className}`} />;
}

export default function DosWorkspaceLoading() {
  return (
    <main className="min-h-screen bg-[#050505] px-4 py-16 text-stone-100 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.26em] text-amber-400"
          style={{ fontFamily: font.rajdhani }}
        >
          Collective Workspace
        </p>
        <h1 className="mt-5 text-5xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
          Loading DOS
        </h1>
        <div className="mt-10 grid gap-px border border-stone-800 bg-stone-800 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div className="bg-[#080808] p-5" key={item}>
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="mt-6 h-12 w-16" />
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <SkeletonBlock className="h-72" />
          <SkeletonBlock className="h-72" />
        </div>
      </div>
    </main>
  );
}
