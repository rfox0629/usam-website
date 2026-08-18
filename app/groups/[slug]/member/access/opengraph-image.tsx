import { ImageResponse } from "next/og";
import {
  peekDemoGroupMemberAccessToken,
  peekGroupMemberAccessToken,
} from "@/src/lib/groups/member-access";
import { demoGroupMemberAccessTokenPrefix } from "@/src/lib/groups/demo-member-access";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";
export const alt = "DOS Group Home";
export const size = { height: 630, width: 1200 };
export const contentType = "image/png";

/**
 * This card is what iMessage/social unfurlers render for an invitation link.
 * It must never include the participant's name, progress, email, token, or
 * address — only the group name and a generic, safe call to action. Reading
 * the token here uses the read-only peek, never the mutating claim.
 */
export default async function Image(
  { params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> },
) {
  const { slug } = await params;
  const query = await searchParams;
  const tokenValue = query.token;
  const token = Array.isArray(tokenValue) ? tokenValue[0] ?? "" : tokenValue ?? "";

  const peek = token.trim().startsWith(demoGroupMemberAccessTokenPrefix)
    ? peekDemoGroupMemberAccessToken(token, slug)
    : isSupabaseAdminConfigured()
      ? await peekGroupMemberAccessToken(createSupabaseAdminClient(), token)
      : { status: "invalid" as const };

  const groupName = peek.status === "ready" ? peek.groupName ?? "Your Group" : "Group access";
  const description = peek.status === "ready" ? "Your Discipleship Journey is ready." : "This secure link is not currently active.";

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "flex-start",
          background: "#F8FBFF",
          backgroundImage:
            "radial-gradient(circle at 78% 8%, rgba(219,234,254,0.9), transparent 34%), linear-gradient(135deg, #F8FBFF 0%, #F6F8FF 48%, #FFFFFF 100%)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "80px",
          width: "100%",
        }}
      >
        <span
          style={{
            color: "#1D4ED8",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          DOS
        </span>
        <span
          style={{
            color: "#0F172A",
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            marginTop: 24,
          }}
        >
          {groupName}
        </span>
        <span
          style={{
            color: "#475569",
            fontSize: 34,
            fontWeight: 600,
            marginTop: 20,
          }}
        >
          {description}
        </span>
        <div
          style={{
            alignItems: "center",
            background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
            borderRadius: 999,
            color: "#FFFFFF",
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
            justifyContent: "center",
            marginTop: 48,
            padding: "18px 40px",
            width: "fit-content",
          }}
        >
          Open Group Home
        </div>
      </div>
    ),
    { ...size }
  );
}
