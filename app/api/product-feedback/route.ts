import { NextResponse } from "next/server";
import { isProductFeedbackCategory } from "@/src/lib/dos/product-feedback";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

type ProductFeedbackPayload = {
  category?: unknown;
  message?: unknown;
  messageText?: unknown;
  pagePath?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown, maxLength = 2000) {
  const valueString = asString(value).slice(0, maxLength);

  return valueString ? valueString : null;
}

export async function POST(request: Request) {
  let body: ProductFeedbackPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const category = asString(body.category);
  const messageText = asNullableString(body.messageText ?? body.message, 4000);
  const pagePath = asNullableString(body.pagePath, 300);

  if (!isProductFeedbackCategory(category)) {
    return NextResponse.json({ error: "Select a feedback category." }, { status: 400 });
  }

  if (!messageText) {
    return NextResponse.json({ error: "Add a short note before submitting feedback." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Feedback is not configured." }, { status: 500 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", "usa-missionaries")
    .maybeSingle();

  if (organizationError) {
    console.error("[Product Feedback] Failed to load default organization:", organizationError);
  }

  // TODO: Add Supabase Storage upload for voice notes once the DOS feedback
  // storage bucket and server-side scanning rules are defined.
  const { error } = await supabase
    .from("product_feedback")
    .insert({
      category,
      message_text: messageText,
      organization_id: organization?.id ?? null,
      page_path: pagePath,
      status: "new",
    });

  if (error) {
    console.error("[Product Feedback] Failed to save feedback:", error);
    return NextResponse.json({ error: "Unable to save feedback." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
