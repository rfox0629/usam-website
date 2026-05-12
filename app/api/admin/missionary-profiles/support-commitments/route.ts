import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type SupportCommitmentStatus =
  | "active"
  | "cancelled"
  | "incomplete"
  | "needs_follow_up"
  | "pending_giving_setup";

type UpdateSupportCommitmentPayload = {
  adminNotes?: unknown;
  commitmentId?: unknown;
  householdId?: unknown;
  matchConfidence?: unknown;
  pcoDonationId?: unknown;
  pcoRecurringDonationId?: unknown;
  status?: unknown;
};

const supportCommitmentStatuses = [
  "pending_giving_setup",
  "active",
  "incomplete",
  "cancelled",
  "needs_follow_up",
] as const;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isSupportCommitmentStatus(value: string): value is SupportCommitmentStatus {
  return supportCommitmentStatuses.includes(value as SupportCommitmentStatus);
}

function isExistingUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function commitmentAmount(commitment: { other_amount: number | string | null; selected_amount: string | null }) {
  if (commitment.selected_amount === "Other") {
    const amount = Number(commitment.other_amount);

    return Number.isFinite(amount) ? amount : 0;
  }

  const amount = Number((commitment.selected_amount ?? "").replace(/[^0-9.]/g, ""));

  return Number.isFinite(amount) ? amount : 0;
}

function asNullableNumber(value: unknown) {
  const valueString = typeof value === "number" ? String(value) : asString(value);

  if (!valueString) {
    return null;
  }

  const numberValue = Number(valueString.replace(/[^0-9.]/g, ""));

  return Number.isFinite(numberValue) ? numberValue : null;
}

function missionaryNetSupportAmount(amount: number) {
  return Math.round(amount * 0.9 * 100) / 100;
}

function generalFundReserveAmount(amount: number) {
  return Math.round(amount * 0.1 * 100) / 100;
}

async function recalculateActiveMonthlyCommitted(householdId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("support_commitments")
    .select("selected_amount, other_amount")
    .eq("household_id", householdId)
    .eq("status", "active")
    .eq("gift_type", "monthly");

  if (error) {
    throw new Error(error.message);
  }

  const activeMonthlySupport = (data ?? []).reduce(
    (totals, commitment) => {
      const grossAmount = commitmentAmount(commitment);

      return {
        generalFundReserve: totals.generalFundReserve + generalFundReserveAmount(grossAmount),
        missionaryNetSupport: totals.missionaryNetSupport + missionaryNetSupportAmount(grossAmount),
      };
    },
    { generalFundReserve: 0, missionaryNetSupport: 0 },
  );
  const monthlyCommitted = activeMonthlySupport.missionaryNetSupport;
  const { error: updateError } = await supabase
    .from("missionary_support_settings")
    .update({
      monthly_committed: monthlyCommitted,
      updated_at: new Date().toISOString(),
    })
    .eq("household_id", householdId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return monthlyCommitted;
}

export async function PATCH(request: Request) {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { status: 500 });
  }

  if (authorization.status === "unauthorized" || !canEditAdminContent(authorization)) {
    return NextResponse.json({ error: "Editor access required." }, { status: 403 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 });
  }

  let payload: UpdateSupportCommitmentPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const commitmentId = asString(payload.commitmentId);
  const householdId = asString(payload.householdId);
  const status = asString(payload.status);

  if (!isExistingUuid(commitmentId) || !isExistingUuid(householdId) || !isSupportCommitmentStatus(status)) {
    return NextResponse.json({ error: "Commitment, household, and valid status are required." }, { status: 400 });
  }

  const timestamp = new Date().toISOString();
  const supabase = createSupabaseAdminClient();
  const commitmentResult = await supabase
    .from("support_commitments")
    .select("id, household_id, gift_type, selected_amount, other_amount, activated_at")
    .eq("id", commitmentId)
    .eq("household_id", householdId)
    .single();

  if (commitmentResult.error) {
    return NextResponse.json({ error: commitmentResult.error.message }, { status: 500 });
  }

  const commitment = commitmentResult.data as {
    activated_at: string | null;
    gift_type: "monthly" | "one_time";
    other_amount: number | string | null;
    selected_amount: string | null;
  };
  const grossAmount = commitmentAmount(commitment);
  const isActive = status === "active";
  const matchConfidence = asNullableNumber(payload.matchConfidence);
  const { data, error } = await supabase
    .from("support_commitments")
    .update({
      admin_notes: asString(payload.adminNotes) || null,
      activated_at: isActive ? (commitment.activated_at ?? timestamp) : null,
      completed_at: status === "active" ? timestamp : null,
      general_fund_amount: isActive ? generalFundReserveAmount(grossAmount) : null,
      gross_amount: isActive ? grossAmount : null,
      match_confidence: isActive ? matchConfidence : null,
      missionary_net_amount: isActive ? missionaryNetSupportAmount(grossAmount) : null,
      pco_donation_id: asString(payload.pcoDonationId) || null,
      pco_recurring_donation_id: asString(payload.pcoRecurringDonationId) || null,
      matched_at: isActive ? timestamp : null,
      status,
      updated_at: timestamp,
    })
    .eq("id", commitmentId)
    .eq("household_id", householdId)
    .select("id, household_id, status, completed_at, updated_at, admin_notes")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let monthlyCommitted: number | null = null;

  try {
    monthlyCommitted = await recalculateActiveMonthlyCommitted(householdId);
  } catch (recalculateError) {
    return NextResponse.json({
      commitment: data,
      error: recalculateError instanceof Error ? recalculateError.message : "Commitment updated, but monthly committed could not be recalculated.",
    }, { status: 500 });
  }

  return NextResponse.json({
    commitment: data,
    monthlyCommitted,
    ok: true,
  });
}
