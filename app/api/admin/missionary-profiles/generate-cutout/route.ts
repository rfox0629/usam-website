import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import {
  MISSIONARY_IMAGES_BUCKET,
  toMissionaryImageStorageSlug,
} from "@/src/lib/missionaries/profile-image-constants";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type GenerateCutoutPayload = {
  householdId?: unknown;
  settings?: unknown;
  slug?: unknown;
  sourceImageUrl?: unknown;
};

type CutoutSettings = {
  addCamoFatigues: boolean;
  addFacePaint: boolean;
  addHats: boolean;
  addUsamPatch: boolean;
  blurFaces: boolean;
  keepFacesNatural: boolean;
  removeBackground: boolean;
};

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
    revised_prompt?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

const defaultCutoutSettings: CutoutSettings = {
  addCamoFatigues: true,
  addFacePaint: false,
  addHats: false,
  addUsamPatch: true,
  blurFaces: false,
  keepFacesNatural: true,
  removeBackground: true,
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeCutoutSettings(value: unknown): CutoutSettings {
  const settings = typeof value === "object" && value !== null
    ? value as Partial<Record<keyof CutoutSettings, unknown>>
    : {};

  return {
    addCamoFatigues: asBoolean(settings.addCamoFatigues, defaultCutoutSettings.addCamoFatigues),
    addFacePaint: asBoolean(settings.addFacePaint, defaultCutoutSettings.addFacePaint),
    addHats: asBoolean(settings.addHats, defaultCutoutSettings.addHats),
    addUsamPatch: asBoolean(settings.addUsamPatch, defaultCutoutSettings.addUsamPatch),
    blurFaces: asBoolean(settings.blurFaces, defaultCutoutSettings.blurFaces),
    keepFacesNatural: asBoolean(settings.keepFacesNatural, defaultCutoutSettings.keepFacesNatural),
    removeBackground: asBoolean(settings.removeBackground, defaultCutoutSettings.removeBackground),
  };
}

function buildCutoutPrompt(settings: CutoutSettings) {
  const instructions = [
    "Create a clean transparent PNG cutout of this family.",
    "Preserve natural faces.",
    "Keep it realistic and respectful.",
    "Do not add weapons, military rank, official military insignia, or law-enforcement marks.",
  ];

  if (settings.addCamoFatigues) {
    instructions.push("Dress them in subtle black/white missionary field attire.");
  } else {
    instructions.push("Keep clothing tasteful, simple, and close to the original photo.");
  }

  if (settings.addHats) {
    instructions.push("Add simple matching hats only where they look natural.");
  } else {
    instructions.push("Do not add hats.");
  }

  if (settings.addUsamPatch) {
    instructions.push("Add a small USA Missionaries patch where appropriate.");
  } else {
    instructions.push("Do not add a USA Missionaries patch.");
  }

  if (settings.addFacePaint) {
    instructions.push("Add very subtle field-style face paint while keeping faces natural and respectful.");
  } else {
    instructions.push("Do not use face paint.");
  }

  if (settings.blurFaces) {
    instructions.push("Softly blur faces for privacy while preserving the group silhouette.");
  } else if (settings.keepFacesNatural) {
    instructions.push("Keep faces natural.");
  }

  if (settings.removeBackground) {
    instructions.push("Remove the background completely.");
  } else {
    instructions.push("Keep the subject edges clean and avoid adding a busy background.");
  }

  // Future AI styles can branch here, such as formal portrait, field report,
  // discreet/sensitive profile, or leadership variants.
  return instructions.join(" ");
}

function toSourceUrl(sourceImageUrl: string, requestUrl: string) {
  if (/^https?:\/\//i.test(sourceImageUrl)) {
    return sourceImageUrl;
  }

  if (sourceImageUrl.startsWith("/")) {
    return new URL(sourceImageUrl, requestUrl).toString();
  }

  return "";
}

async function fetchSourceImage(sourceImageUrl: string, requestUrl: string) {
  const imageUrl = toSourceUrl(sourceImageUrl, requestUrl);

  if (!imageUrl) {
    throw new Error("Use a full image URL or an existing site image path as the source.");
  }

  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("Could not load the source image.");
  }

  const contentType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";

  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    throw new Error("Source image must be JPG, PNG, or WebP.");
  }

  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength > 50 * 1024 * 1024) {
    throw new Error("Source image must be smaller than 50MB for generation.");
  }

  return {
    arrayBuffer,
    contentType,
  };
}

function getSourceFileName(contentType: string) {
  if (contentType === "image/png") {
    return "source.png";
  }

  if (contentType === "image/webp") {
    return "source.webp";
  }

  return "source.jpg";
}

function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return "";
  }

  return apiKey;
}

async function createCutoutImage({
  sourceImage,
  prompt,
  settings,
}: {
  prompt: string;
  settings: CutoutSettings;
  sourceImage: Awaited<ReturnType<typeof fetchSourceImage>>;
}) {
  const openAiApiKey = getOpenAiApiKey();

  if (!openAiApiKey) {
    throw new Error("Add OPENAI_API_KEY to .env.local and restart the server to enable image generation.");
  }

  const sourceFile = new File(
    [sourceImage.arrayBuffer],
    getSourceFileName(sourceImage.contentType),
    { type: sourceImage.contentType },
  );
  const formData = new FormData();

  formData.append("model", "gpt-image-1");
  formData.append("image", sourceFile);
  formData.append("prompt", prompt);
  formData.append("n", "1");
  formData.append("size", "1024x1536");
  formData.append("quality", "medium");
  formData.append("input_fidelity", "high");
  formData.append("output_format", "png");
  formData.append("background", "transparent");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    body: formData,
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
    },
    method: "POST",
  });
  const result = await response.json() as OpenAIImageResponse;

  if (!response.ok) {
    throw new Error(result.error?.message || "OpenAI could not generate the image.");
  }

  const imageResult = result.data?.[0];

  if (imageResult?.b64_json) {
    return {
      buffer: Buffer.from(imageResult.b64_json, "base64"),
      revisedPrompt: imageResult.revised_prompt ?? null,
    };
  }

  if (imageResult?.url) {
    const imageResponse = await fetch(imageResult.url);

    if (!imageResponse.ok) {
      throw new Error("Generated image could not be downloaded.");
    }

    return {
      buffer: Buffer.from(await imageResponse.arrayBuffer()),
      revisedPrompt: imageResult.revised_prompt ?? null,
    };
  }

  throw new Error("OpenAI did not return a generated image.");
}

export async function POST(request: Request) {
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

  let payload: GenerateCutoutPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const householdId = asString(payload.householdId);
  const slug = toMissionaryImageStorageSlug(asString(payload.slug));
  const sourceImageUrl = asString(payload.sourceImageUrl);
  const settings = normalizeCutoutSettings(payload.settings);

  if (!householdId || !slug || !sourceImageUrl) {
    return NextResponse.json({ error: "Household, slug, and source image are required." }, { status: 400 });
  }

  try {
    const sourceImage = await fetchSourceImage(sourceImageUrl, request.url);
    const prompt = buildCutoutPrompt(settings);
    const generatedImage = await createCutoutImage({
      prompt,
      settings,
      sourceImage,
    });
    const supabase = createSupabaseAdminClient();
    const storagePath = `households/${slug}/hero-cutout-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from(MISSIONARY_IMAGES_BUCKET)
      .upload(storagePath, generatedImage.buffer, {
        cacheControl: "3600",
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from(MISSIONARY_IMAGES_BUCKET)
      .getPublicUrl(storagePath);

    return NextResponse.json({
      path: storagePath,
      publicUrl: data.publicUrl,
      revisedPrompt: generatedImage.revisedPrompt,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "We could not generate the image. Please try again or upload manually.",
    }, { status: 500 });
  }
}

export async function GET() {
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

  return NextResponse.json({
    configured: Boolean(getOpenAiApiKey()),
  });
}
