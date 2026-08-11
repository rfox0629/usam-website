import { dosPrayerResources } from "@/src/lib/dos/prayer-resources";
import type { DosResourceAssignmentFollowUpCadence } from "@/src/lib/dos/resource-assignments";

export type DosResourceCategory =
  | "Table Teachings"
  | "Commands of Jesus"
  | "Relationships"
  | "Prayer"
  | "Discipleship";

export type DosResourceType = "assessment" | "challenge" | "guide" | "guided_resource" | "prayer" | "reading_plan" | "teaching";

export type DosGuidedResourceDifficulty = "beginner" | "intermediate" | "advanced";

export type DosGuidedResourceFormat = "bible_reading_plan" | "book" | "course" | "other" | "podcast" | "video_series";

export type DosResourceAccessLink = {
  href: string;
  label: string;
  type: "access" | "leader_guide" | "other" | "publisher" | "purchase";
};

export type DosResourceAssignmentTarget = "group" | "individual" | "organization";

export type DosGuidedResourceSessionChapter = {
  assignment: string;
  bigIdea?: string;
  chapterQuestion: string;
  keyScriptures?: readonly string[];
  order: number;
  title: string;
};

export type DosGuidedResourceSession = {
  actionStep: string;
  assignment: string;
  beginWithPrayer?: string;
  bigIdea?: string;
  chapterQuestion?: string;
  chapters?: readonly DosGuidedResourceSessionChapter[];
  id: string;
  keyScriptures?: readonly string[];
  leaderNotes?: string;
  listenCarefully?: string;
  lookForChrist?: string;
  moveTowardOthers?: string;
  multiply?: string;
  order: number;
  personalReflection?: string;
  prayerFocus: string;
  respondPersonally?: string;
  title: string;
};

export type DosResourceIcon =
  | "baptism"
  | "bible"
  | "book"
  | "church"
  | "discipleship"
  | "fasting"
  | "giving"
  | "heart"
  | "hospitality"
  | "prayer"
  | "relationship"
  | "sabbath"
  | "send"
  | "sparkles";

export type DosResource = {
  accessLinks?: readonly DosResourceAccessLink[];
  assignable?: boolean;
  assignmentDefaults?: {
    defaultMessage?: string;
    durationDays?: number;
    followUpCadence?: DosResourceAssignmentFollowUpCadence;
  };
  assignmentTargets?: readonly DosResourceAssignmentTarget[];
  author?: string;
  category: DosResourceCategory;
  content?: {
    assessment?: {
      maxScore: number;
      participants: readonly string[];
      questions: readonly DosAssessmentQuestion[];
    };
    assessmentScale?: string;
    attribution?: string;
    body?: string;
    credits?: string;
    followUpSuggestions?: readonly string[];
    guidedResource?: {
      format: DosGuidedResourceFormat;
      leaderGuideNote?: string;
      pathwayTags?: readonly string[];
      sessions: readonly DosGuidedResourceSession[];
      whyChosen?: string;
    };
    keyScriptures?: readonly string[];
    prayerCategory?: string;
    prayerText?: string;
    reflectionQuestions?: readonly string[];
    scripture?: string;
    scriptureReferences?: readonly string[];
    sections?: readonly DosResourceSection[];
    seoDescription?: string;
    subtitle?: string;
  };
  description: string;
  downloadPath?: string;
  emoji?: string;
  estimatedDuration?: string;
  featured?: boolean;
  coverImage?: {
    alt: string;
    src: string;
  };
  difficulty?: DosGuidedResourceDifficulty;
  icon: DosResourceIcon;
  id: string;
  path: string;
  sendable: boolean;
  slug: string;
  status?: "Sendable";
  tags?: readonly string[];
  title: string;
  type: DosResourceType;
};

export type DosAssessmentQuestion = {
  group?: string;
  id: string;
  note?: string;
  participantPrompts?: Record<string, string>;
  prompt: string;
};

export type DosResourceSection = {
  body?: string;
  items?: readonly DosResourceSectionItem[];
  scriptureReferences?: readonly string[];
  title: string;
};

export type DosResourceSectionItem = {
  body?: string;
  scriptureReferences?: readonly string[];
  title: string;
};

const tableTeachingResources = [
  {
    category: "Table Teachings",
    description: "A guided Gospel conversation for live ministry moments.",
    icon: "book",
    id: "table-teaching-kitchen-table-gospel",
    path: "/guides/kitchen-table-gospel.pdf",
    sendable: false,
    slug: "kitchen-table-gospel",
    title: "Kitchen Table Gospel",
    type: "teaching",
  },
  {
    category: "Table Teachings",
    description: "A guided honesty, help, surrender, and obedience conversation.",
    icon: "send",
    id: "table-teaching-four-questions",
    path: "/guides/four-questions.pdf",
    sendable: false,
    slug: "four-questions",
    title: "Four Questions",
    type: "teaching",
  },
] as const satisfies readonly DosResource[];

const commandResources = [
  {
    category: "Commands of Jesus",
    description: "Gather, worship, and be formed in the body of Christ.",
    icon: "church",
    id: "command-attending-church",
    path: "/guides/commands-of-jesus/usam_attending_church_guide.pdf",
    sendable: true,
    slug: "attending-church",
    title: "Attending Church",
    type: "guide",
  },
  {
    category: "Commands of Jesus",
    description: "Build a steady rhythm of Scripture, obedience, and fruit.",
    icon: "bible",
    id: "command-daily-bible-reading",
    path: "/guides/commands-of-jesus/usam_daily_bible_reading_guide.pdf",
    sendable: true,
    slug: "daily-bible-reading",
    title: "Daily Bible Reading",
    type: "guide",
  },
  {
    category: "Commands of Jesus",
    description: "Take the public step of repentance, obedience, and new life.",
    icon: "baptism",
    id: "command-baptism",
    path: "/guides/commands-of-jesus/usam_baptism_guide.pdf",
    sendable: true,
    slug: "baptism",
    title: "Baptism",
    type: "guide",
  },
  {
    category: "Commands of Jesus",
    description: "Practice stewardship, generosity, and kingdom support.",
    icon: "giving",
    id: "command-biblical-giving",
    path: "/guides/commands-of-jesus/usam_biblical_giving_guide.pdf",
    sendable: true,
    slug: "biblical-giving",
    title: "Biblical Giving",
    type: "guide",
  },
  {
    category: "Commands of Jesus",
    description: "Follow Jesus and multiply obedient disciples.",
    icon: "discipleship",
    id: "command-discipleship",
    path: "/guides/commands-of-jesus/usam_discipleship_guide.pdf",
    sendable: true,
    slug: "discipleship",
    title: "Discipleship",
    type: "guide",
  },
  {
    category: "Commands of Jesus",
    description: "Share the Gospel with clarity, boldness, and love.",
    icon: "send",
    id: "command-evangelism",
    path: "/guides/commands-of-jesus/usam_evangelism_guide.pdf",
    sendable: true,
    slug: "evangelism",
    title: "Evangelism",
    type: "guide",
  },
  {
    category: "Commands of Jesus",
    description: "Grow in dependence, spiritual hunger, and breakthrough.",
    icon: "fasting",
    id: "command-prayer-and-fasting",
    path: "/guides/commands-of-jesus/usam_prayer_and_fasting_guide.pdf",
    sendable: true,
    slug: "prayer-and-fasting",
    title: "Prayer and Fasting",
    type: "guide",
  },
  {
    category: "Commands of Jesus",
    description: "Practice holy rest, worship, and trust in God.",
    icon: "sabbath",
    id: "command-sabbath",
    path: "/guides/commands-of-jesus/usam_sabbath_guide.pdf",
    sendable: true,
    slug: "sabbath",
    title: "Sabbath",
    type: "guide",
  },
  {
    category: "Commands of Jesus",
    description: "Serve the body through the power of the Holy Spirit.",
    icon: "sparkles",
    id: "command-spiritual-gifts",
    path: "/guides/commands-of-jesus/usam_spiritual_gifts_guide.pdf",
    sendable: true,
    slug: "spiritual-gifts",
    title: "Spiritual Gifts",
    type: "guide",
  },
] as const satisfies readonly DosResource[];

const marriageAssessmentQuestions = [
  {
    group: "Connection",
    id: "respect-love",
    participantPrompts: {
      Husband: "How respected do you feel in the relationship?",
      Wife: "How loved do you feel in the relationship?",
    },
    prompt: "How respected or loved do you feel in the relationship?",
  },
  {
    group: "Connection",
    id: "connect-with-god",
    prompt: "How well do I help you connect with God?",
  },
  {
    group: "Connection",
    id: "time-together",
    prompt: "How well do we spend our time together?",
  },
  {
    group: "Trust & Communication",
    id: "trust",
    prompt: "How much do you trust me?",
  },
  {
    group: "Trust & Communication",
    id: "understood",
    prompt: "How well do you feel understood?",
  },
  {
    group: "Shared Life",
    id: "role",
    prompt: "How happy are you with your role?",
  },
  {
    group: "Shared Life",
    id: "domestic-support",
    prompt: "How good am I at domestic support?",
  },
  {
    group: "Trust & Communication",
    id: "conflict",
    prompt: "How well do we handle conflicts?",
  },
  {
    group: "Trust & Communication",
    id: "crisis-support",
    prompt: "How supported do you feel in a crisis?",
  },
  {
    group: "Shared Life",
    id: "money",
    prompt: "How well do we manage money?",
  },
  {
    group: "Family & Community",
    id: "parenting",
    prompt: "How well do we agree on parenting / grandparenting?",
  },
  {
    group: "Family & Community",
    id: "family-in-laws",
    prompt: "How well do I treat your family / in-laws?",
  },
  {
    group: "Family & Community",
    id: "friends",
    prompt: "How well do I value our friends?",
  },
  {
    group: "Affection & Intimacy",
    id: "affection",
    prompt: "How do you feel about our affectionate romantic interaction?",
  },
  {
    group: "Affection & Intimacy",
    id: "sex-life",
    note: "This question is appropriate only within covenant marriage.",
    prompt: "How happy are you with our sex life?",
  },
] as const satisfies readonly DosAssessmentQuestion[];

const friendshipAssessmentQuestions = [
  {
    id: "valued",
    prompt: "How valued I feel in the relationship.",
  },
  {
    id: "time-together",
    prompt: "The quality of our time together.",
  },
  {
    id: "trust",
    prompt: "Our trust level.",
  },
  {
    id: "communication",
    prompt: "Our communication.",
  },
  {
    id: "interest",
    prompt: "Our interest in each other.",
  },
  {
    id: "doing-things",
    prompt: "How we do things together.",
  },
  {
    id: "conflicts",
    prompt: "How we handle our conflicts.",
  },
  {
    id: "agreement",
    prompt: "How we agree on issues.",
  },
  {
    id: "schedules",
    prompt: "How we manage schedules.",
  },
  {
    id: "other-friends",
    prompt: "The relationship with other friends.",
  },
  {
    id: "spiritual-interaction",
    prompt: "Our spiritual interaction.",
  },
  {
    id: "depth",
    prompt: "The depth of our friendship.",
  },
  {
    id: "crisis-support",
    prompt: "How supported I feel in a crisis.",
  },
  {
    id: "important-people",
    prompt: "How we relate regarding the other's important people: spouse, kids, friends.",
  },
  {
    id: "non-church-time",
    prompt: "Our non-church time interaction.",
  },
] as const satisfies readonly DosAssessmentQuestion[];

const relationshipResources = [
  {
    category: "Relationships",
    content: {
      assessment: {
        maxScore: 150,
        participants: ["Husband", "Wife"],
        questions: marriageAssessmentQuestions,
      },
      assessmentScale: "Uses a simple 0-10 scale to help surface strengths, strain, and next faithful steps.",
      body: "A simple assessment for a husband and wife to name strengths, pressure points, and growth areas.",
    },
    description: "A 0-10 marriage health assessment with husband and wife scoring.",
    icon: "heart",
    id: "relationship-marriage-assessment",
    path: "/dos/library/marriage-assessment",
    sendable: true,
    slug: "marriage-assessment",
    title: "Marriage Assessment",
    type: "assessment",
  },
  {
    category: "Relationships",
    content: {
      assessment: {
        maxScore: 150,
        participants: ["Friend 1", "Friend 2"],
        questions: friendshipAssessmentQuestions,
      },
      assessmentScale: "Uses a simple 0-10 scale to help name trust, consistency, honesty, and care.",
      body: "A frontend-only assessment for two friends to name strengths, trust, communication, and growth areas.",
    },
    description: "A simple start screen for a 0-10 friendship health assessment.",
    icon: "relationship",
    id: "relationship-friendship-assessment",
    path: "/guide/friendship-assessment",
    sendable: true,
    slug: "friendship-assessment",
    title: "Friendship Assessment",
    type: "assessment",
  },
  {
    category: "Relationships",
    content: {
      attribution: "Used with permission from Ministry of Reconciliation and Andy Leenstra.",
      body: "Love the Lord your God with all your heart and with all your soul and with all your mind and with all your strength.",
      credits: "Credits: John and Paula Sandford where applicable.",
      scripture: "Mark 12:30",
      sections: [
        {
          body: "Love is doing God's will for yourself and others.",
          scriptureReferences: ["Mark 12:30-31"],
          title: "The Law of Love",
        },
        {
          body: "Honoring is expressing value in relationship for God, parents, spouse, children, and others.",
          items: [
            {
              body: "Exodus 20:1-4",
              title: "God",
            },
            {
              body: "Deuteronomy 5:16",
              title: "Parents",
            },
            {
              body: "Ephesians 5:33",
              title: "Spouse",
            },
            {
              body: "Proverbs 22:6",
              title: "Children",
            },
            {
              body: "John 13:34",
              title: "Others",
            },
          ],
          title: "The Law of Honor or Respect",
        },
        {
          body: "Truth is the revelation of God's perspective in a situation.",
          scriptureReferences: ["John 8:32", "John 14:6"],
          title: "Law of Truth",
        },
        {
          body: "This law forms the basis of conflict resolution.",
          scriptureReferences: ["Matthew 18:19", "John 5:19-20"],
          title: "Law of Agreement or Synergy",
        },
        {
          body: "Responsibility is a measure of maturity in Christ.",
          scriptureReferences: ["Genesis 1:28", "Ephesians 1:1-14", "Romans 8:1-14"],
          title: "The Law of Responsibility and Stewardship",
        },
        {
          body: "Our actions have consequences.",
          scriptureReferences: ["Galatians 6:7-8"],
          title: "Law of Sowing and Reaping",
        },
        {
          body: "Forgiveness is resolving relational deficits by applying the payment of Christ on the cross through an act of the will as God does. Repentance is a change of heart belief. Restitution is making amends.",
          scriptureReferences: ["John 19:30", "Luke 6:37", "Matthew 3:8", "Exodus 22:1"],
          title: "Law of Forgiveness, Repentance and Restitution",
        },
        {
          body: "To judge means to consider yourself more righteous than the other. Judgment, when coupled with unforgiveness, is one of the primary roots of relational breakdown.",
          scriptureReferences: ["Matthew 7:1-2", "Hebrews 12:15", "Romans 3:2"],
          title: "Law of Judgment",
        },
      ],
    },
    description: "Eight simple laws for practicing love, honor, truth, responsibility, forgiveness, and wise judgment.",
    icon: "relationship",
    id: "relationship-laws-of-relationship",
    path: "/guide/laws-of-relationship",
    sendable: true,
    slug: "laws-of-relationship",
    title: "Laws of Relationship",
    type: "guide",
  },
  {
    category: "Relationships",
    content: {
      attribution: "Used with permission from Ministry of Reconciliation and Andy Leenstra.",
      body: "A relational covenant is an agreement I make with God that governs how I do life with others.",
      credits: "Credits: John and Paula Sandford, Transforming the Inner Man where applicable.",
      sections: [
        {
          body: "I will love you, build you up and accept you in whatever form you come.",
          scriptureReferences: ["1 Corinthians 13", "1 John 4:11-12"],
          title: "The Covenant of Grace",
        },
        {
          body: "I will speak truth in love to deal directly and truthfully, making a common commitment to discover God's perspective on our issues.",
          scriptureReferences: ["John 1:14", "John 8:32", "Ephesians 4:15-16"],
          title: "The Covenant of Truth",
        },
        {
          body: "I will open myself to you inwardly: my hurts, joys, loves, hate, hopes, disappointments and needs. I will affirm you by needing you and inviting you to be part of my inner life.",
          scriptureReferences: ["John 17:23", "James 5:16"],
          title: "The Covenant of Openness",
        },
        {
          body: "In our gathering and throughout the week, I want to make your needs as important as my own as we talk, worship, pray and fellowship together. I will pray for you and be sensitive to the Holy Spirit concerning you.",
          scriptureReferences: ["Matthew 22:22", "Matthew 26:40", "Philippians 2:1-4"],
          title: "The Covenant of Sacrifice and Prayer",
        },
        {
          body: "I will serve God in our friendship with my time, energy, wisdom, finances and material goods as if we were ministering to Christ himself.",
          scriptureReferences: ["Matthew 25:34-40", "Acts 2:44-47"],
          title: "The Covenant of Availability",
        },
        {
          body: "I will regard the time that we spend together weekly as time spent with Jesus in our midst. I will not grieve the Holy Spirit or hinder his work in your life by my absence, except in emergency.",
          scriptureReferences: ["Matthew 18:20", "Hebrews 10:23-25"],
          title: "Covenant of Faithfulness",
        },
        {
          body: "I give you the right to question, confront and challenge me in love when I seem to be failing in any aspect of my life under God, such as family, devotions and general spiritual growth. I trust you to be in the Spirit and led of Him when you do so. I need love and correction to sharpen my life and keep me from becoming defensive.",
          scriptureReferences: ["Acts 15:4-20", "Galatians 2:1-2", "Galatians 2:14", "Proverbs 12:1"],
          title: "The Covenant of Accountability",
        },
        {
          body: "What we share between us is a trust. Sharing with others without permission would be harmful to the relationship God is building. I understand that confidentiality does not extend to threats of harm to self or others.",
          scriptureReferences: ["2 Corinthians 12:20-21"],
          title: "The Covenant of Confidentiality",
        },
        {
          body: "With personal integrity, I will find ways, under the direction of the Spirit, to demonstrate to others my God connected life. I realize that if inconsistency in my Christian walk could be a stumbling block to others God has assigned for me to reach.",
          scriptureReferences: ["1 Corinthians 1:9-13", "1 Corinthians 4:15", "1 Corinthians 5:4-20", "1 Corinthians 5:11", "1 Corinthians 6:12", "1 Corinthians 6:18-19", "1 Corinthians 7:35", "1 Corinthians 11:1", "1 Corinthians 11:17-33", "1 Corinthians 12:1", "1 Corinthians 13", "Mark 12:30-31"],
          title: "The Covenant of Integrity",
        },
        {
          body: "If God calls me elsewhere, I will not leave without your release to properly bring closure to our relationship. I will feel free to reconnect at any time. \"They put their hands on them and sent them away.\"",
          scriptureReferences: ["Acts 13:2-3"],
          title: "The Covenant of Release",
        },
      ],
    },
    description: "Ten covenants for building grace-filled, truthful, accountable, and trustworthy relationships.",
    icon: "heart",
    id: "relationship-covenants-of-relationship",
    path: "/guide/covenants-of-relationship",
    sendable: true,
    slug: "covenants-of-relationship",
    title: "Covenants of Relationship",
    type: "guide",
  },
] as const satisfies readonly DosResource[];

const newTestamentSprintReadings = [
  { day: 1, reading: "Matthew 1-19" },
  { day: 2, reading: "Matthew 20-28; Mark 1-10" },
  { day: 3, reading: "Mark 11-16; Luke 1-13" },
  { day: 4, reading: "Luke 14-24; John 1-8" },
  { day: 5, reading: "John 9-21; Acts 1-6" },
  { day: 6, reading: "Acts 7-25" },
  { day: 7, reading: "Acts 26-28; Romans 1-16" },
  { day: 8, reading: "1 Corinthians 1-16; 2 Corinthians 1-3" },
  { day: 9, reading: "2 Corinthians 4-13; Galatians 1-6; Ephesians 1-2" },
  { day: 10, reading: "Ephesians 3-6; Philippians 1-4; Colossians 1-4; 1 Thessalonians 1-5; 2 Thessalonians 1" },
  { day: 11, reading: "2 Thessalonians 2-3; 1 Timothy 1-6; 2 Timothy 1-4; Titus 1-3; Philemon; Hebrews 1-2" },
  { day: 12, reading: "Hebrews 3-13; James 1-5; 1 Peter 1-2" },
  { day: 13, reading: "1 Peter 3-5; 2 Peter 1-3; 1 John 1-5; 2 John; 3 John; Jude; Revelation 1-4" },
  { day: 14, reading: "Revelation 5-22" },
] as const;

const newTestamentSprintDays = newTestamentSprintReadings.map(({ day, reading }): DosGuidedResourceSession => ({
  actionStep: "Name one faithful next step of obedience for today.",
  assignment: reading,
  beginWithPrayer: "Pause and ask the Holy Spirit to reveal Jesus, bring understanding, and show one faithful next step for today.",
  id: `day-${day}`,
  listenCarefully: "What promise, command, warning, or example stands out?",
  lookForChrist: "What does this passage reveal about Jesus?",
  moveTowardOthers: "Who could you encourage, serve, or share this with today?",
  order: day,
  personalReflection: "Write one sentence summarizing what stood out to you in today's reading.",
  prayerFocus: "Turn what you read into a one-phrase prayer.",
  respondPersonally: "Where is God inviting repentance, faith, obedience, or courage?",
  title: `Day ${day} - ${reading}`,
}));

const discipleshipResources = [
  {
    category: "Discipleship",
    content: {
      guidedResource: {
        format: "bible_reading_plan",
        sessions: newTestamentSprintDays,
        whyChosen: "Read the assigned chapters each day with a Bible, notebook, and quiet place ready. If a day is missed, continue with the next reading instead of starting over. After finishing, choose one next rhythm: reread a Gospel, study Acts with a group, memorize a passage, or invite someone else to begin the plan.",
      },
      seoDescription: "Read the entire New Testament in fourteen days with this free Bible reading plan from USA Missionaries.",
      subtitle: "Read the entire New Testament in two weeks while discovering the life of Jesus, the birth of the Church, and the call to follow Christ.",
    },
    description: "Read the entire New Testament in fourteen days with a simple prayer and reflection rhythm.",
    assignable: true,
    assignmentDefaults: {
      durationDays: 14,
      followUpCadence: "midpoint_and_completion",
    },
    downloadPath: "/guides/new-testament-14-days.pdf",
    estimatedDuration: "14 Days",
    featured: true,
    icon: "bible",
    id: "discipleship-new-testament-14-days",
    path: "/guide/new-testament-14-days",
    sendable: true,
    slug: "new-testament-14-days",
    status: "Sendable",
    tags: ["Bible", "New Testament", "Reading Plan", "Growth"],
    title: "14 Days Through the New Testament",
    type: "reading_plan",
  },
  {
    category: "Discipleship",
    accessLinks: [
      {
        href: "https://www.moodypublishers.com/discipleship",
        label: "Purchase from Moody",
        type: "publisher",
      },
      {
        href: "https://www.amazon.com/Discipleship-Truly-Means-Christian-Collected-Insights/dp/1600668046",
        label: "Purchase on Amazon",
        type: "purchase",
      },
      {
        href: "https://www.barnesandnoble.com/w/discipleship-a-w-tozer/1127208003",
        label: "Purchase at Barnes & Noble",
        type: "purchase",
      },
    ],
    assignable: true,
    assignmentDefaults: {
      defaultMessage: "Walk through this seven-week discipleship resource and capture one reflection after each week.",
      durationDays: 49,
      followUpCadence: "weekly",
    },
    assignmentTargets: ["individual", "group", "organization"],
    author: "A.W. Tozer",
    content: {
      guidedResource: {
        format: "book",
        leaderGuideNote: "Add leader-created discussion notes, group questions, and meeting guidance before assigning this resource to a group.",
        // The book's exact page count varies by printed edition, so chapter reading
        // assignments below intentionally cite chapter numbers only - do not add
        // page ranges without confirming them against the specific edition in use.
        pathwayTags: ["Discipleship Foundations"],
        sessions: [
          {
            id: "week-1",
            order: 1,
            title: "Week 1 · Marks of Discipleship",
            assignment: "Chapter 1",
            chapters: [
              {
                assignment: "Chapter 1",
                bigIdea: "A true disciple can be recognized by observable marks - love for Jesus, obedience, and a willingness to forsake anything that competes with him.",
                chapterQuestion: "Which mark of a true disciple is least visible in your life right now?",
                keyScriptures: ["Luke 14:26-27", "Luke 14:33", "John 8:31"],
                order: 1,
                title: "Marks of Discipleship",
              },
            ],
            actionStep: "Name one mark of discipleship from this chapter that is weak in your life, and take one specific step toward it this week.",
            leaderNotes: "Help the group move past a vague definition of 'follower' into the specific, costly marks Tozer names. Invite honesty about which mark feels most absent.",
            multiply: "Ask someone who knows you well which mark of discipleship they see most clearly in your life, and which one they don't.",
            personalReflection: "Which mark of discipleship is God inviting me to grow in right now?",
            prayerFocus: "Ask God to make the marks of true discipleship visible and real in your daily life.",
          },
          {
            id: "week-2",
            order: 2,
            title: "Week 2 · True and False Disciples & \"Accepting\" Christ",
            assignment: "Chapters 2-3",
            chapters: [
              {
                assignment: "Chapter 2",
                bigIdea: "Following Jesus starts with a surrendered yes, not merely a private admiration for him.",
                chapterQuestion: "Where in your life is admiration for Jesus still waiting to become obedience?",
                keyScriptures: ["Luke 9:23-24", "John 8:31-32", "Mark 1:16-20"],
                order: 2,
                title: "True and False Disciples",
              },
              {
                assignment: "Chapter 3",
                bigIdea: "Truly accepting Christ means receiving him as absolute Lord, not adding him as one more belief alongside a life that stays unchanged.",
                chapterQuestion: "Where have you accepted Jesus intellectually but not yet surrendered practically?",
                keyScriptures: ["John 1:12", "Romans 10:9-10", "Colossians 2:6-7"],
                order: 3,
                title: "\"Accepting\" Christ",
              },
            ],
            actionStep: "Identify one area where admiration or belief has not become surrender, and take one concrete act of obedience before the next gathering.",
            leaderNotes: "Distinguish between intellectual assent and wholehearted reception. Watch for participants who have never moved past a decision made in the past into present-tense surrender.",
            multiply: "Ask one person this week, \"What is Jesus teaching you to obey right now?\" Listen without correcting or performing.",
            personalReflection: "Where has discipleship stayed in my intentions but not yet become obedience?",
            prayerFocus: "Ask God to search whether Christ has truly been received as Lord over every part of your life.",
          },
          {
            id: "week-3",
            order: 3,
            title: "Week 3 · To All Who Received Him & Obedience Is Not an Option",
            assignment: "Chapters 4-5",
            chapters: [
              {
                assignment: "Chapter 4",
                bigIdea: "A disciple does not confuse religious activity, knowledge, or reputation with faithful obedience to Jesus.",
                chapterQuestion: "What would change this week if you moved from knowing about Jesus to fully receiving him?",
                keyScriptures: ["Matthew 7:21-27", "James 1:22-25", "2 Corinthians 13:5"],
                order: 4,
                title: "To All Who Received Him",
              },
              {
                assignment: "Chapter 5",
                bigIdea: "Love for Jesus becomes credible when it takes the form of trust, surrender, and practiced obedience.",
                chapterQuestion: "What is one command of Jesus you have been treating as optional?",
                keyScriptures: ["John 14:15", "John 15:9-11", "1 John 2:3-6"],
                order: 5,
                title: "Obedience Is Not an Option",
              },
            ],
            actionStep: "Write down one command of Jesus you already understand, and obey it in a measurable way this week.",
            leaderNotes: "Avoid turning this session into accusation. Lead with shared humility and ask for practical examples instead of vague intentions.",
            multiply: "Help one newer believer choose a simple obedience step from Scripture and pray with them before they act.",
            personalReflection: "Where am I tempted to settle for the appearance of discipleship instead of the reality?",
            prayerFocus: "Ask the Holy Spirit for a responsive heart and obedience that flows from love.",
          },
          {
            id: "week-4",
            order: 4,
            title: "Week 4 · You Cannot Face Two Directions & Crucified with Christ",
            assignment: "Chapters 6-7",
            chapters: [
              {
                assignment: "Chapter 6",
                bigIdea: "Jesus forms disciples by reordering loves, habits, and attention around his kingdom.",
                chapterQuestion: "What competing direction is pulling you away from wholehearted devotion to Jesus?",
                keyScriptures: ["Colossians 3:1-4", "Psalm 27:4", "Romans 12:1-2"],
                order: 6,
                title: "You Cannot Face Two Directions",
              },
              {
                assignment: "Chapter 7",
                bigIdea: "Discipleship means the old self-ruled life has been put to death with Christ so that his life, not our own ambition, now directs us.",
                chapterQuestion: "What part of your old, self-ruled life still needs to be put on the cross?",
                keyScriptures: ["Galatians 2:20", "Romans 6:6-11", "Luke 9:23"],
                order: 7,
                title: "Crucified with Christ",
              },
            ],
            actionStep: "Remove or limit one competing distraction and name one area where self, not Christ, is still on the throne.",
            leaderNotes: "Keep this grounded in daily, practical surrender rather than only a doctrinal explanation of union with Christ. Ask for one current example, not only a past testimony.",
            multiply: "Share one Scripture or practice that is helping your attention return to Jesus, and invite someone else to try it with you.",
            personalReflection: "Where is God asking me to die to self so Christ's life can be seen instead?",
            prayerFocus: "Pray for renewed hunger for God and grace to yield where self still resists the cross.",
          },
          {
            id: "week-5",
            order: 5,
            title: "Week 5 · Take Up Your Cross & Loving Righteousness, Hating Evil",
            assignment: "Chapters 8-9",
            chapters: [
              {
                assignment: "Chapter 8",
                bigIdea: "Taking up the cross is a daily, deliberate choice to follow Jesus even when it costs comfort, reputation, or control.",
                chapterQuestion: "What daily cross is Jesus asking you to take up that you have been setting down?",
                keyScriptures: ["Luke 9:23-24", "Matthew 16:24-26", "Philippians 3:7-8"],
                order: 8,
                title: "Take Up Your Cross",
              },
              {
                assignment: "Chapter 9",
                bigIdea: "A disciple's affections are being retrained to genuinely love what is right and be grieved by what is evil, starting with our own hearts.",
                chapterQuestion: "Where has your heart grown lukewarm toward sin instead of grieved by it?",
                keyScriptures: ["Psalm 97:10", "Amos 5:15", "Romans 12:9"],
                order: 9,
                title: "Loving Righteousness, Hating Evil",
              },
            ],
            actionStep: "Choose one costly act of obedience and one tolerated sin to confess and turn from this week.",
            leaderNotes: "Keep this personal and specific rather than a broad discussion of culture. Ask each person to name one area in their own heart, not someone else's.",
            multiply: "Invite someone to name one cost of following Jesus they are currently avoiding, and pray with them about it.",
            personalReflection: "What cross am I tempted to set down, and what sin have I stopped being troubled by?",
            prayerFocus: "Ask for courage to take up your cross and for God to restore a right grief over sin.",
          },
          {
            id: "week-6",
            order: 6,
            title: "Week 6 · Be Holy! & The Importance of Deeds",
            assignment: "Chapters 10-11",
            chapters: [
              {
                assignment: "Chapter 10",
                bigIdea: "Holiness is not an optional pursuit for advanced Christians - it is God's clear command and the normal shape of a life surrendered to him.",
                chapterQuestion: "What specific area of your life still needs to be brought under God's holiness?",
                keyScriptures: ["1 Peter 1:15-16", "Hebrews 12:14", "2 Corinthians 7:1"],
                order: 10,
                title: "Be Holy!",
              },
              {
                assignment: "Chapter 11",
                bigIdea: "Discipleship becomes visible through Christlike character, costly love, and faithful witness.",
                chapterQuestion: "Who is one person you can serve or love in a costly, visible way this week?",
                keyScriptures: ["John 13:34-35", "Matthew 5:14-16", "Galatians 5:22-25"],
                order: 11,
                title: "The Importance of Deeds",
              },
            ],
            actionStep: "Name one unholy habit to replace and serve one person in a quiet, specific way before the next session.",
            leaderNotes: "Anchor holiness in grace-empowered pursuit, not self-effort or condemnation, and tie deeds to real relationships and local ministry context.",
            multiply: "Invite someone into a simple act of service with you rather than only telling them about it afterward.",
            personalReflection: "Where is God calling me to holiness that becomes visible in love?",
            prayerFocus: "Ask the Holy Spirit to make you holy in one practical area and loving toward one specific person this week.",
          },
          {
            id: "week-7",
            order: 7,
            title: "Week 7 · Preparing for Heaven & Go and Tell",
            assignment: "Chapters 12-13",
            chapters: [
              {
                assignment: "Chapter 12",
                bigIdea: "A disciple lives now in light of eternity, holding this life loosely because a better, lasting home is coming.",
                chapterQuestion: "How would your priorities change this week if you truly lived in light of eternity?",
                keyScriptures: ["2 Corinthians 4:17-18", "Colossians 3:1-2", "Matthew 6:19-21"],
                order: 12,
                title: "Preparing for Heaven",
              },
              {
                assignment: "Chapter 13",
                bigIdea: "A disciple keeps following Jesus and helps others follow him through faithful, ordinary multiplication.",
                chapterQuestion: "Who is God asking you to disciple, invite, or point toward Jesus next?",
                keyScriptures: ["Matthew 28:18-20", "2 Timothy 2:2", "Philippians 1:6"],
                order: 13,
                title: "Go and Tell",
              },
            ],
            actionStep: "Write one specific next step for how you will keep preparing for eternity while continuing to tell others about Jesus.",
            leaderNotes: "Close by commissioning obedience toward both readiness for eternity and ongoing mission. Help participants leave with a next step, not just a completed resource.",
            multiply: "Choose one person to encourage toward Jesus during the next thirty days, and schedule the first conversation.",
            personalReflection: "What is one concrete next step in my ongoing discipleship after this resource?",
            prayerFocus: "Pray for a heart set on eternity and a life that keeps bearing fruit until Jesus returns.",
          },
        ],
        whyChosen: "A.W. Tozer's Discipleship is a foundational resource that helps Christians wrestle with what it actually means to be a disciple of Jesus and move from belief toward obedience.",
      },
      subtitle: "A seven-week guided book resource for reflecting on discipleship, obedience, and faithful growth.",
    },
    // Real cover art for ISBN 9781600668043 (Discipleship: What It Truly Means to Be
    // a Christian - Collected Insights from A. W. Tozer), sourced from the Barnes &
    // Noble product listing for this exact edition on 2026-08-06.
    coverImage: {
      alt: "Discipleship by A.W. Tozer - book cover",
      src: "/guides/discipleship-cover.jpg",
    },
    description: "A seven-week Guided Journey with original companion sessions, Scripture search, reflection prompts, leader notes, and disciple-making next steps.",
    estimatedDuration: "7 Weeks",
    featured: true,
    icon: "book",
    id: "discipleship-marks-of-discipleship",
    path: "/dos/library/marks-of-discipleship",
    sendable: true,
    slug: "marks-of-discipleship",
    status: "Sendable",
    tags: ["Book", "Discipleship", "Growth", "Leadership"],
    title: "Discipleship",
    type: "guided_resource",
  },
  {
    category: "Discipleship",
    content: {
      body: "A future sendable guide for helping someone choose their next faithful step after a table conversation.",
    },
    description: "A lightweight next-step challenge for following Jesus after a conversation.",
    icon: "discipleship",
    id: "discipleship-following-jesus-next-steps",
    path: "/guide/following-jesus-next-steps",
    sendable: true,
    slug: "following-jesus-next-steps",
    title: "Following Jesus Next Steps",
    type: "challenge",
  },
] as const satisfies readonly DosResource[];

const prayerCatalogResources = dosPrayerResources.map((resource) => ({
  category: "Prayer" as const,
  content: {
    followUpSuggestions: resource.followUpSuggestions,
    keyScriptures: resource.keyScriptures,
    prayerCategory: resource.category,
    prayerText: resource.prayerText,
    reflectionQuestions: resource.reflectionQuestions,
  },
  description: resource.description,
  icon: "prayer" as const,
  id: `prayer-${resource.slug}`,
  path: `/prayer/${resource.slug}`,
  sendable: true,
  slug: resource.slug,
  title: resource.title,
  type: "prayer" as const,
})) satisfies readonly DosResource[];

export const dosResourceCatalog: readonly DosResource[] = [
  ...tableTeachingResources,
  ...commandResources,
  ...relationshipResources,
  ...prayerCatalogResources,
  ...discipleshipResources,
] as const;

export const dosResourceLibraryCategories = [
  "Table Teachings",
  "Commands of Jesus",
  "Discipleship",
  "Relationships",
  "Prayer",
] as const satisfies readonly DosResourceCategory[];

export const dosSendableResourceCategories = [
  "Commands of Jesus",
  "Relationships",
  "Prayer",
  "Discipleship",
] as const satisfies readonly DosResourceCategory[];

export function getDosResourceBySlug(slug: string | null | undefined): DosResource | null {
  return dosResourceCatalog.find((resource) => resource.slug === slug) ?? null;
}

export function getDosResourceByTitle(title: string | null | undefined): DosResource | null {
  const normalizedTitle = normalizeResourceTitle(title ?? "");

  return dosResourceCatalog.find((resource) => normalizeResourceTitle(resource.title) === normalizedTitle) ?? null;
}

export function getDosResourcesByCategory(category: DosResourceCategory): DosResource[] {
  return dosResourceCatalog.filter((resource) => resource.category === category);
}

export function getDosAssessmentResources(): DosResource[] {
  return dosResourceCatalog.filter((resource) => resource.type === "assessment" && Boolean(resource.content?.assessment));
}

export function getSendableDosResources(): DosResource[] {
  return dosResourceCatalog.filter((resource) => resource.sendable);
}

function normalizeResourceTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
