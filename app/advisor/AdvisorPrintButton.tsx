"use client";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export function AdvisorPrintButton() {
  return (
    <button
      className="no-print inline-flex items-center gap-2 rounded-sm border border-[#D7DBE4] px-4 py-2 text-[13px] font-medium text-[#3D4654] transition-colors hover:border-[#0B1220] hover:text-[#0B1220]"
      onClick={() => window.print()}
      style={{ fontFamily: font.rajdhani }}
      type="button"
    >
      Print / Save as PDF
    </button>
  );
}
