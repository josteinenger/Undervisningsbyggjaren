/**
 * src/components/builder/GeminiAssistantModal.tsx
 * 
 * AI-ASSISTENT FOR ENKELTBLOKKER
 * 
 * 3-stegs modal dialogflyt:
 * STEG 1: Vel blokktype (rene, klikkbare kort med ikon og stikkord)
 * STEG 2: Tema og målgruppe (minimalistisk input + piller)
 * STEG 3: Forhandsvising og innsetjing på arbeidsbordet
 * 
 * Genererer BARE ÉI enkeltblokk om gongen utan å overskrive eller røre
 * eksisterande samlingsdata!
 */

import React, { useState, useEffect } from 'react';
import { TeachingBlock } from '../../types';
import { 
  Sparkles, 
  X, 
  FileText,
  BookMarked,
  HeartHandshake,
  Info,
  MessagesSquare, 
  ArrowUpDown,
  Music,
  HelpCircle, 
  Brain, 
  PackageCheck,
  LayoutGrid, 
  Music2,
  ArrowRight,
  ArrowLeft,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Clock,
  Layers,
  Zap,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Palette,
  Image as ImageIcon,
  Type
} from 'lucide-react';
import {
  ArtStyle,
  SeriesScene,
  fetchSweetPublishingSeries,
  searchWikimediaCommons,
  pickSemanticScenes,
  translateNorwegianQuery,
  CURATED_PHOTOS,
} from '../../lib/imageSearchService';
import { getItemGraphic } from '../../lib/kimsLeikUtils';

export interface ArtStyleOption {
  id: ArtStyle;
  label: string;
  badge: string;
  description: string;
  icon: string;
}

export const ART_STYLE_OPTIONS: ArtStyleOption[] = [
  {
    id: 'sweet_publishing',
    label: 'Bibelforteljing (Teikneserie)',
    badge: 'Sweet Publishing / FreeBibleImages',
    description: '100 % lik teiknestil, fargar og figurar frå scene til scene',
    icon: '🎨',
  },
  {
    id: 'woodcut',
    label: 'Klassiske tresnitt',
    badge: 'Gustave Doré & Schnorr',
    description: 'Historiske tresnitt i Public Domain, homogen svart-kvitt/grafisk stil',
    icon: '🏛️',
  },
  {
    id: 'classical_painting',
    label: 'Klassisk kunst (Måleri)',
    badge: 'Rembrandt, Tissot m.fl.',
    description: 'Kjende meisterverk og oljemåleri frå kunsthistoria',
    icon: '🖼️',
  },
  {
    id: 'photo',
    label: 'Foto / Realistisk',
    badge: 'Pixabay & Unsplash',
    description: 'Reine, stemningsfulle foto for kvardagsmetaforar (tuntre, klippe, lys)',
    icon: '📷',
  },
];

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSingleBlock: (block: TeachingBlock) => void;
  sessionTitle?: string;
}

export type SingleBlockChoice = 
  // FORMIDLING
  | 'tekst'
  | 'bibelord'
  | 'bonn_dikt'
  | 'informasjon'
  // FELLESSKAP & LITURGI
  | 'samtale'
  | 'reis_deg'
  | 'sang_salme'
  // AKTIVITET & KONKURRANSE
  | 'quiz'
  | 'kims_leik'
  | 'henteleik'
  | 'bilete_avdekking'
  | 'beat_for_beat'
  | 'ord_for_ord'
  | 'kven_skal_ut'
  // MEDIA
  | 'bilde';

export interface BlockTypeItem {
  id: SingleBlockChoice;
  title: string;
  shortDesc: string;
  icon: React.FC<{ className?: string }>;
}

export interface BlockGroup {
  id: string;
  title: string;
  items: BlockTypeItem[];
}

export const BLOCK_GROUPS: BlockGroup[] = [
  {
    id: 'formidling',
    title: 'FORMIDLING',
    items: [
      {
        id: 'tekst',
        title: 'Tekst',
        shortDesc: 'Stikkord + leiarutdjuping',
        icon: FileText,
      },
      {
        id: 'bibelord',
        title: 'Bibelord',
        shortDesc: 'Versereferanse, storskjerm og leiartekst',
        icon: BookMarked,
      },
      {
        id: 'bonn_dikt',
        title: 'Bøn / Dikt',
        shortDesc: 'Roleg, sentrert tekst',
        icon: HeartHandshake,
      },
      {
        id: 'informasjon',
        title: 'Informasjon',
        shortDesc: 'Kunngjeringar og beskjedar',
        icon: Info,
      },
    ],
  },
  {
    id: 'fellesskap',
    title: 'FELLESSKAP & LITURGI',
    items: [
      {
        id: 'samtale',
        title: 'Samtale',
        shortDesc: 'Stort samtalespørsmål og leiarstikkord',
        icon: MessagesSquare,
      },
      {
        id: 'reis_deg',
        title: 'Reis deg',
        shortDesc: 'Kroppslege signal og leiarinstruks',
        icon: ArrowUpDown,
      },
      {
        id: 'sang_salme',
        title: 'Song / Salme',
        shortDesc: 'Tekst og vers',
        icon: Music,
      },
    ],
  },
  {
    id: 'aktivitet',
    title: 'AKTIVITET & KONKURRANSE',
    items: [
      {
        id: 'quiz',
        title: 'Quiz',
        shortDesc: 'Spørsmål, alternativ og fasit',
        icon: HelpCircle,
      },
      {
        id: 'kims_leik',
        title: 'Kims leik',
        shortDesc: 'Ikonrutenett og fasit',
        icon: Brain,
      },
      {
        id: 'henteleik',
        title: 'Henteleiken',
        shortDesc: 'Gjenstandar, tid og poeng',
        icon: PackageCheck,
      },
      {
        id: 'bilete_avdekking',
        title: 'Bilete-avdekking',
        shortDesc: 'Ruter som opnast stegvis',
        icon: LayoutGrid,
      },
      {
        id: 'beat_for_beat',
        title: 'Beat for Beat',
        shortDesc: 'Avdekking av ord og songpostar',
        icon: Music2,
      },
      {
        id: 'ord_for_ord',
        title: 'Ord for ord',
        shortDesc: 'Sitat og bibelord bak nummererte kort',
        icon: Type,
      },
      {
        id: 'kven_skal_ut',
        title: 'Kven skal ut?',
        shortDesc: 'Fire alternativ og fasit',
        icon: HelpCircle,
      },
    ],
  },
  {
    id: 'media',
    title: 'MEDIA',
    items: [
      {
        id: 'bilde',
        title: 'Bilde',
        shortDesc: '1, 2 eller 4 ruter med bilete/illustrasjonar',
        icon: ImageIcon,
      },
    ],
  },
];

const ALL_BLOCK_ITEMS = BLOCK_GROUPS.flatMap((g) => g.items);
export const getBlockItem = (id: SingleBlockChoice) => ALL_BLOCK_ITEMS.find((b) => b.id === id);

const CURATED_IMAGES = [
  'https://images.unsplash.com/photo-1548625361-12f5ea11a3b0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1510936111840-65e151ad71bb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=1200&q=80',
];

const TARGET_GROUPS = [
  'Småborn 1.–4.',
  'Mellomtrinn 5.–7.',
  'Ungdom',
  'Alle',
];

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  isOpen,
  onClose,
  onInsertSingleBlock,
  sessionTitle = '',
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<SingleBlockChoice>('tekst');
  const [selectedLayout, setSelectedLayout] = useState<'1' | '2' | '4'>('1');
  const [artStyle, setArtStyle] = useState<ArtStyle>('sweet_publishing');
  const [kimsCount, setKimsCount] = useState<12 | 16 | 20>(16);
  const [quizMode, setQuizMode] = useState<'multiple_choice' | 'open'>('multiple_choice');
  const [quizQuestionCount, setQuizQuestionCount] = useState<3 | 5 | 8>(5);
  const [gridSize, setGridSize] = useState<9 | 16>(9);
  const [prompt, setPrompt] = useState<string>('');
  const [targetGroup, setTargetGroup] = useState<string>('Ungdom');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedBlock, setGeneratedBlock] = useState<TeachingBlock | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchingFrameIdx, setSearchingFrameIdx] = useState<number | null>(null);

  // Førehandsfyll med temaet for samlinga dersom tilgjengeleg
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setErrorMsg(null);
      if (!prompt && sessionTitle && sessionTitle !== 'Ny samling') {
        setPrompt(sessionTitle);
      }
    }
  }, [isOpen, sessionTitle]);

  if (!isOpen) return null;

  // Generer ein enkeltblokk med server API (med 20s timeout og feilhandtering)
  const handleGenerateBlock = async () => {
    if (!prompt.trim()) {
      setErrorMsg('Vennlegast skriv inn eit tema, bibeltekst eller stikkord.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 20000);

    const targetAudienceMap: Record<string, string> = {
      'Småborn 1.–4.': 'kids',
      'Mellomtrinn 5.–7.': 'middle',
      'Ungdom': 'youth',
      'Alle': 'all',
    };

    try {
      const response = await fetch('/api/single-block/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockType: selectedType,
          prompt,
          targetGroup,
          targetAudience: targetAudienceMap[targetGroup] || 'youth',
          sessionTitle,
          layout: selectedLayout,
          artStyle,
          count: kimsCount,
          itemCount: kimsCount,
          quizMode,
          questionCount: quizQuestionCount,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const resData = await response.json();
      if (!response.ok || resData.success === false) {
        throw new Error(resData?.message || 'Feil ved generering frå tenaren');
      }

      let blockData = resData.blockData || {};

      if (selectedType === 'bilde') {
        const layout = selectedLayout || blockData.layout || '1';
        let count = 1;
        if (layout === '2') count = 2;
        if (layout === '4') count = 4;

        const bibleBook = blockData.bibleBook || 'Luke';
        const bibleChapter = blockData.bibleChapter || '15';
        const queries: string[] = Array.isArray(blockData.queries) && blockData.queries.length > 0
          ? blockData.queries
          : [prompt];
        const imageNotes: string[] = Array.isArray(blockData.imageNotes) ? blockData.imageNotes : [];

        let seriesScenes: SeriesScene[] = [];
        let seriesUrls: string[] = [];
        let selectedUrls: string[] = [];
        let selectedIndices: number[] = [];
        let selectedScenesList: SeriesScene[] = [];

        if (artStyle === 'sweet_publishing') {
          // 100 % homogen serie frå Sweet Media / FreeBibleImages via Wikimedia Commons
          seriesScenes = await fetchSweetPublishingSeries(bibleBook, bibleChapter, prompt);
          seriesUrls = seriesScenes.map((s) => s.url);
          if (seriesScenes.length > 0) {
            const picked = pickSemanticScenes(seriesScenes, layout, {
              selected4Scenes: blockData.selected4Scenes,
              selected2Scenes: blockData.selected2Scenes,
              selected1Scene: blockData.selected1Scene,
            });
            selectedScenesList = picked.selectedScenes;
            selectedUrls = picked.selectedScenes.map((s) => s.url);
            selectedIndices = picked.selectedIndices;
          }
        } else if (artStyle === 'woodcut') {
          // Klassiske tresnitt frå Gustave Doré / Julius Schnorr von Carolsfeld
          for (let i = 0; i < count; i++) {
            const q = queries[i] || queries[0] || prompt;
            const res = await searchWikimediaCommons(q, 'woodcut');
            const found = res[0] || CURATED_PHOTOS[i % CURATED_PHOTOS.length];
            selectedUrls.push(found);
            seriesUrls.push(...res);
          }
          selectedIndices = selectedUrls.map((_, i) => i);
        } else if (artStyle === 'classical_painting') {
          // Klassisk kunst og måleri (Rembrandt, Tissot m.fl.)
          for (let i = 0; i < count; i++) {
            const q = queries[i] || queries[0] || prompt;
            const res = await searchWikimediaCommons(q, 'classical_painting');
            const found = res[0] || CURATED_PHOTOS[i % CURATED_PHOTOS.length];
            selectedUrls.push(found);
            seriesUrls.push(...res);
          }
          selectedIndices = selectedUrls.map((_, i) => i);
        } else {
          // Foto / Realistisk (Pixabay/Unsplash for ikkje-bibelske metaforar)
          for (let i = 0; i < count; i++) {
            selectedUrls.push(CURATED_PHOTOS[(i + Math.floor(Math.random() * CURATED_PHOTOS.length)) % CURATED_PHOTOS.length]);
          }
          seriesUrls = [...CURATED_PHOTOS];
          selectedIndices = selectedUrls.map((_, i) => i);
        }

        // Fyll opp eventuelle manglar med curated fallback
        if (seriesUrls.length === 0) {
          seriesUrls = [...CURATED_PHOTOS];
        }

        const finalImages: Array<{
          id: string;
          url: string;
          label: string;
          sceneIndex: number;
          sceneNumber: number;
          totalScenes: number;
          title?: string;
          leaderNote?: string;
        }> = [];

        for (let i = 0; i < count; i++) {
          const pickedScene = selectedScenesList[i];
          const url = pickedScene?.url || selectedUrls[i] || seriesUrls[i % seriesUrls.length] || CURATED_PHOTOS[i % CURATED_PHOTOS.length];
          const sceneIdx = selectedIndices[i] ?? i;
          const sceneNum = pickedScene?.sceneNumber ?? (sceneIdx + 1);

          finalImages.push({
            id: `img_${Date.now()}_${i}`,
            url,
            label: layout === '1' ? 'Fokus' : ['A', 'B', 'C', 'D'][i] || String(i + 1),
            sceneIndex: sceneIdx,
            sceneNumber: sceneNum,
            totalScenes: seriesUrls.length,
            title: pickedScene?.title || '',
            leaderNote: imageNotes[i] || '',
          });
        }

        blockData.images = finalImages;
        blockData.seriesImages = seriesUrls;
        blockData.seriesScenes = seriesScenes;
        blockData.scenes = blockData.scenes || [];
        blockData.artStyle = artStyle;
        blockData.bibleBook = bibleBook;
        blockData.bibleChapter = bibleChapter;
        blockData.englishTitle = blockData.englishTitle;
        blockData.layout = layout;
        blockData.title = prompt.trim(); // Rent tittelnamn utan AI-undertitlar
      }

      const newBlock = createTeachingBlockFromData(selectedType, blockData, prompt, targetGroup);
      setGeneratedBlock(newBlock);
      setStep(3);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('Feil ved generering av enkeltblokk:', err);
      setErrorMsg('Noko gjekk gale under genereringa. Ver venleg og prøv igjen.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Hjelpefunksjon for å strukturere TeachingBlock frå JSON-data
  const createTeachingBlockFromData = (
    type: SingleBlockChoice,
    raw: any,
    userPrompt: string,
    target: string
  ): TeachingBlock => {
    const id = `block_${type}_${Date.now()}`;

    switch (type) {
      case 'tekst': {
        const stikkordItems = Array.isArray(raw.stikkordItems) && raw.stikkordItems.length > 0
          ? raw.stikkordItems.map((it: any, i: number) => ({
              id: `stk_${Date.now()}_${i + 1}`,
              title: it.title || `Moment ${i + 1}`,
              detail: it.detail || '',
            }))
          : undefined;

        return {
          id,
          type: 'tekst',
          isExpanded: true,
          leaderNotes: raw.leaderNotes || '',
          stikkordItems,
          data: {
            title: raw.title || userPrompt || 'Tekst',
            durationMinutes: raw.durationMinutes || 8,
            text: raw.text || raw.slideContent || userPrompt,
            subtitle: raw.subtitle || '',
            leaderNotes: raw.leaderNotes || '',
          },
        };
      }

      case 'bibelord':
        return {
          id,
          type: 'bibelord',
          isExpanded: true,
          data: {
            scriptureRef: raw.scriptureRef || raw.title || userPrompt || 'Bibelord',
            bibleText: raw.bibleText || raw.text || 'Jesus sa: «Eg er det sanne vintre, og Far min er vingardsmannen.» (Joh 15,1)',
            keyVerse: raw.keyVerse || raw.slideContent || raw.bibleText || '«Eg er vintre, de er greinene.»',
            reflectionQuestion: raw.reflectionQuestion || (Array.isArray(raw.reflectionQuestions) ? raw.reflectionQuestions[0] : 'Kva fortel dette verset oss om fellesskap og tru?'),
            durationMinutes: raw.durationMinutes || 8,
          },
        };

      case 'bonn_dikt':
        return {
          id,
          type: 'bonn_dikt',
          isExpanded: true,
          data: {
            title: raw.title || userPrompt || 'Bøn',
            text: raw.text || 'Herre, takk for at vi får vere samla i dag.\nVelsign fellesskapet og orda vi deler.',
            responsiveReading: raw.responsiveReading || 'Herre, høyr vår bøn.',
            isResponsive: !!raw.responsiveReading || raw.isResponsive !== false,
            durationMinutes: raw.durationMinutes || 5,
          },
        };

      case 'informasjon':
        return {
          id,
          type: 'informasjon',
          isExpanded: true,
          data: {
            heading: raw.heading || raw.title || userPrompt || 'Informasjon',
            practicalPoints: Array.isArray(raw.practicalPoints) && raw.practicalPoints.length > 0
              ? raw.practicalPoints
              : ['Felles oppmøte kl. 18:00', 'Kiosken er open i pausen', 'Hugs påmelding til neste leir'],
            noticeBox: raw.noticeBox || 'Hugs å rydde etter deg før du går!',
            durationMinutes: raw.durationMinutes || 5,
          },
        };

      case 'samtale':
        return {
          id,
          type: 'samtale',
          isExpanded: true,
          data: {
            topic: raw.topic || raw.title || userPrompt || 'Samtale',
            durationMinutes: raw.durationMinutes || 12,
            organization: (raw.organization === 'Smågrupper' || raw.organization === 'Plenum') ? raw.organization : 'To-og-to',
            reflectionQuestions: Array.isArray(raw.reflectionQuestions) && raw.reflectionQuestions.length > 0
              ? raw.reflectionQuestions
              : [`Kva tenkjer du om ${userPrompt}?`, 'Har du opplevd noko liknande?', 'Kva kan vi lære av dette?'],
            summaryPoint: raw.summaryPoint || 'Felles oppsummering i plenum.',
          },
        };

      case 'reis_deg': {
        const rawStatements = Array.isArray(raw.statements) && raw.statements.length > 0
          ? raw.statements
          : [
              'dersom du har på deg noko blått',
              'dersom du likar taco betre enn pizza',
              'dersom du har vore på leir før',
              'dersom du stod opp før klokka 07:00 i dag',
            ];

        return {
          id,
          type: 'reis_deg',
          isExpanded: true,
          data: {
            title: raw.title || 'Reis deg',
            intro: raw.intro || 'Reis deg dersom påstanden passar for deg, sit ned dersom ikkje!',
            statements: rawStatements.map((st: any, i: number) => ({
              id: `rd_${Date.now()}_${i + 1}`,
              statement: typeof st === 'string' ? st : (st.statement || `Påstand ${i + 1}`),
            })),
            durationMinutes: raw.durationMinutes || 6,
          },
        };
      }

      case 'sang_salme': {
        const rawVerses = Array.isArray(raw.verses) && raw.verses.length > 0
          ? raw.verses
          : [raw.songText || 'Vers 1 av songen'];

        return {
          id,
          type: 'sang_salme',
          isExpanded: true,
          data: {
            title: raw.title || userPrompt || 'Song / Salme',
            songNumber: raw.songNumber || '',
            verses: rawVerses,
            durationMinutes: raw.durationMinutes || 5,
          },
        };
      }

      case 'quiz': {
        const isMc = (raw.quizType === 'mc' || raw.quizMode === 'multiple_choice' || quizMode === 'multiple_choice');
        const qType: 'mc' | 'open' = isMc ? 'mc' : 'open';

        const rawQuestions = Array.isArray(raw.quizQuestions) && raw.quizQuestions.length > 0 
          ? raw.quizQuestions 
          : [];

        const questions = rawQuestions.length > 0
          ? rawQuestions.map((q: any, i: number) => {
              const opts = Array.isArray(q.options) && q.options.length > 0
                ? q.options
                : [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean);
              const optA = q.optionA || opts[0] || (isMc ? 'Alternativ A' : '');
              const optB = q.optionB || opts[1] || (isMc ? 'Alternativ B' : '');
              const optC = q.optionC || opts[2] || (isMc ? 'Alternativ C' : '');
              const optD = q.optionD || opts[3] || '';
              let correct = (q.correctOption || 'A').toString().trim().toUpperCase();
              if (!['A', 'B', 'C', 'D'].includes(correct)) correct = 'A';

              return {
                id: `q_${Date.now()}_${i + 1}`,
                question: q.question || `Spørsmål ${i + 1} om ${userPrompt}`,
                optionA: isMc ? optA : '',
                optionB: isMc ? optB : '',
                optionC: isMc ? optC : '',
                optionD: isMc ? optD : '',
                correctOption: (isMc ? correct : 'A') as 'A' | 'B' | 'C' | 'D',
                explanation: q.answer || q.explanation || (isMc ? `Alternativ ${correct} er rett svar.` : ''),
              };
            })
          : [
              {
                id: `q_${Date.now()}_1`,
                question: `Kva handler ${userPrompt} om?`,
                optionA: isMc ? 'Nåde og kjærleik' : '',
                optionB: isMc ? 'Historisk hending' : '',
                optionC: isMc ? 'Ein viktig bodskap' : '',
                optionD: isMc ? 'Eit bilete på fellesskap' : '',
                correctOption: 'A' as const,
                explanation: isMc ? 'Alternativ A er det mest dekkjande svaret.' : 'Nåde og fellesskap.',
              },
            ];

        return {
          id,
          type: 'quiz',
          isExpanded: true,
          data: {
            title: raw.title || `Quiz: ${userPrompt}`,
            durationMinutes: raw.durationMinutes || (questions.length * 2),
            quizType: qType,
            questions,
            question: questions[0]?.question,
            optionA: questions[0]?.optionA,
            optionB: questions[0]?.optionB,
            optionC: questions[0]?.optionC,
            optionD: questions[0]?.optionD,
            correctOption: questions[0]?.correctOption || 'A',
            explanation: questions[0]?.explanation || '',
          },
        };
      }

      case 'kims_leik': {
        const count = (typeof raw.itemCount === 'number' && [12, 16, 20].includes(raw.itemCount))
          ? (raw.itemCount as 12 | 16 | 20)
          : kimsCount;

        const defaultItems = [
          { text: 'Gris', emoji: '🐷' },
          { text: 'Gullring', emoji: '💍' },
          { text: 'Sandal', emoji: '👡' },
          { text: 'Pengesekk', emoji: '🪙' },
          { text: 'Krukke', emoji: '🏺' },
          { text: 'Brød', emoji: '🍞' },
          { text: 'Vindrue', emoji: '🍇' },
          { text: 'Sau', emoji: '🐑' },
          { text: 'Krone', emoji: '👑' },
          { text: 'Bibel', emoji: '📖' },
          { text: 'Kors', emoji: '✝️' },
          { text: 'Stearinlys', emoji: '🕯️' },
          { text: 'Drakt', emoji: '🥋' },
          { text: 'Båt', emoji: '⛵' },
          { text: 'Trompet', emoji: '🎺' },
          { text: 'Hjarte', emoji: '❤️' },
          { text: 'Klippe', emoji: '🪨' },
          { text: 'Sol', emoji: '☀️' },
          { text: 'Kalk', emoji: '🍷' },
          { text: 'Due', emoji: '🕊️' },
        ];

        const rawList = Array.isArray(raw.kimsItems) && raw.kimsItems.length > 0
          ? raw.kimsItems
          : (Array.isArray(raw.items) && raw.items.length > 0 ? raw.items : defaultItems);

        const items = rawList.slice(0, count).map((it: any, i: number) => {
          if (typeof it === 'object' && it !== null) {
            return {
              id: `kims_item_${Date.now()}_${i}`,
              text: (it.text || `Gjenstand ${i + 1}`).trim(),
              iconName: (it.emoji || it.iconName || '').trim(),
            };
          }
          return {
            id: `kims_item_${Date.now()}_${i}`,
            text: String(it || `Gjenstand ${i + 1}`).trim(),
          };
        });

        while (items.length < count) {
          const fallback = defaultItems[items.length % defaultItems.length];
          items.push({
            id: `kims_item_${Date.now()}_${items.length}`,
            text: fallback.text,
            iconName: fallback.emoji,
          });
        }

        return {
          id,
          type: 'kims_leik',
          isExpanded: true,
          data: {
            title: raw.title || `Kims leik: ${userPrompt}`,
            itemCount: count,
            items,
            timerSeconds: 30,
            durationMinutes: 6,
          },
        };
      }

      case 'henteleik': {
        const defaultHent = ['Noko raudt', 'Ein blyant', 'Noko mjukt', 'Ein skolisse', 'Noko firkanta', 'Eit bilete'];
        const rawHent = Array.isArray(raw.items) && raw.items.length > 0 ? raw.items : defaultHent;
        const items = rawHent.map((hText: any, i: number) => ({
          id: `hent_item_${Date.now()}_${i}`,
          text: typeof hText === 'string' ? hText : (hText.text || `Gjenstand ${i + 1}`),
        }));

        return {
          id,
          type: 'henteleik',
          isExpanded: true,
          data: {
            title: raw.title || 'Henteleiken',
            intro: raw.intro || 'Finn fram det de trur laget treng!',
            items,
            teamCount: 2,
            teamNames: ['Lag 1', 'Lag 2'],
            durationMinutes: 8,
          },
        };
      }

      case 'bilete_avdekking':
        return {
          id,
          type: 'bilete_avdekking',
          isExpanded: true,
          data: {
            title: raw.title || 'Bilete-avdekking',
            imageUrl: raw.imageUrl || 'https://images.unsplash.com/photo-1548625361-12f5ea11a3b0?auto=format&fit=crop&w=1200&q=80',
            gridSize: raw.gridSize === 16 ? 16 : (gridSize || 9),
            solution: raw.solution || userPrompt || 'Løysing',
            clue: raw.clue || '',
            durationMinutes: raw.durationMinutes || 6,
          },
        };

      case 'beat_for_beat': {
        const words = Array.isArray(raw.words) && raw.words.length > 0
          ? raw.words
          : (raw.solution || userPrompt).split(/\s+/);

        return {
          id,
          type: 'beat_for_beat',
          isExpanded: true,
          data: {
            title: raw.title || 'Beat for beat',
            solution: raw.solution || userPrompt || 'Songtittel eller bibelvers',
            words,
            category: raw.category || 'Salme',
            durationMinutes: raw.durationMinutes || 8,
          },
        };
      }

      case 'ord_for_ord': {
        const words = Array.isArray(raw.words) && raw.words.length > 0
          ? raw.words
          : (raw.quote || raw.text || userPrompt).replace(/[\r\n]+/g, ' ').split(/\s+/).map((w: string) => w.trim()).filter(Boolean);

        return {
          id,
          type: 'ord_for_ord',
          isExpanded: true,
          data: {
            title: raw.title || `Ord for ord: ${userPrompt}`,
            quote: raw.quote || raw.text || userPrompt || 'Sitat eller bibelord',
            reference: raw.reference || raw.scriptureRef || '',
            words,
            hint: raw.hint || '',
            durationMinutes: raw.durationMinutes || 6,
          },
        };
      }

      case 'kven_skal_ut':
        return {
          id,
          type: 'kven_skal_ut',
          isExpanded: true,
          data: {
            title: raw.title || 'Kven skal ut?',
            optionA: raw.optionA || 'Peter',
            optionB: raw.optionB || 'Johannes',
            optionC: raw.optionC || 'Matteus',
            optionD: raw.optionD || 'Jakob',
            correctOption: (['A', 'B', 'C', 'D'].includes(raw.correctOption) ? raw.correctOption : 'C') as 'A' | 'B' | 'C' | 'D',
            explanation: raw.explanation || 'Matteus var tollar, dei tre andre var fiskarar.',
            durationMinutes: raw.durationMinutes || 5,
          },
        };

      case 'bilde': {
        const layout = selectedLayout || raw.layout || '1';
        let count = 1;
        if (layout === '2') count = 2;
        if (layout === '4') count = 4;

        const rawImages = Array.isArray(raw.images) ? raw.images : [];
        const series = Array.isArray(raw.seriesImages) ? raw.seriesImages : [];
        const seriesScenes = Array.isArray(raw.seriesScenes) ? raw.seriesScenes : [];
        const scenes = Array.isArray(raw.scenes) ? raw.scenes : [];

        const images = Array.from({ length: count }, (_, i) => {
          const item = rawImages[i];
          const url = (item && typeof item.url === 'string' && item.url.startsWith('http'))
            ? item.url
            : series[i] || CURATED_PHOTOS[(i + Math.floor(Math.random() * CURATED_PHOTOS.length)) % CURATED_PHOTOS.length];
          return {
            id: item?.id || `img_${Date.now()}_${i}`,
            url,
            label: item?.label || (layout === '1' ? 'Fokus' : ['A', 'B', 'C', 'D'][i] || String(i + 1)),
            sceneIndex: typeof item?.sceneIndex === 'number' ? item.sceneIndex : i,
            sceneNumber: typeof item?.sceneNumber === 'number' ? item.sceneNumber : (i + 1),
            totalScenes: item?.totalScenes || series.length || count,
            title: item?.title || '',
            leaderNote: item?.leaderNote || '',
          };
        });

        return {
          id,
          type: 'bilde',
          isExpanded: true,
          data: {
            title: raw.title || userPrompt || 'Bildevising',
            layout,
            images,
            seriesImages: series,
            seriesScenes,
            scenes,
            artStyle: raw.artStyle || artStyle,
            bibleBook: raw.bibleBook,
            bibleChapter: raw.bibleChapter,
            englishTitle: raw.englishTitle,
            leaderKeywords: raw.leaderKeywords || `Fokuspunkt for ${userPrompt}`,
            leaderElaboration: raw.leaderElaboration || 'Utdjupande refleksjonsspørsmål til forsamlinga.',
            durationMinutes: raw.durationMinutes || 5,
          },
        };
      }
    }
  };

  const handleSelectBlockType = (choice: SingleBlockChoice) => {
    setSelectedType(choice);
    setStep(2);
  };

  const handleConfirmInsert = () => {
    if (generatedBlock) {
      onInsertSingleBlock(generatedBlock);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden select-none">
        
        {/* TOPPLINJE / HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                AI-assistent
              </h2>
              <p className="text-xs text-slate-500">
                Skap én enkeltblokk tilpassa temaet ditt
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
            title="Lukk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PROGRESJONS-STRIPE */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              step === 1 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              1
            </span>
            <span className={step === 1 ? 'text-slate-900 font-bold' : 'text-slate-500'}>
              Vel typen
            </span>

            <span className="text-slate-300">•</span>

            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              step === 2 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              2
            </span>
            <span className={step === 2 ? 'text-slate-900 font-bold' : 'text-slate-500'}>
              Tema & Målgruppe
            </span>

            <span className="text-slate-300">•</span>

            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              step === 3 ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              3
            </span>
            <span className={step === 3 ? 'text-slate-900 font-bold' : 'text-slate-500'}>
              Forhandsvising
            </span>
          </div>

          <span className="text-[11px] text-slate-400 font-normal hidden sm:block">
            Steg {step} av 3
          </span>
        </div>

        {/* FEILMELDING */}
        {errorMsg && (
          <div className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-xs font-medium text-rose-800">
            {errorMsg}
          </div>
        )}

        {/* HOVUDINNHALD */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* ========================================================================= */}
          {/* STEG 1: VEL BLOKKTYPE (RUTENETT MED 4 REINE GRUPPER)                      */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Kva for ein type byggjestein vil du skape?
              </div>

              {BLOCK_GROUPS.map((group) => (
                <div key={group.id} className="space-y-1.5">
                  <div className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 px-0.5">
                    {group.title}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.items.map((opt) => {
                      const IconComp = opt.icon;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectBlockType(opt.id)}
                          className="p-3 rounded-xl border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50/90 text-left transition-all cursor-pointer shadow-2xs flex items-center gap-3 group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-700 transition-transform group-hover:scale-105">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                              <span className="truncate">{opt.title}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {opt.shortDesc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEG 2: TEMA OG MÅLGRUPPE (MINIMALISTISK INPUT)                           */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Vald blokk-badge */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px]">Vald blokk:</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-900 font-bold">
                    {getBlockItem(selectedType)?.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  Endre typen
                </button>
              </div>

              {/* Oppsettvalg og kunststil for Bilde */}
              {selectedType === 'bilde' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Oppsett (Layout)
                    </label>
                    <div className="flex items-center gap-2">
                      {(['1', '2', '4'] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setSelectedLayout(l)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors ${
                            selectedLayout === l
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {l === '1' ? '1 stort bilete' : l === '2' ? '2 ved sida' : '4 rutenett (2x2)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Kunststil for serien (Homogen biletkjelde)</span>
                      <span className="text-[10px] text-slate-500 font-normal">Sikrar einsarta stil i alle ruter</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ART_STYLE_OPTIONS.map((opt) => {
                        const isSelected = artStyle === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setArtStyle(opt.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-1 ring-slate-900'
                                : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-xl shrink-0 mt-0.5">{opt.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold truncate">{opt.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              </div>
                              <div className={`text-[10px] font-semibold mt-0.5 ${isSelected ? 'text-amber-300' : 'text-slate-500'}`}>
                                {opt.badge}
                              </div>
                              <p className={`text-[10px] mt-0.5 leading-snug line-clamp-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                {opt.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Val av tal på gjenstandar for Kims leik */}
              {selectedType === 'kims_leik' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Antall gjenstandar på storskjerm</span>
                    <span className="text-[10px] text-slate-500 font-normal">Rutenett tilpassar seg automatisk</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setKimsCount(12)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                        kimsCount === 12
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      12 gjenstandar (4×3)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKimsCount(16)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                        kimsCount === 16
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      16 gjenstandar (4×4 STANDARD)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKimsCount(20)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                        kimsCount === 20
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      20 gjenstandar (5×4)
                    </button>
                  </div>
                </div>
              )}

              {/* Val for Quiz: format og tal på spørsmål */}
              {selectedType === 'quiz' && (
                <div className="space-y-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  {/* Format */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Quiz-format</span>
                      <span className="text-[10px] text-slate-500 font-normal">Velg korleis spørsmåla skal svarast på</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setQuizMode('multiple_choice')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                          quizMode === 'multiple_choice'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Fleirval (A, B, C)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuizMode('open')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                          quizMode === 'open'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Opne spørsmål (utan alternativ)
                      </button>
                    </div>
                  </div>

                  {/* Antall spørsmål */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Antall spørsmål</span>
                      <span className="text-[10px] text-slate-500 font-normal">Lengde på quizen</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setQuizQuestionCount(3)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                          quizQuestionCount === 3
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        3 spørsmål
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuizQuestionCount(5)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                          quizQuestionCount === 5
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        5 spørsmål (Standard)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuizQuestionCount(8)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                          quizQuestionCount === 8
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        8 spørsmål
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tema / idé felt */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tema, bibeltekst eller stikkord
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Tema, bibeltekst eller stikkord..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-xs text-slate-900 bg-white resize-none"
                />
              </div>

              {/* Målgruppe piller */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Målgruppe
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TARGET_GROUPS.map((tg) => {
                    const isSelected = targetGroup === tg;

                    return (
                      <button
                        key={tg}
                        type="button"
                        onClick={() => setTargetGroup(tg)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {tg}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Handlingsknappar */}
              <div className="pt-3 flex flex-col gap-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Tilbake</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateBlock}
                    disabled={isGenerating || !prompt.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Genererer blokk...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Generer blokk</span>
                      </>
                    )}
                  </button>
                </div>

                {errorMsg && (
                  <p className="text-xs text-rose-600 font-medium text-right pr-1">
                    {errorMsg}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEG 3: FORHANDSVISING OG INNSETJING                                      */}
          {/* ========================================================================= */}
          {step === 3 && generatedBlock && (
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Forhandsvising av den genererte blokka:
              </div>

              {/* ARBEIDSBORD-KORT FORHANDSVISING */}
              <div className="p-4 rounded-xl border-2 border-slate-300 bg-white shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                      {generatedBlock.type}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {(generatedBlock.data as any).title || (generatedBlock.data as any).name || (generatedBlock.data as any).topic || 'Ny blokk'}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {(generatedBlock.data as any).durationMinutes || 8} min
                  </span>
                </div>

                {generatedBlock.type === 'bilde' && (() => {
                  const d = generatedBlock.data as any;
                  const layout = d.layout || '1';
                  const images = d.images || [];
                  const seriesScenes: any[] = d.seriesScenes || [];
                  const series: string[] = seriesScenes.length > 0 ? seriesScenes.map((s: any) => s.url) : (d.seriesImages || []);
                  const styleInfo = ART_STYLE_OPTIONS.find((s) => s.id === (d.artStyle || artStyle));

                  const handleCycleFrameScene = (frameIdx: number, delta: number) => {
                    const totalCount = seriesScenes.length > 0 ? seriesScenes.length : series.length;
                    if (totalCount <= 1) return;
                    const currentImg = images[frameIdx];

                    if (seriesScenes.length > 0) {
                      let currIdx = -1;
                      if (typeof currentImg.sceneNumber === 'number') {
                        currIdx = seriesScenes.findIndex((s) => s.sceneNumber === currentImg.sceneNumber);
                      }
                      if (currIdx === -1 && typeof currentImg.sceneIndex === 'number') {
                        currIdx = currentImg.sceneIndex;
                      }
                      if (currIdx === -1) {
                        currIdx = frameIdx;
                      }
                      const nextIdx = (currIdx + delta + seriesScenes.length) % seriesScenes.length;
                      const targetScene = seriesScenes[nextIdx];
                      const nextImages = [...images];
                      nextImages[frameIdx] = {
                        ...currentImg,
                        url: targetScene.url,
                        sceneNumber: targetScene.sceneNumber,
                        sceneIndex: nextIdx,
                        totalScenes: seriesScenes.length,
                        leaderNote: targetScene.description || currentImg.leaderNote,
                      };
                      setGeneratedBlock({
                        ...generatedBlock,
                        data: { ...d, images: nextImages },
                      });
                      return;
                    }

                    const currIdx = typeof currentImg.sceneIndex === 'number' ? currentImg.sceneIndex : frameIdx;
                    const nextIdx = (currIdx + delta + series.length) % series.length;
                    const nextImages = [...images];
                    nextImages[frameIdx] = {
                      ...currentImg,
                      url: series[nextIdx],
                      sceneIndex: nextIdx,
                      totalScenes: series.length,
                    };
                    setGeneratedBlock({
                      ...generatedBlock,
                      data: { ...d, images: nextImages },
                    });
                  };

                  const handleCycleAllImages = async () => {
                    if (seriesScenes.length > 0) {
                      const nextImages = images.map((img: any, i: number) => {
                        let curr = -1;
                        if (typeof img.sceneNumber === 'number') {
                          curr = seriesScenes.findIndex((s) => s.sceneNumber === img.sceneNumber);
                        }
                        if (curr === -1) curr = typeof img.sceneIndex === 'number' ? img.sceneIndex : i;
                        const next = (curr + 1) % seriesScenes.length;
                        const target = seriesScenes[next];
                        return {
                          ...img,
                          url: target.url,
                          sceneNumber: target.sceneNumber,
                          sceneIndex: next,
                          totalScenes: seriesScenes.length,
                          leaderNote: target.description || img.leaderNote,
                        };
                      });
                      setGeneratedBlock({
                        ...generatedBlock,
                        data: { ...d, images: nextImages },
                      });
                      return;
                    }

                    const count = layout === '4' ? 4 : layout === '2' ? 2 : 1;
                    if (series.length >= count) {
                      const nextImages = images.map((img: any, i: number) => {
                        const curr = typeof img.sceneIndex === 'number' ? img.sceneIndex : i;
                        const next = (curr + 1) % series.length;
                        return {
                          ...img,
                          url: series[next],
                          sceneIndex: next,
                          totalScenes: series.length,
                        };
                      });
                      setGeneratedBlock({
                        ...generatedBlock,
                        data: { ...d, images: nextImages },
                      });
                      return;
                    }
                    await handleGenerateBlock();
                  };

                  const handleReplaceSingleImage = async (idx: number, norwegianQuery: string) => {
                    if (!norwegianQuery.trim()) return;
                    setSearchingFrameIdx(idx);
                    try {
                      // 1. Intelligent Gemini-omsetjing frå norsk bibeluttrykk til engelsk visuelt søkemotiv & scene-match
                      const scenesList = d.scenes || (seriesScenes.length > 0 ? seriesScenes.map((s: any) => ({ sceneNumber: s.sceneNumber, description: s.title || s.description })) : []);
                      const { englishQuery, matchedSceneNumber } = await translateNorwegianQuery(norwegianQuery, prompt, artStyle, scenesList);

                      // Dersom Gemini fann eit eksakt scenenummer i Sweet Publishing-serien:
                      if (typeof matchedSceneNumber === 'number' && seriesScenes.length > 0) {
                        const matchIdx = seriesScenes.findIndex((s) => s.sceneNumber === matchedSceneNumber);
                        if (matchIdx !== -1) {
                          const found = seriesScenes[matchIdx];
                          const nextImages = [...images];
                          nextImages[idx] = {
                            ...nextImages[idx],
                            url: found.url,
                            sceneNumber: found.sceneNumber,
                            sceneIndex: matchIdx,
                            totalScenes: seriesScenes.length,
                            leaderNote: found.description || norwegianQuery,
                          };
                          setGeneratedBlock({
                            ...generatedBlock,
                            data: { ...d, images: nextImages },
                          });
                          return;
                        }
                      }

                      // 2. Søk i Wikimedia Commons med stilfilter
                      const results = await searchWikimediaCommons(englishQuery, artStyle);
                      const newUrl = results[0] || CURATED_PHOTOS[Math.floor(Math.random() * CURATED_PHOTOS.length)];
                      const nextImages = [...images];
                      nextImages[idx] = {
                        ...nextImages[idx],
                        url: newUrl,
                        leaderNote: norwegianQuery,
                      };
                      setGeneratedBlock({
                        ...generatedBlock,
                        data: { ...d, images: nextImages },
                      });
                    } catch (err) {
                      console.warn('Feil ved utskifting av bilete:', err);
                    } finally {
                      setSearchingFrameIdx(null);
                    }
                  };

                  return (
                    <div className="space-y-3 text-xs text-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                            Bildevising ({layout === '1' ? '1 stort' : layout === '2' ? '2 ved sida' : '4 rutenett'})
                          </span>
                          {styleInfo && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                              {styleInfo.icon} {styleInfo.label}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleCycleAllImages}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Bla / Roter alle</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {images.map((img: any, i: number) => {
                          const currentSceneNum = typeof img.sceneNumber === 'number' ? img.sceneNumber : ((typeof img.sceneIndex === 'number' ? img.sceneIndex : i) + 1);
                          const totalScenes = seriesScenes.length || img.totalScenes || series.length || images.length;
                          const isSearchingThis = searchingFrameIdx === i;

                          return (
                            <div key={img.id || i} className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                              {/* Biletramme */}
                              <div className="relative w-full h-40 rounded-lg overflow-hidden flex items-center justify-center bg-stone-950 border border-stone-800">
                                <span className="absolute top-2 left-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/75 text-white border border-white/10 z-10">
                                  {img.label}
                                </span>

                                {/* Bla i serien med enkle piler */}
                                {(seriesScenes.length > 1 || series.length > 1) && (
                                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/80 rounded-md px-1.5 py-0.5 border border-white/10 text-[10px] font-medium text-white z-10">
                                    <button
                                      type="button"
                                      onClick={() => handleCycleFrameScene(i, -1)}
                                      title="Førre scene i serien"
                                      className="p-0.5 hover:text-amber-400 cursor-pointer"
                                    >
                                      <ChevronLeftIcon className="w-3 h-3" />
                                    </button>
                                    <span className="font-mono px-0.5">
                                      Scene {currentSceneNum}/{totalScenes}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCycleFrameScene(i, 1)}
                                      title="Neste scene i serien"
                                      className="p-0.5 hover:text-amber-400 cursor-pointer"
                                    >
                                      <ChevronRightIcon className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}

                                {img.url ? (
                                  <img src={img.url} alt="" className="max-h-full max-w-full object-contain" />
                                ) : (
                                  <span className="text-stone-500 text-xs">Mangler bilde</span>
                                )}
                              </div>

                              {/* Intelligent søkefelt med norsk omsetjing */}
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <input
                                  type="text"
                                  placeholder={`Søk scene for ${img.label} (f.eks. «Mata grisene»)...`}
                                  disabled={isSearchingThis}
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      await handleReplaceSingleImage(i, (e.target as HTMLInputElement).value);
                                    }
                                  }}
                                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-stone-700 bg-stone-800 text-stone-100 placeholder:text-stone-500 text-[11px] focus:outline-none focus:border-stone-500"
                                />
                                <button
                                  type="button"
                                  disabled={isSearchingThis}
                                  onClick={async (e) => {
                                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                    await handleReplaceSingleImage(i, input?.value);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-white text-[11px] font-semibold cursor-pointer transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
                                >
                                  {isSearchingThis ? (
                                    <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                                  ) : (
                                    <span>Søk</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {generatedBlock.type === 'tekst' && (() => {
                  const d = generatedBlock.data as any;
                  return (
                    <div className="space-y-2 text-xs text-slate-700 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="font-bold text-slate-900 text-sm">{d.title}</div>
                      {d.text && <p className="text-slate-800 leading-relaxed font-medium">{d.text}</p>}
                      {d.subtitle && <p className="text-slate-500 italic">{d.subtitle}</p>}
                      {d.leaderNotes && (
                        <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                          <span className="font-bold text-slate-700">Talernotat: </span>
                          {d.leaderNotes}
                        </div>
                      )}
                      {generatedBlock.stikkordItems && generatedBlock.stikkordItems.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/80 space-y-1">
                          <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Moment / Stikkord:</span>
                          <ul className="space-y-1 pl-1">
                            {generatedBlock.stikkordItems.map((item, idx) => (
                              <li key={item.id || idx} className="text-[11px] text-slate-700 flex items-start gap-1.5">
                                <span className="w-4 h-4 rounded bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div>
                                  <span className="font-bold">{item.title}</span>
                                  {item.detail && <span className="text-slate-500"> — {item.detail}</span>}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {generatedBlock.type === 'bibelord' && (() => {
                  const d = generatedBlock.data as any;
                  return (
                    <div className="space-y-2 text-xs text-slate-700 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                      <div className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                        <BookMarked className="w-4 h-4 text-amber-700" />
                        <span>{d.scriptureRef}</span>
                      </div>
                      <p className="text-slate-800 italic font-serif leading-relaxed">
                        «{d.keyVerse || d.bibleText}»
                      </p>
                      {d.reflectionQuestion && (
                        <p className="text-amber-900 font-medium pt-1.5 border-t border-amber-200/60">
                          <span className="font-bold">Refleksjon: </span>{d.reflectionQuestion}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {generatedBlock.type === 'bonn_dikt' && (() => {
                  const d = generatedBlock.data as any;
                  return (
                    <div className="space-y-2 text-xs text-slate-700 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 text-center">
                      <div className="font-bold text-indigo-950 text-sm">{d.title || 'Bøn / Dikt'}</div>
                      <p className="text-slate-800 whitespace-pre-line leading-relaxed font-serif italic">
                        {d.text}
                      </p>
                      {d.responsiveReading && (
                        <div className="pt-2 border-t border-indigo-200/60 text-indigo-900 font-bold text-[11px]">
                          Alle: {d.responsiveReading}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {generatedBlock.type === 'informasjon' && (() => {
                  const d = generatedBlock.data as any;
                  return (
                    <div className="space-y-2 text-xs text-slate-700 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-sky-600" />
                        <span>{d.heading}</span>
                      </div>
                      {Array.isArray(d.practicalPoints) && d.practicalPoints.length > 0 && (
                        <ul className="space-y-1 pl-2">
                          {d.practicalPoints.map((pt: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {d.noticeBox && (
                        <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-[11px]">
                          {d.noticeBox}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {generatedBlock.type === 'samtale' && (() => {
                  const d = generatedBlock.data as any;
                  return (
                    <div className="space-y-2 text-xs text-slate-700 p-3.5 rounded-xl bg-sky-50/60 border border-sky-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sky-950 text-sm">{d.topic}</span>
                        <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-extrabold uppercase">
                          {d.organization || 'To-og-to'}
                        </span>
                      </div>
                      <div className="space-y-1 pt-1">
                        <span className="font-bold text-sky-900 text-[11px] uppercase tracking-wider">Refleksjonsspørsmål:</span>
                        <ul className="space-y-1 pl-1">
                          {(d.reflectionQuestions || []).map((q: string, i: number) => (
                            <li key={i} className="text-slate-800 flex items-start gap-1.5">
                              <span className="font-bold text-sky-700 shrink-0">•</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()}

                {generatedBlock.type === 'reis_deg' && (() => {
                  const d = generatedBlock.data as any;
                  const stList: any[] = d.statements || [];
                  return (
                    <div className="space-y-2 text-xs text-slate-700 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
                      <div className="font-bold text-amber-950 text-sm">{d.title || 'Reis deg'}</div>
                      {d.intro && <p className="text-slate-600 italic text-[11px]">{d.intro}</p>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {stList.map((st: any, i: number) => (
                          <div key={st.id || i} className="p-2 rounded-lg bg-white border border-amber-200/80 text-[11px] text-slate-800 flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-amber-200 text-amber-900 font-bold text-[9px] flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <span className="truncate">{typeof st === 'string' ? st : st.statement}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {generatedBlock.type === 'sang_salme' && (() => {
                  const d = generatedBlock.data as any;
                  const verses: string[] = d.verses || [];
                  return (
                    <div className="space-y-2 text-xs text-slate-700 p-3.5 rounded-xl bg-violet-50/50 border border-violet-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-violet-950 text-sm">{d.title}</span>
                        {d.songNumber && (
                          <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-800 text-[10px] font-bold">
                            {d.songNumber}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
                        {verses.map((v: string, i: number) => (
                          <div key={i} className="p-2 rounded-lg bg-white border border-violet-100 text-[11px] text-slate-800 whitespace-pre-line leading-relaxed">
                            <span className="font-bold text-violet-700 mr-1.5">Vers {i + 1}:</span>
                            {v}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {generatedBlock.type === 'quiz' && (() => {
                  const d = generatedBlock.data as any;
                  const questions: any[] = d.questions || [];
                  const isMc = d.quizType !== 'open';

                  return (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                        <span className="font-bold text-violet-950 flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4 text-violet-600" />
                          <span>{d.title || 'Quiz'} ({questions.length} spørsmål • {isMc ? 'Fleirval' : 'Opne spørsmål'})</span>
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {d.durationMinutes || (questions.length * 2)} min
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {questions.map((q: any, idx: number) => {
                          const correctLetter = (q.correctOption || 'A').toUpperCase();

                          return (
                            <div
                              key={q.id || idx}
                              className="p-3 rounded-xl border border-violet-100 bg-violet-50/40 space-y-2 text-xs"
                            >
                              <div className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-md bg-violet-200 text-violet-800 font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <p className="font-bold text-slate-900 leading-snug flex-1">
                                  {q.question}
                                </p>
                              </div>

                              {isMc ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-7">
                                  {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                                    const optKey = `option${letter}`;
                                    const optVal = q[optKey];
                                    if (!optVal) return null;
                                    const isCorrect = correctLetter === letter;

                                    return (
                                      <div
                                        key={letter}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] ${
                                          isCorrect
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold ring-1 ring-emerald-300'
                                            : 'bg-white border-slate-200 text-slate-700'
                                        }`}
                                      >
                                        <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                          {letter}
                                        </span>
                                        <span className="flex-1 truncate">{optVal}</span>
                                        {isCorrect && (
                                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="pl-7 pt-0.5">
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-semibold">
                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Fasit: {q.explanation || 'Ingen fasit oppgitt'}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {generatedBlock.type === 'kims_leik' && (() => {
                  const d = generatedBlock.data as any;
                  const items: any[] = d.items || [];
                  const count = d.itemCount || items.length || 16;
                  const gridCols = count === 20 
                    ? 'grid-cols-4 sm:grid-cols-5' 
                    : count === 12 
                    ? 'grid-cols-3 sm:grid-cols-4' 
                    : 'grid-cols-4';

                  return (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 text-amber-700" />
                          <span>Kims leik: {count} gjenstandar ({count === 12 ? '4×3' : count === 16 ? '4×4' : '5×4'})</span>
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {d.timerSeconds || 30} sek hugsetid
                        </span>
                      </div>

                      <div className={`grid ${gridCols} gap-2 p-2.5 bg-amber-50/50 rounded-xl border border-amber-200/70`}>
                        {items.slice(0, count).map((it: any, idx: number) => {
                          const graphic = getItemGraphic(it);
                          return (
                            <div
                              key={it.id || idx}
                              className="p-2 rounded-lg bg-white border border-amber-200/60 shadow-2xs flex flex-col items-center justify-center text-center space-y-1"
                            >
                              <span className="text-2xl sm:text-3xl">{graphic.emoji}</span>
                              <span className="text-[10px] font-extrabold text-slate-900 truncate max-w-full">
                                {it.text || graphic.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {generatedBlock.type === 'henteleik' && (() => {
                  const d = generatedBlock.data as any;
                  const items: any[] = d.items || [];
                  return (
                    <div className="space-y-2 text-xs text-slate-700 p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                      <div className="font-bold text-emerald-950 text-sm flex items-center justify-between">
                        <span>{d.title || 'Henteleiken'}</span>
                        <span className="text-[10px] text-emerald-700 font-extrabold">{items.length} gjenstandar</span>
                      </div>
                      {d.intro && <p className="text-slate-600 text-[11px] italic">{d.intro}</p>}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {items.map((it: any, i: number) => (
                          <span key={it.id || i} className="px-2.5 py-1 rounded-md bg-white border border-emerald-200 text-[11px] font-semibold text-slate-800">
                            {i + 1}. {typeof it === 'string' ? it : it.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {generatedBlock.type === 'bilete_avdekking' && (() => {
                  const d = generatedBlock.data as any;
                  return (
                    <div className="space-y-2 text-xs text-slate-700 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-900 text-sm">
                        <span>{d.title || 'Bilete-avdekking'}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">
                          {d.gridSize || 9} ruter ({d.gridSize === 16 ? '4×4' : '3×3'})
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold">
                        Løysing (Fasit): {d.solution}
                      </div>
                      {d.clue && (
                        <p className="text-slate-600 italic text-[11px]">
                          Hint: {d.clue}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {generatedBlock.type === 'beat_for_beat' && (() => {
                  const d = generatedBlock.data as any;
                  const words: string[] = d.words || [];
                  return (
                    <div className="space-y-2 text-xs text-slate-700 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 text-sm">{d.title || 'Beat for beat'}</span>
                        {d.category && (
                          <span className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 text-[10px] font-extrabold uppercase">
                            {d.category}
                          </span>
                        )}
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-amber-200 text-amber-950 font-bold">
                        Svar (Fasit): {d.solution}
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {words.map((w: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-200">
                            {i + 1}. {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {generatedBlock.type === 'ord_for_ord' && (() => {
                  const d = generatedBlock.data as any;
                  const words: string[] = d.words || [];
                  return (
                    <div className="space-y-2 text-xs text-slate-700 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-950 text-sm">{d.title || 'Ord for ord'}</span>
                        {d.reference && (
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 text-[10px] font-extrabold">
                            {d.reference}
                          </span>
                        )}
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-indigo-200 text-indigo-950 font-bold">
                        Sitat: {d.quote}
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {words.map((w: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 text-[11px] font-bold border border-indigo-200">
                            {i + 1}. {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {generatedBlock.type === 'kven_skal_ut' && (() => {
                  const d = generatedBlock.data as any;
                  const correct = d.correctOption || 'A';
                  return (
                    <div className="space-y-2 text-xs text-slate-700 p-3.5 rounded-xl bg-violet-50/50 border border-violet-200">
                      <div className="font-bold text-violet-950 text-sm">{d.title || 'Kven skal ut?'}</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                          const optVal = d[`option${letter}`];
                          if (!optVal) return null;
                          const isCorrect = correct === letter;
                          return (
                            <div
                              key={letter}
                              className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold ring-1 ring-emerald-300'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <span>{letter}: {optVal}</span>
                              {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                      {d.explanation && (
                        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-semibold">
                          Fasitforklaring: {d.explanation}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Handlingsknappar nedst i Steg 3 */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Avbryt
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Juster / Prøv igjen
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmInsert}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Set inn på arbeidsbordet</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
