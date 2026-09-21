import type { ReactNode } from "react";
import type {
  AdvisorBlock,
  AdvisorBriefingContent,
  AdvisorExample,
  AdvisorSection,
} from "@/src/lib/advisor-content";
import { AdvisorDashboardMockup } from "./AdvisorDashboardMockup";
import { AdvisorExampleCards } from "./AdvisorExampleCards";
import { AdvisorLinkAccordion } from "./AdvisorLinkAccordion";
import { AdvisorPrintButton } from "./AdvisorPrintButton";
import { AdvisorStickyOffsets } from "./AdvisorStickyOffsets";
import { AdvisorTabs } from "./AdvisorTabs";
import type { AdvisorTabPanel } from "./AdvisorTabs";

/**
 * A generic, content-driven briefing layout.
 *
 * Presented as a working document rather than a presentation: a light ground,
 * a narrow measure, restrained type, and hairline rules, so it reads as notes
 * being shared rather than a deck being pitched. The light treatment also lets
 * the DOS mockups sit in the page as themselves, since DOS is a light product,
 * and it makes the printed copy legible.
 *
 * Every name, figure, link, and question arrives through the `content` prop,
 * which the server decodes only after the access cookie has been validated.
 * Nothing private is hardcoded here. this file is safe to read in a public
 * repository.
 *
 * Note on styling: `stone-*` utilities are overridden site-wide for the dark
 * interface (see app/globals.css), so this file uses explicit colour values.
 */

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

/*
 * Measures. The page is one centred document column: running text, tables,
 * figure grids, link groups, and dashboard cards all share the same left and
 * right edges, so every element lines up and the margins either side are
 * equal. The column is 52rem wide (832px), which on a laptop or desktop fills
 * the screen comfortably without stretching a paragraph past about a hundred
 * characters; text inside the column stays left-aligned.
 *
 * `PROSE`, `WIDE` and `CONTAINER` are kept as separate names so a future
 * change can narrow the prose again without touching every block.
 */
const COLUMN = "mx-auto max-w-[52rem]";

/*
 * One size for every run of reading text: paragraphs, ledes, notes, captions,
 * table cells, callouts and questions. Only headings, small uppercase labels
 * and the figure values step away from it, so a section never looks like it
 * changes typeface partway down.
 */
const BODY = "text-[15.5px] leading-[1.75]";

/*
 * The site header sits above this document, and its brand mark should line up
 * with the document column rather than hugging the window. Padding has to live
 * outside the measure for the edges to meet, so the max width here is the
 * column plus the gutters the sections use.
 */
export const ADVISOR_NAV_CONTAINER = "mx-auto w-full max-w-[55rem] px-6 lg:max-w-[57rem] lg:px-10";
const PROSE = COLUMN;
const WIDE = COLUMN;
const CONTAINER = COLUMN;

/* ---------------------------------------------------------------------- */
/* EDITORIAL PRIMITIVES                                                    */
/* ---------------------------------------------------------------------- */

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className={`flex items-center gap-3 ${PROSE} text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A6D1F]`}
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
      <span aria-hidden="true" className="h-px w-10 bg-[#C2A14E]/60" />
    </p>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2
      className={`mt-3 ${PROSE} break-words text-[clamp(1.6rem,3vw,2.15rem)] font-semibold leading-[1.2] text-[#0B1220]`}
      style={{ fontFamily: font.oswald }}
    >
      {children}
    </h2>
  );
}

function Lede({ children }: { children: ReactNode }) {
  return (
    <p className={`mt-4 ${PROSE} break-words text-[15.5px] leading-[1.75] text-[#3D4654]`}>{children}</p>
  );
}

/* ---------------------------------------------------------------------- */
/* BLOCK RENDERERS                                                         */
/* ---------------------------------------------------------------------- */

function Figures({
  items,
  note,
}: {
  items: { label: string; note?: string; value: string }[];
  note?: string;
}) {
  // Column count follows the item count, so a grid never shows an empty
  // cell: two cards make one row of two, three cards one row of three.
  const columns = items.length % 3 === 0 ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <div className="mt-6">
      <dl className={`grid grid-cols-1 gap-px ${WIDE} border border-[#E5E8EF] bg-[#E5E8EF] ${columns}`}>
        {items.map((figure) => (
          <div className="bg-white px-5 py-5" key={`${figure.label}-${figure.value}`}>
            <dt className="break-words text-[11px] font-semibold uppercase leading-5 tracking-[0.1em] text-[#6B7686]">
              {figure.label}
            </dt>
            <dd
              className="mt-1.5 break-words text-[clamp(1.35rem,2.4vw,1.7rem)] font-semibold leading-none text-[#0B1220]"
              style={{ fontFamily: font.oswald }}
            >
              {figure.value}
            </dd>
            {/* The note is what keeps distinct measures from blurring
                together; a grid of bare numbers invites a reader to take one
                for another. */}
            {figure.note ? (
              <p className="mt-2.5 text-[15.5px] leading-[1.7] text-[#5A6473]">{figure.note}</p>
            ) : null}
          </div>
        ))}
      </dl>
      {note ? <p className={`mt-4 ${PROSE} ${BODY} text-[#5A6473]`}>{note}</p> : null}
    </div>
  );
}

function Table({ caption, columns, rows }: { caption?: string; columns: string[]; rows: string[][] }) {
  return (
    <figure className={`mt-6 ${WIDE}`}>
      {/*
        A wide table on a narrow screen either scrolls sideways or clips its
        right-hand columns, and the right-hand columns are usually the ones
        that carry the judgement. Below `sm` each row becomes a labelled card
        instead, so nothing is hidden and the page never scrolls sideways.
      */}
      <div className="space-y-3 sm:hidden">
        {rows.map((row, rowIndex) => (
          <div
            className="rounded-md border border-[#E5E8EF] bg-white p-4"
            key={`card-${rowIndex}-${row[0] ?? ""}`}
          >
            <p className="break-words text-[15.5px] font-semibold leading-[1.5] text-[#0B1220]">
              {row[0]}
            </p>
            <dl className="mt-3 space-y-2">
              {columns.slice(1).map((column, columnIndex) => {
                const cell = row[columnIndex + 1];

                if (!cell) {
                  return null;
                }

                return (
                  <div key={`card-${rowIndex}-${column}`}>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7686]">
                      {column}
                    </dt>
                    <dd className="mt-0.5 break-words text-[15.5px] leading-[1.6] text-[#3D4654]">{cell}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ))}
      </div>

      <div className="hidden sm:block">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-y border-[#E5E8EF]">
              {columns.map((column) => (
                <th
                  className="break-words px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7686]"
                  key={column}
                  scope="col"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr className="border-b border-[#E5E8EF]" key={`row-${rowIndex}-${row[0] ?? ""}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    className={`break-words px-3 py-3 align-top text-[15.5px] leading-[1.6] ${
                      cellIndex === 0 ? "font-medium text-[#0B1220]" : "text-[#3D4654]"
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
        <figcaption className={`mt-3 ${BODY} text-[#5A6473]`}>{caption}</figcaption>
      ) : null}
    </figure>
  );
}

function Callout({
  text,
  title,
  tone = "neutral",
}: {
  text: string;
  title?: string;
  tone?: "neutral" | "gold" | "warning";
}) {
  const accents = {
    gold: "border-[#C2A14E] bg-[#FBF8F0]",
    neutral: "border-[#D7DBE4] bg-[#F7F8FB]",
    warning: "border-[#B45309] bg-[#FDF0D5]",
  } as const;

  return (
    <div className={`mt-6 ${PROSE} border-l-2 px-5 py-4 ${accents[tone]}`}>
      {title ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A6D1F]">{title}</p>
      ) : null}
      <p className={`break-words ${BODY} text-[#3D4654] ${title ? "mt-2" : ""}`}>
        {text}
      </p>
    </div>
  );
}

function Questions({ items }: { items: { detail?: string; prompt: string }[] }) {
  return (
    <ol className={`mt-6 ${PROSE} divide-y divide-[#E5E8EF] border-y border-[#E5E8EF]`}>
      {items.map((question, index) => (
        <li className="flex gap-4 py-5" key={question.prompt}>
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[#C2A14E] text-[12px] font-semibold text-[#8A6D1F]">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="break-words text-[15.5px] font-medium leading-[1.7] text-[#0B1220]">
              {question.prompt}
            </p>
            {question.detail ? (
              <p className={`mt-1.5 ${BODY} text-[#5A6473]`}>{question.detail}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Block({ block, examples }: { block: AdvisorBlock; examples: AdvisorExample[] }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className={`mt-4 ${PROSE} break-words text-[15.5px] leading-[1.75] text-[#3D4654]`}>
          {block.text}
        </p>
      );

    case "bullets":
      return (
        <ul className={`mt-4 ${PROSE} space-y-2.5`}>
          {block.items.map((item) => (
            <li className="flex gap-3 break-words text-[15.5px] leading-[1.7] text-[#3D4654]" key={item}>
              <span aria-hidden="true" className="mt-[12px] h-px w-3 flex-shrink-0 bg-[#C2A14E]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case "steps": {
      /*
       * The sequence reads left to right, 1 through n, so the order itself
       * carries the meaning. Cards share a row on a large screen and take
       * whatever height the longest item needs; below that they fall to two
       * columns and then to one, rather than squeezing the text.
       */
      const columns: Record<number, string> = {
        2: "lg:grid-cols-2",
        3: "lg:grid-cols-3",
        4: "lg:grid-cols-4",
        5: "lg:grid-cols-5",
        6: "lg:grid-cols-6",
      };

      return (
        <ol
          className={`mt-6 ${WIDE} grid grid-cols-1 items-stretch gap-2.5 sm:grid-cols-2 ${
            columns[block.items.length] ?? "lg:grid-cols-3"
          }`}
        >
          {block.items.map((step, index) => (
            <li
              className="flex h-full flex-col gap-2 border border-[#E5E8EF] bg-white px-3.5 py-3.5"
              key={step}
            >
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[#C2A14E] text-[11px] font-semibold text-[#8A6D1F]">
                {index + 1}
              </span>
              <span className="break-words text-[15.5px] leading-[1.6] text-[#3D4654]" style={{ hyphens: "auto" }}>
                {step}
              </span>
            </li>
          ))}
        </ol>
      );
    }

    case "quote":
      return (
        <blockquote className={`mt-6 ${PROSE} border-l-2 border-[#C2A14E] pl-5`}>
          <p className={`break-words ${BODY} text-[#0B1220]`}>{block.text}</p>
          {block.attribution ? (
            <footer className="mt-2 text-[12.5px] text-[#6B7686]">{block.attribution}</footer>
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

    case "dashboard":
      return (
        <div className={WIDE}>
          <AdvisorDashboardMockup dashboard={block.dashboard} />
        </div>
      );

    case "tabs": {
      const panels: AdvisorTabPanel[] = block.tabs.map((tab) => ({
        caption: tab.caption,
        content: <Blocks blocks={tab.blocks} examples={examples} />,
        id: tab.id,
        label: tab.label,
      }));

      return (
        <div className={WIDE}>
          <AdvisorTabs note={block.note} panels={panels} />
        </div>
      );
    }

    case "links":
      return (
        <div className={WIDE}>
          <AdvisorLinkAccordion groups={block.groups} />
        </div>
      );

    case "exampleCards": {
      // Unknown slugs are skipped rather than rendered as dead links.
      const chosen = block.slugs
        .map((slug) => examples.find((example) => example.slug === slug))
        .filter((example): example is AdvisorExample => Boolean(example));

      return (
        <div className={WIDE}>
          <AdvisorExampleCards examples={chosen} note={block.note} />
        </div>
      );
    }

    default:
      return null;
  }
}

function Blocks({ blocks, examples = [] }: { blocks: AdvisorBlock[]; examples?: AdvisorExample[] }) {
  return (
    <>
      {blocks.map((block, index) => (
        <Block block={block} examples={examples} key={`${block.type}-${index}`} />
      ))}
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* SECTIONS & SHELL                                                        */
/* ---------------------------------------------------------------------- */

function Section({ examples, section }: { examples: AdvisorExample[]; section: AdvisorSection }) {
  const backgrounds = {
    feature: "border-y border-[#E5E8EF] bg-[#F7F8FB]",
    panel: "border-y border-[#E5E8EF] bg-[#F7F8FB]",
    plain: "",
  } as const;

  return (
    <section className={`px-6 py-12 md:py-16 lg:px-10 ${backgrounds[section.variant ?? "plain"]}`}>
      {/*
        The anchor is the content block, not the section, so an anchor click
        lands the first line of content a fixed distance below the sticky
        bars (see `.advisor-anchor` in app/globals.css) whatever the section's
        own padding is.
      */}
      <div className={`advisor-anchor ${CONTAINER}`} id={section.id}>
        {section.eyebrow ? <Eyebrow>{section.eyebrow}</Eyebrow> : null}
        <SectionHeading>{section.heading}</SectionHeading>
        {section.lede ? <Lede>{section.lede}</Lede> : null}
        <Blocks blocks={section.blocks} examples={examples} />
      </div>
    </section>
  );
}

function SectionRail({ sections }: { sections: AdvisorSection[] }) {
  return (
    <nav
      aria-label="Section navigation"
      className="advisor-rail no-print sticky z-30 overflow-x-auto border-b border-[#E5E8EF] bg-white/95 px-6 py-2.5 lg:px-10"
      style={{ backdropFilter: "blur(8px)" }}
    >
      {/* The list is wider than the column on a phone and scrolls; wrapping it
          keeps its first item on the column's left edge at every width. */}
      <div className={CONTAINER}>
        <ul className="flex w-max gap-5 lg:w-auto">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                className="whitespace-nowrap text-[12px] font-medium text-[#6B7686] transition-colors hover:text-[#0B1220]"
                href={`#${section.id}`}
              >
                {section.navLabel}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export function AdvisorBriefing({ content }: { content: AdvisorBriefingContent }) {
  const { meta, sections } = content;

  return (
    <div className="bg-white" data-advisor-doc>
      <AdvisorStickyOffsets />
      <SectionRail sections={sections} />

      <header className="border-b border-[#E5E8EF] px-6 py-12 md:py-16 lg:px-10" id="cover">
        <div className={CONTAINER}>
          <p
            className={`${PROSE} text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A6D1F]`}
            style={{ fontFamily: font.rajdhani }}
          >
            USA Missionaries
          </p>
          <h1
            className={`mt-3 ${PROSE} break-words text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-[1.15] text-[#0B1220]`}
            style={{ fontFamily: font.oswald }}
          >
            {meta.title}
          </h1>
          {meta.subtitle ? (
            <p className={`mt-4 ${PROSE} break-words text-[15.5px] leading-[1.75] text-[#3D4654]`}>
              {meta.subtitle}
            </p>
          ) : null}

          {meta.preparedFor || meta.preparedBy || meta.date ? (
            <dl className={`mt-8 ${PROSE} flex flex-col gap-4 border-t border-[#E5E8EF] pt-6 sm:flex-row sm:gap-10`}>
              {[
                { label: "Prepared for", value: meta.preparedFor },
                { label: "Prepared by", value: meta.preparedBy },
                { label: "Date", value: meta.date },
              ]
                .filter((item): item is { label: string; value: string } => Boolean(item.value))
                .map((item) => (
                  <div key={item.label}>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B7686]">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-[15.5px] leading-6 text-[#0B1220]">{item.value}</dd>
                  </div>
                ))}
            </dl>
          ) : null}

          <div className={`mt-8 ${PROSE}`}>
            <AdvisorPrintButton />
          </div>

          {meta.confidentialNote ? (
            <p className={`mt-8 ${PROSE} border-l-2 border-[#C2A14E] pl-4 ${BODY} text-[#5A6473]`}>
              {meta.confidentialNote}
            </p>
          ) : null}
        </div>
      </header>

      {sections.map((section) => (
        <Section examples={content.examples ?? []} key={section.id} section={section} />
      ))}

      {content.footerNote ? (
        <footer className="border-t border-[#E5E8EF] px-6 py-10 lg:px-10">
          <p className={`${CONTAINER} ${BODY} text-[#5A6473]`}>
            {content.footerNote}
          </p>
        </footer>
      ) : null}
    </div>
  );
}
