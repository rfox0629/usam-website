import { NextResponse } from "next/server";
import { getOperationsAuthorization } from "@/src/lib/operations/auth";
import { createDocumentAccessUrl } from "@/src/lib/documents/library";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await getOperationsAuthorization();

  if (authorization.status !== "authorized") {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await params;
  const { error, url } = await createDocumentAccessUrl({ authorization, documentId: id });

  if (error || !url) {
    return NextResponse.json({ error: error ?? "Document not found." }, { status: 403 });
  }

  return NextResponse.redirect(url);
}
