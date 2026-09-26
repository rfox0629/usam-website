import { redirect } from "next/navigation";
import { dosSignInHref } from "@/src/lib/auth/reset-next";

// USA-289: old DOS sign-in address. There is one DOS sign-in page.
export default async function RetiredDosSignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  redirect(dosSignInHref(next));
}
