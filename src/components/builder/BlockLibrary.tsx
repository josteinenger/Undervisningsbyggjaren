/**
 * src/components/builder/BlockLibrary.tsx
 * Venstremeny («Blokk-bibliotek»)
 * 
 * - Faste byggjesteinar (Stikkord, Tekst, Bibelord, Informasjon, Bøn, Samtale, Song/Salme)
 * - To utvidbare bankar (trekkspel / accordion):
 *   1. Aktivitetsbanken (Henteleiken, Kims leik, Reis deg, Bilete-avdekking)
 *   2. Konkurransebanken (Quiz, Bilete-avdekking, Beat for beat, Kven skal ut?)
 * - Reine Lucide-linjeikon, inga emojiar, lyst og enkelt designspråk.
 */

import React, { useState, useRef, useEffect } from 'react';
import { BlockType } from '../../types';
import { 
  BLOCK_METADATA, 
  getBlockMetadata,
  REGULAR_BLOCK_TYPES, 
  AKTIVITET_BLOCK_TYPES, 
  KONKURRANSE_BLOCK_TYPES 
} from '../../lib/undervisningDefaults';
import { 
  GraduationCap, 
  BookMarked, 
  Info, 
  HeartHandshake, 
  MessagesSquare, 
  Plus, 
  Layers, 
  HelpCircle, 
  Music,
  ListOrdered,
  FileText,
  PackageCheck,
  Brain,
  ArrowUpDown,
  LayoutGrid,
  Music2,
  Trophy,
  Activity,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Film,
  BookOpen,
  Video,
  MonitorOff,
  Tv,
  Target,
  Sparkles
} from 'lucide-react';

interface BlockLibraryProps {
  onAddBlock: (type: BlockType, count?: number) => void;
  language?: 'nn' | 'nb';
}

type BlockCategoryLabel = 'Byggjekloss' | 'Aktivitet' | 'Konkurranse';

interface HoveredBlockInfo {
  type: BlockType;
  category: BlockCategoryLabel;
  anchorTop: number;
  anchorRight: number;
}

export const BlockLibrary: React.FC<BlockLibraryProps> = ({
  onAddBlock,
  language = 'nn',
}) => {
  const isNb = language === 'nb';
  const [isAktivitetsbankOpen, setIsAktivitetsbankOpen] = useState<boolean>(false);
  const [isKonkurransebankOpen, setIsKonkurransebankOpen] = useState<boolean>(false);
  const [hoveredBlock, setHoveredBlock] = useState<HoveredBlockInfo | null>(null);

  const hoverTimerRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [clampedTop, setClampedTop] = useState<number>(20);

  const clearHoverTimer = () => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const closeHoverCard = () => {
    clearHoverTimer();
    setHoveredBlock(null);
  };

  useEffect(() => {
    return () => clearHoverTimer();
  }, []);

  // Juster vertikal posisjon så hover-kortet aldri går utfor botnen eller toppen av skjermen
  useEffect(() => {
    if (!hoveredBlock) return;
    const adjustPosition = () => {
      const cardHeight = tooltipRef.current?.offsetHeight || 300;
      const viewportHeight = window.innerHeight;
      const padding = 16;
      const desiredTop = hoveredBlock.anchorTop - 12;
      const maxTop = Math.max(padding, viewportHeight - cardHeight - padding);
      const nextTop = Math.min(Math.max(padding, desiredTop), maxTop);
      setClampedTop(nextTop);
    };
    adjustPosition();
    const rafId = window.requestAnimationFrame(adjustPosition);
    return () => window.cancelAnimationFrame(rafId);
  }, [hoveredBlock]);

  const handleCardMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    type: BlockType,
    category: BlockCategoryLabel
  ) => {
    if (isDraggingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    clearHoverTimer();
    hoverTimerRef.current = window.setTimeout(() => {
      if (isDraggingRef.current) return;
      setHoveredBlock({
        type,
        category,
        anchorTop: rect.top,
        anchorRight: rect.right,
      });
    }, 180);
  };

  const handleCardMouseLeave = () => {
    closeHoverCard();
  };

  const renderIcon = (type: BlockType, className: string = 'w-4 h-4') => {
    switch (type) {
      case 'stikkord':
        return <ListOrdered className={className} />;
      case 'tekst':
        return <FileText className={className} />;
      case 'bilete':
      case 'bilde':
        return <ImageIcon className={className} />;
      case 'lysbileteshow':
        return <Film className={className} />;
      case 'bildebibelen':
        return <BookOpen className={className} />;
      case 'video':
        return <Video className={className} />;
      case 'svart_skjerm':
        return <MonitorOff className={className} />;
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
        return <BookMarked className={className} />;
      case 'kven_skal_ut':
        return <HelpCircle className={className} />;
      case 'quiz':
        return <HelpCircle className={className} />;
      default:
        return <Layers className={className} />;
    }
  };

  const isDraggingRef = React.useRef(false);

  const handleDragStart = (e: React.DragEvent, type: BlockType) => {
    isDraggingRef.current = true;
    closeHoverCard();
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.setData('application/x-teaching-block-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 120);
  };

  const renderBlockCard = (type: BlockType, category: BlockCategoryLabel) => {
    const meta = getBlockMetadata(type, language);
    if (!meta) return null;

    return (
      <div
        key={`${category}_${type}`}
        draggable
        onDragStart={(e) => handleDragStart(e, type)}
        onDragEnd={handleDragEnd}
        onMouseEnter={(e) => handleCardMouseEnter(e, type, category)}
        onMouseLeave={handleCardMouseLeave}
        onClick={() => {
          if (isDraggingRef.current) return;
          closeHoverCard();
          onAddBlock(type);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            closeHoverCard();
            onAddBlock(type);
          }
        }}
        className="group relative p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs hover:shadow-xs transition-all cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
              {renderIcon(type, 'w-4 h-4 text-slate-600')}
            </div>

            <div className="min-w-0 flex flex-col">
              <span className="font-semibold text-sm text-slate-800 group-hover:text-slate-900 transition-colors truncate">
                {meta.label}
              </span>
              <span className="text-xs text-slate-500 truncate">
                {meta.shortDesc}
              </span>
            </div>
          </div>

          <div className="shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors">
            <Plus className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  };

  const hoveredMeta = hoveredBlock ? getBlockMetadata(hoveredBlock.type, language) : null;

  return (
    <aside className="w-64 sm:w-72 shrink-0 bg-white border-r border-zinc-200 flex flex-col h-full overflow-hidden select-none relative">
      {/* Header */}
      <div className="p-3.5 border-b border-zinc-200 bg-white">
        <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
          {isNb ? 'BYGGEKLOSSER' : 'BYGGJEKLOSSAR'}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {isNb ? 'Klikk eller dra til arbeidsbordet' : 'Klikk eller dra til arbeidsbordet'}
        </p>
      </div>

      {/* Rullande innhald med 3 seksjonar */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-4"
        onScroll={closeHoverCard}
      >
        {/* 1. Faste byggjeklossar */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>{isNb ? 'Faste byggeklosser' : 'Faste byggjeklossar'}</span>
            <span className="text-[10px] text-slate-400 font-normal">{REGULAR_BLOCK_TYPES.length} blokker</span>
          </div>
          <div className="space-y-1.5">
            {REGULAR_BLOCK_TYPES.map((type) => renderBlockCard(type, 'Byggjekloss'))}
          </div>
        </section>

        {/* 2. Aktivitetsbanken (accordion) */}
        <section className="pt-2 border-t border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              closeHoverCard();
              setIsAktivitetsbankOpen(!isAktivitetsbankOpen);
            }}
            className="w-full flex items-center justify-between bg-slate-200/80 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300/80 px-2.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Aktivitetsbanken</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-medium">
                {AKTIVITET_BLOCK_TYPES.length} {isNb ? 'leker' : 'leikar'}
              </span>
              {isAktivitetsbankOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
              )}
            </div>
          </button>
          {isAktivitetsbankOpen && (
            <div className="bg-slate-100/70 p-1.5 rounded-xl border border-slate-200 space-y-1.5 mt-1.5">
              {AKTIVITET_BLOCK_TYPES.map((type) => renderBlockCard(type, 'Aktivitet'))}
            </div>
          )}
        </section>

        {/* 3. Konkurransebanken (accordion) */}
        <section className="pt-2 border-t border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              closeHoverCard();
              setIsKonkurransebankOpen(!isKonkurransebankOpen);
            }}
            className="w-full flex items-center justify-between bg-slate-200/80 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300/80 px-2.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Konkurransebanken</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-medium">
                {KONKURRANSE_BLOCK_TYPES.length} {isNb ? 'konkurranser' : 'konkurransar'}
              </span>
              {isKonkurransebankOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
              )}
            </div>
          </button>
          {isKonkurransebankOpen && (
            <div className="bg-slate-100/70 p-1.5 rounded-xl border border-slate-200 space-y-1.5 mt-1.5">
              {KONKURRANSE_BLOCK_TYPES.map((type) => renderBlockCard(type, 'Konkurranse'))}
            </div>
          )}
        </section>
      </div>

      {/* HOVER-HJELPEKORT FOR BYGGJEKLOSSAR OG LEIKAR */}
      {hoveredBlock && hoveredMeta && (
        <div
          ref={tooltipRef}
          style={{
            top: `${clampedTop}px`,
            left: `${hoveredBlock.anchorRight + 12}px`,
          }}
          className="fixed z-50 w-80 sm:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-4 text-left pointer-events-none animate-in fade-in duration-150"
        >
          {/* Topplinje: Ikon, klossnamn og kategori-chip */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0 text-slate-700">
                {renderIcon(hoveredBlock.type, 'w-4 h-4 text-slate-700')}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-slate-900 truncate">
                  {hoveredMeta.label}
                </h4>
                <p className="text-[11px] text-slate-500 truncate">
                  Standardtid: {hoveredMeta.defaultMinutes} min
                </p>
              </div>
            </div>

            <span
              className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                hoveredBlock.category === 'Aktivitet'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : hoveredBlock.category === 'Konkurranse'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {hoveredBlock.category === 'Byggjekloss' && isNb ? 'Byggekloss' : hoveredBlock.category}
            </span>
          </div>

          <div className="mt-3 space-y-3">
            {/* Formål */}
            {hoveredMeta.purpose && (
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  <Target className="w-3 h-3 text-slate-400" />
                  <span>Formål</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {hoveredMeta.purpose}
                </p>
              </div>
            )}

            {/* Spelereglar (kun når rules finst) */}
            {hoveredMeta.rules && hoveredMeta.rules.length > 0 && (
              <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{isNb ? 'Spilleregler i rommet' : 'Spelereglar i rommet'}</span>
                </div>
                <ol className="space-y-1.5">
                  {hoveredMeta.rules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-snug">
                      <span className="w-4 h-4 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Storskjerm */}
            {hoveredMeta.screenDisplay && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  <Tv className="w-3 h-3 text-slate-400" />
                  <span>Storskjerm</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {hoveredMeta.screenDisplay}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
