/**
 * PROTOTYPE ONLY.
 *
 * Native DOS teaching content for "Four Questions", transcribed from the
 * existing production PDF at /guides/four-questions.pdf so the prototype can
 * show the teaching as a native DOS page instead of a browser PDF viewer.
 *
 * If this direction is approved, this content should move into
 * src/lib/dos/resource-catalog.ts under resource.content rather than living here.
 */

export type FourQuestionsStep = {
  body: readonly string[];
  number: string;
  prompt: string;
  question: string;
  scriptures: readonly { reference: string; text: string }[];
};

export const fourQuestionsEyebrow = "Kitchen Table Guide";

export const fourQuestionsTitle = "The Four Questions That Open the Door to Change";

export const fourQuestionsSubtitle =
  "A short coffee conversation teaching for discipleship, honesty, and Gospel response.";

export const fourQuestionsCoreIdea =
  "Real change begins when truth is faced, help is received, and obedience follows.";

export const fourQuestionsHowToUse = [
  "This teaching is designed for a simple 20 to 30 minute conversation over coffee, at a kitchen table, or during a relational discipleship meeting. It is not meant to feel heavy or overproduced. The goal is to ask honest questions, let Scripture speak, and create space for a real response.",
  "The four questions work as a progression. First, a person must recognize the problem. Second, they must admit they need help outside of themselves. Third, they must become willing to seek and receive help. Fourth, they must be willing to obey what God asks them to do. Wherever a person resists one of these steps, the process of change usually stalls.",
] as const;

export const fourQuestionsProgression = [
  { detail: "Truth comes into the light.", label: "Recognize the problem", number: "01" },
  { detail: "Self reliance gives way to surrender.", label: "Admit the need for help", number: "02" },
  { detail: "God often restores through His Word and His people.", label: "Seek and receive help", number: "03" },
  { detail: "Discipleship becomes action.", label: "Follow through in obedience", number: "04" },
] as const;

export const fourQuestionsSteps: readonly FourQuestionsStep[] = [
  {
    body: [
      "Freedom begins with honest recognition. A person cannot be healed from what they refuse to admit. Many people minimize their condition, blame others, justify their choices, or pretend everything is fine. But truth brings things into the light, and the light is where healing begins.",
      "This first question is not about shaming someone. It is about waking them up. Until a person says, “Yes, something is wrong,” they will rarely seek the answer God is offering.",
    ],
    number: "01",
    prompt: "What struggle, wound, sin, or pattern have you been minimizing or covering?",
    question: "Do you recognize that there is a real problem or struggle in your life?",
    scriptures: [
      { reference: "Psalm 51:3", text: "For I acknowledge my transgressions: and my sin is ever before me." },
      { reference: "Proverbs 28:13", text: "He that covereth his sins shall not prosper: but whoso confesseth and forsaketh them shall have mercy." },
      { reference: "1 John 1:8", text: "If we say that we have no sin, we deceive ourselves, and the truth is not in us." },
    ],
  },
  {
    body: [
      "Some people know they have a problem, but still think they can fix themselves through willpower, better habits, image management, or religion. But real transformation does not come from self salvation. It comes from surrender to God.",
      "This is where self reliance begins to break. The person stops saying, “I’ve got this,” and starts saying, “I need God. I need help.” That is not weakness. That is wisdom.",
    ],
    number: "02",
    prompt: "Where are you still trusting yourself more than God?",
    question: "Do you believe you need help outside of yourself to overcome this?",
    scriptures: [
      { reference: "John 15:5", text: "For without me ye can do nothing." },
      { reference: "Romans 7:18", text: "For I know that in me (that is, in my flesh,) dwelleth no good thing..." },
      { reference: "Proverbs 3:5", text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding." },
    ],
  },
  {
    body: [
      "Many people admit they need help in theory, but still resist the actual means God uses to bring it. They avoid correction, stay isolated, reject counsel, and resist the Word. They want healing without exposure and change without surrender.",
      "God often sends help through His Spirit, His Word, and His people. When someone is unwilling to seek help or receive it, they cut themselves off from the pathways God often uses for restoration.",
    ],
    number: "03",
    prompt: "Who or what has God already placed in your life that you have been resisting?",
    question: "Are you willing to seek out and receive that help?",
    scriptures: [
      { reference: "Matthew 7:7", text: "Ask, and it shall be given you seek, and ye shall find knock, and it shall be opened unto you." },
      { reference: "Proverbs 12:15", text: "The way of a fool is right in his own eyes: but he that hearkeneth unto counsel is wise." },
      { reference: "James 1:21", text: "Receive with meekness the engrafted word, which is able to save your souls." },
    ],
  },
  {
    body: [
      "This is the dividing line between emotion and discipleship. Many people will admit the struggle. Some will say they need help. A few will seek help. But the real question is whether they are willing to obey.",
      "Freedom is not found in agreement alone. Freedom is found in surrender and action. Obedience may involve confession, accountability, forgiveness, prayer, Scripture, breaking sinful patterns, or taking a direct step God has already made clear.",
    ],
    number: "04",
    prompt: "What act of obedience has God already shown you, but you have not yet done?",
    question: "Are you willing to follow through and do what is asked of you to change?",
    scriptures: [
      { reference: "James 1:22", text: "But be ye doers of the word, and not hearers only, deceiving your own selves." },
      { reference: "Luke 6:46", text: "And why call ye me, Lord, Lord, and do not the things which I say?" },
      { reference: "Matthew 7:24", text: "Therefore whosoever heareth these sayings of mine, and doeth them..." },
    ],
  },
];

export const fourQuestionsGospel = {
  body: "Ultimately, these four questions lead a person to the Gospel. The deepest problem in every life is sin. The help we need is not found in ourselves, but in Jesus Christ. He is not merely an assistant to self improvement. He is Savior, Lord, Deliverer, and King.",
  closingPrompt: "Which of these four questions is hardest for you to answer honestly right now?",
  finalInvitation: "Stop hiding. Stop striving alone. Receive help. Obey His voice. Follow Jesus.",
  scriptures: [
    { reference: "Romans 3:23", text: "For all have sinned, and come short of the glory of God." },
    { reference: "Romans 5:8", text: "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us." },
    { reference: "Matthew 11:28", text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest." },
  ],
} as const;
