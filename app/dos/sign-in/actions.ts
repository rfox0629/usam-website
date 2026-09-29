"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { dosSignInHref, RESET_NEXT_COOKIE_NAME, safeDosNextPath } from "@/src/lib/auth/reset-next";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/src/lib/supabase/server";

// USA-289: the DOS sign-in page has one email field and three choices:
// sign in with a password, email a sign-in link, or email a link to set or
// reset the password. None of them creates an account (shouldCreateUser is
// false); access still comes only from an approved request.

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function requestOrigin() {
  const headersList = await headers();
  const origin = headersList.get("origin");

  if (origin) {
    return origin;
  }

  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

export async function dosSignIn(formData: FormData) {
  const email = field(formData, "email").toLowerCase();
  const intent = field(formData, "intent");
  const next = safeDosNextPath(field(formData, "next"));
  const back = (extra: Record<string, string>): never => redirect(dosSignInHref(next, extra));

  if (!email || !email.includes("@")) {
    back({ error: "email-missing" });
  }

  if (!isSupabaseServerConfigured()) {
    back({ error: "config" });
  }

  const supabase = await createSupabaseServerClient();

  if (intent === "link") {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${await requestOrigin()}/auth/session?next=${encodeURIComponent(next)}`,
        shouldCreateUser: false,
      },
    });

    back(error ? { error: "link-failed" } : { magic: "email-sent" });
  }

  if (intent === "reset") {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${await requestOrigin()}/update-password`,
    });

    if (error) {
      back({ error: "reset-failed" });
    }

    // After the reset, /login?reset=success reads this and forwards here.
    (await cookies()).set(RESET_NEXT_COOKIE_NAME, next, {
      httpOnly: true,
      maxAge: 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    back({ reset: "email-sent" });
  }

  const password = field(formData, "password");

  if (!password) {
    back({ error: "password-missing" });
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    back({ error: "invalid" });
  }

  redirect(next);
}
