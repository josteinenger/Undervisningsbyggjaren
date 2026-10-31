/**
 * src/components/builder/AiStoryboardStudio.tsx
 * Regi-studio for "Skap alt med AI" (Storyboard & Leiarhefte)
 * 
 * Visast direkte på arbeidsbordet når isAiStudioActive er sann.
 * Phase A: Briefing & Oppstart (Tema med "Få idéar" AI-hjelp, målgruppe, tidsramme, målform, fil-opplasting, råtekst)
 * Phase B: Visuelt Storyboard & Leiarhefte (Raud tråd, 2-kolonne regimanus med målretta AI-justering per kloss, og Single Source of Approval nedst)
 */

import React, { useState, useEffect } from 'react';
import { AiStoryboard, StoryboardBriefing } from '../../types';
import { BLOCK_METADATA, getBlockMetadata, normalizeBlockType } from '../../lib/undervisningDefaults';
import { 
  Sparkles, 
  Clock, 
  Users, 
  FileText, 
  Upload, 
  Trash2, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  X, 
  Monitor, 
  BookOpen, 
  Loader2, 
  Compass, 
  Send,
  Lightbulb
} from 'lucide-react';

interface ThemeIdea {
  title: string;
  angle: string;
  promptText: string;
}

interface AiStoryboardStudioProps {
  storyboard: AiStoryboard | null;
  initialBriefing?: StoryboardBriefing | null;
  language?: 'nn' | 'nb';
  onLanguageChange?: (lang: 'nn' | 'nb') => void;
  isEditingBriefing?: boolean;
  isGenerating: boolean;
  isBuildingBlocks?: boolean;
  onGenerate: (data: StoryboardBriefing) => void;
  onUpdateStoryboard?: (updated: AiStoryboard) => void;
  onApproveAndBuild: () => void;
  onCancel: () => void;
  onDiscardStoryboard?: () => void;
  onEditBriefingChange?: (isEditing: boolean) => void;
}

export const AiStoryboardStudio: React.FC<AiStoryboardStudioProps> = ({
  storyboard,
  initialBriefing,
  language: languageProp,
  onLanguageChange,
  isEditingBriefing: isEditingBriefingProp = false,
  isGenerating,
  isBuildingBlocks = false,
  onGenerate,
  onUpdateStoryboard,
  onApproveAndBuild,
  onCancel,
  onEditBriefingChange,
}) => {
  // Input-tilstander for Phase A (initialiserast frå global målform / lagra briefing viss tilgjengeleg)
  const [prompt, setPrompt] = useState(
    initialBriefing?.prompt || storyboard?.title || 'Den bortkomne sonen - om tilgiving, nåde og å høyre til'
  );
  const [targetGroup, setTargetGroup] = useState(
    initialBriefing?.targetGroup || storyboard?.targetGroup || 'Konfirmantar (14–15 år)'
  );
  const [targetDuration, setTargetDuration] = useState(
    initialBriefing?.targetDuration || storyboard?.targetDurationMinutes || 45
  );
  const [language, setLanguage] = useState<'nn' | 'nb'>(
    languageProp || initialBriefing?.language || storyboard?.language || 'nn'
  );
  const [pastedSourceText, setPastedSourceText] = useState(initialBriefing?.pastedSourceText || '');
  const [sourceDocuments, setSourceDocuments] = useState<
    Array<{ name: string; type: string; size?: number; base64Data?: string; textContent?: string }>
  >(initialBriefing?.sourceDocuments || []);
  const [fileUploadWarning, setFileUploadWarning] = useState<string | null>(null);
  const [isEditingBriefing, setIsEditingBriefing] = useState<boolean>(
    Boolean(isEditingBriefingProp || !storyboard)
  );

  // Synkroniser med global målform frå topplinja
  useEffect(() => {
    if (languageProp === 'nn' || languageProp === 'nb') {
      setLanguage(languageProp);
    }
  }, [languageProp]);

  // Synkroniser med prop frå App.tsx når brukaren trykkjer «Skap alt med AI» (Fase A) eller «Gå tilbake til Storyboard» (Fase B)
  useEffect(() => {
    setIsEditingBriefing(Boolean(isEditingBriefingProp || !storyboard));
  }, [isEditingBriefingProp, storyboard]);

  // Tilstander for "Få idéar"-popover i temafeltet
  const [isIdeaPopoverOpen, setIsIdeaPopoverOpen] = useState(false);
  const [ideaQuery, setIdeaQuery] = useState('');
  const [themeIdeas, setThemeIdeas] = useState<ThemeIdea[]>([]);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
  const [ideaError, setIdeaError] = useState<string | null>(null);

  // Tilstander for målretta "AI-justering" per storyboard-kloss (rad-nivå)
  const [activeAdjustIdx, setActiveAdjustIdx] = useState<number | null>(null);
  const [adjustPrompt, setAdjustPrompt] = useState('');
  const [adjustingIdx, setAdjustingIdx] = useState<number | null>(null);
  const [adjustNotice, setAdjustNotice] = useState<{ idx: number; text: string } | null>(null);

  // Hent idéar/vinklingar for temafeltet frå Gemini med vald målform (nb eller nn) og målgruppe
  const handleFetchThemeIdeas = async (
    customTopic?: string,
    langOverride?: 'nn' | 'nb',
    targetGroupOverride?: string
  ) => {
    const activeLang = langOverride || language;
    const activeTargetGroup = targetGroupOverride || targetGroup;
    const topicToExplore = (customTopic !== undefined ? customTopic : (ideaQuery || prompt)).trim();
    setIsLoadingIdeas(true);
    setIdeaError(null);
    try {
      const response = await fetch('/api/storyboard/theme-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicToExplore,
          targetGroup: activeTargetGroup,
          lang: activeLang,
          language: activeLang,
        }),
      });
      const res = await response.json();
      if (!response.ok || !res.success || !Array.isArray(res.ideas)) {
        throw new Error(res.message || 'Kunne ikkje hente idéar akkurat no.');
      }
      setThemeIdeas(res.ideas);
    } catch (err: any) {
      setIdeaError(err?.message || 'Kunne ikkje hente idéar.');
    } finally {
      setIsLoadingIdeas(false);
    }
  };

  const handleOpenIdeaPopover = () => {
    if (isIdeaPopoverOpen) {
      setIsIdeaPopoverOpen(false);
      return;
    }
    const initialTopic = prompt.trim();
    setIdeaQuery(initialTopic);
    setIsIdeaPopoverOpen(true);
    handleFetchThemeIdeas(initialTopic, language, targetGroup);
  };

  // Målretta justering av KUN éin enkelt storyboard-kloss i sanntid
  const handleAdjustSingleSection = async (sectionIdx: number, instructionText: string) => {
    if (!storyboard || !instructionText.trim() || adjustingIdx !== null) return;
    const targetSec = storyboard.sections[sectionIdx];
    if (!targetSec) return;

    setAdjustingIdx(sectionIdx);
    setAdjustNotice(null);
    const activeLang = storyboard.language || language || 'nn';

    try {
      const response = await fetch('/api/storyboard/adjust-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyboard,
          sectionIndex: sectionIdx,
          sectionId: targetSec.id,
          section: targetSec,
          instruction: instructionText.trim(),
          lang: activeLang,
          language: activeLang,
        }),
      });

      const res = await response.json();
      const updatedSecFromApi =
        res.updatedSection || res.updatedStoryboard?.sections?.[sectionIdx];

      if (!response.ok || !res.success || !updatedSecFromApi) {
        throw new Error(res.message || 'Kunne ikkje oppdatere klossen.');
      }

      // Oppdater KUN den aktuelle klossen (sectionIdx) og re-kalkuler tidslinja
      let runningMin = 0;
      const updatedSections = storyboard.sections.map((sec, idx) => {
        const baseSec = idx === sectionIdx ? { ...sec, ...updatedSecFromApi, id: sec.id } : sec;
        const normType = normalizeBlockType(baseSec.blockType);
        const isBlack = normType === 'svart_skjerm';
        const dur = isBlack
          ? (typeof baseSec.durationMinutes === 'number' && baseSec.durationMinutes > 0 ? baseSec.durationMinutes : 0)
          : (typeof baseSec.durationMinutes === 'number' && baseSec.durationMinutes > 0 ? baseSec.durationMinutes : 5);

        let timeRange = baseSec.timeRange;
        if (isBlack && dur === 0) {
          timeRange = 'Pause / Svart skjerm';
        } else {
          const startStr = String(runningMin).padStart(2, '0');
          runningMin += dur;
          const endStr = String(runningMin).padStart(2, '0');
          timeRange = `${startStr}–${endStr} min`;
        }

        return {
          ...baseSec,
          blockType: normType,
          durationMinutes: dur,
          timeRange,
        };
      });

      const nextStoryboard: AiStoryboard = {
        ...storyboard,
        targetDurationMinutes: runningMin,
        sections: updatedSections,
      };

      onUpdateStoryboard?.(nextStoryboard);
      setAdjustPrompt('');
      setActiveAdjustIdx(null);
      setAdjustNotice({
        idx: sectionIdx,
        text: res.replyMessage || (activeLang === 'nb' ? 'Klossen ble oppdatert!' : 'Klossen vart oppdatert!'),
      });
      setTimeout(() => {
        setAdjustNotice((prev) => (prev?.idx === sectionIdx ? null : prev));
      }, 4000);
    } catch (err: any) {
      console.error('[AiStoryboardStudio] Feil ved målretta justering:', err);
      setAdjustNotice({
        idx: sectionIdx,
        text: err?.message || 'Feil ved oppdatering av klossen.',
      });
    } finally {
      setAdjustingIdx(null);
    }
  };

  // Felles hjelpar for prosessering av opplasta eller sleppte filer
  const processUploadedFiles = (fileList: FileList | File[]) => {
    setFileUploadWarning(null);
    const MAX_SINGLE_BYTES = 8 * 1024 * 1024;
    const MAX_TOTAL_BYTES = 15 * 1024 * 1024;

    let runningTotalBytes = sourceDocuments.reduce((sum, doc) => {
      if (typeof doc.size === 'number') return sum + doc.size;
      if (doc.base64Data) return sum + Math.round((doc.base64Data.length * 3) / 4);
      if (doc.textContent) return sum + doc.textContent.length;
      return sum;
    }, 0);

    Array.from(fileList).forEach((file) => {
      const lowerName = file.name.toLowerCase().trim();
      const isWordFile =
        lowerName.endsWith('.docx') ||
        lowerName.endsWith('.doc') ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword';

      if (isWordFile) {
        setFileUploadWarning(
          'Word-filer (.docx) må anten lagrast som PDF før opplasting, eller så kan du kopiere og lime inn teksten direkte i feltet nedanfor.'
        );
        return;
      }

      if (file.size > MAX_SINGLE_BYTES || runningTotalBytes + file.size > MAX_TOTAL_BYTES) {
        setFileUploadWarning(
          `Fila «${file.name}» er for stor (${(file.size / 1024 / 1024).toFixed(1)} MB). Av omsyn til AI-overføring bør PDF-ar vere under 8 MB. Eit godt tips er å kopiere og lime inn teksten direkte i tekstfeltet nedanfor i staden.`
        );
        return;
      }

      runningTotalBytes += file.size;
      const reader = new FileReader();
      const isText = file.type.includes('text') || lowerName.endsWith('.txt');

      if (isText) {
        reader.onload = (ev) => {
          setSourceDocuments((prev) => [
            ...prev,
            { name: file.name, type: file.type || 'text/plain', size: file.size, textContent: ev.target?.result as string },
          ]);
        };
        reader.readAsText(file);
      } else {
        reader.onload = (ev) => {
          const res = ev.target?.result as string;
          const base64Data = res.split(',')[1] || res;
          setSourceDocuments((prev) => [
            ...prev,
            { name: file.name, type: file.type || 'application/pdf', size: file.size, base64Data },
          ]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // Handtering av fil-opplasting med storleikskontroll (maks 8 MB per fil, 15 MB totalt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processUploadedFiles(files);
    e.target.value = '';
  };

  const handleRemoveDoc = (index: number) => {
    setSourceDocuments((prev) => prev.filter((_, i) => i !== index));
    setFileUploadWarning(null);
  };

  const handleSubmitBriefing = (e: React.FormEvent) => {
    e.preventDefault();
    setIsIdeaPopoverOpen(false);
    onGenerate({
      prompt,
      targetGroup,
      targetDuration,
      language,
      sourceDocuments,
      pastedSourceText,
    });
  };

  // Phase A (Briefing) skal ALLTID visast ved ny bestilling (isEditingBriefing), når storyboard manglar, eller medan nytt storyboard vert generert
  const showPhaseA = !storyboard || isEditingBriefing || isEditingBriefingProp || isGenerating;

  if (showPhaseA) {
    return (
      <div className="w-full max-w-3xl lg:max-w-4xl mx-auto my-auto py-6 sm:py-10 px-2 sm:px-4">
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xl ring-1 ring-black/5 overflow-hidden transition-all">
          {/* Header */}
          <div className="bg-white border-b border-slate-200/80 px-6 py-6 sm:px-8 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Regi-studio • Skap alt med AI</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Skap alt med AI: Storyboard & Leiarhefte
              </h2>
              <p className="mt-1 text-sm text-slate-500 max-w-2xl leading-relaxed">
                Oppgi tema, bibeltekst eller last opp kjeldedokument. AI lagar først eit oversiktleg storyboard med raud tråd, tidsbudsjett og leiarmanus for storskjerm og leiar.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmitBriefing} className="p-6 sm:p-8 space-y-6">
            {/* 1. Hovedfokus / Emne + "Få idéar" AI-knapp */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Hovedtema, bibeltekst eller bodskap <span className="text-amber-600">*</span>
                </label>

                <button
                  type="button"
                  onClick={handleOpenIdeaPopover}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                    isIdeaPopoverOpen
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200/90'
                  }`}
                  title="Få konkrete, engasjerande vinklingar tilpassa målgruppa"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isIdeaPopoverOpen ? 'text-white' : 'text-amber-600'}`} />
                  <span>Få idéar</span>
                </button>
              </div>

              {/* Hurtigdialog / Popover for "Få idéar" */}
              {isIdeaPopoverOpen && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-md space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                      <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Kva tema eller bibeltekst vil du utforske?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsIdeaPopoverOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-amber-100/60 cursor-pointer"
                      title="Lukk"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ideaQuery}
                      onChange={(e) => setIdeaQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleFetchThemeIdeas(ideaQuery);
                        }
                      }}
                      placeholder="T.d. Den bortkomne sonen, Skapinga, Vennskap, Bøn..."
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-amber-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleFetchThemeIdeas(ideaQuery)}
                      disabled={isLoadingIdeas}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs"
                    >
                      {isLoadingIdeas ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Tenkjer...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Foreslå vinklingar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {ideaError && (
                    <p className="text-xs text-red-600 font-medium">{ideaError}</p>
                  )}

                  {isLoadingIdeas ? (
                    <div className="py-5 flex items-center justify-center gap-2 text-xs text-amber-900 font-medium">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                      <span>Utviklar engasjerande vinklingar for {targetGroup}...</span>
                    </div>
                  ) : themeIdeas.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {themeIdeas.map((idea, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-xl border border-amber-200/90 p-3 flex flex-col justify-between gap-2.5 shadow-2xs hover:border-amber-400 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 leading-snug">
                                {idea.title}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-semibold shrink-0">
                                {idea.angle}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {idea.promptText}
                            </p>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setPrompt(idea.promptText);
                                setIsIdeaPopoverOpen(false);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-200 hover:border-amber-500 text-[11px] font-semibold transition-all cursor-pointer"
                            >
                              Bruk dette
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}

              <textarea
                rows={3}
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="T.d. 'Den bortkomne sonen – om tilgiving, nåde og å høyre til' eller 'Bøn og stillhet i kvardagen'..."
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
              />
            </div>

            {/* 2. Målgruppe, Tidsramme og Målform */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Målgruppe</span>
                </label>
                <select
                  value={targetGroup}
                  onChange={(e) => {
                    const nextGroup = e.target.value;
                    setTargetGroup(nextGroup);
                    if (isIdeaPopoverOpen) {
                      handleFetchThemeIdeas(ideaQuery || prompt, language, nextGroup);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="Konfirmantar (14–15 år)">Konfirmantar (14–15 år)</option>
                  <option value="Ungdomskveld (13–19 år)">Ungdomskveld (13–19 år)</option>
                  <option value="Barnegruppe (8–12 år)">Barnegruppe (8–12 år)</option>
                  <option value="Leir / Trosopplæring">Leir / Trosopplæring</option>
                  <option value="Gudsteneste / Menighet">Gudsteneste / Menighet</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Målretta tidsramme (minutt)</span>
                </label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  step={5}
                  value={targetDuration}
                  onChange={(e) => setTargetDuration(parseInt(e.target.value, 10) || 45)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-slate-900 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                  <span>Målform</span>
                </label>
                <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('nn');
                      onLanguageChange?.('nn');
                      if (isIdeaPopoverOpen) {
                        handleFetchThemeIdeas(ideaQuery || prompt, 'nn', targetGroup);
                      }
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      language === 'nn'
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Nynorsk
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('nb');
                      onLanguageChange?.('nb');
                      if (isIdeaPopoverOpen) {
                        handleFetchThemeIdeas(ideaQuery || prompt, 'nb', targetGroup);
                      }
                    }}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      language === 'nb'
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bokmål
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Fil-opplasting (PDF, TXT) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Last opp leiarhefte eller kildedokument (valfritt)</span>
              </label>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    processUploadedFiles(e.dataTransfer.files);
                  }
                }}
                className="border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-xl p-4 text-center transition-colors bg-slate-50/50"
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  id="storyboard-file-input"
                  className="hidden"
                />
                <label
                  htmlFor="storyboard-file-input"
                  className="cursor-pointer flex flex-col items-center gap-1.5 text-xs text-slate-600 hover:text-amber-700 font-medium"
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span>Slepp eller vel PDF eller TXT kildefiler (maks 8 MB)</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Har du eit Word-dokument (.docx)? Kopier teksten og lim han direkte inn i tekstfeltet nedanfor.
                  </span>
                </label>
              </div>

              {fileUploadWarning && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium leading-relaxed">
                  {fileUploadWarning}
                </div>
              )}

              {sourceDocuments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {sourceDocuments.map((doc, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-medium"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                      <span className="truncate max-w-xs">{doc.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(idx)}
                        className="p-0.5 hover:bg-amber-200 rounded text-amber-700 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Lim inn råtekst */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Lim inn råtekst / manusutdrag (valfritt)
              </label>
              <textarea
                rows={2}
                value={pastedSourceText}
                onChange={(e) => setPastedSourceText(e.target.value)}
                placeholder="Lim inn teksten direkte her dersom du ikkje har dokumentfil..."
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              />
            </div>

            {/* Action Buttons: KUN to tydelege handlingar nedst */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditingBriefing(false);
                  onEditBriefingChange?.(false);
                  onCancel();
                }}
                className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Avbryt og gå tilbake
              </button>

              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Genererer storyboard og leiarhefte...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>Generer storyboard og leiarhefte →</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const isNb = (storyboard.language || language) === 'nb';

  // Phase B: Visuelt Storyboard & Regi-vising
  return (
    <div className="w-full max-w-5xl lg:max-w-6xl mx-auto py-4 sm:py-6 px-2 sm:px-4 space-y-6">
      {/* 1. TOP CARD SUMMARY (Raud tråd & Tidsramme + KUN "← Tilbake til bestilling") */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>{storyboard.targetGroup}</span>
                <span>•</span>
                <span>{storyboard.targetDurationMinutes} {isNb ? 'minutter totalt' : 'minutt totalt'}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-medium border border-emerald-200">
                {storyboard.sections.length} {isNb ? 'regibolk(er)' : 'regibolkar'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {storyboard.title}
            </h1>
          </div>

          {/* I toppen av storyboardet skal det berre vere éin sekundærknapp: «← Tilbake til bestilling» */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsEditingBriefing(true);
                onEditBriefingChange?.(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200/80"
              title="Gå tilbake til briefing-skjemaet for å justere tema, tidsramme eller kildedokument"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>← Tilbake til bestilling</span>
            </button>
          </div>
        </div>

        {/* Kjernebodskap boks */}
        <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <Compass className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block mb-0.5">
              {isNb ? 'KJERNEBUDSKAP:' : 'KJERNEBODSKAP:'}
            </span>
            <p className="text-sm text-slate-800 font-medium leading-relaxed">
              «{storyboard.redThread}»
            </p>
          </div>
        </div>
      </div>

      {/* 2. REGIMANUS & STORYBOARD TIMELINE (2-KOLONNE MED MÅLRETTA AI-JUSTERING PER KLOSS) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden">
        {/* Kolonne-overskrifter */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-6 py-3.5 grid grid-cols-1 md:grid-cols-12 gap-4 text-xs font-bold uppercase tracking-wider text-slate-700">
          <div className="md:col-span-5 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-amber-600" />
            <span>Tidslinje & Storskjerm</span>
          </div>
          <div className="md:col-span-7 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>{isNb ? 'Muntlig Lederhefte (Hva du sier og gjør)' : 'Munnleg Leiarhefte (Kva du seier og gjer)'}</span>
          </div>
        </div>

        {/* Bolkar */}
        <div className="divide-y divide-slate-200/80">
          {storyboard.sections.map((section, idx) => {
            const safeType = normalizeBlockType(section.blockType);
            const meta = getBlockMetadata(safeType, isNb ? 'nb' : 'nn');
            const isAdjustOpen = activeAdjustIdx === idx;
            const isAdjustingThis = adjustingIdx === idx;

            const quickOptions = isNb
              ? [
                  'Bytt til Kims lek',
                  'Gjør quizen mer krevende',
                  'Fokuser mer på tilgivelse',
                  'Gjør mer interaktiv / legg til lek',
                  'Gjør ledermanus enklere og mer muntlig',
                ]
              : [
                  'Byt til Kims leik',
                  'Gjer quizen meir krevjande',
                  'Fokuser meir på tilgiving',
                  'Gjer meir interaktiv / legg til leik',
                  'Gjer leiarmanus enklare og meir munnleg',
                ];

            return (
              <div
                key={section.id || idx}
                className={`p-5 sm:p-6 transition-all ${
                  isAdjustOpen
                    ? 'bg-amber-50/35 ring-2 ring-inset ring-amber-400'
                    : 'hover:bg-slate-50/50'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Venstre kolonne: Tidslinje, Blokktag, Juster med AI & Storskjerm */}
                  <div className="md:col-span-5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold shadow-2xs">
                          {safeType === 'svart_skjerm' && (section.durationMinutes === 0 || !section.durationMinutes)
                            ? 'Pause'
                            : section.timeRange}
                        </span>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${meta.badgeClass} flex items-center gap-1`}>
                          <span>{meta.label}</span>
                        </span>
                      </div>

                      {/* Diskret AI-knapp per bolk-rad: Juster med AI */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isAdjustOpen) {
                            setActiveAdjustIdx(null);
                          } else {
                            setActiveAdjustIdx(idx);
                            setAdjustPrompt('');
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isAdjustOpen
                            ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                            : 'bg-white hover:bg-amber-50 text-amber-800 border-amber-200/90 shadow-2xs'
                        }`}
                        title="Juster berre denne klossen med AI"
                      >
                        <Sparkles className={`w-3 h-3 ${isAdjustOpen ? 'text-white' : 'text-amber-500'}`} />
                        <span>Juster med AI</span>
                      </button>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {section.title}
                    </h3>

                    {/* Storskjerm summary card */}
                    <div className="bg-slate-900 text-slate-100 rounded-xl p-3 text-xs leading-relaxed border border-slate-800 shadow-2xs">
                      <div className="text-[10px] uppercase font-bold text-amber-400 mb-1 flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        <span>Storskjerm viser:</span>
                      </div>
                      <p className="text-slate-200 font-medium">
                        {section.bigScreenSummary}
                      </p>
                    </div>
                  </div>

                  {/* Høgre kolonne: Munnleg Leiarhefte */}
                  <div className="md:col-span-7 flex flex-col justify-center bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 sm:p-5">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-emerald-600" />
                      <span>{isNb ? 'Muntlig manus & lederveiledning:' : 'Munnleg manus & leiarrettleiing:'}</span>
                    </div>
                    <p className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                      {section.leaderScript}
                    </p>
                  </div>
                </div>

                {/* Kvitteringsmelding etter oppdatering av denne klossen */}
                {adjustNotice?.idx === idx && !isAdjustOpen && (
                  <div className="mt-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{adjustNotice.text}</span>
                  </div>
                )}

                {/* Målretta AI-justeringsmeny rett under klossen */}
                {isAdjustOpen && (
                  <div className="mt-4 pt-4 border-t border-amber-200/80 bg-white rounded-xl p-4 border shadow-sm space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>
                          {isNb
                            ? `Juster «${section.title}» med AI (oppdaterer kun denne klossen)`
                            : `Juster «${section.title}» med AI (oppdaterer berre denne klossen)`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveAdjustIdx(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="Lukk"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Hurtigval */}
                    <div className="flex flex-wrap gap-2">
                      {quickOptions.map((opt, qIdx) => (
                        <button
                          key={qIdx}
                          type="button"
                          disabled={isAdjustingThis}
                          onClick={() => handleAdjustSingleSection(idx, opt)}
                          className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {/* Skrivefelt for eiga endring på denne klossen */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={adjustPrompt}
                        onChange={(e) => setAdjustPrompt(e.target.value)}
                        disabled={isAdjustingThis}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && adjustPrompt.trim()) {
                            e.preventDefault();
                            handleAdjustSingleSection(idx, adjustPrompt);
                          }
                        }}
                        placeholder={
                          isNb
                            ? 'Skriv en kort instruks (f.eks. «Bytt til Kims lek», «Gjør quizen mer krevende», «Fokuser mer på tilgivelse»)...'
                            : 'Skriv ein kort instruks (t.d. «Byt til Kims leik», «Gjer quizen meir krevjande», «Fokuser meir på tilgiving»)...'
                        }
                        className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-slate-900 placeholder-slate-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={!adjustPrompt.trim() || isAdjustingThis}
                        onClick={() => handleAdjustSingleSection(idx, adjustPrompt)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                      >
                        {isAdjustingThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Oppdaterer...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Oppdater kloss</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. BOTTOM ACTION BAR (SINGLE SOURCE OF APPROVAL) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            setIsEditingBriefing(true);
            onEditBriefingChange?.(true);
          }}
          className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <span>← Tilbake til bestilling</span>
        </button>

        <button
          type="button"
          onClick={onApproveAndBuild}
          disabled={isBuildingBlocks || !storyboard?.sections || storyboard.sections.length === 0}
          className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isBuildingBlocks ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>Bygger blokker på arbeidsbordet...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>Godkjenn og bygg blokker</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
