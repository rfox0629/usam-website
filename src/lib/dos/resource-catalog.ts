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

export type DosGuidedResourceMemoryVerse = {
  note?: string;
  reference: string;
  trackingStatus?: "future";
};

export type DosGuidedResourceSession = {
  actionStep: string;
  assignment: string;
  bigIdea: string;
  discussionQuestions: readonly string[];
  id: string;
  keyScriptures: readonly string[];
  leaderNotes?: string;
  memoryVerse?: DosGuidedResourceMemoryVerse;
  multiply?: string;
  order: number;
  personalReflection: string;
  prayerFocus: string;
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

const discipleshipResources = [
  {
    category: "Discipleship",
    content: {
      seoDescription: "Read the entire New Testament in fourteen days with this free Bible reading plan from USA Missionaries.",
      sections: [
        {
          body: "This plan is designed to help a reader move through the whole New Testament with focus, prayer, and simple obedience. The final PDF language will be refined later, but the web page is the canonical source for this resource.",
          title: "Purpose",
        },
        {
          body: "Read the assigned chapters for each day. Keep a Bible, notebook, and quiet place ready. If a day is missed, continue with the next reading instead of abandoning the plan.",
          title: "How to Use This Plan",
        },
        {
          body: "Before reading, pause and ask the Holy Spirit to reveal Jesus, bring understanding, and show one faithful next step for the day.",
          title: "Begin Each Day With Prayer",
        },
        {
          items: [
            {
              body: "What does this passage reveal about Jesus?",
              title: "Look for Christ",
            },
            {
              body: "What promise, command, warning, or example stands out?",
              title: "Listen Carefully",
            },
            {
              body: "Where is God inviting repentance, faith, obedience, or courage?",
              title: "Respond Personally",
            },
            {
              body: "Who could you encourage, serve, or share this with today?",
              title: "Move Toward Others",
            },
          ],
          title: "Four Reflection Questions",
        },
        {
          items: [
            {
              body: "Matthew 1-19",
              title: "Day 1",
            },
            {
              body: "Matthew 20-28; Mark 1-10",
              title: "Day 2",
            },
            {
              body: "Mark 11-16; Luke 1-13",
              title: "Day 3",
            },
            {
              body: "Luke 14-24; John 1-8",
              title: "Day 4",
            },
            {
              body: "John 9-21; Acts 1-6",
              title: "Day 5",
            },
            {
              body: "Acts 7-25",
              title: "Day 6",
            },
            {
              body: "Acts 26-28; Romans 1-16",
              title: "Day 7",
            },
          ],
          title: "Week One",
        },
        {
          items: [
            {
              body: "1 Corinthians 1-16; 2 Corinthians 1-3",
              title: "Day 8",
            },
            {
              body: "2 Corinthians 4-13; Galatians 1-6; Ephesians 1-2",
              title: "Day 9",
            },
            {
              body: "Ephesians 3-6; Philippians 1-4; Colossians 1-4; 1 Thessalonians 1-5; 2 Thessalonians 1",
              title: "Day 10",
            },
            {
              body: "2 Thessalonians 2-3; 1 Timothy 1-6; 2 Timothy 1-4; Titus 1-3; Philemon; Hebrews 1-2",
              title: "Day 11",
            },
            {
              body: "Hebrews 3-13; James 1-5; 1 Peter 1-2",
              title: "Day 12",
            },
            {
              body: "1 Peter 3-5; 2 Peter 1-3; 1 John 1-5; 2 John; 3 John; Jude; Revelation 1-4",
              title: "Day 13",
            },
            {
              body: "Revelation 5-22",
              title: "Day 14",
            },
          ],
          title: "Week Two",
        },
        {
          body: "Write one sentence of summary, one phrase of prayer, and one next step. Keep this reflective and simple; no tracking or submission is required.",
          title: "Daily Reflection",
        },
        {
          body: "After finishing, choose one next rhythm: reread one Gospel, study Acts with a group, memorize a passage, or invite someone else to begin the plan.",
          title: "After Fourteen Days",
        },
      ],
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
      defaultMessage: "Walk through this six-week discipleship resource and capture one reflection after each session.",
      durationDays: 42,
      followUpCadence: "weekly",
    },
    assignmentTargets: ["individual", "group", "organization"],
    author: "A.W. Tozer",
    content: {
      guidedResource: {
        format: "book",
        leaderGuideNote: "Add leader-created discussion notes, group questions, and meeting guidance before assigning this resource to a group.",
        pathwayTags: ["Discipleship Foundations"],
        sessions: [
          {
            actionStep: "Choose one concrete act of obedience you can practice before the next gathering, and tell one trusted person what you chose.",
            assignment: "Pages 9-24",
            bigIdea: "Following Jesus starts with a surrendered yes, not merely a private admiration for him.",
            discussionQuestions: [
              "Where do you see the difference between admiring Jesus and following him?",
              "What makes costly obedience difficult in ordinary life?",
              "What would a clear yes to Jesus look like this week?",
            ],
            id: "week-1",
            keyScriptures: ["Luke 9:23-24", "John 8:31-32", "Mark 1:16-20"],
            leaderNotes: "Keep the group focused on personal response rather than abstract definitions. Invite each person to name one specific area where following Jesus needs to become visible.",
            memoryVerse: {
              note: "Future memorization tracking will let participants mark this verse as practicing or memorized.",
              reference: "Luke 9:23",
              trackingStatus: "future",
            },
            multiply: "Ask one person this week, \"What is Jesus teaching you to obey right now?\" Listen without correcting or performing.",
            order: 1,
            personalReflection: "Where has discipleship stayed in my intentions but not yet become obedience?",
            prayerFocus: "Ask the Lord for an undivided heart and the courage to respond to his call.",
            title: "Week 1 - The Surrendered Yes",
          },
          {
            actionStep: "Identify one spiritual substitute you are tempted to trust, then replace it with one act of direct obedience.",
            assignment: "Pages 25-42",
            bigIdea: "A disciple does not confuse religious activity, knowledge, or reputation with faithful obedience to Jesus.",
            discussionQuestions: [
              "What can make faith look mature while leaving obedience untouched?",
              "How do Scripture, community, and humility help expose self-deception?",
              "What fruit would show that our group is becoming more obedient, not just more informed?",
            ],
            id: "week-2",
            keyScriptures: ["Matthew 7:21-27", "James 1:22-25", "2 Corinthians 13:5"],
            leaderNotes: "Avoid turning this session into accusation. Lead with shared humility and let Scripture examine everyone, including the leader.",
            memoryVerse: {
              note: "Future memorization tracking will let participants mark this verse as practicing or memorized.",
              reference: "James 1:22",
              trackingStatus: "future",
            },
            multiply: "Invite a mature believer to ask you one honest question about your obedience, then answer plainly.",
            order: 2,
            personalReflection: "Where am I tempted to settle for the appearance of discipleship instead of the reality?",
            prayerFocus: "Pray for truthfulness before God and freedom from spiritual pretense.",
            title: "Week 2 - Beyond Appearance",
          },
          {
            actionStep: "Write down one command of Jesus you already understand, and obey it in a measurable way this week.",
            assignment: "Pages 43-60",
            bigIdea: "Love for Jesus becomes credible when it takes the form of trust, surrender, and practiced obedience.",
            discussionQuestions: [
              "Why is agreement easier than obedience?",
              "How can we discern the next faithful step without overcomplicating it?",
              "What kind of accountability helps obedience stay rooted in love rather than pressure?",
            ],
            id: "week-3",
            keyScriptures: ["John 14:15", "John 15:9-11", "1 John 2:3-6"],
            leaderNotes: "Ask for practical examples. If a response stays vague, gently invite the person to name the next observable action.",
            memoryVerse: {
              note: "Future memorization tracking will let participants mark this verse as practicing or memorized.",
              reference: "John 14:15",
              trackingStatus: "future",
            },
            multiply: "Help one newer believer choose a simple obedience step from Scripture and pray with them before they act.",
            order: 3,
            personalReflection: "What command of Jesus is currently becoming personal for me?",
            prayerFocus: "Ask the Holy Spirit for a responsive heart and obedience that flows from love.",
            title: "Week 3 - Obedience That Loves",
          },
          {
            actionStep: "Remove or limit one distraction for seven days and use that space for Scripture, prayer, or service.",
            assignment: "Pages 61-78",
            bigIdea: "Jesus forms disciples by reordering loves, habits, and attention around his kingdom.",
            discussionQuestions: [
              "What most often competes for your attention and affection?",
              "How can spiritual practices stay relational instead of performative?",
              "Which habit would help your love for Jesus become more steady?",
            ],
            id: "week-4",
            keyScriptures: ["Colossians 3:1-4", "Psalm 27:4", "Romans 12:1-2"],
            leaderNotes: "Keep habit discussion concrete and non-competitive. The goal is renewed affection for Christ, not public comparison of disciplines.",
            memoryVerse: {
              note: "Future memorization tracking will let participants mark this verse as practicing or memorized.",
              reference: "Colossians 3:2",
              trackingStatus: "future",
            },
            multiply: "Share one Scripture or practice that is helping your attention return to Jesus, and invite someone else to try it with you.",
            order: 4,
            personalReflection: "What is one desire I want the Lord to purify or strengthen?",
            prayerFocus: "Pray for renewed hunger for God and a life ordered by worship.",
            title: "Week 4 - Ordered Loves",
          },
          {
            actionStep: "Serve or encourage one person in a quiet, costly, and specific way before the next session.",
            assignment: "Pages 79-96",
            bigIdea: "Discipleship becomes visible through Christlike character, costly love, and faithful witness.",
            discussionQuestions: [
              "Where should discipleship become more visible in ordinary life?",
              "What kind of service stretches you in a healthy way?",
              "How can our witness stay humble, clear, and loving?",
            ],
            id: "week-5",
            keyScriptures: ["John 13:34-35", "Matthew 5:14-16", "Galatians 5:22-25"],
            leaderNotes: "Tie discussion to real relationships and local ministry context. Keep witness connected to love, not performance.",
            memoryVerse: {
              note: "Future memorization tracking will let participants mark this verse as practicing or memorized.",
              reference: "John 13:35",
              trackingStatus: "future",
            },
            multiply: "Invite someone into a simple act of service with you rather than only telling them about it afterward.",
            order: 5,
            personalReflection: "Who is God asking me to love, serve, or witness to this week?",
            prayerFocus: "Ask for Christlike love that becomes practical, visible, and humble.",
            title: "Week 5 - Visible Love",
          },
          {
            actionStep: "Write a thirty-day obedience plan with one rhythm, one relationship, and one disciple-making step.",
            assignment: "Pages 97-112",
            bigIdea: "A disciple keeps following Jesus and helps others follow him through faithful, ordinary multiplication.",
            discussionQuestions: [
              "What has become clearer over these six weeks?",
              "What rhythm will help you continue beyond this resource?",
              "Who could you invite, encourage, or help disciple next?",
            ],
            id: "week-6",
            keyScriptures: ["Matthew 28:18-20", "2 Timothy 2:2", "Philippians 1:6"],
            leaderNotes: "Close by commissioning obedience. Help participants leave with a next step, not just a completed resource.",
            memoryVerse: {
              note: "Future memorization tracking will let participants mark this verse as practicing or memorized.",
              reference: "Matthew 28:19-20",
              trackingStatus: "future",
            },
            multiply: "Choose one person to encourage toward Jesus during the next thirty days, and schedule the first conversation.",
            order: 6,
            personalReflection: "What is one concrete next step in my ongoing discipleship after this resource?",
            prayerFocus: "Pray for perseverance, multiplication, and a life that keeps bearing fruit.",
            title: "Week 6 - Commissioned to Continue",
          },
        ],
        whyChosen: "We chose this resource because it gives missionaries and groups a focused, six-week path for examining discipleship without turning formation into a checklist. The companion sessions keep the book primary, add Scripture-shaped reflection, and help each participant move toward obedience, community, and disciple-making.",
      },
      subtitle: "A six-week guided book resource for reflecting on discipleship, obedience, and faithful growth.",
    },
    coverImage: {
      alt: "Marks of Discipleship guided resource cover",
      src: "/guides/marks-of-discipleship-cover.svg",
    },
    description: "A six-week Guided Journey with original companion sessions, Scripture search, reflection prompts, leader notes, and disciple-making next steps.",
    difficulty: "intermediate",
    estimatedDuration: "6 Weeks",
    featured: true,
    icon: "book",
    id: "discipleship-marks-of-discipleship",
    path: "/dos/library/marks-of-discipleship",
    sendable: true,
    slug: "marks-of-discipleship",
    status: "Sendable",
    tags: ["Book", "Discipleship", "Growth", "Leadership"],
    title: "Marks of Discipleship",
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
