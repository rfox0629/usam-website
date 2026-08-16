# USA-165 Restoration Field Inventory

Date: 2026-08-13

This inventory maps the founder-supplied Life History Form and Personal Hindrance Inventory prompts to the current digital intake fields in `src/lib/restoration/intake.ts`.

The source PDFs are not embedded, linked, or committed. This document records coverage and content questions for review.

## Digital Sections

1. `welcome` - Welcome and Consent
2. `goals` - Goals for Restoration
3. `spiritual` - Spiritual Background
4. `lifeHealth` - Present Life and Health
5. `relationships` - Marriage, Children, and Relationships
6. `childhood` - Parents, Childhood, and Siblings
7. `sexualBackground` - Sexual Background and Trauma-Sensitive Questions
8. `hindrance` - Personal Hindrance Inventory
9. `occult` - Occult Involvement
10. `familyTree` - Family and Relationship History
11. `additional` - Additional Information

## Life History Form Mapping

| Source prompt | Digital section | Digital field id | Notes |
| --- | --- | --- | --- |
| Today's date | `goals` | `todaysDate` | Optional. |
| Applicant's codename | future referral metadata | `restoration_referrals` proposal | Should be generated/stored server-side, not participant-entered. |
| What prompted you to seek restoration assistance? | `goals` | `whatBringsYouHere` | Required. |
| What are your goals for this restoration journey? | `goals` | `restorationGoals` | Required. |
| Previously had deliverance? | `goals` | `previousDeliverance` | Yes/No/Not sure. |
| Previously received professional care? | `goals` | `previousProfessionalCare` | Yes/No/Not sure. |
| Currently married? | `relationships` | `currentlyMarried` | Moved from general info into relationships. |
| How many times married? | `relationships` | `marriageCount` | Text field for flexible answers. |
| Served in military? | `goals` | `servedMilitary` | Yes/No/Not sure. |
| If yes, were you in combat? | `goals` | `combatExperience` | Conditional. |
| Are you a born-again Christian? | `spiritual` | `bornAgainChristian` | Preserved. |
| How many years have you been a Christian? | `spiritual` | `yearsChristian` | Preserved. |
| Water baptized? | `spiritual` | `waterBaptized` | Preserved. |
| Current church affiliation | `spiritual` | `currentChurch` | Preserved. |
| If none, last church affiliation | `spiritual` | `lastChurch` | Preserved. |
| Describe spiritual background | `spiritual` | `spiritualBackground` | Preserved. |
| Involved in a cult? | `spiritual` | `cultInvolvement` | Flag final wording. |
| If yes, name of cult | `spiritual` | `cultName` | Conditional. |
| Have you or relatives participated in occult activities? | `spiritual` | `familyOccultActivity` | Preserved as narrative; detailed checklist is in `occultInvolvement`. |
| Describe spiritual issues past or present | `spiritual` | `spiritualIssues` | Preserved. |
| Present satisfaction with life | `lifeHealth` | `lifeSatisfaction` | Converted to 1-5 radio scale. |
| Past or present relationship problems | `lifeHealth` | `relationshipProblems` | Preserved. |
| Physical health level | `lifeHealth` | `physicalHealth` | Converted to 1-5 radio scale. |
| Mental health level | `lifeHealth` | `mentalHealth` | Converted to 1-5 radio scale; final clinical wording needed. |
| Prescription medications and reasons | `lifeHealth` | `prescriptionMeds` | Medical sensitivity flagged. |
| Non-prescription medications and reasons | `lifeHealth` | `nonPrescriptionMeds` | Medical sensitivity flagged. |
| Alcohol or illegal drugs to deal with issues? | `lifeHealth` | `alcoholOrDrugs` | Addiction/clinical sensitivity flagged. |
| Operation requiring blood transfusion? | `lifeHealth` | `bloodTransfusion` | Medical sensitivity flagged. |
| Last time physically and emotionally well | `lifeHealth` | `lastWellSeason` | Preserved. |
| Children satisfaction | `relationships` | `childrenSatisfaction` | Converted to 1-5 radio scale. |
| Which child do you favor most and why? | `relationships` | `favoredChild` | Flag trauma-informed wording. |
| Difficulties with children for participant/spouse | `relationships` | `childrenDifficulty` | Preserved. |
| Do your children confide in you? | `relationships` | `childrenConfide` | Preserved. |
| Spouse first name | `relationships` | `spouseFirstName` | First name only. |
| Number of years married | `relationships` | `yearsMarried` | Preserved. |
| My age when married | `relationships` | `ageWhenMarried` | Preserved. |
| Spouse age when married | `relationships` | `spouseAgeWhenMarried` | Preserved. |
| Fiance(e) first name | `relationships` | `fianceFirstName` | First name only. |
| Number of years engaged | `relationships` | `yearsEngaged` | Preserved. |
| Traits liked about spouse/fiance(e) | `relationships` | `spouseTraitsLike` | Preserved. |
| Traits disliked about spouse/fiance(e) | `relationships` | `spouseTraitsDislike` | Preserved. |
| Expectations for spouse/fiance(e) behavior | `relationships` | `spouseExpectations` | Preserved. |
| Have expectations been met? | `relationships` | `spouseExpectationsMet` | Preserved. |
| If no, why not? | `relationships` | `spouseExpectationsWhyNot` | Conditional. |
| Can you confide in spouse/fiance(e)? | `relationships` | `spouseConfide` | Preserved. |
| Satisfaction with spouse/fiance(e) | `relationships` | `spouseSatisfaction` | Converted to 1-5 radio scale. |
| Relationship with spouse/fiance(e)'s family | `relationships` | `spouseFamilyRelationship` | Preserved. |
| Who interfered with marriage/plans? | `relationships` | `marriageInterference` | First names only. |
| X-spouse first name | `relationships` | `exSpouseFirstName` | Source spelling preserved as meaning; display uses `X-spouse`. |
| Years married to x-spouse | `relationships` | `exYearsMarried` | Preserved. |
| My age when married to x-spouse | `relationships` | `exAgeWhenMarried` | Preserved. |
| X-spouse age when married | `relationships` | `exSpouseAgeWhenMarried` | Preserved. |
| Traits liked about x-spouse | `relationships` | `exTraitsLike` | Preserved. |
| Traits disliked about x-spouse | `relationships` | `exTraitsDislike` | Preserved. |
| Relationship with x-spouse's family | `relationships` | `exFamilyRelationship` | Preserved. |
| Father's first name and occupation | `childhood` | `fatherNameOccupation` | Combined first name and occupation. |
| Stepfather's first name and occupation | `childhood` | `stepfatherNameOccupation` | Combined first name and occupation. |
| Mother's first name and occupation | `childhood` | `motherNameOccupation` | Combined first name and occupation. |
| Stepmother's first name and occupation | `childhood` | `stepmotherNameOccupation` | Combined first name and occupation. |
| Grew up in orphanage/foster home? | `childhood` | `orphanageFosterHome` | Preserved. |
| If yes, from age to age | `childhood` | `orphanageFosterAges` | Conditional. |
| Father traits when young | `childhood` | `fatherTraits` | Multi-select from source trait list. |
| Stepfather traits when young | `childhood` | `stepfatherTraits` | Multi-select from source trait list. |
| Mother traits when young | `childhood` | `motherTraits` | Multi-select from source trait list. |
| Stepmother traits when young | `childhood` | `stepmotherTraits` | Multi-select from source trait list. |
| What did you like about father? | `childhood` | `likedFather` | Preserved. |
| What did you not like about father? | `childhood` | `dislikedFather` | Preserved. |
| Father's relationship with you | `childhood` | `fatherRelationship` | Preserved. |
| Father's nature now | `childhood` | `fatherNatureNow` | Preserved. |
| What did you like about mother? | `childhood` | `likedMother` | Preserved. |
| What did you not like about mother? | `childhood` | `dislikedMother` | Preserved. |
| Mother's nature and relationship with you | `childhood` | `motherRelationship` | Preserved. |
| Parents' feelings about your birth | `childhood` | `parentsBirthFeelings` | Preserved. |
| Parents' relationship to each other | `childhood` | `parentsRelationship` | Preserved. |
| How parents disciplined you | `childhood` | `parentsDiscipline` | Preserved. |
| Which parent could you confide in? | `childhood` | `parentConfide` | Preserved. |
| Important values in your house | `childhood` | `houseValues` | Preserved. |
| Household childhood atmosphere | `childhood` | `childhoodAtmosphere` | Multi-select from Peaceful/Tense/Joy filled/Unpredictable. |
| Overall childhood experience | `childhood` | `childhoodExperience` | Converted to 1-5 radio scale. |
| Childhood fears or conditions | `childhood` | `childhoodFears` | Preserved with examples in helper text. |
| Relationship with siblings growing up | `childhood` | `siblingsGrowingUp` | Preserved. |
| Relationship with siblings now | `childhood` | `siblingsNow` | Preserved. |
| Sexuality growing up | `sexualBackground` | `sexualityGrowingUp` | Converted to 1-5 radio scale; wording flagged. |
| Trauma/anxieties from opposite-sex sexual experience | `sexualBackground` | `oppositeSexTrauma` | Trauma-sensitive and legal review required. |
| Trauma/anxieties from same-sex sexual experience | `sexualBackground` | `sameSexTrauma` | Trauma-sensitive and legal review required. |
| Age exposed to pornographic material | `sexualBackground` | `pornExposureAge` | Preserved. |
| Additional sexual background notes | `sexualBackground` | `sexualBackgroundNotes` | Added for progressive disclosure and participant control. |
| Additional pertinent information | `additional` | `additionalInformation` | Preserved. |
| Continuation of prior answers | `additional` | `continuedAnswers` | Preserved. |
| Family tree: myself first name/age/years married | `familyTree` | `familyTreeSelf` | First names only. |
| Family tree: father/stepfather | `familyTree` | `familyTreeFather` | First names, ages, years married. |
| Family tree: mother/stepmother | `familyTree` | `familyTreeMother` | First names, ages, years married. |
| Family tree: siblings | `familyTree` | `familyTreeSiblings` | First names, ages, years married. |
| Family tree: spouse | `familyTree` | `familyTreeSpouse` | First name, age, years married. |
| Family tree: x-spouse | `familyTree` | `familyTreeExSpouse` | First name, age, years married. |
| Family tree: children | `familyTree` | `familyTreeChildren` | First names, ages, years married. |
| Number of miscarriages/abortions | `familyTree` | `miscarriagesAbortions` | Sensitive; final wording and retention needed. |
| Other relationship figures: boss, coach, teacher, bully, pastor, friends, God | `familyTree` | `otherRelationshipFigures` | Source leaves area largely staff-directed; future split needs review. |
| Office use/team initials | Command Center review | `restoration_review_assignments` proposal | Staff-only, not participant-entered. |
| Large dotted family-tree area marked leave blank | Command Center review | `restoration_review_notes` proposal | Staff-only; not participant-entered. |

## Personal Hindrance Inventory Mapping

| Source prompt | Digital section | Digital field id | Notes |
| --- | --- | --- | --- |
| Restoration team leaders | Command Center review | `restoration_review_assignments` proposal | Staff-only. |
| Date | `goals` | `todaysDate` | Production can default server date. |
| Name | `welcome` | `participantName` | Source prompt preserved as preferred name. |
| Email | `welcome` | `participantEmail` | Used for follow-up. |
| Phone | `welcome` | `participantPhone` | Follow-up only. |
| Are you a Christian? | `spiritual` | `isChristianPhi` | Preserved separately from Life History born-again wording. |
| Do you believe Jesus has all power and authority, and are you willing to be free? | `spiritual` | `jesusAuthorityFreedom` | Preserved; theological wording requires Mission of Reconciliation approval. |
| Are you willing to visit past hurtful situations to be free? | `spiritual` | `willingToVisitPastHurt` | Preserved; trauma-informed wording flagged. |
| Possessiveness checklist | `hindrance` | `hindrance_possessiveness` | Includes Jealousy, Greed, Gambling, Hoarding, Indebtedness, Laziness, Procrastination, Poverty, Stealing, Cheating, Stinginess. |
| Fears checklist | `hindrance` | `hindrance_fears` | Includes anxiety, authority, closed places, dark, evil/demons, failure, heights, losing salvation, man, unknown, panic attacks, paranoia. |
| Critical Spirit checklist | `hindrance` | `hindrance_criticalSpirit` | Includes critical of others/self, belittling, coldness, rejection, gossip, joking at others' expense, judgmentalism, prejudice, perfectionism, self-righteousness. |
| Rebellion checklist | `hindrance` | `hindrance_rebellion` | Includes toward God/authority, arrogance, controlling attitude, disobedience, disrespectful, pride, self-promoting, stubbornness, witchcraft. Content review required. |
| Anger Issues checklist | `hindrance` | `hindrance_angerIssues` | Includes aggressiveness, bitterness, hatred, murder, rage, revenge, silent treatment, temper, temper tantrums, unforgiveness, violence, vandalism. |
| Victim Mentality checklist | `hindrance` | `hindrance_victimMentality` | Includes abandoned, unwanted, conceived/born out of wedlock, illegitimacy, divorced, doubt, expecting failure, hopelessness, despair, inadequacy, insecurity, inferiority, loneliness, isolation, passiveness, shyness, self-pity, unworthiness, worthlessness. Content review required. |
| Emotional Issues checklist | `hindrance` | `hindrance_emotionalIssues` | Includes abandonment, abortion guilt, broken heart, depression, moodiness, gender confusion, guilt, shame, hurt, deep hurt, nightmares, insomnia, orphan, rejection, self-rejection, self-hatred, self-harming, self-punishment, suicidal, wounded spirit. Clinical and escalation review required. |
| Sexual Sins / Sexual Background checklist | `hindrance` | `hindrance_sexualBackgroundItems` | Includes adultery, fornication, homosexuality, incest, lust, pornography, masturbation, molestation, rape, sexual abuse of others, sexual perversion, sexual dreams, cross dressing, sexual difficulties. Content and trauma-informed review required. |
| Addictions checklist | `hindrance` | `hindrance_addictions` | Includes alcohol, anorexia, bulimia, caffeine, fingernail biting, illegal drugs, prescription medications, overeating, shopping, kleptomania, smoking, social media, phone, video games. Clinical review required. |
| Mental Illness checklist | `hindrance` | `hindrance_mentalIllness` | Includes ADD/ADHD, autistic disorders, bipolar disorders, narcissism, obsessive compulsive, schizophrenia/voices, mental confusion, mental torment, unable to keep job/mess-up. Clinical review required. |
| Traumas checklist | `hindrance` | `hindrance_traumas` | Includes physically/mentally abused, assaulted, raped, traumatic loss, accident, near death experiences. Trauma/mandatory-reporting review required. |
| Physical Diseases checklist | `hindrance` | `hindrance_physicalDiseases` | Includes autoimmune disease, cancer, Covid 19/vaccines, diabetes, PMS, heart/lung/stroke, kidney stones/cyst, migraines, STD, anesthesia, organ transplant, blood transfusion, vertigo. Medical review required. |
| Miscellaneous checklist | `hindrance` | `hindrance_miscellaneous` | Includes cursing/cussing, denial, avoidance, exaggeration, forgetfulness, lying, compulsive lying. |
| False Religions checklist | `hindrance` | `hindrance_falseReligions` | Includes Buddhism, Humanism, Islam, Eastern religions, Hinduism, Confucianism, Jehovah Witnesses, Mormonism, Native American Spiritism, New Age, Atheism, Pantheism, Scientology, Secret societies, White supremacy, Universalism/Unity, Antisemitism, Catholicism, False doctrine. Founder and Mission of Reconciliation review required. |
| Other emotional or mental issues | `hindrance` | `otherEmotionalMental` | Preserved. |
| Other addictions or miscellaneous issues | `hindrance` | `otherAddictionsMisc` | Preserved. |
| Other physical issues or traumas | `hindrance` | `otherPhysicalTraumas` | Preserved. |
| Other false religions | `hindrance` | `otherFalseReligions` | Preserved; content review required. |
| Occult involvement checklist | `occult` | `occultInvolvement` | Full source checklist represented as options in `occultInvolvementOptions`. Founder and Mission of Reconciliation review required. |
| Other occult involvement | `occult` | `otherOccult` | Preserved. |
| I have read each section and answered truthfully | `additional` | `truthfulInitials` | Converted to checkbox. Production may require initials/signature. |
| Cannot guarantee end to all problems or desired changes | `additional` | `noGuaranteeInitials` | Converted to checkbox; final wording required. |
| Physical manifestations / hold harmless | `additional` | `manifestationHoldHarmlessInitials` | Converted to checkbox and explicitly flagged for legal/founder review. |
| Do not write below this line: born again | Command Center review | staff-only spiritual notes proposal | Staff-only source area. |
| Do not write below this line: water baptized as infant/adult | Command Center review | staff-only spiritual notes proposal | Staff-only source area; participant-facing water baptism field is `waterBaptized`. |
| Do not write below this line: baptized in Holy Spirit / speaking in tongues | Command Center review | staff-only spiritual notes proposal | Staff-only source area; founder/Mission of Reconciliation decision required. |
| Do not write below this line: healed of | Command Center review | staff-only spiritual notes proposal | Staff-only source area; founder/Mission of Reconciliation decision required. |
| Additional information for ministers | `additional` | `additionalInformation` | Preserved. |
| Continue more information below | `additional` | `continuedAnswers` | Preserved. |

## Occult Checklist Coverage

All source occult options are represented under `occultInvolvement`:

Amulets; Ancestral spirits; Angel worship; Animal / human sacrifice; Anime; Astral projection; Astrology; Blood sacrifices; Bloody Mary; Channeling; Chanting; Clairvoyance / ESP; Conjuring; Consulting a psychic; Crystal balls; Demon / Baphomet; Deja vu dreams / divination; Dream catchers; Dungeons & Dragons; Eastern Star; Eckankar; Enneagram; Familiar spirits; Fortune telling; Free Masonry; Grave sucking; Graven images; Halloween; Harry Potter books or movies; Hexes / vexes; Horoscopes; Horror movies; Hypnosis; Idolatry; Illuminati / Luciferianism; Imaginary friends; Incense; Kundalini; Levitation; Magic - black or white; Meditation / transcendental meditation; Mediums; Meta-physics; Mind control; Movies about witchcraft; Necromancy; New Age practices; Order of the Rainbow; Ouija board; Palm reading; Pentagram; Pokemon; Reiki; Reincarnation; Satanic ritual abuse; Satanic ritual abortion; Satanic rituals; Satanism; Seances; Secret society of spirits; Shamanism; Shape shifting; Sorcery; Soul travel; Spells; Spirit guide; Spiritism; Superstition; Table tipping; Tarot cards; Tattoos; Tea leaves; Telekinesis; Ungodly music; Voodoo; Water witching; Wiccan; Witch doctors; Witchcraft; Ying Yang; Yoga.

## Content Questions For Founder and Mission of Reconciliation Review

- Whether any source-form terminology should be replaced with more relational Mission of Reconciliation language before future gated persistence work.
- Final confidentiality and mandatory-reporting language.
- Exact emergency/current danger/suicidal ideation escalation protocol.
- Whether the participant should be asked for email/phone inside the intake or only at referral creation.
- Whether PHI `Are you a Christian?` and Life History `Are you a born-again Christian?` should remain separate.
- Theological wording around Jesus' authority, freedom, deliverance, occult involvement, false religions, and spiritual issues.
- The clinical appropriateness of listing diagnoses, addiction, self-harm, suicidal thoughts, medical history, medications, and vaccines in a ministry intake.
- Trauma-informed wording for sexual background, same-sex/opposite-sex prompts, pornography exposure, rape/molestation, sexual abuse of others, and childhood/family conflict.
- Whether `homosexuality`, `gender confusion`, `cross dressing`, `Catholicism`, `white supremacy`, `mental illness`, `victim mentality`, and similar classifications should be retained, reworded, moved to staff-only review, or removed.
- Whether hold-harmless language is legally appropriate.
- Retention/deletion policy and whether participants can request deletion or correction.
- Which family-tree fields should be participant-entered versus staff-entered.
- Minimum safe handoff data after Mission of Reconciliation review.
