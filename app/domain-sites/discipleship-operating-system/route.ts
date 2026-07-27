import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import {
  domainRouteHeader,
  getAlternateDomainSiteByHostname,
  isDirectDomainSitePreviewAllowed,
} from "@/src/lib/domain-sites";

const siteKey = "discipleship-operating-system";
const dosV4SourcePath = join(process.cwd(), "dos.html");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function canServeDosPreview(request: NextRequest) {
  const routedSite = getAlternateDomainSiteByHostname(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );

  if (isDirectDomainSitePreviewAllowed() && !routedSite) {
    return true;
  }

  return request.headers.get(domainRouteHeader) === siteKey && routedSite?.key === siteKey;
}

function buildDosV4Html() {
  const sourceHtml = readFileSync(dosV4SourcePath, "utf8");

  return sourceHtml
    .replace('<a class="btn btn-primary" href="#">Request Access</a>', '<a class="btn btn-primary" href="/ecosystem">Request Access</a>')
    .replace('<a class="btn btn-ghost-d" href="#">Schedule a Walkthrough</a>', '<a class="btn btn-ghost-d" href="/ecosystem">Schedule a Walkthrough</a>')
    .replace('<a href="#">Contact</a>', '<a href="/support">Contact</a>');
}

function htmlResponse(body: string | null, status = 200) {
  return new NextResponse(body, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "text/html; charset=utf-8",
      "X-DOS-V4-Source-SHA": "1ef29cff27e980d6ca5aee7be6cc4070dbde6927",
    },
    status,
  });
}

export async function GET(request: NextRequest) {
  if (!canServeDosPreview(request)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return htmlResponse(buildDosV4Html());
}

export async function HEAD(request: NextRequest) {
  if (!canServeDosPreview(request)) {
    return new NextResponse(null, { status: 404 });
  }

  return htmlResponse(null);
}
