import { NextResponse } from "next/server";
import { createPublicTableInvitationBooking } from "@/src/lib/dos/table-invitation-data";

type BookingPayload = {
  email?: unknown;
  name?: unknown;
  notes?: unknown;
  phone?: unknown;
  prayerRequest?: unknown;
  startAt?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function readPayload(request: Request) {
  try {
    return await request.json() as BookingPayload;
  } catch {
    return null;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid booking request." }, { status: 400 });
  }

  try {
    const result = await createPublicTableInvitationBooking({
      email: asString(payload.email),
      name: asString(payload.name),
      notes: asString(payload.notes),
      phone: asString(payload.phone),
      prayerRequest: asString(payload.prayerRequest),
      startAt: asString(payload.startAt),
      token,
    });

    if (result.status === "not_configured") {
      return NextResponse.json({ error: "Booking is not configured yet." }, { status: 500 });
    }

    if (result.status === "invalid") {
      return NextResponse.json({ error: "Booking link is not available." }, { status: 404 });
    }

    if (result.status === "invalid_input" || result.status === "unavailable") {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      bookingId: result.bookingId,
      slot: result.slot,
      status: "booked",
      tableId: result.tableId,
      workspace: result.workspace,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to create booking.",
    }, { status: 500 });
  }
}
