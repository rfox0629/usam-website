"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient, isSupabaseBrowserConfigured } from "@/src/lib/supabase/client";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type RecoveryStatus = "checking" | "error" | "ready" | "success";

function recoveryErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("expired") || normalized.includes("invalid") || normalized.includes("otp")) {
    return "This reset link has expired or has already been used. Request a new password reset email and try again.";
  }

  return message || "We could not verify this password reset link. Request a new reset email and try again.";
}

function passwordErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("password")) {
    return message;
  }

  if (normalized.includes("weak") || normalized.includes("invalid")) {
    return "Choose a stronger password and try again.";
  }

  return message || "We could not update your password. Try again with a stronger password.";
}

function parseHashParams() {
  if (typeof window === "undefined" || !window.location.hash) {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

function cleanRecoveryUrl() {
  const { origin, pathname } = window.location;
  window.history.replaceState({}, document.title, `${origin}${pathname}`);
}

export function UpdatePasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => (
    isSupabaseBrowserConfigured() ? createSupabaseBrowserClient() : null
  ), []);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<RecoveryStatus>("checking");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setErrorMessage("Supabase Auth is not configured for this environment.");
      setStatus("error");
      return;
    }

    const client = supabase;
    let isMounted = true;

    async function initializeRecoverySession() {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = parseHashParams();
      const urlError = searchParams.get("error_description")
        || searchParams.get("error")
        || hashParams.get("error_description")
        || hashParams.get("error");

      if (urlError) {
        setErrorMessage(recoveryErrorMessage(urlError));
        setStatus("error");
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const recoveryType = hashParams.get("type");

      try {
        if (accessToken && refreshToken && (!recoveryType || recoveryType === "recovery")) {
          const { error } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }

          if (isMounted) {
            cleanRecoveryUrl();
            setErrorMessage("");
            setStatus("ready");
          }
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await client.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          if (isMounted) {
            setErrorMessage("");
            setStatus("ready");
          }
          return;
        }

        if (isMounted) {
          setErrorMessage("Open the password reset link from your email to set a new password.");
          setStatus("error");
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(recoveryErrorMessage(error instanceof Error ? error.message : ""));
          setStatus("error");
        }
      }
    }

    void initializeRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setErrorMessage("Supabase Auth is not configured for this environment.");
      setStatus("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Use at least 8 characters for your new password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setErrorMessage(passwordErrorMessage(error.message));
      setIsSubmitting(false);
      return;
    }

    setStatus("success");
    await supabase.auth.signOut();
    window.setTimeout(() => {
      router.push("/login?reset=success");
    }, 1400);
  }

  const isReady = status === "ready";

  return (
    <section className="mx-auto max-w-xl border border-stone-800 bg-stone-950/70 p-7 md:p-9">
      <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
        Password Recovery
      </p>
      <h1 className="mt-5 text-4xl font-bold uppercase leading-none text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
        Update Password
      </h1>
      <p className="mt-5 text-sm leading-7 text-stone-400">
        Enter a new password for your USA Missionaries admin account. Reset links can only be used once and may expire.
      </p>

      {status === "checking" ? (
        <p className="mt-6 border border-stone-800 bg-[#050505] p-4 text-sm text-stone-300">
          Verifying your reset link...
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-6 border border-red-500/30 bg-red-950/20 p-4 text-sm leading-6 text-red-200">
          {errorMessage}
        </p>
      ) : null}

      {status === "success" ? (
        <p className="mt-6 border border-[#D4A63D]/30 bg-[#D4A63D]/10 p-4 text-sm leading-6 text-stone-100">
          Your password has been updated. Redirecting you to sign in...
        </p>
      ) : null}

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.2em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            New Password
          </span>
          <input
            autoComplete="new-password"
            className="mt-2 min-h-12 w-full border border-stone-800 bg-[#050505] px-4 text-stone-100 outline-none transition-colors focus:border-[#D4A63D] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isReady || isSubmitting}
            minLength={8}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type="password"
            value={newPassword}
          />
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.2em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Confirm Password
          </span>
          <input
            autoComplete="new-password"
            className="mt-2 min-h-12 w-full border border-stone-800 bg-[#050505] px-4 text-stone-100 outline-none transition-colors focus:border-[#D4A63D] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isReady || isSubmitting}
            minLength={8}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </label>

        <button
          className="inline-flex min-h-12 w-full items-center justify-center bg-[#D4A63D] px-6 py-3 text-xs uppercase tracking-[0.24em] text-black transition-all hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!isReady || isSubmitting}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="submit"
        >
          {isSubmitting ? "Updating" : "Update Password"}
        </button>
      </form>
    </section>
  );
}
