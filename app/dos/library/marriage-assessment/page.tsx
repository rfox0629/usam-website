import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";
import { MarriageAssessmentClient } from "./MarriageAssessmentClient";

export const metadata: Metadata = {
  title: "Marriage Assessment | DOS Library",
  robots: {
    follow: false,
    index: false,
  },
};

type MarriageAssessmentSearchParams = {
  person?: string;
  workspace?: string;
};

export default async function MarriageAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<MarriageAssessmentSearchParams>;
}) {
  const params = await searchParams;
  const resource = getDosResourceBySlug("marriage-assessment");
  const assessment = resource?.content?.assessment;

  if (!resource || !assessment) {
    notFound();
  }

  return (
    <MarriageAssessmentClient
      description={resource.description}
      maxScore={assessment.maxScore}
      participants={assessment.participants}
      questions={assessment.questions}
      saveContext={params.person && params.workspace ? {
        personId: params.person,
        profileHref: `/dos/${encodeURIComponent(params.workspace)}?person=${encodeURIComponent(params.person)}&tab=growth`,
        workspaceId: params.workspace,
      } : undefined}
    />
  );
}
