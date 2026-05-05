import { NextResponse } from "next/server";
import { getAdminAuthorization } from "@/src/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 45;

type RefineStoryPayload = {
  householdName?: unknown;
  originalStory?: unknown;
};

type OpenAITextResponse = {
  error?: {
    message?: string;
  };
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
    type?: string;
  }>;
  output_text?: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractResponseText(response: OpenAITextResponse) {
  if (typeof response.output_text === "string") {
    return response.output_text.trim();
  }

  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim();
}

function enforceStoryPunctuation(text: string) {
  return text
    .replace(/[—–]/g, "-")
    .trim();
}

export async function POST(request: Request) {
  const authorization = await getAdminAuthorization();

  if (authorization.status === "unauthenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (authorization.status === "unauthorized") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  if (authorization.status === "configuration_error") {
    return NextResponse.json({ error: authorization.message }, { status: 500 });
  }

  let payload: RefineStoryPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const originalStory = asString(payload.originalStory);
  const householdName = asString(payload.householdName) || "this missionary household";

  if (!originalStory) {
    return NextResponse.json({ error: "Add an original story before refining." }, { status: 400 });
  }

  const openAiApiKey = process.env.OPENAI_API_KEY;

  if (!openAiApiKey) {
    return NextResponse.json({ error: "OpenAI story refinement is not configured." }, { status: 500 });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          content: [
            {
              text: [
                `Missionary household: ${householdName}`,
                "",
                "Original story:",
                originalStory,
              ].join("\n"),
              type: "input_text",
            },
          ],
          role: "user",
        },
      ],
      instructions: [
        "You refine missionary household profile stories for USA Missionaries.",
        "Create a public-facing version that flows better while staying close to the original meaning.",
        "Keep the voice personal, faithful, warm, and clear.",
        "Do not over polish the story.",
        "Do not add facts, dates, outcomes, names, locations, promises, or details that were not provided.",
        "Do not remove important spiritual details, calling language, prayer details, testimony, or faith language.",
        "Use readable paragraphs.",
        "If the story is written from a couple or household perspective, write as Ryan and Brooke or as we/us when appropriate.",
        "Never use em dashes. Use commas, periods, semicolons, or standard hyphens only.",
        "Return only the refined story text. Do not include a title, notes, or markdown.",
      ].join(" "),
      max_output_tokens: 1800,
      model: process.env.OPENAI_TEXT_MODEL || "gpt-5.2",
    }),
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const result = await response.json() as OpenAITextResponse;

  if (!response.ok) {
    return NextResponse.json({
      error: result.error?.message || "We could not refine the story. Please try again.",
    }, { status: 500 });
  }

  const refinedStory = enforceStoryPunctuation(extractResponseText(result));

  if (!refinedStory) {
    return NextResponse.json({ error: "OpenAI did not return a refined story." }, { status: 500 });
  }

  return NextResponse.json({
    refinedStory,
  });
}
