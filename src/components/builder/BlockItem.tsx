/**
 * src/components/builder/BlockItem.tsx
 * Enkeltblokk på arbeidsbordet (WorkDesk)
 * 
 * 100 % homogent designspråk:
 * - Kvite, flate kort: border border-slate-200 rounded-lg bg-white p-4 shadow-sm
 * - Standardisert header med blokk-ikon, tittel og handlingsknappar
 * - Reint grensesnitt utan forklaringstøy eller lorem ipsum
 * - Undervisning med klårt skilje mellom Forteljing/tekst og Kulepunkt (1–7 punkt)
 * - Manus alltid nedst i lys grå ramme med notat-ikon
 */

import React, { useState, useRef } from 'react';
import { 
  TeachingBlock, 
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
  KimsLeikItem,
  ReisDegData,
  ReisDegItem,
  BileteAvdekkingData,
  BildeData,
  BileteData,
  LysbileteshowData,
  BildeBibelenData,
  BildeBibelenScene,
  BeatForBeatData,
  OrdForOrdData,
  KvenSkalUtData,
  KvenSkalUtItem,
  SvartSkjermData
} from '../../types';
import { BEAT_FOR_BEAT_SONGS } from '../../data/beatForBeatSongs';
import { BLOCK_METADATA, getBlockMetadata } from '../../lib/undervisningDefaults';
import { calculateSlideTextScale, isRawFileName, getCleanCaption } from '../../lib/presentationUtils';
import { getItemGraphic, getPresetItems, generateKimsItemsWithAI, KimsTheme } from '../../lib/kimsLeikUtils';
import { 
  GripVertical, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff,
  ArrowUp, 
  ArrowDown, 
  Plus, 
  X,
  GraduationCap, 
  BookMarked, 
  Info, 
  HeartHandshake, 
  Zap, 
  Trophy, 
  MessagesSquare,
  Clock,
  HelpCircle,
  Music,
  FileText,
  List,
  ListOrdered,
  Type,
  AlertTriangle,
  PackageCheck,
  Brain,
  ArrowUpDown,
  LayoutGrid,
  Music2,
  Sparkles,
  Image,
  Film,
  BookOpen,
  Video,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Upload,
  CheckCircle,
  Play,
  Pause,
  Repeat,
  Loader2,
  MonitorOff,
  Search
} from 'lucide-react';
import { translateNorwegianQuery, searchWikimediaCommons, fetchSweetPublishingSeries } from '../../lib/imageSearchService';
import { parseVideoUrl, formatSecondsToMinSec, parseMinSecToSeconds } from '../../lib/videoUtils';
import { optimizeImageFile } from '../../lib/imageOptimization';

interface BlockItemProps {
  block: TeachingBlock;
  index: number;
  totalBlocks: number;
  isSelectedForPreview: boolean;
  onSelectForPreview: () => void;
  onToggleExpand: () => void;
  onUpdateBlockData: (updatedData: any, newLeaderNotes?: string) => void;
  onUpdateBlockLeaderNotes?: (notes: string) => void;
  onDeleteBlock: () => void;
  onDuplicateBlock: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleHiddenOnScreen?: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragTarget?: boolean;
  isAiDrawerOpen?: boolean;
  onToggleAiDrawer?: (blockId: string) => void;
  language?: 'nn' | 'nb';
}

export const BlockItem: React.FC<BlockItemProps> = ({
  block,
  index,
  totalBlocks,
  isSelectedForPreview,
  onSelectForPreview,
  onToggleExpand,
  onUpdateBlockData,
  onUpdateBlockLeaderNotes,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveUp,
  onMoveDown,
  onToggleHiddenOnScreen,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragTarget,
  isAiDrawerOpen,
  onToggleAiDrawer,
  language = 'nn',
}) => {
  const [canDrag, setCanDrag] = useState(false);
  const [activeEmojiPickerIdx, setActiveEmojiPickerIdx] = useState<number | null>(null);
  const [isOptimizingImages, setIsOptimizingImages] = useState(false);

  // Lokal AI-hjelp state
  const [isLocalAiOpen, setIsLocalAiOpen] = useState(false);
  const [localAiPrompt, setLocalAiPrompt] = useState('');
  const [isLocalAiLoading, setIsLocalAiLoading] = useState(false);
  const [localAiError, setLocalAiError] = useState<string | null>(null);
  const [localAiSuccess, setLocalAiSuccess] = useState(false);

  // Bilete-avdekking state & ref på toppnivå (hindrar "Rendered fewer hooks"-krasj ved lukking)
  const bileteAvdekkingFileInputRef = useRef<HTMLInputElement>(null);
  const [isBileteAvdekkingDragging, setIsBileteAvdekkingDragging] = useState(false);
  const [isProcessingHeic, setIsProcessingHeic] = useState(false);
  const [avdekkingPixabayQuery, setAvdekkingPixabayQuery] = useState('');
  const [avdekkingPixabayHits, setAvdekkingPixabayHits] = useState<Array<{ id: string; url: string; alt?: string }>>([]);
  const [isSearchingAvdekkingPixabay, setIsSearchingAvdekkingPixabay] = useState(false);
  const [avdekkingPixabayError, setAvdekkingPixabayError] = useState<string | null>(null);
  const meta = getBlockMetadata(block.type, language);

  const renderIcon = (className: string = 'w-4 h-4') => {
    switch (block.type) {
      case 'stikkord':
        return <ListOrdered className={className} />;
      case 'tekst':
        return <FileText className={className} />;
      case 'undervisning':
        return <GraduationCap className={className} />;
      case 'bibelord':
        return <BookMarked className={className} />;
      case 'informasjon':
        return <Info className={className} />;
      case 'bonn_dikt':
        return <HeartHandshake className={className} />;
      case 'samtale':
        return <MessagesSquare className={className} />;
      case 'sang_salme':
        return <Music className={className} />;
      case 'henteleik':
        return <PackageCheck className={className} />;
      case 'kims_leik':
        return <Brain className={className} />;
      case 'reis_deg':
        return <ArrowUpDown className={className} />;
      case 'bilete_avdekking':
        return <LayoutGrid className={className} />;
      case 'beat_for_beat':
        return <Music2 className={className} />;
      case 'ord_for_ord':
        return <Type className={className} />;
      case 'kven_skal_ut':
        return <HelpCircle className={className} />;
      case 'quiz':
        return <HelpCircle className={className} />;
      case 'lek':
        return <Zap className={className} />;
      case 'konkurranse':
        return <Trophy className={className} />;
      case 'bilete':
      case 'bilde':
        return <Image className={className} />;
      case 'lysbileteshow':
        return <Film className={className} />;
      case 'bildebibelen':
        return <BookOpen className={className} />;
      case 'video':
        return <Video className={className} />;
      case 'svart_skjerm':
        return <MonitorOff className={className} />;
    }
  };

  const getBlockTitle = (): string => {
    switch (block.type) {
      case 'stikkord':
        return (block.data as StikkordData).title || meta.label;
      case 'tekst':
        return (block.data as TekstData).title || meta.label;
      case 'undervisning':
        return (block.data as UndervisningData).title || meta.label;
      case 'bibelord': {
        const bd = block.data as any;
        return bd.scriptureRef || bd.bibleRef || bd.reference || bd.title || meta.label;
      }
      case 'informasjon':
        return (block.data as InformasjonData).heading || meta.label;
      case 'bonn_dikt':
        return (block.data as BonnDiktData).title || meta.label;
      case 'samtale':
        return (block.data as SamtaleData).topic || meta.label;
      case 'quiz':
        return (block.data as QuizData).title || meta.label;
      case 'henteleik':
        return (block.data as HenteleikData).title || meta.label;
      case 'kims_leik':
        return (block.data as KimsLeikData).title || meta.label;
      case 'reis_deg':
        return (block.data as ReisDegData).title || meta.label;
      case 'bilete_avdekking':
        return (block.data as BileteAvdekkingData).title || meta.label;
      case 'beat_for_beat':
        return (block.data as BeatForBeatData).title || meta.label;
      case 'ord_for_ord':
        return (block.data as OrdForOrdData).title || meta.label;
      case 'kven_skal_ut':
        return (block.data as KvenSkalUtData).title || meta.label;
      case 'bilete':
      case 'bilde':
        return (block.data as any).title || meta.label;
      case 'lysbileteshow':
        return (block.data as LysbileteshowData).title || meta.label;
      case 'bildebibelen':
        return (block.data as BildeBibelenData).title || meta.label;
      case 'video':
        return (block.data as any).title || meta.label;
      case 'sang_salme': {
        const d = block.data as SangSalmeData;
        return d.songNumber ? `${d.songNumber} – ${d.title || meta.label}` : (d.title || meta.label);
      }
      case 'lek':
        return (block.data as LekData).name || meta.label;
      case 'konkurranse':
        return (block.data as KonkurranseData).title || meta.label;
      case 'svart_skjerm':
        return (block.data as SvartSkjermData)?.title || meta.label;
    }
  };

  const getDuration = (): number => {
    return block.data.durationMinutes ?? meta.defaultMinutes;
  };

  const setDuration = (mins: number) => {
    const minBound = block.type === 'svart_skjerm' ? 0 : 1;
    const val = Math.max(minBound, isNaN(mins) ? minBound : mins);
    onUpdateBlockData({ ...block.data, durationMinutes: val });
  };

  // 1. «Stikkord» (1–8 stikkord med talernotat)
  const renderStikkordFields = () => {
    const d = block.data as StikkordData;
    const points = d.points || [];

    const handleAddPoint = () => {
      if (points.length >= 8) return;
      const newPoint: StikkordPoint = {
        id: `sp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        text: '',
        note: '',
      };
      onUpdateBlockData({ ...d, points: [...points, newPoint] });
    };

    const handleUpdatePoint = (idx: number, field: 'text' | 'note', val: string) => {
      const next = [...points];
      next[idx] = { ...next[idx], [field]: val };
      onUpdateBlockData({ ...d, points: next });
    };

    const handleDeletePoint = (idx: number) => {
      const next = points.filter((_, i) => i !== idx);
      onUpdateBlockData({ ...d, points: next });
    };

    return (
      <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Skriv tittel her..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 10}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Stikkord og manus ({points.length} moment)
            </label>
            <button
              type="button"
              onClick={handleAddPoint}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nytt stikkord m/utdjuping</span>
            </button>
          </div>

          {points.length === 0 ? (
            <button
              type="button"
              onClick={handleAddPoint}
              className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer bg-slate-50/50 transition-colors"
            >
              <Plus className="w-4 h-4 text-slate-400" />
              <span>+ Nytt stikkord m/utdjuping</span>
            </button>
          ) : (
            <div className="space-y-3">
              {points.map((pt, idx) => (
                <div 
                  key={pt.id || idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span>Moment {idx + 1}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeletePoint(idx)}
                      className="p-1 text-slate-400 hover:text-red-500 cursor-pointer rounded-md hover:bg-red-50 transition-colors"
                      title="Fjern dette momentet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* a) Stikkord / Overskrift: Eitt linjefelt (stort og tydeleg) */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Stikkord / Overskrift (visast stort på storskjerm og i leiarvisning)
                    </label>
                    <input
                      type="text"
                      value={pt.text || ''}
                      onChange={(e) => handleUpdatePoint(idx, 'text', e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="Stikkord / Overskrift (t.d. «Kva er nåde?»)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-base font-semibold focus:outline-none focus:border-slate-400 transition-colors placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>

                  {/* b) Utdjuping / Kva du vil seie: Tekstfelt med 2–4 linjer */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Utdjuping / Kva du vil seie (manus, bakgrunnsstoff, historier for leiar)
                    </label>
                    <textarea
                      rows={3}
                      value={pt.note || ''}
                      onChange={(e) => handleUpdatePoint(idx, 'note', e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="Kva du vil seie, manuset eller bakgrunnsstoffet til dette stikkordet..."
                      className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-normal leading-relaxed focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 2. «Tekst» (sitat, kjernebodskap eller forteljing)
  const renderTekstFields = () => {
    const d = block.data as any;
    const textContent = d.text || d.slideText || d.content || '';
    const scale = calculateSlideTextScale(textContent, !!d.title);
    const charCount = scale.charCount;
    const isUnderThreshold = scale.isUnderWarningThreshold;

    return (
      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Skriv tittel her..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 8}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-slate-600 dark:text-stone-400">
              Tekst på storskjerm
            </label>
            <span className={`text-[10px] font-mono ${isUnderThreshold ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'}`}>
              {charCount} teikn • Ca. {scale.estimatedPt} pt {scale.estimatedPt === 70 ? '(maks tak)' : ''}
            </span>
          </div>
          <textarea
            rows={4}
            value={textContent}
            onChange={(e) => onUpdateBlockData({ ...d, text: e.target.value, slideText: e.target.value, content: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Skriv sitat, kjernebodskap eller kort refleksjon som skal visast på storskjerm..."
            className="w-full p-2.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-sans leading-relaxed"
          />
          {isUnderThreshold && (
            <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <p className="font-semibold">
                  Advarsel: Teksten er lang for storskjerm ({charCount} teikn, ca. {scale.estimatedPt} pt).
                </p>
                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                  Fontstorleiken på storskjerm må skalerast ned under 36 pt (PowerPoint-ekvivalent) for å få plass. Vurder å korte inn for å sikre god lesbarheit på avstand.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 3. «Undervisning» (historisk / bakoverkompatibel)
  const renderUndervisningFields = () => {
    const d = block.data as UndervisningData;
    const mode = d.mode || (d.slidePoints && d.slidePoints.length > 0 ? 'kulepunkt' : 'tekst');
    const slidePoints = d.slidePoints || [];

    const setMode = (newMode: 'tekst' | 'kulepunkt') => {
      onUpdateBlockData({ ...d, mode: newMode });
    };

    const handleAddSlidePoint = () => {
      if (slidePoints.length >= 7) return;
      const newPoint = {
        id: `sp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        text: '',
        note: '',
      };
      onUpdateBlockData({ ...d, mode: 'kulepunkt', slidePoints: [...slidePoints, newPoint] });
    };

    const handleUpdateSlidePoint = (idx: number, field: 'text' | 'note', val: string) => {
      const next = [...slidePoints];
      next[idx] = { ...next[idx], [field]: val };
      onUpdateBlockData({ ...d, slidePoints: next });
    };

    const handleDeleteSlidePoint = (idx: number) => {
      const next = slidePoints.filter((_, i) => i !== idx);
      onUpdateBlockData({ ...d, slidePoints: next });
    };

    return (
      <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        {/* Tittel og tidsbruk */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Skriv tittel her..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 12}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* Modusveljar: Forteljing/Tekst vs Kulepunkt */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] font-medium text-slate-500">Format:</span>
          <div className="inline-flex rounded-md border border-slate-200 dark:border-stone-700 p-0.5 bg-slate-50 dark:bg-stone-800">
            <button
              type="button"
              onClick={() => setMode('tekst')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                mode === 'tekst'
                  ? 'bg-white dark:bg-stone-900 text-slate-900 dark:text-stone-100 shadow-2xs'
                  : 'text-slate-600 dark:text-stone-400 hover:text-slate-900'
              }`}
            >
              <Type className="w-3 h-3" />
              <span>Forteljing / Tekst</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('kulepunkt');
                if (!d.slidePoints || d.slidePoints.length === 0) {
                  handleAddSlidePoint();
                }
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                mode === 'kulepunkt'
                  ? 'bg-white dark:bg-stone-900 text-slate-900 dark:text-stone-100 shadow-2xs'
                  : 'text-slate-600 dark:text-stone-400 hover:text-slate-900'
              }`}
            >
              <List className="w-3 h-3" />
              <span>Kulepunkt (1–7 punkt)</span>
            </button>
          </div>
        </div>

        {/* FORMAT A: Forteljing / Tekst */}
        {mode === 'tekst' && (
          <div className="space-y-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400">
              Bodskap / sitat på storskjerm
            </label>
            <textarea
              rows={3}
              value={d.slideContent || ''}
              onChange={(e) => onUpdateBlockData({ ...d, slideContent: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Skriv det som skal visast på storskjerm..."
              className="w-full p-2.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-sans leading-relaxed"
            />
          </div>
        )}

        {/* FORMAT B: Kulepunkt (1–7 punkt) */}
        {mode === 'kulepunkt' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Kulepunkt og manus ({slidePoints.length}/7)
              </label>
              {slidePoints.length < 7 && (
                <button
                  type="button"
                  onClick={handleAddSlidePoint}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Nytt stikkord m/utdjuping</span>
                </button>
              )}
            </div>

            {slidePoints.length === 0 ? (
              <button
                type="button"
                onClick={handleAddSlidePoint}
                className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer bg-slate-50/50 transition-colors"
              >
                <Plus className="w-4 h-4 text-slate-400" />
                <span>+ Nytt stikkord m/utdjuping</span>
              </button>
            ) : (
              <div className="space-y-3">
                {slidePoints.map((pt, idx) => (
                  <div 
                    key={pt.id || idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span>Moment {idx + 1}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlidePoint(idx)}
                        className="p-1 text-slate-400 hover:text-red-500 cursor-pointer rounded-md hover:bg-red-50 transition-colors"
                        title="Fjern punkt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* a) Stikkord / Overskrift: Eitt linjefelt (stort og tydeleg) */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Stikkord / Overskrift (visast stort på storskjerm og i leiarvisning)
                      </label>
                      <input
                        type="text"
                        value={pt.text || ''}
                        onChange={(e) => handleUpdateSlidePoint(idx, 'text', e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="Stikkord / Overskrift (t.d. «Kva er nåde?»)"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-base font-semibold focus:outline-none focus:border-slate-400 transition-colors placeholder:font-normal placeholder:text-slate-400"
                      />
                    </div>

                    {/* b) Utdjuping / Kva du vil seie: Tekstfelt med 2–4 linjer */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Utdjuping / Kva du vil seie (manus, bakgrunnsstoff, historier for leiar)
                      </label>
                      <textarea
                        rows={3}
                        value={pt.note || ''}
                        onChange={(e) => handleUpdateSlidePoint(idx, 'note', e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="Kva du vil seie, manuset eller bakgrunnsstoffet til dette stikkordet..."
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-normal leading-relaxed focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 2. «Bibelord»
  const renderBibelordFields = () => {
    const d = block.data as any;
    const scriptureRef = d.reference || d.scriptureRef || d.bibleRef || '';
    const activeVerseOnScreen = d.verseText || d.verse || d.bibleText || d.keyVerse || d.text || d.quote || '';
    const explanationText = d.explanation || d.notes || d.contextText || d.leaderNotes || '';
    const scale = calculateSlideTextScale(activeVerseOnScreen, !!scriptureRef);
    const charCount = scale.charCount;
    const isUnderThreshold = scale.isUnderWarningThreshold;

    return (
      <div className="space-y-4 pt-3 border-t border-slate-100 text-xs">
        {/* Tilvising og tidsbruk */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Bibeltilvising
            </label>
            <input
              type="text"
              value={scriptureRef}
              onChange={(e) => onUpdateBlockData({ 
                ...d, 
                reference: e.target.value,
                scriptureRef: e.target.value, 
                bibleRef: e.target.value 
              })}
              placeholder="T.d. Luk 15, 11–24 eller Joh 3, 16..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:border-slate-400 font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 8}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* 1. Bibelverset øvst (visast på storskjerm) */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <span>Bibelverset (visast på storskjerm)</span>
            </label>
            {charCount > 0 && (
              <span className={`text-[10px] font-mono ${isUnderThreshold ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                {charCount} teikn • Ca. {scale.estimatedPt} pt {scale.estimatedPt === 70 ? '(maks tak)' : ''}
              </span>
            )}
          </div>
          <textarea
            rows={3}
            value={activeVerseOnScreen}
            onChange={(e) => onUpdateBlockData({ 
              ...d, 
              verseText: e.target.value, 
              bibleText: e.target.value, 
              keyVerse: e.target.value, 
              text: e.target.value 
            })}
            placeholder="Skriv verset som skal visast på storskjerm..."
            className="w-full p-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:border-slate-400 leading-relaxed font-serif transition-colors"
          />
          {isUnderThreshold && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <p className="font-semibold">
                  Advarsel: Teksten er lang for storskjerm ({charCount} teikn, ca. {scale.estimatedPt} pt).
                </p>
                <p className="text-[11px] text-amber-700">
                  Fontstorleiken på storskjerm må skalerast ned for å få plass. Vurder å korte inn nøkkelverset og leggje resten i leiar-notatet under.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 2. Leiar-notatet / utdjupinga i feltet under */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
          <label className="block text-xs font-semibold text-slate-800">
            Utdjuping / Kva du vil seie (leiarvisning og bakgrunnsstoff)
          </label>
          <textarea
            rows={3}
            value={explanationText}
            onChange={(e) => onUpdateBlockData({ 
              ...d, 
              explanation: e.target.value, 
              notes: e.target.value, 
              contextText: e.target.value,
              leaderNotes: e.target.value 
            })}
            placeholder="Kva du vil seie, manuset, kontekst, historisk bakgrunn eller forklaring for leiarvisning..."
            className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-normal leading-relaxed focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
          />
        </div>
      </div>
    );
  };

  // 3. «Informasjon»
  const renderInformasjonFields = () => {
    const d = block.data as InformasjonData;
    return (
      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Overskrift
            </label>
            <input
              type="text"
              value={d.heading || ''}
              onChange={(e) => onUpdateBlockData({ ...d, heading: e.target.value })}
              placeholder="Skriv overskrift her..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 5}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-slate-600 dark:text-stone-400">
              Praktiske punkt
            </label>
            <button
              type="button"
              onClick={() => {
                const next = [...(d.practicalPoints || []), ''];
                onUpdateBlockData({ ...d, practicalPoints: next });
              }}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:underline cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Legg til punkt
            </button>
          </div>
          <div className="space-y-1.5">
            {(d.practicalPoints || ['']).map((pt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 ml-1" />
                <input
                  type="text"
                  value={pt}
                  onChange={(e) => {
                    const next = [...d.practicalPoints];
                    next[idx] = e.target.value;
                    onUpdateBlockData({ ...d, practicalPoints: next });
                  }}
                  placeholder="Skriv punkt her..."
                  className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = d.practicalPoints.filter((_, i) => i !== idx);
                    onUpdateBlockData({ ...d, practicalPoints: next });
                  }}
                  className="p-1 rounded text-slate-400 hover:text-red-500 cursor-pointer"
                  title="Fjern punkt"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
            Viktig varsel / hugs-boks (storskjerm)
          </label>
          <input
            type="text"
            value={d.noticeBox || ''}
            onChange={(e) => onUpdateBlockData({ ...d, noticeBox: e.target.value })}
            placeholder="Skriv eventuell viktig beskjed her..."
            className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
      </div>
    );
  };

  // 4. «Bøn / Dikt»
  const renderBonnDiktFields = () => {
    const d = block.data as BonnDiktData;
    return (
      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              placeholder="Skriv tittel her..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 5}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
            Bønnetekst (storskjerm)
          </label>
          <textarea
            rows={4}
            value={d.text || ''}
            onChange={(e) => onUpdateBlockData({ ...d, text: e.target.value })}
            placeholder="Skriv bønnetekst her..."
            className="w-full p-2.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 leading-relaxed font-serif"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-[11px] font-medium text-slate-700 dark:text-stone-300">
            <input
              type="checkbox"
              checked={d.isResponsive ?? false}
              onChange={(e) => onUpdateBlockData({ ...d, isResponsive: e.target.checked })}
              className="rounded text-slate-600 focus:ring-slate-500"
            />
            <span>Veksellesing (felles svar frå forsamlinga)</span>
          </label>

          {d.isResponsive && (
            <textarea
              rows={2}
              value={d.responsiveReading || ''}
              onChange={(e) => onUpdateBlockData({ ...d, responsiveReading: e.target.value })}
              placeholder="Skriv veksellesing her (t.d. L: / Alle:)..."
              className="w-full p-2.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-sans"
            />
          )}
        </div>
      </div>
    );
  };

  // 1. «Henteleiken»
  const renderHenteleikFields = () => {
    const d = block.data as HenteleikData;
    const items = d.items || [];

    const handleAddItem = () => {
      const newItem: HenteleikItem = {
        id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        text: '',
      };
      onUpdateBlockData({ ...d, items: [...items, newItem] });
    };

    const handleUpdateItem = (idx: number, val: string) => {
      const next = [...items];
      next[idx] = { ...next[idx], text: val };
      onUpdateBlockData({ ...d, items: next });
    };

    const handleDeleteItem = (idx: number) => {
      const next = items.filter((_, i) => i !== idx);
      onUpdateBlockData({ ...d, items: next });
    };

    const teamCount = d.teamCount || 2;
    const teamNames = d.teamNames || ['Lag 1', 'Lag 2', 'Lag 3', 'Lag 4'];

    const handleTeamCountChange = (newCount: number) => {
      onUpdateBlockData({ ...d, teamCount: newCount });
    };

    const handleTeamNameChange = (idx: number, name: string) => {
      const nextNames = [...teamNames];
      nextNames[idx] = name;
      onUpdateBlockData({ ...d, teamNames: nextNames });
    };

    return (
      <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        {/* Tittel og tidsbruk */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="T.d. Henteleiken før pausen..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 8}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* VAL AV LAG OG LAGNAMN FOR POENGGIVING */}
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800">
              Antall lag i konkurransen
            </label>
            <div className="flex items-center gap-1.5">
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleTeamCountChange(count)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                    teamCount === count
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {count} lag
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {Array.from({ length: teamCount }).map((_, i) => (
              <div key={i} className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Lagnamn {i + 1}
                </label>
                <input
                  type="text"
                  value={teamNames[i] || `Lag ${i + 1}`}
                  onChange={(e) => handleTeamNameChange(i, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder={`Lag ${i + 1}`}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:border-slate-400"
                />
              </div>
            ))}
          </div>
        </div>

        {/* LISTE OVER GJENSTANDAR SOM SKAL HENTAST */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-slate-600 dark:text-stone-400">
              Gjenstandar som skal hentast ({items.length})
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Legg til gjenstand
            </button>
          </div>

          {items.length === 0 ? (
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-2.5 border border-dashed border-slate-200 dark:border-stone-700 rounded-md text-slate-500 hover:text-slate-800 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Legg til fyrste gjenstand
            </button>
          ) : (
            <div className="space-y-1.5">
              {items.map((item, idx) => (
                <div key={item.id || idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-stone-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => handleUpdateItem(idx, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder={`Gjenstand ${idx + 1} (t.d. noko raudt, ein blyant)...`}
                    className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer rounded"
                    title="Slett gjenstand"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 2. «Kims leik»
  const [geminiPrompt, setGeminiPrompt] = useState('');
  const [isGeneratingKims, setIsGeneratingKims] = useState(false);

  const renderKimsLeikFields = () => {
    const d = block.data as KimsLeikData;
    const rawItems = d.items || [];
    const itemCount: 12 | 16 | 20 = d.itemCount || 16;

    const items: KimsLeikItem[] = rawItems.map((it, idx) => {
      if (typeof it === 'string') {
        return { id: `kims_${idx}`, name: it, emoji: '📦', text: it, iconName: '📦' };
      }
      return {
        id: it.id || `kims_${idx}`,
        name: it.name || it.text || '',
        emoji: it.emoji || it.iconName || '',
        text: it.text || it.name || '',
        iconName: it.iconName || it.emoji || '',
      };
    });

    const handleCountChange = (newCount: 12 | 16 | 20) => {
      let updatedItems: KimsLeikItem[] = [...items];
      if (updatedItems.length < newCount) {
        for (let i = updatedItems.length; i < newCount; i++) {
          updatedItems.push({
            id: `kims_slot_${Date.now()}_${i + 1}`,
            name: '',
            emoji: '',
            text: '',
            iconName: '',
          });
        }
      } else if (updatedItems.length > newCount) {
        updatedItems = updatedItems.slice(0, newCount);
      }
      onUpdateBlockData({ ...d, itemCount: newCount, items: updatedItems });
    };

    const handleGenerateWithAI = async () => {
      if (!geminiPrompt.trim()) return;
      setIsGeneratingKims(true);
      try {
        const generated = await generateKimsItemsWithAI(geminiPrompt, itemCount, language);
        onUpdateBlockData({ ...d, itemCount, items: generated });
      } finally {
        setIsGeneratingKims(false);
      }
    };

    const handleUpdateItemText = (idx: number, val: string) => {
      const next = [...items];
      const cur = next[idx] || { id: `kims_${idx}`, name: '', emoji: '', text: '', iconName: '' };
      next[idx] = { ...cur, name: val, text: val };
      onUpdateBlockData({ ...d, items: next });
    };

    const handleUpdateItemEmoji = (idx: number, emojiVal: string) => {
      const next = [...items];
      const cur = next[idx] || { id: `kims_${idx}`, name: '', emoji: '', text: '', iconName: '' };
      next[idx] = { ...cur, emoji: emojiVal, iconName: emojiVal };
      onUpdateBlockData({ ...d, items: next });
    };

    const handleAddItem = () => {
      const nextCount = (items.length + 1) as any;
      onUpdateBlockData({
        ...d,
        itemCount: nextCount <= 12 ? 12 : nextCount <= 16 ? 16 : 20,
        items: [...items, { id: `kims_slot_${Date.now()}`, name: '', text: '', emoji: '', iconName: '' }],
      });
    };

    const handleDeleteItem = (idx: number) => {
      const next = [...items];
      next[idx] = { ...next[idx], name: '', emoji: '', text: '', iconName: '' };
      onUpdateBlockData({ ...d, items: next });
    };

    const filledCount = items.filter(it => (it.name || it.text || '').trim().length > 0).length;

    return (
      <div className="space-y-4 pt-3 border-t border-slate-100 text-xs">
        {/* Top-linje: Tittel, Sekund-nedtelling, Tidsbruk */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Tittel
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Kims leik..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:border-slate-400 font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Hugsetid (sekund)
            </label>
            <select
              value={d.timerSeconds || 30}
              onChange={(e) => onUpdateBlockData({ ...d, timerSeconds: parseInt(e.target.value, 10) })}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:border-slate-400 font-medium"
            >
              <option value={20}>20 sekund</option>
              <option value={30}>30 sekund (Standard)</option>
              <option value={45}>45 sekund</option>
              <option value={60}>60 sekund</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 6}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* 1. VAL AV TAL PÅ GJENSTANDAR (12, 16 ELLER 20) */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800">
              Antall gjenstandar på storskjerm
            </label>
            <span className="text-[11px] text-slate-500 font-medium">
              Rutenett tilpassar seg automatisk
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleCountChange(12)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                itemCount === 12
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              12 gjenstandar (4×3)
            </button>
            <button
              type="button"
              onClick={() => handleCountChange(16)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                itemCount === 16
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              16 gjenstandar (4×4 STANDARD)
            </button>
            <button
              type="button"
              onClick={() => handleCountChange(20)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                itemCount === 20
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              20 gjenstandar (5×4)
            </button>
          </div>

          {/* ELEGANT FRITEKSTFELT FOR GEMINI */}
          <div className="pt-2 border-t border-slate-200/80 space-y-2">
            <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Fyll ut gjenstandar med KI</span>
            </label>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={geminiPrompt}
                onChange={(e) => setGeminiPrompt(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateWithAI()}
                placeholder="Skriv tema, f.eks: Kyrkjelege høgtider, påske, symbol i kyrkja..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-slate-400 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isGeneratingKims || !geminiPrompt.trim()}
                className={`px-3.5 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all shrink-0 ${
                  isGeneratingKims || !geminiPrompt.trim()
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-900'
                }`}
              >
                {isGeneratingKims ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Genererer...</span>
                  </>
                ) : (
                  <>
                    <span>✨ Generer gjenstandar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RYDDIG LISTE OVER DEI 12, 16 ELLER 20 GJENSTANDANE */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Gjenstandar ({filledCount} av {itemCount})
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Legg til gjenstand
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {items.map((it, idx) => {
              const graphic = getItemGraphic(it);

              return (
                <div 
                  key={it.id || idx} 
                  className="p-2 rounded-xl border border-slate-200 bg-white flex items-center gap-2.5 shadow-2xs"
                >
                  <span className="w-5 text-[11px] font-bold text-slate-400 text-right shrink-0">
                    {idx + 1}.
                  </span>

                  {/* Klikkbart Ikon / Symbol badge med Custom Emoji Veljar */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      title="Klikk for å velje eller skrive inn eigen emoji/symbol"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveEmojiPickerIdx(activeEmojiPickerIdx === idx ? null : idx);
                      }}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center text-lg font-bold cursor-pointer hover:scale-105 transition-all shadow-2xs ${graphic.bgClass}`}
                    >
                      {graphic.emoji}
                    </button>

                    {activeEmojiPickerIdx === idx && (
                      <div 
                        onMouseDown={(e) => e.stopPropagation()}
                        className="absolute left-0 top-10 z-40 w-64 p-3 rounded-xl bg-white border border-slate-300 shadow-xl space-y-2 select-text"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                          <span className="truncate pr-2">Vel emoji for «{(typeof it === 'object' && (it.name || it.text)) || `Gjenstand ${idx + 1}`}»</span>
                          <button 
                            type="button" 
                            onClick={() => setActiveEmojiPickerIdx(null)}
                            className="p-0.5 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Hurtigval-rutenett */}
                        <div className="grid grid-cols-6 gap-1.5 p-1.5 bg-slate-50 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
                          {['🐷', '💍', '👡', '🪙', '🏺', '🍞', '🍇', '🐑', '👑', '🕯️', '📖', '✝️', '🍷', '❤️', '🕊️', '🙏', '⭐', '⛪', '💧', '👼', '🔑', '⛵', '⚔️', '🛡️', '🥋', '🌾', '🐟', '🦁', '🎺', '☀️', '🌈', '🪨', '📦', '⚽', '🍎', '📱', '☕', '🌿'].map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => {
                                handleUpdateItemEmoji(idx, em);
                                setActiveEmojiPickerIdx(null);
                              }}
                              className="w-7 h-7 rounded hover:bg-white flex items-center justify-center text-base cursor-pointer border border-transparent hover:border-slate-300 transition-all"
                            >
                              {em}
                            </button>
                          ))}
                        </div>

                        {/* Egodefinert fritekst/emoji felt */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="Skriv/lim inn emoji..."
                            value={(typeof it === 'object' && (it.emoji || it.iconName)) || ''}
                            onChange={(e) => handleUpdateItemEmoji(idx, e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="flex-1 px-2 py-1 rounded border border-slate-200 text-xs font-mono focus:outline-none focus:border-slate-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tekstfelt for namn på gjenstand */}
                  <input
                    type="text"
                    value={(typeof it === 'object' && (it.name || it.text)) || (typeof it === 'string' ? it : '')}
                    onChange={(e) => handleUpdateItemText(idx, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="f.eks: Kross, Lam, Brød..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:border-slate-400 placeholder:text-slate-400 placeholder:font-normal"
                  />

                  {/* X-knapp for tømming */}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer rounded-lg hover:bg-red-50 transition-colors shrink-0"
                    title="Tøm felt"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // 3. «Reis deg»
  const renderReisDegFields = () => {
    const d = block.data as ReisDegData;
    const statements = d.statements || [];

    const handleAddStatement = () => {
      const newSt: ReisDegItem = {
        id: `rd_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        statement: '',
      };
      onUpdateBlockData({ ...d, statements: [...statements, newSt] });
    };

    const handleUpdateStatement = (idx: number, val: string) => {
      const next = [...statements];
      next[idx] = { ...next[idx], statement: val };
      onUpdateBlockData({ ...d, statements: next });
    };

    const handleDeleteStatement = (idx: number) => {
      const next = statements.filter((_, i) => i !== idx);
      onUpdateBlockData({ ...d, statements: next });
    };

    return (
      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Reis deg..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 6}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
            Instruksjonstekst (visast på startskjerm)
          </label>
          <input
            type="text"
            value={d.intro || ''}
            onChange={(e) => onUpdateBlockData({ ...d, intro: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Reis deg dersom påstanden passar for deg..."
            className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-slate-600 dark:text-stone-400">
              Påstandar ({statements.length})
            </label>
            <button
              type="button"
              onClick={handleAddStatement}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Legg til påstand
            </button>
          </div>
          {statements.map((st, idx) => (
            <div key={st.id || idx} className="flex items-center gap-2">
              <span className="w-5 text-[10px] font-bold text-slate-400 text-right">{idx + 1}.</span>
              <input
                type="text"
                value={st.statement}
                onChange={(e) => handleUpdateStatement(idx, e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="T.d. dersom du likar taco betre enn pizza..."
                className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <button
                type="button"
                onClick={() => handleDeleteStatement(idx)}
                className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 4. «Bilete-avdekking»
  const renderBileteAvdekkingFields = () => {
    const d = block.data as BileteAvdekkingData;

    const handleFileProcess = async (file: File) => {
      if (!file) return;
      const fileName = file.name.toLowerCase();
      const fileType = file.type.toLowerCase();
      const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || fileType.includes('heic') || fileType.includes('heif');

      if (isHeic) {
        setIsProcessingHeic(true);
        try {
          const heic2anyModule = await import('heic2any');
          const heic2anyFn = heic2anyModule.default || heic2anyModule;
          const resultBlob = await heic2anyFn({ blob: file, toType: 'image/jpeg' });
          const finalBlob = Array.isArray(resultBlob) ? resultBlob[0] : resultBlob;
          const reader = new FileReader();
          reader.onload = (e) => {
            onUpdateBlockData({ ...d, imageUrl: e.target?.result as string });
            setIsProcessingHeic(false);
          };
          reader.readAsDataURL(finalBlob);
        } catch (err) {
          console.warn('Feil ved HEIC-konvertering:', err);
          setIsProcessingHeic(false);
          const reader = new FileReader();
          reader.onload = (e) => {
            onUpdateBlockData({ ...d, imageUrl: e.target?.result as string });
          };
          reader.readAsDataURL(file);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          onUpdateBlockData({ ...d, imageUrl: e.target?.result as string });
        };
        reader.readAsDataURL(file);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsBileteAvdekkingDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileProcess(e.dataTransfer.files[0]);
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsBileteAvdekkingDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsBileteAvdekkingDragging(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileProcess(e.target.files[0]);
      }
    };

    return (
      <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Bilete-avdekking..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tal på brikker
            </label>
            <select
              value={d.gridSize || 100}
              onChange={(e) => onUpdateBlockData({ ...d, gridSize: parseInt(e.target.value, 10) as any })}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold"
            >
              <option value={100}>100 brikker (10×10) — Standard (100 ruter)</option>
              <option value={64}>64 brikker (8×8) — Krevjande</option>
              <option value={36}>36 brikker (6×6) — Middels</option>
              <option value={25}>25 brikker (5×5) — Enkelt</option>
              <option value={16}>16 brikker (4×4) — Lett</option>
              <option value={9}>9 brikker (3×3) — Superenkelt</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 6}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
          <span className="font-semibold flex items-center gap-1.5">
            <span>🧩 Kaos-puslespill</span>
            <span className="text-slate-400 dark:text-stone-500">•</span>
            <span>⏱️ Fast 30 sekund totaltid</span>
          </span>
          <span className="font-mono bg-white dark:bg-stone-900 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800 font-bold">
            {Math.round(30000 / (d.gridSize || 100))} ms per brikke
          </span>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
            Fasit / Kva biletet viser (for leiar)
          </label>
          <input
            type="text"
            value={d.solution || ''}
            onChange={(e) => onUpdateBlockData({ ...d, solution: e.target.value, fasit: e.target.value } as any)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="T.d. Ein pengesetel, Eit hjarte, Ei leirkrukke..."
            className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium text-violet-800 dark:text-violet-300"
          />
        </div>

        {/* PIXABAY-SØK DIREKTE I BILETE-AVDEKKING */}
        <div className="p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-800/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Søk etter gåte-bilete i Pixabay</span>
            </label>
            {d.solution && (
              <button
                type="button"
                onClick={async () => {
                  const q = (d.solution || '').trim();
                  if (!q) return;
                  setAvdekkingPixabayQuery(q);
                  setIsSearchingAvdekkingPixabay(true);
                  setAvdekkingPixabayError(null);
                  try {
                    const res = await fetch('/api/pixabay/search', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ query: q, count: 6, category: 'guessing' }),
                    });
                    const data = await res.json();
                    if (Array.isArray(data?.hits) && data.hits.length > 0) {
                      setAvdekkingPixabayHits(data.hits.slice(0, 6));
                    } else {
                      setAvdekkingPixabayHits([]);
                      setAvdekkingPixabayError('Ingen treff på dette søkeordet.');
                    }
                  } catch {
                    setAvdekkingPixabayError('Kunne ikkje kontakte Pixabay-søket.');
                  } finally {
                    setIsSearchingAvdekkingPixabay(false);
                  }
                }}
                className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-stone-800 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-700 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
              >
                Søk på fasit («{d.solution}»)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={avdekkingPixabayQuery}
              onChange={(e) => setAvdekkingPixabayQuery(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const q = (avdekkingPixabayQuery || d.solution || '').trim();
                  if (!q) return;
                  setIsSearchingAvdekkingPixabay(true);
                  setAvdekkingPixabayError(null);
                  try {
                    const res = await fetch('/api/pixabay/search', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ query: q, count: 6, category: 'guessing' }),
                    });
                    const data = await res.json();
                    if (Array.isArray(data?.hits) && data.hits.length > 0) {
                      setAvdekkingPixabayHits(data.hits.slice(0, 6));
                    } else {
                      setAvdekkingPixabayHits([]);
                      setAvdekkingPixabayError('Ingen treff på dette søkeordet.');
                    }
                  } catch {
                    setAvdekkingPixabayError('Kunne ikkje kontakte Pixabay-søket.');
                  } finally {
                    setIsSearchingAvdekkingPixabay(false);
                  }
                }
              }}
              placeholder={d.solution ? `Søk i Pixabay (t.d. «${d.solution}»)...` : 'Skriv søkeord på norsk eller engelsk (t.d. pengesetel, hjarte, leirkrukke)...'}
              className="flex-1 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="button"
              disabled={isSearchingAvdekkingPixabay || !(avdekkingPixabayQuery.trim() || (d.solution || '').trim())}
              onClick={async () => {
                const q = (avdekkingPixabayQuery || d.solution || '').trim();
                if (!q) return;
                setIsSearchingAvdekkingPixabay(true);
                setAvdekkingPixabayError(null);
                try {
                  const res = await fetch('/api/pixabay/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: q, count: 6, category: 'guessing' }),
                  });
                  const data = await res.json();
                  if (Array.isArray(data?.hits) && data.hits.length > 0) {
                    setAvdekkingPixabayHits(data.hits.slice(0, 6));
                  } else {
                    setAvdekkingPixabayHits([]);
                    setAvdekkingPixabayError('Ingen treff på dette søkeordet.');
                  }
                } catch {
                  setAvdekkingPixabayError('Kunne ikkje kontakte Pixabay-søket.');
                } finally {
                  setIsSearchingAvdekkingPixabay(false);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
            >
              {isSearchingAvdekkingPixabay ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Søk i Pixabay</span>
            </button>
          </div>

          {avdekkingPixabayError && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
              {avdekkingPixabayError}
            </p>
          )}

          {avdekkingPixabayHits.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-600 dark:text-stone-400">
                  Klikk på eit bilete for å velje det som gåte-bilete:
                </span>
                <button
                  type="button"
                  onClick={() => setAvdekkingPixabayHits([])}
                  className="text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Lukk treff
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {avdekkingPixabayHits.map((hit) => {
                  const isSelected = d.imageUrl === hit.url;
                  return (
                    <button
                      key={hit.id}
                      type="button"
                      onClick={() => onUpdateBlockData({ ...d, imageUrl: hit.url })}
                      className={`group relative aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-400/50 scale-[1.02]'
                          : 'border-slate-200 hover:border-indigo-400'
                      }`}
                      title={hit.alt || 'Vel dette biletet'}
                    >
                      <img
                        src={hit.url}
                        alt={hit.alt || 'Pixabay treff'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-indigo-900/30 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* DROPP-FELT FOR BILDER OG URL-FELT */}
        <div className="space-y-2 pt-1">
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-stone-300">
            Vel bilde til avdekking (Dra & slepp, last opp, eller lim inn lenke):
          </label>

          <input
            type="file"
            ref={bileteAvdekkingFileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,image/heic,image/heif,.heic,.heif"
            className="hidden"
          />

          {d.imageUrl ? (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-stone-700 bg-slate-50 dark:bg-stone-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img
                  src={d.imageUrl}
                  alt="Valt bilde"
                  className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-stone-700 shrink-0 bg-white"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Bilde er valt og klart for storskjerm</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                    {d.imageUrl.startsWith('data:') ? 'Lokal fil (Data URL)' : d.imageUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => bileteAvdekkingFileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-slate-700 dark:text-stone-200 hover:bg-slate-100 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Bytt bilde
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateBlockData({ ...d, imageUrl: '' })}
                  className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1"
                  title="Fjern bilde"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Fjern</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => bileteAvdekkingFileInputRef.current?.click()}
              className={`p-5 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
                isBileteAvdekkingDragging
                  ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 scale-[1.01]'
                  : 'border-slate-300 dark:border-stone-700 bg-slate-50/50 dark:bg-stone-900/50 hover:bg-slate-100/80 hover:border-slate-400'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 flex items-center justify-center text-slate-600 dark:text-stone-300 shadow-2xs">
                {isProcessingHeic ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                ) : (
                  <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>

              {isProcessingHeic ? (
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  Konverterer HEIC-bilde frå iPhone... Vennlegst vent.
                </p>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Dra og slepp bilde her, eller <span className="text-indigo-600 dark:text-indigo-400 underline">klikk for å velje fil</span>
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-stone-400">
                    Støttar JPG, JPEG, PNG, WEBP, SVG og HEIC/HEIF (iPhone)
                  </p>
                </>
              )}
            </div>
          )}

          {/* Bilet-URL input felt som alternativ */}
          <div>
            <label className="block text-[10px] font-medium text-slate-500 dark:text-stone-400 mb-1">
              Eller lim inn bilet-URL direkte:
            </label>
            <input
              type="text"
              value={d.imageUrl || ''}
              onChange={(e) => onUpdateBlockData({ ...d, imageUrl: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono text-[11px]"
            />
          </div>
        </div>
      </div>
    );
  };

  // 5. «Beat for beat»
  const renderBeatForBeatFields = () => {
    const d = block.data as BeatForBeatData;
    const words = Array.isArray(d.words) ? d.words.slice(0, 10) : [];
    const lyricsTokens = (d.solution || '')
      .replace(/[\r\n]+/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean);

    const currentLen = Math.min(10, Math.max(5, words.length || 7));

    const handleSelectCatalogSong = (songId: string) => {
      const song = BEAT_FOR_BEAT_SONGS.find((s) => s.id === songId);
      if (!song) return;
      const splitWords = song.lyrics
        .replace(/[\r\n]+/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter(Boolean);
      onUpdateBlockData({
        ...d,
        title: `Beat for Beat: ${song.title}`,
        solution: song.lyrics,
        words: splitWords.slice(0, 7),
        category: 'Sang',
      });
    };

    const handleSetWordCount = (count: number) => {
      const targetCount = Math.min(10, Math.max(5, count));
      if (words.length >= targetCount) {
        onUpdateBlockData({ ...d, words: words.slice(0, targetCount) });
      } else {
        const matchedStartIdx = lyricsTokens.findIndex((tok) => tok === words[0]);
        const startIdx = matchedStartIdx >= 0 ? matchedStartIdx : 0;
        const newWords = lyricsTokens.length > 0 
          ? lyricsTokens.slice(startIdx, startIdx + targetCount) 
          : [...words, ...Array(targetCount - words.length).fill('Ord')].slice(0, targetCount);
        onUpdateBlockData({ ...d, words: newWords });
      }
    };

    const handleSelectStartToken = (tokenIdx: number) => {
      const selectedSlice = lyricsTokens.slice(tokenIdx, tokenIdx + currentLen);
      onUpdateBlockData({ ...d, words: selectedSlice });
    };

    const handleAddWord = () => {
      if (words.length >= 10) return;
      onUpdateBlockData({ ...d, words: [...words, ''] });
    };

    const handleUpdateWord = (idx: number, val: string) => {
      const next = [...words];
      next[idx] = val;
      onUpdateBlockData({ ...d, words: next });
    };

    const handleDeleteWord = (idx: number) => {
      const next = words.filter((_, i) => i !== idx);
      onUpdateBlockData({ ...d, words: next });
    };

    let activeStartIdx = -1;
    if (lyricsTokens.length > 0 && words.length > 0) {
      activeStartIdx = lyricsTokens.findIndex((tok, idx) => {
        return words.every((w, wIdx) => lyricsTokens[idx + wIdx] === w);
      });
      if (activeStartIdx === -1) {
        activeStartIdx = lyricsTokens.findIndex((tok) => tok === words[0]);
      }
    }

    return (
      <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        {/* Fast Sangkatalog Veljar */}
        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5">
          <label className="block text-xs font-semibold text-amber-900 flex items-center gap-1.5">
            <Music2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Vel fast song frå sangkatalogen (11 val)</span>
          </label>
          <select
            value=""
            onChange={(e) => handleSelectCatalogSong(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value="" disabled>-- Vel ein song for å fylle ut felta automatisk --</option>
            {BEAT_FOR_BEAT_SONGS.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Beat for beat..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Kategori
            </label>
            <input
              type="text"
              value={d.category || ''}
              onChange={(e) => onUpdateBlockData({ ...d, category: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="T.d. Salme, Sitat..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 8}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-stone-300 mb-1">
            Fasit / Heile sangteksten (for leiar)
          </label>
          <textarea
            rows={3}
            value={d.solution || ''}
            onChange={(e) => {
              const sol = e.target.value;
              const splitWords = sol.replace(/[\r\n]+/g, ' ').split(/\s+/).map((w) => w.trim()).filter(Boolean);
              onUpdateBlockData({ ...d, solution: sol, words: splitWords.slice(0, currentLen) });
            }}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="T.d. Deg være ære, Herre over dødens makt..."
            className="w-full p-2.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold text-amber-900 dark:text-amber-300"
          />
        </div>

        {/* VELTAL FOR ORD (5 TIL 10 ORD) */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800">
              Maks ord på storskjerm (5–10 ord):
            </label>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              Valt: {words.length} ord
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleSetWordCount(num)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                  words.length === num
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {num} {num === 7 ? '(Standard)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* INTERAKTIVT ORDVELJAR-RUTENETT FRÅ HEILE SANGTEKSTEN */}
        {lyricsTokens.length > 0 && (
          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Klikk på startordet for å velje strofa ({words.length} ord):</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
              {lyricsTokens.map((token, tIdx) => {
                const isSelected = activeStartIdx >= 0 && tIdx >= activeStartIdx && tIdx < activeStartIdx + words.length;
                const posInSelection = isSelected ? tIdx - activeStartIdx + 1 : null;

                return (
                  <button
                    key={tIdx}
                    type="button"
                    onClick={() => handleSelectStartToken(tIdx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    {posInSelection && (
                      <span className="w-4 h-4 rounded-full bg-emerald-800/60 text-[10px] text-white flex items-center justify-center font-bold">
                        {posInSelection}
                      </span>
                    )}
                    <span>{token}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* VALD STROFE PÅ STORSKJERM (FORHANDSVISING BOKS) */}
        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-emerald-900">
              Vald strofe på storskjerm ({words.length} ord):
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {words.map((w, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 font-bold text-xs text-emerald-950 shadow-2xs"
              >
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">
                  {idx + 1}
                </span>
                <span>{w}</span>
              </span>
            ))}
          </div>
        </div>

        {/* REDIGER ORD ENKELTVIS */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-stone-300">
              Rediger ord manuelt ({words.length} av max 10):
            </label>
            {words.length < 10 && (
              <button
                type="button"
                onClick={handleAddWord}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Legg til ord
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {words.map((w, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-slate-100 dark:bg-stone-800 px-2 py-1 rounded-md border border-slate-200 dark:border-stone-700">
                <span className="text-[10px] font-bold text-slate-500">{idx + 1}:</span>
                <input
                  type="text"
                  value={w}
                  onChange={(e) => handleUpdateWord(idx, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Ord..."
                  className="w-20 px-1.5 py-0.5 rounded border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-xs text-slate-800 dark:text-slate-100 font-bold text-center"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteWord(idx)}
                  className="text-slate-400 hover:text-red-500 cursor-pointer"
                  title="Fjern ord"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 5b. «Ord for ord»
  const renderOrdForOrdFields = () => {
    const d = block.data as OrdForOrdData;
    const quoteText = d.quote || d.text || '';
    const quoteTokens = quoteText
      .replace(/[\r\n]+/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean);

    const maxWords = d.maxWords || 7;
    const startIndex = d.startIndex ?? 0;

    // Guaranteed fallback for words list
    const currentWords = Array.isArray(d.words) && d.words.length > 0
      ? d.words.slice(0, 10)
      : quoteTokens.slice(startIndex, startIndex + maxWords);

    const handleQuoteChange = (newQuote: string) => {
      const newTokens = newQuote
        .replace(/[\r\n]+/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter(Boolean);
      const currentStart = d.startIndex ?? 0;
      const currentMax = d.maxWords || 7;
      const newSlice = newTokens.slice(currentStart, currentStart + currentMax);
      onUpdateBlockData({
        ...d,
        quote: newQuote,
        text: newQuote,
        words: newSlice.length > 0 ? newSlice : ['Ord'],
      });
    };

    const handleSetMaxWords = (count: number) => {
      const targetCount = Math.min(10, Math.max(5, count));
      const currentStart = d.startIndex ?? 0;
      let newWords = quoteTokens.slice(currentStart, currentStart + targetCount);
      if (newWords.length === 0 && currentWords.length > 0) {
        newWords = currentWords.slice(0, targetCount);
      }
      onUpdateBlockData({
        ...d,
        maxWords: targetCount,
        words: newWords,
      });
    };

    const handleSelectStartToken = (tokenIdx: number) => {
      const currentMax = d.maxWords || 7;
      const selectedSlice = quoteTokens.slice(tokenIdx, tokenIdx + currentMax);
      onUpdateBlockData({
        ...d,
        startIndex: tokenIdx,
        words: selectedSlice,
      });
    };

    const handleAddWord = () => {
      if (currentWords.length >= 10) return;
      onUpdateBlockData({ ...d, words: [...currentWords, ''] });
    };

    const handleUpdateWord = (idx: number, val: string) => {
      const next = [...currentWords];
      next[idx] = val;
      onUpdateBlockData({ ...d, words: next });
    };

    const handleDeleteWord = (idx: number) => {
      const next = currentWords.filter((_, i) => i !== idx);
      onUpdateBlockData({ ...d, words: next });
    };

    let activeStartIdx = startIndex;
    if (quoteTokens.length > 0 && currentWords.length > 0) {
      const matchedIdx = quoteTokens.findIndex((tok, idx) => {
        return currentWords.every((w, wIdx) => quoteTokens[idx + wIdx] === w);
      });
      if (matchedIdx >= 0) {
        activeStartIdx = matchedIdx;
      }
    }

    return (
      <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Ord for ord..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Referanse / Kjelde (Fasit)
            </label>
            <input
              type="text"
              value={d.reference || ''}
              onChange={(e) => onUpdateBlockData({ ...d, reference: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="T.d. Johannes 3, 16"
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 6}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-stone-300 mb-1">
            Sitat / Bibelvers (Fasit for leiar)
          </label>
          <textarea
            rows={3}
            value={quoteText}
            onChange={(e) => handleQuoteChange(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="For så har Gud elska verda at han gav sin Son, den einborne..."
            className="w-full p-2.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold text-emerald-950 dark:text-emerald-300"
          />
        </div>

        {/* VELTAL FOR ORD (5 TIL 10 ORD) */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800">
              Maks ord på storskjerm (5–10 ord):
            </label>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Valt: {currentWords.length} ord
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleSetMaxWords(num)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                  currentWords.length === num
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {num} {num === 7 ? '(Standard)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* INTERAKTIVT ORDVELJAR-RUTENETT FRÅ HEILE BIBELVERSET */}
        {quoteTokens.length > 0 && (
          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Klikk på startordet for å velje strofa ({currentWords.length} ord):</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
              {quoteTokens.map((token, tIdx) => {
                const isSelected = activeStartIdx >= 0 && tIdx >= activeStartIdx && tIdx < activeStartIdx + currentWords.length;
                const posInSelection = isSelected ? tIdx - activeStartIdx + 1 : null;

                return (
                  <button
                    key={tIdx}
                    type="button"
                    onClick={() => handleSelectStartToken(tIdx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    {posInSelection && (
                      <span className="w-4 h-4 rounded-full bg-emerald-800/60 text-[10px] text-white flex items-center justify-center font-bold">
                        {posInSelection}
                      </span>
                    )}
                    <span>{token}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* VALD STROFE PÅ STORSKJERM (FORHANDSVISING BOKS) */}
        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-emerald-900">
              Vald strofe på storskjerm ({currentWords.length} ord):
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {currentWords.map((w, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 font-bold text-xs text-emerald-950 shadow-2xs"
              >
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">
                  {idx + 1}
                </span>
                <span>{w}</span>
              </span>
            ))}
          </div>
        </div>

        {/* REDIGER ORD ENKELTVIS */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-stone-300">
              Rediger ord manuelt ({currentWords.length} av max 10):
            </label>
            {currentWords.length < 10 && (
              <button
                type="button"
                onClick={handleAddWord}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Legg til ord
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {currentWords.map((w, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-slate-100 dark:bg-stone-800 px-2 py-1 rounded-md border border-slate-200 dark:border-stone-700">
                <span className="text-[10px] font-bold text-slate-500">{idx + 1}:</span>
                <input
                  type="text"
                  value={w}
                  onChange={(e) => handleUpdateWord(idx, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Ord..."
                  className="w-20 px-1.5 py-0.5 rounded border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-xs text-slate-800 dark:text-slate-100 font-bold text-center"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteWord(idx)}
                  className="text-slate-400 hover:text-red-500 cursor-pointer"
                  title="Fjern ord"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
            Hint (valfri hjelp til leiar eller storskjerm)
          </label>
          <input
            type="text"
            value={d.hint || ''}
            onChange={(e) => onUpdateBlockData({ ...d, hint: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="T.d. Eit av dei mest kjende versa i Bibelen..."
            className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
      </div>
    );
  };

  // 6. «Kven skal ut?»
  // 6. «Kven skal ut?» (støtte for 1–5 oppgåver)
  const renderKvenSkalUtFields = () => {
    const d = block.data as KvenSkalUtData;
    const rawItems = Array.isArray(d.items) && d.items.length > 0 ? d.items : [];

    // Fallback normalization
    const items: KvenSkalUtItem[] = rawItems.length > 0
      ? rawItems
      : [
          {
            id: `ksu_${Date.now()}_1`,
            options: {
              A: d.optionA || 'Tru',
              B: d.optionB || 'Håp',
              C: d.optionC || 'Kjærleik',
              D: d.optionD || 'Sjalusi',
            },
            correctOption: d.correctOption || 'D',
            explanation: d.explanation || 'Fasit: D. A, B og C er dei tre kristne hovuddygdene, medan Sjalusi bryt ned fellesskapet.',
          },
        ];

    const activeItemIndex = Math.min(items.length - 1, Math.max(0, d.currentIndex ?? 0));
    const currentItem = items[activeItemIndex] || items[0];

    const syncItemsAndTopLevel = (nextItems: KvenSkalUtItem[], newIndex: number) => {
      const activeItem = nextItems[newIndex] || nextItems[0];
      onUpdateBlockData({
        ...d,
        items: nextItems,
        currentIndex: newIndex,
        optionA: activeItem?.options.A || '',
        optionB: activeItem?.options.B || '',
        optionC: activeItem?.options.C || '',
        optionD: activeItem?.options.D || '',
        correctOption: activeItem?.correctOption || 'A',
        explanation: activeItem?.explanation || '',
      });
    };

    const handleAddTask = () => {
      if (items.length >= 5) return;
      const newItem: KvenSkalUtItem = {
        id: `ksu_${Date.now()}_${items.length + 1}`,
        options: {
          A: 'Festkappe',
          B: 'Ring på fingeren',
          C: 'Slakta alvkalv',
          D: 'Misunning',
        },
        correctOption: 'D',
        explanation: 'Fasit: D. A, B og C handlar om festen for den heimkomne sonen, medan Misunning handlar om den eldste bror sin reaksjon.',
      };
      const nextItems = [...items, newItem];
      syncItemsAndTopLevel(nextItems, nextItems.length - 1);
    };

    const handleDeleteTask = (idx: number) => {
      if (items.length <= 1) return;
      const nextItems = items.filter((_, i) => i !== idx);
      const nextIdx = Math.min(nextItems.length - 1, activeItemIndex);
      syncItemsAndTopLevel(nextItems, nextIdx);
    };

    const handleUpdateOption = (letter: 'A' | 'B' | 'C' | 'D', val: string) => {
      const nextItems = items.map((it, i) =>
        i === activeItemIndex
          ? { ...it, options: { ...it.options, [letter]: val } }
          : it
      );
      syncItemsAndTopLevel(nextItems, activeItemIndex);
    };

    const handleUpdateCorrect = (letter: 'A' | 'B' | 'C' | 'D') => {
      const nextItems = items.map((it, i) =>
        i === activeItemIndex
          ? { ...it, correctOption: letter }
          : it
      );
      syncItemsAndTopLevel(nextItems, activeItemIndex);
    };

    const handleUpdateExplanation = (expl: string) => {
      const nextItems = items.map((it, i) =>
        i === activeItemIndex
          ? { ...it, explanation: expl }
          : it
      );
      syncItemsAndTopLevel(nextItems, activeItemIndex);
    };

    return (
      <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        {/* Tittel og Tidsbruk */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel på oppgåvesettet
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Kven skal ut?..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 5}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* FANEVELJAR FOR OPPGÅVE 1..5 */}
        <div className="p-3 bg-slate-50 dark:bg-stone-900/60 rounded-xl border border-slate-200 dark:border-stone-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-stone-200 flex items-center gap-1.5">
              <span>Oppgåver ({items.length} av max 5):</span>
            </label>
            {items.length < 5 && (
              <button
                type="button"
                onClick={handleAddTask}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Legg til oppgåve
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {items.map((it, idx) => {
              const isActive = idx === activeItemIndex;
              return (
                <div key={it.id || idx} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => syncItemsAndTopLevel(items, idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-white dark:bg-stone-800 text-slate-700 dark:text-stone-300 border-slate-200 dark:border-stone-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>Oppgåve {idx + 1}</span>
                    <span className="text-[10px] opacity-80 uppercase">({it.correctOption})</span>
                  </button>
                  {items.length > 1 && isActive && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(idx)}
                      className="ml-1 p-1 text-slate-400 hover:text-red-600 cursor-pointer rounded"
                      title="Slett denne oppgåva"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* AKTIV OPPGÅVE: OPTION A, B, C, D */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-stone-300">
            Oppgåve {activeItemIndex + 1}: Dei fire alternativa (merk kven som skal ut):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(['A', 'B', 'C', 'D'] as const).map((letter) => {
              const optText = currentItem.options[letter] || '';
              const isCorrect = currentItem.correctOption === letter;

              return (
                <div 
                  key={letter}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                    isCorrect
                      ? 'bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 ring-1 ring-rose-400/30'
                      : 'bg-white border-slate-200 dark:bg-stone-900 dark:border-stone-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleUpdateCorrect(letter)}
                    className={`w-7 h-7 rounded-md text-xs font-black flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                      isCorrect ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-stone-800 dark:text-stone-300 hover:bg-slate-200'
                    }`}
                    title={isCorrect ? 'Dette alternativet skal ut (Fasit)' : 'Klikk for å sette som fasit'}
                  >
                    {letter}
                  </button>
                  <input
                    type="text"
                    value={optText}
                    onChange={(e) => handleUpdateOption(letter, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder={`Alternativ ${letter}...`}
                    className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  />
                  {isCorrect && (
                    <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wider shrink-0 px-1">
                      SKAL UT
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* FORKLARING FOR AKTIV OPPGÅVE */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-stone-300 mb-1">
            Pedagogisk forklaring for oppgåve {activeItemIndex + 1} (visast ved svaravsløring):
          </label>
          <textarea
            rows={2}
            value={currentItem.explanation || ''}
            onChange={(e) => handleUpdateExplanation(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Skriv ein god og lærerik begrunnelse for kvifor dette alternativet skal ut..."
            className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium leading-relaxed"
          />
        </div>
      </div>
    );
  };

  // Historisk fallback: «Leik»
  const renderLekFields = () => {
    const d = block.data as LekData;
    return (
      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Namn på leiken
            </label>
            <input
              type="text"
              value={d.name || ''}
              onChange={(e) => onUpdateBlockData({ ...d, name: e.target.value })}
              placeholder="Skriv namn her..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Energinivå
            </label>
            <select
              value={d.energyLevel || 'Middels'}
              onChange={(e) => onUpdateBlockData({ ...d, energyLevel: e.target.value as any })}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="Rolig">Rolig</option>
              <option value="Middels">Middels</option>
              <option value="Høgt tempo">Høgt tempo</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 8}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
            Utstyr og førebuing
          </label>
          <input
            type="text"
            value={d.equipment || ''}
            onChange={(e) => onUpdateBlockData({ ...d, equipment: e.target.value })}
            placeholder="Skriv utstyr her..."
            className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-slate-600 dark:text-stone-400">
              Reglar
            </label>
            <button
              type="button"
              onClick={() => {
                const next = [...(d.rulesSteps || []), ''];
                onUpdateBlockData({ ...d, rulesSteps: next });
              }}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:underline cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Legg til regel
            </button>
          </div>
          <div className="space-y-1.5">
            {(d.rulesSteps || ['']).map((step, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-4 text-[10px] font-bold text-slate-400 text-right">{idx + 1}.</span>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => {
                    const next = [...d.rulesSteps];
                    next[idx] = e.target.value;
                    onUpdateBlockData({ ...d, rulesSteps: next });
                  }}
                  placeholder="Skriv regel her..."
                  className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = d.rulesSteps.filter((_, i) => i !== idx);
                    onUpdateBlockData({ ...d, rulesSteps: next });
                  }}
                  className="p-1 rounded text-slate-400 hover:text-red-500 cursor-pointer"
                  title="Fjern regel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 6. «Konkurranse»
  const renderKonkurranseFields = () => {
    const d = block.data as KonkurranseData;
    return (
      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              placeholder="Skriv tittel her..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Konkurransetype
            </label>
            <select
              value={d.competitionType || 'Lag'}
              onChange={(e) => onUpdateBlockData({ ...d, competitionType: e.target.value as any })}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="Lag">Lag</option>
              <option value="Individuell">Individuell</option>
              <option value="Duell">Duell</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 10}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
            Oppgåve / Spørsmål
          </label>
          <textarea
            rows={2}
            value={d.task || ''}
            onChange={(e) => onUpdateBlockData({ ...d, task: e.target.value })}
            placeholder="Skriv oppgåva her..."
            className="w-full p-2.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-sans"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Fasit (berre synleg for leiar)
            </label>
            <input
              type="text"
              value={d.solution || ''}
              onChange={(e) => onUpdateBlockData({ ...d, solution: e.target.value })}
              placeholder="Skriv fasit her..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Poengreglar
            </label>
            <input
              type="text"
              value={d.scoringRules || ''}
              onChange={(e) => onUpdateBlockData({ ...d, scoringRules: e.target.value })}
              placeholder="Skriv poengreglar her..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>
      </div>
    );
  };

  // 7. «Samtale»
  const renderSamtaleFields = () => {
    const d = block.data as SamtaleData;
    const leaderPoints = d.leaderPoints || [];

    const handleAddLeaderPoint = () => {
      const newPt: StikkordPoint = {
        id: `s_lp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        text: '',
        note: '',
      };
      onUpdateBlockData({ ...d, leaderPoints: [...leaderPoints, newPt] });
    };

    const handleUpdateLeaderPoint = (idx: number, field: 'text' | 'note', val: string) => {
      const next = [...leaderPoints];
      next[idx] = { ...next[idx], [field]: val };
      onUpdateBlockData({ ...d, leaderPoints: next });
    };

    const handleDeleteLeaderPoint = (idx: number) => {
      const next = leaderPoints.filter((_, i) => i !== idx);
      onUpdateBlockData({ ...d, leaderPoints: next });
    };

    return (
      <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tema for samtalen
            </label>
            <input
              type="text"
              value={d.topic || ''}
              onChange={(e) => onUpdateBlockData({ ...d, topic: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="T.d. Kva vil det si å tro?..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Organisering
            </label>
            <select
              value={d.organization || 'Smågrupper'}
              onChange={(e) => onUpdateBlockData({ ...d, organization: e.target.value as any })}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="To-og-to">To-og-to</option>
              <option value="Smågrupper">Smågrupper</option>
              <option value="Plenum">Plenum</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 7}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* Spørsmål til samtalen (visast på storskjerm) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-stone-300">
              Spørsmål til samtalen (visast på storskjerm)
            </label>
            {(!d.reflectionQuestions || d.reflectionQuestions.length < 3) && (
              <button
                type="button"
                onClick={() => {
                  const cur = Array.isArray(d.reflectionQuestions) ? d.reflectionQuestions : [];
                  if (cur.length >= 3) return;
                  const next = [...cur, ''];
                  onUpdateBlockData({ ...d, reflectionQuestions: next });
                }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:underline cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Legg til spørsmål
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {((Array.isArray(d.reflectionQuestions) && d.reflectionQuestions.length > 0) ? d.reflectionQuestions : ['']).map((q, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-4 text-[10px] font-bold text-slate-400 text-right">{idx + 1}.</span>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => {
                    const cur = Array.isArray(d.reflectionQuestions) ? [...d.reflectionQuestions] : [''];
                    cur[idx] = e.target.value;
                    onUpdateBlockData({ ...d, reflectionQuestions: cur });
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Skriv spørsmålet her..."
                  className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                />
                <button
                  type="button"
                  onClick={() => {
                    const cur = Array.isArray(d.reflectionQuestions) ? d.reflectionQuestions : [];
                    const next = cur.filter((_, i) => i !== idx);
                    onUpdateBlockData({ ...d, reflectionQuestions: next });
                  }}
                  className="p-1 rounded text-slate-400 hover:text-red-500 cursor-pointer"
                  title="Fjern spørsmål"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Manus for leiar (Stikkord + Utdjuping) */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-800 block">
                Manus for leiar (Stikkord + Utdjuping)
              </label>
              <p className="text-[10px] text-slate-500">
                Visast i leiarvisning med stort stikkord og mjuk utdjuping under.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddLeaderPoint}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>+ Nytt stikkord m/utdjuping</span>
            </button>
          </div>

          {leaderPoints.length === 0 ? (
            <button
              type="button"
              onClick={handleAddLeaderPoint}
              className="w-full py-3 border border-dashed border-slate-200 hover:border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer bg-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              <span>+ Legg til stikkord for leiar (t.d. «Forskjell på tru»)</span>
            </button>
          ) : (
            <div className="space-y-2.5">
              {leaderPoints.map((pt, idx) => (
                <div key={pt.id || idx} className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Stikkord {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteLeaderPoint(idx)}
                      className="text-slate-400 hover:text-red-500 cursor-pointer"
                      title="Slett punkt"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* a) Stikkord */}
                  <input
                    type="text"
                    value={pt.text || ''}
                    onChange={(e) => handleUpdateLeaderPoint(idx, 'text', e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Stikkord / Overskrift (t.d. «Forskjell på tru»)"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:border-slate-400"
                  />

                  {/* b) Utdjuping */}
                  <textarea
                    rows={2}
                    value={pt.note || ''}
                    onChange={(e) => handleUpdateLeaderPoint(idx, 'note', e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Utdjupande tekst (t.d. «Tro som synsing vs. tro som tillit»)..."
                    className="w-full p-2 rounded border border-slate-200 text-slate-700 text-xs leading-relaxed focus:outline-none focus:border-slate-400"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 8. «Quiz»
  const renderQuizFields = () => {
    const d = block.data as QuizData;

    const questionsList: QuizQuestion[] = (d.questions && d.questions.length > 0)
      ? d.questions
      : [{
          id: 'q_1',
          question: d.question || '',
          optionA: d.optionA || '',
          optionB: d.optionB || '',
          optionC: d.optionC || '',
          optionD: d.optionD || '',
          correctOption: d.correctOption || 'A',
          explanation: d.explanation || '',
        }];

    const handleUpdateQuestions = (newList: QuizQuestion[]) => {
      const first = newList[0];
      onUpdateBlockData({
        ...d,
        questions: newList,
        question: first?.question || '',
        optionA: first?.optionA || '',
        optionB: first?.optionB || '',
        optionC: first?.optionC || '',
        optionD: first?.optionD || '',
        correctOption: first?.correctOption || 'A',
        explanation: first?.explanation || '',
      });
    };

    const handleAddQuestion = () => {
      const newQ: QuizQuestion = {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        question: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        explanation: '',
      };
      handleUpdateQuestions([...questionsList, newQ]);
    };

    const handleDeleteQuestion = (idx: number) => {
      if (questionsList.length <= 1) return;
      const next = questionsList.filter((_, i) => i !== idx);
      handleUpdateQuestions(next);
    };

    const handleUpdateSingleQuestion = (idx: number, updatedQ: QuizQuestion) => {
      const next = [...questionsList];
      next[idx] = updatedQ;
      handleUpdateQuestions(next);
    };

    return (
      <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Quiz-tittel
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Skriv tittel her..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Type
            </label>
            <select
              value={d.quizType || 'mc'}
              onChange={(e) => onUpdateBlockData({ ...d, quizType: e.target.value as any })}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="mc">Fleirval (A, B, C, D)</option>
              <option value="open">Ope spørsmål + svar</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 5}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* Liste over spørsmål */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-600 dark:text-stone-400">
              Spørsmål ({questionsList.length})
            </span>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:underline cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Nytt spørsmål
            </button>
          </div>

          {questionsList.map((q, qIdx) => (
            <div
              key={q.id || qIdx}
              className="p-3 rounded-md border border-slate-200 dark:border-stone-800 bg-slate-50/60 dark:bg-stone-900/50 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Spørsmål {qIdx + 1}
                </span>
                {questionsList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(qIdx)}
                    className="p-0.5 text-slate-400 hover:text-red-500 cursor-pointer"
                    title="Slett spørsmål"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <input
                type="text"
                value={q.question}
                onChange={(e) => handleUpdateSingleQuestion(qIdx, { ...q, question: e.target.value })}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Skriv spørsmålet her..."
                className="w-full px-3 py-1.5 rounded border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
              />

              {d.quizType !== 'open' ? (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                      const optKey = `option${letter}` as 'optionA' | 'optionB' | 'optionC' | 'optionD';
                      const isCorrect = q.correctOption === letter;
                      const optVal = q[optKey] || '';
                      const optWords = optVal.trim() ? optVal.trim().split(/\s+/).filter(Boolean).length : 0;
                      const isOptionTooLong = optVal.length > 85 || optWords >= 15;

                      return (
                        <div key={letter} className="flex flex-col gap-1">
                          <div 
                            className={`flex items-center gap-1.5 p-1 rounded border transition-colors ${
                              isCorrect 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-200' 
                                : 'bg-white border-slate-200 dark:bg-stone-900 dark:border-stone-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`correct_${block.id}_${qIdx}`}
                              checked={isCorrect}
                              onChange={() => handleUpdateSingleQuestion(qIdx, { ...q, correctOption: letter })}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer ml-1"
                              title="Merk som rett svar"
                            />
                            <span className="font-bold text-[11px] text-slate-600 dark:text-stone-400 w-3.5 text-center">
                              {letter}
                            </span>
                            <input
                              type="text"
                              value={optVal}
                              onChange={(e) => handleUpdateSingleQuestion(qIdx, { ...q, [optKey]: e.target.value })}
                              onMouseDown={(e) => e.stopPropagation()}
                              placeholder={`Alternativ ${letter}...`}
                              className="flex-1 px-1.5 py-0.5 rounded bg-transparent border-0 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                            />
                          </div>
                          {isOptionTooLong && (
                            <div className="px-2.5 py-1.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] leading-snug font-medium">
                              ⚠️ Langt svaralternativ: Teksten kan bli vanskeleg å lese frå bakarste benk på storskjerm. Vurder å korte ned setninga.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-1">
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">
                      Pedagogisk forklaring (visast for leiar ved svaravsløring)
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => handleUpdateSingleQuestion(qIdx, { ...q, explanation: e.target.value })}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="Kort forklaring på kvifor dette svaret er rett..."
                      className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">
                    Fasit / Svar
                  </label>
                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => handleUpdateSingleQuestion(qIdx, { ...q, explanation: e.target.value })}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Skriv svar her..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 9. «Song / Salme»
  const renderSangSalmeFields = () => {
    const d = block.data as SangSalmeData;
    const currentFullText = d.songText || (d.verses && d.verses.length > 0 ? d.verses.join('\n\n') : '');

    const handleChangeSongText = (text: string) => {
      const parsedVerses = text
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      onUpdateBlockData({
        ...d,
        songText: text,
        verses: parsedVerses.length > 0 ? parsedVerses : [text],
      });
    };

    return (
      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Skriv tittel her..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Salmenummer
            </label>
            <input
              type="text"
              value={d.songNumber || ''}
              onChange={(e) => onUpdateBlockData({ ...d, songNumber: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="T.d. N12 844..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 5}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 text-[11px] flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Song- og salmetekstar har faste vers og vert ikkje genererte av AI. Lim inn autorisert tekst eller verselinjer her.</span>
          </div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
            Tekst (sett inn tomlinje mellom kvart vers)
          </label>
          <textarea
            rows={5}
            value={currentFullText}
            onChange={(e) => handleChangeSongText(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Skriv eller lim inn heile teksten her. Kvart avsnitt vert eit eige vers på storskjerm..."
            className="w-full p-2.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-sans leading-relaxed"
          />
        </div>
      </div>
    );
  };

  // State for BildeBibelen API-kall
  const [isFetchingBildeBibelen, setIsFetchingBildeBibelen] = useState(false);
  const [bildeBibelenQueryInput, setBildeBibelenQueryInput] = useState('');

  // 1. BILETE (1, 2 eller 4 faste illustrasjonsbilete)
  const renderBileteFields = () => {
    const d = block.data as BileteData;
    const layout = (d.layout as any) || 1;
    const layoutNum = typeof layout === 'string' ? parseInt(layout, 10) : layout;
    const images = d.images || [];

    const handleLayoutChange = (newLayout: 1 | 2 | 4) => {
      const newImages = Array.from({ length: newLayout }, (_, i) => {
        return images[i] || {
          id: `img_${Date.now()}_${i}`,
          url: '',
          caption: '',
        };
      });

      onUpdateBlockData({
        ...d,
        layout: newLayout,
        images: newImages,
      });
    };

    const handleSingleFileUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        setIsOptimizingImages(true);
        const dataUrl = await optimizeImageFile(file, 1920, 0.82);
        const next = [...images];
        next[idx] = { ...next[idx], url: dataUrl };
        onUpdateBlockData({ ...d, images: next });
      } catch (err) {
        console.error('Feil ved bildeoptimalisering:', err);
      } finally {
        setIsOptimizingImages(false);
        e.target.value = '';
      }
    };

    return (
      <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        {/* Tittel og tidsbruk */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel (valfri for storskjerm)
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Skriv tittel her..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 5}
              onChange={(e) => onUpdateBlockData({ ...d, durationMinutes: parseInt(e.target.value, 10) || 5 })}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* LAYOUT-VELJAR */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-stone-300 mb-1.5">
            Tal på bilete (Oppsett)
          </label>
          <div className="flex items-center gap-2">
            {([1, 2, 4] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => handleLayoutChange(l)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                  layoutNum === l
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-700'
                }`}
              >
                {l === 1 ? '1 bilete' : l === 2 ? '2 ved sida' : '4 rutenett (2x2)'}
              </button>
            ))}
          </div>
        </div>

        {/* BILDERESURSAR */}
        <div className="space-y-3">
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-stone-300">
            Bilete ({images.length})
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: layoutNum }).map((_, idx) => {
              const img = images[idx] || { id: `img_${idx}`, url: '', caption: '' };
              const cleanCap = getCleanCaption(img.caption);
              const captionLen = cleanCap.length;

              const handleQuickSearch = async (queryText: string) => {
                if (!queryText.trim()) return;
                try {
                  const res = await fetch('/api/pixabay/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: queryText, count: 5, category: 'general', offset: idx }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.hits) && data.hits.length > 0) {
                      const valgtUrl = data.hits[0].url;
                      let finalUrl = valgtUrl;
                      try {
                        const cacheRes = await fetch('/api/pixabay/cache-image', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ url: valgtUrl }),
                        });
                        const cacheData = await cacheRes.json();
                        if (cacheData?.localUrl) {
                          finalUrl = cacheData.localUrl;
                        }
                      } catch (cacheErr) {
                        console.warn('Kunne ikkje mellomlagre biletet lokalt, brukar original URL:', cacheErr);
                      }
                      const next = [...images];
                      next[idx] = { ...img, url: finalUrl };
                      onUpdateBlockData({ ...d, images: next });
                      return;
                    }
                  }
                } catch (err) {
                  console.warn('Feil ved bildesøk:', err);
                }
              };

              return (
                <div key={img.id || idx} className="p-3 rounded-xl border border-slate-200 dark:border-stone-700 bg-slate-50/50 dark:bg-stone-900/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Bilete {['A', 'B', 'C', 'D'][idx] || idx + 1}
                    </span>
                    <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Last opp fil</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleSingleFileUpload(idx, e)}
                      />
                    </label>
                  </div>

                  <input
                    type="text"
                    value={img.url || ''}
                    onChange={(e) => {
                      const next = [...images];
                      next[idx] = { ...img, url: e.target.value };
                      onUpdateBlockData({ ...d, images: next });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Lim inn bilet-URL (https://...)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                  />

                  {(layoutNum === 1 || layoutNum === 2) && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-medium text-slate-500">
                          Bildetekst på storskjerm (valfri)
                        </label>
                        {captionLen > 0 && (
                          <span className={`text-[10px] font-mono ${captionLen > 65 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                            {captionLen}/65 teikn
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={img.caption || ''}
                        onChange={(e) => {
                          const next = [...images];
                          next[idx] = { ...img, caption: e.target.value };
                          onUpdateBlockData({ ...d, images: next });
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="Skriv bildetekst her..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                      />
                      {captionLen > 65 && (
                        <p className="text-[10px] font-semibold text-amber-600">
                          ⚠️ Teksten kan verte for lang til å behalde stor skrift på storskjerm.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Søk motiv i Pixabay / Wikimedia..."
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          await handleQuickSearch((e.target as HTMLInputElement).value);
                        }
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-[11px] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={async (e) => {
                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                        await handleQuickSearch(input?.value);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-stone-700 text-slate-800 dark:text-stone-200 text-[11px] font-semibold cursor-pointer"
                    >
                      Søk
                    </button>
                  </div>

                  {img.url ? (
                    <div className="space-y-1.5">
                      <div className="relative w-full h-28 rounded-lg bg-stone-900 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-stone-700 shadow-2xs">
                        <img src={img.url} alt="" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-stone-400 font-mono truncate px-1" title={img.url}>
                        {img.url}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-lg border border-dashed border-slate-300 dark:border-stone-700 flex items-center justify-center text-[11px] text-slate-400">
                      Ingen bilet-URL
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // 2. LYSBILETESHOW (Rullande biletserie med 100+ bilete)
  const renderLysbileteshowFields = () => {
    const d = block.data as LysbileteshowData;
    const images = d.images || [];
    const intervalSeconds = d.intervalSeconds || 3;
    const autoPlay = d.autoPlay !== false;
    const autoLoop = d.autoLoop !== false;

    const speedOptions = [
      { label: '0.5s', val: 0.5 },
      { label: '1s', val: 1 },
      { label: '2s', val: 2 },
      { label: '3s (Standard)', val: 3 },
      { label: '5s', val: 5 },
      { label: '10s', val: 10 },
      { label: '15s', val: 15 },
      { label: '30s', val: 30 },
    ];

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length === 0) return;
      try {
        setIsOptimizingImages(true);
        const newItems: any[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const dataUrl = await optimizeImageFile(file, 1920, 0.82);
          newItems.push({
            id: `ls_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            url: dataUrl,
          });
        }
        onUpdateBlockData({
          ...d,
          images: [...images, ...newItems],
        });
      } catch (err) {
        console.error('Feil ved masseopplasting av bilete:', err);
      } finally {
        setIsOptimizingImages(false);
        e.target.value = '';
      }
    };

    const handleRemoveImage = (idx: number) => {
      const next = images.filter((_, i) => i !== idx);
      onUpdateBlockData({ ...d, images: next });
    };

    const handleMoveImage = (idx: number, delta: number) => {
      const targetIdx = idx + delta;
      if (targetIdx < 0 || targetIdx >= images.length) return;
      const next = [...images];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      onUpdateBlockData({ ...d, images: next });
    };

    return (
      <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        {/* Tittel og tidsbruk */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel på lysbileteshowet
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="T.d. Stemningsbilete frå leiren..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 5}
              onChange={(e) => onUpdateBlockData({ ...d, durationMinutes: parseInt(e.target.value, 10) || 5 })}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* OPPSTILLING OG BATCH-OPPLASTING */}
        <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                Lysbiletevising ({images.length} bilete)
              </span>
              {isOptimizingImages && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-md animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> Optimaliserer...
                </span>
              )}
            </div>

            <label className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs">
              <Upload className="w-3.5 h-3.5" />
              <span>Last opp fleire bilete samstundes</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleBulkUpload}
                disabled={isOptimizingImages}
              />
            </label>
          </div>

          {/* INTERVALL OG AUTO-LOOP */}
          <div className="p-3 rounded-lg bg-white dark:bg-stone-900 border border-indigo-200 dark:border-indigo-900/60 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-800 dark:text-stone-200">
                Visningstid per bilete (Intervall):
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPlay}
                    onChange={(e) => onUpdateBlockData({ ...d, autoPlay: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Autospel</span>
                </label>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoLoop}
                    onChange={(e) => onUpdateBlockData({ ...d, autoLoop: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Auto-loop (start på nytt)</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {speedOptions.map((opt) => {
                const isSelected = intervalSeconds === opt.val;
                return (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => onUpdateBlockData({ ...d, intervalSeconds: opt.val })}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-2xs ring-1 ring-indigo-400'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* GALLERI PÅ SKJERMEN */}
          {images.length === 0 ? (
            <div className="p-6 border-2 border-dashed border-indigo-200 rounded-xl text-center text-indigo-900/60 font-medium">
              Ingen bilete lasta opp enno. Bruk knappen over for å velje heile mapper eller biletseriar.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {images.map((img, idx) => (
                <div key={img.id || idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-stone-900 aspect-video flex items-center justify-center shadow-2xs">
                  {img.url ? (
                    <img src={img.url} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-stone-400">Tom</span>
                  )}
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                    {idx + 1}
                  </span>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveImage(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 bg-white text-stone-800 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveImage(idx, 1)}
                      disabled={idx === images.length - 1}
                      className="p-1 bg-white text-stone-800 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 3. BILDEBIBELEN (FreeBibleImages med leiarmanus og KI-forteljing)
  const renderBildeBibelenFields = () => {
    const d = block.data as BildeBibelenData;
    const scenes = d.scenes || [];

    const handleLocalStoryFallback = (q: string) => {
      const norm = q.toLowerCase();
      let fallbackTitle = q;
      let fallbackScenes: any[] = [];

      if (/noa|ark/i.test(norm)) {
        fallbackTitle = 'Noas ark (1. Mosebok 6–9)';
        fallbackScenes = [
          {
            id: `bbs_loc_1`,
            sceneNumber: 1,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Book_of_Genesis_Chapter_6-1_%28Bible_Illustrations_by_Sweet_Media%29.jpg',
            scriptureRef: '1. Mos 6,5-8',
            leaderNotes: 'Gud ser at diverre er det mykje vondskap i verda, men Noa finn nåde hos Herren.',
          },
          {
            id: `bbs_loc_2`,
            sceneNumber: 2,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Book_of_Genesis_Chapter_6-2_%28Bible_Illustrations_by_Sweet_Media%29.jpg',
            scriptureRef: '1. Mos 6,14-16',
            leaderNotes: 'Gud seier til Noa: Bygg deg ein ark av gofertre! Noa lyder Gud og gjer alt som vert sagt.',
          },
          {
            id: `bbs_loc_3`,
            sceneNumber: 3,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/06/Book_of_Genesis_Chapter_7-1_%28Bible_Illustrations_by_Sweet_Media%29.jpg',
            scriptureRef: '1. Mos 7,1-5',
            leaderNotes: 'Dyr av alle slag kjem to og to inn i arken saman med Noa og familien hans.',
          },
          {
            id: `bbs_loc_4`,
            sceneNumber: 4,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Book_of_Genesis_Chapter_7-2_%28Bible_Illustrations_by_Sweet_Media%29.jpg',
            scriptureRef: '1. Mos 7,11-12',
            leaderNotes: 'Regnet strøymer ned i 40 dagar og 40 netter, og arken flyt trygt på vatnet.',
          },
          {
            id: `bbs_loc_5`,
            sceneNumber: 5,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Book_of_Genesis_Chapter_8-1_%28Bible_Illustrations_by_Sweet_Media%29.jpg',
            scriptureRef: '1. Mos 8,10-11',
            leaderNotes: 'Noa sender ut ei due som kjem tilbake med eit friskt oljeblad i nebbet – vatnet minkar!',
          },
          {
            id: `bbs_loc_6`,
            sceneNumber: 6,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Book_of_Genesis_Chapter_9-1_%28Bible_Illustrations_by_Sweet_Media%29.jpg',
            scriptureRef: '1. Mos 9,12-15',
            leaderNotes: 'Gud set regnbogen på himmelen som eit teikn på sin evige pakt med alt levande.',
          },
        ];
      } else if (/bortkomn|fortap/i.test(norm)) {
        fallbackTitle = 'Den bortkomne sonen (Lukas 15,11–32)';
        fallbackScenes = [
          {
            id: `bbs_loc_1`,
            sceneNumber: 1,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Gospel_of_Luke_Chapter_15-1_%28Bible_Illustrations_by_Sweet_Media%29.jpg',
            scriptureRef: 'Luk 15,11-12',
            leaderNotes: 'Den yngste sonen ber far sin om å få sin del av arven i levande live.',
          },
          {
            id: `bbs_loc_2`,
            sceneNumber: 2,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Gospel_of_Luke_Chapter_15-2_%28Bible_Illustrations_by_Sweet_Media%29.jpg',
            scriptureRef: 'Luk 15,13-14',
            leaderNotes: 'Han reiser til eit land langt borte og sløser bort alt han eig i eit vilt liv.',
          },
          {
            id: `bbs_loc_3`,
            sceneNumber: 3,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Gospel_of_Luke_Chapter_15-3_%28Bible_Illustrations_by_Sweet_Media%29.jpg',
            scriptureRef: 'Luk 15,15-16',
            leaderNotes: 'Når uår kjem, må han gi mat til grisane og lengtar etter å mete seg med belgane dei et.',
          },
          {
            id: `bbs_loc_4`,
            sceneNumber: 4,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Gospel_of_Luke_Chapter_15-4_%28Bible_Illustrations_by_Sweet_Media%29.jpg',
            scriptureRef: 'Luk 15,17-20',
            leaderNotes: 'Han går i seg sjølv og tenkjer: Eg vil gå heim til far min og seie eg har synda.',
          },
          {
            id: `bbs_loc_5`,
            sceneNumber: 5,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Gospel_of_Luke_Chapter_15-5_%28Bible_Illustrations_by_Sweet_Media%29.jpg',
            scriptureRef: 'Luk 15,20-24',
            leaderNotes: 'Medan han ennå er langt borte, ser faren han, spring han i møte med opne armar og held fest!',
          },
        ];
      } else if (/samaritan/i.test(norm)) {
        fallbackTitle = 'Den gode samaritanen (Lukas 10,25–37)';
        fallbackScenes = [
          {
            id: `bbs_loc_1`,
            sceneNumber: 1,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Gospel_of_Luke_Chapter_10-1_%28Bible_Illustrations_by_Sweet_Media%29.jpg',
            scriptureRef: 'Luk 10,30',
            leaderNotes: 'Ein mann er på veg frå Jerusalem til Jeriko då han kjem ut for røvarar som slår han helselaus.',
          },
          {
            id: `bbs_loc_2`,
            sceneNumber: 2,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Gospel_of_Luke_Chapter_10-2_%28Bible_Illustrations_by_Sweet_Media%29.jpg',
            scriptureRef: 'Luk 10,31-32',
            leaderNotes: 'Både ein prest og ein levitt kjem forbi, men går rett forbi på den andre sida.',
          },
          {
            id: `bbs_loc_3`,
            sceneNumber: 3,
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Gospel_of_Luke_Chapter_10-3_%28Bible_Illustrations_by_Sweet_Media%29.jpg',
            scriptureRef: 'Luk 10,33-35',
            leaderNotes: 'Ein samaritan kjem og kjenner inderleg medlidenheit, steller sora og tek han med til eit herberge.',
          },
        ];
      } else {
        fallbackTitle = q || 'Bibelforteljing';
        fallbackScenes = [
          {
            id: `bbs_loc_1`,
            sceneNumber: 1,
            imageUrl: 'https://images.unsplash.com/photo-1548625361-12f5ea11a3b0?auto=format&fit=crop&w=1200&q=80',
            scriptureRef: '',
            leaderNotes: `Scene 1 i forteljinga om ${q}.`,
          },
          {
            id: `bbs_loc_2`,
            sceneNumber: 2,
            imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
            scriptureRef: '',
            leaderNotes: `Scene 2 i forteljinga om ${q}.`,
          },
          {
            id: `bbs_loc_3`,
            sceneNumber: 3,
            imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
            scriptureRef: '',
            leaderNotes: `Scene 3 i forteljinga om ${q}.`,
          },
          {
            id: `bbs_loc_4`,
            sceneNumber: 4,
            imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
            scriptureRef: '',
            leaderNotes: `Scene 4 i forteljinga om ${q}.`,
          },
        ];
      }

      onUpdateBlockData({
        ...d,
        title: fallbackTitle,
        storyQuery: q,
        scenes: fallbackScenes,
      });
    };

    const handleSearchStory = async (query: string) => {
      if (!query || !query.trim()) return;
      const cleanQ = query.trim();
      try {
        setIsFetchingBildeBibelen(true);
        const res = await fetch('/api/bildebibelen/fetch-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: cleanQ, storyQuery: cleanQ }),
        });

        if (res.ok) {
          const json = await res.json();
          const fetchedScenes = json.scenes || json.story?.scenes || [];
          const fetchedTitle = json.title || json.story?.title || cleanQ;

          if (fetchedScenes.length > 0) {
            onUpdateBlockData({
              ...d,
              title: fetchedTitle,
              storyQuery: cleanQ,
              scenes: fetchedScenes,
            });
            return;
          }
        }
        handleLocalStoryFallback(cleanQ);
      } catch (err) {
        console.error('Feil ved henting av BildeBibelen-historie, brukar fallback:', err);
        handleLocalStoryFallback(cleanQ);
      } finally {
        setIsFetchingBildeBibelen(false);
      }
    };

    const handleUpdateSceneNote = (idx: number, notes: string) => {
      const next = [...scenes];
      next[idx] = { ...next[idx], leaderNotes: notes };
      onUpdateBlockData({ ...d, scenes: next });
    };

    const handleUpdateSceneRef = (idx: number, scriptureRef: string) => {
      const next = [...scenes];
      next[idx] = { ...next[idx], scriptureRef };
      onUpdateBlockData({ ...d, scenes: next });
    };

    return (
      <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        {/* Tittel og tidsbruk */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Forteljingstittel / Tema
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="T.d. Noas ark (1. Mosebok 6-9)..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 10}
              onChange={(e) => onUpdateBlockData({ ...d, durationMinutes: parseInt(e.target.value, 10) || 10 })}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* KI-SØKEFELT OG FORSKANDAR-HURTIGKNAPPAR */}
        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 text-xs">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>Hent teikneserie frå FreeBibleImages m/norsk KI-manus:</span>
            </span>
            {isFetchingBildeBibelen && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-md animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> Genererer manus...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={bildeBibelenQueryInput}
              onChange={(e) => setBildeBibelenQueryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchStory(bildeBibelenQueryInput);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="T.d. Den bortkomne sonen eller lim inn lenke frå freebibleimages.org..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-stone-900 text-slate-900 dark:text-stone-100 text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleSearchStory(bildeBibelenQueryInput)}
              disabled={isFetchingBildeBibelen}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
            >
              Hent forteljing
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { name: 'Noas ark', query: 'Noas ark' },
              { name: 'Den bortkomne sonen', query: 'Den bortkomne sonen' },
              { name: 'Den gode samaritanen', query: 'Den gode samaritanen' },
              { name: 'Juleforteljinga', query: 'Juleforteljinga' },
              { name: 'Påskeforteljinga', query: 'Påskeforteljinga' },
              { name: 'Jona', query: 'Jona og kvalen' },
            ].map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setBildeBibelenQueryInput(preset.query);
                  handleSearchStory(preset.query);
                }}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-stone-800 text-amber-950 dark:text-amber-200 text-[11px] font-semibold cursor-pointer transition-colors border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100/80"
              >
                ★ {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* VERTIKAL LISTE OVER SCENER */}
        {scenes.length === 0 ? (
          <div className="p-6 border-2 border-dashed border-slate-200 dark:border-stone-800 rounded-xl text-center text-slate-400 font-medium">
            Ingen forteljing lasta enno. Søk etter eit bibelsk tema over for å hente teikneserieruter og KI-omsett forteljarmanus.
          </div>
        ) : (
          <div className="space-y-3">
            <span className="block text-[11px] font-bold text-slate-700 dark:text-stone-300">
              Scener og forteljarmanus ({scenes.length} ruter):
            </span>
            {scenes.map((sc, idx) => (
              <div key={sc.id || idx} className="p-3.5 rounded-xl border border-slate-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-stone-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {sc.sceneNumber || idx + 1}
                    </span>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                      Scene {sc.sceneNumber || idx + 1} av {scenes.length}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={sc.scriptureRef || ''}
                    onChange={(e) => handleUpdateSceneRef(idx, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Bibeltilvising (f.eks. 1. Mos 6,14)..."
                    className="w-40 px-2 py-0.5 rounded border border-slate-200 dark:border-stone-700 bg-slate-50 dark:bg-stone-800 text-[11px] text-right font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
                  <div className="sm:col-span-1">
                    <div className="relative w-full h-28 rounded-lg bg-stone-900 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-stone-700">
                      <img src={sc.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
                    </div>
                  </div>

                  <div className="sm:col-span-3 space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-stone-300">
                      Muntleg forteljarmanus for leiar (visast kun i leiarvisning):
                    </label>
                    <textarea
                      rows={3}
                      value={sc.leaderNotes || ''}
                      onChange={(e) => handleUpdateSceneNote(idx, e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="Skriv det du skal fortelje til denne rutan..."
                      className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-stone-700 bg-slate-50/50 dark:bg-stone-800/50 text-slate-800 dark:text-slate-100 text-xs focus:outline-none font-sans leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderVideoFields = () => {
    const d = block.data as any;
    const parsed = parseVideoUrl(d.videoUrl || '', d.startTimeSeconds, d.stopTimeSeconds, false);

    return (
      <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-stone-800 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tittel på videoblokk (t.d. «Kortfilm: Den bortkomne sonen»)
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Tittel på videoen..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400 mb-1">
              Tidsbruk (min)
            </label>
            <input
              type="number"
              min="1"
              value={d.durationMinutes || 5}
              onChange={(e) => onUpdateBlockData({ ...d, durationMinutes: parseInt(e.target.value, 10) || 5 })}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-stone-400">
              Videolenke (YouTube, Vimeo eller direkte MP4/WebM-fil)
            </label>
            {parsed.isValid && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                {parsed.type === 'youtube' ? 'YouTube' : parsed.type === 'vimeo' ? 'Vimeo' : 'MP4 / Fil'}
              </span>
            )}
          </div>
          <input
            type="text"
            value={d.videoUrl || ''}
            onChange={(e) => onUpdateBlockData({ ...d, videoUrl: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Lim inn URL (t.d. https://www.youtube.com/watch?v=... eller https://youtu.be/...)"
            className={`w-full px-3 py-2 rounded-md border text-xs focus:outline-none transition-colors ${
              d.videoUrl && !parsed.isValid
                ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500'
                : 'border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-slate-400'
            }`}
          />
          {d.videoUrl && !parsed.isValid && (
            <div className="mt-1.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{parsed.errorMessage || 'Ugyldig videolenke – lim inn ei lenke frå YouTube eller Vimeo.'}</span>
            </div>
          )}
          <div className="mt-2 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 text-[11px] flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Video krev ekte lenke (YouTube, Vimeo eller MP4) og kan ikkje diktast opp av AI. Lim inn di eiga lenke her.</span>
          </div>
        </div>

        {/* Forhandsvising i arbeidskortet dersom lenka er gyldig */}
        {parsed.isValid && (
          <div className="rounded-xl overflow-hidden bg-black border border-stone-800 relative aspect-video flex items-center justify-center">
            {parsed.type === 'youtube' || parsed.type === 'vimeo' ? (
              <iframe
                src={parsed.embedUrl}
                title="Videoførehandsvising"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={parsed.embedUrl}
                controls
                muted={!!d.muted}
                loop={!!d.loop}
                className="w-full h-full object-contain"
              />
            )}
          </div>
        )}

        {/* Tidsstyring (valfritt) og avspelingsval */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">
              Start ved (min:sek)
            </label>
            <input
              type="text"
              value={formatSecondsToMinSec(d.startTimeSeconds)}
              onChange={(e) => {
                const sec = parseMinSecToSeconds(e.target.value);
                onUpdateBlockData({ ...d, startTimeSeconds: sec });
              }}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="t.d. 0:30"
              className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">
              Stopp ved (min:sek)
            </label>
            <input
              type="text"
              value={formatSecondsToMinSec(d.stopTimeSeconds)}
              onChange={(e) => {
                const sec = parseMinSecToSeconds(e.target.value);
                onUpdateBlockData({ ...d, stopTimeSeconds: sec });
              }}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="t.d. 2:45"
              className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white text-xs font-mono"
            />
          </div>
          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={!!d.loop}
                onChange={(e) => onUpdateBlockData({ ...d, loop: e.target.checked })}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <span>Gjenta (Loop)</span>
            </label>
          </div>
          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={!!d.muted}
                onChange={(e) => onUpdateBlockData({ ...d, muted: e.target.checked })}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <span>Dempa lyd</span>
            </label>
          </div>
        </div>

        {/* Leiarstøtte (To lag: Stikkord og Utdjupande notat) */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-stone-200 mb-1">
              Leiarstøtte (stikkord og utdjupande notat)
            </label>
            <input
              type="text"
              value={d.leaderKeywords || ''}
              onChange={(e) => onUpdateBlockData({ ...d, leaderKeywords: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Stikkord for leiar (fokuspunkt under eller før videoen)..."
              className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-800 dark:text-slate-100 text-xs font-bold mb-2 focus:ring-1 focus:ring-slate-400"
            />
            <textarea
              rows={2}
              value={d.leaderElaboration || ''}
              onChange={(e) => onUpdateBlockData({ ...d, leaderElaboration: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Utdjupande notat / refleksjonsspørsmål etter videoen..."
              className="w-full p-2.5 rounded-md border border-slate-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-slate-700 dark:text-stone-300 text-xs focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderSvartSkjermFields = () => {
    const d = (block.data || {}) as SvartSkjermData;

    return (
      <div className="space-y-4 pt-3 border-t border-slate-100 text-xs">
        {/* Tittel og tidsbruk */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Tittel (visast berre for leiar)
            </label>
            <input
              type="text"
              value={d.title || ''}
              onChange={(e) => onUpdateBlockData({ ...d, title: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Svart skjerm"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-slate-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Tid (valfri, min)
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={d.durationMinutes === 0 ? 0 : (d.durationMinutes || '')}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                onUpdateBlockData({ ...d, durationMinutes: isNaN(val) ? 0 : Math.max(0, val) });
              }}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="0"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white text-center font-medium"
            />
          </div>
        </div>

        {/* Informasjonsbanner om at storskjerm vert heilt mørk */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 text-white shadow-sm">
          <MonitorOff className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-slate-200">Storskjermen vert heilt svart.</span>{' '}
            <span className="text-slate-400">Perfekt når forsamlinga skal feste merksemda fullt og heilt på formidlaren.</span>
          </div>
        </div>

        {/* Stikkord / Notat for den munnlege praten */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700">
            Stikkord for den munnlege praten (synleg berre på leiarskjermen)
          </label>
          <textarea
            rows={4}
            value={d.notes || ''}
            onChange={(e) => onUpdateBlockData({ ...d, notes: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Skriv 2–3 stikkord for kva du vil seie munnleg medan skjermen er mørk..."
            className="w-full p-2.5 rounded-lg border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white leading-relaxed placeholder:text-slate-400"
          />
        </div>
      </div>
    );
  };

  const renderContentFields = () => {
    switch (block.type) {
      case 'stikkord': return renderStikkordFields();
      case 'tekst': return renderTekstFields();
      case 'undervisning': return renderUndervisningFields();
      case 'bibelord': return renderBibelordFields();
      case 'informasjon': return renderInformasjonFields();
      case 'bonn_dikt': return renderBonnDiktFields();
      case 'lek': return renderLekFields();
      case 'konkurranse': return renderKonkurranseFields();
      case 'samtale': return renderSamtaleFields();
      case 'quiz': return renderQuizFields();
      case 'sang_salme': return renderSangSalmeFields();
      case 'henteleik': return renderHenteleikFields();
      case 'kims_leik': return renderKimsLeikFields();
      case 'reis_deg': return renderReisDegFields();
      case 'bilete_avdekking': return renderBileteAvdekkingFields();
      case 'beat_for_beat': return renderBeatForBeatFields();
      case 'ord_for_ord': return renderOrdForOrdFields();
      case 'kven_skal_ut': return renderKvenSkalUtFields();
      case 'bilete': return renderBileteFields();
      case 'lysbileteshow': return renderLysbileteshowFields();
      case 'bildebibelen': return renderBildeBibelenFields();
      case 'bilde': return renderBileteFields();
      case 'video': return renderVideoFields();
      case 'svart_skjerm': return renderSvartSkjermFields();
    }
  };

  const getLocalAiConfig = () => {
    switch (block.type) {
      case 'stikkord': {
        const d = block.data as StikkordData;
        return {
          title: 'Formuler storskjerm-ord og leiarmanus',
          description: 'AI lagar 3–5 slåande moment til storskjerm og levande leiarmanus for kvart punkt.',
          placeholder: 'Kjernebodskap eller tema (t.d. Kva er nåde?)...',
          defaultPrompt: d.title && d.title !== 'Stikkord' ? d.title : '',
          buttonText: 'Formuler stikkord og manus',
        };
      }
      case 'tekst': {
        const d = block.data as TekstData;
        return {
          title: 'Formuler storskjerm-tekst og leiarmanus',
          description: 'AI lagar ein kort og tydeleg bodskap til storskjerm (2–3 linjer) og fyldig leiarmanus.',
          placeholder: 'Tema eller kjernebodskap...',
          defaultPrompt: d.title && d.title !== 'Tekst' ? d.title : '',
          buttonText: 'Formuler tekst og manus',
        };
      }
      case 'bibelord': {
        const d = block.data as any;
        return {
          title: 'Hent bibeltekst (Bibel 2024 / 2011)',
          description: 'AI hentar ordrett tekst frå Det Norske Bibelselskap (Bibel 2024 / 2011) med gåsaugo rundt.',
          placeholder: 'Bibelvers eller tema (t.d. Lukas 15,11–24 eller Den bortkomne sonen)...',
          defaultPrompt: d.scriptureRef || d.reference || (d.title && d.title !== 'Bibelord' ? d.title : ''),
          buttonText: 'Hent bibeltekst (Bibel 2024)',
        };
      }
      case 'bilete':
      case 'bilde': {
        const d = block.data as any;
        return {
          title: 'Finn bilete med Pixabay og lag bildetekst',
          description: 'AI formulerer engelske søketags, søkjer i Pixabay og legg inn eit reelt foto.',
          placeholder: 'Biletemotiv eller tema (t.d. Solnedgang over havet, Leirbål)...',
          defaultPrompt: d.title && d.title !== 'Bilete' ? d.title : '',
          buttonText: 'Finn bilete med Pixabay',
        };
      }
      case 'lysbileteshow': {
        const d = block.data as any;
        return {
          title: 'Hent 8–15 stemningsbilete frå Pixabay',
          description: 'AI hentar ein serie på 8–15 fotografi frå Pixabay tilpassa temaet.',
          placeholder: 'Tema for bildeserien (t.d. Fjellvandring, Stjernehimmel, Fellesskap)...',
          defaultPrompt: d.title && d.title !== 'Lysbileteshow' ? d.title : '',
          buttonText: 'Hent lysbileteserie',
        };
      }
      case 'bilete_avdekking': {
        const d = block.data as any;
        return {
          title: 'Finn bilete til gjetteleik (100 ruter)',
          description: 'AI finn eit spanande fotografi, lagar eit 100 ruters kaos-puslespill og fasit med hint.',
          placeholder: 'Dyr, stad eller gjenstand å gjette (t.d. Ein ørkenrev, Eiffeltårnet)...',
          defaultPrompt: d.title && d.title !== 'Bilete-avdekking' ? d.title : '',
          buttonText: 'Generer gjetteleik (100 ruter)',
        };
      }
      case 'kims_leik': {
        const d = block.data as KimsLeikData;
        return {
          title: 'Fyll Kims leik med 16 tematiske gjenstandar',
          description: 'AI genererer nøyaktig 16 unike element med passande emoji og nynorske substantiv.',
          placeholder: 'Valfritt tema (standard: Konfirmasjonsfest / Tru)...',
          defaultPrompt: d.title && d.title !== 'Kims leik' ? d.title : 'Konfirmasjonsfest / Tru',
          buttonText: 'Generer 16 gjenstandar',
        };
      }
      case 'bildebibelen': {
        const d = block.data as any;
        return {
          title: 'Hent teikneserie og lag nynorsk leiarmanus',
          description: 'Hentar teikneserieruter frå Sweet Publishing og lagar leiarmanus per scene.',
          placeholder: 'Bibelforteljing (t.d. Den bortkomne sonen, Noas ark)...',
          defaultPrompt: d.storyQuery || (d.title && d.title !== 'BildeBibelen' ? d.title : ''),
          buttonText: 'Hent forteljing og manus',
        };
      }
      case 'video': {
        const d = block.data as any;
        return {
          title: 'Foreslå YouTube-video og leiarintroduksjon',
          description: 'AI foreslår ein passande video til temaet med autoplay av og lagar leiarmanus.',
          placeholder: 'Tema for videoen (t.d. Nåde, The Bible Project, Lovsong)...',
          defaultPrompt: d.title && d.title !== 'Video' ? d.title : '',
          buttonText: 'Foreslå video',
        };
      }
      case 'bonn_dikt': {
        const d = block.data as any;
        return {
          title: 'Skriv ei varm, munnleg bøn på nynorsk',
          description: 'Lagar ei munnleg, samlande bøn tilpassa Patrick Hand-vising på storskjerm.',
          placeholder: 'Kva vil du be for? (t.d. Fred, ungdommane, takk for fellesskapet)...',
          defaultPrompt: d.title && d.title !== 'Bøn' ? d.title : '',
          buttonText: 'Skriv bøn',
        };
      }
      case 'quiz': {
        const d = block.data as any;
        return {
          title: 'Generer quiz-spørsmål med alternativ og fasit',
          description: 'Lagar 5 spørsmål med 4 alternativ og fasit.',
          placeholder: 'Tema for quizen (t.d. Påska, Disiplane, Leirliv)...',
          defaultPrompt: d.title && d.title !== 'Quiz' ? d.title : '',
          buttonText: 'Generer quiz-spørsmål',
        };
      }
      case 'henteleik': {
        const d = block.data as any;
        return {
          title: 'Generer henteoppdrag',
          description: 'AI finn konkrete, tematiske gjenstandar som ungdommane kan springe og hente.',
          placeholder: 'Tema for leiken (t.d. Den bortkomne sonen, Påske, Vennskap)...',
          defaultPrompt: d.title && d.title !== 'Henteleiken' ? d.title : '',
          buttonText: 'Generer henteoppdrag',
        };
      }
      case 'reis_deg': {
        const d = block.data as any;
        return {
          title: 'Generer påstandar tilpassa forsamlinga',
          description: 'AI lagar 4–6 gjenkjennelege påstandar som skaper liv og latter i rommet.',
          placeholder: 'Tema eller målgruppe (t.d. Skule, leir, helg)...',
          defaultPrompt: d.title && d.title !== 'Reis deg' ? d.title : '',
          buttonText: 'Generer påstandar',
        };
      }
      case 'beat_for_beat': {
        const d = block.data as any;
        return {
          title: 'Generer Beat for beat-oppgåve',
          description: 'AI finn ein kjend song eller salme og deler opp teksten i einskildord.',
          placeholder: 'Songtittel eller sjanger (t.d. Påskesalmar, Lovsong, Ungdom)...',
          defaultPrompt: d.title && d.title !== 'Beat for beat' ? d.title : '',
          buttonText: 'Generer Beat for beat',
        };
      }
      case 'ord_for_ord': {
        const d = block.data as any;
        return {
          title: 'Generer Ord for ord-oppgåve',
          description: 'AI finn eit kjent bibelvers eller sitat og deler opp i ord med hint.',
          placeholder: 'Bibelvers eller tema (t.d. Kjærleik, Håp, Skapinga)...',
          defaultPrompt: d.title && d.title !== 'Ord for ord' ? d.title : '',
          buttonText: 'Generer Ord for ord',
        };
      }
      case 'kven_skal_ut': {
        const d = block.data as any;
        return {
          title: 'Generer «Kven skal ut?»-oppgåve',
          description: 'AI lagar 4 alternativ der eitt skil seg logisk ut, saman med fasit og forklaring.',
          placeholder: 'Tema (t.d. Disiplane, Gamletestamentet, Høgtider)...',
          defaultPrompt: d.title && d.title !== 'Kven skal ut?' ? d.title : '',
          buttonText: 'Generer Kven skal ut',
        };
      }
      case 'sang_salme': {
        const d = block.data as any;
        return {
          title: 'Hent salme- eller songtekst',
          description: 'AI finn salmevers og songnummer tilpassa temaet.',
          placeholder: 'Salme eller song (t.d. No livnar det i lundar, Lovsyng vår Herre)...',
          defaultPrompt: d.title && d.title !== 'Salme' ? d.title : '',
          buttonText: 'Hent songtekst',
        };
      }
      case 'samtale': {
        const d = block.data as any;
        return {
          title: 'Lag samtaleopplegg og spørsmål',
          description: 'AI formulerer gode, opne undringsspørsmål og samtalestruktur.',
          placeholder: 'Tema for samtalen (t.d. Tilgjeving, Framtida, Venskap)...',
          defaultPrompt: d.topic || (d.title && d.title !== 'Samtale' ? d.title : ''),
          buttonText: 'Lag samtaleopplegg',
        };
      }
      case 'informasjon': {
        const d = block.data as any;
        return {
          title: 'Formuler praktisk informasjon',
          description: 'AI set opp ryddige punkt og merknad om program og praktiske detaljar.',
          placeholder: 'Kva skal informerast om? (t.d. Kiosken, samlinga i morgon)...',
          defaultPrompt: d.heading || (d.title && d.title !== 'Informasjon' ? d.title : ''),
          buttonText: 'Formuler informasjon',
        };
      }
      default: {
        return {
          title: `Fyll ${meta?.label || 'blokka'} med AI`,
          description: 'Skriv inn eit tema eller stikkord, så lagar AI innhald tilpassa denne blokka.',
          placeholder: 'Kva vil du at AI skal fylle denne blokka med?',
          defaultPrompt: '',
          buttonText: 'Generer innhald',
        };
      }
    }
  };

  const handleLocalAiGenerate = async () => {
    const config = getLocalAiConfig();
    const effectivePrompt = (localAiPrompt.trim() || config.defaultPrompt || getBlockTitle()).trim();
    if (!effectivePrompt) {
      setLocalAiError('Skriv inn eit tema eller stikkord først.');
      return;
    }

    setIsLocalAiLoading(true);
    setLocalAiError(null);
    setLocalAiSuccess(false);

    try {
      // 1. KIMS LEIK (16 tematiske gjenstandar med emoji)
      if (block.type === 'kims_leik') {
        const res = await fetch('/api/kims-leik/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: effectivePrompt, count: 16, language, lang: language }),
        });
        if (!res.ok) throw new Error('Feil ved generering av Kims leik');
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        if (items.length > 0) {
          const formatted = items.slice(0, 16).map((it: any, idx: number) => ({
            id: `kims_${Date.now()}_${idx + 1}`,
            name: it.name || it.text || 'Gjenstand',
            emoji: it.emoji || it.iconName || '📦',
            text: it.name || it.text || 'Gjenstand',
            iconName: it.emoji || it.iconName || '📦',
          }));
          onUpdateBlockData({
            ...block.data,
            title: `${meta.label}: ${effectivePrompt}`,
            countdownSeconds: 30,
            timerSeconds: 30,
            itemCount: 16,
            items: formatted,
          });
          setLocalAiSuccess(true);
          if (!block.isExpanded) onToggleExpand();
          setTimeout(() => {
            setIsLocalAiOpen(false);
            setLocalAiSuccess(false);
          }, 2500);
        } else {
          setLocalAiError('Kunne ikkje hente 16 gjenstandar. Prøv igjen.');
        }
      }
      // 2. BILDEBIBELEN (Sweet Publishing teikneserie med leiarmanus)
      else if (block.type === 'bildebibelen') {
        const res = await fetch('/api/bildebibelen/fetch-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyQuery: effectivePrompt, query: effectivePrompt, language, lang: language }),
        });
        if (!res.ok) throw new Error('Feil ved henting av forteljing');
        const data = await res.json();
        const scenes = data.scenes || data.story?.scenes || [];
        if (scenes.length > 0) {
          onUpdateBlockData({
            ...block.data,
            title: data.title || effectivePrompt,
            storyQuery: effectivePrompt,
            scenes: scenes.map((s: any, idx: number) => ({
              id: s.id || `bbs_${Date.now()}_${idx + 1}`,
              sceneNumber: s.sceneNumber || idx + 1,
              imageUrl: s.imageUrl || s.url,
              scriptureRef: s.scriptureRef || s.bibleVerse || '',
              bibleVerse: s.bibleVerse || s.scriptureRef || '',
              leaderNotes: s.leaderNotes || s.narrationScript || '',
              narrationScript: s.leaderNotes || s.narrationScript || '',
            })),
          });
          setLocalAiSuccess(true);
          if (!block.isExpanded) onToggleExpand();
          setTimeout(() => {
            setIsLocalAiOpen(false);
            setLocalAiSuccess(false);
          }, 2500);
        } else {
          setLocalAiError('Fann ingen teikneserieruter for dette temaet.');
        }
      }
      // 3. ALLE ANDRE BLOKKER (Går gjennom forsterka single-block/generate med Pixabay og Wikimedia)
      else {
        const res = await fetch('/api/single-block/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            blockType: block.type,
            prompt: effectivePrompt,
            language,
            lang: language,
            targetGroup: 'Ungdom',
            gridSize: 100, // 100 ruter som default
            questionCount: 5,
            quizMode: 'multiple_choice',
          }),
        });
        if (!res.ok) throw new Error('Feil frå server (' + res.status + ')');
        const data = await res.json();
        if (!data.success || !data.blockData || Object.keys(data.blockData).length === 0) {
          throw new Error(data.message || 'Kunne ikkje hente innhald for denne blokka. Prøv igjen.');
        }
        const b = data.blockData;

        if (block.type === 'stikkord') {
          const pts = Array.isArray(b.points) && b.points.length > 0
            ? b.points.map((p: any, idx: number) => {
                const titleText = (p.text || p.keyword || p.title || `Moment ${idx + 1}`).trim();
                const noteText = (p.note || p.leaderNotes || p.detail || '').trim();
                return {
                  id: p.id || `sp_${Date.now()}_${idx + 1}`,
                  keyword: titleText,
                  text: titleText,
                  leaderNotes: noteText,
                  note: noteText,
                };
              })
            : [];

          onUpdateBlockData(
            {
              ...block.data,
              title: b.title || effectivePrompt,
              points: pts.length > 0 ? pts : (block.data as StikkordData).points,
              durationMinutes: Math.max(5, (pts.length > 0 ? pts.length : ((block.data as StikkordData)?.points?.length || 3)) * 2),
            },
            b.leaderNotes || ''
          );
        } else if (block.type === 'tekst') {
          const currentData = block.data as TekstData;
          const slideTxt = b.slideText || b.text || b.content || currentData?.slideText || currentData?.text || effectivePrompt;
          const newLeaderNotes = b.leaderNotes || currentData?.leaderNotes || block.leaderNotes || '';
          onUpdateBlockData(
            {
              ...block.data,
              title: b.title || currentData?.title || effectivePrompt,
              text: slideTxt,
              slideText: slideTxt,
              content: slideTxt,
              subtitle: b.subtitle !== undefined ? b.subtitle : (currentData?.subtitle || ''),
              leaderNotes: newLeaderNotes,
              durationMinutes: 4,
            },
            newLeaderNotes
          );
        } else if (block.type === 'bibelord') {
          const vText = b.verseText || b.bibleText || b.keyVerse || b.text || '';
          const ref = b.reference || b.scriptureRef || b.bibleRef || effectivePrompt;
          onUpdateBlockData({
            ...block.data,
            title: b.title || `Bibelord: ${ref}`,
            scriptureRef: ref,
            reference: ref,
            bibleRef: ref,
            keyVerse: vText,
            verseText: vText,
            bibleText: vText,
            text: vText,
            content: vText,
            reflectionQuestion: b.reflectionQuestion || '',
            durationMinutes: 4,
          }, b.leaderNotes || '');
        } else if (block.type === 'bilete' || block.type === 'bilde') {
          const currentData = block.data as any;
          const newLayout = b.layout || (b.images && b.images.length >= 2 ? b.images.length : (block.data as any).layout || 1);
          const newImages = Array.isArray(b.images) && b.images.length > 0
            ? b.images.map((img: any, idx: number) => ({
                id: img.id || `img_${Date.now()}_${idx + 1}`,
                url: img.url || '',
                caption: img.caption || '',
                alt: img.alt || '',
              }))
            : currentData.images || [];

          onUpdateBlockData({
            ...block.data,
            title: b.title || currentData.title || 'Bilete',
            layout: newLayout,
            images: newImages,
            durationMinutes: b.durationMinutes || currentData.durationMinutes || 3,
          });
        } else if (block.type === 'lysbileteshow') {
          onUpdateBlockData({
            ...block.data,
            title: b.title || `Lysbileteshow: ${effectivePrompt}`,
            interval: 3,
            intervalSeconds: 3,
            loop: true,
            autoLoop: true,
            autoPlay: true,
            images: Array.isArray(b.images) && b.images.length > 0 ? b.images : (block.data as LysbileteshowData).images,
            durationMinutes: 3,
          });
        } else if (block.type === 'bilete_avdekking') {
          onUpdateBlockData({
            ...block.data,
            title: b.title || 'Bilete-avdekking',
            imageUrl: b.imageUrl || (block.data as BileteAvdekkingData).imageUrl,
            gridSize: 100, // 100 ruter default
            solution: b.fasit || b.solution || effectivePrompt,
            fasit: b.fasit || b.solution || effectivePrompt,
            clue: b.clue || (Array.isArray(b.hints) && b.hints[0]) || '',
            hints: Array.isArray(b.hints) ? b.hints : [b.clue],
            durationMinutes: 5,
          });
        } else if (block.type === 'video') {
          onUpdateBlockData(
            {
              ...block.data,
              title: b.title || `Video: ${effectivePrompt}`,
              videoUrl: b.videoUrl || 'https://www.youtube.com/watch?v=kYJzXv-K5v0',
              autoplay: false,
              isPlaying: false,
              leaderNotes: b.leaderNotes || '',
              leaderKeywords: 'Fokuspunkt under avspeling',
              leaderElaboration: b.leaderNotes || '',
              durationMinutes: 5,
            },
            b.leaderNotes || ''
          );
        } else if (block.type === 'bonn_dikt') {
          onUpdateBlockData(
            {
              ...block.data,
              title: b.title || `Bøn for ${effectivePrompt}`,
              text: b.text || '',
              responsiveReading: b.responsiveReading || '',
              isResponsive: !!b.responsiveReading,
              durationMinutes: 3,
            },
            b.leaderNotes || block.leaderNotes || ''
          );
        } else if (block.type === 'quiz') {
          const qs = Array.isArray(b.questions) && b.questions.length > 0 
            ? b.questions 
            : Array.isArray(b.quizQuestions) ? b.quizQuestions : (block.data as QuizData).questions;
          onUpdateBlockData(
            {
              ...block.data,
              title: b.title || `Quiz: ${effectivePrompt}`,
              quizType: 'mc',
              questions: qs,
              durationMinutes: 6,
            },
            b.leaderNotes || block.leaderNotes || ''
          );
        } else if (block.type === 'henteleik') {
          const currentItems = (block.data as HenteleikData)?.items || [];
          const rawItems = Array.isArray(b.items) && b.items.length > 0
            ? b.items
            : Array.isArray(b.henteleikItems) && b.henteleikItems.length > 0
            ? b.henteleikItems
            : [];
          const items = rawItems.length > 0
            ? rawItems.map((it: any, idx: number) => ({
                id: it.id || `h_${Date.now()}_${idx + 1}`,
                text: (typeof it === 'object' && it ? it.text || it.name : String(it)).trim(),
              }))
            : currentItems;
          onUpdateBlockData({
            ...block.data,
            title: b.title || (block.data as HenteleikData)?.title || 'Henteleiken',
            intro: b.intro || (block.data as HenteleikData)?.intro || 'Finn fram det de trur laget treng!',
            items: items.length > 0 ? items : currentItems,
            durationMinutes: 7,
          });
        } else if (block.type === 'reis_deg') {
          const currentStmts = (block.data as ReisDegData)?.statements || [];
          const statements = Array.isArray(b.statements) && b.statements.length > 0
            ? b.statements.map((st: any, idx: number) => ({
                id: st.id || `rd_${Date.now()}_${idx + 1}`,
                statement: (typeof st === 'object' && st ? st.statement || st.text : String(st)).trim(),
              }))
            : currentStmts;
          onUpdateBlockData({
            ...block.data,
            title: b.title || 'Reis deg',
            intro: b.intro || (block.data as ReisDegData).intro,
            statements: statements.length > 0 ? statements : currentStmts,
            durationMinutes: 4,
          });
        } else if (block.type === 'beat_for_beat') {
          const sol = b.solution || b.title || effectivePrompt;
          const words = Array.isArray(b.words) && b.words.length > 0 ? b.words : sol.split(/\s+/).filter(Boolean);
          onUpdateBlockData({
            ...block.data,
            title: 'Beat for beat',
            solution: sol,
            category: b.category || 'Song / Salme',
            words,
            durationMinutes: 7,
          });
        } else if (block.type === 'ord_for_ord') {
          const q = b.quote || b.verseText || effectivePrompt;
          const words = Array.isArray(b.words) && b.words.length > 0 ? b.words : q.split(/\s+/).filter(Boolean);
          onUpdateBlockData({
            ...block.data,
            title: 'Ord for ord',
            quote: q,
            reference: b.reference || b.scriptureRef || '',
            hint: b.hint || '',
            words,
            durationMinutes: 6,
          });
        } else if (block.type === 'kven_skal_ut') {
          const items = Array.isArray(b.items) && b.items.length > 0
            ? b.items
            : [
                {
                  id: `ksu_${Date.now()}_1`,
                  options: {
                    A: b.optionA || 'Alternativ A',
                    B: b.optionB || 'Alternativ B',
                    C: b.optionC || 'Alternativ C',
                    D: b.optionD || 'Alternativ D',
                  },
                  correctOption: b.correctOption || 'D',
                  explanation: b.explanation || '',
                },
              ];
          const first = items[0];
          onUpdateBlockData({
            ...block.data,
            title: b.title || 'Kven skal ut?',
            items,
            currentIndex: 0,
            optionA: first.options?.A || b.optionA || 'Alternativ A',
            optionB: first.options?.B || b.optionB || 'Alternativ B',
            optionC: first.options?.C || b.optionC || 'Alternativ C',
            optionD: first.options?.D || b.optionD || 'Alternativ D',
            correctOption: first.correctOption || b.correctOption || 'D',
            explanation: first.explanation || b.explanation || '',
            durationMinutes: 5,
          });
        } else if (block.type === 'sang_salme') {
          const verses = Array.isArray(b.verses) && b.verses.length > 0 ? b.verses : [b.text || effectivePrompt];
          onUpdateBlockData({
            ...block.data,
            title: b.title || `Salme: ${effectivePrompt}`,
            songNumber: b.songNumber || '',
            verses,
            durationMinutes: 4,
          });
        } else if (block.type === 'samtale') {
          const currentData = block.data as SamtaleData;
          const qs = Array.isArray(b.reflectionQuestions) && b.reflectionQuestions.length > 0
            ? b.reflectionQuestions.filter(Boolean)
            : (currentData?.reflectionQuestions?.length ? currentData.reflectionQuestions : ['Kva tenkjer du om dette?']);
          onUpdateBlockData({
            ...block.data,
            topic: b.topic || b.title || currentData?.topic || effectivePrompt,
            organization: b.organization || currentData?.organization || 'To-og-to',
            reflectionQuestions: qs,
            summaryPoint: b.summaryPoint !== undefined ? b.summaryPoint : (currentData?.summaryPoint || ''),
            durationMinutes: 8,
          });
        } else if (block.type === 'informasjon') {
          const currentData = block.data as InformasjonData;
          const pts = Array.isArray(b.practicalPoints) && b.practicalPoints.length > 0
            ? b.practicalPoints
            : (currentData?.practicalPoints?.length ? currentData.practicalPoints : ['Oppmøte i peisestova']);
          onUpdateBlockData({
            ...block.data,
            heading: b.heading || b.title || currentData?.heading || effectivePrompt,
            practicalPoints: pts,
            noticeBox: b.noticeBox !== undefined ? b.noticeBox : (currentData?.noticeBox || ''),
            durationMinutes: 4,
          });
        } else {
          // Generisk samanslåing
          onUpdateBlockData(
            {
              ...block.data,
              ...b,
            },
            b.leaderNotes || ''
          );
        }

        setLocalAiSuccess(true);
        if (!block.isExpanded) onToggleExpand();
        setTimeout(() => {
          setIsLocalAiOpen(false);
          setLocalAiSuccess(false);
        }, 2500);
      }
    } catch (err: any) {
      console.warn('Lokal AI feil:', err);
      const isTimeout = err?.name === 'TimeoutError' || err?.message?.toLowerCase().includes('timeout') || err?.message?.toLowerCase().includes('aborted');
      setLocalAiError(
        isTimeout
          ? 'Tidsavbrot: Det tok for lang tid (over 20 sekund) å hente svar. Prøv igjen med eit enklare stikkord.'
          : err?.message || 'Noko gjekk gale under generering. Prøv igjen.'
      );
    } finally {
      setIsLocalAiLoading(false);
    }
  };

  const renderLocalAiHelper = () => {
    const config = getLocalAiConfig();
    return (
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-amber-50/30 border border-amber-200/80 rounded-xl p-3 my-2 space-y-2 shadow-2xs select-none"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-800 truncate">
              {config.title}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLocalAiOpen(false);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
            title="Lukk"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={localAiPrompt}
            onChange={(e) => setLocalAiPrompt(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && !isLocalAiLoading) {
                handleLocalAiGenerate();
              }
            }}
            placeholder={config.defaultPrompt ? `${config.placeholder}` : config.placeholder}
            disabled={isLocalAiLoading}
            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 text-xs focus:outline-none focus:border-amber-300 shadow-2xs"
          />

          <button
            type="button"
            onClick={handleLocalAiGenerate}
            disabled={isLocalAiLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isLocalAiLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Genererer...</span>
              </>
            ) : localAiSuccess ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-white" />
                <span>Oppdatert!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>{config.buttonText}</span>
              </>
            )}
          </button>
        </div>

        {localAiError && (
          <div className="flex items-center gap-1.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{localAiError}</span>
          </div>
        )}

        {localAiSuccess && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Blokka er oppdatert med nytt innhald!</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      onClick={onSelectForPreview}
      onFocusCapture={onSelectForPreview}
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) {
          e.preventDefault();
          return;
        }
        onDragStart(e);
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={() => {
        setCanDrag(false);
        onDragEnd();
      }}
      className={`group relative border rounded-xl bg-white transition-shadow duration-150 p-5 space-y-4 ${
        block.isExpanded ? 'shadow-sm ring-1 ring-zinc-200/50 ' : 'shadow-xs hover:shadow-sm '
      }${
        isSelectedForPreview
          ? 'border-blue-500 ring-2 ring-blue-500/35 shadow-sm border-l-4 border-l-blue-600'
          : isDragTarget
          ? 'border-zinc-400 shadow-sm'
          : 'border-zinc-200 hover:border-zinc-300'
      }`}
    >
      {/* STANDARDISERT HEADER PÅ KVART KORT */}
      <div 
        onClick={onSelectForPreview}
        className="flex items-center justify-between gap-3 cursor-pointer select-none"
      >
        {/* Venstre side: Drag, Nummer, Ikon, Type-tag, og Tittel */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            onMouseDown={(e) => { e.stopPropagation(); setCanDrag(true); }}
            onMouseUp={() => setCanDrag(false)}
            onMouseLeave={() => setCanDrag(false)}
            onPointerDown={(e) => { e.stopPropagation(); setCanDrag(true); }}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-300 hover:text-slate-600 transition-colors shrink-0"
            title="Dra for å endre rekkjefølgje"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>

          <div
            className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-600"
            title={meta.label}
          >
            {renderIcon('w-4 h-4 text-slate-600')}
          </div>

          <div className="min-w-0 flex-1 flex items-center gap-2">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
              {meta.label}
            </span>
            <span className="text-base font-bold text-slate-900 truncate leading-tight tracking-tight">
              {getBlockTitle()}
            </span>

            {block.hiddenOnScreen && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                <EyeOff className="w-3 h-3 text-slate-400" />
                <span>Skjult på storskjerm</span>
              </span>
            )}

            {isSelectedForPreview && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                <span>Vald startblokk</span>
              </span>
            )}
          </div>
        </div>

        {/* Høgre side: Tidsbruk, Slette-/flytteknappar, Utvid-chevron */}
        <div className="flex items-center gap-1 shrink-0">
          {block.type === 'svart_skjerm' ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-slate-200 text-xs font-medium border border-slate-700 shadow-2xs"
              title="Svart skjerm / Pause (0 minutt – trekkjer ikkje frå tidsbudsjettet)"
            >
              <MonitorOff className="w-3.5 h-3.5 text-slate-400" />
              <span>{getDuration() > 0 ? `${getDuration()}m` : 'Pause'}</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium"
              title="Tidsbruk"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{getDuration()}m</span>
            </div>
          )}

          {block.type !== 'video' && block.type !== 'sang_salme' && block.type !== 'svart_skjerm' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleAiDrawer?.(block.id);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors border shadow-2xs ${
                isAiDrawerOpen
                  ? 'bg-amber-100/90 text-amber-900 border-amber-300 ring-2 ring-amber-400/30 font-semibold'
                  : 'bg-white hover:bg-amber-50/60 text-slate-700 hover:text-amber-900 border-slate-200 hover:border-amber-300'
              }`}
              title="Få AI-hjelp i sidepanelet til å justere og forbetre denne blokka"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline">AI-hjelp</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleHiddenOnScreen?.();
            }}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              block.hiddenOnScreen
                ? 'bg-slate-200 text-slate-700'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title={block.hiddenOnScreen ? 'Gjer synleg på storskjerm' : 'Skjul på storskjerm'}
          >
            {block.hiddenOnScreen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          <button
            type="button"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
            title="Flytt opp"
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={index === totalBlocks - 1}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
            title="Flytt ned"
          >
            <ArrowDown className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateBlock();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
            title="Dupliser blokk"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteBlock();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
            title="Slett blokk"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectForPreview();
              onToggleExpand();
            }}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              block.isExpanded
                ? 'bg-slate-100 text-slate-700'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title={block.isExpanded ? 'Lukk blokk' : 'Opne blokk'}
          >
            {block.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* UTFELT REDIGERINGSOMRÅDE */}
      {block.isExpanded && (
        <div className="pt-2 border-t border-slate-100 space-y-4">
          {renderContentFields()}

          {/* MANUS: ALLTID PLASSERT NEDST I BLOKKA I EIN LYS GRÅ RAMME MED NOTAT-IKON */}
          <div className="mt-4 p-3.5 rounded-lg bg-zinc-50/70 border border-zinc-200 space-y-1.5">
            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Manus (notat til leiarvisning)</span>
            </label>
            <textarea
              rows={2}
              value={block.leaderNotes || ''}
              onChange={(e) => onUpdateBlockLeaderNotes?.(e.target.value)}
              placeholder="Skriv manus eller notat her..."
              className="w-full p-2.5 rounded-lg border border-zinc-200 focus:border-zinc-400 focus:outline-none bg-white text-slate-800 text-xs placeholder:text-zinc-400 font-sans transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
};
