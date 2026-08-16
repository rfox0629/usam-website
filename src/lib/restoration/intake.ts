/**
 * Field configuration for the Mission of Reconciliation restoration intake.
 *
 * Voice: we come alongside people. Nothing here should read as an expert
 * assessing someone who needs to be fixed. Keep the form relational and
 * focused on Jesus as healer, restorer, and source of freedom.
 *
 * Submissions post to /api/form-submissions with formType "restoration" and a
 * payload of { form, submittedAt, values, version }. Keep that shape stable so
 * responses keep landing in the USA Missionaries Operations Platform.
 */

export const restorationPayloadVersion = 2;

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
  },
  {
    id: "angerIssues",
    label: "Anger",
    options: ["Aggressiveness", "Bitterness", "Hatred", "Murder", "Rage", "Revenge", "Silent treatment", "Temper", "Temper tantrums", "Unforgiveness", "Violence", "Vandalism"],
  },
  {
    id: "victimMentality",
    label: "Feeling Overlooked or Unwanted",
    options: ["Abandoned", "Unwanted", "Conceived or born out of wedlock", "Illegitimacy", "Divorced", "Doubt", "Expecting failure", "Hopelessness", "Despair", "Inadequacy", "Insecurity", "Inferiority", "Loneliness", "Isolation", "Passiveness", "Shyness", "Self-pity", "Unworthiness", "Worthlessness"],
  },
  {
    id: "emotionalIssues",
    label: "Emotional Burdens",
    options: ["Abandonment", "Abortion guilt", "Broken heart", "Depression", "Moodiness", "Gender confusion", "Guilt", "Shame", "Hurt", "Deep hurt", "Nightmares", "Insomnia", "Orphan", "Rejection by others", "Self-rejection", "Self-hatred", "Self-harming", "Self-punishment", "Suicidal", "Wounded spirit"],
  },
  {
    id: "sexualBackgroundItems",
    label: "Sexual Background",
    options: ["Adultery", "Fornication", "Homosexuality", "Incest", "Lust", "Pornography", "Masturbation", "Molestation", "Rape", "Sexual abuse of others", "Sexual perversion", "Sexual dreams", "Cross dressing", "Sexual difficulties"],
  },
  {
    id: "addictions",
    label: "Addictions",
    options: ["Alcohol", "Anorexia", "Bulimia", "Caffeine", "Fingernail biting", "Illegal drugs", "Prescription medications", "Overeating", "Shopping", "Kleptomania", "Smoking", "Social media", "Phone", "Video games"],
  },
  {
    id: "mentalIllness",
    label: "Mental and Emotional Health",
    options: ["ADD / ADHD", "Autistic disorders", "Bipolar disorders", "Narcissism", "Obsessive compulsive", "Schizophrenia / voices", "Mental confusion", "Mental torment", "Unable to keep job"],
  },
  {
    id: "traumas",
    label: "Trauma",
    options: ["Abused physically", "Abused mentally", "Assaulted", "Raped", "Traumatic loss", "Accident", "Near death experiences"],
  },
  {
    id: "physicalDiseases",
    label: "Physical Health",
    options: ["Autoimmune disease", "Cancer", "Diabetes", "Premenstrual syndrome", "Heart / lung / stroke", "Kidney stones / cyst", "Migraine headaches", "Sexually transmitted disease", "Received anesthesia", "Received organ transplant", "Received blood transfusion", "Vertigo"],
  },
  {
    id: "miscellaneous",
    label: "Other Patterns",
    options: ["Cursing", "Denial", "Avoidance", "Exaggeration", "Forgetfulness", "Lying", "Compulsive lying"],
  },
  {
    id: "falseReligions",
    label: "Other Religious Backgrounds",
    options: ["Buddhism", "Humanism", "Islam", "Eastern religions", "Hinduism", "Confucianism", "Jehovah Witnesses", "Mormonism", "Native American Spiritism", "New Age", "Atheism", "Pantheism", "Scientology", "Secret societies", "Universalism / Unity", "False doctrine"],
  },
] as const;

export const occultInvolvementOptions = [
  "Amulets",
  "Ancestral spirits",
  "Angel worship",
  "Animal / human sacrifice",
  "Astral projection",
  "Astrology",
  "Blood sacrifices",
  "Channeling",
  "Chanting",
  "Clairvoyance / ESP",
  "Conjuring",
  "Consulting a psychic",
  "Crystal balls",
  "Divination",
  "Dream catchers",
  "Eastern Star",
  "Eckankar",
  "Enneagram",
  "Familiar spirits",
  "Fortune telling",
  "Free Masonry",
  "Grave sucking",
  "Graven images",
  "Hexes / vexes",
  "Horoscopes",
  "Hypnosis",
  "Idolatry",
  "Illuminati / Luciferianism",
  "Incense",
  "Kundalini",
  "Levitation",
  "Magic - black or white",
  "Meditation / transcendental meditation",
  "Mediums",
  "Meta-physics",
  "Mind control",
  "Necromancy",
  "New Age practices",
  "Order of the Rainbow",
  "Ouija board",
  "Palm reading",
  "Pentagram",
  "Reiki",
  "Reincarnation",
  "Satanic ritual abuse",
  "Satanic rituals",
  "Satanism",
  "Seances",
  "Shamanism",
  "Sorcery",
  "Soul travel",
  "Spells",
  "Spirit guide",
  "Spiritism",
  "Superstition",
  "Table tipping",
  "Tarot cards",
  "Tea leaves",
  "Telekinesis",
  "Voodoo",
  "Water witching",
  "Wiccan",
  "Witch doctors",
  "Witchcraft",
  "Yoga",
] as const;

export const restorationSections: readonly RestorationSection[] = [
  {
    description: "A few things to know before you begin, and how we can reach you.",
    fields: [
      {
        helper: "Only the people coming alongside you, and those who oversee this ministry, will read what you share.",
        id: "confidentialityAcknowledgement",
        label: "I understand what I share here will be kept confidential and read only by those who will come alongside me.",
        required: true,
        type: "checkbox",
      },
      {
        helper: "There are limits to confidentiality when someone is in immediate danger, when abuse is happening now, or when the law requires us to report.",
        id: "informedConsent",
        label: "I am choosing to share this freely, and I understand the limits of confidentiality.",
        required: true,
        type: "checkbox",
      },
      {
        helper: "Walking with someone spiritually is not a replacement for emergency help, medical care, or professional care.",
        id: "careAcknowledgement",
        label: "I understand this is spiritual care and does not replace emergency, medical, or professional care.",
        required: true,
        type: "checkbox",
      },
      {
        helper: "If this is happening right now, please stop and contact local emergency help. In the United States you can also call or text 988.",
        id: "immediateDanger",
        label: "Is there immediate danger, current abuse, or thoughts of ending your life right now?",
        options: yesNoOptions,
        required: true,
        type: "radio",
      },
      { id: "participantName", label: "What name would you like us to use?", type: "text" },
      { helper: "This is how we will reach out to you.", id: "participantEmail", label: "Email", required: true, type: "email" },
      { id: "participantPhone", label: "Phone (optional)", type: "text" },
    ],
    id: "welcome",
    shortTitle: "Welcome",
    title: "Welcome",
  },
  {
    description: "Tell us what is on your heart. You do not need the right words.",
    fields: [
      { id: "todaysDate", label: "Today's date", type: "date" },
      { id: "whatBringsYouHere", label: "What brought you to reach out?", required: true, type: "textarea" },
      { id: "restorationGoals", label: "What are you hoping God will do as someone walks alongside you?", required: true, type: "textarea" },
      { id: "previousDeliverance", label: "Have you walked through a restoration or freedom process before?", options: yesNoOptions, type: "radio" },
      { id: "previousProfessionalCare", label: "Have you received professional care for any of this?", options: yesNoOptions, type: "radio" },
      { id: "servedMilitary", label: "Have you served in the military?", options: yesNoOptions, type: "radio" },
      { id: "combatExperience", label: "Were you in combat?", options: yesNoOptions, type: "radio", visibleWhen: { fieldId: "servedMilitary", equals: "Yes" } },
    ],
    id: "goals",
    shortTitle: "Your Story",
    title: "What You Are Seeking",
  },
  {
    fields: [
      { id: "bornAgainChristian", label: "Have you given your life to Jesus?", options: yesNoOptions, type: "radio" },
      {
        id: "jesusAuthorityFreedom",
        label: "Do you believe Jesus has all power and authority, and are you willing to walk in freedom?",
        options: yesNoOptions,
        type: "radio",
      },
      {
        id: "willingToVisitPastHurt",
        label: "Are you willing to revisit painful places from the past so Jesus can bring healing there?",
        options: yesNoOptions,
        type: "radio",
      },
      { id: "yearsChristian", label: "How long have you been following Jesus?", type: "text", visibleWhen: { fieldId: "bornAgainChristian", equals: "Yes" } },
      { id: "waterBaptized", label: "Have you been baptized in water?", options: yesNoOptions, type: "radio" },
      { id: "hasCurrentChurch", label: "Are you currently connected to a church?", options: yesNoOptions, type: "radio" },
      { id: "currentChurch", label: "Which church?", type: "text", visibleWhen: { fieldId: "hasCurrentChurch", equals: "Yes" } },
      { id: "lastChurch", label: "Where did you last attend?", type: "text", visibleWhen: { fieldId: "hasCurrentChurch", equals: ["No", "Not sure"] } },
      { id: "spiritualBackground", label: "Describe your spiritual background", type: "textarea" },
      { id: "cultInvolvement", label: "Have you been involved in a cult?", options: yesNoOptions, type: "radio" },
      { id: "cultName", label: "Which one?", type: "text", visibleWhen: { fieldId: "cultInvolvement", equals: "Yes" } },
      { id: "familyOccultInvolvement", label: "Have you or your relatives participated in occult activities?", options: yesNoOptions, type: "radio" },
      { id: "familyOccultActivity", label: "Share the activity and the relationship", type: "textarea", visibleWhen: { fieldId: "familyOccultInvolvement", equals: "Yes" } },
      { id: "spiritualIssues", label: "Is there anything else spiritually, past or present, that feels significant to you?", type: "textarea" },
    ],
    id: "spiritual",
    shortTitle: "Faith",
    title: "Walking with Jesus",
  },
  {
    fields: [
      { id: "lifeSatisfaction", label: "How would you describe your life right now?", options: satisfactionOptions, type: "radio" },
      { id: "relationshipProblems", label: "Briefly describe anything in your relationships, past or present, that feels significant.", type: "textarea" },
      { id: "physicalHealth", label: "How is your physical health right now?", options: satisfactionOptions, type: "radio" },
      { id: "mentalHealth", label: "How are you doing emotionally and mentally right now?", options: satisfactionOptions, type: "radio" },
      { id: "takesPrescriptionMeds", label: "Are you taking prescription medications?", options: yesNoOptions, type: "radio" },
      { id: "prescriptionMeds", label: "What are they for?", type: "textarea", visibleWhen: { fieldId: "takesPrescriptionMeds", equals: "Yes" } },
      { id: "takesNonPrescriptionMeds", label: "Are you taking non-prescription medications?", options: yesNoOptions, type: "radio" },
      { id: "nonPrescriptionMeds", label: "What are they for?", type: "textarea", visibleWhen: { fieldId: "takesNonPrescriptionMeds", equals: "Yes" } },
      { id: "alcoholOrDrugs", label: "Are you using alcohol or drugs to cope with any of this?", options: yesNoOptions, type: "radio" },
      { id: "bloodTransfusion", label: "Have you ever had an operation requiring a blood transfusion?", options: yesNoOptions, type: "radio" },
      { id: "lastWellSeason", label: "When was the last time you felt well, both physically and emotionally, for a season?", type: "textarea" },
    ],
    id: "lifeHealth",
    shortTitle: "Life Today",
    title: "Life and Health Today",
  },
  {
    description: "Questions open up only when they apply to you.",
    fields: [
      { id: "currentlyMarried", label: "Are you currently married?", options: yesNoOptions, type: "radio" },
      { id: "marriageCount", label: "How many times have you been married?", type: "text", visibleWhen: { fieldId: "currentlyMarried", equals: ["Yes", "No"] } },
      { id: "spouseFirstName", label: "Spouse's first name", type: "text", visibleWhen: { fieldId: "currentlyMarried", equals: "Yes" } },
      { id: "yearsMarried", label: "Years married", type: "text", visibleWhen: { fieldId: "currentlyMarried", equals: "Yes" } },
      { id: "ageWhenMarried", label: "Your age when you married", type: "text", visibleWhen: { fieldId: "currentlyMarried", equals: "Yes" } },
      { id: "spouseAgeWhenMarried", label: "Their age when you married", type: "text", visibleWhen: { fieldId: "currentlyMarried", equals: "Yes" } },
      { id: "currentlyEngaged", label: "Are you currently engaged?", options: yesNoOptions, type: "radio", visibleWhen: { fieldId: "currentlyMarried", equals: ["No", "Not sure"] } },
      { id: "fianceFirstName", label: "Their first name", type: "text", visibleWhen: { fieldId: "currentlyEngaged", equals: "Yes" } },
      { id: "yearsEngaged", label: "How long have you been engaged?", type: "text", visibleWhen: { fieldId: "currentlyEngaged", equals: "Yes" } },
      { id: "spouseTraitsLike", label: "What do you love about them?", type: "textarea", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "spouseTraitsDislike", label: "What is hard between you?", type: "textarea", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "spouseExpectations", label: "What do you expect of them?", type: "textarea", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "spouseExpectationsMet", label: "Have those expectations been met?", options: yesNoOptions, type: "radio", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "spouseExpectationsWhyNot", label: "What has made that difficult?", type: "textarea", visibleWhen: { fieldId: "spouseExpectationsMet", equals: "No" } },
      { id: "spouseConfide", label: "Can you confide in them?", options: yesNoOptions, type: "radio", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "spouseSatisfaction", label: "How would you describe the relationship right now?", options: satisfactionOptions, type: "radio", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "spouseFamilyRelationship", label: "Describe your relationship with their family.", type: "textarea", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "marriageInterference", label: "Has anyone come between you? First names only.", type: "textarea", visibleWhen: [{ fieldId: "currentlyMarried", equals: "Yes" }, { fieldId: "currentlyEngaged", equals: "Yes" }] },
      { id: "hasChildren", label: "Do you have children?", options: yesNoOptions, type: "radio" },
      { id: "childrenSatisfaction", label: "How are things with your children right now?", options: satisfactionOptions, type: "radio", visibleWhen: { fieldId: "hasChildren", equals: "Yes" } },
      { id: "favoredChild", label: "Do you feel closer to one child? If so, tell us about it.", type: "textarea", visibleWhen: { fieldId: "hasChildren", equals: "Yes" } },
      { id: "childrenDifficulty", label: "Describe anything difficult you are walking through with your children.", type: "textarea", visibleWhen: { fieldId: "hasChildren", equals: "Yes" } },
      { id: "childrenConfide", label: "Do your children confide in you?", options: yesNoOptions, type: "radio", visibleWhen: { fieldId: "hasChildren", equals: "Yes" } },
      { id: "everDivorced", label: "Have you ever been divorced?", options: yesNoOptions, type: "radio" },
      { id: "exSpouseFirstName", label: "Former spouse's first name", type: "text", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
      { id: "exYearsMarried", label: "Years married", type: "text", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
      { id: "exAgeWhenMarried", label: "Your age when that marriage began", type: "text", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
      { id: "exSpouseAgeWhenMarried", label: "Their age when that marriage began", type: "text", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
      { id: "exTraitsLike", label: "What did you love about them?", type: "textarea", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
      { id: "exTraitsDislike", label: "What was hard between you?", type: "textarea", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
      { id: "exFamilyRelationship", label: "Describe your relationship with their family.", type: "textarea", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
    ],
    id: "relationships",
    shortTitle: "Family",
    title: "Marriage, Children, and Relationships",
  },
  {
    fields: [
      { id: "fatherNameOccupation", label: "Father's first name and occupation", type: "text" },
      { id: "hadStepfather", label: "Did you have a stepfather or father figure growing up?", options: yesNoOptions, type: "radio" },
      { id: "stepfatherNameOccupation", label: "His first name and occupation", type: "text", visibleWhen: { fieldId: "hadStepfather", equals: "Yes" } },
      { id: "motherNameOccupation", label: "Mother's first name and occupation", type: "text" },
      { id: "hadStepmother", label: "Did you have a stepmother or mother figure growing up?", options: yesNoOptions, type: "radio" },
      { id: "stepmotherNameOccupation", label: "Her first name and occupation", type: "text", visibleWhen: { fieldId: "hadStepmother", equals: "Yes" } },
      { id: "orphanageFosterHome", label: "Did you grow up in an orphanage or foster home?", options: yesNoOptions, type: "radio" },
      { id: "orphanageFosterAges", label: "From what age to what age?", type: "text", visibleWhen: { fieldId: "orphanageFosterHome", equals: "Yes" } },
      { id: "fatherTraits", label: "Your father, when you were young", options: parentTraitOptions, type: "checkbox-group" },
      { id: "stepfatherTraits", label: "Your stepfather or father figure, when you were young", options: parentTraitOptions, type: "checkbox-group", visibleWhen: { fieldId: "hadStepfather", equals: "Yes" } },
      { id: "motherTraits", label: "Your mother, when you were young", options: parentTraitOptions, type: "checkbox-group" },
      { id: "stepmotherTraits", label: "Your stepmother or mother figure, when you were young", options: parentTraitOptions, type: "checkbox-group", visibleWhen: { fieldId: "hadStepmother", equals: "Yes" } },
      { id: "likedFather", label: "What did you love about your father?", type: "textarea" },
      { id: "dislikedFather", label: "What was hard about your father?", type: "textarea" },
      { id: "fatherRelationship", label: "Describe his relationship with you.", type: "textarea" },
      { id: "fatherNatureNow", label: "What is he like now?", type: "textarea" },
      { id: "likedMother", label: "What did you love about your mother?", type: "textarea" },
      { id: "dislikedMother", label: "What was hard about your mother?", type: "textarea" },
      { id: "motherRelationship", label: "Describe her relationship with you.", type: "textarea" },
      { id: "parentsBirthFeelings", label: "How did your parents feel about your birth?", type: "textarea" },
      { id: "parentsRelationship", label: "Describe your parents' relationship with each other.", type: "textarea" },
      { id: "parentsDiscipline", label: "How did your parents discipline you?", type: "textarea" },
      { id: "parentConfide", label: "Which parent, if any, could you confide in?", type: "text" },
      { id: "houseValues", label: "What was valued in your home?", type: "textarea" },
      { id: "childhoodAtmosphere", label: "What was your home like growing up?", options: householdAtmosphereOptions, type: "checkbox-group" },
      { id: "childhoodExperience", label: "Overall, how would you describe your childhood?", options: childhoodExperienceOptions, type: "radio" },
      { id: "childhoodFears", label: "Were there fears or struggles you carried as a child?", type: "textarea" },
      { id: "hasSiblings", label: "Do you have siblings or step-siblings?", options: yesNoOptions, type: "radio" },
      { id: "siblingsGrowingUp", label: "Describe your relationship with them growing up.", type: "textarea", visibleWhen: { fieldId: "hasSiblings", equals: "Yes" } },
      { id: "siblingsNow", label: "Describe your relationship with them now.", type: "textarea", visibleWhen: { fieldId: "hasSiblings", equals: "Yes" } },
    ],
    id: "childhood",
    shortTitle: "Childhood",
    title: "Parents, Childhood, and Siblings",
  },
  {
    description: "Share only what you are comfortable sharing. You can say as much or as little as you want, and you can leave anything blank.",
    fields: [
      { id: "sexualityGrowingUp", label: "How would you describe this area of your life growing up?", options: sexualityExperienceOptions, type: "radio" },
      { id: "oppositeSexTrauma", label: "Did you experience trauma or fear from a sexual experience with the opposite sex?", options: yesNoOptions, type: "radio" },
      { id: "oppositeSexTraumaDetails", label: "Share only what you want us to understand", type: "textarea", visibleWhen: { fieldId: "oppositeSexTrauma", equals: "Yes" } },
      { id: "sameSexTrauma", label: "Did you experience trauma or fear from a sexual experience with the same sex?", options: yesNoOptions, type: "radio" },
      { id: "sameSexTraumaDetails", label: "Share only what you want us to understand", type: "textarea", visibleWhen: { fieldId: "sameSexTrauma", equals: "Yes" } },
      { id: "pornExposure", label: "Have you been exposed to pornography?", options: yesNoOptions, type: "radio" },
      { id: "pornExposureAge", label: "How old were you the first time?", type: "text", visibleWhen: { fieldId: "pornExposure", equals: "Yes" } },
      { id: "sexualBackgroundNotes", label: "Anything else you want us to understand about this area?", type: "textarea" },
    ],
    id: "sexualBackground",
    shortTitle: "Sensitive",
    title: "A Sensitive Area",
  },
  {
    description: "Select only what feels true for you. Skip anything that does not apply, and skip anything you would rather talk through in person.",
    fields: [
      ...hindranceCategories.flatMap((category) => [
        {
          id: `hasHindrance_${category.id}`,
          label: `Does anything under ${category.label.toLowerCase()} apply to you?`,
          options: yesNoOptions,
          type: "radio" as const,
        },
        {
          id: `hindrance_${category.id}`,
          label: category.label,
          options: category.options,
          type: "checkbox-group" as const,
          visibleWhen: { fieldId: `hasHindrance_${category.id}`, equals: "Yes" },
        },
      ]),
      { id: "otherEmotionalMental", label: "Anything else emotionally or mentally", type: "textarea" },
      { id: "otherAddictionsMisc", label: "Anything else you feel bound by", type: "textarea" },
      { id: "otherPhysicalTraumas", label: "Anything else physically, or any other trauma", type: "textarea" },
      { id: "otherFalseReligions", label: "Any other religious background", type: "textarea" },
    ],
    id: "hindrance",
    shortTitle: "Carrying",
    title: "Things You May Be Carrying",
  },
  {
    description: "The detailed list opens only if this applies to you.",
    fields: [
      { id: "hasOccultInvolvement", label: "Have you, your family, or your ancestors had any occult involvement?", options: yesNoOptions, type: "radio" },
      { id: "occultInvolvement", label: "Select anything that applies", options: occultInvolvementOptions, type: "checkbox-group", visibleWhen: { fieldId: "hasOccultInvolvement", equals: "Yes" } },
      { id: "otherOccult", label: "Anything not listed above", type: "textarea", visibleWhen: { fieldId: "hasOccultInvolvement", equals: "Yes" } },
    ],
    id: "occult",
    shortTitle: "Occult",
    title: "Occult Involvement",
  },
  {
    description: "First names, ages, and years married are enough.",
    fields: [
      { id: "familyTreeSelf", label: "You", type: "textarea" },
      { id: "familyTreeFather", label: "Father and stepfather", type: "textarea" },
      { id: "familyTreeMother", label: "Mother and stepmother", type: "textarea" },
      { id: "familyTreeSiblings", label: "Your siblings", type: "textarea", visibleWhen: { fieldId: "hasSiblings", equals: "Yes" } },
      { id: "familyTreeSpouse", label: "Your spouse", type: "textarea", visibleWhen: { fieldId: "currentlyMarried", equals: "Yes" } },
      { id: "familyTreeExSpouse", label: "Former spouse", type: "textarea", visibleWhen: { fieldId: "everDivorced", equals: "Yes" } },
      { id: "familyTreeChildren", label: "Your children", type: "textarea", visibleWhen: { fieldId: "hasChildren", equals: "Yes" } },
      { id: "pregnancyLossHistory", label: "Have you experienced miscarriage or abortion?", options: yesNoOptions, type: "radio" },
      { id: "miscarriagesAbortions", label: "How many?", type: "text", visibleWhen: { fieldId: "pregnancyLossHistory", equals: "Yes" } },
      { id: "otherRelationshipFigures", label: "Anyone else who shaped you", helper: "A boss, coach, teacher, pastor, friend, or someone who hurt you.", type: "textarea" },
    ],
    id: "familyTree",
    shortTitle: "Family Tree",
    title: "Family and Relationship History",
  },
  {
    fields: [
      { id: "additionalInformation", label: "Is there anything else about you, your family, or your ancestors we should understand?", type: "textarea" },
      { id: "continuedAnswers", label: "More room, if you ran out of space anywhere", helper: "Name the question or section before each continuation.", type: "textarea" },
      {
        id: "truthfulInitials",
        label: "I have read each section and answered as honestly as I am able.",
        required: true,
        type: "checkbox",
      },
      {
        id: "noGuaranteeInitials",
        label: "I understand that Jesus is the one who heals and restores, and that no one here can promise a particular outcome or timeline.",
        required: true,
        type: "checkbox",
      },
      {
        helper: "Some people experience strong emotions or physical responses as Jesus works in painful places. Those walking with you are serving in good faith and are not responsible for those responses.",
        id: "manifestationHoldHarmlessInitials",
        label: "I understand this process can surface deep emotion, and I am entering it willingly.",
        required: true,
        type: "checkbox",
      },
    ],
    id: "additional",
    shortTitle: "Anything Else",
    title: "Anything Else",
  },
];

export function getRestorationSection(sectionId: string) {
  return restorationSections.find((section) => section.id === sectionId);
}

export function restorationFieldIsVisible(field: RestorationField, values: Record<string, unknown>) {
  if (!field.visibleWhen) {
    return true;
  }

  const conditions = Array.isArray(field.visibleWhen) ? field.visibleWhen : [field.visibleWhen];

  return conditions.some((condition) => {
    const expected = Array.isArray(condition.equals) ? condition.equals : [condition.equals];
    return expected.includes(String(values[condition.fieldId] ?? ""));
  });
}

export function restorationSectionCompletion(section: RestorationSection, values: Record<string, unknown>) {
  const visibleFields = section.fields.filter((field) => restorationFieldIsVisible(field, values));
  const answered = visibleFields.filter((field) => {
    const value = values[field.id];

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return typeof value === "string" ? value.trim().length > 0 : value === true;
  }).length;

  return {
    answered,
    total: visibleFields.length,
  };
}
