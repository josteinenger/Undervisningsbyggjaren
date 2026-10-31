/**
 * src/types.ts
 * Kjerne-datamodell for Undervisningsbyggar
 * (for leir, konfirmasjon, trusopplæring og samlingar)
 */

export type BlockType =
  | 'stikkord'
  | 'tekst'
  | 'undervisning'
  | 'bibelord'
  | 'informasjon'
  | 'bonn_dikt'
  | 'samtale'
  | 'sang_salme'
  // Aktivitetsbanken:
  | 'henteleik'
  | 'kims_leik'
  | 'reis_deg'
  | 'bilete_avdekking'
  // Medievising & Formidling:
  | 'bilete'            // Blokk 1: 1, 2 eller 4 faste bilete
  | 'lysbileteshow'     // Blokk 2: Rullande slideshow (100+ bilete)
  | 'bildebibelen'      // Blokk 3: Teikneserie frå FreeBibleImages med leiarmanus
  | 'bilde'             // Bakoverkompatibel
  | 'video'
  | 'svart_skjerm'
  // Konkurransebanken:
  | 'quiz'
  | 'beat_for_beat'
  | 'ord_for_ord'
  | 'kven_skal_ut'
  // Bakoverkompatible (historiske):
  | 'lek'
  | 'konkurranse';

// Felles grunnmur for alle blokktypar
export interface BaseBlock {
  id: string;
  type: BlockType;
  title?: string;
  leaderNotes?: string;       // Manus / notat til forelesar
  hiddenOnScreen?: boolean;   // Om leddet skal vere skjult for publikum på storskjerm
}

// 1. «Stikkord»
export interface StikkordPoint {
  id: string;
  text: string;               // Tekst som skal avdekkast på storskjerm
  note?: string;              // Talernotat / manus for dette punktet
}

export interface StikkordData {
  title: string;              // Emne / Tittel
  durationMinutes?: number;   // Tidsbruk (minutt)
  stikkord?: string[];        // Array med 3–4 konkrete, munnlege stikkord (2–5 ord kvar)
  points: StikkordPoint[];    // Kulepunkt (1–8 punkt) med eigne talernotat
  leaderNotes?: string;       // Valfritt overordna talernotat / manus
}

// 2. «Tekst»
export interface TekstData {
  title: string;              // Tittel / Emne
  durationMinutes?: number;   // Tidsbruk (minutt)
  text: string;               // Bodskap, sitat, forteljing eller refleksjon på storskjerm
  slideText?: string;         // Alias for text
  content?: string;           // Alias for text
  subtitle?: string;          // Valfri undertittel
  leaderNotes?: string;       // Talernotat / manus til forelesar
}

export interface UndervisningSlidePoint {
  id: string;
  text: string;               // Tekst som skal avdekast på storskjerm
  note?: string;              // Valfritt manus / talernotat for dette punktet
}

// 3. «Undervisning» (historisk / bakoverkompatibel)
export interface UndervisningData {
  title: string;              // Emne / Tittel
  durationMinutes?: number;   // Tidsbruk (minutt)
  mode?: 'tekst' | 'kulepunkt'; // 'tekst' = Forteljing/sitat, 'kulepunkt' = Kulepunkt (1–7)
  coreMessage?: string;       // Kjernebodskap / One-liner
  slideContent?: string;      // Hovudbodskap / tekst som skal på storskjerm
  slideSubtitle?: string;     // Undertittel for storskjerm
  moments?: string[];         // Momentliste / stikkord
  slidePoints?: UndervisningSlidePoint[]; // Kulepunkt (1–7 punkt) med eigne talernotat
}

// 2. «Bibelord»
export interface BibelordData {
  reference: string;          // Bibeltilvising / kapittel og vers (t.d. "Luk 15, 11–24" eller "Lukas 15, 20"). KUN tilvisinga!
  verseText: string;          // HEILE bibelverset/sitatet som skal visast med stor skrift på STORSKJERM.
  explanation?: string;       // Valfri utdjuping, kommentar eller bakgrunnsstoff for LEIARVISING (KUN leiar, ikkje storskjerm).
  durationMinutes?: number;   // Tidsbruk (minutt)
  // Bakoverkompatible felt:
  scriptureRef?: string;
  bibleRef?: string;
  bibleText?: string;
  keyVerse?: string;
  reflectionQuestion?: string;
  leaderNotes?: string;
  notes?: string;
}


// 3. «Informasjon»
export interface InformasjonData {
  heading: string;            // Overskrift
  practicalPoints: string[];  // Praktiske punkt (t.d. tider, oppmøte, kiosk)
  noticeBox: string;          // Viktig varsel / hugs-boks
  durationMinutes?: number;   // Tidsbruk (minutt)
}

// 4. «Bøn / Dikt»
export interface BonnDiktData {
  title: string;              // Tittel
  text: string;               // Tekst (sentrert formatering)
  responsiveReading?: string; // Felles lesing / veksellesing (om forsamlinga svarar)
  isResponsive: boolean;      // Om veksellesing er aktivert
  durationMinutes?: number;   // Tidsbruk (minutt)
}

// 5. «Leik»
export interface LekData {
  name: string;               // Namn på leiken
  durationMinutes?: number;   // Tidsbruk
  energyLevel: 'Rolig' | 'Middels' | 'Høgt tempo'; // Energi-nivå
  equipment: string;          // Utstyr og førebuing
  rulesSteps: string[];       // Trinn-for-trinn reglar
  screenDisplay: 'timer' | 'bilde' | 'instruks' | 'ingen'; // Skjermvising
  timerMinutes?: number;      // Teljar-tid i minutt
}

// 6. «Konkurranse»
export interface KonkurranseData {
  title: string;              // Konkurransetittel
  durationMinutes?: number;   // Tidsbruk
  competitionType: 'Individuell' | 'Lag' | 'Duell'; // Type konkurranse
  task: string;               // Oppgåve / Instruks
  solution?: string;          // Fasit / vinnarkriterium
  scoringRules: string;       // Poengreglar / tidtaking
}

// 7. «Samtale»
export interface SamtaleData {
  topic: string;              // Tema for samtalen
  durationMinutes?: number;   // Tid til samtale (minutt)
  organization: 'To-og-to' | 'Smågrupper' | 'Plenum'; // Organisering
  reflectionQuestions: string[]; // Refleksjonsspørsmål
  summaryPoint?: string;      // Oppsummeringspunkt
  leaderPoints?: StikkordPoint[]; // Stikkord-par + utdjupande manus for leiar
}

export interface QuizQuestion {
  id: string;
  question: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

// 8. «Quiz»
export interface QuizData {
  title: string;                 // Quiz-tittel / emne
  durationMinutes?: number;      // Tidsbruk
  quizType: 'mc' | 'open';       // 'mc' = 4 svaralternativ, 'open' = Spørsmål -> Svar
  questions?: QuizQuestion[];    // Støtte for fleire spørsmål i same quiz
  // For bakoverkompatibilitet:
  question?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  showAnswerOnScreen?: boolean;
}

// 9. «Song / Salme»
export interface SangSalmeData {
  title: string;              // Song- eller salmetittel
  songNumber?: string;        // Salmenummer (t.d. «N12 844»)
  songText?: string;          // Råtekst for heile salmen (med tomlinjer mellom vers)
  verses: string[];           // Vers-liste (kvar streng er eitt vers)
  durationMinutes?: number;   // Tidsbruk
}

// Stikkord + Utdjuping / Manus-modell for leiarvisning
export interface StikkordItem {
  id: string;
  title: string;              // Stikkord / Moment-overskrift
  detail: string;             // Utdjuping / Talernotat (manus)
}

// ==========================================
// AKTIVITETSBANKEN
// ==========================================

export interface HenteleikItem {
  id: string;
  text: string;
}

export interface HenteleikData {
  title: string;              // Standard: «Henteleiken»
  intro?: string;              // Valfri intro (t.d. «Finn fram det de trur laget treng!»)
  items: HenteleikItem[];     // Liste over ting/gjenstandar som skal hentast
  teamCount?: number;         // Tal på lag (2, 3 eller 4. Standard: 2)
  teamNames?: string[];       // Valfrie lagnamn, t.d. ['Lag 1', 'Lag 2', 'Lag 3']
  durationMinutes?: number;   // Tidsbruk (minutt)
}

export interface KimsLeikItem {
  id: string;
  name: string;
  emoji: string;
  text?: string;
  iconName?: string;
  imageUrl?: string;
}

export interface KimsLeikData {
  title: string;              // Standard: «Kims leik»
  intro?: string;              // Valfritt: «Hugs flest mogleg ting!»
  itemCount?: 12 | 16 | 20;   // Val av tal på gjenstandar: 12, 16 (standard) eller 20
  items: Array<KimsLeikItem | string>; // Liste over ting/gjenstandar
  timerSeconds?: number;      // Hugsetid i sekund (t.d. 30, 45, 60 sekund). Standard: 30
  writingTimerSeconds?: number; // Skrivetid i sekund for fase 2. Standard: 60
  durationMinutes?: number;   // Tidsbruk (minutt)
}

export interface ReisDegItem {
  id: string;
  statement: string;          // Påstand (t.d. «dersom du har på deg noko blått»)
}

export interface ReisDegData {
  title: string;              // Standard: «Reis deg»
  intro?: string;              // Standard: «Reis deg dersom påstanden passar for deg, sit ned dersom ikkje!»
  statements: ReisDegItem[];  // Liste over påstandar
  durationMinutes?: number;   // Tidsbruk (minutt)
}

export interface BileteAvdekkingData {
  title: string;              // Standard: «Bilete-avdekking»
  imageUrl: string;           // Bilete-URL eller biletfil
  gridSize: 9 | 16 | 25 | 36 | 64 | 100; // 9 (3x3), 16 (4x4), 25 (5x5), 36 (6x6), 64 (8x8), 100 (10x10). Standard: 36
  mode?: 'kaos_puslespill' | 'klassisk'; // For bakoverkompatibilitet
  solution?: string;          // Kva motivet viser (fasit for leiar)
  clue?: string;              // Valfritt hint
  durationMinutes?: number;   // Tidsbruk (minutt)
}

// ==========================================
// KONKURRANSEBANKEN
// ==========================================

export interface BeatForBeatData {
  title: string;              // Standard: «Beat for beat»
  solution: string;           // Sangtittel / bibelvers / sitat (fasit for leiar)
  words: string[];            // Ord eller tekstsegment som skal avdekkast eitt etter eitt
  category?: string;          // Valfri kategori (t.d. «Kjend song», «Bibelvers»)
  durationMinutes?: number;   // Tidsbruk (minutt)
}

export interface OrdForOrdData {
  title: string;              // Standard: «Ord for ord»
  quote: string;              // Sjølve bibelverset/teksten (heile bibelverset / fasit)
  text?: string;              // Alias for quote
  reference: string;          // Bibeltilvising / kjelde (fasit for leiar, t.d. «Johannes 3, 16»)
  maxWords?: number;          // Maks ord på storskjerm (5–10 ord, standard 7)
  startIndex?: number;        // Indeks for startordet i bibelverset (default 0)
  words: string[];            // Dei 5–10 utvalde orda som skal avdekkast på storskjerm
  hint?: string;              // Valfritt hint / stikkord
  durationMinutes?: number;   // Tidsbruk (minutt)
  leaderNotes?: string;
}


export interface KvenSkalUtItem {
  id: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: 'A' | 'B' | 'C' | 'D'; // Alternativet som skal ut
  explanation: string; // Pedagogisk forklaring
}

export interface KvenSkalUtData {
  title: string;              // Standard: «Kven skal ut?»
  items?: KvenSkalUtItem[];   // 1–5 oppgåver per blokk (standard 3)
  currentIndex?: number;      // Aktiv oppgåve-indeks for leiar og storskjerm
  durationMinutes?: number;   // Tidsbruk (minutt)
  // Bakoverkompatibilitet for enkelt-oppgåve:
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

// 1. BILETE (1, 2 eller 4 bilete)
export interface BileteImageItem {
  id?: string;
  url: string;
  caption?: string; // Valfri bildetekst på storskjerm (kun for 1 eller 2 bilete)
  alt?: string;
  label?: string;
}

export interface BileteData {
  title?: string;
  layout: 1 | 2 | 4; // tal på bilete
  images: BileteImageItem[];
  leaderKeywords?: string;
  leaderElaboration?: string;
  durationMinutes?: number;
}

// 2. LYSBILETESHOW (batch, stemning, loop)
export interface LysbileteshowImageItem {
  id?: string;
  url: string;
  title?: string;
  caption?: string;
  leaderNote?: string;
}

export interface LysbileteshowData {
  title?: string;
  intervalSeconds: number; // 0.5s - 30s (standard: 3s)
  autoPlay: boolean;       // Standard true
  autoLoop: boolean;       // Standard true (startar på nytt når serien er ferdig)
  images: LysbileteshowImageItem[];
  durationMinutes?: number;
}

// 3. BILDEBIBELEN (FreeBibleImages med leiarmanus)
export interface BildeBibelenScene {
  id: string;
  sceneNumber: number;
  imageUrl: string;
  scriptureRef?: string;   // F.eks. "1. Mos 6,14"
  leaderNotes: string;     // Munnleg, levande norsk forteljarmanus for denne ruta
  narrationScript?: string;
  imageCaption?: string;
}

export interface BildeBibelenData {
  title?: string;          // F.eks. "Noas ark (1. Mosebok 6-9)"
  storyQuery?: string;     // Søkefrase som vart brukt
  scenes: BildeBibelenScene[];
  durationMinutes?: number;
}

export interface BildeImageItem {
  id: string;
  url: string;
  caption?: string;             // Valfri bildetekst for storskjerm
  label?: string;               // A, B, C, D eller 1, 2, 3, 4
  sceneIndex?: number;          // Indeks i biletserien (0, 1, ...)
  sceneNumber?: number;         // Faktisk scenenummer i forteljinga (f.eks. scene 6 av 12)
  totalScenes?: number;         // Totalt tal på scener i serien
  title?: string;               // Scenetittel
  leaderNote?: string;          // Valfritt stikkord for leiaren
}

export interface BildeData {
  title?: string;                               // Valfri tittel for storskjerm
  imageMode?: 'grid' | 'slideshow';             // 'grid' (default) eller 'slideshow' (eitt om gongen)
  layout: '1' | '2' | '4';                     // 1 bilete, 2 ved sida, 4 rutenett (2x2)
  slideIntervalSeconds?: number;               // Intervall i sekund per bilete (0.5 til 30, standard 3)
  autoPlaySlideshow?: boolean;                 // Om lysbileteserien skal rulle automatisk
  loopSlideshow?: boolean;                     // Om lysbileteserien skal loope saumlaust (standard true)
  images: BildeImageItem[];                    // 1–100+ bilete-element
  seriesImages?: string[];                     // Komplett serie URLs (f.eks. 12 scener) for å bla i serien
  seriesScenes?: any[];                        // Full scenestruktur (sceneNumber, title, englishDescription)
  scenes?: any[];                              // Scener frå bibelanalysen
  artStyle?: 'sweet_publishing' | 'woodcut' | 'classical_painting' | 'photo';
  bibleBook?: string;
  bibleChapter?: string;
  englishTitle?: string;
  leaderKeywords?: string;                     // Stort stikkord-felt for leiar
  leaderElaboration?: string;                  // Utdjupande tekst / spørsmål for leiar
  focusedImageIndex?: number | null;           // Klikk-for-fokus på storskjerm (null = heile layouten, 0..3 = fokusert bilde)
  durationMinutes?: number;
}

export interface VideoData {
  title?: string;                              // Valfri tittel
  videoUrl: string;                            // MP4/WebM eller YouTube/Vimeo lenke
  startTimeSeconds?: number;                   // Valfri starttid i sekund
  stopTimeSeconds?: number;                    // Valfri stopptid i sekund
  loop: boolean;                               // Spel ein gong vs Gjenta / Loop
  muted: boolean;                              // Lyd på vs Dempa / Stille
  isPlaying?: boolean;                         // Om videoen er i gang eller pausa
  currentTimeSeconds?: number;                 // Medgått tid i sekund
  durationSeconds?: number;                    // Total videolengd i sekund
  leaderKeywords?: string;                     // Stikkord før/under vising
  leaderElaboration?: string;                  // Utdjupande poeng / spørsmål etter klippet
  durationMinutes?: number;
}

export interface SvartSkjermData {
  title?: string; // Standard: "Svart skjerm"
  durationMinutes?: number; // Standard: 2
  notes?: string; // Stikkord eller leiarmanus for den munnlege praten
}

// Kart over blokkdata for typesikkerhet
export type BlockDataMap = {
  stikkord: StikkordData;
  tekst: TekstData;
  undervisning: UndervisningData;
  bibelord: BibelordData;
  informasjon: InformasjonData;
  bonn_dikt: BonnDiktData;
  samtale: SamtaleData;
  sang_salme: SangSalmeData;
  // Aktivitetsbanken:
  henteleik: HenteleikData;
  kims_leik: KimsLeikData;
  reis_deg: ReisDegData;
  bilete_avdekking: BileteAvdekkingData;
  // Medievising & Formidling:
  bilete: BileteData;
  lysbileteshow: LysbileteshowData;
  bildebibelen: BildeBibelenData;
  bilde: BildeData;
  video: VideoData;
  svart_skjerm: SvartSkjermData;
  // Konkurransebanken:
  quiz: QuizData;
  beat_for_beat: BeatForBeatData;
  ord_for_ord: OrdForOrdData;
  kven_skal_ut: KvenSkalUtData;
  // Bakoverkompatible (historiske):
  lek: LekData;
  konkurranse: KonkurranseData;
};

// Generisk blokkstruktur på arbeidsbordet som arver frå BaseBlock
export interface TeachingBlock<T extends BlockType = BlockType> extends BaseBlock {
  type: T;
  data: any;
  isExpanded?: boolean;
  stikkordItems?: StikkordItem[];
}

export interface StoryboardBriefing {
  prompt: string;
  targetGroup: string;
  targetDuration: number;
  language?: 'nn' | 'nb';
  sourceDocuments: Array<{ name: string; type: string; size?: number; base64Data?: string; textContent?: string }>;
  pastedSourceText: string;
}

// Samlinga
export interface TeachingSession {
  id: string;
  title: string;
  subtitle?: string;
  language?: 'nn' | 'nb';
  targetAudience?: string;
  description?: string;
  theologicalBackground?: string;
  pedagogicalTips?: string;
  introBackground?: {
    redThread?: string;
    theologicalBackground?: string;
    pedagogicalTips?: string;
  };
  storyboard?: AiStoryboard | null;
  briefingData?: StoryboardBriefing | null;
  hasManualEditsAfterBuild?: boolean;
  blocks: TeachingBlock[];
  createdAt: string;
  updatedAt: string;
}

// Visuelle eigenskapar og pedagogisk hjelpeinfo for kvar blokktype
export interface BlockTypeMeta {
  type: BlockType;
  label: string;
  shortDesc: string;
  purpose: string;
  screenDisplay: string;
  rules?: string[];
  colorName: string;
  borderClass: string;
  bgLightClass: string;
  bgDarkClass: string;
  badgeClass: string;
  accentBarClass: string;
  iconName: string;
  defaultMinutes: number;
}

export interface StoryboardSection {
  id: string;
  timeRange: string;
  durationMinutes: number;
  blockType: BlockType;
  title: string;
  bigScreenSummary: string;
  leaderScript: string;
}

export interface AiStoryboard {
  title: string;
  subtitle?: string;
  targetGroup: string;
  targetDurationMinutes: number;
  language?: 'nn' | 'nb';
  redThread: string;
  theologicalBackground?: string;
  pedagogicalTips?: string;
  sections: StoryboardSection[];
}

export type TeachingStoryboard = AiStoryboard;


