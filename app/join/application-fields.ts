import type { JoinApplicationStepId } from "@/src/lib/join/application-steps";

/**
 * USA-167: the questions on each step of the USA Missionaries application.
 *
 * Held as data rather than markup so the review step, the completion state, and
 * the form itself all read from one list and cannot drift apart.
 *
 * Nothing here asks an applicant to configure software. There are no workspace
 * preferences, no circles, no discipleship tracking and no path selection. DOS
 * activation happens after acceptance, as its own onboarding step.
 */
export type JoinFieldKind = "long" | "money" | "short";

export type JoinField = {
  /** Shown under the label when the question needs framing. */
  help?: string;
  id: string;
  kind: JoinFieldKind;
  label: string;
  /** Required fields gate submission and drive the review step's completion state. */
  required?: boolean;
  /** Only asked when the applicant said they are applying as a couple. */
  coupleOnly?: boolean;
};

export const joinApplicationFields: Record<Exclude<JoinApplicationStepId, "review" | "start">, JoinField[]> = {
  about: [
    { id: "household.location", kind: "short", label: "Where do you live?", help: "City and state is enough at this stage.", required: true },
    { id: "household.family", kind: "long", label: "Who is in your household?", help: "Children and their ages, and anyone else living with you." },
    { id: "church.name", kind: "short", label: "What church are you part of?", required: true },
    { id: "church.relationship", kind: "long", label: "Describe your relationship with that church.", help: "How long you have been there, whether you are a member, and who knows you well.", required: true },
    { id: "church.leaderContact", kind: "short", label: "Who is your pastor or church leader, and how do we reach them?" },
  ],
  calling: [
    { id: "calling.whyMinistry", kind: "long", label: "Why do you believe God is calling you into ministry?", required: true },
    { id: "calling.whyUsam", kind: "long", label: "Why USA Missionaries?", required: true },
    { id: "calling.whoCalledTo", kind: "long", label: "Who do you believe you are called to reach?", required: true },
    { id: "calling.geography", kind: "short", label: "What community or area is on your heart?" },
    { id: "calling.thisSeason", kind: "long", label: "What do you believe God is asking you to do in this season?", required: true },
    { id: "calling.burden", kind: "long", label: "Describe the vision or burden you are carrying." },
  ],
  experience: [
    { id: "experience.background", kind: "long", label: "Describe your church and ministry background.", required: true },
    { id: "experience.leadership", kind: "long", label: "What ministry or leadership experience do you have?", required: true },
    { id: "experience.training", kind: "long", label: "What training or education is relevant to this?" },
    { id: "experience.gifts", kind: "long", label: "What are your gifts and strengths?" },
    { id: "experience.current", kind: "long", label: "What ministry are you involved in right now?" },
    { id: "experience.references", kind: "long", label: "Who can speak to your character and ministry?", help: "Please give three people: name, relationship to you, and how to reach them.", required: true },
  ],
  mission: [
    { id: "mission.focus", kind: "long", label: "What is the ministry you envision under USA Missionaries?", required: true },
    { id: "mission.people", kind: "long", label: "Who would you be serving?", required: true },
    { id: "mission.rhythm", kind: "long", label: "What would this look like week to week?" },
    { id: "mission.goals", kind: "long", label: "What are your first goals?" },
    { id: "mission.partners", kind: "long", label: "What churches or partners would you be working alongside?" },
    { id: "mission.area", kind: "short", label: "What is your service area?" },
    { id: "mission.needs", kind: "long", label: "What do you need most to begin?" },
  ],
  profile: [
    { id: "profile.publicName", kind: "short", label: "How should your name appear publicly?", help: "For a couple, this is often both first names." },
    { id: "profile.shortBio", kind: "long", label: "Write a short bio, two or three sentences." },
    { id: "profile.ministryDescription", kind: "long", label: "Describe your ministry for people who have never met you." },
    { id: "profile.prayer", kind: "long", label: "What would you ask people to pray for?" },
    { id: "profile.publicLocation", kind: "short", label: "How specific should your location be publicly?", help: "Many missionaries prefer a region rather than a town. We never publish a home address." },
  ],
  story: [
    { id: "story.testimony", kind: "long", label: "Tell us how you came to faith in Christ.", required: true },
    { id: "story.journey", kind: "long", label: "Describe your walk with God since then.", required: true },
    { id: "story.shaping", kind: "long", label: "What moments of growth, restoration, or calling shaped you most?" },
    { id: "story.marriage", kind: "long", label: "Tell us about your marriage and family.", coupleOnly: true },
    { id: "story.formation", kind: "long", label: "How has God shaped you for ministry?" },
  ],
  support: [
    { id: "support.employment", kind: "long", label: "What is your current work and income situation?", help: "We ask so we understand what a transition into ministry would involve.", required: true },
    { id: "support.proposedMonthlyNeed", kind: "money", label: "What monthly support do you believe you need?", help: "Your best estimate of what it takes to sustain your household and ministry.", required: true },
    { id: "support.requestedGoal", kind: "money", label: "What monthly goal would you like to set?", help: "This is yours to choose. It is not calculated from the number above, and USA Missionaries reviews and approves a goal separately." },
    { id: "support.existingSupport", kind: "long", label: "Do you have any recurring support already?" },
    { id: "support.whoToApproach", kind: "long", label: "Which churches or people do you expect to approach?" },
    { id: "support.readiness", kind: "long", label: "How ready do you feel to raise support?", required: true },
    { id: "support.immediateNeeds", kind: "long", label: "Are there immediate financial or ministry needs we should know about?" },
  ],
};

/**
 * Identity is asked separately from the free-text steps because a couple is one
 * application over two distinct people, and those two people have to survive
 * into Operations as separate identities rather than as fields on one record.
 */
export const identityFieldLabels = {
  email: "Email",
  firstName: "First name",
  lastName: "Last name",
  phone: "Phone",
};

export function visibleFieldsForStep(step: Exclude<JoinApplicationStepId, "review" | "start">, applyingAsCouple: boolean) {
  return joinApplicationFields[step].filter((field) => !field.coupleOnly || applyingAsCouple);
}
