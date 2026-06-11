export type DosPrayerResourceCategory =
  | "Freedom From Sin"
  | "Healing & Restoration"
  | "Identity & Freedom"
  | "Life Challenges"
  | "Relationships";

export type DosPrayerResource = {
  aliases?: readonly string[];
  category: DosPrayerResourceCategory;
  description: string;
  followUpSuggestions: readonly string[];
  keyScriptures: readonly string[];
  prayerText: string;
  reflectionQuestions: readonly string[];
  slug: string;
  title: string;
};

export const dosPrayerResourceAttribution = "Used with permission from Ministry of Reconciliation.";

export const dosPrayerResourceCategories = [
  "Identity & Freedom",
  "Healing & Restoration",
  "Relationships",
  "Freedom From Sin",
  "Life Challenges",
] as const satisfies readonly DosPrayerResourceCategory[];

export const dosPrayerResources = [
  {
    category: "Life Challenges",
    description: "A daily prayer of surrender, forgiveness, wisdom, and resistance to the enemy.",
    followUpSuggestions: [
      "Ask what part of the day needs to be surrendered to Jesus.",
      "Invite them to pray this each morning for the next week.",
      "Follow up on any temptation, fear, or decision they named.",
    ],
    keyScriptures: ["John 3:16", "1 John 1:9", "James 4:7", "Ephesians 1:17-18"],
    prayerText: `Lord, I thank You for Your goodness and love for me, and for Your Son, Jesus Christ, who died and rose again so I could be saved.

Please forgive me for the ways in which I have sinned against You in word, deed, or thought. Thank You for Your forgiveness. I ask the Holy Spirit to fill those cleansed areas of my life with His peace and to empower me to stand strong in the face of temptation and evil.

Thank You for being the Lord of my life. Today I surrender control of my intellect, emotions, will, and body to You. This day, I choose to resist the enemy and to stand firm by the strength of Your Word and the armor You provide.

Lord, I ask for Your Spirit of wisdom and revelation that I might know You better. Please enlighten the eyes of my heart that I will see and know You more intimately, and empower me to be the hands and feet of Jesus to those around me in all circumstances. Amen.`,
    reflectionQuestions: [
      "What do I need to surrender to Jesus today?",
      "Where do I need forgiveness, wisdom, or courage?",
      "Who is God putting on my heart to pray for or encourage?",
    ],
    slug: "daily-prayer",
    title: "Daily Prayer",
  },
  {
    category: "Identity & Freedom",
    description: "A declaration of what God says is true for every person who belongs to Christ.",
    followUpSuggestions: [
      "Choose one identity statement to read aloud each day this week.",
      "Ask which lie has been hardest to renounce.",
      "Invite them to replace that lie with one Scripture-backed truth.",
    ],
    keyScriptures: [
      "John 1:12",
      "John 15:5",
      "Romans 5:1",
      "Romans 8:1-2",
      "Romans 8:28",
      "Romans 8:35-39",
      "1 Corinthians 6:17",
      "1 Corinthians 6:19-20",
      "1 Corinthians 12:27",
      "2 Corinthians 1:21-22",
      "2 Corinthians 5:17",
      "Ephesians 1:1",
      "Ephesians 1:5",
      "Ephesians 1:7",
      "Ephesians 2:10",
      "Ephesians 2:18",
      "Ephesians 2:19",
      "Ephesians 3:12",
      "Philippians 1:6",
      "Philippians 3:20",
      "Philippians 4:13",
      "Colossians 1:14",
      "Colossians 2:10",
      "Colossians 3:3",
      "2 Timothy 1:7",
      "Hebrews 4:16",
      "1 John 5:18",
    ],
    prayerText: `I renounce the lie that I am rejected, unloved, or shameful. In Christ I am accepted.

God says:
I am God's child.
I am Christ's friend.
I have been justified.
I am united with the Lord and I am one spirit with Him.
I have been bought with a price; I belong to God.
I am a member of Christ's body.
I am a saint, a holy one.
I have been adopted as God's child.
I have direct access to God through the Holy Spirit.
I have been redeemed and forgiven of all my sins.
I am complete in Christ.

I renounce the lie that I am guilty, unprotected, alone, or abandoned. In Christ I am secure.

God says:
I am free from condemnation.
I am assured that all things work together for good.
I am free from any condemning charges against me.
I cannot be separated from the love of God.
I have been established, anointed, and sealed by God.
I am confident that the good work God has begun in me will be perfected.
I am a citizen of heaven.
I am hidden with Christ in God.
I have not been given a spirit of fear, but of power, love, and self-control.
I can find grace and mercy to help in time of need.
I am born of God and the evil one cannot touch me.

I renounce the lie that I am worthless, inadequate, helpless, or hopeless. In Christ I am significant.

God says:
I am the salt of the earth and the light of the world.
I am a branch of the true vine, Jesus, a channel of His life.
I have been chosen and appointed by God to bear fruit.
I am a personal, Spirit-empowered witness of Christ's.
I am a temple of God.
I am a minister of reconciliation for God.
I am a fellow worker with God.
I am seated with Christ in the heavenly realms.
I am God's workmanship, created for good works.
I may approach God with freedom and confidence.
I can do all things through Christ who strengthens me.
I am not the great "I Am," but by the grace of God I am what I am.`,
    reflectionQuestions: [
      "Which lie do I most need to renounce today?",
      "Which truth from God do I need to receive and say out loud?",
      "What would change if I lived from this identity this week?",
    ],
    slug: "in-christ",
    title: "In Christ",
  },
  {
    category: "Healing & Restoration",
    description: "A guided prayer for forgiving others, releasing bitterness, and asking God to heal damaged emotions.",
    followUpSuggestions: [
      "Write down the person, offense, and feeling named in the prayer.",
      "Ask whether any restitution, boundary, or blessing needs follow-up.",
      "Check back after a few days to see what healing or resistance surfaced.",
    ],
    keyScriptures: ["Matthew 6:14", "Matthew 18:21-22", "Luke 6:36", "Ephesians 4:31-32", "Colossians 3:12-14", "1 Peter 2:23"],
    prayerText: `Lord, I choose to forgive __________ for __________. As a result of these offenses, I felt __________.

I choose to release these offenses to You, and I let go of all my resentments and desires to seek revenge. Forgive me for my sinful reactions to those offenses. I entrust myself to You, the One Who judges justly.

Lord, thank You for freeing me from my bitterness. Please bring healing to my damaged emotions. I choose to bless __________ by asking You to __________.

In Jesus' Name I pray, Amen.`,
    reflectionQuestions: [
      "Who do I need to forgive or release to God?",
      "What pain, resentment, or desire for revenge am I surrendering?",
      "How might God want me to bless this person or walk forward wisely?",
    ],
    slug: "forgiveness",
    title: "Forgiveness Prayer",
  },
  {
    category: "Freedom From Sin",
    description: "A prayer for naming strongholds, renouncing the lies behind them, and receiving God's truth.",
    followUpSuggestions: [
      "Name the stronghold and the lie connected to it.",
      "Choose one Scripture truth to speak over that area this week.",
      "Schedule a follow-up conversation if deeper healing or accountability is needed.",
    ],
    keyScriptures: ["John 1:12", "Romans 12:1-2", "1 Corinthians 6:19-20", "2 Corinthians 10:3-5", "Ephesians 1:3", "Philippians 1:6"],
    prayerText: `Thank You, Lord, that I am Yours, and that You are my Deliverer. I have been bought with a price and I belong to You. I have been established, anointed, and sealed by God, and I am confident that the good work that You have begun in me will be perfected.

Thank You for revealing the personal strongholds I have allowed or that have developed in my life. I confess and repent that these areas have been open doors to the enemy, and I do not want them anymore. According to Your Word, You have given me divine power to demolish them. So now, in the name of the Lord Jesus Christ, I choose to demolish the strongholds of __________, __________, __________. I resist and renounce the lies behind these strongholds that said, __________. I also resist any other lies, thoughts, or voices, known or unknown, and shut all doors that have given the enemy access to my life.

Holy Spirit, guide me now as these cleansed areas are filled with truth. Help me renew my mind so that I can walk in freedom and understand Your good, pleasing, and perfect will for my life. In Jesus' Name. Amen.`,
    reflectionQuestions: [
      "Who do You say that I am?",
      "What do You want to give me in exchange for the lies I once believed?",
      "Lord, what do You say is true about me?",
    ],
    slug: "strongholds",
    title: "Strongholds Prayer",
  },
  {
    category: "Freedom From Sin",
    description: "A prayer for rejecting word curses, renouncing destructive vows, and receiving God's blessing.",
    followUpSuggestions: [
      "Write down the word, vow, or label being renounced.",
      "Replace it with a specific truth from Scripture.",
      "Follow up on whether that word still feels powerful after prayer.",
    ],
    keyScriptures: ["James 3:8", "Proverbs 13:3", "Proverbs 18:6-8", "Proverbs 18:20", "Matthew 12:33-37", "Romans 8:28"],
    prayerText: `Confession and Repentance

Heavenly Father, I am fully Your child, and I have been purchased by the Blood of Jesus. Lord, I confess and repent of the effects and influences of all word curses or vows, known or unknown, spoken about me, to me, and by me. Forgive me for those times when my words have opened the door to the enemy to negatively influence or become a curse to me and my family. Right now, I specifically renounce and loose the influence of the word curse by __________ that says __________. I bind myself to the truth of the Word that all things work together for my good.

Declaration Statement

In the name of my Lord Jesus Christ, I resist and rebuke every spirit that has gained access and influence in my life or my family by these word curses, and I command all of you to leave me now, to go to the feet of my Lord Jesus Christ, and go where He tells you to go. I renounce every wrong agreement I have ever believed because of these words, and I bind myself to Christ and the truth of the Word that I am a new creation in Christ and a partaker of His Divine Nature.

Prayer of Consecration and Blessing

Heavenly Father, I now ask for a hedge of protection around me and my loved ones. And with praise and thanksgiving, I rejoice in the truth of the Word, that Your Holy Spirit will lead and guide me and help me discern between the righteous and the wicked. All things are new and waiting for me to receive them. In Jesus' name I pray. Amen.`,
    reflectionQuestions: [
      "What word, vow, label, or agreement needs to be renounced?",
      "What truth from God should replace it?",
      "Who might need encouragement or blessing from my words this week?",
    ],
    slug: "breaking-word-curses",
    title: "Breaking Word Curses",
  },
  {
    category: "Healing & Restoration",
    description: "A prayer for repenting of self-hatred, receiving God's forgiveness, and choosing life in Christ.",
    followUpSuggestions: [
      "Identify the self-rejecting words or vows that need to be canceled.",
      "Invite them to speak one life-giving truth over their body and future.",
      "Follow up gently if shame, anxiety, or death wishes were named.",
    ],
    keyScriptures: ["Psalm 139:13-14", "Romans 8:1", "Zephaniah 3:17"],
    prayerText: `Dear Heavenly Father,

I come to You right now and ask You to forgive me for rejecting, hating, and despising myself. I repent; I change my mind and refuse to believe the liar and his lies any longer. I choose to live and breathe and give glory to You. I choose to let Your Holy Spirit reflect Your image through my life and conduct. I agree with the instructions You gave my body when You created me. When You spoke to me while I was being formed in my mother's womb and said "Live," I take authority over my body in the Name of the Lord Jesus Christ, and command all liars, deceivers, destroyers, confusion, self-hatred, self-rejection, doubt, fear, anxiety, shame, guilt, and death, and all that pertains to them, to leave my body, the temple property of the living God, right now.

I ask You to forgive me for hating myself and opening the door for the enemy to bring judgment against me by my own words and/or by others' words spoken over me and my agreement with them. I choose to live and ask You to cancel out all vows and death wishes I uttered hastily against myself.

Thank You for this life You have given me. Help me to give it back to You, having fulfilled the destiny and dreams, and all Your purpose and desire for my life, that I might hear You say, "Well done, good and faithful servant." In Jesus Name. Amen.`,
    reflectionQuestions: [
      "What self-rejecting words or beliefs have I agreed with?",
      "What does God say about my life, body, and future?",
      "What life-giving words should I practice speaking this week?",
    ],
    slug: "self-hatred-self-rejection",
    title: "Self-Hatred and Self-Rejection",
  },
  {
    aliases: ["ungodly-soul-ties"],
    category: "Relationships",
    description: "A prayer for confessing ungodly soul ties, reclaiming surrendered ground, and asking Jesus to restore the soul.",
    followUpSuggestions: [
      "Name the relationship or attachment being surrendered.",
      "Ask whether any boundaries, confession, or pastoral care are needed.",
      "Follow up on peace, freedom, and any lingering sense of attachment.",
    ],
    keyScriptures: ["1 Corinthians 6:12-20", "Ephesians 1:20-23"],
    prayerText: `Prayer of Confession and Repentance

Dear Heavenly Father, I want to be free from every ungodly soul tie that I have ever made. I now confess and repent of any actions that may have led to any ungodly soul ties. Forgive me Lord, and close those doorways into my life. In Jesus' name, I ask You to cleanse those ties by the Blood of Jesus and thereby eliminate any possible access through which Satan can trouble me or my family. I come to You right now and ask You to take the sword of Your Spirit and cut the ungodly soul ties formed between me and __________. I ask You to release me from any vows, covenants, oaths, promises, or exchanges between me and __________ that are not of You, between our bodies, souls, minds, wills, emotions, or spirits.

I give back to __________ right now by the power of Your Spirit, all the parts of their body, mind, soul, will, emotions, and spirit that they either exchanged with, or gave to me. I also take back to myself, by the power of Your Spirit, all the parts of my body, mind, soul, will, emotions, and spirit that I gave to them. Father, separate me from them, restore the fragments, and heal my soul. In Jesus' Name I pray. Amen.

Declaration Statement

In the Name of the Lord Jesus Christ, I take authority over every evil spirit that has gained entrance into my life because of these ungodly soul ties, and I command all of you to leave me now, to go to the feet of my Lord Jesus Christ, and go where He tells you to go. By the Blood of Jesus over me, I reclaim all surrendered ground in the Name of the Lord Jesus Christ, and in His authority I break the power of any and all ungodly covenants, contracts, dedications, or commissions made over me or my family.

Prayer of Consecration, asking the Holy Spirit to fill empty places

Heavenly Father, I now ask for You to cover me with the Blood of Jesus, for Your Holy Spirit to come and fill up all these cleansed areas from any ungodly soul ties in my life. Thank You, Father, for setting me free through the Blood of Jesus to be the person You have created and called me to be. In Jesus' name I pray. Amen.`,
    reflectionQuestions: [
      "What relationship or attachment needs to be surrendered to Jesus?",
      "What promises, vows, or exchanges need to be released?",
      "What boundaries or follow-up support would help me walk in freedom?",
    ],
    slug: "soul-ties",
    title: "Ungodly Soul Ties",
  },
  {
    category: "Freedom From Sin",
    description: "A prayer for renouncing pornography, cleansing the mind, and choosing pure thoughts.",
    followUpSuggestions: [
      "Destroy or remove the objects, apps, or media connected to this sin.",
      "Identify one trusted person for accountability.",
      "Follow up on renewed thought patterns and practical safeguards.",
    ],
    keyScriptures: ["Romans 12:1-2", "1 Corinthians 6:18-20", "Galatians 5:16"],
    prayerText: `Dear Heavenly Father, I confess that I have looked at sexually suggestive and pornographic material for the purpose of stimulating myself sexually. I have attempted to satisfy my lustful desires and polluted my body, soul and spirit. Thank You for cleansing me and for Your forgiveness. I renounce any satanic bonds I have allowed in my life through the unrighteous use of my body and mind. Lord, I commit myself to destroy any objects in my possession that I have used for sexual stimulation, and to turn away from all media that are associated with my sexual sin. I commit myself to the renewing of my mind and to think pure thoughts. Fill me with Your Holy Spirit that I may not carry out the desires of the flesh. In Jesus' name, Amen.`,
    reflectionQuestions: [
      "What object, media source, or pattern needs to be removed?",
      "What lie has kept this door open?",
      "Who can support me in walking clean and accountable?",
    ],
    slug: "pornography",
    title: "Pornography",
  },
  {
    category: "Freedom From Sin",
    description: "A prayer for rejecting harmful attitudes, beliefs, mindsets, and behaviors that do not align with God's Word.",
    followUpSuggestions: [
      "Name the attitude, mindset, belief, or behavior that needs repentance.",
      "Ask what truth from Scripture should replace it.",
      "Follow up on practical obedience in thoughts, words, and deeds.",
    ],
    keyScriptures: ["Romans 12:1-2", "2 Corinthians 10:5", "Ephesians 4:22-24"],
    prayerText: `Lord, I recognize that You created every part of me in accordance with Your will, plan and purpose for my life. I confess that I have adopted attitudes and mindsets that are not true, not of You, and are not in alignment with Your Word, Your ways, and Your perfect plan for my life concerning my sexuality.

I renounce all attitudes, mindsets or beliefs that do not line up with Your Word and I confess and repent of any behaviors including misandry, misogyny, pornography, strip clubs, or any other inappropriate sexual activity that I've engaged in - in thought, word, or deed - and I lay them at the feet of Christ Jesus. Thank You that You forgive and cleanse me according to Your Word.

Thank You that Your mercies are new every morning. I receive Your healing and forgiveness now and ask Your Holy Spirit to empower me to align my thoughts, attitudes, words and deeds with Your perfect plan for my life. In Jesus' name I pray. Amen.`,
    reflectionQuestions: [
      "What attitude, mindset, belief, or behavior does not line up with God's Word?",
      "What truth from God needs to replace it?",
      "What one practical step would align my thoughts, words, and deeds with Jesus?",
    ],
    slug: "harmful-attitudes",
    title: "Harmful Attitudes",
  },
  {
    category: "Freedom From Sin",
    description: "A prayer for confessing substance abuse and asking the Holy Spirit to direct and empower a new way forward.",
    followUpSuggestions: [
      "Identify the substance and the purpose it served.",
      "Invite immediate support if medical, safety, or addiction care is needed.",
      "Follow up with a concrete accountability and care plan.",
    ],
    keyScriptures: ["1 Corinthians 6:19-20", "1 Peter 5:7", "Ephesians 5:18"],
    prayerText: `Dear Heavenly Father, I confess that I have misused substances (alcohol, tobacco, food, prescription or street drugs) for the purpose of pleasure, to escape reality, or to cope with difficult problems. I confess that I have abused my body and programmed my mind in harmful ways. I have quenched the Holy Spirit as well. Thank You for Your forgiveness. I renounce any satanic connection or influence in my life through my misuse of food or chemicals. I cast my anxieties onto Christ who loves me. I commit myself to yield no longer to substance abuse, but instead I choose to allow the Holy Spirit to direct and empower me. In Jesus' name I pray. Amen.`,
    reflectionQuestions: [
      "What substance or coping pattern needs to be surrendered?",
      "What anxiety, pain, or pressure has been driving this pattern?",
      "What help do I need today to walk in freedom?",
    ],
    slug: "substance-abuse",
    title: "Substance Abuse",
  },
  {
    category: "Life Challenges",
    description: "A prayer for renouncing suicidal thoughts and choosing life, hope, and the love of the Father.",
    followUpSuggestions: [
      "Make sure immediate safety and care are in place.",
      "Identify who should be contacted for support right now.",
      "Follow up with a pastor, counselor, physician, or crisis-care plan as needed.",
    ],
    keyScriptures: ["John 10:10", "Jeremiah 29:11", "Romans 15:13"],
    prayerText: `Dear Heavenly Father, I renounce suicidal thoughts and any attempts I've made to take my own life or in any way injure myself. I renounce the lie that life is hopeless and that I can find peace and freedom only by taking my own life. Satan is a thief and comes to steal, kill and destroy. I choose to remain alive in Christ who said He came to give me life and give it abundantly. Thank You for Your forgiveness that allows me to forgive myself. I choose to believe that there is always hope in Christ and that my Heavenly Father loves me. In Jesus' name I pray. Amen.`,
    reflectionQuestions: [
      "Who can I contact right now for care and support?",
      "What lie about hopelessness needs to be renounced?",
      "What truth about life and hope in Christ do I need to receive?",
    ],
    slug: "suicidal-tendencies",
    title: "Suicidal Tendencies",
  },
  {
    category: "Healing & Restoration",
    description: "A prayer for confessing abortion, receiving forgiveness, and entrusting the child to God's care.",
    followUpSuggestions: [
      "Move gently and avoid pressure; let the person name grief, guilt, or fear at their pace.",
      "Invite follow-up pastoral care or counseling if needed.",
      "Ask whether they want to remember, grieve, or entrust the child in a specific way.",
    ],
    keyScriptures: ["Psalm 139:13-16", "1 John 1:9", "Romans 8:1"],
    prayerText: `Dear Heavenly Father, I confess that I was not a proper guardian and keeper of the life You entrusted to me, and I confess that I have sinned. Thank You that because of Your forgiveness, I can forgive myself. I commit the child to You for all eternity and believe that he or she is in Your caring hands. In Jesus' name I pray. Amen.`,
    reflectionQuestions: [
      "What grief, guilt, or sorrow do I need to bring to Jesus?",
      "What truth about forgiveness do I need to receive?",
      "What kind of care or follow-up would help me heal?",
    ],
    slug: "abortion",
    title: "Abortion",
  },
  {
    category: "Identity & Freedom",
    description: "A prayer for renouncing performance-based worth and choosing identity in Christ.",
    followUpSuggestions: [
      "Ask where approval or perfection has become a false source of worth.",
      "Choose one act of obedience that is rooted in faith rather than striving.",
      "Follow up on rest, grace, and freedom from performance pressure.",
    ],
    keyScriptures: ["Titus 3:5", "Galatians 3:13", "John 15:4-5"],
    prayerText: `Dear Heavenly Father, I renounce the lie that my self-worth is dependent upon my ability to perform. I announce the truth that my identity and sense of worth are found in who I am as Your child. I renounce seeking the approval and acceptance of other people for my affirmation, and I choose to believe the truth that I am already approved and accepted in Christ, because of His death and resurrection for me. I choose to believe the truth that I have been saved, not by deeds done in righteousness, but according to Your mercy. I choose to believe that I am no longer under the curse of the law, because Christ became a curse for me. I receive the free gift of life in Christ and choose to abide in Him. I renounce striving for perfection by living under the law. By Your grace Heavenly Father, I choose from this day forward to walk by faith in the power of Your Holy Spirit according to what You have said is true. In Jesus' name I pray. Amen.`,
    reflectionQuestions: [
      "Where have I been trying to prove my worth?",
      "Whose approval has become too important to me?",
      "What would it look like to walk by faith instead of striving?",
    ],
    slug: "drivenness-perfectionism",
    title: "Drivenness and Perfectionism",
  },
  {
    category: "Relationships",
    description: "A prayer for renouncing racism, elitism, sexism, and other judgments against people made in God's image.",
    followUpSuggestions: [
      "Ask the Lord to reveal the roots of any judgment or prejudice.",
      "Name one group or person toward whom repentance is needed.",
      "Follow up with humility, listening, and one concrete act of reconciliation.",
    ],
    keyScriptures: ["Genesis 1:27", "Galatians 3:28", "Ephesians 4:1-3"],
    prayerText: `Dear Heavenly Father, You have created all humanity in Your image. I confess that I have judged others by the color of their skin, their national origin, their social or economic status, their cultural differences, or their sexual orientation. I renounce racism, elitism, and sexism. I choose to believe "There is neither Jew nor Greek, there is neither slave nor free, there is neither male nor female, for you are all one in Christ" (Galatians 3:28). Please show me the roots of my own bigotry that I may confess it and be cleansed from such defilement. I pledge myself to walk in a manner worthy of the calling to which I have been called, with all humility and gentleness, with patience, bearing with one another in love, eager to maintain the unity of the Spirit in the bond of peace (Ephesians 4:1-3 ESV). In Jesus' name I pray. Amen.`,
    reflectionQuestions: [
      "Where have I judged or dismissed someone made in God's image?",
      "What root of pride, fear, or prejudice needs repentance?",
      "What step of humility or reconciliation should I take?",
    ],
    slug: "bigotry",
    title: "Bigotry",
  },
  {
    category: "Healing & Restoration",
    description: "A prayer for survivors of sexual abuse to release offenses to God's justice and receive healing.",
    followUpSuggestions: [
      "Move slowly, keep the person in control, and do not press for details.",
      "Offer pastoral care, counseling, or mandated safety support where appropriate.",
      "Follow up on truth, safety, and the healing Jesus is bringing.",
    ],
    keyScriptures: ["Psalm 139:13-16", "Jeremiah 29:11", "1 Peter 2:23"],
    prayerText: `Lord, thank You that You know me and love me. Thank You that You formed my innermost being and know every hair on my head. Thank You that You have a plan for my life that is a good plan for a future and a hope, and I thank You that that plan includes physical, spiritual, mental and emotional healing.

Lord, I realize that to heal I must release offenses to Your perfect justice. I need Your help to release them, knowing that release and forgiveness do not justify or nullify the sins against me, but doing so allows me to heal and God to enact His justice.

Teach me to see myself as You see me. I renounce all lies that cause me to feel dirty, rejected, or unworthy because of rape, incest, or molestation. I reject all lies or guilt that cause me to feel as though I didn't do what I could have done to stop or prevent the abuse. Show me what Your truth is, and restore me to wholeness, Lord.

Thank You for cleansing me and releasing me from any feelings of guilt or shame. Thank You for healing my mind, body, and emotions of the pain and trauma that I experienced on account of the sins committed against me. Holy Spirit, please come and fill all of these cleansed areas with Your light and life and health. In Jesus' name I pray. Amen.`,
    reflectionQuestions: [
      "What lie about guilt, shame, or worthiness needs to be renounced?",
      "What truth from God do I need to receive about myself?",
      "What safe support would help me continue healing?",
    ],
    slug: "sexual-abuse-survivor",
    title: "Sexual Abuse Survivor",
  },
  {
    category: "Healing & Restoration",
    description: "A prayer for renouncing eating disorders, self-mutilation, and lies about value, control, and the body.",
    followUpSuggestions: [
      "Ask whether medical, counseling, or safety support is needed.",
      "Name the lie about value, appearance, control, or cleansing.",
      "Follow up with practical care for body, food, safety, and support.",
    ],
    keyScriptures: ["1 Corinthians 6:19-20", "Romans 12:1", "Romans 8:1"],
    prayerText: `Dear Heavenly Father, I renounce the lie that my value as a person is dependent upon my appearance or performance. I renounce cutting or abusing myself, vomiting, using laxatives or starving myself as a means of being in control, altering my appearance, or trying to cleanse myself of evil. I announce that only the blood of the Lord Jesus Christ cleanses me from sin. I realize I have been bought with a price and my body, the temple of the Holy Spirit, belongs to God. Therefore, I choose to glorify God in my body. I renounce the lie that I am evil or that any part of my body is evil. Thank You that You accept me just the way I am in Christ. In Jesus' name, Amen.`,
    reflectionQuestions: [
      "What lie about my body, value, or control needs to be renounced?",
      "What care or support does my body need right now?",
      "What truth about belonging to God do I need to receive?",
    ],
    slug: "eating-disorders-self-mutilation",
    title: "Eating Disorders or Self Mutilation",
  },
  {
    category: "Relationships",
    description: "A prayer for renouncing homosexual behavior and receiving God's intended design for relationships.",
    followUpSuggestions: [
      "Move with pastoral gentleness and avoid argument or pressure.",
      "Ask what truth, healing, or community support is needed.",
      "Follow up with discipleship care rooted in Scripture, love, and holiness.",
    ],
    keyScriptures: ["Genesis 1:27", "Romans 1:24-29", "1 Corinthians 6:9-11"],
    prayerText: `Lord Jesus, I renounce the lie that You have created me or anyone else to be homosexual, and I agree that in Your Word You clearly forbid homosexual behavior. I choose to accept myself as a child of God and I thank You that You created me as a man (woman). I renounce all homosexual thoughts, urges, drives and acts, and I renounce all ways that Satan has used these things to pervert my relationships. I announce that I am free in Christ to relate to the opposite sex and my own sex in the way that You intended. In Jesus' name I pray. Amen.`,
    reflectionQuestions: [
      "What lie, pressure, or behavior needs to be surrendered to Jesus?",
      "What does it mean to receive God's love and holiness together?",
      "What trusted discipleship support would help me walk forward?",
    ],
    slug: "homosexuality",
    title: "Homosexuality",
  },
  {
    category: "Identity & Freedom",
    description: "A prayer for receiving biological gender identity and asking God to heal damaged emotions and renew the mind.",
    followUpSuggestions: [
      "Move with pastoral gentleness and avoid argument or pressure.",
      "Ask what accusations or labels need to be renounced.",
      "Follow up with wise discipleship, pastoral care, and supportive community.",
    ],
    keyScriptures: ["Genesis 1:27", "Deuteronomy 22:5", "Romans 1:24-29", "Ephesians 6:13", "Ephesians 6:16"],
    prayerText: `Dear Heavenly Father, I choose to believe that You have created all humanity to be either male or female (Genesis 1:27) and commanded us to maintain a distinction between the two genders (Deuteronomy 22:5; Romans 1:24-29). I confess that I have been influenced by the social pressures of this fallen world and the lies of Satan to question my biological gender identity and that of others. I renounce all the accusations and lies of Satan that would seek to convince me that I am somebody other than who You created me to be. I choose to believe and accept my biological gender identity, and I pray that You would heal my damaged emotions and enable me to be transformed by the renewing of my mind. I take up the full armor of God (Ephesians 6:13) and the shield of faith to extinguish all the temptations and accusations of the evil one (Ephesians 6:16). I renounce any identities and labels that derive from my old nature, and I choose to believe that I am a new creation in Christ. In the wonderful name of Jesus I pray. Amen.`,
    reflectionQuestions: [
      "What accusation, label, or pressure needs to be renounced?",
      "What truth about God's creation and care do I need to receive?",
      "What safe discipleship support would help me walk forward?",
    ],
    slug: "gender-identity",
    title: "Gender Identity",
  },
] as const satisfies readonly DosPrayerResource[];

export function getDosPrayerResourceBySlug(slug: string) {
  return dosPrayerResources.find((resource) => {
    const aliases = ("aliases" in resource ? resource.aliases : undefined) as readonly string[] | undefined;

    return resource.slug === slug || Boolean(aliases?.some((alias) => alias === slug));
  }) ?? null;
}

export function getDosPrayerResourceSlugs() {
  return dosPrayerResources.flatMap((resource) => {
    const aliases = ("aliases" in resource ? resource.aliases : undefined) as readonly string[] | undefined;

    return [resource.slug, ...(aliases ?? [])];
  });
}
