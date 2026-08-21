import { NextResponse } from "next/server";
import { getOperationsAuthorization } from "@/src/lib/operations/auth";
import { loadPreparationContext } from "@/src/lib/operations/restoration-preparation-store";
import {
  preparationPdfFilename,
  renderPreparationPdf,
} from "@/src/lib/operations/restoration-preparation-pdf";

export const dynamic = "force-dynamic";

/**
 * Redacted preparation summary export (USA-187).
 *
 * Generated on demand and never stored, so no file of case content sits on
 * disk. Authorization runs through the same case loader the detail page uses,
 * so this route cannot widen access to a case a reviewer could not already open.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, authorization] = await Promise.all([params, getOperationsAuthorization()]);
  const { submission, summary, unauthorized } = await loadPreparationContext({
    authorization,
    id,
    requireManage: true,
  });

  if (unauthorized || !submission) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!summary || summary.status !== "saved") {
    return new NextResponse("Save the preparation summary before exporting it.", { status: 409 });
  }

  // Notes stay out unless the reviewer explicitly asks for them.
  const includeNotes = new URL(request.url).searchParams.get("notes") === "1";
  const pdf = renderPreparationPdf(summary, { includeNotes });

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Content-Disposition": `attachment; filename="${preparationPdfFilename(summary.caseReference)}"`,
      "Content-Type": "application/pdf",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
