/**
 * src/components/builder/WorkDesk.tsx
 * Hovudflate («Arbeidsbordet»)
 * 
 * - Vertikal liste med dei valde blokkene i samlinga.
 * - Kvar blokk viser nummer, blokktype, tittel, tidsbruk og eit drag-handtak.
 * - Kvar blokk kan opnast (foldast ut) eller lukkast.
 * - Øvst visast samla estimert tidsbruk (t.d. «Total tid: 60 min • 7 blokker») og tidsfordeling.
 * - Støttar drag-and-drop både frå venstremenyen og for intern omrokkering.
 * - Integrert med AiStoryboardStudio når isAiStudioActive er sann.
 */

import React, { useState } from 'react';
import { TeachingBlock, TeachingSession, BlockType, AiStoryboard, StoryboardBriefing } from '../../types';
import { BLOCK_METADATA, getBlockMetadata } from '../../lib/undervisningDefaults';
import { BlockItem } from './BlockItem';
import { AiStoryboardStudio } from './AiStoryboardStudio';
import { 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  Calendar,
  CheckCircle2,
  MoveVertical,
  BookOpen,
  Film,
  Undo2
} from 'lucide-react';

interface WorkDeskProps {
  session: TeachingSession;
  selectedBlockId: string | null;
  activeAiBlockId?: string | null;
  onSelectBlock: (id: string) => void;
  onToggleAiDrawer?: (id: string) => void;
  onUpdateSessionTitle: (title: string) => void;
  onUpdateSessionSubtitle: (subtitle: string) => void;
  onUpdateBlocks: (blocks: TeachingBlock[]) => void;
  onAddBlockFromType: (type: BlockType, targetIndex?: number, count?: number) => void;
  onOpenGeminiModal?: () => void;
  onOpenLeaderManuscript?: () => void;
  // Storyboard studio props:
  isAiStudioActive?: boolean;
  isEditingBriefing?: boolean;
  storyboard?: AiStoryboard | null;
  briefingData?: StoryboardBriefing | null;
  isGeneratingStoryboard?: boolean;
  isBuildingBlocks?: boolean;
  onGenerateStoryboard?: (data: StoryboardBriefing) => void;
  onUpdateStoryboard?: (updated: AiStoryboard) => void;
  onApproveStoryboard?: () => void;
  onCancelAiStudio?: () => void;
  onDiscardStoryboard?: () => void;
  onReturnToStoryboard?: () => void;
  onEditBriefingChange?: (isEditing: boolean) => void;
  language?: 'nn' | 'nb';
  onLanguageChange?: (lang: 'nn' | 'nb') => void;
}

export const WorkDesk: React.FC<WorkDeskProps> = ({
  session,
  selectedBlockId,
  activeAiBlockId,
  onSelectBlock,
  onToggleAiDrawer,
  onUpdateSessionTitle,
  onUpdateSessionSubtitle,
  onUpdateBlocks,
  onAddBlockFromType,
  onOpenGeminiModal,
  onOpenLeaderManuscript,
  isAiStudioActive = false,
  isEditingBriefing = false,
  storyboard = null,
  briefingData = null,
  isGeneratingStoryboard = false,
  isBuildingBlocks = false,
  onGenerateStoryboard,
  onUpdateStoryboard,
  onApproveStoryboard,
  onCancelAiStudio,
  onDiscardStoryboard,
  onReturnToStoryboard,
  onEditBriefingChange,
  language = 'nn',
  onLanguageChange,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const [isLibraryDragOver, setIsLibraryDragOver] = useState(false);

  // Dersom "Skap alt med AI" studio er aktivt, vis AiStoryboardStudio direkte på arbeidsbordet!
  if (isAiStudioActive) {
    return (
      <main className="flex-1 min-w-0 flex flex-col h-full min-h-full overflow-y-auto bg-zinc-100/80 p-3 sm:p-5 md:p-6 lg:p-8 transition-all select-none">
        <AiStoryboardStudio
          storyboard={storyboard}
          initialBriefing={briefingData || session.briefingData}
          language={language}
          onLanguageChange={onLanguageChange}
          isEditingBriefing={isEditingBriefing}
          isGenerating={Boolean(isGeneratingStoryboard)}
          isBuildingBlocks={Boolean(isBuildingBlocks)}
          onGenerate={onGenerateStoryboard || (() => {})}
          onUpdateStoryboard={onUpdateStoryboard}
          onApproveAndBuild={onApproveStoryboard || (() => {})}
          onCancel={onCancelAiStudio || (() => {})}
          onDiscardStoryboard={onDiscardStoryboard}
          onEditBriefingChange={onEditBriefingChange}
        />
      </main>
    );
  }

  // Rekn ut total tidsbruk (svarte skjermar med 0 min reknast som 0 og påverkar ikkje totalrekneskapen)
  const totalMinutes = session.blocks.reduce((acc, b) => {
    const mins = b.data?.durationMinutes ?? (b.type === 'svart_skjerm' ? 0 : (BLOCK_METADATA[b.type]?.defaultMinutes ?? 5));
    return acc + (isNaN(mins) ? 0 : mins);
  }, 0);

  // Toggle utvid/kollaps for éin blokk
  const handleToggleExpand = (id: string) => {
    onSelectBlock(id);
    const updated = session.blocks.map((b) =>
      b.id === id ? { ...b, isExpanded: !b.isExpanded } : b
    );
    onUpdateBlocks(updated);
  };

  // Opne alle blokker
  const handleExpandAll = () => {
    const updated = session.blocks.map((b) => ({ ...b, isExpanded: true }));
    onUpdateBlocks(updated);
  };

  // Lukk alle blokker
  const handleCollapseAll = () => {
    const updated = session.blocks.map((b) => ({ ...b, isExpanded: false }));
    onUpdateBlocks(updated);
  };

  // Oppdater data for éin blokk (støttar atomisk oppdatering av leiar-notat)
  const handleUpdateBlockData = (id: string, updatedData: any, newLeaderNotes?: string) => {
    const updated = session.blocks.map((b) =>
      b.id === id ? { 
        ...b, 
        data: updatedData, 
        ...(typeof newLeaderNotes === 'string' ? { leaderNotes: newLeaderNotes } : {}) 
      } : b
    );
    onUpdateBlocks(updated);
  };

  // Oppdater leiar-notat for éin blokk
  const handleUpdateBlockLeaderNotes = (id: string, leaderNotes: string) => {
    const updated = session.blocks.map((b) =>
      b.id === id ? { ...b, leaderNotes } : b
    );
    onUpdateBlocks(updated);
  };

  // Veksle om blokk er skjult for publikum på storskjerm
  const handleToggleHiddenOnScreen = (id: string) => {
    const updated = session.blocks.map((b) =>
      b.id === id ? { ...b, hiddenOnScreen: !b.hiddenOnScreen } : b
    );
    onUpdateBlocks(updated);
  };

  // Slett blokk
  const handleDeleteBlock = (id: string) => {
    const updated = session.blocks.filter((b) => b.id !== id);
    onUpdateBlocks(updated);
    if (selectedBlockId === id) {
      onSelectBlock(updated[0]?.id || '');
    }
  };

  // Dupliser blokk
  const handleDuplicateBlock = (index: number) => {
    const target = session.blocks[index];
    if (!target) return;
    const clone: TeachingBlock = {
      ...target,
      id: `block_${target.type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      data: JSON.parse(JSON.stringify(target.data)),
      isExpanded: true,
    };
    const next = [...session.blocks];
    next.splice(index + 1, 0, clone);
    onUpdateBlocks(next);
    onSelectBlock(clone.id);
  };

  // Flytt opp/ned
  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= session.blocks.length) return;
    const next = [...session.blocks];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onUpdateBlocks(next);
  };

  // Drag and drop handtering for omrokkering og innsetting
  const handleInternalDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleBlockDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const targetIdx = e.clientY < midY ? index : index + 1;
    setInsertionIndex(targetIdx);
  };

  const handleDropAtInsertionIndex = (targetIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLibraryDragOver(false);

    const libraryBlockType = e.dataTransfer.getData('application/x-teaching-block-type') as BlockType;
    const quizCountStr = e.dataTransfer.getData('application/x-quiz-count');
    const quizCount = quizCountStr ? parseInt(quizCountStr, 10) : undefined;
    if (libraryBlockType) {
      onAddBlockFromType(libraryBlockType, targetIdx, quizCount);
      setInsertionIndex(null);
      setDraggedIndex(null);
      return;
    }

    if (draggedIndex !== null) {
      if (draggedIndex === targetIdx || draggedIndex === targetIdx - 1) {
        setInsertionIndex(null);
        setDraggedIndex(null);
        return;
      }
      const next = [...session.blocks];
      const [moved] = next.splice(draggedIndex, 1);
      const adjustIdx = draggedIndex < targetIdx ? targetIdx - 1 : targetIdx;
      next.splice(adjustIdx, 0, moved);
      onUpdateBlocks(next);
    }

    setInsertionIndex(null);
    setDraggedIndex(null);
  };

  const handleInternalDragEnd = () => {
    setDraggedIndex(null);
    setInsertionIndex(null);
    setIsLibraryDragOver(false);
  };

  // Generisk dropzone for heile lista
  const handleDeskDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsLibraryDragOver(true);
  };

  const handleDeskDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLibraryDragOver(false);
    const libraryBlockType = e.dataTransfer.getData('application/x-teaching-block-type') as BlockType;
    const quizCountStr = e.dataTransfer.getData('application/x-quiz-count');
    const quizCount = quizCountStr ? parseInt(quizCountStr, 10) : undefined;
    if (libraryBlockType) {
      const dropPos = insertionIndex !== null ? insertionIndex : session.blocks.length;
      onAddBlockFromType(libraryBlockType, dropPos, quizCount);
    }
    setInsertionIndex(null);
  };

  const handleDeskDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsLibraryDragOver(false);
      setInsertionIndex(null);
    }
  };

  return (
    <main
      onDragOver={handleDeskDragOver}
      onDrop={handleDeskDrop}
      onDragLeave={handleDeskDragLeave}
      className={`flex-1 min-w-0 flex flex-col h-full min-h-full overflow-y-auto bg-zinc-100/80 p-3 sm:p-5 md:p-6 lg:p-8 transition-all select-none ${
        isLibraryDragOver ? 'ring-2 ring-inset ring-zinc-300' : ''
      }`}
    >
      {/* ========================================================================= */}
      {/* ARBEIDSBORDET: LYST GRÅTT BORD MED FYSISKE KVITE BYGGJEKLOSSAR OPPÅ        */}
      {/* ========================================================================= */}
      <div className="max-w-4xl w-full mx-auto min-h-full flex flex-col space-y-5">
        {/* Toppen av arbeidsbordet */}
        <div className="space-y-4 pb-4 border-b border-zinc-200/80">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            {/* Samlingstittel: Rent, minimalistisk skrivefelt utan ramme */}
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={session.title}
                onChange={(e) => onUpdateSessionTitle(e.target.value)}
                placeholder="Namn på samlinga..."
                className="text-2xl font-bold text-slate-900 bg-transparent border-0 border-b border-transparent hover:border-zinc-300 focus:border-zinc-400 focus:outline-none focus:ring-0 p-0 w-full placeholder:text-zinc-400 transition-colors tracking-tight"
              />
              <input
                type="text"
                value={session.subtitle || ''}
                onChange={(e) => onUpdateSessionSubtitle(e.target.value)}
                placeholder="Undertittel eller målgruppe (t.d. «Konfirmantar • 60 minutt»)..."
                className="text-sm text-slate-600 bg-transparent border-0 border-b border-transparent hover:border-zinc-300 focus:border-zinc-400 focus:outline-none focus:ring-0 p-0 w-full placeholder:text-zinc-400 mt-1 transition-colors"
              />
            </div>

            {/* Tidsestimat-merket: Enkel kvit/grå pille */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-slate-700 text-xs font-medium border border-zinc-200 shadow-2xs shrink-0 self-start">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Total tid: {totalMinutes} min • {session.blocks.length} {session.blocks.length === 1 ? 'blokk' : 'blokker'}</span>
            </div>
          </div>

          {/* Tidslinje for samlinga */}
          {totalMinutes > 0 && session.blocks.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-zinc-200/80">
                {session.blocks.map((b, i) => {
                  const meta = getBlockMetadata(b.type, language);
                  const mins = b.data?.durationMinutes ?? (b.type === 'svart_skjerm' ? 0 : (meta?.defaultMinutes ?? 5));
                  if (mins <= 0) return null;
                  const widthPercent = (mins / totalMinutes) * 100;
                  return (
                    <div
                      key={`${b.id}_${i}`}
                      style={{ width: `${widthPercent}%` }}
                      className="bg-zinc-400 hover:bg-zinc-500 h-full transition-all duration-300 border-r border-white/60"
                      title={`${meta?.label || b.type}: ${mins} min (${Math.round(widthPercent)}%)`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Aksjonsknappar: Opne alle, Lukk alle, Gå tilbake til Storyboard, Tøm */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExpandAll}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer transition-colors"
                title="Fold ut alle blokker for detaljredigering"
              >
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                <span>Opne alle</span>
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer transition-colors"
                title="Lukk alle blokker for å få full oversikt over flyten"
              >
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                <span>Lukk alle</span>
              </button>

              {storyboard && onReturnToStoryboard && (
                <button
                  type="button"
                  onClick={onReturnToStoryboard}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 font-semibold cursor-pointer transition-colors shadow-2xs"
                  title="Gå tilbake eit steg til det ferdige Storyboardet og regimanuset"
                >
                  <Undo2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Gå tilbake til Storyboard</span>
                </button>
              )}
            </div>

            {session.blocks.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Er du sikker på at du vil tømme arbeidsbordet?')) {
                    onUpdateBlocks([]);
                  }
                }}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                title="Tøm heile arbeidsbordet"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Tøm bordet</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VERTIKAL BLOKK-LISTE INNI ARBEIDSBORDET                                  */}
        {/* ========================================================================= */}
        <div className="space-y-4 flex-1">
          {session.blocks.length === 0 ? (
            /* Tom tilstand: Ein stor stipla boks */
            <div className="border-2 border-dashed border-zinc-300 rounded-2xl p-12 text-center bg-white/80 flex flex-col items-center justify-center space-y-3 my-4 shadow-xs">
              <BookOpen className="w-10 h-10 text-slate-400 mb-1" />
              <h3 className="text-lg font-bold text-slate-800">
                Arbeidsbordet er tomt
              </h3>
              <p className="text-sm text-slate-500 max-w-md leading-relaxed">
                Dra inn ei blokk frå venstre, eller trykk «Skap alt med AI» for å generere eit visuelt storyboard.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenLeaderManuscript || onOpenGeminiModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Skap alt med AI</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {session.blocks.map((block, index) => (
                <React.Fragment key={block.id}>
                  {/* Animasjonsfelt dersom blokka skal settast inn FØR indeks 'index' */}
                  {insertionIndex === index && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={handleDropAtInsertionIndex(index)}
                      className="my-2 p-3 rounded-xl border border-dashed border-zinc-400 bg-white/80 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      <Plus className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Slepp her for å smette inn som ledd {index + 1}</span>
                    </div>
                  )}

                  <div
                    onClick={() => onSelectBlock(block.id)}
                    onDragOver={handleBlockDragOver(index)}
                    onDrop={handleDropAtInsertionIndex(insertionIndex !== null ? insertionIndex : index)}
                    className="transition-all duration-200"
                  >
                    <BlockItem
                      block={block}
                      index={index}
                      totalBlocks={session.blocks.length}
                      language={language}
                      isSelectedForPreview={selectedBlockId === block.id}
                      isAiDrawerOpen={activeAiBlockId === block.id}
                      onToggleAiDrawer={onToggleAiDrawer}
                      onSelectForPreview={() => onSelectBlock(block.id)}
                      onToggleExpand={() => handleToggleExpand(block.id)}
                      onUpdateBlockData={(updatedData, newLeaderNotes) => handleUpdateBlockData(block.id, updatedData, newLeaderNotes)}
                      onUpdateBlockLeaderNotes={(notes) => handleUpdateBlockLeaderNotes(block.id, notes)}
                      onDeleteBlock={() => handleDeleteBlock(block.id)}
                      onDuplicateBlock={() => handleDuplicateBlock(index)}
                      onMoveUp={() => handleMoveBlock(index, 'up')}
                      onMoveDown={() => handleMoveBlock(index, 'down')}
                      onToggleHiddenOnScreen={() => handleToggleHiddenOnScreen(block.id)}
                      onDragStart={handleInternalDragStart(index)}
                      onDragOver={handleBlockDragOver(index)}
                      onDrop={handleDropAtInsertionIndex(insertionIndex !== null ? insertionIndex : index)}
                      onDragEnd={handleInternalDragEnd}
                      isDragTarget={insertionIndex === index || insertionIndex === index + 1}
                    />
                  </div>
                </React.Fragment>
              ))}

              {/* Animasjonsfelt dersom blokka skal settast inn HEILT NEDST */}
              {insertionIndex === session.blocks.length && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={handleDropAtInsertionIndex(session.blocks.length)}
                  className="my-2 p-3 rounded-xl border border-dashed border-zinc-400 bg-white/80 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Slepp her for å smette inn som ledd {session.blocks.length + 1} (nedst)</span>
                </div>
              )}
            </>
          )}

          {/* Liten standard dropzone heilt nedst */}
          {session.blocks.length > 0 && insertionIndex !== session.blocks.length && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setInsertionIndex(session.blocks.length);
              }}
              onDrop={handleDropAtInsertionIndex(session.blocks.length)}
              className="p-3.5 border border-dashed border-zinc-300 hover:border-zinc-400 bg-white/50 hover:bg-white/80 rounded-xl flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-700 text-xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Slepp ny blokk her nedst</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
