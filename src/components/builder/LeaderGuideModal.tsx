/**
 * src/components/builder/LeaderGuideModal.tsx
 * Fyldig «Leiarhefte» i 3-delt struktur tilpassa A5-hefte / A4-utskrift:
 * 
 * - DEL 1: Teologisk og fagleg bakgrunnsstoff (Sakprosa: bakgrunn om temaet, bibelteksten si historiske/teologiske ramme, pedagogiske fallgruver og gode innfallsvinklar)
 * - DEL 2: Steg-for-steg regi og manus (Handlingsmanus i 2 kolonner per kloss: Kva som står på storskjermen til venstre, og kva leiaren seier og gjer til høgre)
 * - DEL 3: Kompakt køyreplan (Tidslinje, kloss-typar, tidsbruk i minutt og tekniske stikkord)
 * - Utskriftsstil (@media print) med 14–15pt brødtekst for A5-heftebretting og page-break-inside: avoid på kvar kloss/seksjon.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { TeachingSession, TeachingBlock, AiStoryboard, StoryboardBriefing, BlockType } from '../../types';
import { BLOCK_METADATA, normalizeBlockType } from '../../lib/undervisningDefaults';
import {
  Printer,
  X,
  Clock,
  BookOpen,
  Monitor,
  Copy,
  Check,
  EyeOff,
  Compass,
  GraduationCap,
  HeartHandshake,
  Wrench,
  CheckCircle2,
  Pencil,
  LayoutList,
  Calendar,
  ListChecks,
} from 'lucide-react';

interface LeaderGuideModalProps {
  session: TeachingSession;
  storyboard?: AiStoryboard | null;
  briefingData?: StoryboardBriefing | null;
  onClose: () => void;
  onSwitchToCompactPlan?: () => void;
  onUpdateSessionMeta?: (updates: Partial<TeachingSession>) => void;
  onUpdateSession?: (updates: Partial<TeachingSession>) => void;
  onUpdateBlock?: (blockId: string, updatedBlock: Partial<TeachingBlock>) => void;
}

/**
 * Sikker konvertering til tekst slik at React aldri krasjar dersom eit felt er eit objekt eller undefined.
 */
function safeText(val: any, fallback: string = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val.trim() || fallback;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    const candidate =
      val.text ??
      val.keyword ??
      val.heading ??
      val.title ??
      val.name ??
      val.statement ??
      val.label ??
      val.note ??
      val.leaderNotes ??
      val.detail ??
      '';
    if (typeof candidate === 'string') return candidate.trim() || fallback;
    if (typeof candidate === 'number') return String(candidate);
  }
  return fallback;
}

export const LeaderGuideModal: React.FC<LeaderGuideModalProps> = ({
  session,
  storyboard,
  briefingData,
  onClose,
  onSwitchToCompactPlan,
  onUpdateSessionMeta,
  onUpdateSession,
  onUpdateBlock,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingGuide, setIsEditingGuide] = useState(false);
  // Lokal kopi av manus per blokk for direkte redigering
  const [blockScripts, setBlockScripts] = useState<Record<string, string>>({});

  const safeSession = session || ({} as TeachingSession);
  const activeStoryboard = storyboard || safeSession.storyboard || null;
  const activeBriefing = briefingData || safeSession.briefingData || null;

  // Hent aktive blokker trygt frå arbeidsbordet; viss bordet er tomt men storyboard finst, bygg trygge visningsblokker frå storyboardet
  const currentBlocks: TeachingBlock[] = useMemo(() => {
    if (Array.isArray(safeSession.blocks) && safeSession.blocks.length > 0) {
      return safeSession.blocks.filter(Boolean);
    }
    if (Array.isArray(activeStoryboard?.sections) && activeStoryboard!.sections.length > 0) {
      return activeStoryboard!.sections.filter(Boolean).map((sec, idx) => {
        const safeType = normalizeBlockType(sec?.blockType || 'stikkord') as BlockType;
        return {
          id: sec?.id || `sb_sec_${idx}`,
          type: safeType,
          title: safeText(sec?.title, `Bolk ${idx + 1}`),
          leaderNotes: safeText(sec?.leaderScript, ''),
          data: {
            title: safeText(sec?.title, `Bolk ${idx + 1}`),
            durationMinutes: typeof sec?.durationMinutes === 'number' ? sec.durationMinutes : 5,
            slideText: safeText(sec?.bigScreenSummary, ''),
            leaderNotes: safeText(sec?.leaderScript, ''),
            notes: safeText(sec?.leaderScript, ''),
          },
        };
      });
    }
    return [];
  }, [safeSession.blocks, activeStoryboard]);

  // Beregn total tid (svarte skjermar med 0 min tel som 0)
  const totalMinutes = currentBlocks.reduce((acc, b) => {
    if (!b) return acc;
    const bType = normalizeBlockType(b.type || 'stikkord') as BlockType;
    const rawMins =
      b.data?.durationMinutes ??
      (bType === 'svart_skjerm' ? 0 : (BLOCK_METADATA[bType]?.defaultMinutes ?? 5));
    const mins = Number(rawMins);
    return acc + (isNaN(mins) || mins < 0 ? 0 : mins);
  }, 0);

  // Bygg tidslinje med start- og sluttidspunkt
  const blocksWithTime = useMemo(() => {
    let accumulatedMinutes = 0;
    return currentBlocks.map((block, index) => {
      const safeType = normalizeBlockType(block?.type || 'stikkord') as BlockType;
      const rawDuration =
        block?.data?.durationMinutes ??
        (safeType === 'svart_skjerm' ? 0 : (BLOCK_METADATA[safeType]?.defaultMinutes ?? 5));
      const safeDuration = isNaN(Number(rawDuration)) || Number(rawDuration) < 0 ? 0 : Number(rawDuration);

      const startMin = accumulatedMinutes;
      const endMin = accumulatedMinutes + safeDuration;
      accumulatedMinutes = endMin;

      const formatMMSS = (m: number) => `${String(m).padStart(2, '0')}:00`;
      const timeStampRange =
        safeType === 'svart_skjerm' && safeDuration === 0
          ? 'Pause / Svart skjerm (0 min)'
          : `${formatMMSS(startMin)}–${formatMMSS(endMin)} (${safeDuration} min)`;

      const compactTimeRange =
        safeType === 'svart_skjerm' && safeDuration === 0
          ? 'Pause'
          : `${String(startMin).padStart(2, '0')}–${String(endMin).padStart(2, '0')} m`;

      const matchingStoryboardSection =
        activeStoryboard?.sections?.[index] ||
        activeStoryboard?.sections?.find(
          (s) =>
            s &&
            (safeText(s.title) === safeText(block?.data?.title) ||
              normalizeBlockType(s.blockType) === safeType)
        );

      return {
        block: {
          ...block,
          type: safeType,
          data: block?.data && typeof block.data === 'object' ? block.data : {},
        },
        index,
        startMin,
        endMin,
        duration: safeDuration,
        timeStampRange,
        compactTimeRange,
        matchingStoryboardSection,
      };
    });
  }, [currentBlocks, activeStoryboard]);

  // Initialiser og synkroniser manus per blokk
  useEffect(() => {
    const initial: Record<string, string> = {};
    blocksWithTime.forEach((item) => {
      const blockId = item.block.id;
      initial[blockId] =
        item.block.data?.notes ||
        (item.block as any).notes ||
        item.block.leaderNotes ||
        item.block.data?.leaderNotes ||
        item.block.data?.explanation ||
        (item.block as any).description ||
        item.matchingStoryboardSection?.leaderScript ||
        '';
    });
    setBlockScripts(initial);
  }, [blocksWithTime]);

  // Syntetiser standardtekstar for DEL 1 dersom dei ikkje er eksplisitt utfylte
  const defaultRedThread = (() => {
    if (safeText(safeSession.introBackground?.redThread)) return safeText(safeSession.introBackground?.redThread);
    if (safeText(safeSession.description)) return safeText(safeSession.description);
    if (safeText(activeStoryboard?.redThread)) return safeText(activeStoryboard?.redThread);
    const bibelBlock = currentBlocks.find((b) => b?.type === 'bibelord');
    const stikkordBlock = currentBlocks.find((b) => b?.type === 'stikkord' || b?.type === 'tekst');
    const bibleRef = safeText(bibelBlock?.data?.reference || bibelBlock?.data?.scriptureRef);
    if (bibleRef) {
      return `Møte bodskapen i ${bibleRef} på ein nær, livsnær og trygg måte i kvardagen til ungdommane.`;
    }
    const stikkordTitle = safeText(stikkordBlock?.data?.title);
    if (stikkordTitle) {
      return `${stikkordTitle} – å gi ungdommane rom for undring, fellesskap og eigen refleksjon rundt temaet «${safeText(safeSession.title, 'Samlinga')}».`;
    }
    return `Gi deltakarane ei trygg, engasjerande og meiningsfull samling rundt temaet «${safeText(safeSession.title, 'Samlinga')}», der både hovud, hjarte og fellesskap får plass.`;
  })();

  const defaultTheologicalBackground = (() => {
    if (safeText(safeSession.introBackground?.theologicalBackground)) return safeText(safeSession.introBackground?.theologicalBackground);
    if (safeText(safeSession.theologicalBackground)) return safeText(safeSession.theologicalBackground);
    if (safeText(activeStoryboard?.theologicalBackground)) return safeText(activeStoryboard?.theologicalBackground);

    const parts: string[] = [];
    if (safeText(activeBriefing?.prompt)) {
      parts.push(`Utgangspunkt og bestilling for samlinga: «${safeText(activeBriefing?.prompt)}».`);
    }
    if (safeText(activeBriefing?.pastedSourceText)) {
      const rawSource = safeText(activeBriefing?.pastedSourceText);
      const excerpt = rawSource.slice(0, 450);
      parts.push(`Frå kjeldetekst og førebuing: ${excerpt}${rawSource.length > 450 ? '...' : ''}`);
    }
    if (Array.isArray(activeBriefing?.sourceDocuments) && activeBriefing!.sourceDocuments.length > 0) {
      const docNames = activeBriefing!.sourceDocuments
        .map((d) => safeText(d?.name))
        .filter(Boolean)
        .join(', ');
      if (docNames) {
        parts.push(`Kjeldedokument nytta i førebuinga: ${docNames}.`);
      }
    }

    const bibleBlocks = currentBlocks.filter((b) => b?.type === 'bibelord' || b?.type === 'bildebibelen');
    if (bibleBlocks.length > 0) {
      const refs = bibleBlocks
        .map((b) => safeText(b?.data?.reference || b?.data?.scriptureRef || b?.data?.storyTitle || b?.data?.title))
        .filter(Boolean)
        .join(', ');
      if (refs) {
        parts.push(
          `Historisk og teologisk ramme: Sentrale bibeltekstar og forteljingar i denne samlinga er ${refs}. Les gjerne gjennom konteksten i Bibelen på førehand, slik at du kan formidle forteljinga med eigne ord og kople den til ungdommane sine liv.`
        );
      }
    }

    if (parts.length === 0) {
      parts.push(
        `Temaet «${safeText(safeSession.title, 'Samlinga')}» handlar om å kople kristen tru, bibeltekst og tradisjon til dei store spørsmåla ungdommar ber på i dag. Som leiar treng du ikkje ha ferdige svar på alt – det viktigaste er å opne opp teksten og tematikken slik at ungdommane opplever at kyrkja er ein stad der heile livet og alle spørsmål har plass.`
      );
    }
    return parts.join('\n\n');
  })();

  const defaultPedagogicalTips = (() => {
    if (safeText(safeSession.introBackground?.pedagogicalTips)) return safeText(safeSession.introBackground?.pedagogicalTips);
    if (safeText(safeSession.pedagogicalTips)) return safeText(safeSession.pedagogicalTips);
    if (safeText(activeStoryboard?.pedagogicalTips)) return safeText(activeStoryboard?.pedagogicalTips);

    const hasSamtale = currentBlocks.some((b) => b?.type === 'samtale');
    const hasGame = currentBlocks.some((b) =>
      ['henteleik', 'kims_leik', 'reis_deg', 'bilete_avdekking', 'quiz', 'kven_skal_ut', 'beat_for_beat', 'ord_for_ord'].includes(String(b?.type))
    );
    const hasPrayer = currentBlocks.some((b) => b?.type === 'bonn_dikt');

    const tips: string[] = [
      '• Gode innfallsvinklar: For ungdommar kan abstrakte teologiske omgrep fort bli fjerne. Bruk konkrete døme frå kvardag, vennskap, sosiale medium og val ungdommane kjenner seg igjen i.',
    ];
    if (hasGame) {
      tips.push(
        '• Aktivitet og overgangar: Samlinga startar med og inneheld fysiske eller visuelle aktivitetar. Bruk energien frå aktiviteten som ein naturleg inngang til temaet, men hjelp gruppa med å lande roleg før de går over i formidling eller bibeltekst.'
      );
    }
    if (hasSamtale) {
      tips.push(
        '• Trygg samtale: La ungdommane få tenkje i 15 sekund eller snakke to-og-to før du ber nokon dele høgt i plenum. Det senkar terskelen for dei som er sjenerte.'
      );
    }
    if (hasPrayer) {
      tips.push(
        '• Avrunding og bøn: Ver tydeleg og trygg i overgangen til bøn. Fortel kort kva som skal skje før de ber, slik at også ungdommar som er uvande med kyrkjerommet kjenner seg heilt trygge.'
      );
    }
    return tips.join('\n');
  })();

  const [redThreadText, setRedThreadText] = useState(defaultRedThread);
  const [theologicalText, setTheologicalText] = useState(defaultTheologicalBackground);
  const [pedagogicalText, setPedagogicalText] = useState(defaultPedagogicalTips);

  const handleSaveAllGuideEdits = () => {
    const updatedBlocks = Array.isArray(safeSession.blocks) && safeSession.blocks.length > 0
      ? safeSession.blocks.map((b) => {
          if (!b) return b;
          const editedScript = blockScripts[b.id];
          if (editedScript === undefined) return b;
          const updatedBlock: TeachingBlock = {
            ...b,
            leaderNotes: editedScript,
            ...( { notes: editedScript } as any ),
            data: {
              ...(b.data && typeof b.data === 'object' ? b.data : {}),
              notes: editedScript,
              leaderNotes: editedScript,
              ...(b.type === 'bibelord' ? { explanation: editedScript } : {}),
            },
          };
          onUpdateBlock?.(b.id, updatedBlock);
          return updatedBlock;
        })
      : safeSession.blocks;

    const updatedStoryboard: AiStoryboard | null = activeStoryboard
      ? {
          ...activeStoryboard,
          redThread: redThreadText,
          theologicalBackground: theologicalText,
          pedagogicalTips: pedagogicalText,
          sections: Array.isArray(activeStoryboard.sections)
            ? activeStoryboard.sections.map((sec, idx) => {
                const matchingBlockId =
                  blocksWithTime[idx]?.block?.id || sec?.id || `sb_sec_${idx}`;
                const editedScript = blockScripts[matchingBlockId] ?? blockScripts[sec?.id];
                if (editedScript === undefined) return sec;
                return {
                  ...sec,
                  leaderScript: editedScript,
                };
              })
            : [],
        }
      : null;

    const sessionUpdates: Partial<TeachingSession> = {
      description: redThreadText,
      theologicalBackground: theologicalText,
      pedagogicalTips: pedagogicalText,
      introBackground: {
        redThread: redThreadText,
        theologicalBackground: theologicalText,
        pedagogicalTips: pedagogicalText,
      },
      ...(Array.isArray(updatedBlocks) && updatedBlocks.length > 0 ? { blocks: updatedBlocks } : {}),
      ...(updatedStoryboard ? { storyboard: updatedStoryboard } : {}),
    };

    onUpdateSession?.(sessionUpdates);
    onUpdateSessionMeta?.(sessionUpdates);
  };

  // Kva storskjermen viser (venstre kolonne i DEL 2, ca. 35 %) - 100 % sikra og kompakt for A5
  const renderBigScreenContent = (block: TeachingBlock, fallbackSummary?: string) => {
    const d = (block?.data && typeof block.data === 'object' ? block.data : {}) as any;

    switch (block.type) {
      case 'svart_skjerm':
        return (
          <div className="space-y-0.5 text-slate-600 print-screen-col">
            <p className="font-semibold text-slate-800">⬛ Svart skjerm (Pause)</p>
            {safeText(d.instruction) && <p>{safeText(d.instruction)}</p>}
          </div>
        );

      case 'bibelord': {
        const ref = safeText(d.reference || d.scriptureRef || d.bibleRef);
        const verse = safeText(d.verseText || d.bibleText || d.keyVerse, fallbackSummary || 'Bibeltekst på storskjerm');
        return (
          <div className="space-y-1 text-slate-600 print-screen-col">
            {ref && <div className="font-bold text-slate-800">📖 {ref}</div>}
            <blockquote className="italic text-slate-700 font-serif leading-snug border-l-2 border-slate-300 pl-2">
              {verse.startsWith('«') ? verse : `«${verse}»`}
            </blockquote>
          </div>
        );
      }

      case 'stikkord': {
        const rawItems =
          Array.isArray(block.stikkordItems) && block.stikkordItems.length > 0
            ? block.stikkordItems
            : Array.isArray(d.points) && d.points.length > 0
            ? d.points
            : Array.isArray(d.items) && d.items.length > 0
            ? d.items
            : [];
        return (
          <div className="space-y-0.5 text-slate-600 print-screen-col">
            {rawItems.length > 0 ? (
              <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                {rawItems.map((it: any, idx: number) => (
                  <li key={idx} className="font-medium">
                    {safeText(it, `Punkt ${idx + 1}`)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{safeText(fallbackSummary, 'Trinnvise stikkord på skjerm.')}</p>
            )}
          </div>
        );
      }

      case 'tekst':
      case 'undervisning': {
        const mainTxt = safeText(d.slideText || d.mainText || d.text || d.content || fallbackSummary);
        const rawPts = Array.isArray(d.points) ? d.points : [];
        return (
          <div className="space-y-1 text-slate-600 print-screen-col">
            {safeText(d.subtitle) && <div className="font-medium text-slate-700">{safeText(d.subtitle)}</div>}
            {mainTxt && <p className="text-slate-700 whitespace-pre-line leading-snug">{mainTxt}</p>}
            {rawPts.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                {rawPts.map((p: any, i: number) => (
                  <li key={i}>{safeText(p)}</li>
                ))}
              </ul>
            )}
          </div>
        );
      }

      case 'bilete':
      case 'bilde': {
        const imgs =
          Array.isArray(d.images) && d.images.length > 0
            ? d.images.filter(Boolean)
            : d.imageUrl
            ? [{ url: d.imageUrl, caption: safeText(d.caption || d.title) }]
            : [];
        return (
          <div className="space-y-1 text-slate-600 print-screen-col">
            <div className="font-semibold text-slate-700">
              🖼️ {imgs.length || Number(d.layout) || 1} bilete på skjerm
            </div>
            {imgs.length > 0 && (
              <div className="grid grid-cols-2 gap-1 print:hidden">
                {imgs.map((img: any, i: number) => {
                  const imgUrl = typeof img === 'string' ? img : safeText(img?.url);
                  const imgLabel = typeof img === 'object' ? safeText(img?.caption || img?.label || img?.alt, `Bilete ${i + 1}`) : `Bilete ${i + 1}`;
                  return (
                    <div key={i} className="border border-slate-200 rounded p-1 bg-white">
                      {imgUrl && (
                        <img
                          src={imgUrl}
                          alt={imgLabel}
                          className="w-full h-12 object-cover rounded"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {safeText(d.caption) && <p className="italic">«{safeText(d.caption)}»</p>}
          </div>
        );
      }

      case 'lysbileteshow': {
        const imgs = Array.isArray(d.images) ? d.images : [];
        return (
          <div className="space-y-0.5 text-slate-600 print-screen-col">
            <p className="font-medium text-slate-700">
              🎞️ {imgs.length} bilete ({Number(d.intervalSeconds || d.interval) || 4}s intervall)
            </p>
            {safeText(d.englishSearchQuery) && <p>Motiv: {safeText(d.englishSearchQuery)}</p>}
          </div>
        );
      }

      case 'bildebibelen': {
        const scenes = Array.isArray(d.scenes) ? d.scenes.filter(Boolean) : [];
        return (
          <div className="space-y-0.5 text-slate-600 print-screen-col">
            <p className="font-semibold text-slate-700">
              🎨 {safeText(d.storyTitle || d.title, 'BildeBibelen')} ({scenes.length} ruter)
            </p>
          </div>
        );
      }

      case 'sang_salme': {
        const verses = Array.isArray(d.verses) ? d.verses.filter(Boolean) : [];
        return (
          <div className="space-y-1 text-slate-600 print-screen-col">
            <div className="font-semibold text-slate-800">
              🎵 {safeText(d.songNumber) ? `Nr. ${safeText(d.songNumber)} – ` : ''}{safeText(d.title, 'Song / Salme')}
            </div>
            {verses.length > 0 ? (
              <p className="text-slate-600">{verses.length} vers på storskjerm</p>
            ) : (
              <p>{safeText(fallbackSummary, 'Songtekst på skjerm.')}</p>
            )}
          </div>
        );
      }

      case 'bonn_dikt':
        return (
          <div className="space-y-0.5 text-slate-600 print-screen-col">
            {safeText(d.text) ? (
              <blockquote className="text-slate-700 italic whitespace-pre-line border-l-2 border-slate-300 pl-2 leading-snug">
                {safeText(d.text)}
              </blockquote>
            ) : (
              <p>{safeText(fallbackSummary, 'Bønnetekst på skjerm.')}</p>
            )}
          </div>
        );

      case 'samtale': {
        const rawQs =
          Array.isArray(d.reflectionQuestions) && d.reflectionQuestions.length > 0
            ? d.reflectionQuestions
            : Array.isArray(d.questions) && d.questions.length > 0
            ? d.questions
            : [];
        const qs = rawQs.map((q: any) => safeText(q)).filter(Boolean);
        return (
          <div className="space-y-1 text-slate-600 print-screen-col">
            {safeText(d.organization) && (
              <div className="font-semibold text-slate-700">💬 {safeText(d.organization)}:</div>
            )}
            {qs.length > 0 ? (
              <ol className="list-decimal list-inside space-y-0.5 text-slate-700 font-medium leading-snug">
                {qs.map((q: string, idx: number) => (
                  <li key={idx}>{q}</li>
                ))}
              </ol>
            ) : (
              <p>{safeText(d.topic || fallbackSummary, 'Samtalespørsmål på skjerm.')}</p>
            )}
          </div>
        );
      }

      case 'informasjon': {
        const rawPts =
          Array.isArray(d.practicalPoints) && d.practicalPoints.length > 0
            ? d.practicalPoints
            : Array.isArray(d.bulletPoints)
            ? d.bulletPoints
            : [];
        const pts = rawPts.map((p: any) => safeText(p)).filter(Boolean);
        return (
          <div className="space-y-0.5 text-slate-600 print-screen-col">
            {pts.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                {pts.map((p: string, idx: number) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            )}
            {safeText(d.HighlightText || d.noticeBox) && (
              <div className="font-semibold text-slate-800">
                📌 {safeText(d.HighlightText || d.noticeBox)}
              </div>
            )}
          </div>
        );
      }

      case 'bilete_avdekking':
        return (
          <div className="space-y-0.5 text-slate-600 print-screen-col">
            <p className="font-semibold text-slate-800">
              🧩 Fasit: {safeText(d.solution || d.fasit || d.title, 'Biletgåte')}
            </p>
            <p className="text-slate-500">100 brikker • {Number(d.timerSeconds || d.durationSeconds) || 30}s nedteljing</p>
          </div>
        );

      case 'quiz': {
        const qs =
          Array.isArray(d.questions) && d.questions.length > 0
            ? d.questions.filter(Boolean)
            : Array.isArray(d.quizQuestions) && d.quizQuestions.length > 0
            ? d.quizQuestions.filter(Boolean)
            : [];
        return (
          <div className="space-y-1 text-slate-600 print-screen-col">
            {qs.length > 0 ? (
              <div className="space-y-1">
                {qs.map((q: any, idx: number) => (
                  <div key={idx} className="leading-snug">
                    <div className="font-semibold text-slate-800">
                      {idx + 1}. {safeText(q?.question, `Spørsmål ${idx + 1}`)}
                    </div>
                    <div className="text-slate-600">
                      A: {safeText(q?.optionA || q?.options?.[0])} • B: {safeText(q?.optionB || q?.options?.[1])} • C: {safeText(q?.optionC || q?.options?.[2])} • D: {safeText(q?.optionD || q?.options?.[3])}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>{safeText(d.question || fallbackSummary, 'Quiz på skjerm.')}</p>
            )}
          </div>
        );
      }

      case 'kven_skal_ut': {
        const items =
          Array.isArray(d.items) && d.items.length > 0
            ? d.items.filter(Boolean)
            : Array.isArray(d.kvenSkalUtItems)
            ? d.kvenSkalUtItems.filter(Boolean)
            : [];
        return (
          <div className="space-y-1 text-slate-600 print-screen-col">
            {items.length > 0 ? (
              items.map((it: any, idx: number) => (
                <div key={idx} className="leading-snug">
                  <span className="font-semibold text-slate-800">#{idx + 1}:</span>{' '}
                  A: {safeText(it?.options?.A || it?.optionA)} • B: {safeText(it?.options?.B || it?.optionB)} • C: {safeText(it?.options?.C || it?.optionC)} • D: {safeText(it?.options?.D || it?.optionD)}
                </div>
              ))
            ) : (
              <p>{safeText(fallbackSummary, '4 alternativ på skjerm.')}</p>
            )}
          </div>
        );
      }

      case 'henteleik': {
        const rawItems =
          Array.isArray(d.items) && d.items.length > 0
            ? d.items
            : Array.isArray(d.henteleikItems)
            ? d.henteleikItems
            : [];
        const itemLabels = rawItems.map((it: any) => safeText(it)).filter(Boolean);
        return (
          <div className="space-y-0.5 text-slate-600 print-screen-col">
            {itemLabels.length > 0 ? (
              <p className="text-slate-700 font-medium leading-snug">
                {itemLabels.map((item: string, idx: number) => `${idx + 1}. ${item}`).join(' • ')}
              </p>
            ) : (
              <p>{safeText(fallbackSummary, 'Gjenstandar viste éin etter éin.')}</p>
            )}
          </div>
        );
      }

      case 'kims_leik': {
        const rawItems = Array.isArray(d.items) ? d.items.filter(Boolean) : [];
        return (
          <div className="space-y-0.5 text-slate-600 print-screen-col">
            <div className="font-semibold text-slate-700">
              🧠 {Number(d.itemCount) || rawItems.length || 16} ting ({Number(d.timerSeconds) || 30}s)
            </div>
            {rawItems.length > 0 && (
              <p className="leading-snug">
                {rawItems
                  .map((it: any) => {
                    if (typeof it === 'object' && it) {
                      return `${safeText(it.emoji)} ${safeText(it.name || it.text)}`.trim();
                    }
                    return safeText(it);
                  })
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </div>
        );
      }

      case 'reis_deg': {
        const rawStmts = Array.isArray(d.statements) ? d.statements.filter(Boolean) : [];
        return (
          <div className="space-y-0.5 text-slate-600 print-screen-col">
            {rawStmts.length > 0 ? (
              <ul className="list-disc list-inside text-slate-700 space-y-0.5 leading-snug">
                {rawStmts.map((s: any, i: number) => (
                  <li key={i}>{safeText(s)}</li>
                ))}
              </ul>
            ) : (
              <p>{safeText(fallbackSummary, 'Påstandar på skjerm.')}</p>
            )}
          </div>
        );
      }

      case 'beat_for_beat':
      case 'ord_for_ord':
        return (
          <div className="space-y-0.5 text-slate-600 print-screen-col">
            <p className="font-semibold text-slate-700">
              🔢 Luker ({safeText(d.category, 'Ord for ord')})
            </p>
            {safeText(d.hint) && <p>Hint: {safeText(d.hint)}</p>}
          </div>
        );

      default:
        return (
          <p className="text-slate-600 print-screen-col">
            {safeText(fallbackSummary || d.slideText || d.mainText || d.description || d.title, 'Visning på storskjerm')}
          </p>
        );
    }
  };

  // Ekstra fasit / utdjuping under hovudmanuset i høgre kolonne i DEL 2
  const renderAdditionalLeaderDetails = (block: TeachingBlock) => {
    const d = (block?.data && typeof block.data === 'object' ? block.data : {}) as any;
    const sections: React.ReactNode[] = [];

    // Utdjupande notat per kulepunkt for 'stikkord'
    if (block.type === 'stikkord') {
      const rawItems =
        Array.isArray(block.stikkordItems) && block.stikkordItems.length > 0
          ? block.stikkordItems
          : Array.isArray(d.points) && d.points.length > 0
          ? d.points
          : Array.isArray(d.items)
          ? d.items
          : [];
      const itemsWithNotes = rawItems.filter((it: any) => typeof it === 'object' && it && safeText(it.note || it.leaderNotes || it.detail));
      if (itemsWithNotes.length > 0) {
        sections.push(
          <div key="stikkord-notes" className="mt-1.5 pt-1.5 border-t border-slate-200/70 space-y-1 print-leader-col">
            {rawItems.map((it: any, idx: number) => {
              const heading = safeText(it?.heading || it?.keyword || it?.text || it?.title, `Punkt ${idx + 1}`);
              const note = safeText(it?.note || it?.leaderNotes || it?.detail);
              if (!note) return null;
              return (
                <div key={idx} className="text-slate-800 leading-snug">
                  <span className="font-bold text-slate-900">{idx + 1}. {heading}: </span>
                  <span>{note}</span>
                </div>
              );
            })}
          </div>
        );
      }
    }

    // Forteljarmanus for 'bildebibelen'
    if (block.type === 'bildebibelen' && Array.isArray(d.scenes) && d.scenes.length > 0) {
      sections.push(
        <div key="bildebibel-scenes" className="mt-1.5 pt-1.5 border-t border-slate-200/70 space-y-1 print-leader-col">
          {d.scenes.filter(Boolean).map((scene: any, idx: number) => (
            <div key={idx} className="text-slate-800 leading-snug">
              <span className="font-bold text-slate-900">
                Rute {scene?.sceneNumber || idx + 1}:
              </span>{' '}
              <span>{safeText(scene?.leaderNotes || scene?.leaderScript)}</span>
            </div>
          ))}
        </div>
      );
    }

    // Fasit for Quiz
    if (block.type === 'quiz') {
      const qs =
        Array.isArray(d.questions) && d.questions.length > 0
          ? d.questions.filter(Boolean)
          : Array.isArray(d.quizQuestions)
          ? d.quizQuestions.filter(Boolean)
          : [];
      if (qs.length > 0) {
        sections.push(
          <div key="quiz-fasit" className="mt-1.5 pt-1.5 border-t border-slate-200/70 space-y-1 print-leader-col">
            {qs.map((q: any, idx: number) => {
              const corr = (safeText(q?.correctOption, 'A') as 'A' | 'B' | 'C' | 'D');
              const corrText = safeText(
                corr === 'A'
                  ? q?.optionA || q?.options?.[0]
                  : corr === 'B'
                  ? q?.optionB || q?.options?.[1]
                  : corr === 'C'
                  ? q?.optionC || q?.options?.[2]
                  : q?.optionD || q?.options?.[3]
              );
              return (
                <div key={idx} className="text-slate-800 leading-snug">
                  <span className="font-bold text-emerald-900">
                    Fasit {idx + 1}: {corr} ({corrText})
                  </span>
                  {safeText(q?.explanation) ? ` – ${safeText(q?.explanation)}` : ''}
                </div>
              );
            })}
          </div>
        );
      }
    }

    // Fasit for Kven skal ut
    if (block.type === 'kven_skal_ut') {
      const items =
        Array.isArray(d.items) && d.items.length > 0
          ? d.items.filter(Boolean)
          : Array.isArray(d.kvenSkalUtItems)
          ? d.kvenSkalUtItems.filter(Boolean)
          : [];
      if (items.length > 0) {
        sections.push(
          <div key="kven-fasit" className="mt-1.5 pt-1.5 border-t border-slate-200/70 space-y-1 print-leader-col">
            {items.map((it: any, idx: number) => {
              const corr = safeText(it?.correctOption, 'D');
              const corrVal = safeText(it?.options?.[corr] || it?.[`option${corr}`]);
              return (
                <div key={idx} className="text-slate-800 leading-snug">
                  <span className="font-bold text-emerald-900">
                    Fasit #{idx + 1}: {corr} ({corrVal}) skal ut.
                  </span>{' '}
                  <span>{safeText(it?.explanation)}</span>
                </div>
              );
            })}
          </div>
        );
      }
    }

    // Fasit for Ord for ord / Beat for beat
    if (block.type === 'beat_for_beat' || block.type === 'ord_for_ord') {
      const fullQuote = safeText(
        d.solution || d.quote || (Array.isArray(d.words) ? d.words.map((w: any) => safeText(w)).join(' ') : '')
      );
      if (fullQuote) {
        sections.push(
          <div key="quote-fasit" className="mt-1 text-slate-900 print-leader-col">
            <span className="font-bold text-emerald-900">Fasit: </span>
            <span>«{fullQuote}»</span>
          </div>
        );
      }
    }

    if (sections.length === 0) {
      return null;
    }

    return <div className="space-y-1">{sections}</div>;
  };

  // Tekniske stikkord for DEL 3 (Kompakt køyreplan)
  const getTechnicalSummary = (block: TeachingBlock, fallbackSummary?: string): string => {
    const d = (block?.data && typeof block.data === 'object' ? block.data : {}) as any;
    switch (block.type) {
      case 'svart_skjerm':
        return 'Svart skjerm (Blackout)';
      case 'bibelord':
        return `Bibeltekst: ${safeText(d.reference || d.scriptureRef, 'Bibelord')}`;
      case 'stikkord': {
        const count =
          (Array.isArray(block.stikkordItems) && block.stikkordItems.length) ||
          (Array.isArray(d.points) && d.points.length) ||
          (Array.isArray(d.items) && d.items.length) ||
          0;
        return count > 0 ? `${count} stikkord på skjerm` : 'Stikkord på skjerm';
      }
      case 'bilete_avdekking':
        return `Fasit: ${safeText(d.solution || d.fasit, 'Biletgåte')} (100 ruter)`;
      case 'quiz': {
        const count =
          (Array.isArray(d.questions) && d.questions.length) ||
          (Array.isArray(d.quizQuestions) && d.quizQuestions.length) ||
          1;
        return `Quiz (${count} spm A–D)`;
      }
      case 'kven_skal_ut': {
        const count =
          (Array.isArray(d.items) && d.items.length) ||
          (Array.isArray(d.kvenSkalUtItems) && d.kvenSkalUtItems.length) ||
          1;
        return `2×2-rutenett (${count} oppg.)`;
      }
      case 'reis_deg': {
        const count = Array.isArray(d.statements) ? d.statements.length : 0;
        return `${count || 4} påstandar i sal`;
      }
      case 'henteleik': {
        const count = Array.isArray(d.items) ? d.items.length : 6;
        return `Lagkonkurranse (${count} ting)`;
      }
      case 'kims_leik':
        return `Hugseleik (${Number(d.timerSeconds) || 30}s nedteljing)`;
      case 'samtale':
        return `${safeText(d.organization, 'Samtale')} (${(Array.isArray(d.reflectionQuestions) && d.reflectionQuestions.length) || 2} spm)`;
      case 'bonn_dikt':
        return 'Bøn på storskjerm';
      case 'sang_salme':
        return `Song: ${safeText(d.title, 'Song / Salme')}`;
      default:
        return safeText(fallbackSummary || d.title, 'Storskjermvising');
    }
  };

  // Kopier heile leiarheftet som rein tekst
  const handleCopyFullGuide = () => {
    const lines: string[] = [];
    lines.push(`================================================================`);
    lines.push(`LEIARHEFTE: ${safeText(safeSession.title, 'SAMLING').toUpperCase()}`);
    lines.push(
      `Målgruppe: ${safeText(activeStoryboard?.targetGroup || safeSession.targetAudience || safeSession.subtitle, 'Konfirmantar')}`
    );
    lines.push(`Total tid: ${totalMinutes} minutt • ${blocksWithTime.length} bolkar`);
    lines.push(`Dato: ${new Date().toLocaleDateString('nn-NO')}`);
    lines.push(`================================================================\n`);

    lines.push(`DEL 1 – TEOLOGISK OG FAGLEG BAKGRUNNSSTOFF (SAKPROSA)`);
    lines.push(`----------------------------------------------------------------`);
    lines.push(`KJERNEBODSKAP:\n${redThreadText}\n`);
    lines.push(`TEOLOGISK OG HISTORISK BAKGRUNN:\n${theologicalText}\n`);
    lines.push(`PEDAGOGISKE FALLGRUVER OG INNFALLSVINKLAR:\n${pedagogicalText}\n`);

    lines.push(`\nDEL 2 – STEG-FOR-STEG REGI OG MANUS (HANDLINGSMANUS)`);
    lines.push(`----------------------------------------------------------------`);

    blocksWithTime.forEach((item, idx) => {
      const meta = BLOCK_METADATA[item.block.type];
      const title = safeText(item.block.data?.title || item.block.data?.heading || meta?.label, `Bolk ${idx + 1}`);
      lines.push(`\n[${idx + 1}] ${item.timeStampRange} • ${(meta?.label || item.block.type).toUpperCase()}`);
      lines.push(`TITTEL: ${title}`);
      if (item.matchingStoryboardSection?.bigScreenSummary) {
        lines.push(`STORSKJERM: ${item.matchingStoryboardSection.bigScreenSummary}`);
      }
      const script = safeText(
        blockScripts[item.block.id] ??
          item.block.data?.notes ??
          (item.block as any).notes ??
          item.block.leaderNotes ??
          item.block.data?.leaderNotes ??
          item.matchingStoryboardSection?.leaderScript
      );
      if (script) {
        lines.push(`LEIARMANUS:\n${script}`);
      }
    });

    lines.push(`\nDEL 3 – KOMPAKT KØYREPLAN`);
    lines.push(`----------------------------------------------------------------`);
    blocksWithTime.forEach((item, idx) => {
      const meta = BLOCK_METADATA[item.block.type];
      const title = safeText(item.block.data?.title || meta?.label, `Bolk ${idx + 1}`);
      lines.push(`${idx + 1}. ${item.compactTimeRange} | ${meta?.label || item.block.type} | ${title} | ${getTechnicalSummary(item.block, item.matchingStoryboardSection?.bigScreenSummary)} | ${item.duration} min`);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const targetAudienceLabel = safeText(
    activeStoryboard?.targetGroup ||
      safeSession.targetAudience ||
      safeSession.subtitle,
    'Konfirmantar (14–15 år)'
  );

  const formattedDate = new Date().toLocaleDateString('nn-NO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="leader-guide-modal-overlay fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex flex-col items-center overflow-y-auto p-2 sm:p-6 print:p-0 print:bg-white print:overflow-visible">
      {/* @media print stilsett skreddarsydd for kompakt, fleirsidig A5-hefte (4–6 sider) */}
      <style>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 8mm 10mm 10mm 10mm;
          }

          /* 1. UTSKRIFTSISOLERING: Skjul absolutt alt bakgrunnsinnhald i appen */
          html, body, #root, #root > div {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
            background: white !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body {
            visibility: hidden !important;
            background: white !important;
          }

          body > #root > div > header,
          body > #root > div > div.flex-1,
          .print\\:hidden,
          .print\\:hidden * {
            display: none !important;
            visibility: hidden !important;
          }

          .leader-guide-modal-overlay,
          .leader-guide-modal-overlay * {
            visibility: visible !important;
          }

          .leader-guide-modal-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            z-index: 999999 !important;
            background: white !important;
            display: block !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .leader-guide-print-root {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            display: block !important;
          }

          /* 2. DEL 1: Kompakt forside + fagstoff på side 1 */
          .print-del1-title {
            font-size: 17pt !important;
            line-height: 1.15 !important;
          }

          .print-del1-meta {
            font-size: 9pt !important;
            line-height: 1.25 !important;
          }

          .print-del1-core {
            font-size: 9.5pt !important;
            line-height: 1.35 !important;
          }

          .print-del1-prose {
            font-size: 8.75pt !important;
            line-height: 1.35 !important;
          }

          .leader-guide-del1-page {
            break-after: page !important;
            page-break-after: always !important;
          }

          /* 3. DEL 2: Kompakt 2-spalters regimanus (fleire blokker per A5-side) */
          .leader-guide-regi-row {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-screen-col,
          .print-screen-col p,
          .print-screen-col li,
          .print-screen-col blockquote,
          .print-screen-col div {
            font-size: 8.25pt !important;
            line-height: 1.3 !important;
          }

          .print-leader-col,
          .print-leader-col p,
          .print-leader-col div,
          .print-leader-col span {
            font-size: 9.5pt !important;
            line-height: 1.4 !important;
          }

          /* 4. DEL 3: Kompakt køyreplan på éi enkelt A5-side til slutt */
          .leader-guide-del3-page {
            break-before: page !important;
            page-break-before: always !important;
          }

          .leader-guide-schedule-table th {
            font-size: 7.5pt !important;
            line-height: 1.2 !important;
          }

          .leader-guide-schedule-table td,
          .leader-guide-schedule-table td span {
            font-size: 8pt !important;
            line-height: 1.25 !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* TOPPVERKTØYLINJE (SKJULT VED UTSKRIFT)                                    */}
      {/* ========================================================================= */}
      <div className="w-full max-w-4xl bg-slate-900 text-white rounded-t-2xl px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0 border-b border-slate-800 shadow-lg">
        <div className="flex items-center gap-2">
          {onSwitchToCompactPlan ? (
            <div className="inline-flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={onSwitchToCompactPlan}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Kompakt køyreplan</span>
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 shadow-xs flex items-center gap-1.5 cursor-default"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Leiarhefte (A5-hefte)</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Leiarhefte (Kompakt A5-hefte)</h2>
                <p className="text-[11px] text-slate-400">
                  Side 1: Fagstoff • Midtsider: 2-spalters regi • Siste side: Køyreplan
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isEditingGuide) {
                handleSaveAllGuideEdits();
              }
              setIsEditingGuide(!isEditingGuide);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isEditingGuide
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{isEditingGuide ? 'Ferdig å redigere (Lagre)' : 'Rediger leiarhefte'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyFullGuide}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Kopiert!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Kopier hefte</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Skriv ut A5-hefte / Lagre PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
            title="Lukk"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DOKUMENTARK FOR SKJERM OG A5-UTSKRIFT                                     */}
      {/* ========================================================================= */}
      <div className="leader-guide-print-root w-full max-w-4xl bg-white text-slate-900 rounded-b-2xl shadow-2xl p-6 sm:p-8 print:shadow-none print:rounded-none print:p-0 print:max-w-none space-y-6 print:space-y-0 relative">
        {/* ========================================================================= */}
        {/* SIDE 1: FORSIDEHOVUD + DEL 1 (FAGSTOFF) PÅ ÉI KOMPAKT A5-SIDE             */}
        {/* ========================================================================= */}
        <div className="leader-guide-del1-page space-y-3.5 print:space-y-2.5">
          {/* Kompakt Tittel & Metadata */}
          <header className="border-b-2 border-slate-900 pb-2.5 print:pb-2">
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-800 mb-0.5">
              <span>Leiarhefte • Den norske kyrkja</span>
              <span>DEL 1: Fagleg førebuing</span>
            </div>
            <h1 className="print-del1-title text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              {safeText(safeSession.title, 'Undervisningsopplegg')}
            </h1>
            <div className="print-del1-meta flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 font-medium pt-1">
              <span>
                Målgruppe: <strong className="text-slate-900">{targetAudienceLabel}</strong>
              </span>
              <span>•</span>
              <span>
                Tidsramme: <strong className="text-slate-900">{totalMinutes} min ({blocksWithTime.length} bolkar)</strong>
              </span>
              <span>•</span>
              <span>
                Dato: <strong className="text-slate-900">{formattedDate}</strong>
              </span>
            </div>
          </header>

          {/* Kjernebodskap: Rein boks med venstrestripe (border-l-4), 9.5pt kursiv */}
          <div className="border-l-4 border-amber-500 bg-amber-50/50 print:bg-transparent pl-3 py-1.5 space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
              Kjernebodskap og raud tråd
            </div>
            {isEditingGuide ? (
              <textarea
                rows={2}
                value={redThreadText}
                onChange={(e) => setRedThreadText(e.target.value)}
                className="w-full p-2 text-xs bg-white border border-amber-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            ) : (
              <p className="print-del1-core text-sm italic font-semibold text-slate-900 leading-snug">
                «{redThreadText}»
              </p>
            )}
          </div>

          {/* Teologisk bakgrunn og pedagogiske råd i 2 parallelle spalter (8.5–9pt, 1.35 linjeavstand, utan tunge rammer) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 print:gap-3.5 pt-1">
            <div className="space-y-1">
              <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                <span>Teologisk og historisk bakgrunn</span>
              </h2>
              {isEditingGuide ? (
                <textarea
                  rows={6}
                  value={theologicalText}
                  onChange={(e) => setTheologicalText(e.target.value)}
                  className="w-full p-2 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              ) : (
                <p className="print-del1-prose text-xs sm:text-[13px] text-slate-800 leading-[1.38] whitespace-pre-line">
                  {theologicalText}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Pedagogiske råd og innfallsvinklar</span>
              </h2>
              {isEditingGuide ? (
                <textarea
                  rows={6}
                  value={pedagogicalText}
                  onChange={(e) => setPedagogicalText(e.target.value)}
                  className="w-full p-2 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              ) : (
                <p className="print-del1-prose text-xs sm:text-[13px] text-slate-800 leading-[1.38] whitespace-pre-line">
                  {pedagogicalText}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DEL 2: KOMPAKT 2-SPALTERS REGIMANUS (FLEIRE BLOKKER PER A5-SIDE)          */}
        {/* ========================================================================= */}
        <section className="space-y-3 print:pt-1">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1.5 mb-2">
            <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-900">
              DEL 2: Steg-for-steg regi og manus
            </h2>
            <span className="text-[11px] text-slate-600 font-semibold">
              Venstre: Storskjerm / Teknikk (35 %) • Høgre: Kva leiaren seier og gjer (65 %)
            </span>
          </div>

          {blocksWithTime.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              Ingen byggeklossar er lagde til i samlinga enno.
            </div>
          ) : (
            <div>
              {blocksWithTime.map((item, idx) => {
                const { block, timeStampRange, matchingStoryboardSection } = item;
                const meta = BLOCK_METADATA[block.type] || BLOCK_METADATA['stikkord'];
                const blockTitle = safeText(
                  block.data?.title ||
                    block.data?.heading ||
                    block.title ||
                    matchingStoryboardSection?.title ||
                    meta?.label,
                  `Bolk ${idx + 1}`
                );

                return (
                  <article
                    key={block.id || idx}
                    className="leader-guide-regi-row border-b border-slate-300 pb-3 mb-3 last:border-b-0"
                  >
                    {/* Enkel headerlinje per kloss: [Nummer] [Tittel] • [Kloss-type-tagg] • [00:00–07:00 (7 min)] */}
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 mb-1.5">
                      <div className="flex flex-wrap items-baseline gap-x-1.5 min-w-0">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                          {idx + 1}. {blockTitle}
                        </span>
                        <span className="text-slate-400 text-xs">•</span>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {meta?.label || block.type}
                        </span>
                        {block.hiddenOnScreen && (
                          <>
                            <span className="text-slate-400 text-xs">•</span>
                            <span className="text-[10px] font-semibold text-amber-800">
                              (Skjult på skjerm)
                            </span>
                          </>
                        )}
                      </div>
                      <span className="font-mono text-[11px] font-bold text-slate-700 shrink-0">
                        {timeStampRange}
                      </span>
                    </div>

                    {/* 2-spalters innhald: Venstre (35 %, col-span-4) = Storskjerm/Teknikk | Høgre (65 %, col-span-8) = Kva leiaren seier og gjer */}
                    <div className="grid grid-cols-12 gap-3 items-start">
                      {/* Venstre kolonne (ca. 35 %): Storskjerm / Teknikk */}
                      <div className="col-span-12 sm:col-span-4 print:col-span-4 text-xs text-slate-600 pr-2 sm:border-r print:border-r border-slate-200">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Storskjerm / Teknikk
                        </div>
                        {renderBigScreenContent(block, matchingStoryboardSection?.bigScreenSummary)}
                      </div>

                      {/* Høgre kolonne (ca. 65 %): Kva leiaren seier og gjer */}
                      <div className="col-span-12 sm:col-span-8 print:col-span-8 print-leader-col pl-0 sm:pl-1 print:pl-1">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 mb-0.5">
                          Kva leiaren seier og gjer
                        </div>
                        {isEditingGuide ? (
                          <textarea
                            rows={3}
                            value={blockScripts[block.id] || ''}
                            onChange={(e) => setBlockScripts({ ...blockScripts, [block.id]: e.target.value })}
                            className="w-full p-2 text-xs bg-white border border-emerald-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            placeholder="Kva leiaren seier og gjer..."
                          />
                        ) : (
                          <p className="text-xs sm:text-sm text-slate-900 leading-[1.4] whitespace-pre-line">
                            {blockScripts[block.id] || 'Ingen leiarrettleiing lagt inn.'}
                          </p>
                        )}
                        {renderAdditionalLeaderDetails(block)}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* DEL 3: KOMPAKT KØYREPLAN PÅ ÉI ENKELT A5-SIDE (SLUTTSIDE)                 */}
        {/* ========================================================================= */}
        <section className="leader-guide-del3-page space-y-2 pt-2">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1">
            <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-900">
              DEL 3: Kompakt køyreplan – {safeText(safeSession.title, 'Samling')}
            </h2>
            <span className="text-[11px] font-mono font-bold text-slate-700">
              Total tid: {totalMinutes} min
            </span>
          </div>

          {blocksWithTime.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Ingen bolkar i køyreplanen enno.</p>
          ) : (
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="leader-guide-schedule-table w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase tracking-wider text-slate-800">
                    <th className="py-1 px-1.5 w-20">Tid</th>
                    <th className="py-1 px-1.5 w-24">Type</th>
                    <th className="py-1 px-1.5 w-1/3">Bolk / Tittel</th>
                    <th className="py-1 px-1.5 w-auto">Regi &amp; Storskjerm-stikkord</th>
                    <th className="py-1 px-1.5 w-12 text-right">Tid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {blocksWithTime.map((item, idx) => {
                    const meta = BLOCK_METADATA[item.block.type] || BLOCK_METADATA['stikkord'];
                    const blockTitle = safeText(
                      item.block.data?.title ||
                        item.block.data?.heading ||
                        item.block.title ||
                        item.matchingStoryboardSection?.title ||
                        meta?.label,
                      `Bolk ${idx + 1}`
                    );
                    return (
                      <tr key={item.block.id || idx} className="align-top">
                        <td className="py-1 px-1.5 font-mono text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                          {item.compactTimeRange}
                        </td>
                        <td className="py-1 px-1.5 text-[11px] font-semibold text-slate-700 truncate">
                          {meta?.label || item.block.type}
                        </td>
                        <td className="py-1 px-1.5 font-bold text-slate-900 break-words">
                          {idx + 1}. {blockTitle}
                        </td>
                        <td className="py-1 px-1.5 text-slate-700 break-words">
                          {getTechnicalSummary(item.block, item.matchingStoryboardSection?.bigScreenSummary)}
                        </td>
                        <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                          {item.duration} m
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t border-slate-300 font-bold text-slate-900 text-xs">
                    <td colSpan={4} className="py-1 px-1.5 text-right uppercase text-[10px] tracking-wider">
                      Total estimert tid:
                    </td>
                    <td className="py-1 px-1.5 text-right font-mono whitespace-nowrap">
                      {totalMinutes} m
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <footer className="pt-2 flex items-center justify-between text-[10px] text-slate-500">
            <span>Undervisningsbyggjar • Leiarhefte (A5-format)</span>
            <span>
              {safeText(safeSession.title, 'Samling')} • {totalMinutes} min • {formattedDate}
            </span>
          </footer>
        </section>
      </div>
    </div>
  );
};
