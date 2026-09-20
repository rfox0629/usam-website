import type { ReactNode } from "react";
import type {
  AdvisorBlock,
  AdvisorBriefingContent,
  AdvisorSection,
} from "@/src/lib/advisor-content";
import { AdvisorLinkAccordion } from "./AdvisorLinkAccordion";
import { AdvisorPrintButton } from "./AdvisorPrintButton";
import { AdvisorTabs } from "./AdvisorTabs";
import type { AdvisorTabPanel } from "./AdvisorTabs";

/**
 * A generic, content-driven briefing layout.
 *
 * Every name, figure, link, and question on this page arrives through the
 * `content` prop, which the server decodes from ADVISOR_BRIEFING_CONTENT only
 * after the access cookie has been validated. Nothing private is hardcoded
 * here — this file is safe to read in a public repository.
 */

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

/* ---------------------------------------------------------------------- */
/* EDITORIAL PRIMITIVES (mirrors app/vision/page.tsx conventions)          */
/* ---------------------------------------------------------------------- */

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="flex items-center gap-4 text-[11px] uppercase tracking-[0.28em] text-usam-gold"
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
      <span aria-hidden="true" className="h-px w-14 bg-usam-gold/55" />
    </p>
  );
}

function SectionHeading({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2
      className="mt-5 max-w-3xl break-words text-[clamp(1.9rem,4vw,2.75rem)] font-bold leading-[1.1] text-stone-100"
      id={id}
      style={{ fontFamily: font.oswald }}
    >
      {children}
    </h2>
  );
}

function Lede({ children }: { children: ReactNode }) {
  return <p className="mt-5 max-w-3xl break-words text-lg leading-8 text-stone-400">{children}</p>;
}

/* ---------------------------------------------------------------------- */
/* BLOCK RENDERERS                                                         */
/* ---------------------------------------------------------------------- */

function Figures({ items, note }: { items: { label: string; note?: string; value: string }[]; note?: string }) {
  return (
    <div className="mt-8">
      <dl className="grid grid-cols-1 gap-px bg-stone-800 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((figure) => (
          <div className="bg-usam-black px-5 py-6" key={`${figure.label}-${figure.value}`}>
            <dt
              className="break-words text-[11px] font-bold uppercase leading-5 tracking-[0.18em] text-stone-500"
              style={{ fontFamily: font.rajdhani }}
            >
              {figure.label}
            </dt>
            <dd
              className="mt-2 break-words text-[clamp(1.5rem,3vw,2rem)] font-bold leading-none text-usam-gold"
              style={{ fontFamily: font.oswald }}
            >
              {figure.value}
            </dd>
            {/* The note is what keeps distinct measures from blurring together
                (cumulative giving is not cash on hand, and so on). */}
            {figure.note ? <p className="mt-3 text-[13px] leading-6 text-stone-400">{figure.note}</p> : null}
          </div>
        ))}
      </dl>
      {note ? <p className="mt-4 max-w-3xl text-[13.5px] leading-7 text-stone-500">{note}</p> : null}
    </div>
  );
}

function Table({ caption, columns, rows }: { caption?: string; columns: string[]; rows: string[][] }) {
  return (
    <figure className="mt-8">
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-left">
          <thead>
            <tr className="border-y border-stone-800">
              {columns.map((column) => (
                <th
                  className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500"
                  key={column}
                  scope="col"
                  style={{ fontFamily: font.rajdhani }}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr className="border-b border-stone-800/70" key={`row-${rowIndex}-${row[0] ?? ""}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    className={`break-words px-4 py-3.5 align-top text-[14.5px] leading-7 ${
                      cellIndex === 0 ? "text-stone-200" : "text-stone-400"
                    }`}
                    key={`cell-${rowIndex}-${cellIndex}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? (
        <figcaption className="mt-3 text-[13px] leading-6 text-stone-500">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

function Callout({ text, title, tone = "neutral" }: { text: string; title?: string; tone?: "neutral" | "gold" | "warning" }) {
  const accents = {
    gold: "border-usam-gold/60 bg-usam-gold/[0.05]",
    neutral: "border-stone-800 bg-white/[0.015]",
    warning: "border-amber-500/50 bg-amber-500/[0.04]",
  } as const;

  return (
    <div className={`mt-8 max-w-3xl border-l-2 px-6 py-5 ${accents[tone]}`}>
      {title ? (
        <p
          className="text-[11px] font-bold uppercase tracking-[0.2em] text-usam-gold"
          style={{ fontFamily: font.rajdhani }}
        >
          {title}
        </p>
      ) : null}
      <p className={`break-words text-[15px] leading-8 text-stone-300 ${title ? "mt-3" : ""}`}>{text}</p>
    </div>
  );
}

function Questions({ items }: { items: { detail?: string; prompt: string }[] }) {
  return (
    <ol className="mt-8 divide-y divide-stone-800 border-y border-stone-800">
      {items.map((question, index) => (
        <li className="flex gap-5 py-6" key={question.prompt}>
          <span
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-usam-gold/50 text-[12px] font-bold text-usam-gold"
            style={{ fontFamily: font.rajdhani }}
          >
            {index + 1}
          </span>
          <div className="min-w-0 max-w-2xl">
            <p className="break-words text-[16.5px] font-medium leading-8 text-stone-200" style={{ fontFamily: font.oswald }}>
              {question.prompt}
            </p>
            {question.detail ? (
              <p className="mt-2 text-[14.5px] leading-7 text-stone-400">{question.detail}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Block({ block }: { block: AdvisorBlock }) {
  switch (block.type) {
    case "paragraph":
      return <p className="mt-5 max-w-3xl break-words text-[15.5px] leading-8 text-stone-400">{block.text}</p>;

    case "bullets":
      return (
        <ul className="mt-6 max-w-3xl space-y-3">
          {block.items.map((item) => (
            <li className="flex gap-3 break-words text-[15.5px] leading-8 text-stone-400" key={item}>
              <span aria-hidden="true" className="mt-[14px] h-px w-4 flex-shrink-0 bg-usam-gold/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case "steps":
      return (
        <div className="mt-8 flex flex-col divide-y divide-stone-800 border-y border-stone-800 sm:flex-row sm:divide-x sm:divide-y-0">
          {block.items.map((step, index) => (
            <div className="flex flex-1 items-center gap-3 px-5 py-4" key={step}>
              <span
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-usam-gold/50 text-[11px] font-bold text-usam-gold"
                style={{ fontFamily: font.rajdhani }}
              >
                {index + 1}
              </span>
              <span
                className="min-w-0 break-words text-[13.5px] font-medium uppercase tracking-[0.04em] text-stone-300"
                style={{ fontFamily: font.rajdhani }}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      );

    case "quote":
      return (
        <blockquote className="mt-8 max-w-3xl border-l-2 border-usam-gold/70 pl-6">
          <p className="break-words text-xl font-medium leading-8 text-stone-200" style={{ fontFamily: font.oswald }}>
            {block.text}
          </p>
          {block.attribution ? (
            <footer
              className="mt-3 text-[12px] uppercase tracking-[0.2em] text-stone-500"
              style={{ fontFamily: font.rajdhani }}
            >
              {block.attribution}
            </footer>
          ) : null}
        </blockquote>
      );

    case "figures":
      return <Figures items={block.items} note={block.note} />;

    case "table":
      return <Table caption={block.caption} columns={block.columns} rows={block.rows} />;

    case "callout":
      return <Callout text={block.text} title={block.title} tone={block.tone} />;

    case "questions":
      return <Questions items={block.items} />;

    case "tabs": {
      const panels: AdvisorTabPanel[] = block.tabs.map((tab) => ({
        caption: tab.caption,
        content: <Blocks blocks={tab.blocks} />,
        id: tab.id,
        label: tab.label,
      }));

      return <AdvisorTabs note={block.note} panels={panels} />;
    }

    case "links":
      return <AdvisorLinkAccordion groups={block.groups} />;

    default:
      return null;
  }
}

function Blocks({ blocks }: { blocks: AdvisorBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => (
        <Block block={block} key={`${block.type}-${index}`} />
      ))}
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* SECTIONS & SHELL                                                        */
/* ---------------------------------------------------------------------- */

function Section({ section }: { section: AdvisorSection }) {
  const backgrounds = {
    feature:
      "relative overflow-hidden border-y border-stone-900/80 bg-[radial-gradient(circle_at_18%_10%,rgba(194,161,78,0.1),transparent_28%),linear-gradient(180deg,rgba(13,13,13,0.4),#0D0D0D_18%)]",
    panel: "border-y border-stone-900/80 bg-white/[0.015]",
    plain: "",
  } as const;

  return (
    <section
      className={`scroll-mt-24 px-6 py-16 md:py-24 ${backgrounds[section.variant ?? "plain"]}`}
      id={section.id}
    >
      <div className="relative mx-auto max-w-5xl">
        {section.eyebrow ? <Eyebrow>{section.eyebrow}</Eyebrow> : null}
        <SectionHeading>{section.heading}</SectionHeading>
        {section.lede ? <Lede>{section.lede}</Lede> : null}
        <Blocks blocks={section.blocks} />
      </div>
    </section>
  );
}

function SectionRail({ sections }: { sections: AdvisorSection[] }) {
  return (
    <nav
      aria-label="Section navigation"
      className="no-print sticky top-0 z-30 overflow-x-auto border-b border-stone-800/70 bg-[rgba(13,13,13,0.95)] px-4 py-2.5"
      style={{ backdropFilter: "blur(10px)" }}
    >
      <ul className="flex w-max gap-5">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              className="whitespace-nowrap text-[11px] uppercase tracking-[0.16em] text-stone-500 transition-colors hover:text-usam-gold"
              href={`#${section.id}`}
              style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
            >
              {section.navLabel}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AdvisorBriefing({ content }: { content: AdvisorBriefingContent }) {
  const { meta, sections } = content;

  return (
    <div className="bg-usam-black text-stone-100">
      <SectionRail sections={sections} />

      <header className="relative overflow-hidden border-b border-stone-900/80 px-6 py-20 md:py-28" id="cover">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_620px_at_50%_-12%,rgba(194,161,78,0.14),transparent_60%)]"
        />

        <div className="relative mx-auto max-w-5xl">
          <p
            className="text-[12px] uppercase tracking-[0.34em] text-usam-gold"
            style={{ fontFamily: font.rajdhani }}
          >
            USA Missionaries
          </p>
          <h1
            className="mt-5 max-w-3xl break-words text-[clamp(2.25rem,5.5vw,3.75rem)] font-bold leading-[1.05] text-stone-100"
            style={{ fontFamily: font.oswald }}
          >
            {meta.title}
          </h1>
          {meta.subtitle ? (
            <p className="mt-6 max-w-2xl break-words text-lg leading-8 text-stone-400">{meta.subtitle}</p>
          ) : null}

          {meta.preparedFor || meta.preparedBy || meta.date ? (
            <dl className="mt-10 flex flex-col gap-5 border-t border-stone-800 pt-8 sm:flex-row sm:gap-12">
              {[
                { label: "Prepared for", value: meta.preparedFor },
                { label: "Prepared by", value: meta.preparedBy },
                { label: "Date", value: meta.date },
              ]
                .filter((item): item is { label: string; value: string } => Boolean(item.value))
                .map((item) => (
                  <div key={item.label}>
                    <dt
                      className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500"
                      style={{ fontFamily: font.rajdhani }}
                    >
                      {item.label}
                    </dt>
                    <dd className="mt-1.5 text-[15px] leading-7 text-stone-300">{item.value}</dd>
                  </div>
                ))}
            </dl>
          ) : null}

          <div className="mt-10">
            <AdvisorPrintButton />
          </div>

          {meta.confidentialNote ? (
            <p className="mt-10 max-w-2xl border-l-2 border-usam-gold/60 pl-5 text-[13.5px] leading-7 text-stone-500">
              {meta.confidentialNote}
            </p>
          ) : null}
        </div>
      </header>

      {sections.map((section) => (
        <Section key={section.id} section={section} />
      ))}

      {content.footerNote ? (
        <footer className="border-t border-stone-900/80 px-6 py-14">
          <p className="mx-auto max-w-5xl text-[13.5px] leading-7 text-stone-500">{content.footerNote}</p>
        </footer>
      ) : null}
    </div>
  );
}
