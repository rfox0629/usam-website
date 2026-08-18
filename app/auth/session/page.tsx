import type { Metadata } from "next";
import { AuthSessionBridge } from "./AuthSessionBridge";

export const metadata: Metadata = {
  title: "Completing Sign In",
  robots: {
    follow: false,
    index: false,
  },
};

export default function AuthSessionPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-6 py-24 text-stone-100">
      <AuthSessionBridge />
    </main>
  );
}
