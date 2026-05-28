"use client";

import { type EmailOtpType } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient, isSupabaseBrowserConfigured } from "@/src/lib/supabase/client";

function parseHashParams() {
  if (typeof window === "undefined" || !window.location.hash) {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

function redirectWithError(message = "auth-link") {
  window.location.replace(`/login?error=${encodeURIComponent(message)}`);
}

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value === "signup"
    || value === "invite"
    || value === "magiclink"
    || value === "recovery"
    || value === "email_change"
    || value === "email";
}

export function AuthSessionBridge() {
  const supabase = useMemo(() => (
    isSupabaseBrowserConfigured() ? createSupabaseBrowserClient() : null
  ), []);
  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    if (!supabase) {
      redirectWithError("config");
      return;
    }

    const client = supabase;
    let isMounted = true;

    async function completeSession() {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = parseHashParams();
      const nextPath = safeNextPath(searchParams.get("next"));
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const tokenType = searchParams.get("type");
      const urlError = searchParams.get("error_description")
        || searchParams.get("error")
        || hashParams.get("error_description")
        || hashParams.get("error");

      if (urlError) {
        redirectWithError(urlError);
        return;
      }

      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);

        if (error) {
          redirectWithError(error.message);
          return;
        }

        if (!isMounted) {
          return;
        }

        setMessage("Opening admin...");
        window.location.replace(nextPath);
        return;
      }

      if (tokenHash && isEmailOtpType(tokenType)) {
        const { error } = await client.auth.verifyOtp({
          token_hash: tokenHash,
          type: tokenType,
        });

        if (error) {
          redirectWithError(error.message);
          return;
        }

        if (!isMounted) {
          return;
        }

        setMessage(tokenType === "recovery" ? "Opening password reset..." : "Opening admin...");
        window.location.replace(tokenType === "recovery" ? "/update-password" : nextPath);
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      if (!accessToken || !refreshToken) {
        redirectWithError("missing-auth-token");
        return;
      }

      const { error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        redirectWithError(error.message);
        return;
      }

      if (!isMounted) {
        return;
      }

      setMessage(type === "recovery" ? "Opening password reset..." : "Opening admin...");
      window.location.replace(type === "recovery" ? "/update-password" : nextPath);
    }

    void completeSession();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  return (
    <section className="mx-auto max-w-xl border border-stone-800 bg-stone-950/70 p-7 text-center md:p-9">
      <p className="text-sm leading-6 text-stone-300">{message}</p>
    </section>
  );
}
