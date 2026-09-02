import type { JoinApplicationStepId } from "@/src/lib/join/application-steps";
export { supportBudgetAnswerId, supportBudgetCategories } from "@/src/lib/join/application-steps";

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
export type JoinFieldKind = "list" | "long" | "money" | "short";

/** One cell in a repeating answer. See field-list.ts for how rows are stored. */
export type JoinListColumn = {
  id: string;
  label: string;
  /** Sits in a smaller track, for an age or similar short value. */
  narrow?: boolean;
};

export type JoinField = {
  /** Shown under the label when the question needs framing. */
  help?: string;
  id: string;
  kind: JoinFieldKind;
  label: string;
  /** Guided part within a top-level application step. */
  section: string;
  /** Required fields gate submission and drive the review step's completion state. */
  required?: boolean;
  /** Only asked when the applicant said they are applying as a couple. */
  coupleOnly?: boolean;
  /** Columns of a repeating answer. Read only when kind is "list". */
  columns?: JoinListColumn[];
  /** Label on the button that appends a row to a repeating answer. */
  addLabel?: string;
};

export type JoinFieldSection = {
  id: string;
  intro: string;
  title: string;
};

export const joinApplicationSections: Record<Exclude<JoinApplicationStepId, "review" | "start">, JoinFieldSection[]> = {
  about: [
    { id: "identity", title: "Who is applying?", intro: "Start with the people on this application." },
    { id: "home", title: "Your household", intro: "Private contact and household details help us understand your context." },
    { id: "church", title: "Your church", intro: "Tell us where you are rooted and who knows you there." },
  ],
  story: [
    { id: "faith", title: "Your faith story", intro: "Share the beginning and the journey in your own words." },
    { id: "formation", title: "How God has shaped you", intro: "Name the people and seasons that prepared you for ministry." },
  ],
  calling: [
    { id: "call", title: "The call", intro: "Help us understand why ministry and why USA Missionaries." },
    { id: "people", title: "The people and place", intro: "Who are you called to reach, and where?" },
    { id: "season", title: "This season", intro: "Describe what you believe God is asking of you now." },
  ],
  experience: [
    { id: "background", title: "Ministry background", intro: "Tell us what you have done and where you are serving now." },
    { id: "preparation", title: "Preparation", intro: "Share the training, gifts, and strengths you would bring." },
    { id: "references", title: "References", intro: "Give us people who can speak to your character and ministry." },
  ],
  mission: [
    { id: "vision", title: "The mission", intro: "Describe the ministry and the people you expect to serve." },
    { id: "practice", title: "How it would work", intro: "Turn the vision into a weekly rhythm and first goals." },
    { id: "readiness", title: "Partners and needs", intro: "Tell us where you would serve, who is alongside you, and what you need to begin." },
  ],
  support: [
    { id: "path", title: "Your support path", intro: "Start with your current work and whether you expect to raise monthly support." },
    { id: "budget", title: "Monthly budget", intro: "Use the worksheet to estimate household and ministry needs." },
    { id: "picture", title: "Your support picture", intro: "Your ministry budget, the organizational support it carries, and the target that funds it." },
    { id: "readiness", title: "Fundraising readiness", intro: "Tell us how you would begin and what support you may need." },
  ],
  profile: [
    { id: "basics", title: "Public basics", intro: "Choose the name and location you would be comfortable showing if accepted." },
    { id: "story", title: "Profile story", intro: "Draft the short and long material our team could refine with you." },
    { id: "prayer", title: "Prayer", intro: "Share how people could pray and who is already praying with you." },
    { id: "photos", title: "Photos", intro: "Add private source photos for a future profile review." },
  ],
};

export const joinApplicationFields: Record<Exclude<JoinApplicationStepId, "review" | "start">, JoinField[]> = {
  about: [
    { id: "addressLine1", kind: "short", label: "Street address", help: "Your home address stays private. It is never shown on a public missionary page.", section: "home" },
    { id: "addressLine2", kind: "short", label: "Apartment or unit", section: "home" },
    { id: "city", kind: "short", label: "City", required: true, section: "home" },
    { id: "state", kind: "short", label: "State", required: true, section: "home" },
    { id: "zip", kind: "short", label: "ZIP code", section: "home" },
    { id: "maritalStatus", kind: "short", label: "Marital status", section: "home" },
    {
      id: "familyMembers",
      kind: "list",
      label: "Who else is in your household?",
      help: "Add each child and anyone else living with you, one person at a time.",
      addLabel: "Add another person",
      columns: [
        { id: "name", label: "Name" },
        { id: "age", label: "Age", narrow: true },
        { id: "relationship", label: "Relationship" },
      ],
      section: "home",
    },
    { id: "churchName", kind: "short", label: "What church are you part of?", required: true, section: "church" },
    { id: "churchCity", kind: "short", label: "Church city", section: "church" },
    { id: "churchState", kind: "short", label: "Church state", section: "church" },
    { id: "churchYears", kind: "short", label: "How long have you been there?", section: "church" },
    { id: "churchRole", kind: "long", label: "What is your role and relationship there?", help: "Whether you are a member, what you are involved in, and who knows you well.", required: true, section: "church" },
    { id: "churchLeaderName", kind: "short", label: "Your pastor or church leader", required: true, section: "church" },
    { id: "churchLeaderEmail", kind: "short", label: "Their email", section: "church" },
    { id: "churchLeaderPhone", kind: "short", label: "Their phone", section: "church" },
  ],
  calling: [
    { id: "calling.whyMinistry", kind: "long", label: "Why do you believe God is calling you into ministry?", required: true, section: "call" },
    { id: "calling.whyUsam", kind: "long", label: "Why USA Missionaries?", required: true, section: "call" },
    { id: "calling.whoCalledTo", kind: "long", label: "Who do you believe you are called to reach?", required: true, section: "people" },
    { id: "calling.geography", kind: "short", label: "What community or area is on your heart?", section: "people" },
    { id: "calling.thisSeason", kind: "long", label: "What do you believe God is asking you to do in this season?", required: true, section: "season" },
    { id: "calling.burden", kind: "long", label: "Describe the vision or burden you are carrying.", section: "season" },
  ],
  experience: [
    { id: "experience.background", kind: "long", label: "Describe your church and ministry background.", required: true, section: "background" },
    { id: "experience.leadership", kind: "long", label: "What ministry or leadership experience do you have?", required: true, section: "background" },
    { id: "experienceCurrentInvolvement", kind: "long", label: "What ministry are you involved in right now?", section: "background" },
    { id: "experience.training", kind: "long", label: "What training or education is relevant to this?", section: "preparation" },
    { id: "experience.gifts", kind: "long", label: "What are your gifts and strengths?", section: "preparation" },
    {
      id: "references",
      kind: "list",
      label: "Who can speak to your character and ministry?",
      help: "Please give three people.",
      addLabel: "Add another reference",
      columns: [
        { id: "name", label: "Name" },
        { id: "relationship", label: "Relationship to you" },
        { id: "contact", label: "How to reach them" },
      ],
      required: true,
      section: "references",
    },
  ],
  mission: [
    { id: "mission.focus", kind: "long", label: "What is the ministry you envision under USA Missionaries?", required: true, section: "vision" },
    { id: "mission.people", kind: "long", label: "Who would you be serving?", required: true, section: "vision" },
    { id: "mission.rhythm", kind: "long", label: "What would this look like week to week?", section: "practice" },
    { id: "mission.goals", kind: "long", label: "What are your first goals?", section: "practice" },
    { id: "mission.partners", kind: "long", label: "What churches or partners would you be working alongside?", section: "readiness" },
    { id: "mission.area", kind: "short", label: "What is your service area?", section: "readiness" },
    { id: "mission.needs", kind: "long", label: "What do you need most to begin?", section: "readiness" },
  ],
  profile: [
    { id: "profilePublicName", kind: "short", label: "How should your name appear publicly?", help: "For a couple, this is often both first names.", section: "basics" },
    { id: "profilePublicLocation", kind: "short", label: "How specific should your location be publicly?", help: "Many missionaries prefer a region rather than a town. We never publish a home address.", section: "basics" },
    { id: "profileShortBio", kind: "long", label: "Write a short bio, two or three sentences.", section: "story" },
    { id: "profileLongNarrative", kind: "long", label: "Tell your story the way you would want supporters to read it.", section: "story" },
    { id: "missionDescriptionPublic", kind: "long", label: "Describe your ministry for people who have never met you.", section: "story" },
    { id: "prayerRequests", kind: "long", label: "What would you ask people to pray for?", section: "prayer" },
    {
      id: "prayerPartners",
      kind: "list",
      label: "Who is already praying for you?",
      help: "Names are enough. We do not contact anyone without asking you first.",
      addLabel: "Add another person",
      columns: [
        { id: "firstName", label: "First name" },
        { id: "lastName", label: "Last name" },
      ],
      section: "prayer",
    },
  ],
  story: [
    { id: "story.testimony", kind: "long", label: "Tell us how you came to faith in Christ.", required: true, section: "faith" },
    { id: "story.journey", kind: "long", label: "Describe your walk with God since then.", required: true, section: "faith" },
    { id: "story.shaping", kind: "long", label: "What moments of growth, restoration, or calling shaped you most?", section: "formation" },
    { id: "story.marriage", kind: "long", label: "Tell us about your marriage and family.", coupleOnly: true, section: "formation" },
    { id: "story.formation", kind: "long", label: "How has God shaped you for ministry?", section: "formation" },
  ],
  support: [
    { id: "supportEmploymentContext", kind: "long", label: "What is your current work and income situation?", help: "We ask so we understand what a transition into ministry would involve.", required: true, section: "path" },
    { id: "supportBudget", kind: "long", label: "Anything else we should understand about your monthly budget?", help: "Optional context, seasonal costs, or expenses that do not fit neatly above.", section: "budget" },
    { id: "supportOtherMonthlyIncome", kind: "money", label: "Other monthly household income", section: "picture" },
    { id: "supportMonthlyNeed", kind: "money", label: "What monthly support do you believe you need?", help: "Your proposed need can match the worksheet total, but it remains your considered estimate.", required: true, section: "picture" },
    { id: "supportRequestedGoal", kind: "money", label: "What monthly fundraising goal would you like to request?", help: "This is your requested goal. USA Missionaries Operations reviews and approves the public goal separately.", section: "picture" },
    { id: "supportCommittedAmount", kind: "money", label: "How much recurring support do you already have?", section: "picture" },
    { id: "fundraisingApproachPlan", kind: "long", label: "Which churches or people do you expect to approach?", section: "readiness" },
    { id: "fundraisingReadiness", kind: "long", label: "How ready do you feel to raise support?", required: true, section: "readiness" },
    { id: "supportImmediateNeeds", kind: "long", label: "Are there immediate financial or ministry needs we should know about?", section: "readiness" },
  ],
};

/**
 * Identity is asked separately from the free-text steps because a couple is one
 * application over two distinct people, and those two people have to survive
 * into Operations as separate identities rather than as fields on one record.
 */
/**
 * Declaration order is render order: the application iterates these keys. Name
 * before contact, because asking somebody for an email address before their
 * name is the wrong way round.
 */
export const identityFieldLabels = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
};

export function visibleFieldsForStep(step: Exclude<JoinApplicationStepId, "review" | "start">, applyingAsCouple: boolean) {
  return joinApplicationFields[step].filter((field) => !field.coupleOnly || applyingAsCouple);
}

export function visibleFieldsForSection(
  step: Exclude<JoinApplicationStepId, "review" | "start">,
  section: string,
  applyingAsCouple: boolean,
) {
  return visibleFieldsForStep(step, applyingAsCouple).filter((field) => field.section === section);
}
