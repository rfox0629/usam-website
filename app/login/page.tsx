import type { Metadata } from "next";
import { signInAdmin } from "./actions";

export const metadata: Metadata = {
  title: "Admin Login | USA Missionaries",
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
  missing: "Enter an email and password to continue.",
  "not-admin": "This email is not approved for admin access.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//")
    ? params.next
    : "/admin/dashboard";
  const error = params.error ? errors[params.error] : undefined;

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-24 text-stone-100">
      <section className="mx-auto max-w-xl border border-stone-800 bg-stone-950/70 p-7 md:p-9">
        <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
          Internal Access
        </p>
        <h1 className="mt-5 text-4xl font-bold uppercase leading-none text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
          Admin Login
        </h1>
        <p className="mt-5 text-sm leading-7 text-stone-400">
          Sign in with your approved Supabase account. Access is limited to emails listed in the admin allowlist.
        </p>
        {error ? (
          <p className="mt-5 border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-200">
            {error}
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
              className="mt-2 min-h-12 w-full border border-stone-800 bg-[#050505] px-4 text-stone-100 outline-none transition-colors focus:border-[#D4A63D]"
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
              className="mt-2 min-h-12 w-full border border-stone-800 bg-[#050505] px-4 text-stone-100 outline-none transition-colors focus:border-[#D4A63D]"
              name="password"
              required
              type="password"
            />
          </label>
          <button
            className="inline-flex min-h-12 w-full items-center justify-center bg-[#D4A63D] px-6 py-3 text-xs uppercase tracking-[0.24em] text-black transition-all hover:bg-[#F5B942]"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="submit"
          >
            Sign In
          </button>
        </form>
      </section>
    </main>
  );
}
