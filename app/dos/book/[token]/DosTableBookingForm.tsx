"use client";

import { CalendarDays, CheckCircle2, Clock, Mail, Phone, User } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { PublicDosTableInvitation } from "@/src/lib/dos/table-invitation-data";

const font = { oswald: "'Inter Tight', 'Inter', sans-serif", rajdhani: "'Inter', sans-serif" };

type BookingResponse = {
  error?: string;
  slot?: {
    dateLabel: string;
    timeLabel: string;
  };
  status?: "booked";
};

export function DosTableBookingForm({ data }: { data: PublicDosTableInvitation }) {
  const firstSlotId = data.slots[0]?.id ?? "";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [prayerRequest, setPrayerRequest] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState(firstSlotId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [bookedSlot, setBookedSlot] = useState<BookingResponse["slot"] | null>(null);
  const selectedSlot = useMemo(
    () => data.slots.find((slot) => slot.id === selectedSlotId) ?? data.slots[0] ?? null,
    [data.slots, selectedSlotId],
  );

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSlot) {
      setMessage("Choose an available time.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const response = await fetch(`/api/dos/book/${encodeURIComponent(data.invitation.token)}`, {
      body: JSON.stringify({
        email,
        name,
        notes,
        phone,
        prayerRequest,
        startAt: selectedSlot.startAt,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const body = await response.json().catch(() => ({})) as BookingResponse;

    setIsSubmitting(false);

    if (!response.ok || body.error) {
      setMessage(body.error ?? "Unable to book that time.");
      return;
    }

    setBookedSlot(body.slot ?? {
      dateLabel: selectedSlot.dateLabel,
      timeLabel: selectedSlot.timeLabel,
    });
  }

  if (bookedSlot) {
    return (
      <main className="min-h-screen bg-[#F8FBFF] px-5 py-10 text-[#0F172A]">
        <section className="mx-auto max-w-lg rounded-[28px] border border-[#DCEBFF] bg-white p-6 shadow-[0_24px_70px_rgba(37,99,235,0.10)]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" strokeWidth={2} />
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
            Booking Confirmed
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>
            You are on the calendar.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#475569]">
            {data.workspace.displayName} will meet with you on {bookedSlot.dateLabel} at {bookedSlot.timeLabel}.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FBFF] px-5 py-8 text-[#0F172A]">
      <section className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <aside className="rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_70px_rgba(37,99,235,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
            DOS Table
          </p>
          <h1 className="mt-3 text-4xl font-black leading-none text-[#0F172A]" style={{ fontFamily: font.oswald }}>
            {data.invitation.title}
          </h1>
          {data.invitation.description ? (
            <p className="mt-4 text-sm leading-6 text-[#475569]">{data.invitation.description}</p>
          ) : null}
          <div className="mt-6 grid gap-3">
            <span className="flex items-center gap-2 text-sm font-bold text-[#334155]">
              <User className="h-4 w-4 text-[#2563EB]" aria-hidden="true" strokeWidth={1.9} />
              {data.workspace.displayName}
            </span>
            <span className="flex items-center gap-2 text-sm font-bold text-[#334155]">
              <Clock className="h-4 w-4 text-[#2563EB]" aria-hidden="true" strokeWidth={1.9} />
              {data.invitation.settings.meetingTypes.find((type) => type.id === data.invitation.kind)?.duration ?? 60} minutes
            </span>
            <span className="flex items-center gap-2 text-sm font-bold text-[#334155]">
              <CalendarDays className="h-4 w-4 text-[#2563EB]" aria-hidden="true" strokeWidth={1.9} />
              Choose one available time
            </span>
          </div>
          <p className="mt-6 rounded-[18px] border border-[#DCEBFF] bg-[#F8FBFF] p-3 text-xs font-semibold leading-5 text-[#475569]">
            Your details are shared with the host only for this meeting.
          </p>
        </aside>

        <form className="rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_70px_rgba(37,99,235,0.08)]" onSubmit={submitBooking}>
          <div className="grid gap-5">
            <section>
              <h2 className="text-base font-black text-[#0F172A]">Available Times</h2>
              {data.slots.length ? (
                <div className="mt-3 grid max-h-[300px] gap-2 overflow-y-auto pr-1">
                  {data.slots.map((slot) => {
                    const selected = selectedSlot?.id === slot.id;

                    return (
                      <button
                        aria-pressed={selected}
                        className={`flex min-h-12 items-center justify-between gap-3 rounded-[16px] border px-3 text-left transition-colors ${
                          selected
                            ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]"
                            : "border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#BFDBFE]"
                        }`}
                        key={slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        type="button"
                      >
                        <span className="min-w-0 text-sm font-black">{slot.dateLabel}</span>
                        <span className="shrink-0 text-sm font-bold">{slot.timeLabel}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm font-semibold leading-6 text-[#64748B]">
                  No times are available right now.
                </p>
              )}
            </section>

            <section className="grid gap-3">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[#475569]">Name</span>
                <div className="mt-1 flex min-h-11 items-center gap-2 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] px-3">
                  <User className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.9} />
                  <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#0F172A] outline-none" onChange={(event) => setName(event.target.value)} required value={name} />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[#475569]">Email</span>
                <div className="mt-1 flex min-h-11 items-center gap-2 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] px-3">
                  <Mail className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.9} />
                  <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#0F172A] outline-none" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[#475569]">Phone</span>
                <div className="mt-1 flex min-h-11 items-center gap-2 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] px-3">
                  <Phone className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.9} />
                  <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#0F172A] outline-none" onChange={(event) => setPhone(event.target.value)} type="tel" value={phone} />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[#475569]">Notes</span>
                <textarea className="mt-1 min-h-24 w-full rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#0F172A] outline-none" onChange={(event) => setNotes(event.target.value)} value={notes} />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-[#475569]">Prayer Request</span>
                <textarea className="mt-1 min-h-20 w-full rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#0F172A] outline-none" onChange={(event) => setPrayerRequest(event.target.value)} value={prayerRequest} />
              </label>
            </section>

            {message ? <p className="rounded-[16px] border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm font-bold text-[#B91C1C]">{message}</p> : null}

            <button
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(37,99,235,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || !data.slots.length}
              type="submit"
            >
              {isSubmitting ? "Booking..." : "Book This Time"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
