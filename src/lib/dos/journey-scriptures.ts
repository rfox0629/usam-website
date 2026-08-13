/**
 * King James Version text for the Scripture references used by DOS Guided
 * Journeys, so a Scripture row in the reading column can open the same
 * in-app quick view the rest of DOS uses.
 *
 * The KJV is public domain. This table is generated from the references in
 * `resource-catalog.ts`; when a Journey adds a reference that is not listed
 * here the row simply stays non-interactive rather than opening an empty card.
 */

export type DosJourneyScripture = {
  reference: string;
  text: string;
};

const journeyScriptureText: Record<string, string> = {
  "1 John 2:3-6": "And hereby we do know that we know him, if we keep his commandments. He that saith, I know him, and keepeth not his commandments, is a liar, and the truth is not in him. But whoso keepeth his word, in him verily is the love of God perfected: hereby know we that we are in him. He that saith he abideth in him ought himself also so to walk, even as he walked.",
  "1 Peter 1:15-16": "But as he which hath called you is holy, so be ye holy in all manner of conversation; Because it is written, Be ye holy; for I am holy.",
  "2 Corinthians 13:5": "Examine yourselves, whether ye be in the faith; prove your own selves. Know ye not your own selves, how that Jesus Christ is in you, except ye be reprobates?",
  "2 Corinthians 4:17-18": "For our light affliction, which is but for a moment, worketh for us a far more exceeding and eternal weight of glory; While we look not at the things which are seen, but at the things which are not seen: for the things which are seen are temporal; but the things which are not seen are eternal.",
  "2 Corinthians 7:1": "Having therefore these promises, dearly beloved, let us cleanse ourselves from all filthiness of the flesh and spirit, perfecting holiness in the fear of God.",
  "2 Timothy 2:2": "And the things that thou hast heard of me among many witnesses, the same commit thou to faithful men, who shall be able to teach others also.",
  "Amos 5:15": "Hate the evil, and love the good, and establish judgment in the gate: it may be that the LORD God of hosts will be gracious unto the remnant of Joseph.",
  "Colossians 2:6-7": "As ye have therefore received Christ Jesus the Lord, so walk ye in him: Rooted and built up in him, and stablished in the faith, as ye have been taught, abounding therein with thanksgiving.",
  "Colossians 3:1-2": "If ye then be risen with Christ, seek those things which are above, where Christ sitteth on the right hand of God. Set your affection on things above, not on things on the earth.",
  "Colossians 3:1-4": "If ye then be risen with Christ, seek those things which are above, where Christ sitteth on the right hand of God. Set your affection on things above, not on things on the earth. For ye are dead, and your life is hid with Christ in God. When Christ, who is our life, shall appear, then shall ye also appear with him in glory.",
  "Galatians 2:20": "I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me.",
  "Galatians 5:22-25": "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, Meekness, temperance: against such there is no law. And they that are Christ’s have crucified the flesh with the affections and lusts. If we live in the Spirit, let us also walk in the Spirit.",
  "Hebrews 12:14": "Follow peace with all men, and holiness, without which no man shall see the Lord:",
  "James 1:22-25": "But be ye doers of the word, and not hearers only, deceiving your own selves. For if any be a hearer of the word, and not a doer, he is like unto a man beholding his natural face in a glass: For he beholdeth himself, and goeth his way, and straightway forgetteth what manner of man he was. But whoso looketh into the perfect law of liberty, and continueth therein, he being not a forgetful hearer, but a doer of the work, this man shall be blessed in his deed.",
  "John 1:12": "But as many as received him, to them gave he power to become the sons of God, even to them that believe on his name:",
  "John 13:34-35": "A new commandment I give unto you, That ye love one another; as I have loved you, that ye also love one another. By this shall all men know that ye are my disciples, if ye have love one to another.",
  "John 14:15": "If ye love me, keep my commandments.",
  "John 15:9-11": "As the Father hath loved me, so have I loved you: continue ye in my love. If ye keep my commandments, ye shall abide in my love; even as I have kept my Father’s commandments, and abide in his love. These things have I spoken unto you, that my joy might remain in you, and that your joy might be full.",
  "John 8:31": "Then said Jesus to those Jews which believed on him, If ye continue in my word, then are ye my disciples indeed;",
  "John 8:31-32": "Then said Jesus to those Jews which believed on him, If ye continue in my word, then are ye my disciples indeed; And ye shall know the truth, and the truth shall make you free.",
  "Luke 14:26-27": "If any man come to me, and hate not his father, and mother, and wife, and children, and brethren, and sisters, yea, and his own life also, he cannot be my disciple. And whosoever doth not bear his cross, and come after me, cannot be my disciple.",
  "Luke 14:33": "So likewise, whosoever he be of you that forsaketh not all that he hath, he cannot be my disciple.",
  "Luke 9:23": "And he said to them all, If any man will come after me, let him deny himself, and take up his cross daily, and follow me.",
  "Luke 9:23-24": "And he said to them all, If any man will come after me, let him deny himself, and take up his cross daily, and follow me. For whosoever will save his life shall lose it: but whosoever will lose his life for my sake, the same shall save it.",
  "Mark 1:16-20": "Now as he walked by the sea of Galilee, he saw Simon and Andrew his brother casting a net into the sea: for they were fishers. And Jesus said unto them, Come ye after me, and I will make you to become fishers of men. And straightway they forsook their nets, and followed him. And when he had gone a little farther thence, he saw James the son of Zebedee, and John his brother, who also were in the ship mending their nets. And straightway he called them: and they left their father Zebedee in the ship with the hired servants, and went after him.",
  "Matthew 16:24-26": "Then said Jesus unto his disciples, If any man will come after me, let him deny himself, and take up his cross, and follow me. For whosoever will save his life shall lose it: and whosoever will lose his life for my sake shall find it. For what is a man profited, if he shall gain the whole world, and lose his own soul? or what shall a man give in exchange for his soul?",
  "Matthew 28:18-20": "And Jesus came and spake unto them, saying, All power is given unto me in heaven and in earth. Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost: Teaching them to observe all things whatsoever I have commanded you: and, lo, I am with you alway, even unto the end of the world. Amen.",
  "Matthew 5:14-16": "Ye are the light of the world. A city that is set on an hill cannot be hid. Neither do men light a candle, and put it under a bushel, but on a candlestick; and it giveth light unto all that are in the house. Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.",
  "Matthew 6:19-21": "Lay not up for yourselves treasures upon earth, where moth and rust doth corrupt, and where thieves break through and steal: But lay up for yourselves treasures in heaven, where neither moth nor rust doth corrupt, and where thieves do not break through nor steal: For where your treasure is, there will your heart be also.",
  "Matthew 7:21-27": "Not every one that saith unto me, Lord, Lord, shall enter into the kingdom of heaven; but he that doeth the will of my Father which is in heaven. Many will say to me in that day, Lord, Lord, have we not prophesied in thy name? and in thy name have cast out devils? and in thy name done many wonderful works? And then will I profess unto them, I never knew you: depart from me, ye that work iniquity. Therefore whosoever heareth these sayings of mine, and doeth them, I will liken him unto a wise man, which built his house upon a rock: And the rain descended, and the floods came, and the winds blew, and beat upon that house; and it fell not: for it was founded upon a rock. And every one that heareth these sayings of mine, and doeth them not, shall be likened unto a foolish man, which built his house upon the sand: And the rain descended, and the floods came, and the winds blew, and beat upon that house; and it fell: and great was the fall of it.",
  "Philippians 1:6": "Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ:",
  "Philippians 3:7-8": "But what things were gain to me, those I counted loss for Christ. Yea doubtless, and I count all things but loss for the excellency of the knowledge of Christ Jesus my Lord: for whom I have suffered the loss of all things, and do count them but dung, that I may win Christ,",
  "Psalm 27:4": "One thing have I desired of the LORD, that will I seek after; that I may dwell in the house of the LORD all the days of my life, to behold the beauty of the LORD, and to enquire in his temple.",
  "Psalm 97:10": "Ye that love the LORD, hate evil: he preserveth the souls of his saints; he delivereth them out of the hand of the wicked.",
  "Romans 10:9-10": "That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved. For with the heart man believeth unto righteousness; and with the mouth confession is made unto salvation.",
  "Romans 12:1-2": "I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service. And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.",
  "Romans 12:9": "Let love be without dissimulation. Abhor that which is evil; cleave to that which is good.",
  "Romans 6:6-11": "Knowing this, that our old man is crucified with him, that the body of sin might be destroyed, that henceforth we should not serve sin. For he that is dead is freed from sin. Now if we be dead with Christ, we believe that we shall also live with him: Knowing that Christ being raised from the dead dieth no more; death hath no more dominion over him. For in that he died, he died unto sin once: but in that he liveth, he liveth unto God. Likewise reckon ye also yourselves to be dead indeed unto sin, but alive unto God through Jesus Christ our Lord.",
};

/** Returns the KJV text for a reference, or null when it is not in the table. */
export function dosJourneyScripture(reference: string): DosJourneyScripture | null {
  const text = journeyScriptureText[reference];

  return text ? { reference, text } : null;
}

export function hasDosJourneyScripture(reference: string): boolean {
  return Boolean(journeyScriptureText[reference]);
}
