/**
 * src/lib/undervisningDefaults.ts
 * Standarddata og metadata for dei 9 blokk-typane i Undervisningsbyggaren.
 */

import { 
  BlockType, 
  TeachingBlock, 
  BlockTypeMeta,
  StikkordData,
  StikkordPoint,
  TekstData,
  UndervisningData,
  BibelordData,
  InformasjonData,
  BonnDiktData,
  LekData,
  KonkurranseData,
  SamtaleData,
  QuizData,
  QuizQuestion,
  SangSalmeData,
  HenteleikData,
  HenteleikItem,
  KimsLeikData,
  ReisDegData,
  ReisDegItem,
  BileteAvdekkingData,
  BildeData,
  BileteData,
  LysbileteshowData,
  BildeBibelenData,
  VideoData,
  BeatForBeatData,
  OrdForOrdData,
  KvenSkalUtData,
  SvartSkjermData
} from '../types';

export const BLOCK_METADATA: Record<BlockType, BlockTypeMeta> = {
  stikkord: {
    type: 'stikkord',
    label: 'Stikkord',
    shortDesc: 'Kulepunkt (1–8) med trinnvis vising',
    purpose: 'Strukturert munnleg formidling der korte nøkkelsetningar vert avdekka trinnvis på skjermen.',
    screenDisplay: 'Tittel og nummererte kulepunkt som dukkar opp eitt og eitt etter kvart som leiaren klikkar framover.',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'ListOrdered',
    defaultMinutes: 3,
  },
  tekst: {
    type: 'tekst',
    label: 'Tekst',
    shortDesc: 'Bodskap, sitat eller forteljing',
    purpose: 'Kort sitat, hovudbodskap eller forteljingsanker på skjermen (1–3 setningar). Skal IKKJE brukast til samtalespørsmål.',
    screenDisplay: 'Éin tydeleg tekstplakat med ekstra stor, lesbar font tilpassa heile salen.',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'FileText',
    defaultMinutes: 3,
  },
  undervisning: {
    type: 'undervisning',
    label: 'Undervisning',
    shortDesc: 'Bodskap, sitat og kulepunkt',
    purpose: 'Samanhengande undervisningsbolk med hovudbodskap eller trinnvise poeng og tilhøyrande leiarmanus.',
    screenDisplay: 'Hovudtittel og sentral bodskap eller nummererte punkt på storskjermen.',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'GraduationCap',
    defaultMinutes: 4,
  },
  bibelord: {
    type: 'bibelord',
    label: 'Bibelord',
    shortDesc: 'Tekst og nøkkelvers',
    purpose: 'Felles lesing eller formidling av eit sentralt bibelvers eller tekstutdrag.',
    screenDisplay: 'Bibelsitatet i stor, høgtideleg skrift med tydeleg bok-, kapittel- og verstittel.',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'BookMarked',
    defaultMinutes: 2,
  },
  informasjon: {
    type: 'informasjon',
    label: 'Informasjon',
    shortDesc: 'Tider, kiosk og praktiske punkt',
    purpose: 'Ryddig gjennomgang av praktiske opplysningar, klokkeslett, oppmøtestad eller avtalar.',
    screenDisplay: 'Overskrift med 2–3 tydelege kulepunkt og ei framheva hugs-ramme.',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'Info',
    defaultMinutes: 2,
  },
  bonn_dikt: {
    type: 'bonn_dikt',
    label: 'Bøn',
    shortDesc: 'Sentrert tekst og veksellesing',
    purpose: 'Rolig avrunding, felles bøn, velsigning eller liturgisk veksellesing.',
    screenDisplay: 'Midtstilt bønnetekst med roleg typografi (og eventuelt markert svarlinje for «Alle»).',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'HeartHandshake',
    defaultMinutes: 2,
  },
  lek: {
    type: 'lek',
    label: 'Leik',
    shortDesc: 'Energinivå, utstyr og reglar',
    purpose: 'Fysisk fellesaktivitet eller leik i rommet med synleg nedteljingsklokke.',
    screenDisplay: 'Namn på leiken og stor nedteljingstimer midt på skjermen.',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'Zap',
    defaultMinutes: 6,
  },
  konkurranse: {
    type: 'konkurranse',
    label: 'Konkurranse',
    shortDesc: 'Lag, duell og poengreglar',
    purpose: 'Rask lagkonkurranse eller utfordring med spørsmål og fasit på skjermen.',
    screenDisplay: 'Oppgåvetekst og fasit som vert avdekka når leiaren klikkar.',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'Trophy',
    defaultMinutes: 8,
  },
  samtale: {
    type: 'samtale',
    label: 'Samtale',
    shortDesc: 'Organisering og spørsmål',
    purpose: 'Refleksjon to-og-to eller i smågrupper der deltakarane drøftar konkrete spørsmål.',
    screenDisplay: '2–3 nummererte, opne spørsmål med stor og luftig skrift som ligg synleg på skjermen under heile praten.',
    rules: [
      'Del inn deltakarane to-og-to med sidemannen eller i smågrupper på 3–4.',
      'Les spørsmåla høgt frå storskjermen og forklar kort kva dei skal snakke om.',
      'La spørsmåla stå oppe på storskjermen medan gruppene pratar i 3–5 minutt.',
      'Avslutt med ei kort, frivillig oppsummering i plenum.',
    ],
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'MessagesSquare',
    defaultMinutes: 6,
  },
  quiz: {
    type: 'quiz',
    label: 'Quiz',
    shortDesc: 'Spørsmål og svaralternativ',
    purpose: 'Engasjerande kunnskapssjekk eller introduksjon til temaet med 4 svaralternativ.',
    screenDisplay: 'Spørsmål og fire store svarboksar (A, B, C, D) der rett svar lyser grønt ved fasit.',
    rules: [
      'Les spørsmålet og dei fire svaralternativa (A, B, C, D) høgt frå storskjermen.',
      'La deltakarane røyste ved håndsopprekking, stå opp på rett bokstav, eller skrive svaret lagvis.',
      'Klikk «Vis fasit» slik at rett svarboks lyser opp i smaragdgrønt på storskjermen.',
      'Bruk gjerne den korte forklaringa i leiarvisinga før du går til neste spørsmål.',
    ],
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'HelpCircle',
    defaultMinutes: 4,
  },
  sang_salme: {
    type: 'sang_salme',
    label: 'Song / Salme',
    shortDesc: 'Salmenummer og versvising',
    purpose: 'Fellessong, salme eller musikkinnslag med tekst på skjermen.',
    screenDisplay: 'Songtittel, salmenummer og eitt vers om gongen i stor, midtstilt tekst.',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'Music',
    defaultMinutes: 3,
  },

  // AKTIVITETSBANKEN
  henteleik: {
    type: 'henteleik',
    label: 'Henteleiken',
    shortDesc: 'Samle gjenstandar éin etter éin',
    purpose: 'Fysisk lagleik med høgt tempo som skapar engasjement og knyter konkrete ting til temaet.',
    screenDisplay: 'Viser éin gjenstand om gongen i gigantisk skrift etter kvart som leiaren klikkar fram neste runde.',
    rules: [
      'Del gruppa inn i lag på 4–6 personar og gje kvart lag ein fast base i rommet.',
      'Forklar at når eit ord dukkar opp på storskjermen, gjeld det det å finne gjenstanden i rommet (eller på seg sjølv) og bringe han fram til leiaren.',
      'Klikk fram éin gjenstand om gongen på storskjermen.',
      'Første lag som leverer godkjend gjenstand til leiaren får 1 poeng før neste runde startar.',
    ],
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'PackageCheck',
    defaultMinutes: 3,
  },
  kims_leik: {
    type: 'kims_leik',
    label: 'Kims leik',
    shortDesc: 'Hugs flest mogleg ting før dei forsvinn',
    purpose: 'Klassisk konsentrasjons- og hugseleik som samlar blikka mot skjermen.',
    screenDisplay: 'Rutenett med 16 ikon/gjenstandar og 30 sekunds nedteljing, etterfølgt av lukka skjerm og fasitvising.',
    rules: [
      'Gje laga eller para penn og papir (eller be dei samarbeide stille).',
      'Start 30-sekundstimeren på storskjermen medan alle 16 gjenstandane er synlege – det er ikkje lov å skrive før tida er ute.',
      'Når tida renn ut og skjermen skjulast, skriv laga ned så mange gjenstandar dei hugsar.',
      'Klikk «Vis fasit» på storskjermen og tel opp 1 poeng per riktig gjenstand.',
    ],
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'Brain',
    defaultMinutes: 3,
  },
  reis_deg: {
    type: 'reis_deg',
    label: 'Reis deg',
    shortDesc: 'Felles aktivitet med påstandar',
    purpose: 'Lavterskel isbrytar og fysisk oppvarming som får alle i salen med frå første sekund.',
    screenDisplay: 'Overskrifta «Reis deg» øvst og éin stor påstand midt på skjermen med framdriftsindikator.',
    rules: [
      'Alle sit klare på stolane sine ved start.',
      'Leiaren klikkar fram éin påstand om gongen på storskjermen (t.d. «Reis deg dersom du ...»).',
      'Alle som kjenner seg igjen i påstanden, reiser seg raskt opp og ser seg rundt i rommet.',
      'Deltakarane set seg ned igjen før leiaren klikkar fram neste påstand.',
    ],
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'ArrowUpDown',
    defaultMinutes: 3,
  },

  // MEDIEVISING & FORMIDLING
  bilete: {
    type: 'bilete',
    label: 'Bilete',
    shortDesc: '1, 2 eller 4 faste bilete med bildetekst',
    purpose: 'Visuell støtte, stemningsbilete eller konkret illustrasjon medan leiaren fortel.',
    screenDisplay: '1, 2 eller 4 bilete i fullskjerm eller rutenett med valfri bildetekst.',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'Image',
    defaultMinutes: 3,
  },
  lysbileteshow: {
    type: 'lysbileteshow',
    label: 'Lysbileteshow',
    shortDesc: 'Rullande biletserie med pause og intervall',
    purpose: 'Rullande biletserie (t.d. frå leir, konfirmantåret eller temabilete) med roleg overgang.',
    screenDisplay: 'Automatisk bildekarusell med glidande overgangar i fullskjerm.',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'Film',
    defaultMinutes: 3,
  },
  bildebibelen: {
    type: 'bildebibelen',
    label: 'BildeBibelen',
    shortDesc: 'Kronologisk bibelteikneserie med leiarmanus',
    purpose: 'Levande gjenforteljing av ei bibelforteljing støtta av kronologiske illustrasjonsbilete.',
    screenDisplay: 'Fullskjerms bibelillustrasjonar som følgjer forteljinga scene for scene, medan leiaren har forteljingsmanus på sin skjerm.',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'BookOpen',
    defaultMinutes: 7,
  },
  bilde: {
    type: 'bilde',
    label: 'Bilete',
    shortDesc: '1, 2 eller 4 faste bilete',
    purpose: 'Visuell støtte eller illustrasjonsbilete til undervisninga.',
    screenDisplay: '1, 2 eller 4 bilete i fullskjerm med valfri bildetekst.',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'Image',
    defaultMinutes: 3,
  },
  video: {
    type: 'video',
    label: 'Video',
    shortDesc: 'Videoklipp og illustrasjonar',
    purpose: 'Avspeling av filmklipp, kortfilm eller musikkvideo som innleiing eller utdjuping.',
    screenDisplay: 'Videospelar i fullskjerm.',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'Video',
    defaultMinutes: 5,
  },
  svart_skjerm: {
    type: 'svart_skjerm',
    label: 'Svart skjerm',
    shortDesc: 'Mørk storskjerm / fokus på formidlar',
    purpose: 'Slår av visuelt innhald på storskjermen slik at all merksemd i rommet rettast mot formidlaren.',
    screenDisplay: 'Heilt mørk/svart skjerm utan forstyrrande element (0 minutt standard).',
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-900 text-white border-slate-700',
    accentBarClass: 'bg-slate-900',
    iconName: 'MonitorOff',
    defaultMinutes: 0,
  },

  // FELLES / KONKURRANSEBANKEN
  bilete_avdekking: {
    type: 'bilete_avdekking',
    label: 'Bilete-avdekking',
    shortDesc: 'Kaos-puslespill (30 sekunder)',
    purpose: 'Visuell gjetteleik som skapar nysgjerrigheit og kan leie rett inn i kveldens symbol eller tema.',
    screenDisplay: 'Eit bilete dekt av 100 brikker som gradvis forsvinn over 30 sekund til motivet kjem fram.',
    rules: [
      'Fortel deltakarane at eit skjult motiv snart kjem til syne brikke for brikke.',
      'Start avdekkinga frå leiarvisinga – brikkene forsvinn i tilfeldig rekkjefølgje.',
      'Deltakarane ropar ut eller rekkjer opp handa så snart dei ser kva biletet førestiller.',
      'Trykk «Pause» når nokon vil gjette, og «Vis fasit» når rett svar er funne!',
    ],
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'LayoutGrid',
    defaultMinutes: 2,
  },
  beat_for_beat: {
    type: 'beat_for_beat',
    label: 'Beat for beat',
    shortDesc: 'Avdekk ord for ord',
    purpose: 'Musikalsk eller tekstleg gjettekonkurranse der lag skal kjenne igjen ei kjent strofe eller salme.',
    screenDisplay: 'Nummererte luker som opnast ord for ord etter kvart som leiaren klikkar.',
    rules: [
      'Forklar at lukene på skjermen skjuler ei kjent songlinje eller strofe.',
      'Leiaren opnar eitt og eitt ord (i rekkjefølgje eller tilfeldig).',
      'Første lag som kjenner igjen songen og kan synge eller seie heile linja, får poeng.',
      'Avdekk resten av lukene for å vise fasiten for heile salen.',
    ],
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'Music2',
    defaultMinutes: 4,
  },
  ord_for_ord: {
    type: 'ord_for_ord',
    label: 'Ord for ord',
    shortDesc: 'Sitat og bibelvers avdekka ord for ord',
    purpose: 'Gjettekonkurranse der deltakarane skal finne fram til eit sentralt bibelvers eller sitat.',
    screenDisplay: '5–10 luker på skjermen som avdekkast eitt ord om gongen, med bibelreferanse ved fasit.',
    rules: [
      'Vis dei lukka ord-boksane på storskjermen og gje eventuelt eit lite hint om temaet.',
      'Klikk fram eitt ord om gongen frå leiarvisinga.',
      'La laga gjette undervegs kva bibelvers eller sitat som skjuler seg bak lukene.',
      'Når nokon klarar det, klikk «Vis alle ord» og les heile verset høgt i lag.',
    ],
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'BookMarked',
    defaultMinutes: 4,
  },
  kven_skal_ut: {
    type: 'kven_skal_ut',
    label: 'Kven skal ut?',
    shortDesc: 'Fire val – éin skil seg ut',
    purpose: 'Hjernetrim og samtaleopnar der ungdommane må finne samanhengar og begrunne kva ord som ikkje passar inn.',
    screenDisplay: '2x2-rutenett med 4 alternativ (A–D) der tre høyrer saman og éin skil seg ut, pluss grøn fasit.',
    rules: [
      'Vis dei fire orda (A, B, C, D) på storskjermen.',
      'Spør salen: «Tre av desse høyrer saman – kven skal ut, og kvifor?»',
      'La deltakarane foreslå både kva ord som skal ut og kva dei tre andre har til felles.',
      'Klikk «Vis fasit» for å markere svaret og den korte forklaringa på skjermen.',
    ],
    colorName: 'Nøytral skifer',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bgLightClass: 'bg-white border-slate-200 text-slate-800',
    bgDarkClass: 'bg-white border-slate-200 text-slate-800',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    accentBarClass: 'bg-slate-400',
    iconName: 'HelpCircle',
    defaultMinutes: 3,
  },
};

export function normalizeBlockType(raw: string): BlockType {
  const t = (raw || '').toLowerCase().trim();
  if (!t) return 'stikkord';

  // 1. bilete_avdekking: avdekk, bileteavdekking, bilete-avdekking, bildeavdekking, bilde-avdekking, puslespill, kaos, kaos-puslespill
  if (
    t.includes('avdekk') ||
    t.includes('puslespill') ||
    t.includes('kaos') ||
    t.includes('bildeavdekking') ||
    t.includes('bileteavdekking') ||
    t === 'bilete_avdekking' ||
    t === 'bilde_avdekking'
  ) {
    return 'bilete_avdekking';
  }

  // 2. kims_leik: kims, kims_leik, kimsleik, kimslek, hukommelse, huskeleik, huskeleker
  if (t.includes('kims') || t.includes('hukommelse') || t.includes('huskeleik') || t === 'kims_leik') {
    return 'kims_leik';
  }

  // 3. reis_deg: reis_deg, reisdeg, reis, standup, stand_up, paastand, påstand
  if (t.includes('reis') || t.includes('standup') || t.includes('stand_up') || t.includes('paastand') || t.includes('påstand') || t === 'reis_deg') {
    return 'reis_deg';
  }

  // 4. beat_for_beat: beat_for_beat, beatforbeat, beat, songtekst, sangtekst
  if (t.includes('beat') || t === 'beat_for_beat') {
    return 'beat_for_beat';
  }

  // 5. ord_for_ord: ord_for_ord, ordforord
  if (t.includes('ord_for_ord') || t.includes('ordforord') || (t.includes('ord') && t.includes('avdekk'))) {
    return 'ord_for_ord';
  }

  // 6. kven_skal_ut: kven_skal_ut, kvenskalut, hvem_skal_ut, hvemskalut, skal_ut, odd_one_out
  if (t.includes('kven') || t.includes('hvem') || t.includes('skal_ut') || t.includes('skalut') || t === 'kven_skal_ut') {
    return 'kven_skal_ut';
  }

  // 7. henteleik: hente, henteløp, henteleik, hentelek
  if (t.includes('hente') || t === 'henteleik') {
    return 'henteleik';
  }

  // 8. song_salme: song, salme, sang, musikk, lovsang, sang_salme
  if (t.includes('song') || t.includes('sang') || t.includes('salme') || t.includes('lovsang') || t === 'sang_salme') {
    return 'sang_salme';
  }

  // 9. bonn_dikt: bøn, bønn, dikt, bonn, bonn_dikt, veksellesing
  if (t.includes('bøn') || t.includes('bønn') || t.includes('dikt') || t.includes('bonn') || t === 'bonn_dikt') {
    return 'bonn_dikt';
  }

  // 10. bildebibelen: bildebibel, bildebibelen, freebible, freebibleimages
  if (t.includes('bildebibel') || t.includes('freebible') || t === 'bildebibelen') {
    return 'bildebibelen';
  }

  // 11. lysbileteshow: slideshow, lysbilete, lysbilde, lysbildeshow, lysbileteshow
  if (t.includes('slideshow') || t.includes('lysbilete') || t.includes('lysbilde') || t === 'lysbileteshow') {
    return 'lysbileteshow';
  }

  // 12. bilete / bilde: bilete, bilde, foto, fotografi, illustrasjon
  if (t.includes('bilde') || t.includes('bilete') || t.includes('foto') || t === 'bilete') {
    return 'bilete';
  }

  // 13. bibelord: bibel, bibeltekst, bibelvers, bibelsitat, scripture, bibelord
  if (t.includes('bibel') || t.includes('skriftord') || t === 'bibelord') {
    return 'bibelord';
  }

  // 14. samtale: samtale, drøfting, diskusjon, refleksjon, gruppesamtale
  if (t.includes('samtale') || t.includes('drøfting') || t.includes('diskusjon') || t === 'samtale') {
    return 'samtale';
  }

  // 15. svart_skjerm: svart, mørk, pause, blackout, pause_skjerm, svart_skjerm
  if (t.includes('svart') || t.includes('pause') || t.includes('blackout') || t.includes('mørk') || t === 'svart_skjerm') {
    return 'svart_skjerm';
  }

  // 16. informasjon: info, informasjon, praktisk, tider, beskjed
  if (t.includes('info') || t === 'informasjon') {
    return 'informasjon';
  }

  // 17. video: video, film, videoklipp
  if (t.includes('video') || t.includes('film') || t === 'video') {
    return 'video';
  }

  // 18. quiz: quiz, spørrekonkurranse, rebus
  if (t.includes('quiz') || t.includes('rebus') || t === 'quiz') {
    return 'quiz';
  }

  // 19. lek / konkurranse
  if (t === 'lek') return 'lek';
  if (t === 'konkurranse') return 'konkurranse';

  // 20. tekst / undervisning / stikkord
  if (t.includes('tekst') || t === 'forteljing' || t === 'sitat') return 'tekst';
  if (t.includes('undervisning') || t.includes('stikkord') || t.includes('poeng')) return 'stikkord';

  return 'stikkord';
}

// 1. Faste byggjeklossar (alfabetisk sortert etter namn)
export const REGULAR_BLOCK_TYPES: BlockType[] = [
  'bibelord',       // Bibelord
  'bildebibelen',   // BildeBibelen
  'bilete',         // Bilete
  'bonn_dikt',      // Bøn
  'informasjon',    // Informasjon
  'lysbileteshow',  // Lysbileteshow
  'samtale',        // Samtale
  'sang_salme',     // Song / Salme
  'stikkord',       // Stikkord
  'svart_skjerm',   // Svart skjerm
  'tekst',          // Tekst
  'video',          // Video
];

// 2. Aktivitetsbanken
export const AKTIVITET_BLOCK_TYPES: BlockType[] = [
  'henteleik',
  'kims_leik',
  'reis_deg',
  'bilete_avdekking',
];

// 3. Konkurransebanken
export const KONKURRANSE_BLOCK_TYPES: BlockType[] = [
  'quiz',
  'beat_for_beat',
  'ord_for_ord',
  'kven_skal_ut',
];

export const ORDERED_BLOCK_TYPES: BlockType[] = [
  ...REGULAR_BLOCK_TYPES,
  ...AKTIVITET_BLOCK_TYPES,
  ...KONKURRANSE_BLOCK_TYPES,
];

const BLOCK_METADATA_NB_OVERRIDES: Partial<
  Record<
    BlockType,
    {
      label: string;
      shortDesc: string;
      purpose: string;
      screenDisplay: string;
      rules?: string[];
    }
  >
> = {
  stikkord: {
    label: 'Stikkord',
    shortDesc: 'Kulepunkter (1–8) med trinnvis visning',
    purpose: 'Strukturert muntlig formidling der korte nøkkelsetninger avdekkes trinnvis på skjermen.',
    screenDisplay: 'Tittel og nummererte kulepunkter som dukker opp ett og ett etter hvert som lederen klikker fremover.',
  },
  tekst: {
    label: 'Tekst',
    shortDesc: 'Budskap, sitat eller fortelling',
    purpose: 'Kort sitat, hovedbudskap eller fortellingsanker på skjermen (1–3 setninger). Skal IKKE brukes til samtalespørsmål.',
    screenDisplay: 'Én tydelig tekstplakat med ekstra stor, lesbar font tilpasset hele salen.',
  },
  undervisning: {
    label: 'Undervisning',
    shortDesc: 'Budskap, sitat og kulepunkter',
    purpose: 'Sammenhengende undervisningsbolk med hovedbudskap eller trinnvise poenger og tilhørende ledermanus.',
    screenDisplay: 'Hovedtittel og sentralt budskap eller nummererte punkter på storskjermen.',
  },
  bibelord: {
    label: 'Bibelord',
    shortDesc: 'Tekst og nøkkelvers',
    purpose: 'Felles lesing eller formidling av et sentralt bibelvers eller tekstutdrag.',
    screenDisplay: 'Bibelsitatet i stor, høytidelig skrift med tydelig bok-, kapittel- og verstittel.',
  },
  informasjon: {
    label: 'Informasjon',
    shortDesc: 'Tider, kiosk og praktiske punkter',
    purpose: 'Ryddig gjennomgang av praktiske opplysninger, klokkeslett, oppmøtested eller avtaler.',
    screenDisplay: 'Overskrift med 2–3 tydelige kulepunkter og en fremhevet husk-ramme.',
  },
  bonn_dikt: {
    label: 'Bønn',
    shortDesc: 'Sentrert tekst og veksellesing',
    purpose: 'Rolig avrunding, felles bønn, velsignelse eller liturgisk veksellesing.',
    screenDisplay: 'Midtstilt bønnetekst med rolig typografi (og eventuelt markert svarlinje for «Alle»).',
  },
  lek: {
    label: 'Lek',
    shortDesc: 'Energinivå, utstyr og regler',
    purpose: 'Fysisk fellesaktivitet eller lek i rommet med synlig nedtellingsklokke.',
    screenDisplay: 'Navn på leken og stor nedtellingstimer midt på skjermen.',
  },
  konkurranse: {
    label: 'Konkurranse',
    shortDesc: 'Lag, duell og poengregler',
    purpose: 'Rask lagkonkurranse eller utfordring med spørsmål og fasit på skjermen.',
    screenDisplay: 'Oppgavetekst og fasit som avdekkes når lederen klikker.',
  },
  samtale: {
    label: 'Samtale',
    shortDesc: 'Organisering og spørsmål',
    purpose: 'Refleksjon to-og-to eller i smågrupper der deltakerne drøfter konkrete spørsmål.',
    screenDisplay: '2–3 nummererte, åpne spørsmål med stor og luftig skrift som ligger synlig på skjermen under hele praten.',
    rules: [
      'Del inn deltakerne to-og-to med sidemannen eller i smågrupper på 3–4.',
      'Les spørsmålene høyt fra storskjermen og forklar kort hva de skal snakke om.',
      'La spørsmålene stå oppe på storskjermen mens gruppene prater i 3–5 minutter.',
      'Avslutt med en kort, frivillig oppsummering i plenum.',
    ],
  },
  quiz: {
    label: 'Quiz',
    shortDesc: 'Spørsmål og svaralternativer',
    purpose: 'Engasjerende kunnskapssjekk eller introduksjon til temaet med 4 svaralternativer.',
    screenDisplay: 'Spørsmål og fire store svarbokser (A, B, C, D) der riktig svar lyser grønt ved fasit.',
    rules: [
      'Les spørsmålet og de fire svaralternativene (A, B, C, D) høyt fra storskjermen.',
      'La deltakerne stemme ved håndsopprekning, reise seg på riktig bokstav, eller skrive svaret lagvis.',
      'Klikk «Vis fasit» slik at riktig svarboks lyser opp i smaragdgrønt på storskjermen.',
      'Bruk gjerne den korte forklaringen i ledervisningen før du går til neste spørsmål.',
    ],
  },
  sang_salme: {
    label: 'Sang / Salme',
    shortDesc: 'Salmenummer og versvisning',
    purpose: 'Fellessang, salme eller musikkinnslag med tekst på skjermen.',
    screenDisplay: 'Sangtittel, salmenummer og ett vers om gangen i stor, midtstilt tekst.',
  },
  henteleik: {
    label: 'Henteleken',
    shortDesc: 'Samle gjenstander én etter én',
    purpose: 'Fysisk laglek med høyt tempo som skaper engasjement og knytter konkrete ting til temaet.',
    screenDisplay: 'Viser én gjenstand om gangen i gigantisk skrift etter hvert som lederen klikker frem neste runde.',
    rules: [
      'Del gruppen inn i lag på 4–6 personer og gi hvert lag en fast base i rommet.',
      'Forklar at når et ord dukker opp på storskjermen, gjelder det å finne gjenstanden i rommet (eller på seg selv) og bringe den frem til lederen.',
      'Klikk frem én gjenstand om gangen på storskjermen.',
      'Første lag som leverer godkjent gjenstand til lederen får 1 poeng før neste runde starter.',
    ],
  },
  kims_leik: {
    label: 'Kims lek',
    shortDesc: 'Husk flest mulig ting før de forsvinner',
    purpose: 'Klassisk konsentrasjons- og huskelek som samler blikkene mot skjermen.',
    screenDisplay: 'Rutenett med 16 ikoner/gjenstander og 30 sekunders nedtelling, etterfulgt av lukket skjerm og fasitvisning.',
    rules: [
      'Gi lagene eller parene penn og papir (eller be dem samarbeide stille).',
      'Start 30-sekundstimeren på storskjermen mens alle 16 gjenstandene er synlige – det er ikke lov å skrive før tiden er ute.',
      'Når tiden renner ut og skjermen skjules, skriver lagene ned så mange gjenstander de husker.',
      'Klikk «Vis fasit» på storskjermen og tell opp 1 poeng per riktig gjenstand.',
    ],
  },
  reis_deg: {
    label: 'Reis deg',
    shortDesc: 'Felles aktivitet med påstander',
    purpose: 'Lavterskel isbryter og fysisk oppvarming som får alle i salen med fra første sekund.',
    screenDisplay: 'Overskriften «Reis deg» øverst og én stor påstand midt på skjermen med fremdriftsindikator.',
    rules: [
      'Alle sitter klare på stolene sine ved start.',
      'Lederen klikker frem én påstand om gangen på storskjermen (f.eks. «Reis deg hvis du ...»).',
      'Alle som kjenner seg igjen i påstanden, reiser seg raskt opp og ser seg rundt i rommet.',
      'Deltakerne setter seg ned igjen før lederen klikker frem neste påstand.',
    ],
  },
  bilete: {
    label: 'Bilde',
    shortDesc: '1, 2 eller 4 faste bilder med bildetekst',
    purpose: 'Visuell støtte, stemningsbilde eller konkret illustrasjon mens lederen forteller.',
    screenDisplay: '1, 2 eller 4 bilder i fullskjerm eller rutenett med valgfri bildetekst.',
  },
  lysbileteshow: {
    label: 'Lysbildeshow',
    shortDesc: 'Rullende bildeserie med pause og intervall',
    purpose: 'Rullende bildeserie (f.eks. fra leir, konfirmantåret eller temabilder) med rolig overgang.',
    screenDisplay: 'Automatisk bildekarusell med glidende overganger i fullskjerm.',
  },
  bildebibelen: {
    label: 'BildeBibelen',
    shortDesc: 'Kronologisk bibeltegneserie med ledermanus',
    purpose: 'Levende gjenfortelling av en bibelfortelling støttet av kronologiske illustrasjonsbilder.',
    screenDisplay: 'Fullskjerms bibelillustrasjoner som følger fortellingen scene for scene, mens lederen har fortellingsmanus på sin skjerm.',
  },
  bilde: {
    label: 'Bilde',
    shortDesc: '1, 2 eller 4 faste bilder',
    purpose: 'Visuell støtte eller illustrasjonsbilder til undervisningen.',
    screenDisplay: '1, 2 eller 4 bilder i fullskjerm med valgfri bildetekst.',
  },
  video: {
    label: 'Video',
    shortDesc: 'Videoklipp og illustrasjoner',
    purpose: 'Avspilling av filmklipp, kortfilm eller musikkvideo som innledning eller utdyping.',
    screenDisplay: 'Videospiller i fullskjerm.',
  },
  svart_skjerm: {
    label: 'Svart skjerm',
    shortDesc: 'Mørk storskjerm / fokus på formidler',
    purpose: 'Slår av visuelt innhold på storskjermen slik at all oppmerksomhet i rommet rettes mot formidleren.',
    screenDisplay: 'Helt mørk/svart skjerm uten forstyrrende elementer (0 minutter standard).',
  },
  bilete_avdekking: {
    label: 'Bildeavdekking',
    shortDesc: 'Kaos-puslespill (30 sekunder)',
    purpose: 'Visuell gjettelek som skaper nysgjerrighet og kan lede rett inn i kveldens symbol eller tema.',
    screenDisplay: 'Et bilde dekket av 100 brikker som gradvis forsvinner over 30 sekunder til motivet kommer frem.',
    rules: [
      'Fortell deltakerne at et skjult motiv snart kommer til syne brikke for brikke.',
      'Start avdekkingen fra ledervisningen – brikkene forsvinner i tilfeldig rekkefølge.',
      'Deltakerne roper ut eller rekker opp hånden så snart de ser hva bildet forestiller.',
      'Trykk «Pause» når noen vil gjette, og «Vis fasit» når riktig svar er funnet!',
    ],
  },
  beat_for_beat: {
    label: 'Beat for beat',
    shortDesc: 'Avdekk ord for ord',
    purpose: 'Musikalsk eller tekstlig gjettekonkurranse der lag skal kjenne igjen en kjent strofe eller salme.',
    screenDisplay: 'Nummererte luker som åpnes ord for ord etter hvert som lederen klikker.',
    rules: [
      'Forklar at lukene på skjermen skjuler en kjent sanglinje eller strofe.',
      'Lederen åpner ett og ett ord (i rekkefølge eller tilfeldig).',
      'Første lag som kjenner igjen sangen og kan synge eller si hele linjen, får poeng.',
      'Avdekk resten av lukene for å vise fasiten for hele salen.',
    ],
  },
  ord_for_ord: {
    label: 'Ord for ord',
    shortDesc: 'Sitater og bibelvers avdekket ord for ord',
    purpose: 'Gjettekonkurranse der deltakerne skal finne frem til et sentralt bibelvers eller sitat.',
    screenDisplay: '5–10 luker på skjermen som avdekkes ett ord om gangen, med bibelreferanse ved fasit.',
    rules: [
      'Vis de lukkede ord-boksene på storskjermen og gi eventuelt et lite hint om temaet.',
      'Klikk frem ett ord om gangen fra ledervisningen.',
      'La lagene gjette underveis hvilket bibelvers eller sitat som skjuler seg bak lukene.',
      'Når noen klarer det, klikk «Vis alle ord» og les hele verset høyt sammen.',
    ],
  },
  kven_skal_ut: {
    label: 'Hvem skal ut?',
    shortDesc: 'Fire valg – én skiller seg ut',
    purpose: 'Hjernetrim og samtaleåpner der ungdommene må finne sammenhenger og begrunne hvilket ord som ikke passer inn.',
    screenDisplay: '2x2-rutenett med 4 alternativer (A–D) der tre hører sammen og én skiller seg ut, pluss grønn fasit.',
    rules: [
      'Vis de fire ordene (A, B, C, D) på storskjermen.',
      'Spør salen: «Tre av disse hører sammen – hvem skal ut, og hvorfor?»',
      'La deltakerne foreslå både hvilket ord som skal ut og hva de tre andre har til felles.',
      'Klikk «Vis fasit» for å markere svaret og den korte forklaringen på skjermen.',
    ],
  },
};

export function getBlockMetadata(type: BlockType | string, lang: 'nn' | 'nb' = 'nn'): BlockTypeMeta {
  const normalized = (type in BLOCK_METADATA ? (type as BlockType) : normalizeBlockType(String(type)));
  const base = BLOCK_METADATA[normalized] || BLOCK_METADATA.stikkord;
  if (lang === 'nb') {
    const nbOverride = BLOCK_METADATA_NB_OVERRIDES[normalized];
    if (nbOverride) {
      return {
        ...base,
        ...nbOverride,
      };
    }
  }
  return base;
}

export function createEmptyBlock(
  type: BlockType,
  countOrQuestionCount: number = 3,
  lang: 'nn' | 'nb' = 'nn'
): TeachingBlock {
  const id = `block_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const isNb = lang === 'nb';

  switch (type) {
    case 'stikkord': {
      const count = Math.min(8, Math.max(1, countOrQuestionCount || 3));
      const points: StikkordPoint[] = Array.from({ length: count }, (_, idx) => ({
        id: `sp_${Date.now()}_${idx + 1}`,
        text: '',
        note: '',
      }));
      const data: StikkordData = {
        title: '',
        durationMinutes: 3,
        points,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'tekst': {
      const data: TekstData = {
        title: '',
        durationMinutes: 3,
        text: '',
        subtitle: '',
        leaderNotes: '',
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'undervisning': {
      const data: UndervisningData = {
        title: '',
        mode: 'tekst',
        coreMessage: '',
        moments: [],
        slideContent: '',
        slideSubtitle: '',
        slidePoints: [],
        durationMinutes: 4,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'bibelord': {
      const data: BibelordData = {
        reference: '',
        verseText: '',
        explanation: '',
        scriptureRef: '',
        bibleText: '',
        keyVerse: '',
        durationMinutes: 2,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'informasjon': {
      const data: InformasjonData = {
        heading: 'Praktisk informasjon',
        practicalPoints: isNb
          ? [
              'Husk neste samling [tid/sted]',
              'Kiosk og prat etter samlingen',
              'Takk for i dag!',
            ]
          : [
              'Hugs neste samling [tid/stad]',
              'Kiosk og prat etter samlinga',
              'Takk for i dag!',
            ],
        noticeBox: '',
        durationMinutes: 2,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'bonn_dikt': {
      const data: BonnDiktData = {
        title: '',
        text: '',
        responsiveReading: '',
        isResponsive: false,
        durationMinutes: 2,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'lek': {
      const data: LekData = {
        name: '',
        energyLevel: 'Middels',
        equipment: '',
        rulesSteps: [''],
        screenDisplay: 'timer',
        timerMinutes: 3,
        durationMinutes: 6,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'konkurranse': {
      const data: KonkurranseData = {
        title: '',
        competitionType: 'Lag',
        task: '',
        solution: '',
        scoringRules: '',
        durationMinutes: 8,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'samtale': {
      const data: SamtaleData = {
        topic: '',
        organization: 'To-og-to',
        reflectionQuestions: [''],
        summaryPoint: '',
        durationMinutes: 6,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'quiz': {
      const count = Math.max(1, countOrQuestionCount || 3);
      const questions: QuizQuestion[] = Array.from({ length: count }, (_, idx) => ({
        id: `q_${Date.now()}_${idx + 1}`,
        question: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        explanation: '',
      }));

      const data: QuizData = {
        title: '',
        quizType: 'mc',
        questions,
        question: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        explanation: '',
        showAnswerOnScreen: false,
        durationMinutes: 4,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'sang_salme': {
      const data: SangSalmeData = {
        title: '',
        songNumber: '',
        verses: [''],
        durationMinutes: 3,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'henteleik': {
      const data: HenteleikData = {
        title: isNb ? 'Henteleken' : 'Henteleiken',
        intro: isNb ? 'Finn frem det dere tror laget trenger!' : 'Finn fram det de trur laget treng!',
        items: isNb
          ? [
              { id: `h_${Date.now()}_1`, text: 'Rød genser' },
              { id: `h_${Date.now()}_2`, text: 'En sko' },
              { id: `h_${Date.now()}_3`, text: 'Noe rundt' },
              { id: `h_${Date.now()}_4`, text: 'Briller' },
              { id: `h_${Date.now()}_5`, text: 'Bibel' },
              { id: `h_${Date.now()}_6`, text: 'Mynt' },
            ]
          : [
              { id: `h_${Date.now()}_1`, text: 'Raud genser' },
              { id: `h_${Date.now()}_2`, text: 'Ein sko' },
              { id: `h_${Date.now()}_3`, text: 'Noko rundt' },
              { id: `h_${Date.now()}_4`, text: 'Briller' },
              { id: `h_${Date.now()}_5`, text: 'Bibel' },
              { id: `h_${Date.now()}_6`, text: 'Mynt' },
            ],
        durationMinutes: 3,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'kims_leik': {
      const data: KimsLeikData = {
        title: isNb ? 'Kims lek' : 'Kims leik',
        intro: isNb ? 'Husk flest mulig ting før de forsvinner!' : 'Hugs flest mogleg ting før dei forsvinn!',
        itemCount: 16,
        timerSeconds: 30,
        durationMinutes: 3,
        items: Array.from({ length: 16 }, (_, i) => ({
          id: `kims_slot_${Date.now()}_${i + 1}`,
          name: '',
          emoji: '',
          text: '',
          iconName: '',
        })),
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'reis_deg': {
      const data: ReisDegData = {
        title: 'Reis deg',
        intro: isNb
          ? 'Reis deg hvis påstanden passer for deg, sitt ned hvis ikke!'
          : 'Reis deg dersom påstanden passar for deg, sit ned dersom ikkje!',
        statements: isNb
          ? [
              { id: `rd_${Date.now()}_1`, statement: 'hvis du har på deg noe blått' },
              { id: `rd_${Date.now()}_2`, statement: 'hvis du liker taco bedre enn pizza' },
              { id: `rd_${Date.now()}_3`, statement: 'hvis du har vært på leir før' },
              { id: `rd_${Date.now()}_4`, statement: 'hvis du sto opp før klokken 07:00 i dag' },
            ]
          : [
              { id: `rd_${Date.now()}_1`, statement: 'dersom du har på deg noko blått' },
              { id: `rd_${Date.now()}_2`, statement: 'dersom du likar taco betre enn pizza' },
              { id: `rd_${Date.now()}_3`, statement: 'dersom du har vore på leir før' },
              { id: `rd_${Date.now()}_4`, statement: 'dersom du stod opp før klokka 07:00 i dag' },
            ],
        durationMinutes: 3,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'bilete_avdekking': {
      const data: BileteAvdekkingData = {
        title: isNb ? 'Bildeavdekking' : 'Bilete-avdekking',
        imageUrl: 'https://images.unsplash.com/photo-1548625361-12f5ea11a3b0?auto=format&fit=crop&w=1200&q=80',
        gridSize: 100,
        solution: 'Nidarosdomen',
        clue: '',
        durationMinutes: 2,
      };
      return { id, type, data, isExpanded: true, leaderNotes: 'Fasit: Nidarosdomen' };
    }
    case 'beat_for_beat': {
      const data: BeatForBeatData = {
        title: 'Beat for beat',
        solution: 'Deg være ære, Herre over dødens makt',
        words: ['Deg', 'være', 'ære', 'Herre', 'over', 'dødens', 'makt'],
        category: 'Salme',
        durationMinutes: 4,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'ord_for_ord': {
      const defaultQuote = isNb
        ? 'For så høyt har Gud elsket verden at han ga sin Sønn, den enbårne, for at hver den som tror på ham, ikke skal gå fortapt, men ha evig liv.'
        : 'For så har Gud elska verda at han gav Son sin, den einborne, så kvar den som trur på han, ikkje skal gå tapt, men ha evig liv.';
      const defaultTokens = defaultQuote.replace(/[\r\n]+/g, ' ').split(/\s+/).map(w => w.trim()).filter(Boolean);
      const data: OrdForOrdData = {
        title: 'Ord for ord',
        quote: defaultQuote,
        text: defaultQuote,
        reference: 'Johannes 3, 16',
        maxWords: 7,
        startIndex: 0,
        words: defaultTokens.slice(0, 7),
        hint: isNb ? 'Det mest kjente verset i Bibelen' : 'Det mest kjende verset i Bibelen',
        durationMinutes: 4,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'kven_skal_ut': {
      const defaultKvenItems = isNb
        ? [
            {
              id: `ksu_${Date.now()}_1`,
              options: { A: 'Peter', B: 'Johannes', C: 'Matteus', D: 'Jakob' },
              correctOption: 'C' as const,
              explanation: 'Fasit: C. Matteus var toller, de andre fiskere.',
            },
            {
              id: `ksu_${Date.now()}_2`,
              options: { A: 'Tro', B: 'Egoisme', C: 'Håp', D: 'Kjærlighet' },
              correctOption: 'B' as const,
              explanation: 'Fasit: B. A, C, D hører sammen i 1. Kor 13.',
            },
            {
              id: `ksu_${Date.now()}_3`,
              options: { A: 'Dåp', B: 'Nattverd', C: 'Velsignelse', D: 'Sladder' },
              correctOption: 'D' as const,
              explanation: 'Fasit: D. A–C hører til gudstjenesten.',
            },
          ]
        : [
            {
              id: `ksu_${Date.now()}_1`,
              options: { A: 'Peter', B: 'Johannes', C: 'Matteus', D: 'Jakob' },
              correctOption: 'C' as const,
              explanation: 'Fasit: C. Matteus var tollar, dei andre fiskarar.',
            },
            {
              id: `ksu_${Date.now()}_2`,
              options: { A: 'Tru', B: 'Egoisme', C: 'Håp', D: 'Kjærleik' },
              correctOption: 'B' as const,
              explanation: 'Fasit: B. A, C, D høyrer saman i 1. Kor 13.',
            },
            {
              id: `ksu_${Date.now()}_3`,
              options: { A: 'Dåp', B: 'Nattverd', C: 'Velsigning', D: 'Sladder' },
              correctOption: 'D' as const,
              explanation: 'Fasit: D. A–C høyrer til gudstenesta.',
            },
          ];
      const data: KvenSkalUtData = {
        title: isNb ? 'Hvem skal ut?' : 'Kven skal ut?',
        items: defaultKvenItems,
        optionA: 'Peter',
        optionB: 'Johannes',
        optionC: 'Matteus',
        optionD: 'Jakob',
        correctOption: 'C',
        explanation: isNb
          ? 'Fasit: C. Matteus var toller, de andre fiskere.'
          : 'Fasit: C. Matteus var tollar, dei andre fiskarar.',
        durationMinutes: 3,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'bilete':
    case 'bilde': {
      const data: BileteData = {
        title: '',
        layout: 1,
        images: [
          {
            url: 'https://images.unsplash.com/photo-1548625361-12f5ea11a3b0?auto=format&fit=crop&w=1200&q=80',
            caption: '',
          },
        ],
        durationMinutes: 3,
      };
      return { id, type: 'bilete', data, isExpanded: true, leaderNotes: '' };
    }
    case 'lysbileteshow': {
      const data: LysbileteshowData = {
        title: isNb ? 'Lysbildeshow' : 'Lysbileteshow',
        intervalSeconds: 3,
        autoPlay: true,
        autoLoop: true,
        images: [],
        durationMinutes: 3,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'bildebibelen': {
      const data: BildeBibelenData = {
        title: 'BildeBibelen',
        storyQuery: '',
        scenes: [],
        durationMinutes: 7,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'video': {
      const data: VideoData = {
        title: '',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        startTimeSeconds: 0,
        stopTimeSeconds: 60,
        loop: false,
        muted: false,
        isPlaying: false,
        currentTimeSeconds: 0,
        durationSeconds: 60,
        leaderKeywords: isNb ? 'Fokuspunkt under avspilling' : 'Fokuspunkt under avspeling',
        leaderElaboration: isNb ? 'Utdypende refleksjonsspørsmål etter klippet' : 'Utdjupande refleksjonsspørsmål etter klippet',
        durationMinutes: 5,
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
    case 'svart_skjerm': {
      const data: SvartSkjermData = {
        title: 'Svart skjerm',
        durationMinutes: 0,
        notes: '',
      };
      return { id, type, data, isExpanded: true, leaderNotes: '' };
    }
  }
}
