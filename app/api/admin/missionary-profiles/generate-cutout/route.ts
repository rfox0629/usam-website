import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";
import {
  MISSIONARY_IMAGES_BUCKET,
  toMissionaryImageStorageSlug,
} from "@/src/lib/missionaries/profile-image-constants";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

type GenerateCutoutPayload = {
  householdId?: unknown;
  settings?: unknown;
  slug?: unknown;
  sourceImageUrl?: unknown;
  styleReferenceImageDataUrl?: unknown;
};

type CutoutSettings = {
  addCamoFatigues: boolean;
  addFacePaint: boolean;
  addHats: boolean;
  addUsamPatch: boolean;
  blurFaces: boolean;
  editMode: "conservative" | "stylized";
  keepFacesNatural: boolean;
  removeBackground: boolean;
  styleReferenceImageDataUrl: string | null;
};

type OpenAIResponsesImageResponse = {
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
  output?: Array<{
    id?: string;
    result?: string;
    revised_prompt?: string;
    status?: string;
    type?: string;
  }>;
  status?: string;
};

type ImageInput = {
  arrayBuffer: ArrayBuffer;
  contentType: string;
};

const cutoutGenerationModel = "gpt-5.5";
const cutoutGenerationModelLabel = "OpenAI image generation";
const adminAssistedHeroMessage = "Automated USAM hero image generation is paused until reliable masked editing is available. Use the admin-assisted request flow and upload an approved hero image manually.";

const defaultCutoutSettings: CutoutSettings = {
  addCamoFatigues: true,
  addFacePaint: false,
  addHats: false,
  addUsamPatch: true,
  blurFaces: false,
  editMode: "conservative",
  keepFacesNatural: true,
  removeBackground: true,
  styleReferenceImageDataUrl: null,
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeEditMode(value: unknown): CutoutSettings["editMode"] {
  return value === "stylized" ? "stylized" : "conservative";
}

function normalizeStyleReferenceImageDataUrl(value: unknown) {
  const dataUrl = asString(value);

  return dataUrl.startsWith("data:image/") ? dataUrl : null;
}

function normalizeCutoutSettings(value: unknown): CutoutSettings {
  const settings = typeof value === "object" && value !== null
    ? value as Partial<Record<keyof CutoutSettings, unknown>>
    : {};

  return {
    addCamoFatigues: true,
    addFacePaint: asBoolean(settings.addFacePaint, defaultCutoutSettings.addFacePaint),
    addHats: asBoolean(settings.addHats, defaultCutoutSettings.addHats),
    addUsamPatch: true,
    blurFaces: false,
    editMode: "conservative",
    keepFacesNatural: true,
    removeBackground: true,
    styleReferenceImageDataUrl: normalizeStyleReferenceImageDataUrl(settings.styleReferenceImageDataUrl),
  };
}

function buildCutoutPrompt(settings: CutoutSettings, hasStyleReferenceImage: boolean) {
  const instructions = [
    "Edit the provided source image. Preserve the exact people, faces, ages, smiles, family arrangement, and facial likeness from the source photo. Do not generate a different family. Do not change identity.",
    "The first image is the source family photo. It controls identity, faces, ages, family composition, body arrangement, facial likeness, smiles, hair, and posture.",
    "Do not generate a different family. Do not alter facial identity. Do not change ethnicity, age, gender, hair, smiles, facial structure, or the number of people.",
    "Keep the same family composition and preserve body positions, spacing, and group arrangement as much as possible.",
    "Do not invent new people. Do not add strangers. Do not crop heads, faces, hands, or bodies out of the image.",
    "Include the full family with clean margins around the group.",
    "Use a landscape-friendly frame so the full group can fit comfortably without cutting anyone off.",
    "Avoid cartoon-like faces, plastic skin, generic stock-photo faces, or beauty-filtered identity changes.",
    "Prioritize likeness preservation over style changes.",
    "Prioritize likeness over styling.",
    "Keep the result realistic, respectful, and photo-based.",
    "Do not add weapons, military rank, official military insignia, or law-enforcement marks.",
  ];

  if (hasStyleReferenceImage) {
    instructions.push("The second image is the locked USAM Standard Style Reference. Match its dark charcoal digital camo fatigues, USAM patch treatment, transparent cutout style, realistic lighting, and public hero crop.");
  } else {
    instructions.push("Use the USAM standard hero cutout style: dark charcoal digital camo fatigues, subtle USAM patch, transparent cutout, natural faces, no face paint unless explicitly enabled, and conservative likeness preservation.");
  }

  if (settings.editMode === "conservative") {
    instructions.push("Use conservative edit mode: make minimal changes beyond clothing styling and background handling.");
  } else {
    instructions.push("Use stylized edit mode, but still preserve the exact people and natural facial likeness from the source photo.");
  }

  if (settings.addCamoFatigues) {
    instructions.push("Apply dark charcoal digital camo missionary field attire similar to the approved USA Missionaries hero image style, while preserving the original faces, posture, and group arrangement.");
  } else {
    instructions.push("Keep clothing tasteful, simple, and close to the original photo.");
  }

  if (settings.addHats) {
    instructions.push("Add simple matching hats only if they look natural. Hats must not cover eyes, faces, smiles, hairline, or identifying facial features.");
  } else {
    instructions.push("Do not add hats.");
  }

  if (settings.addUsamPatch) {
    instructions.push("Add a small subtle USA Missionaries patch on clothing or a hat where appropriate. Do not let the patch obscure faces or hands.");
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
    instructions.push("Keep faces natural. Facial accuracy is more important than the outfit transformation.");
  }

  if (settings.removeBackground) {
    instructions.push("Remove the background completely and output a clean transparent PNG cutout.");
  } else {
    instructions.push("Do not remove the background. Keep the original setting as much as possible and avoid adding a busy new background.");
  }

  instructions.push(
    "Negative instructions: do not create new faces, do not change identity, do not crop heads or bodies, do not add strangers, do not make cartoon-like faces, do not replace the family with generic people, and do not change the number of people.",
  );

  // Future AI styles can branch here, such as formal portrait, field report,
  // discreet/sensitive profile, or leadership variants.
  return instructions.join(" ");
}

async function getDefaultStyleReferenceImage(): Promise<ImageInput | null> {
  try {
    const buffer = await readFile(path.join(process.cwd(), "public", "fox-family-no-background.png"));

    return {
      arrayBuffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      contentType: "image/png",
    };
  } catch {
    return null;
  }
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

function parseDataUrlImage(dataUrl: string): ImageInput | null {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);

  if (!match) {
    return null;
  }

  const buffer = Buffer.from(match[2], "base64");

  if (buffer.byteLength > 50 * 1024 * 1024) {
    throw new Error("Style reference image must be smaller than 50MB for generation.");
  }

  return {
    arrayBuffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    contentType: match[1],
  };
}

function toImageDataUrl(image: ImageInput) {
  return `data:${image.contentType};base64,${Buffer.from(image.arrayBuffer).toString("base64")}`;
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
  styleReferenceImage,
  prompt,
  settings,
}: {
  prompt: string;
  settings: CutoutSettings;
  sourceImage: ImageInput;
  styleReferenceImage: ImageInput | null;
}) {
  const openAiApiKey = getOpenAiApiKey();

  if (!openAiApiKey) {
    throw new Error("Add OPENAI_API_KEY to .env.local and restart the server to enable image generation.");
  }

  return createCutoutImageWithResponses({
    openAiApiKey,
    prompt,
    settings,
    sourceImage,
    styleReferenceImage,
  });
}

async function parseOpenAIJsonResponse(response: Response) {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText) as OpenAIResponsesImageResponse;
  } catch {
    throw new Error(`${cutoutGenerationModelLabel} returned a non-JSON response (${response.status}). Confirm this project has Responses API image generation access for ${cutoutGenerationModel}.`);
  }
}

async function createCutoutImageWithResponses({
  openAiApiKey,
  sourceImage,
  styleReferenceImage,
  prompt,
  settings,
}: {
  openAiApiKey: string;
  prompt: string;
  settings: CutoutSettings;
  sourceImage: ImageInput;
  styleReferenceImage: ImageInput | null;
}) {
  const content: Array<Record<string, string>> = [
    {
      text: prompt,
      type: "input_text",
    },
    {
      image_url: toImageDataUrl(sourceImage),
      type: "input_image",
    },
  ];

  if (styleReferenceImage) {
    content.push({
      image_url: toImageDataUrl(styleReferenceImage),
      type: "input_image",
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          content,
          role: "user",
        },
      ],
      model: cutoutGenerationModel,
      tool_choice: { type: "image_generation" },
      tools: [
        {
          action: "edit",
          background: settings.removeBackground ? "transparent" : "auto",
          output_format: "png",
          quality: settings.editMode === "conservative" ? "high" : "medium",
          size: "1536x1024",
          type: "image_generation",
        },
      ],
    }),
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const result = await parseOpenAIJsonResponse(response);

  if (!response.ok) {
    throw new Error(result.error?.message || `${cutoutGenerationModelLabel} image generation is not available.`);
  }

  const imageResult = result.output?.find((output) => (
    output.type === "image_generation_call" && typeof output.result === "string"
  ));

  if (!imageResult?.result) {
    throw new Error(`${cutoutGenerationModelLabel} did not return an image preview.`);
  }

  return {
    buffer: Buffer.from(imageResult.result, "base64"),
    model: cutoutGenerationModel,
    modelLabel: cutoutGenerationModelLabel,
    revisedPrompt: imageResult.revised_prompt ?? null,
  };
}

export async function POST() {
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
    error: adminAssistedHeroMessage,
    mode: "admin_assisted",
  }, { status: 409 });
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
    configured: false,
    message: adminAssistedHeroMessage,
    model: cutoutGenerationModel,
    modelLabel: cutoutGenerationModelLabel,
    mode: "admin_assisted",
  });
}
