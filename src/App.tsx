/**
 * src/App.tsx
 * Undervisningsbyggjar for Den norske kyrkja
 * (for leir, konfirmasjon, trusopplæring og samlingar)
 * 
 * Strukturert etter Gudstjenestebyggeren med ein lys, roleg og venleg sand/stein-palett.
 * 
 * Topplinje:
 * - Tittel: «Undervisningsbyggjar»
 * - Faste handlingar: «Skap alt med AI», «Lagre», «Ny», «Framsyning», «Køyreplan», «Arkiv»
 * 
 * Arbeidsflate:
 * - Venstremeny: Blokk-bibliotek (Sklir mjukt ut ved "Skap alt med AI")
 * - Hovudflate: Arbeidsbordet (Aktivt registudio når isAiStudioActive er sann, elles blokk-liste)
 * - Høgreskuff: AI-assistent i sanntid for enkeltblokker eller Storyboard & Regi
 */

import React, { useState, useEffect, useRef } from 'react';
import { TeachingBlock, TeachingSession, BlockType, AiStoryboard, StoryboardBriefing } from './types';
import { 
  createEmptyBlock, 
  BLOCK_METADATA,
  getBlockMetadata
} from './lib/undervisningDefaults';
import { BlockLibrary } from './components/builder/BlockLibrary';
import { WorkDesk } from './components/builder/WorkDesk';
import { BlockAiDrawer } from './components/builder/BlockAiDrawer';
import { FullPresenterModal } from './components/builder/FullPresenterModal';
import { PrintPlanModal } from './components/builder/PrintPlanModal';
import { LeaderGuideModal } from './components/builder/LeaderGuideModal';
import { SavedSessionsModal } from './components/builder/SavedSessionsModal';
import { saveTeachingSession } from './services/storageService';
import { ProjectorScreenIcon, launchPresenterOnScreens } from './lib/screenUtils';
import { 
  Play, 
  Printer, 
  Download, 
  Upload, 
  Sparkles,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Save,
  FilePlus,
  Tv,
  FolderOpen,
  ExternalLink,
  X,
  Undo2,
  Film
} from 'lucide-react';

const STORAGE_KEY_SESSION = 'undervisningsbyggar_active_session_v3';

/**
 * Automatisk konvertering av utdaterte blokktypar («undervisning» og «samtale»)
 * og sikring av 100 ruter default på bilete_avdekking
 */
export function normalizeLegacyBlocks(blocks: TeachingBlock[]): TeachingBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((b) => {
    const rawType = b.type as string;

    // 1. "undervisning" -> konverterast til "tekst" eller "stikkord"
    if (rawType === 'undervisning') {
      const d = (b.data as any) || {};
      const hasPoints = (Array.isArray(d.slidePoints) && d.slidePoints.length > 0) || (Array.isArray(d.moments) && d.moments.length > 0);
      if (hasPoints) {
        const points = (d.slidePoints && d.slidePoints.length > 0)
          ? d.slidePoints.map((p: any, i: number) => ({
              id: p.id || `sp_${Date.now()}_${i + 1}`,
              text: p.text || '',
              keyword: p.text || '',
              note: p.note || '',
              leaderNotes: p.note || '',
            }))
          : (d.moments || []).map((m: any, i: number) => ({
              id: `sp_${Date.now()}_${i + 1}`,
              text: typeof m === 'string' ? m : (m.text || m.title || ''),
              keyword: typeof m === 'string' ? m : (m.text || m.title || ''),
              note: typeof m === 'object' ? (m.note || m.detail || '') : '',
              leaderNotes: typeof m === 'object' ? (m.note || m.detail || '') : '',
            }));
        return {
          ...b,
          type: 'stikkord',
          data: {
            title: d.title || b.title || 'Stikkord',
            points,
            durationMinutes: d.durationMinutes || 8,
            leaderNotes: d.leaderNotes || b.leaderNotes || '',
          },
          leaderNotes: d.leaderNotes || b.leaderNotes || '',
        };
      } else {
        const txt = (d.slideContent || d.coreMessage || d.text || '').trim();
        return {
          ...b,
          type: 'tekst',
          data: {
            title: d.title || b.title || 'Tekst',
            text: txt,
            slideText: txt,
            content: txt,
            subtitle: d.slideSubtitle || '',
            leaderNotes: d.leaderNotes || b.leaderNotes || '',
            durationMinutes: d.durationMinutes || 8,
          },
          leaderNotes: d.leaderNotes || b.leaderNotes || '',
        };
      }
    }

    // 2. "samtale" -> konverterast til "tekst"
    if (rawType === 'samtale') {
      const d = (b.data as any) || {};
      const qText = Array.isArray(d.reflectionQuestions) ? d.reflectionQuestions.filter(Boolean).join('\n\n') : '';
      const txt = (qText || d.topic || '').trim();
      return {
        ...b,
        type: 'tekst',
        data: {
          title: d.topic ? `Samtale: ${d.topic}` : (b.title || 'Samtale'),
          text: txt,
          slideText: txt,
          content: txt,
          subtitle: d.organization || '',
          leaderNotes: [d.summaryPoint, d.leaderNotes, b.leaderNotes].filter(Boolean).join('\n\n'),
          durationMinutes: d.durationMinutes || 10,
        },
        leaderNotes: [d.summaryPoint, d.leaderNotes, b.leaderNotes].filter(Boolean).join('\n\n'),
      };
    }

    // 3. "bilete_avdekking" -> set default gridSize til 100 dersom ikkje oppgitt
    if (rawType === 'bilete_avdekking') {
      const d = (b.data as any) || {};
      return {
        ...b,
        data: {
          ...d,
          gridSize: d.gridSize || 100,
        },
      };
    }

    return b;
  });
}

const createEmptySession = (): TeachingSession => ({
  id: `session_${Date.now()}`,
  title: 'Ny samling',
  subtitle: '',
  blocks: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function App() {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  // Samlingstilstand
  const [session, setSession] = useState<TeachingSession>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSION);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed && 
          Array.isArray(parsed.blocks) && 
          parsed.id !== 'session_heimkomsten_60min' &&
          parsed.title !== 'Ungdomskveld: Heimkomsten og Nåden'
        ) {
          return {
            ...parsed,
            blocks: normalizeLegacyBlocks(parsed.blocks),
          };
        }
      }
    } catch (e) {
      console.warn('Kunne ikkje laste lagra samling:', e);
    }
    return createEmptySession();
  });

  // Vald blokk for førehandsvising
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlBlockId = params.get('blockId');
      if (urlBlockId && session.blocks.some((b) => b.id === urlBlockId)) {
        return urlBlockId;
      }
      const urlBlockIdx = params.get('blockIndex');
      if (urlBlockIdx !== null && !isNaN(parseInt(urlBlockIdx, 10))) {
        const idx = parseInt(urlBlockIdx, 10);
        if (idx >= 0 && idx < session.blocks.length) {
          return session.blocks[idx].id;
        }
      }
    }
    return session.blocks[0]?.id || null;
  });

  // Global målform (NN som standard)
  const [language, setLanguage] = useState<'nn' | 'nb'>(() => {
    const saved = localStorage.getItem('maestro_language') as 'nn' | 'nb' | null;
    if (saved === 'nn' || saved === 'nb') return saved;
    return session?.language || 'nn';
  });

  // Skap alt med AI Studio tilstander (initialiserast frå session i localStorage viss tilgjengeleg)
  const [isAiStudioActive, setIsAiStudioActive] = useState(false);
  const [storyboard, setStoryboard] = useState<AiStoryboard | null>(() => session.storyboard || null);
  const [briefingData, setBriefingData] = useState<StoryboardBriefing | null>(() => session.briefingData || null);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [isBuildingBlocks, setIsBuildingBlocks] = useState(false);
  const [isEditingBriefing, setIsEditingBriefing] = useState(false);
  const [isReturnToStoryboardConfirmOpen, setIsReturnToStoryboardConfirmOpen] = useState(false);

  // Kvar gong "language" endrast: lagre i localStorage og oppdater session.language
  useEffect(() => {
    try {
      localStorage.setItem('maestro_language', language);
    } catch {}
    setSession((prev) => {
      if (prev.language === language) return prev;
      return {
        ...prev,
        language,
        storyboard: prev.storyboard ? { ...prev.storyboard, language } : prev.storyboard,
        briefingData: prev.briefingData ? { ...prev.briefingData, language } : prev.briefingData,
      };
    });
    setStoryboard((prev) => (prev ? { ...prev, language } : prev));
    setBriefingData((prev) => (prev ? { ...prev, language } : prev));
  }, [language]);

  const handleLanguageChange = (lang: 'nn' | 'nb') => {
    try {
      localStorage.setItem('maestro_language', lang);
    } catch {}
    setLanguage(lang);
  };

  // Phase B er aktiv KUN når studio er aktivt, eit storyboard eksisterer, og brukaren IKKJE redigerer bestillinga eller genererer
  const isPhaseBActive = isAiStudioActive && storyboard !== null && !isEditingBriefing && !isGeneratingStoryboard;

  // Synlegheit for sidepanel og modalar
  const [activeAiBlockId, setActiveAiBlockId] = useState<string | null>(null);
  const [isFullPresenterOpen, setIsFullPresenterOpen] = useState(false);
  const [initialViewMode, setInitialViewMode] = useState<'leader' | 'audience'>('leader');
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [isPrintPlanOpen, setIsPrintPlanOpen] = useState(false);
  const [isLeaderGuideOpen, setIsLeaderGuideOpen] = useState(false);
  const [isSavedSessionsOpen, setIsSavedSessionsOpen] = useState(false);
  const [showScreenHelp, setShowScreenHelp] = useState(false);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sjekk om URL har ?mode=audience for opning i eige publikumsvindauge
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'audience' || mode === 'storskjerm') {
        const urlBlockId = params.get('blockId');
        if (urlBlockId && session.blocks.some((b) => b.id === urlBlockId)) {
          setSelectedBlockId(urlBlockId);
        } else {
          const urlBlockIdx = params.get('blockIndex');
          if (urlBlockIdx !== null && !isNaN(parseInt(urlBlockIdx, 10))) {
            const idx = parseInt(urlBlockIdx, 10);
            if (idx >= 0 && idx < session.blocks.length) {
              setSelectedBlockId(session.blocks[idx].id);
            }
          }
        }
        setInitialViewMode('audience');
        setIsFullPresenterOpen(true);
        setTimeout(() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }, 100);
      }
    }
  }, [session.blocks]);

  // Automatisk lagring til localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    } catch (e) {
      console.warn('Feil ved lagring til localStorage:', e);
    }
  }, [session]);

  // Sikre at vald blokk alltid er gyldig
  useEffect(() => {
    if (session.blocks.length === 0) {
      setSelectedBlockId(null);
    } else if (!session.blocks.some((b) => b.id === selectedBlockId)) {
      setSelectedBlockId(session.blocks[0]?.id || null);
    }
  }, [session.blocks, selectedBlockId]);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3500);
  };

  // Start "Skap alt med AI" studio -> skal ALLTID opne Fase A (Briefing / ny bestilling)
  const handleStartAiStudio = () => {
    setActiveAiBlockId(null);
    setIsEditingBriefing(true);
    setIsAiStudioActive(true);
  };

  // Lukk AI Studio og gå til arbeidsbordet (beheld storyboard i minnet slik at ein kan gå tilbake!)
  const handleCancelAiStudio = () => {
    setIsAiStudioActive(false);
    setIsEditingBriefing(false);
  };

  // Nullstill storyboard heilt dersom brukaren eksplisitt ønskjer å forkaste det
  const handleDiscardStoryboard = () => {
    setStoryboard(null);
    setBriefingData(null);
    setIsEditingBriefing(true);
    setSession((prev) => ({
      ...prev,
      storyboard: null,
      briefingData: null,
      updatedAt: new Date().toISOString(),
    }));
    showNotice('Storyboardet er nullstilt.');
  };

  // Gå tilbake eit steg til Storyboardet (Fase B) etter at blokker er bygde
  const handleRequestReturnToStoryboard = () => {
    if (!storyboard) return;
    if (session.blocks.length > 0) {
      setIsReturnToStoryboardConfirmOpen(true);
    } else {
      setActiveAiBlockId(null);
      setIsEditingBriefing(false);
      setIsAiStudioActive(true);
    }
  };

  const handleConfirmReturnToStoryboard = () => {
    setIsReturnToStoryboardConfirmOpen(false);
    setActiveAiBlockId(null);
    setIsEditingBriefing(false);
    setIsAiStudioActive(true);
  };

  // Oppdater storyboard (t.d. frå høgreskuffa BlockAiDrawer) og synkroniser til session
  const handleUpdateStoryboardState = (updated: AiStoryboard) => {
    setStoryboard(updated);
    setSession((prev) => ({
      ...prev,
      storyboard: updated,
      updatedAt: new Date().toISOString(),
    }));
  };

  // Generer Storyboard via API
  const handleGenerateStoryboard = async (data: StoryboardBriefing) => {
    const chosenLanguage = data.language || language || 'nn';
    if (chosenLanguage !== language) {
      handleLanguageChange(chosenLanguage);
    }
    setBriefingData({ ...data, language: chosenLanguage });
    setIsGeneratingStoryboard(true);
    try {
      const response = await fetch('/api/storyboard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          lang: chosenLanguage,
          language: chosenLanguage,
        }),
      });

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Dei opplasta dokumenta er for store for overføring (Payload Too Large). Bruk mindre PDF-filer eller lim inn teksten direkte.');
        }
        const errorText = await response.text();
        throw new Error(`Serverfeil (${response.status}): ${errorText.slice(0, 150)}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Uventa svar frå tenaren: ${text.slice(0, 150)}`);
      }
      const res = await response.json();
      if (!res.success) {
        throw new Error(res.message || 'Kunne ikkje generere storyboard.');
      }

      const nextStoryboard: AiStoryboard = {
        ...res.storyboard,
        language: res.storyboard.language || chosenLanguage,
      };

      setStoryboard(nextStoryboard);
      setIsEditingBriefing(false);
      setSession((prev) => ({
        ...prev,
        language: chosenLanguage,
        storyboard: nextStoryboard,
        briefingData: { ...data, language: chosenLanguage },
        description: nextStoryboard.redThread || prev.description,
        theologicalBackground: nextStoryboard.theologicalBackground || prev.theologicalBackground,
        pedagogicalTips: nextStoryboard.pedagogicalTips || prev.pedagogicalTips,
        targetAudience: nextStoryboard.targetGroup || prev.targetAudience,
        updatedAt: new Date().toISOString(),
      }));
      showNotice(chosenLanguage === 'nb' ? 'Genererte storyboard og lederhefte!' : 'Genererte storyboard og leiarhefte!');
    } catch (err: any) {
      console.error('[App] Feil ved generering av storyboard:', err);
      showNotice(err?.message || 'Feil ved generering av storyboard.', 'error');
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  // Godkjenn Storyboard og bygg blokker på arbeidsbordet (BEHELD storyboard i state!)
  const handleApproveStoryboard = async () => {
    if (!storyboard) return;

    setIsBuildingBlocks(true);
    try {
      showNotice(language === 'nb' ? 'Bygger ferdige blokker for arbeidsbordet...' : 'Bygger ferdige blokker for arbeidsbordet...');
      const resolvedLanguage = language || storyboard.language || briefingData?.language || 'nn';
      const response = await fetch('/api/storyboard/build-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyboard: { ...storyboard, language: resolvedLanguage },
          language: resolvedLanguage,
          lang: resolvedLanguage,
        }),
      });

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Dei opplasta dokumenta er for store for overføring (Payload Too Large). Bruk mindre PDF-filer eller lim inn teksten direkte.');
        }
        const errorText = await response.text();
        throw new Error(`Serverfeil (${response.status}): ${errorText.slice(0, 150)}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Uventa svar frå tenaren: ${text.slice(0, 150)}`);
      }
      const res = await response.json();
      if (!res.success) {
        throw new Error(res.message || 'Kunne ikkje konvertere storyboard til blokker.');
      }

      const normalizedBlocks = normalizeLegacyBlocks(res.blocks || []);
      setSession((prev) => ({
        ...prev,
        title: res.title || storyboard.title || prev.title,
        subtitle: res.subtitle || storyboard.subtitle || prev.subtitle,
        targetAudience: storyboard.targetGroup || prev.targetAudience,
        description: storyboard.redThread || prev.description,
        theologicalBackground: storyboard.theologicalBackground || prev.theologicalBackground,
        pedagogicalTips: storyboard.pedagogicalTips || prev.pedagogicalTips,
        storyboard: storyboard,
        briefingData: briefingData || prev.briefingData,
        hasManualEditsAfterBuild: false,
        blocks: normalizedBlocks,
        updatedAt: new Date().toISOString(),
      }));

      if (normalizedBlocks.length > 0) {
        setSelectedBlockId(normalizedBlocks[0].id);
      }

      setIsAiStudioActive(false);
      setIsEditingBriefing(false);
      setActiveAiBlockId(null);
      // VIKTIG: IKKJE køyr setStoryboard(null) her! Vi tek vare på storyboardet slik at brukaren kan gå tilbake.
      showNotice(`Bygde ut ${normalizedBlocks.length} blokker på arbeidsbordet!`);
    } catch (err: any) {
      console.error('[App] Feil ved bygging av blokker:', err);
      showNotice(err?.message || 'Kunne ikkje konvertere storyboard til blokker.', 'error');
    } finally {
      setIsBuildingBlocks(false);
    }
  };

  // Legg til ny blokk frå biblioteket
  const handleAddBlockFromType = (type: BlockType, targetIndexOrCount?: number, maybeCount?: number) => {
    let targetIndex: number | undefined = undefined;
    let initialCount: number | undefined = undefined;

    if (typeof maybeCount === 'number') {
      targetIndex = targetIndexOrCount;
      initialCount = maybeCount;
    } else if (typeof targetIndexOrCount === 'number') {
      if ((type === 'quiz' || type === 'stikkord') && targetIndexOrCount >= 1 && targetIndexOrCount <= 10) {
        initialCount = targetIndexOrCount;
      } else {
        targetIndex = targetIndexOrCount;
      }
    }

    const newBlock = createEmptyBlock(type, initialCount, language);
    setSession((prev) => {
      const nextBlocks = [...prev.blocks];
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= nextBlocks.length) {
        nextBlocks.splice(targetIndex, 0, newBlock);
      } else {
        nextBlocks.push(newBlock);
      }
      return {
        ...prev,
        hasManualEditsAfterBuild: true,
        blocks: nextBlocks,
        updatedAt: new Date().toISOString(),
      };
    });
    setSelectedBlockId(newBlock.id);
    const meta = getBlockMetadata(type, language);
    showNotice(`La til ${meta.label} på arbeidsbordet!`);
  };

  // Oppdater tittel / undertittel
  const handleUpdateTitle = (title: string) => {
    setSession((prev) => ({ ...prev, title, updatedAt: new Date().toISOString() }));
  };

  const handleUpdateSubtitle = (subtitle: string) => {
    setSession((prev) => ({ ...prev, subtitle, updatedAt: new Date().toISOString() }));
  };

  // Oppdater heile blokk-lista
  const handleUpdateBlocks = (blocks: TeachingBlock[]) => {
    setSession((prev) => ({
      ...prev,
      hasManualEditsAfterBuild: true,
      blocks,
      updatedAt: new Date().toISOString(),
    }));
  };

  // Lagre opplegg
  const handleSaveSession = async () => {
    try {
      await saveTeachingSession(session);
      showNotice('Samlinga er lagra!');
    } catch (e: any) {
      showNotice(`Kunne ikkje lagre samlinga: ${e?.message}`, 'error');
    }
  };

  // Nytt opplegg
  const handleNewSession = () => {
    if (session.blocks.length === 0 && !storyboard) {
      setSession(createEmptySession());
      setSelectedBlockId(null);
      setIsAiStudioActive(false);
      setStoryboard(null);
      setBriefingData(null);
      showNotice('Nytt tomt arbeidsbord.');
      return;
    }

    if (window.confirm('Vil du starte på ei heilt ny samling? Noverande arbeidsbord blir tømt.')) {
      setSession(createEmptySession());
      setSelectedBlockId(null);
      setIsAiStudioActive(false);
      setStoryboard(null);
      setBriefingData(null);
      showNotice('Starta på heilt nytt opplegg.');
    }
  };

  // Framsyning (Fullskjerm)
  const handleOpenFullscreen = () => {
    if (session.blocks.length === 0 && !isAiStudioActive) {
      showNotice('Legg til minst éi blokk eller skap eit opplegg før framsyning.', 'error');
      return;
    }
    setIsLaunchModalOpen(true);
  };

  // Import frå JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.blocks)) {
          const normalized = {
            ...parsed,
            blocks: normalizeLegacyBlocks(parsed.blocks),
          };
          setSession(normalized);
          setStoryboard(normalized.storyboard || null);
          setBriefingData(normalized.briefingData || null);
          setSelectedBlockId(normalized.blocks[0]?.id || null);
          setIsAiStudioActive(false);
          showNotice(`Importerte «${normalized.title || 'Samling'}» med ${normalized.blocks.length} blokker!`);
        } else {
          showNotice('Ugyldig filformat for samling.', 'error');
        }
      } catch (err: any) {
        showNotice(`Kunne ikkje lese fila: ${err?.message}`, 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activeAiBlock = session.blocks.find((b) => b.id === activeAiBlockId) || null;

  // Atomisk oppdatering av data for éin blokk frå AI-assistenten
  const handleUpdateBlockData = (id: string, updatedData: any, newLeaderNotes?: string) => {
    setSession((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === id
          ? {
              ...b,
              data: updatedData,
              ...(typeof newLeaderNotes === 'string' ? { leaderNotes: newLeaderNotes } : {}),
            }
          : b
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const initialPresenterIndex = (() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlBlockIdx = params.get('blockIndex');
      if (urlBlockIdx !== null && !isNaN(parseInt(urlBlockIdx, 10))) {
        const parsed = parseInt(urlBlockIdx, 10);
        if (parsed >= 0 && parsed < session.blocks.length) {
          return parsed;
        }
      }
      const urlBlockId = params.get('blockId');
      if (urlBlockId) {
        const found = session.blocks.findIndex((b) => b.id === urlBlockId);
        if (found >= 0) return found;
      }
    }
    const idx = session.blocks.findIndex((b) => b.id === selectedBlockId);
    return idx >= 0 ? idx : 0;
  })();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden print:h-auto print:overflow-visible bg-zinc-100/80 text-slate-900 font-sans">
      <style>{`
        @media print {
          body > #root > div > header,
          body > #root > div > div.flex-1 {
            display: none !important;
          }
        }
      `}</style>
      {/* Skjult filveljar for JSON-import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportJson}
        accept=".json"
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* TOPPLINJE (HEADER)                                                        */}
      {/* ========================================================================= */}
      <header className="h-16 border-b border-zinc-200 bg-white px-3 sm:px-5 flex items-center justify-between shrink-0 select-none z-10 shadow-2xs gap-2 sm:gap-4 print:hidden">
        <div className="flex items-center gap-2.5 shrink-0">
          <BookOpen className="w-5 h-5 text-slate-700 shrink-0" />
          <div className="shrink-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight">
              {language === 'nb' ? 'Undervisningsbygger' : 'Undervisningsbyggjar'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto py-1">
          {/* Lagre, Ny, Arkiv, Køyreplan, Leiarhefte, Gå tilbake til Storyboard (tona ned ved isAiStudioActive) */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 shrink-0 transition-opacity duration-200 ${
              isAiStudioActive
                ? 'opacity-40 pointer-events-none select-none'
                : 'opacity-100 pointer-events-auto'
            }`}
          >
            {/* Lagre */}
            <button
              type="button"
              onClick={handleSaveSession}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-medium shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Lagre denne samlinga"
            >
              <Save className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="whitespace-nowrap">Lagre</span>
            </button>

            {/* Ny */}
            <button
              type="button"
              onClick={handleNewSession}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-medium shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Start på ei heilt ny tom samling"
            >
              <FilePlus className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="whitespace-nowrap">Ny</span>
            </button>

            {/* Arkiv */}
            <button
              type="button"
              onClick={() => setIsSavedSessionsOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-medium shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Opne arkiv for lagra opplegg, import og eksport"
            >
              <FolderOpen className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="whitespace-nowrap">Arkiv</span>
            </button>

            {/* Køyreplan / Kjøreplan */}
            <button
              type="button"
              onClick={() => setIsPrintPlanOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-medium shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Opne kompakt køyreplan for utskrift (A4 / PDF)"
            >
              <Printer className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="whitespace-nowrap">{language === 'nb' ? 'Kjøreplan' : 'Køyreplan'}</span>
            </button>

            {/* Leiarhefte / Lederhefte */}
            <button
              type="button"
              onClick={() => setIsLeaderGuideOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-medium shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Opne fyldig leiarhefte med førebuing, storskjermoversikt og munnleg manus for A5-utskrift / perm"
            >
              <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="whitespace-nowrap">{language === 'nb' ? 'Lederhefte' : 'Leiarhefte'}</span>
            </button>

            {/* Gå tilbake til Storyboard (visast når det finst eit storyboard og ein ikkje er i studioet) */}
            {!isAiStudioActive && storyboard && (
              <button
                type="button"
                onClick={handleRequestReturnToStoryboard}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs sm:text-sm font-semibold shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
                title="Gå tilbake til det eksisterande Storyboardet (Fase B)"
              >
                <Undo2 className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="whitespace-nowrap">Gå tilbake til Storyboard</span>
              </button>
            )}
          </div>

          {/* Global Målformbrytar [ NN | BM ] */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => handleLanguageChange('nn')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                language === 'nn'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Nynorsk som standardspråk"
            >
              NN
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('nb')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                language === 'nb'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Bokmål som standardspråk"
            >
              BM
            </button>
          </div>

          {/* Skap alt med AI (ALLTID aktiv og interaktiv, og opnar ALLTID Fase A / Briefing) */}
          <button
            type="button"
            onClick={handleStartAiStudio}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold shadow-2xs cursor-pointer transition-all whitespace-nowrap shrink-0 ${
              isAiStudioActive
                ? 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 ring-2 ring-amber-200'
                : 'bg-amber-50 hover:bg-amber-100 border border-amber-400 text-amber-950'
            }`}
            title="Start ei AI-bestilling (Fase A: Briefing med tema, målgruppe, tidsramme og idéhjelp)"
          >
            <Sparkles className={`w-4 h-4 ${isAiStudioActive ? 'text-white' : 'text-amber-600'} shrink-0`} />
            <span className="whitespace-nowrap">Skap alt med AI</span>
          </button>

          {/* Framsyning / Fremvisning (tona ned ved isAiStudioActive) */}
          <div
            className={`shrink-0 transition-opacity duration-200 ${
              isAiStudioActive
                ? 'opacity-40 pointer-events-none select-none'
                : 'opacity-100 pointer-events-auto'
            }`}
          >
            <button
              type="button"
              onClick={handleOpenFullscreen}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold shadow-2xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Start fullskjerms vising på storskjerm"
            >
              <Play className="w-4 h-4 fill-white text-white shrink-0" />
              <span className="whitespace-nowrap">{language === 'nb' ? 'Fremvisning' : 'Framsyning'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Varselbanner */}
      {notice && (
        <div
          className={`px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs ${
            notice.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HOVUDARBEIDSOMRÅDE                                                        */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 1. Venstremeny: Blokk-bibliotek (låst visuelt og funksjonelt ved Briefing og Storyboard) */}
        <div 
          className={`w-72 shrink-0 overflow-hidden transition-opacity duration-200 ${
            isAiStudioActive 
              ? 'opacity-30 pointer-events-none select-none' 
              : 'opacity-100 pointer-events-auto'
          }`}
        >
          <BlockLibrary onAddBlock={handleAddBlockFromType} language={language} />
        </div>

        {/* 2. Hovudflate: Arbeidsbordet (eller Storyboard Studio) */}
        <WorkDesk
          session={session}
          language={language}
          onLanguageChange={handleLanguageChange}
          selectedBlockId={selectedBlockId}
          activeAiBlockId={activeAiBlockId}
          onSelectBlock={(id) => setSelectedBlockId(id)}
          onToggleAiDrawer={(id) => setActiveAiBlockId((prev) => (prev === id ? null : id))}
          onUpdateSessionTitle={handleUpdateTitle}
          onUpdateSessionSubtitle={handleUpdateSubtitle}
          onUpdateBlocks={handleUpdateBlocks}
          onAddBlockFromType={handleAddBlockFromType}
          onOpenLeaderManuscript={handleStartAiStudio}
          isAiStudioActive={isAiStudioActive}
          isEditingBriefing={isEditingBriefing}
          storyboard={storyboard}
          briefingData={briefingData}
          isGeneratingStoryboard={isGeneratingStoryboard}
          isBuildingBlocks={isBuildingBlocks}
          onGenerateStoryboard={handleGenerateStoryboard}
          onUpdateStoryboard={handleUpdateStoryboardState}
          onApproveStoryboard={handleApproveStoryboard}
          onCancelAiStudio={handleCancelAiStudio}
          onDiscardStoryboard={handleDiscardStoryboard}
          onReturnToStoryboard={handleRequestReturnToStoryboard}
          onEditBriefingChange={(isEditing) => setIsEditingBriefing(isEditing)}
        />

        {/* 3. Høgreskuff: AI-assistent for Storyboard ELLER enkeltblokk */}
        {isPhaseBActive ? (
          <BlockAiDrawer
            storyboardMode={true}
            storyboard={storyboard}
            language={language}
            isBuildingBlocks={isBuildingBlocks}
            sessionTitle={session.title}
            onClose={handleCancelAiStudio}
            onUpdateStoryboard={handleUpdateStoryboardState}
            onApproveStoryboard={handleApproveStoryboard}
          />
        ) : !isAiStudioActive && activeAiBlock ? (
          <BlockAiDrawer
            block={activeAiBlock}
            storyboard={storyboard}
            language={language}
            sessionTitle={session.title}
            onClose={() => setActiveAiBlockId(null)}
            onUpdateBlockData={(updatedData, newLeaderNotes) => {
              if (activeAiBlockId) {
                handleUpdateBlockData(activeAiBlockId, updatedData, newLeaderNotes);
              }
            }}
          />
        ) : null}
      </div>

      {/* ========================================================================= */}
      {/* MODALER                                                                   */}
      {/* ========================================================================= */}

      {/* 📂 Mine lagra opplegg */}
      <SavedSessionsModal
        isOpen={isSavedSessionsOpen}
        onClose={() => setIsSavedSessionsOpen(false)}
        currentSession={session}
        onLoadSession={(loaded) => {
          const normalized = {
            ...loaded,
            blocks: normalizeLegacyBlocks(loaded.blocks),
          };
          setSession(normalized);
          setStoryboard(normalized.storyboard || null);
          setBriefingData(normalized.briefingData || null);
          setSelectedBlockId(normalized.blocks[0]?.id || null);
          setIsAiStudioActive(false);
          showNotice(`Lasta inn «${normalized.title}»!`);
        }}
      />

      {/* 🖥️ Fullskjerms presentasjonsmodal */}
      {isFullPresenterOpen && (
        <FullPresenterModal
          session={session}
          initialBlockIndex={initialPresenterIndex >= 0 ? initialPresenterIndex : 0}
          initialViewMode={initialViewMode}
          onClose={() => {
            if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'audience') {
              window.close();
            }
            setIsFullPresenterOpen(false);
          }}
        />
      )}

      {/* 🚀 Framsynamodus-val */}
      {isLaunchModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-7 max-w-md w-full border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                Vel skjermoppsett
              </h3>
              <button
                type="button"
                onClick={() => setIsLaunchModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLaunchModalOpen(false);
                    const startIdx = initialPresenterIndex >= 0 ? initialPresenterIndex : 0;
                    const audienceUrl = `${window.location.origin}${window.location.pathname}?mode=audience&blockIndex=${startIdx}&blockId=${selectedBlockId || ''}`;
                    launchPresenterOnScreens(audienceUrl, () => {
                      setInitialViewMode('leader');
                      setIsFullPresenterOpen(true);
                    });
                  }}
                  className="flex-1 p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white transition-all shadow-md flex items-center gap-4 text-left cursor-pointer group"
                >
                  <div className="relative p-2.5 rounded-xl bg-white/10 shrink-0 flex items-center justify-center">
                    <ProjectorScreenIcon className="w-8 h-8 text-white" />
                    <div className="absolute -bottom-1 -right-1 bg-indigo-950/90 rounded-md p-1 border border-indigo-400/40 shadow-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-indigo-200">
                        <rect x="4" y="5" width="16" height="11" rx="1" />
                        <path d="M2 19h20" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
                      Leiarvisning
                    </div>
                    <div className="text-xs text-indigo-100/80 font-medium">
                      Storskjerm på lerretet + manus på laptopen
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowScreenHelp(!showScreenHelp)}
                  className="h-full px-3.5 py-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 font-bold text-base transition-colors flex items-center justify-center cursor-pointer"
                  title="Hjelp med to skjermar"
                >
                  ?
                </button>
              </div>

              {showScreenHelp && (
                <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300 transition-all animate-fadeIn">
                  <div className="font-semibold text-stone-800 dark:text-stone-100 mb-1 flex items-center gap-1.5">
                    <span>💡 Rask hurtigtast for å slå av/på speiling:</span>
                  </div>
                  
                  {isMac ? (
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5">
                        <span className="font-medium text-stone-700 dark:text-stone-200">Mac:</span> 
                        Trykk <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 font-mono font-bold text-stone-900 dark:text-stone-100">⌘ + F1</kbd> 
                        <span className="text-stone-500">(vekslar direkte mellom speiling og to skjermar)</span>
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        (Har tastaturet lys-/lydtastar øvst? Bruk <kbd className="px-1 py-0.5 rounded bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 font-mono text-[10px]">fn + ⌘ + F1</kbd>)
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="flex items-center gap-1.5">
                        <span className="font-medium text-stone-700 dark:text-stone-200">PC / Windows:</span> 
                        Trykk <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 font-mono font-bold text-stone-900 dark:text-stone-100">Win + P</kbd> og vel <strong>«Utvid»</strong>.
                      </p>
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-stone-200/60 dark:border-stone-800 flex justify-between items-center text-[11px] text-stone-500">
                    <span>{isMac ? 'Bruker du PC? Win + P' : 'Bruker du Mac? ⌘ + F1'}</span>
                    <button
                      type="button"
                      onClick={() => setShowScreenHelp(false)}
                      className="hover:text-stone-850 dark:hover:text-stone-100 underline cursor-pointer"
                    >
                      Lukk
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setInitialViewMode('audience');
                  setIsLaunchModalOpen(false);
                  setIsFullPresenterOpen(true);
                }}
                className="w-full p-4 rounded-2xl bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700/80 active:scale-[0.99] border border-stone-200 dark:border-stone-700 transition-all flex items-center gap-4 text-left cursor-pointer group"
              >
                <div className="p-2.5 rounded-xl bg-stone-200/60 dark:bg-stone-700/60 shrink-0 flex items-center justify-center">
                  <ProjectorScreenIcon className="w-8 h-8 text-stone-700 dark:text-stone-300" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-stone-900 dark:text-stone-100 tracking-tight">
                    Berre storskjerm
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                    Fullskjerm utan leiarmanus
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🖨️ Utskriftsvenleg Kompakt Køyreplan (A4 / PDF) */}
      {isPrintPlanOpen && (
        <PrintPlanModal
          session={session}
          onClose={() => setIsPrintPlanOpen(false)}
          onSwitchToLeaderGuide={() => {
            setIsPrintPlanOpen(false);
            setIsLeaderGuideOpen(true);
          }}
        />
      )}

      {/* 📖 Fyldig Leiarhefte for utskrift / PDF (A4 for perm) */}
      {isLeaderGuideOpen && (
        <LeaderGuideModal
          session={session}
          storyboard={storyboard}
          briefingData={briefingData}
          onClose={() => setIsLeaderGuideOpen(false)}
          onSwitchToCompactPlan={() => {
            setIsLeaderGuideOpen(false);
            setIsPrintPlanOpen(true);
          }}
          onUpdateSession={(updates) => {
            if (updates.storyboard) {
              setStoryboard(updates.storyboard);
            }
            setSession((prev) => ({
              ...prev,
              ...updates,
              updatedAt: new Date().toISOString(),
            }));
            showNotice('Endringane i leiarheftet er lagra!');
          }}
          onUpdateSessionMeta={(updates) => {
            if (updates.storyboard) {
              setStoryboard(updates.storyboard);
            }
            setSession((prev) => ({
              ...prev,
              ...updates,
              updatedAt: new Date().toISOString(),
            }));
          }}
        />
      )}

      {/* ↩️ Stadfestingsmodal for å gå tilbake til Storyboard */}
      {isReturnToStoryboardConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Film className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Gå tilbake til Storyboardet?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Vil du gå tilbake til Storyboardet? Viss du byggjer på nytt seinare, vil blokkene på arbeidsbordet bli erstatta.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReturnToStoryboardConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleConfirmReturnToStoryboard}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Gå til Storyboard (Fase B)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;