import { NextResponse } from "next/server";
import { canEditAdminContent, getAdminAuthorization } from "@/src/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 45;

type SummarizeEncounterPayload = {
  originalTestimony?: unknown;
  submitterName?: unknown;
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

function enforceSummaryPunctuation(text: string) {
  return text
    .replace(/[—–]/g, "-")
    .trim();
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

  let payload: SummarizeEncounterPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const originalTestimony = asString(payload.originalTestimony);
  const submitterName = asString(payload.submitterName) || "the person who shared this encounter";

  if (!originalTestimony) {
    return NextResponse.json({ error: "Add the original testimony before summarizing." }, { status: 400 });
  }

  const openAiApiKey = process.env.OPENAI_API_KEY;

  if (!openAiApiKey) {
    return NextResponse.json({ error: "OpenAI encounter summarization is not configured." }, { status: 500 });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          content: [
            {
              text: [
                `Submitter: ${submitterName}`,
                "",
                "Original testimony or review:",
                originalTestimony,
              ].join("\n"),
              type: "input_text",
            },
          ],
          role: "user",
        },
      ],
      instructions: [
        "You summarize missionary encounter testimonies for USA Missionaries admin review.",
        "Write only a short public summary, one to three sentences.",
        "Keep the meaning close to the original.",
        "Do not add facts, names, outcomes, scripture references, locations, or details that were not provided.",
        "Do not over polish.",
        "Keep it warm, clear, faithful, and natural.",
        "Never use em dashes. Use commas, periods, semicolons, or standard hyphens only.",
        "Return only the public summary text. Do not include labels, notes, or markdown.",
      ].join(" "),
      max_output_tokens: 350,
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
      error: result.error?.message || "We could not summarize the encounter. Please try again.",
    }, { status: 500 });
  }

  const publicSummary = enforceSummaryPunctuation(extractResponseText(result));

  if (!publicSummary) {
    return NextResponse.json({ error: "OpenAI did not return a public summary." }, { status: 500 });
  }

  return NextResponse.json({
    publicSummary,
  });
}
