import { redirect } from "next/navigation";

// USA-289: retired DOS signup link (old emails, bookmarks). Asking for DOS is
// a reviewed request at /dos/setup; nothing here creates an account.
export default function RetiredDosSignupPage() {
  redirect("/dos/setup");
}
