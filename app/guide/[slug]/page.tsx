import type { Metadata } from "next";
import { FileText } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrimaryNav } from "@/components/PrimaryNav";
import { dosResourceCatalog, getDosResourceBySlug, type DosAssessmentQuestion, type DosResource, type DosResourceSection, type DosResourceSectionItem } from "@/src/lib/dos/resource-catalog";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";
import { GuideBackToLibraryButton } from "./GuideBackToLibraryButton";
import { ShareGuideButton } from "./ShareGuideButton";

export const dynamicParams = true;

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };
const newTestamentReadingPlanSlug = "new-testament-14-days";

function resourceTypeLabel(resource: DosResource) {
  switch (resource.type) {
    case "assessment":
      return "Assessment";
    case "challenge":
      return "Challenge";
    case "prayer":
      return "Prayer";
    case "guided_resource":
      return "Guided Resource";
    case "reading_plan":
      return "Reading Plan";
    case "guide":
      return "Guide";
    case "teaching":
    default:
      return "Teaching";
  }
}

function publicGuideResources() {
  return dosResourceCatalog.filter((resource) => resource.path.startsWith("/guide/"));
}

function sectionId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateStaticParams() {
  return publicGuideResources().map((resource) => ({ slug: resource.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resource = getDosResourceBySlug(slug);

  if (!resource) {
    return {
      title: "Guide | USA Missionaries",
    };
  }

  const title = `${resource.title} | USA Missionaries`;
  const description = resource.content?.seoDescription ?? resource.description;
  const url = `${getCanonicalSiteUrl()}${resource.path}`;

  return {
    alternates: {
      canonical: url,
    },
    description,
    openGraph: {
      description,
      siteName: "USA Missionaries",
      title,
      type: "article",
      url,
    },
    title,
    twitter: {
      card: "summary",
      description,
      title,
    },
  };
}

function GuidePill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-[#DCEBFF] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
      {children}
    </span>
  );
}

function ScripturePills({ references }: { references?: readonly string[] }) {
  if (!references?.length) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {references.map((reference) => (
        <span className="rounded-full bg-[#EBF2FF] px-3 py-1 text-xs font-bold text-[#1D4ED8]" key={reference}>
          {reference}
        </span>
      ))}
    </div>
  );
}

function ResourceSectionItem({ item }: { item: DosResourceSectionItem }) {
  return (
    <li className="rounded-2xl border border-[#EAF2FF] bg-[#F8FBFF] p-4">
      <p className="text-sm font-black leading-5 text-[#0F172A]">{item.title}</p>
      {item.body ? <p className="mt-2 text-sm leading-7 text-[#475569]">{item.body}</p> : null}
      <ScripturePills references={item.scriptureReferences} />
    </li>
  );
}

function ResourceSection({ section }: { section: DosResourceSection }) {
  return (
    <section className="scroll-mt-28 rounded-[28px] border border-[#EAF2FF] bg-white p-5 shadow-[0_16px_40px_rgba(37,99,235,0.05)]" id={sectionId(section.title)}>
      <h2 className="text-2xl font-bold leading-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>
        {section.title}
      </h2>
      {section.body ? <p className="mt-3 text-sm leading-7 text-[#475569]">{section.body}</p> : null}
      <ScripturePills references={section.scriptureReferences} />
      {section.items?.length ? (
        <ul className="mt-4 grid gap-3">
          {section.items.map((item) => (
            <ResourceSectionItem item={item} key={`${section.title}-${item.title}`} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function AssessmentQuestion({ question, index }: { index: number; question: DosAssessmentQuestion }) {
  const participantPrompts = question.participantPrompts ? Object.entries(question.participantPrompts) : [];

  return (
    <li className="rounded-2xl border border-[#EAF2FF] bg-[#F8FBFF] p-4">
      <div className="flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-xs font-black text-[#1D4ED8]">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black leading-6 text-[#0F172A]">{question.prompt}</p>
          {question.note ? <p className="mt-2 text-xs font-semibold leading-5 text-[#64748B]">{question.note}</p> : null}
          {participantPrompts.length ? (
            <div className="mt-3 grid gap-2">
              {participantPrompts.map(([participant, prompt]) => (
                <p className="rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-[#475569]" key={participant}>
                  <span className="font-black text-[#0F172A]">{participant}:</span> {prompt}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function AssessmentBlock({ resource }: { resource: DosResource }) {
  const assessment = resource.content?.assessment;

  if (!assessment) {
    return null;
  }

  return (
    <section className="rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_16px_40px_rgba(37,99,235,0.05)]">
      <div className="flex flex-wrap gap-2">
        <GuidePill>{`${assessment.questions.length} questions`}</GuidePill>
        <GuidePill>{`Max ${assessment.maxScore}`}</GuidePill>
        {assessment.participants.map((participant) => (
          <GuidePill key={participant}>{participant}</GuidePill>
        ))}
      </div>
      {resource.content?.assessmentScale ? <p className="mt-4 text-sm leading-7 text-[#475569]">{resource.content.assessmentScale}</p> : null}
      <ol className="mt-5 grid gap-3">
        {assessment.questions.map((question, index) => (
          <AssessmentQuestion index={index} key={question.id} question={question} />
        ))}
      </ol>
    </section>
  );
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resource = getDosResourceBySlug(slug);

  if (!resource) {
    notFound();
  }

  if (resource.path.endsWith(".pdf")) {
    redirect(resource.path);
  }

  if (resource.path.startsWith("/dos/")) {
    redirect(resource.path);
  }

  if (!resource.path.startsWith("/guide/")) {
    notFound();
  }

  const canonicalUrl = `${getCanonicalSiteUrl()}${resource.path}`;
  const heroSubtitle = resource.content?.subtitle ?? resource.description;
  const hasReadingPlanActions = resource.type === "reading_plan";
  const isNewTestamentReadingPlan = resource.slug === newTestamentReadingPlanSlug;
  const showGuideFooterActions = resource.slug !== newTestamentReadingPlanSlug;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#F8FBFF_0%,#F6F8FF_52%,#FFF4EC_100%)] text-[#0F172A]">
      <PrimaryNav active="dos" />
      <article className="mx-auto max-w-4xl px-5 pb-20 pt-28 md:px-8 md:pt-32">
        {isNewTestamentReadingPlan ? <GuideBackToLibraryButton /> : null}
        <header className="rounded-[32px] border border-[#DCEBFF] bg-white/92 p-6 shadow-[0_20px_60px_rgba(37,99,235,0.08)] md:p-8">
          <div className="flex flex-wrap gap-2">
            <GuidePill>{resource.category}</GuidePill>
            <GuidePill>{resourceTypeLabel(resource)}</GuidePill>
          </div>
          <h1 className="mt-5 text-4xl font-bold leading-none text-[#0F172A] md:text-6xl" style={{ fontFamily: font.oswald }}>
            {resource.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#475569] md:text-lg">{heroSubtitle}</p>
          {resource.content?.body ? <p className="mt-5 rounded-2xl border border-[#EAF2FF] bg-[#F8FBFF] p-4 text-sm leading-7 text-[#0F172A]">{resource.content.body}</p> : null}
          {resource.content?.scripture ? (
            <p className="mt-4 text-sm font-bold leading-6 text-[#1D4ED8]">{resource.content.scripture}</p>
          ) : null}
          {hasReadingPlanActions ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#2563EB] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]" href="#week-one">
                Start Reading
              </Link>
              {resource.downloadPath ? (
                <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-5 text-sm font-bold text-[#0F172A]" download href={resource.downloadPath}>
                  <FileText className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
                  Download PDF
                </Link>
              ) : null}
              <ShareGuideButton title={resource.title} url={canonicalUrl} />
            </div>
          ) : null}
        </header>

        <div className="mt-5 grid gap-5">
          <AssessmentBlock resource={resource} />

          {resource.content?.sections?.map((section) => (
            <ResourceSection key={section.title} section={section} />
          ))}

          {resource.content?.keyScriptures?.length ? (
            <section className="rounded-[28px] border border-[#EAF2FF] bg-white p-5 shadow-[0_16px_40px_rgba(37,99,235,0.05)]">
              <h2 className="text-2xl font-bold leading-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>Key Scriptures</h2>
              <ScripturePills references={resource.content.keyScriptures} />
            </section>
          ) : null}

          {resource.content?.reflectionQuestions?.length ? (
            <section className="rounded-[28px] border border-[#EAF2FF] bg-white p-5 shadow-[0_16px_40px_rgba(37,99,235,0.05)]">
              <h2 className="text-2xl font-bold leading-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>Reflection Questions</h2>
              <ol className="mt-4 grid gap-2 text-sm leading-7 text-[#0F172A]">
                {resource.content.reflectionQuestions.map((question, index) => (
                  <li className="flex gap-2" key={question}>
                    <span className="font-black text-[#1D4ED8]">{index + 1}.</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {resource.content?.followUpSuggestions?.length ? (
            <section className="rounded-[28px] border border-[#EAF2FF] bg-white p-5 shadow-[0_16px_40px_rgba(37,99,235,0.05)]">
              <h2 className="text-2xl font-bold leading-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>Follow-Up</h2>
              <ul className="mt-4 grid gap-2 text-sm leading-7 text-[#0F172A]">
                {resource.content.followUpSuggestions.map((suggestion) => (
                  <li className="flex gap-2" key={suggestion}>
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]" aria-hidden="true" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {resource.content?.attribution || resource.content?.credits ? (
            <section className="rounded-[24px] border border-[#DCEBFF] bg-white/80 p-4 text-xs font-semibold leading-6 text-[#64748B]">
              {resource.content.attribution ? <p>{resource.content.attribution}</p> : null}
              {resource.content.credits ? <p className="mt-1">{resource.content.credits}</p> : null}
            </section>
          ) : null}

          {showGuideFooterActions ? (
            <div className="flex flex-wrap gap-3 pt-2">
              <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#BFDBFE] bg-white px-5 text-sm font-bold text-[#0F172A]" href="/mission">
                Learn About The Mission
              </Link>
            </div>
          ) : null}
        </div>
      </article>
    </main>
  );
}
