import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/*
 * USA-289: permanently closed. The original public /join submit created a
 * confirmed account with a password and a DOS workspace with no sign-in and no
 * review. Nothing in the app calls it. USA Missionaries applications go through
 * /join (/api/join/application), and DOS access is a reviewed request at
 * /dos/setup that only Operations can approve.
 *
 * This route cannot provision anything: it imports no Supabase client and has
 * no setting that reopens it. The historical implementation is kept, not
 * compiled, at docs/architecture/legacy-join-submit/route.ts.reference for the
 * provisioner contract (scripts/join-provisioner-contract-regression.mjs).
 */
const moved = {
  error: "This form has moved. To apply to serve with USA Missionaries, use the link in your invitation. To ask for DOS, request access at /dos/setup.",
  moved: { dos: "/dos/setup", usaMissionaries: "/join" },
};

export function POST() {
  return NextResponse.json(moved, { status: 410 });
}
