import type { Metadata } from "next";
import { loadPublicTableInvitation } from "@/src/lib/dos/table-invitation-data";
import { DosTableBookingForm } from "./DosTableBookingForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book a Table",
  robots: {
    follow: false,
    index: false,
  },
};

const font = { oswald: "'Inter Tight', 'Inter', sans-serif", rajdhani: "'Inter', sans-serif" };

function BookingState({ detail, title }: { detail: string; title: string }) {
  return (
    <main className="min-h-screen bg-[#F8FBFF] px-5 py-10 text-[#0F172A]">
      <section className="mx-auto max-w-md rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_70px_rgba(37,99,235,0.10)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
          DOS Table
        </p>
        <h1 className="mt-3 text-4xl font-black leading-none text-[#0F172A]" style={{ fontFamily: font.oswald }}>
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#475569]">{detail}</p>
      </section>
    </main>
  );
}

export default async function DosTableBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await loadPublicTableInvitation(token);

  if (result.status === "not_configured") {
    return <BookingState detail="Booking links are not configured for this environment yet." title="Booking unavailable" />;
  }

  if (result.status !== "ready") {
    return <BookingState detail="Ask the person who sent this to share a fresh link." title="Link unavailable" />;
  }

  return <DosTableBookingForm data={result} />;
}
