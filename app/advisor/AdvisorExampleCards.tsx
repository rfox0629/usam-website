import Link from "next/link";
import type { AdvisorExample } from "@/src/lib/advisor-content";

/**
 * The two doors into the dashboard concepts.
 *
 * Deliberately large, tappable cards rather than inline links: from the
 * briefing these are the moment where the idea stops being described and
 * starts being shown.
 */

const font = { oswald: "'Oswald', sans-serif" };

export function AdvisorExampleCards({ examples, note }: { examples: AdvisorExample[]; note?: string }) {
  if (examples.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {examples.map((example) => (
          <Link
            className="group flex min-h-[132px] flex-col justify-between rounded-lg border border-[#E5E8EF] bg-white p-5 transition-colors hover:border-[#0B1220]"
            href={`/advisor/examples/${example.slug}`}
            key={example.slug}
          >
            <div className="min-w-0">
              {example.kicker ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B7686]">
                  {example.kicker}
                </p>
              ) : null}
              <p
                className="mt-1.5 break-words text-[18px] font-semibold leading-tight text-[#0B1220]"
                style={{ fontFamily: font.oswald }}
              >
                {example.name}
              </p>
            </div>
            <p className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-medium text-[#1E3FB8]">
              See the example
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                &rarr;
              </span>
            </p>
          </Link>
        ))}
      </div>
      {note ? <p className="mt-3 max-w-[36rem] text-[13.5px] leading-[1.65] text-[#6B7686]">{note}</p> : null}
    </div>
  );
}
