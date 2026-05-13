import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

const reviewActions = ["approve", "private", "archive"] as const;

type ReviewAction = typeof reviewActions[number];

type FruitReviewPayload = {
  action?: unknown;
  fruitId?: unknown;
  workspaceId?: unknown;
};

type QuickReviewFruitRow = {
  household_id: string | null;
  id: string;
  permission_to_share: boolean | null;
  source_app: string | null;
  submitted_by_name: string | null;
  workspace_id: string | null;
};

type MeetingReviewRow = {
  id: string;
  share_permission: string | null;
  submitted_name: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function asReviewAction(value: unknown): ReviewAction | null {
  return reviewActions.includes(value as ReviewAction) ? value as ReviewAction : null;
}

async function authorizeFruitReviewWrite() {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (authorization.status === "configuration_error") {
    return { response: NextResponse.json({ error: authorization.message }, { status: 500 }) };
  }

  if (authorization.status === "unauthorized" || !canEditAdminContent(authorization)) {
    return { response: NextResponse.json({ error: "Editor access required." }, { status: 403 }) };
  }

  if (!isSupabaseAdminConfigured()) {
    return { response: NextResponse.json({ error: "Supabase admin environment variables are not configured." }, { status: 500 }) };
  }

  return { authorization };
}

async function readPayload(request: Request) {
  try {
    return await request.json() as FruitReviewPayload;
  } catch {
    return null;
  }
}

function actionState(action: ReviewAction, review: MeetingReviewRow | null) {
  if (action === "approve") {
    const canShare = review?.share_permission === "anonymous" || review?.share_permission === "with_name";

    return {
      fruitStatus: "approved",
      permissionToShare: canShare,
      publicStatus: "draft",
      reviewStatus: "approved",
      submittedByName: review?.share_permission === "with_name" ? review.submitted_name : null,
    };
  }

  if (action === "archive") {
    return {
      fruitStatus: "archived",
      permissionToShare: false,
      publicStatus: "archived",
      reviewStatus: "archived",
      submittedByName: null,
    };
  }

  return {
    fruitStatus: "private",
    permissionToShare: false,
    publicStatus: "hidden",
    reviewStatus: "private",
    submittedByName: null,
  };
}

export async function POST(request: Request) {
  const authResult = await authorizeFruitReviewWrite();

  if ("response" in authResult) {
    return authResult.response;
  }

  const payload = await readPayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const workspaceId = asString(payload.workspaceId);
  const fruitId = asString(payload.fruitId);
  const action = asReviewAction(payload.action);

  if (!isUuid(workspaceId) || !isUuid(fruitId) || !action) {
    return NextResponse.json({ error: "Workspace, fruit item, and action are required." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: fruit, error: fruitError } = await supabase
    .from("missionary_fruit_items")
    .select("id, workspace_id, household_id, source_app, permission_to_share, submitted_by_name")
    .eq("id", fruitId)
    .eq("source_app", "dos_quick_review")
    .or(`workspace_id.eq.${workspaceId},household_id.eq.${workspaceId}`)
    .maybeSingle();

  if (fruitError) {
    return NextResponse.json({ error: fruitError.message }, { status: 500 });
  }

  if (!fruit) {
    return NextResponse.json({ error: "Quick Review Fruit item not found." }, { status: 404 });
  }

  const typedFruit = fruit as QuickReviewFruitRow;
  const { data: review, error: reviewError } = await supabase
    .from("dos_meeting_reviews")
    .select("id, share_permission, submitted_name")
    .eq("fruit_item_id", typedFruit.id)
    .maybeSingle();

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }

  const typedReview = review as MeetingReviewRow | null;
  const nextState = actionState(action, typedReview);
  const timestamp = new Date().toISOString();
  const { data: updatedFruit, error: updateFruitError } = await supabase
    .from("missionary_fruit_items")
    .update({
      cc_status: nextState.fruitStatus,
      missionary_public_approved: false,
      permission_to_share: nextState.permissionToShare,
      status: nextState.publicStatus,
      submitted_by_name: nextState.submittedByName,
      updated_at: timestamp,
      visibility: "private",
    })
    .eq("id", typedFruit.id)
    .select("id, cc_status, permission_to_share, submitted_by_name, updated_at")
    .single();

  if (updateFruitError || !updatedFruit) {
    return NextResponse.json({ error: updateFruitError?.message ?? "Unable to update Fruit review." }, { status: 500 });
  }

  if (typedReview) {
    const { error: updateReviewError } = await supabase
      .from("dos_meeting_reviews")
      .update({
        status: nextState.reviewStatus,
        updated_at: timestamp,
      })
      .eq("id", typedReview.id);

    if (updateReviewError) {
      return NextResponse.json({ error: updateReviewError.message }, { status: 500 });
    }
  }

  revalidatePath("/admin/missionary-profiles");
  revalidatePath("/dos/app");

  return NextResponse.json({
    fruit: {
      id: updatedFruit.id,
      permission_to_share: updatedFruit.permission_to_share === true,
      status: updatedFruit.cc_status,
      submitted_by_name: updatedFruit.submitted_by_name ?? null,
      updated_at: updatedFruit.updated_at,
    },
    ok: true,
    reviewStatus: nextState.reviewStatus,
  });
}
