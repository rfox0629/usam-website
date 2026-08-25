import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  findOrCreateUsamOrganization,
  submitUsamApplicationForSetup,
} from "@/src/lib/dos/usam-application";
import {
  applicantDisplayName,
  supportBudgetAnswerId,
  supportBudgetCategories,
  type JoinApplicantIdentity,
  type JoinApplicationDraft,
} from "@/src/lib/join/application-steps";
import { markJoinDraftSubmitted } from "@/src/lib/join/drafts";

/**
 * USA-167: turns a finished /join draft into the canonical application record.
 *
 * This deliberately writes through the existing USA-172 ingress
 * (submitUsamApplicationForSetup -> usam_missionary_applications). There is no
 * second application table, no parallel Person system and no third provisioner.
 *
 * What it does NOT do, per the approved lifecycle, is provision a DOS account.
 * An applicant has no password, no auth user and no workspace to log into.
 * DOS activation happens after acceptance:
 *
 *   application -> review -> acceptance -> USA Missionaries onboarding ->
 *   DOS activation -> Top 100 -> DOS training -> Active Missionary
 *
 * The household row exists because the canonical application requires a
 * workspace_id and because a couple is one household. It is created not
 * publicly visible, and it is not a DOS workspace handed to anyone.
 */

type SubmitResult = {
  applicationId: string;
  householdId: string;
  profileId: string;
};

function fullName(identity: JoinApplicantIdentity) {
  return [identity.firstName, identity.lastName].filter(Boolean).join(" ").trim();
}

function answer(draft: JoinApplicationDraft, id: string) {
  return (draft.answers[id] ?? "").trim();
}

/** Money fields arrive as free text, so "3,500" and "$3500" both have to work. */
function money(draft: JoinApplicationDraft, id: string): number | null {
  const raw = answer(draft, id).replace(/[^0-9.]/g, "");

  if (!raw) {
    return null;
  }

  const parsed = Number.parseFloat(raw);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function locationLine(draft: JoinApplicationDraft) {
  // City and state only. The street address stays in contact_payload and is
  // never used as the application's display location.
  return [answer(draft, "city"), answer(draft, "state")].filter(Boolean).join(", ");
}

function storyText(draft: JoinApplicationDraft) {
  return [
    ["Testimony", answer(draft, "story.testimony")],
    ["Walk with God", answer(draft, "story.journey")],
    ["Shaping moments", answer(draft, "story.shaping")],
    ["Marriage and family", answer(draft, "story.marriage")],
    ["Formation for ministry", answer(draft, "story.formation")],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n\n");
}

function callingText(draft: JoinApplicationDraft) {
  return [
    answer(draft, "calling.whyMinistry"),
    answer(draft, "calling.whyUsam"),
    answer(draft, "calling.whoCalledTo"),
    answer(draft, "calling.thisSeason"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function submitJoinApplication({
  draft,
  resumeToken,
}: {
  draft: JoinApplicationDraft;
  resumeToken: string;
}): Promise<SubmitResult> {
  const supabase = createSupabaseAdminClient();
  const organization = await findOrCreateUsamOrganization(supabase);
  const applicantName = fullName(draft.applicant);
  const householdName = applicantDisplayName(draft) || applicantName;
  const location = locationLine(draft);

  if (!applicantName || !draft.applicant.email.trim()) {
    throw new Error("An application needs the applicant's name and email.");
  }

  // Slug has to be unique, and an applicant is not a public page, so it is
  // derived rather than asked for.
  const baseSlug = householdName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "usam-applicant";
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const householdResult = await supabase
    .from("missionary_households")
    .insert({
      display_name: householdName,
      location: location || null,
      public_visible: false,
      short_mission: `${householdName} USA Missionaries application.`,
      slug,
      usam_application_status: "application_submitted",
    })
    .select("id")
    .single();

  if (householdResult.error || !householdResult.data) {
    throw new Error(householdResult.error?.message ?? "Could not create the application household.");
  }

  const householdId = householdResult.data.id as string;

  // A profile with a null user_id: identity without an account. The applicant
  // cannot sign in, which is exactly right before acceptance.
  const profileResult = await supabase
    .from("profiles")
    .insert({
      email: draft.applicant.email.trim(),
      first_name: draft.applicant.firstName.trim() || applicantName,
      last_name: draft.applicant.lastName.trim(),
      owner_organization_id: organization.id,
      phone: draft.applicant.phone.trim() || null,
      user_id: null,
    })
    .select("id")
    .single();

  if (profileResult.error || !profileResult.data) {
    throw new Error(profileResult.error?.message ?? "Could not create the applicant profile.");
  }

  const profileId = profileResult.data.id as string;

  // Both spouses become distinct team member rows. This is the couple model:
  // one household, two people, neither collapsed into the other's record.
  const teamMembers: Record<string, unknown>[] = [
    {
      display_name: applicantName,
      dos_user_id: null,
      household_id: householdId,
      invite_email: draft.applicant.email.trim() || null,
      invite_phone: draft.applicant.phone.trim() || null,
      is_public: false,
      relationship_to_workspace: "owner",
      role_title: "USA Missionaries Applicant",
      source: "public_form",
      status: "pending",
    },
  ];

  if (draft.applyingAsCouple && fullName(draft.spouse)) {
    teamMembers.push({
      display_name: fullName(draft.spouse),
      dos_user_id: null,
      household_id: householdId,
      invite_email: draft.spouse.email.trim() || null,
      invite_phone: draft.spouse.phone.trim() || null,
      is_public: false,
      relationship_to_workspace: "spouse",
      role_title: "USA Missionaries Applicant",
      source: "public_form",
      status: "pending",
    });
  }

  const teamResult = await supabase.from("missionary_team_members").insert(teamMembers);

  if (teamResult.error) {
    throw new Error(teamResult.error.message);
  }

  const supportPath = answer(draft, "supportPath");
  const expectsFundraising = supportPath === "yes" || supportPath === "unsure";
  const proposedMonthlyNeed = expectsFundraising ? money(draft, "supportMonthlyNeed") : null;
  // The applicant's chosen goal, never derived from the budget. If they did not
  // choose one, the goal stays null for Operations to set at review.
  const requestedGoal = expectsFundraising ? money(draft, "supportRequestedGoal") : null;
  const excessSupportAgreementAccepted = expectsFundraising && draft.disclosures.excessSupportAgreement === true;
  const profilePhoto = draft.photos.find((photo) => photo.kind === "profile");
  const supportBudgetValues = Object.fromEntries(
    supportBudgetCategories.map((category) => [category.key, money(draft, supportBudgetAnswerId(category.key))]),
  );
  const supportBudgetTotals = supportBudgetCategories.reduce(
    (totals, category) => {
      const amount = money(draft, supportBudgetAnswerId(category.key)) ?? 0;

      totals[category.group] += amount;
      totals.total += amount;

      return totals;
    },
    { household: 0, ministry: 0, total: 0 },
  );

  const application = await submitUsamApplicationForSetup({
    applicantUserId: null,
    payload: {
      applicantEmail: draft.applicant.email.trim(),
      applicantName,
      applicantPhone: draft.applicant.phone.trim(),
      callingFocus: callingText(draft),
      contactPayload: {
        address: {
          city: answer(draft, "city"),
          line1: answer(draft, "addressLine1"),
          line2: answer(draft, "addressLine2"),
          state: answer(draft, "state"),
          zip: answer(draft, "zip"),
        },
        applicant: draft.applicant,
        applyingAsCouple: draft.applyingAsCouple,
        church: {
          city: answer(draft, "churchCity"),
          leaderEmail: answer(draft, "churchLeaderEmail"),
          leaderName: answer(draft, "churchLeaderName"),
          leaderPhone: answer(draft, "churchLeaderPhone"),
          name: answer(draft, "churchName"),
          role: answer(draft, "churchRole"),
          state: answer(draft, "churchState"),
          years: answer(draft, "churchYears"),
        },
        disclosures: draft.disclosures,
        experience: {
          background: answer(draft, "experience.background"),
          currentInvolvement: answer(draft, "experienceCurrentInvolvement"),
          gifts: answer(draft, "experience.gifts"),
          leadership: answer(draft, "experience.leadership"),
          training: answer(draft, "experience.training"),
        },
        familyMembers: answer(draft, "familyMembers"),
        maritalStatus: answer(draft, "maritalStatus"),
        mission: {
          area: answer(draft, "mission.area"),
          focus: answer(draft, "mission.focus"),
          goals: answer(draft, "mission.goals"),
          needs: answer(draft, "mission.needs"),
          partners: answer(draft, "mission.partners"),
          people: answer(draft, "mission.people"),
          rhythm: answer(draft, "mission.rhythm"),
        },
        // Photos are private storage paths, not URLs. Nothing here is publishable.
        photos: draft.photos,
        // Profile material is a DRAFT. Acceptance plus an explicit review and
        // publish step is what makes any of it public.
        profileDraft: {
          longNarrative: answer(draft, "profileLongNarrative"),
          ministryDescription: answer(draft, "missionDescriptionPublic"),
          prayerPartners: answer(draft, "prayerPartners"),
          publicLocation: answer(draft, "profilePublicLocation"),
          publicName: answer(draft, "profilePublicName"),
          shortBio: answer(draft, "profileShortBio"),
          state: "draft_unpublished",
        },
        source: "public_form",
        spouse: draft.applyingAsCouple ? draft.spouse : null,
        support: {
          budget: {
            categories: supportBudgetValues,
            householdTotal: supportBudgetTotals.household,
            ministryTotal: supportBudgetTotals.ministry,
            total: supportBudgetTotals.total,
          },
          budgetNarrative: answer(draft, "supportBudget"),
          committedAmount: money(draft, "supportCommittedAmount"),
          employmentContext: answer(draft, "supportEmploymentContext"),
          fundraisingApproachPlan: answer(draft, "fundraisingApproachPlan"),
          fundraisingReadiness: answer(draft, "fundraisingReadiness"),
          immediateNeeds: answer(draft, "supportImmediateNeeds"),
          otherMonthlyIncome: money(draft, "supportOtherMonthlyIncome"),
          path: supportPath,
          proposedMonthlyNeed,
          requestedGoal,
        },
      },
      excessSupportAgreementAccepted,
      excessSupportAgreementAcceptedAt: excessSupportAgreementAccepted ? new Date().toISOString() : null,
      excessSupportAgreementVersion: excessSupportAgreementAccepted ? "usa-174-v1" : null,
      location,
      monthlyBudget: proposedMonthlyNeed,
      prayerNeeds: answer(draft, "prayerRequests"),
      profilePhotoUrl: profilePhoto ? `${profilePhoto.bucket}/${profilePhoto.path}` : "",
      proposedMonthlyNeed,
      referencesText: answer(draft, "references"),
      storyTestimony: storyText(draft),
      supportGoal: requestedGoal,
      workspaceId: householdId,
    },
    profileId,
    supabase,
  });

  await markJoinDraftSubmitted(resumeToken, application.applicationId);

  return { applicationId: application.applicationId, householdId, profileId };
}
