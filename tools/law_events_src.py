#!/usr/bin/env python3
"""International Law for Political Repression Timeline: one chronology merging Factual Summary Part 1 (jurisdiction),
Part 12 (international criminal law precedents) and the routes of universal jurisdiction and the Convention against Torture.
Each entry carries its references: fs = Factual Summary paragraphs, ex = exhibits, url = external source.
Categories: instrument (treaties & legislation), precedent (judgments & decisions), icc (ICC proceedings),
national (national courts & universal jurisdiction), mechanism (UN mechanisms & international responses),
nexus (facts connecting Hong Kong to a forum)."""
import json, os

E = []
def ev(d, t, x, c, fs=(), ex=(), url=None, essay=False):
    E.append({'d': d, 't': t, 'x': x, 'c': c if isinstance(c, list) else [c], 'fs': list(fs), 'ex': list(ex), 'url': url})

ev('1947-12', 'The Judges’ Trial: a legal system as machinery of persecution',
   'In United States of America v. Josef Altstötter et al., sixteen judges, prosecutors, lawyers and officials of the German Ministry of Justice are tried, and ten convicted, for using the judicial system to persecute civilians, including German dissidents. The formal appearance of legality does not insulate those who operate a legal system deliberately used as machinery for persecution.',
   'precedent', fs=[508, 509, 510, 511, 512, 513, 514, 535], url='https://nuremberg.law.harvard.edu/transcripts/3-transcript-for-nmt-3-justice-case')
ev('1984-12-10', 'Convention against Torture adopted',
   'The UN Convention against Torture (in force 26 June 1987) defines torture to include severe pain or suffering inflicted to punish, intimidate or coerce, or for any reason based on discrimination, “by or at the instigation of or with the consent or acquiescence of a public official”. Articles 5(2) and 7 require each State party either to prosecute or to extradite a suspected torturer found in its territory.',
   'instrument', url='https://www.ohchr.org/en/instruments-mechanisms/instruments/convention-against-torture-and-other-cruel-inhuman-or-degrading')
ev('1984-12-19', 'Sino-British Joint Declaration',
   'The United Kingdom and the People’s Republic of China agree that Hong Kong’s capitalist system and way of life will remain unchanged for 50 years after 1 July 1997 and that the HKSAR will enjoy a high degree of autonomy — the international benchmark against which later conduct is measured.',
   'instrument', fs=[72], ex=['B1'])
ev('1986-06-05', 'British National (Overseas) status created',
   'The Hong Kong (British Nationality) Order 1986 establishes BN(O) status for persons connected with Hong Kong before the handover. Holders are British nationals; where an accused is a national of a State Party, the ICC may exercise jurisdiction under Article 12(2)(b) wherever the conduct occurred.',
   ['instrument', 'nexus'], fs=[20, 24, 25], ex=['A1'], url='https://www.legislation.gov.uk/uksi/1986/948/made')
ev('1990-07-26', 'British Nationality (Hong Kong) Act 1990',
   'Full British citizenship is granted to a selected group of Hong Kong residents; certain persons identified in the record may hold British citizenship on this or other bases, or the nationality of another State Party such as Portugal.',
   ['instrument', 'nexus'], fs=[22, 23], ex=['A4'])
ev('1992-03-12', 'Torture Victim Protection Act of 1991 (United States) signed into law',
   'The Act permits victims of torture committed under colour of the law of any foreign nation to sue for civil damages in United States courts — a route to restitution that follows findings in international criminal law.',
   'instrument')
ev('1993-05-25', 'ICTY Statute recognises imprisonment as a crime against humanity',
   'Article 5(e) of the Statute of the International Criminal Tribunal for the former Yugoslavia expressly lists imprisonment among the crimes against humanity.',
   'precedent', fs=[488])
ev('1997-07-01', 'Registration for BN(O) status closes; an estimated 2.9 million hold it',
   'Persons connected with Hong Kong who qualified could acquire BN(O) status by registration before 1 July 1997. Where the public record establishes only a reasonable possibility that an official holds State-Party nationality, the record identifies nationality as a matter for verification by the Prosecutor.',
   'nexus', fs=[21, 23, 26, 27], ex=['A1'], url='https://www.legislation.gov.uk/ukia/2020/70/pdfs/ukia_20200070_en.pdf')
ev('1998-07-17', 'Rome Statute adopted',
   'The Statute (in force 1 July 2002) defines crimes against humanity in Article 7 — including imprisonment (7(1)(e)), torture (7(1)(f)), sexual violence (7(1)(g)), persecution (7(1)(h)) and other inhumane acts (7(1)(k)) — and in Article 12(2) founds jurisdiction on the territory of a State Party or the nationality of the accused. The United Kingdom and Portugal are States Parties.',
   'instrument', fs=[19, 28, 37, 38])
ev('2001-05-11', 'International Criminal Court Act 2001 (UK): a BN(O) holder is a “United Kingdom national”',
   'Section 67(1) includes a British National (Overseas), with a British citizen and other categories, in the definition of “United Kingdom national” for Part 5 of the Act, under which crimes against humanity committed anywhere in the world by a UK national may be prosecuted in England and Wales.',
   ['instrument', 'nexus'], fs=[20, 24], ex=['A2'], url='https://www.legislation.gov.uk/ukpga/2001/17/section/67')
ev('2002-03-15', 'Prosecutor v. Krnojelac: arbitrary imprisonment is itself a crime against humanity',
   'Examining the organised detention of civilians in a prison facility, the ICTY Trial Chamber treats arbitrary imprisonment and persecution as distinct forms of criminal conduct capable of constituting crimes against humanity, independently of killing or extermination.',
   'precedent', fs=[489, 490, 491, 492, 532])
ev('2002-09-09', 'Elements of Crimes: “the acts need not constitute a military attack”',
   'The Elements of Crimes adopted by the Assembly of States Parties confirm that an “attack directed against a civilian population” need not be a military attack: crimes against humanity may be committed by a government against its own civilian population, on political grounds, and murder is not a necessary element.',
   'instrument', fs=[42, 43, 44], url='https://www.icc-cpi.int/sites/default/files/Publications/Elements-of-Crimes.pdf')
ev('2005-09-16', 'Responsibility to Protect endorsed by the UN General Assembly',
   'At the 2005 World Summit, States accept the responsibility to protect their populations from genocide, war crimes, ethnic cleansing and crimes against humanity, and declare themselves prepared to take collective action through the Security Council where national authorities manifestly fail to do so.',
   'mechanism', url='https://www.un.org/en/genocide-prevention/responsibility-protect/about')
ev('2009-12', 'Argentina: arrest ordered for Jiang Zemin over the persecution of Falun Gong',
   'Exercising universal jurisdiction over crimes against humanity, an Argentine judge orders the arrest of the former Chinese president in connection with the alleged persecution of Falun Gong practitioners.',
   'national', url='https://www.reuters.com/article/world/argentine-judge-asks-china-arrests-over-falun-gong-idUSTRE5BM02B/')
ev('2011-03', 'Libya: intervention citing the Responsibility to Protect',
   'NATO begins military intervention in Libya after Muammar Gaddafi is alleged to have committed crimes against humanity against demonstrators opposing the regime; the ICC issues an arrest warrant for Gaddafi in June 2011.',
   'mechanism', url='https://www.icc-cpi.int/sites/default/files/CourtRecords/CR2011_08351.PDF')
ev('2021-05-18', 'UN General Assembly resolution 75/277: the Responsibility to Protect becomes a standing agenda item',
   'By 115 votes to 15, with 28 abstentions, the General Assembly adopts its first resolution on the Responsibility to Protect since 2009, placing “the responsibility to protect and the prevention of genocide, war crimes, ethnic cleansing and crimes against humanity” on its annual agenda and requesting a yearly report from the Secretary-General.',
   'mechanism', url='https://docs.un.org/en/a/res/75/277')
ev('2012-08-28', 'Yousuf v. Samantar: US$21 million awarded against a former Somali leader for torture',
   'Under the Torture Victim Protection Act and the Alien Tort Statute, a United States federal court awards US$21 million in damages against Mohamed Ali Samantar, former First Vice President, Defence Minister and Prime Minister of Somalia, for torture and other human-rights abuses.',
   'national', url='https://cja.org/what-we-do/litigation/yousuf-v-samantar/uscourt-ats-tvpa/')
ev('2014-02', 'Spain: arrest ordered for Jiang Zemin over alleged genocide in Tibet',
   'A judge of Spain’s National Court orders the arrest of the former Chinese president and other former officials in connection with the alleged genocide against the Tibetan people.',
   'national', url='https://www.cnn.com/2014/02/10/world/europe/spain-chinese-officials-arrest-warrants')
ev('2014-05-22', 'China and Russia veto the referral of Syria to the ICC',
   'A Security Council draft resolution referring the situation in Syria to the International Criminal Court is blocked by the vetoes of China and Russia.',
   'mechanism', url='https://news.un.org/en/story/2014/05/468962')
ev('2014-12-16', 'UN Human Rights Committee, General Comment No. 35 on liberty and security of person',
   'The authoritative interpretation of Article 9 of the ICCPR: national security cannot serve as a general justification for detention without individualised assessment, and detention must be subject to prompt judicial oversight.',
   'instrument', fs=[193], ex=['B3'])
ev('2015-12-17', 'Nelson Mandela Rules: prolonged solitary confinement prohibited',
   'The revised UN Standard Minimum Rules for the Treatment of Prisoners define solitary confinement as 22 hours or more a day without meaningful human contact, define “prolonged” as more than 15 consecutive days, and prohibit indefinite and prolonged solitary confinement, which may amount to torture or ill-treatment.',
   'instrument', fs=[431, 432, 433, 434], ex=['B6', 'B7', 'B8'])
ev('2016-09-27', 'Al Mahdi: international crimes are not confined to bodily harm',
   'The ICC convicts Ahmad Al Faqi Al Mahdi of the war crime of attacking historic and religious buildings in Timbuktu — a conviction that depends on no death or injury, illustrating that the Statute protects fundamental interests beyond life and limb.',
   'precedent', fs=[527, 528, 529])
ev('2016-12-21', 'Liechtenstein secures the creation of the IIIM for Syria',
   'After the Security Council referral was vetoed, Liechtenstein — a State of some 40,000 people — drafts the General Assembly resolution creating the International, Impartial and Independent Mechanism to assist in the investigation and prosecution of the most serious crimes committed in Syria since March 2011.',
   'mechanism', url='https://www.llv.li/serviceportal2/diplomatische-vertretungen/new-york/uno/voelkerrecht-und-rechtsstaatlichkeit/2023-04-25-iiim-ga-debate.pdf')
ev('2018-02-08', 'Philippines: the Prosecutor opens a preliminary examination proprio motu',
   'Following a communication initiated by a human-rights lawyer, the Office of the Prosecutor examines the “war on drugs”, in which State police and law-enforcement structures are alleged to have been the operational mechanism of a widespread or systematic attack; the investigation is later authorised by the Pre-Trial Chamber. Domestic characterisation of conduct as policing does not remove it from Article 7.',
   ['precedent', 'icc'], fs=[521, 522, 523, 524, 525, 526, 536], url='https://www.icc-cpi.int/philippines')
ev('2018-09-06', 'Bangladesh/Myanmar: jurisdiction where one element of the crime occurs in a State Party',
   'Pre-Trial Chamber I holds that the Court may exercise territorial jurisdiction over the deportation of the Rohingya from Myanmar, a non-State Party, because an element of the crime — the victims’ entry — occurred in Bangladesh, a State Party. Article 12(2)(a) does not require every element to occur in a State Party.',
   ['precedent', 'icc'], fs=[30, 31, 469, 470, 471, 472, 473, 474, 475, 476, 531])
ev('2020-08', 'Crowdfunded private prosecutions sought in the United Kingdom',
   'UK-based activists Luke de Pulford and Nathan Law announce a crowdfunded private prosecution in England against senior British officers of the Hong Kong Police Force for torture and other abuse allegedly suffered by protesters in police custody — offences for which British nationals remain liable in the United Kingdom wherever they occur.',
   'national', url='https://hongkongfp.com/2020/08/10/activists-in-uk-seek-private-prosecution-of-british-expatriate-cops-over-hong-kong-protest-torture/')
ev('2023-06', 'HKETO London pays for surveillance operations in the United Kingdom',
   'Between 5 June 2023 and 31 January 2024 the London bank account of the Hong Kong Economic and Trade Office pays £95,500 to the security company of Chi Leung (Peter) Wai, with a further £16,170 after an operation in January 2024 — payments connected with conduct physically carried out on the territory of a State Party.',
   'nexus', fs=[14, 32, 406, 407, 408], ex=['F28', 'F37'])
ev('2023-07-03', 'Bounties on persons resident in the United Kingdom',
   'Three of the eight persons made the subject of arrest warrants and HK$1,000,000 rewards are resident in the United Kingdom; the scheme invites information “in Hong Kong or overseas”, creating a direct incentive to locate and report on political opponents within States Parties.',
   'nexus', fs=[11, 13, 35, 367, 369, 376], ex=['F1'])
ev('2024-01-31', 'UN Special Rapporteur on torture: evidence in the Lai trial allegedly obtained through torture',
   'The Special Rapporteur publicly addresses allegations that evidence from a key prosecution witness in the Jimmy Lai proceedings was obtained through torture, raises the matter with the authorities and expresses concern at the apparent absence of an effective investigation.',
   'mechanism', fs=[438, 439, 440, 441, 442], ex=['B5'])
ev('2024-05-13', 'United Kingdom charges three men over a Hong Kong intelligence operation',
   'Chung Biu (Bill) Yuen, Chi Leung (Peter) Wai and Matthew Trickett are charged with assisting a Hong Kong intelligence service and foreign-interference activity against persons in the United Kingdom — surveillance, tasking, acquisition and transmission of personal information and misuse of UK government systems.',
   ['nexus', 'national'], fs=[32, 405, 406, 409, 410, 411, 412], ex=['F28'])
ev('2024-06-26', 'Al Hassan: persecution through an institutional system of rules, policing and punishment',
   'The ICC convicts Al Hassan Ag Abdoul Aziz of crimes against humanity including torture, persecution and other inhumane acts for the system imposed on Timbuktu — an Islamic police force and tribunal, ideologically imposed rules, detention and discriminatory punishment. A population may be persecuted through institutions that identify, deprive and punish.',
   'precedent', fs=[493, 494, 495, 496, 497, 498, 499, 533])
ev('2024-09-26', 'UN Working Group: Jimmy Lai’s detention arbitrary; more than three and a half years in solitary confinement',
   'The Working Group on Arbitrary Detention finds Lai’s detention arbitrary and records conditions of confinement far exceeding the 15-day threshold of prolonged solitary confinement.',
   'mechanism', fs=[312, 436, 437], ex=['B5'], url='https://www.ohchr.org/sites/default/files/documents/issues/detention-wg/opinions/session100/a-hrc-wgad-2024-34-china-hong-kong-advance.pdf')
ev('2024-09-30', 'Lithuania refers the Belarus situation to the ICC',
   'Lithuania alleges crimes against humanity — deportation, persecution and other inhumane acts — against actual or perceived opponents of the Belarusian Government, where the policy originated in Belarus, a non-State Party, but part of the elements of the crimes occurred on Lithuanian territory. A State Party may refer a situation under Article 14 of the Statute; the Prosecutor may also open an examination proprio motu under Article 15.',
   ['precedent', 'icc'], fs=[477, 478, 479, 480], url='https://www.icc-cpi.int/lithuania-belarus')
ev('2025-07-08', 'Afghanistan: arrest warrants for the Taliban Supreme Leader and Chief Justice',
   'The ICC issues warrants for Haibatullah Akhundzada and Abdul Hakim Haqqani for the crime against humanity of persecution on gender grounds and on political grounds against perceived “allies of girls and women” — persecution founded on systematic deprivation of fundamental rights through law, policy and administration, without a charge of murder.',
   ['precedent', 'icc'], fs=[515, 516, 517, 518, 519, 520, 533], url='https://www.icc-cpi.int/news/situation-afghanistan-icc-pre-trial-chamber-ii-issues-arrest-warrants-haibatullah-akhundzada')
ev('2026-03-12', 'Lithuania/Belarus: the Prosecutor opens an investigation',
   'Concluding the preliminary examination, the Office finds a reasonable basis to believe that coercive acts resulting in deportation formed part of a course of conduct against political opponents pursuant to a State policy encouraged at the highest levels of the Belarusian Government. The investigation covers transboundary crimes since 1 May 2020 where at least one element occurred in Lithuania.',
   ['precedent', 'icc'], fs=[481, 482, 483, 484, 485, 486, 487, 531], url='https://www.icc-cpi.int/lithuania-belarus')
ev('2026-05-13', 'Yuen and Wai convicted in London: constituent conduct on the territory of a State Party',
   'Following a contested trial at the Central Criminal Court, both men are convicted of assisting a foreign intelligence service; the UK Security Minister identifies that service as the Hong Kong Police Force and describes “a shadow policing operation in the United Kingdom”. Surveillance and intimidation of exiled Hongkongers in the UK are capable of forming constituent conduct of the persecution alleged under Article 7(1)(h); the convictions concern different accused from the officials identified in this record, so complementarity does not bar examination.',
   ['national', 'nexus'], fs=[14, 15, 16, 33, 34, 414, 417, 418], ex=['F31', 'F35', 'F36', 'F37'], url='https://www.cps.gov.uk/cps/news/cps-secures-convictions-hong-kong-unlawful-surveillance-case')
ev('2026-06-12', 'UN Working Group: Owen Chow’s detention arbitrary; prolonged solitary confinement may amount to torture',
   'Opinion No. 26/2026 finds the Hong Kong 47 defendant’s detention arbitrary under Categories I, II, III and V, records that prolonged solitary confinement may amount to torture or cruel, inhuman or degrading treatment, and treats the conduct of the HKSAR Government as attributable to the People’s Republic of China under Article 4(1) of the Articles on State Responsibility.',
   'mechanism', fs=[446, 447, 448, 454, 455], ex=['B10'], url='https://www.ohchr.org/sites/default/files/documents/issues/detention-wg/opinions/session105/a-hrc-wgad-2026-26-aev.pdf')
ev('2026-07-16', 'El Hishri: a prison as the machinery of crimes against humanity',
   'Pre-Trial Chamber I confirms all 17 charges against Khaled El Hishri for imprisonment, torture, sexual violence, murder, enslavement and persecution of thousands of detainees at Mitiga Prison, Tripoli, between 2014 and 2020: where imprisonment operates together with torture and discriminatory treatment within an organised custodial system, the prison itself may be the principal mechanism of the attack.',
   ['precedent', 'icc'], fs=[500, 501, 502, 503, 504, 505, 506, 507, 534])
ev('2026-09-17', 'United States: former Syrian prison official sentenced to 60 years for torture',
   'Samir Ousman Alsheikh, formerly in charge of Damascus Central Prison, is sentenced in a federal court in California to 60 years’ imprisonment for torture and immigration fraud — torture committed abroad prosecuted in a national court under the Convention against Torture framework.',
   'national', url='https://www.justice.gov/opa/pr/former-syrian-prison-official-sentenced-torture-and-immigration-fraud')

if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here) if os.path.basename(here) == 'tools' else here
    out = os.path.join(root, 'data', 'law_events.json')
    E.sort(key=lambda e: e['d'])
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(E, f, ensure_ascii=False, separators=(',', ':'))
    print(len(E), 'law events ->', out)
