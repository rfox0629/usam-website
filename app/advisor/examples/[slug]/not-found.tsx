import Link from "next/link";
import { PrimaryNav } from "@/components/PrimaryNav";

export default function AdvisorExampleNotFound() {
  return (
    <main className="min-h-screen bg-white" data-advisor-doc>
      <PrimaryNav minimal />
      <div className="flex min-h-[calc(100vh-88px)] items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm rounded-md border border-[#E5E8EF] bg-white px-7 py-10 text-center">
          <h1 className="text-[26px] font-semibold text-[#0B1220]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Not available
          </h1>
          <p className="mt-5 text-[14.5px] leading-[1.7] text-[#3D4654]">
            This example is not available right now.
          </p>
          <Link
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-sm bg-[#0B1220] px-5 py-2.5 text-[14px] font-medium text-white"
            href="/advisor"
          >
            Back to the briefing
          </Link>
        </div>
      </div>
    </main>
  );
}
