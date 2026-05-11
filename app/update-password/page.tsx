import type { Metadata } from "next";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

export const metadata: Metadata = {
  title: "Update Password | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export default function UpdatePasswordPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-6 py-24 text-stone-100">
      <UpdatePasswordForm />
    </main>
  );
}
