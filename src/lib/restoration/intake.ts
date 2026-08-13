export const restorationPreviewToken = "preview-referral-8k2a";
export const restorationPreviewAccessCode = "MOR-PREVIEW";
export const restorationPreviewEmail = "preview@usam.dev";

export type RestorationFieldType =
  | "checkbox"
  | "checkbox-group"
  | "date"
  | "email"
  | "radio"
  | "text"
  | "textarea";

export type RestorationCondition = {
  equals: string | readonly string[];
  fieldId: string;
};

export type RestorationField = {
  contentReview?: boolean;
  helper?: string;
  id: string;
  label: string;
  options?: readonly string[];
  required?: boolean;
  type: RestorationFieldType;
  visibleWhen?: RestorationCondition | readonly RestorationCondition[];
};

export type RestorationSection = {
  description?: string;
  fields: readonly RestorationField[];
  id: string;
  reviewNote?: string;
  shortTitle: string;
  title: string;
};

const satisfactionOptions = ["1 - Very low", "2 - Low", "3 - Neutral", "4 - Good", "5 - Strong"] as const;
const yesNoOptions = ["Yes", "No", "Not sure"] as const;
const parentTraitOptions = [
  "Loving",
  "Caring / helpful",
  "Supportive",
  "Angry",
  "Driven",
  "Authoritative",
  "Abusive",
  "Responsible",
  "Sick a lot",
  "Spiritual",
] as const;
const householdAtmosphereOptions = ["Peaceful", "Tense", "Joy filled", "Unpredictable"] as const;
const childhoodExperienceOptions = ["1 - Very difficult", "2 - Difficult", "3 - Neutral", "4 - Good", "5 - Very good"] as const;
const sexualityExperienceOptions = ["1 - Very difficult", "2 - Difficult", "3 - Neutral", "4 - Healthy", "5 - Very healthy"] as const;

export const hindranceCategories = [
  {
    id: "possessiveness",
    label: "Possessiveness",
    options: ["Jealousy", "Greed", "Gambling", "Hoarding", "Indebtedness", "Laziness", "Procrastination", "Poverty", "Stealing", "Cheating", "Stinginess"],
  },
  {
    id: "fears",
    label: "Fears",
    options: ["Anxiety without known threat", "Fear of authority", "Fear of closed places", "Fear of the dark", "Fear of evil or demons", "Fear of failure", "Fear of heights", "Fear of losing salvation", "Fear of man", "Fear of the unknown", "Panic attacks", "Paranoia"],
  },
  {
    id: "criticalSpirit",
    label: "Critical Spirit",
    options: ["Being critical of others", "Being critical of self", "Belittling others", "Coldness", "Rejection of others", "Gossip", "Joking at others' expense", "Judgmentalism", "Prejudice", "Perfectionism", "Self-righteousness"],
  },
  {
    id: "rebellion",
    label: "Rebellion",
    options: ["Toward God", "Toward authority", "Arrogance", "Controlling attitude", "Disobedience", "Disrespectful", "Pride", "Self-promoting", "Stubbornness", "Witchcraft"],
    review: true,
  },
  {
    id: "angerIssues",
    label: "Anger Issues",
    options: ["Aggressiveness", "Bitterness", "Hatred", "Murder", "Rage", "Revenge", "Silent treatment", "Temper", "Temper tantrums", "Unforgiveness", "Violence", "Vandalism"],
  },
  {
    id: "victimMentality",
    label: "Victim Mentality",
    options: ["Abandoned", "Unwanted", "Conceived or born out of wedlock", "Illegitimacy", "Divorced", "Doubt", "Expecting failure", "Hopelessness", "Despair", "Inadequacy", "Insecurity", "Inferiority", "Loneliness", "Isolation", "Passiveness", "Shyness", "Self-pity", "Unworthiness", "Worthlessness"],
    review: true,
  },
  {
    id: "emotionalIssues",
    label: "Emotional Issues",
    options: ["Abandonment", "Abortion guilt", "Broken heart", "Depression", "Moodiness", "Gender confusion", "Guilt", "Shame", "Hurt", "Deep hurt", "Nightmares", "Insomnia", "Orphan", "Rejection by others", "Self-rejection", "Self-hatred", "Self-harming", "Self-punishment", "Suicidal", "Wounded spirit"],
    review: true,
  },
  {
    id: "sexualBackgroundItems",
    label: "Sexual Background Items",
    options: ["Adultery", "Fornication", "Homosexuality", "Incest", "Lust", "Pornography", "Masturbation", "Molestation", "Rape", "Sexual abuse of others", "Sexual perversion", "Sexual dreams", "Cross dressing", "Sexual difficulties"],
    review: true,
  },
  {
    id: "addictions",
    label: "Addictions",
    options: ["Alcohol", "Anorexia", "Bulimia", "Caffeine", "Fingernail biting", "Illegal drugs", "Prescription medications", "Overeating", "Shopping", "Kleptomania", "Smoking", "Social media", "Phone", "Video games"],
    review: true,
  },
  {
    id: "mentalIllness",
    label: "Mental Illness",
    options: ["ADD / ADHD", "Autistic disorders", "Bipolar disorders", "Narcissism", "Obsessive compulsive", "Schizophrenia / voices", "Mental confusion", "Mental torment", "Unable to keep job / mess-up"],
    review: true,
  },
  {
    id: "traumas",
    label: "Traumas",
    options: ["Abused physically", "Abused mentally", "Assaulted", "Raped", "Traumatic loss", "Accident", "Near death experiences"],
    review: true,
  },
  {
    id: "physicalDiseases",
    label: "Physical Diseases",
    options: ["Autoimmune disease", "Cancer", "Covid 19 / vaccines", "Diabetes", "Premenstrual syndrome", "Heart / lung / stroke", "Kidney stones / cyst", "Migraine headaches", "Sexually transmitted disease", "Received anesthesia", "Received organ transplant", "Received blood transfusion", "Vertigo"],
    review: true,
  },
  {
    id: "miscellaneous",
    label: "Miscellaneous",
    options: ["Cursing / cussing", "Denial", "Avoidance", "Exaggeration", "Forgetfulness", "Lying", "Compulsive lying"],
  },
  {
    id: "falseReligions",
    label: "False Religions",
    options: ["Buddhism", "Humanism", "Islam", "Eastern religions", "Hinduism", "Confucianism", "Jehovah Witnesses", "Mormonism", "Native American Spiritism", "New Age", "Atheism", "Pantheism", "Scientology", "Secret societies", "White supremacy", "Universalism / Unity", "Antisemitism", "Catholicism", "False doctrine"],
    review: true,
  },
] as const;

export const occultInvolvementOptions = [
  "Amulets",
  "Ancestral spirits",
  "Angel worship",
  "Animal / human sacrifice",
  "Anime",
  "Astral projection",
  "Astrology",
  "Blood sacrifices",
  "Bloody Mary",
  "Channeling",
  "Chanting",
  "Clairvoyance / ESP",
  "Conjuring",
  "Consulting a psychic",
  "Crystal balls",
  "Demon / Baphomet",
  "Deja vu dreams / divination",
  "Dream catchers",
  "Dungeons & Dragons",
  "Eastern Star",
  "Eckankar",
  "Enneagram",
  "Familiar spirits",
  "Fortune telling",
  "Free Masonry",
  "Grave sucking",
  "Graven images",
  "Halloween",
  "Harry Potter books or movies",
  "Hexes / vexes",
  "Horoscopes",
  "Horror movies",
  "Hypnosis",
  "Idolatry",
  "Illuminati / Luciferianism",
  "Imaginary friends",
  "Incense",
  "Kundalini",
  "Levitation",
  "Magic - black or white",
  "Meditation / transcendental meditation",
  "Mediums",
  "Meta-physics",
  "Mind control",
  "Movies about witchcraft",
  "Necromancy",
  "New Age practices",
  "Order of the Rainbow",
  "Ouija board",
  "Palm reading",
  "Pentagram",
  "Pokemon",
  "Reiki",
  "Reincarnation",
  "Satanic ritual abuse",
  "Satanic ritual abortion",
  "Satanic rituals",
  "Satanism",
  "Seances",
  "Secret society of spirits",
  "Shamanism",
  "Shape shifting",
  "Sorcery",
  "Soul travel",
  "Spells",
  "Spirit guide",
  "Spiritism",
  "Superstition",
  "Table tipping",
  "Tarot cards",
  "Tattoos",
  "Tea leaves",
  "Telekinesis",
  "Ungodly music",
  "Voodoo",
  "Water witching",
  "Wiccan",
  "Witch doctors",
  "Witchcraft",
  "Ying Yang",
  "Yoga",
] as const;

export const restorationSections: readonly RestorationSection[] = [
  {
    fields: [
      {
        helper: "Answers entered in this view-only preview are not saved or submitted.",
        id: "previewAcknowledgement",
        label: "I understand this view-only preview does not save or submit my answers.",
        required: true,
        type: "checkbox",
      },
      {
        helper: "Confidentiality has limits when there is immediate danger, current abuse, suicidal intent, or mandatory-reporting concern.",
        id: "informedConsent",
        label: "I consent to complete this restoration reflection and understand the confidentiality limits.",
        required: true,
        type: "checkbox",
      },
      {
        helper: "Restoration ministry does not replace emergency care, licensed counseling, medical care, or pastoral oversight.",
        id: "careAcknowledgement",
        label: "I understand this process is spiritual care and does not replace professional or emergency care.",
        required: true,
        type: "checkbox",
      },
      {
        helper: "If this is current or immediate, stop this form and contact local emergency help now.",
        id: "immediateDanger",
        label: "Is there immediate danger, current abuse, or suicidal intent right now?",
        options: yesNoOptions,
        required: true,
        type: "radio",
      },
      { id: "participantName", label: "Preferred name for this reflection", type: "text" },
      { id: "participantEmail", label: "Email for secure return access", type: "email" },
      { id: "participantPhone", label: "Phone for secure restoration follow-up", type: "text" },
    ],
    id: "welcome",
    reviewNote: "Founder/MOR must approve final confidentiality, retention, mandatory-reporting, and emergency escalation copy before production use.",
    shortTitle: "Consent",
    title: "Welcome and Consent",
  },
  {
    fields: [
      { id: "todaysDate", label: "Today's date", type: "date" },
      { id: "promptedPrayerCounseling", label: "What prompted you to seek prayer counseling and deliverance assistance?", required: true, type: "textarea" },
      { id: "restorationGoals", label: "What are your goals for your restoration sessions?", required: true, type: "textarea" },
      { id: "previousDeliverance", label: "Have you previously had deliverance?", options: yesNoOptions, type: "radio" },
      { id: "previousCounseling", label: "Have you previously had counseling?", options: yesNoOptions, type: "radio" },
      { id: "servedMilitary", label: "Have you served in the military?", options: yesNoOptions, type: "radio" },
      { id: "combatExperience", label: "Were you in combat?", options: yesNoOptions, type: "radio", visibleWhen: { fieldId: "servedMilitary", equals: "Yes" } },
    ],
    id: "goals",
    shortTitle: "Goals",
    title: "Goals for Restoration",
  },
  {
    fields: [
      { id: "bornAgainChristian", label: "Are you a born-again Christian?", options: yesNoOptions, type: "radio" },
      { id: "isChristianPhi", label: "Are you a Christian?", options: yesNoOptions, type: "radio" },
      {
        id: "jesusAuthorityFreedom",
        label: "Do you believe Jesus has all power and authority, and are you willing to be free?",
        options: yesNoOptions,
        type: "radio",
      },
      {
        id: "willingToVisitPastHurt",
        label: "Are you willing to visit past hurtful situations to be free?",
        options: yesNoOptions,
        type: "radio",
      },
      { id: "yearsChristian", label: "How many years have you been a Christian?", type: "text", visibleWhen: [{ fieldId: "bornAgainChristian", equals: "Yes" }, { fieldId: "isChristianPhi", equals: "Yes" }] },
      { id: "waterBaptized", label: "Have you been water baptized?", options: yesNoOptions, type: "radio" },
      { id: "hasCurrentChurch", label: "Are you currently connected to a church?", options: yesNoOptions, type: "radio" },
      { id: "currentChurch", label: "Current church affiliation", type: "text", visibleWhen: { fieldId: "hasCurrentChurch", equals: "Yes" } },
      { id: "lastChurch", label: "Last church affiliation", type: "text", visibleWhen: { fieldId: "hasCurrentChurch", equals: ["No", "Not sure"] } },
      { id: "spiritualBackground", label: "Describe your spiritual background", type: "textarea" },
      { id: "cultInvolvement", label: "Have you been involved in a cult?", options: yesNoOptions, type: "radio" },
      { id: "cultName", label: "Name of the cult", type: "text", visibleWhen: { fieldId: "cultInvolvement", equals: "Yes" } },
      { id: "familyOccultInvolvement", label: "Have you or your relatives participated in occult activities?", options: yesNoOptions, type: "radio" },
      { id: "familyOccultActivity", label: "List the activity and relationship", type: "textarea", visibleWhen: { fieldId: "familyOccultInvolvement", equals: "Yes" } },
      { id: "spiritualIssues", label: "Describe any spiritual issues past or present that you feel are significant.", type: "textarea" },
    ],
    id: "spiritual",
    shortTitle: "Spiritual",
    title: "Spiritual Background",
  },
  {
    fields: [
      { id: "lifeSatisfaction", label: "What is your present satisfaction with life right now?", options: satisfactionOptions, type: "radio" },
      { id: "relationshipProblems", label: "Briefly describe any past or present problems regarding your personal relationships that you feel are significant.", type: "textarea" },
      { id: "physicalHealth", label: "Describe your level of physical health at this time.", options: satisfactionOptions, type: "radio" },
      { id: "mentalHealth", label: "Describe your level of mental health at this time.", options: satisfactionOptions, type: "radio" },
      { id: "takesPrescriptionMeds", label: "Are you taking prescription medications?", options: yesNoOptions, type: "radio" },
      { id: "prescriptionMeds", label: "Please share the reasons for these medications", type: "textarea", visibleWhen: { fieldId: "takesPrescriptionMeds", equals: "Yes" } },
      { id: "takesNonPrescriptionMeds", label: "Are you taking non-prescription medications?", options: yesNoOptions, type: "radio" },
      { id: "nonPrescriptionMeds", label: "Please share the reasons for these medications", type: "textarea", visibleWhen: { fieldId: "takesNonPrescriptionMeds", equals: "Yes" } },
      { id: "alcoholOrDrugs", label: "Are you using alcohol or illegal drugs to deal with your issues?", options: yesNoOptions, type: "radio" },
      { id: "bloodTransfusion", label: "Have you ever had an operation requiring a blood transfusion?", options: yesNoOptions, type: "radio" },
      { id: "lastWellSeason", label: "When was the last time you felt both physically and emotionally well for some time?", type: "textarea" },
    ],
    id: "lifeHealth",
    reviewNote: "Medical, medication, mental-health, substance-use, and blood-transfusion questions need final clinical/legal review and retention guidance.",
    shortTitle: "Life",
    title: "Present Life and Health",
  },
  {
    fields: [
      { id: "currentlyMarried", label: "Are you currently married?", options: yesNoOptions, type: "radio" },
      { id: "marriageCount", label: "How many times have you been married?", type: "text", visibleWhen: { fieldId: "currentlyMarried", equals: ["Yes", "No"] } },
      { id: "spouseFirstName", label: "Spouse first name", type: "text", visibleWhen: { fieldId: "currentlyMarried", equals: "Yes" } },
      { id: "yearsMarried", label: "Number of years married", type: "text", visibleWhen: { fieldId: "currentlyMarried", equals: "Yes" } },
      { id: "ageWhenMarried", label: "My age when married", type: "text", visibleWhen: { fieldId: "currentlyMarried", equals: "Yes" } },
      { id: "spouseAgeWhenMarried", label: "Spouse's age when married", type: "text", visibleWhen: { fieldId: "currentlyMarried", equals: "Yes" } },
      { id: "currentlyEngaged", label: "Are you currently engaged?", options: yesNoOptions, type: "radio", visibleWhen: { fieldId: "currentlyMarried", equals: ["No", "Not sure"] } },
      { id: "fianceFirstName", label: "Fiance(e) first name", type: "text", visibleWhen: { fieldId: "currentlyEngaged", equals: "Yes" } },
      { id: "yearsEngaged", label: "Number of years engaged", type: "text", visibleWhen: { fieldId: "currentlyEngaged", equals: "Yes" } },
      { id: "spouseTraitsLike", label: "Describe traits you like about your spouse or fiance(e).", type: "textarea", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "spouseTraitsDislike", label: "Describe traits you dislike about your spouse or fiance(e).", type: "textarea", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "spouseExpectations", label: "What expectations do you have for your spouse or fiance(e)'s behavior?", type: "textarea", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "spouseExpectationsMet", label: "Have your expectations been met?", options: yesNoOptions, type: "radio", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "spouseExpectationsWhyNot", label: "Why have your expectations not been met?", type: "textarea", visibleWhen: { fieldId: "spouseExpectationsMet", equals: "No" } },
      { id: "spouseConfide", label: "Can you confide in your spouse or fiance(e)?", options: yesNoOptions, type: "radio", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "spouseSatisfaction", label: "How satisfied are you with the relationship?", options: satisfactionOptions, type: "radio", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "spouseFamilyRelationship", label: "Describe your relationship with your spouse or fiance(e)'s family.", type: "textarea", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "marriageInterference", label: "Who, if anyone, has interfered with your marriage or plans? First names only.", type: "textarea", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "hasChildren", label: "Do you have children?", options: yesNoOptions, type: "radio" },
      { id: "childrenSatisfaction", label: "How satisfied are you with your current family regarding children?", options: satisfactionOptions, type: "radio", visibleWhen: { fieldId: "hasChildren", equals: "Yes" } },
      { id: "favoredChild", label: "Do you feel closer to one child? If so, please explain.", type: "textarea", visibleWhen: { fieldId: "hasChildren", equals: "Yes" } },
      { id: "childrenDifficulty", label: "Describe any difficulty you or your spouse may be having with your children.", type: "textarea", visibleWhen: { fieldId: "hasChildren", equals: "Yes" } },
      { id: "childrenConfide", label: "Do you feel your children confide in you?", options: yesNoOptions, type: "radio", visibleWhen: { fieldId: "hasChildren", equals: "Yes" } },
      { id: "everDivorced", label: "Have you ever been divorced?", options: yesNoOptions, type: "radio" },
      { id: "exSpouseFirstName", label: "Former spouse first name", type: "text", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
      { id: "exYearsMarried", label: "Number of years married to former spouse", type: "text", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
      { id: "exAgeWhenMarried", label: "My age when that marriage began", type: "text", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
      { id: "exSpouseAgeWhenMarried", label: "Former spouse's age when married", type: "text", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
      { id: "exTraitsLike", label: "Describe traits you liked about your former spouse.", type: "textarea", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
      { id: "exTraitsDislike", label: "Describe traits you disliked about your former spouse.", type: "textarea", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
      { id: "exFamilyRelationship", label: "Describe your relationship with your former spouse's family.", type: "textarea", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
    ],
    id: "relationships",
    reviewNote: "Family and relationship follow-ups open only when relevant.",
    shortTitle: "Relationships",
    title: "Marriage, Children, and Relationships",
  },
  {
    fields: [
      { id: "fatherNameOccupation", label: "Father's first name and occupation", type: "text" },
      { id: "stepfatherNameOccupation", label: "Stepfather's first name and occupation", type: "text" },
      { id: "motherNameOccupation", label: "Mother's first name and occupation", type: "text" },
      { id: "stepmotherNameOccupation", label: "Stepmother's first name and occupation", type: "text" },
      { id: "orphanageFosterHome", label: "Did you grow up in an orphanage or foster home?", options: yesNoOptions, type: "radio" },
      { id: "orphanageFosterAges", label: "If yes, from what age to what age?", type: "text" },
      { id: "fatherTraits", label: "Father traits when you were young", options: parentTraitOptions, type: "checkbox-group" },
      { id: "stepfatherTraits", label: "Stepfather traits when you were young", options: parentTraitOptions, type: "checkbox-group" },
      { id: "motherTraits", label: "Mother traits when you were young", options: parentTraitOptions, type: "checkbox-group" },
      { id: "stepmotherTraits", label: "Stepmother traits when you were young", options: parentTraitOptions, type: "checkbox-group" },
      { id: "likedFather", label: "What did you like about your father?", type: "textarea" },
      { id: "dislikedFather", label: "What didn't you like about your father?", type: "textarea" },
      { id: "fatherRelationship", label: "Describe your father's relationship with you.", type: "textarea" },
      { id: "fatherNatureNow", label: "Describe your father's nature now.", type: "textarea" },
      { id: "likedMother", label: "What did you like about your mother?", type: "textarea" },
      { id: "dislikedMother", label: "What didn't you like about your mother?", type: "textarea" },
      { id: "motherRelationship", label: "Describe your mother's nature and relationship with you.", type: "textarea" },
      { id: "parentsBirthFeelings", label: "Describe your parents' feelings about your birth.", type: "textarea" },
      { id: "parentsRelationship", label: "Describe your parents' relationship to each other.", type: "textarea" },
      { id: "parentsDiscipline", label: "Describe how your parents disciplined you.", type: "textarea" },
      { id: "parentConfide", label: "Which parent, if any, could you confide in?", type: "text" },
      { id: "houseValues", label: "Describe the important values in your house.", type: "textarea" },
      { id: "childhoodAtmosphere", label: "Household childhood atmosphere", options: householdAtmosphereOptions, type: "checkbox-group" },
      { id: "childhoodExperience", label: "Overall childhood experience", options: childhoodExperienceOptions, type: "radio" },
      { id: "childhoodFears", label: "Describe any childhood fears or conditions.", helper: "Examples from source: bed-wetting, thumb sucking, etc.", type: "textarea" },
      { id: "siblingsGrowingUp", label: "Describe your relationship with siblings growing up.", type: "textarea" },
      { id: "siblingsNow", label: "Describe your relationship with your siblings now.", type: "textarea" },
    ],
    id: "childhood",
    shortTitle: "Childhood",
    title: "Parents, Childhood, and Siblings",
  },
  {
    fields: [
      { id: "sexualityGrowingUp", label: "How would you characterize your sexuality growing up?", options: sexualityExperienceOptions, type: "radio" },
      { id: "oppositeSexTrauma", label: "Did you have any trauma or anxieties arising out of a sexual experience with the opposite sex?", options: yesNoOptions, type: "radio" },
      { id: "sameSexTrauma", label: "Did you have any trauma or anxieties arising out of a sexual experience with the same sex?", options: yesNoOptions, type: "radio" },
      { id: "pornExposureAge", label: "At what age were you exposed to pornographic material?", type: "text" },
      { id: "sexualBackgroundNotes", label: "Anything else you want the restoration team to understand about this area?", type: "textarea" },
    ],
    id: "sexualBackground",
    reviewNote: "This entire section needs final MOR/founder trauma-informed wording, mandatory-reporting review, and pastoral/legal boundaries.",
    shortTitle: "Sensitive",
    title: "Sexual Background and Trauma-Sensitive Questions",
  },
  {
    description: "Select only what feels relevant. You may skip anything unclear.",
    fields: [
      ...hindranceCategories.map((category) => ({
        contentReview: "review" in category ? category.review : false,
        id: `hindrance_${category.id}`,
        label: category.label,
        options: category.options,
        type: "checkbox-group" as const,
      })),
      { id: "otherEmotionalMental", label: "Other emotional or mental issues", type: "textarea" },
      { id: "otherAddictionsMisc", label: "Other addictions or miscellaneous issues", type: "textarea" },
      { id: "otherPhysicalTraumas", label: "Other physical issues or traumas", type: "textarea" },
      { id: "otherFalseReligions", label: "Other false religions", contentReview: true, type: "textarea" },
    ],
    id: "hindrance",
    reviewNote: "Multiple classifications are theological, clinical, or stigmatizing. They are digitized for founder review, not final content approval.",
    shortTitle: "Inventory",
    title: "Personal Hindrance Inventory",
  },
  {
    description: "Select any items that apply to you or your family or ancestors.",
    fields: [
      { id: "occultInvolvement", label: "Occult involvement", options: occultInvolvementOptions, contentReview: true, type: "checkbox-group" },
      { id: "otherOccult", label: "Other occult involvement not listed above", contentReview: true, type: "textarea" },
    ],
    id: "occult",
    reviewNote: "Occult list is reproduced as source coverage and needs MOR content approval before production.",
    shortTitle: "Occult",
    title: "Occult Involvement",
  },
  {
    fields: [
      { id: "familyTreeSelf", label: "Myself: first name, age, years married", type: "textarea" },
      { id: "familyTreeFather", label: "Father / stepfather: first names, ages, years married", type: "textarea" },
      { id: "familyTreeMother", label: "Mother / stepmother: first names, ages, years married", type: "textarea" },
      { id: "familyTreeSiblings", label: "My siblings: first names, ages, years married", type: "textarea" },
      { id: "familyTreeSpouse", label: "My spouse: first name, age, years married", type: "textarea" },
      { id: "familyTreeExSpouse", label: "X-spouse: first name, age, years married", type: "textarea" },
      { id: "familyTreeChildren", label: "My children: first names, ages, years married", type: "textarea" },
      { id: "miscarriagesAbortions", label: "Number of miscarriages / abortions", type: "text" },
      { id: "otherRelationshipFigures", label: "Other relationship figures noted on source form", helper: "Boss, coach, teacher, bully, pastor, friends, God.", type: "textarea" },
    ],
    id: "familyTree",
    reviewNote: "The source form asks for family-tree details but leaves a large internal-use area blank. Production should define exactly what is participant-entered versus staff-entered.",
    shortTitle: "Family Tree",
    title: "Family and Relationship History",
  },
  {
    fields: [
      { id: "additionalInformation", label: "Anything else about yourself, your family, or ancestors that may be pertinent?", type: "textarea" },
      { id: "continuedAnswers", label: "Continuation of prior answers", helper: "Include the question or section name before each continuation.", type: "textarea" },
      {
        id: "truthfulInitials",
        label: "I have read each section and answered all items truthfully.",
        required: true,
        type: "checkbox",
      },
      {
        id: "noGuaranteeInitials",
        label: "I understand the ministry team cannot guarantee an end to all problems or the personal changes I desire.",
        required: true,
        type: "checkbox",
      },
      {
        contentReview: true,
        id: "manifestationHoldHarmlessInitials",
        label: "I understand I may experience physical manifestations during ministry and acknowledge the source-form hold-harmless language requires final review.",
        required: true,
        type: "checkbox",
      },
    ],
    id: "additional",
    reviewNote: "Hold-harmless language should be reviewed by founder/MOR and counsel before production.",
    shortTitle: "Additional",
    title: "Additional Information",
  },
];

export const restorationReviewSections = [
  { id: "audit", title: "Access Audit" },
  { id: "answers", title: "Restricted Answers" },
  { id: "handoff", title: "Discipleship Handoff" },
] as const;

export const restorationStatuses = [
  "invited",
  "started",
  "last_saved",
  "submitted",
  "under_review",
  "meeting_scheduled",
  "in_restoration",
  "completed",
  "declined_closed",
] as const;

export const restorationHandoffOutcomes = [
  "Begin discipleship",
  "Begin discipleship alongside focused restoration",
  "Prioritize specialized restoration, then begin structured discipleship",
] as const;

export function getRestorationSection(sectionId: string) {
  return restorationSections.find((section) => section.id === sectionId);
}

export function restorationSectionCompletion(section: RestorationSection, values: Record<string, unknown>) {
  const answered = section.fields.filter((field) => {
    const value = values[field.id];

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return typeof value === "string" ? value.trim().length > 0 : value === true;
  }).length;

  return {
    answered,
    total: section.fields.length,
  };
}
