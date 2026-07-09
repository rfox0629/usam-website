import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PARTNERS_ACCESS_COOKIE_NAME, isPartnersAccessTokenValid } from "@/src/lib/partners-access";
import { PARTNERS_DOCUMENTS_BUCKET, getPartnersDocumentById } from "@/src/lib/partners-documents";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const hasAccess = await isPartnersAccessTokenValid(cookieStore.get(PARTNERS_ACCESS_COOKIE_NAME)?.value);

  if (!hasAccess) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Document storage is not configured yet." }, { status: 500 });
  }

  const { id } = await params;
  const document = await getPartnersDocumentById(id);

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(PARTNERS_DOCUMENTS_BUCKET)
    .createSignedUrl(document.filePath, 300, { download: document.docName });

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Unable to retrieve that document right now." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
