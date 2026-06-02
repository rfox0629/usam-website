import type { Metadata } from "next";
import { requestMagicLink, requestPasswordReset, signInAdmin } from "./actions";

export const metadata: Metadata = {
  title: "Sign In | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const errors: Record<string, string> = {
  "admin-check": "We could not verify admin permissions for this account.",
  config: "Supabase Auth is not configured for this environment.",
  inactive: "This admin user is inactive. Contact a master admin to restore access.",
  invalid: "Unable to sign in with those credentials.",
  "auth-link": "We could not complete that sign-in link. Request a new link and try again.",
  "magic-failed": "We could not send a magic link. Try again in a moment.",
  "magic-missing": "Enter the email address for your admin account.",
  "missing-auth-code": "That sign-in link is missing a valid auth code. Request a new link and try again.",
  "missing-auth-token": "That sign-in link is missing a valid session token. Request a new link and try again.",
  missing: "Enter an email and password to continue.",
  "not-admin": "This email is not approved for admin access.",
  "reset-failed": "We could not send a password reset email. Try again in a moment.",
  "reset-missing": "Enter the email address for your admin account.",
};

function isDosPath(path: string) {
  return path === "/dos" || path.startsWith("/dos/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; magic?: string; next?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//")
    ? params.next
    : "/admin";
  const isDosLogin = isDosPath(nextPath);
  const error = params.error
    ? errors[params.error] ?? "We could not complete that sign-in link. Request a new link and try again."
    : undefined;
  const success = params.reset === "success"
    ? "Your password has been updated. Sign in with your new password."
    : params.reset === "email-sent"
      ? "If that account exists, a password reset email is on the way."
      : params.magic === "email-sent"
        ? "If that account exists, a magic sign-in link is on the way."
        : undefined;

  return (
    <main className={`min-h-screen px-6 py-16 ${
      isDosLogin ? "bg-[#FAFBFD] text-[#0F172A]" : "bg-[#050505] text-stone-100"
    }`}>
      <section className={`mx-auto max-w-xl p-7 md:p-9 ${
        isDosLogin
          ? "rounded-[28px] border border-[#E2E8F0] bg-white shadow-[0_20px_56px_rgba(15,23,42,0.08)]"
          : "border border-stone-800 bg-stone-950/70"
      }`}>
        <p className="tactical-label uppercase" style={{ color: isDosLogin ? "#2563EB" : undefined, fontFamily: font.rajdhani }}>
          {isDosLogin ? "DOS" : "Internal Access"}
        </p>
        <h1 className={`mt-5 text-4xl font-bold uppercase leading-none md:text-5xl ${
          isDosLogin ? "text-[#0F172A]" : "text-stone-100"
        }`} style={{ fontFamily: font.oswald }}>
          {isDosLogin ? "DOS Sign In" : "Admin Login"}
        </h1>
        <p className={`mt-5 text-sm leading-7 ${isDosLogin ? "text-[#64748B]" : "text-stone-400"}`}>
          {isDosLogin
            ? "Sign in to open your DOS workspace."
            : "Sign in with your approved Supabase account. Access is limited to emails listed in the admin allowlist."}
        </p>
        {error ? (
          <p className="mt-5 border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className={`mt-5 border p-4 text-sm ${
            isDosLogin
              ? "rounded-2xl border-[#BFDBFE] bg-[#EBF2FF] text-[#1D4ED8]"
              : "border-usam-gold/30 bg-usam-gold/10 text-stone-100"
          }`}>
            {success}
          </p>
        ) : null}
        <form action={signInAdmin} className="mt-7 space-y-5">
          <input name="next" type="hidden" value={nextPath} />
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.2em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Email
            </span>
            <input
              autoComplete="email"
              className={`mt-2 min-h-12 w-full border px-4 outline-none transition-colors ${
                isDosLogin
                  ? "rounded-2xl border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] focus:border-[#2563EB] focus:bg-white"
                  : "border-stone-800 bg-[#050505] text-stone-100 focus:border-usam-gold"
              }`}
              name="email"
              required
              type="email"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.2em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Password
            </span>
            <input
              autoComplete="current-password"
              className={`mt-2 min-h-12 w-full border px-4 outline-none transition-colors ${
                isDosLogin
                  ? "rounded-2xl border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] focus:border-[#2563EB] focus:bg-white"
                  : "border-stone-800 bg-[#050505] text-stone-100 focus:border-usam-gold"
              }`}
              name="password"
              required
              type="password"
            />
          </label>
          <button
            className={`inline-flex min-h-12 w-full items-center justify-center px-6 py-3 text-xs uppercase tracking-[0.24em] transition-all ${
              isDosLogin
                ? "rounded-full bg-[#2563EB] text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] hover:bg-[#1D4ED8]"
                : "bg-usam-gold text-black hover:bg-usam-gold"
            }`}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="submit"
          >
            Sign In
          </button>
        </form>

        {!isDosLogin ? (
          <>
        <div className="mt-8 border-t border-stone-800 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-200" style={{ fontFamily: font.rajdhani }}>
            Email Magic Link
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            Open the link on this device to sign in without typing your password.
          </p>
          <form action={requestMagicLink} className="mt-5 space-y-4">
            <input name="next" type="hidden" value={nextPath} />
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.2em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Admin Email
              </span>
              <input
                autoComplete="email"
                className="mt-2 min-h-12 w-full border border-stone-800 bg-[#050505] px-4 text-stone-100 outline-none transition-colors focus:border-usam-gold"
                name="magic_email"
                required
                type="email"
              />
            </label>
            <button
              className="inline-flex min-h-11 w-full items-center justify-center border border-stone-700 px-6 py-3 text-xs uppercase tracking-[0.22em] text-stone-100 transition-all hover:border-usam-gold hover:text-usam-gold"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              type="submit"
            >
              Send Magic Link
            </button>
          </form>
        </div>

        <div className="mt-8 border-t border-stone-800 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-200" style={{ fontFamily: font.rajdhani }}>
            Reset Password
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            We&apos;ll send a reset link to your admin email and bring you back to the USA Missionaries password update page.
          </p>
          <form action={requestPasswordReset} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.2em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Admin Email
              </span>
              <input
                autoComplete="email"
                className="mt-2 min-h-12 w-full border border-stone-800 bg-[#050505] px-4 text-stone-100 outline-none transition-colors focus:border-usam-gold"
                name="reset_email"
                required
                type="email"
              />
            </label>
            <button
              className="inline-flex min-h-11 w-full items-center justify-center border border-stone-700 px-6 py-3 text-xs uppercase tracking-[0.22em] text-stone-100 transition-all hover:border-usam-gold hover:text-usam-gold"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              type="submit"
            >
              Send Reset Email
            </button>
          </form>
        </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
