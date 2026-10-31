/**
 * src/components/builder/RightPanel.tsx
 * Høgremeny / Handlingspanel
 * 
 * - Enkel og vakker førehandsvising av presentasjon / lysbilete (16:9 storskjerm).
 * - Leiar-manus / jukselapp for vald blokk.
 * - Knappar for fullskjerms presentasjonsmodus og eksport (køyreplan, JSON).
 */

import React, { useState } from 'react';
import { TeachingBlock, TeachingSession } from '../../types';
import { BLOCK_METADATA } from '../../lib/undervisningDefaults';
import { getItemGraphic } from '../../lib/kimsLeikUtils';
import { 
  Play, 
  Printer, 
  Download, 
  Upload, 
  Tv, 
  Sparkles, 
  Clock, 
  Sun, 
  Moon, 
  FileText,
  HelpCircle,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Users,
  Zap,
  Trophy,
  X
} from 'lucide-react';

interface RightPanelProps {
  session: TeachingSession;
  selectedBlock: TeachingBlock | null;
  onOpenFullPresenter: () => void;
  onOpenPrintPlan: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onClose?: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  session,
  selectedBlock,
  onOpenFullPresenter,
  onOpenPrintPlan,
  onExportJson,
  onImportJson,
  onClose,
}) => {
  const [screenTheme, setScreenTheme] = useState<'dark' | 'light'>('dark');

  const meta = selectedBlock ? BLOCK_METADATA[selectedBlock.type] : null;

  // Render 16:9 storskjerm-vising for valt ledd
  const renderScreenContent = () => {
    if (!selectedBlock) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-stone-400">
          <Tv className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-xs">Vel eit ledd på arbeidsbordet for å førehandsvise storskjermen</p>
        </div>
      );
    }

    const isDark = screenTheme === 'dark';
    const bgClass = isDark ? 'bg-stone-950 text-stone-100' : 'bg-stone-50 text-stone-900';

    switch (selectedBlock.type) {
      case 'stikkord': {
        const d = selectedBlock.data as any;
        const points = (d.points || d.slidePoints || []) as Array<{ id: string; text: string }>;
        return (
          <div className={`w-full h-full p-4 flex flex-col justify-between ${bgClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span className="font-semibold uppercase tracking-wider text-indigo-400">
                {d.title || 'Stikkord'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                {d.durationMinutes || 10} min
              </span>
            </div>

            <div className="my-auto px-2 space-y-1.5 w-full">
              {points.length === 0 ? (
                <p className="text-center text-xs opacity-60 italic">Ingen stikkord lagt til enno</p>
              ) : (
                points.slice(0, 6).map((pt, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white">
                    <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                      {i + 1}
                    </span>
                    <span className="truncate">{pt.text || `Punkt ${i + 1}`}</span>
                  </div>
                ))
              )}
              {points.length > 6 && (
                <div className="text-center text-[10px] opacity-50">+ {points.length - 6} til...</div>
              )}
            </div>

            <div className="text-center text-[10px] opacity-40">
              Undervisningsbyggjar • Stikkord
            </div>
          </div>
        );
      }

      case 'tekst': {
        const d = selectedBlock.data as any;
        return (
          <div className={`w-full h-full p-5 flex flex-col justify-between ${bgClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span className="font-semibold uppercase tracking-wider text-sky-400">
                {d.title || 'Tekst'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono text-[10px]">
                {d.durationMinutes || 8} min
              </span>
            </div>

            <div className="text-center my-auto px-3 space-y-2">
              <p className="text-xs sm:text-sm font-medium text-white line-clamp-4 whitespace-pre-line leading-relaxed">
                {d.text || d.title || 'Tekst'}
              </p>
              {d.subtitle && (
                <p className="text-[11px] text-sky-300 italic">
                  {d.subtitle}
                </p>
              )}
            </div>

            <div className="text-center text-[10px] opacity-40">
              Undervisningsbyggjar • Tekst
            </div>
          </div>
        );
      }

      case 'undervisning': {
        const d = selectedBlock.data as any;
        return (
          <div className={`w-full h-full p-6 flex flex-col justify-between ${bgClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span className="font-semibold uppercase tracking-wider text-indigo-400">
                {session.title || 'Undervisning'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                {d.durationMinutes || 12} min
              </span>
            </div>

            <div className="text-center my-auto px-4 space-y-3">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                {d.title || 'Undervisning'}
              </h1>
              {d.slideSubtitle && (
                <p className="text-xs text-indigo-300 font-medium">
                  {d.slideSubtitle}
                </p>
              )}
              {d.slideContent && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 max-w-sm mx-auto">
                  <p className="text-xs sm:text-sm font-serif italic text-stone-200 whitespace-pre-line leading-relaxed">
                    {d.slideContent}
                  </p>
                </div>
              )}
            </div>

            <div className="text-center text-[10px] opacity-40">
              Undervisningsbyggjar • Storskjerm
            </div>
          </div>
        );
      }

      case 'bibelord': {
        const d = selectedBlock.data as any;
        const verse = d.keyVerse || d.bibleText || '';
        return (
          <div className={`w-full h-full p-5 flex flex-col justify-between ${bgClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span className="font-semibold uppercase tracking-wider text-teal-400">
                {d.scriptureRef || 'Bibelord'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[10px]">
                {d.durationMinutes || 8} min
              </span>
            </div>

            <div className="text-center my-auto px-2 space-y-2 w-full">
              {verse ? (
                <p className="text-xs sm:text-sm font-sans italic text-stone-100 whitespace-pre-line leading-relaxed">
                  «{verse}»
                </p>
              ) : (
                <p className="text-xs text-stone-400 italic">Ingen tekst skrive inn enno</p>
              )}
              {d.scriptureRef && (
                <p className="text-[11px] font-bold text-teal-400 mt-2">
                  — {d.scriptureRef}
                </p>
              )}
            </div>

            <div className="text-center text-[10px] opacity-40">
              Undervisningsbyggjar • Bibelord
            </div>
          </div>
        );
      }

      case 'informasjon': {
        const d = selectedBlock.data as any;
        return (
          <div className={`w-full h-full p-6 flex flex-col justify-between ${bgClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span className="font-semibold uppercase tracking-wider text-slate-400">
                Praktisk info
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 font-mono text-[10px]">
                {d.durationMinutes || 5} min
              </span>
            </div>

            <div className="my-auto px-4 space-y-3 max-w-sm mx-auto w-full">
              <h2 className="text-base sm:text-lg font-extrabold text-center text-white">
                {d.heading || 'Informasjon'}
              </h2>

              <ul className="space-y-1.5 text-xs text-stone-300">
                {(d.practicalPoints || []).slice(0, 3).map((pt: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              {d.noticeBox && (
                <div className="p-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{d.noticeBox}</span>
                </div>
              )}
            </div>

            <div className="text-center text-[10px] opacity-40">
              Informasjon til samlinga
            </div>
          </div>
        );
      }

      case 'bonn_dikt': {
        const d = selectedBlock.data as any;
        return (
          <div className={`w-full h-full p-6 flex flex-col justify-between ${bgClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span className="font-semibold uppercase tracking-wider text-purple-400">
                Bøn
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px]">
                {d.durationMinutes || 5} min
              </span>
            </div>

            <div className="text-center my-auto px-4 space-y-2.5 max-w-sm mx-auto">
              <Flame className="w-5 h-5 text-amber-400 mx-auto animate-pulse" />
              <h2 className="text-sm font-bold text-purple-200">
                {d.title || 'Bøn'}
              </h2>
              {d.text && (
                <p className="text-xs font-serif italic text-stone-200 whitespace-pre-line leading-relaxed">
                  {d.text}
                </p>
              )}

              {d.isResponsive && d.responsiveReading && (
                <div className="pt-2 text-[11px] text-purple-300 font-mono whitespace-pre-line border-t border-purple-800/40">
                  {d.responsiveReading}
                </div>
              )}
            </div>

            <div className="text-center text-[10px] opacity-40">
              I Herrens nærvær
            </div>
          </div>
        );
      }

      case 'lek': {
        const d = selectedBlock.data as any;
        return (
          <div className={`w-full h-full p-6 flex flex-col justify-between ${bgClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span className="font-semibold uppercase tracking-wider text-amber-400">
                Leik og moro
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] inline-flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>{d.energyLevel || 'Høgt tempo'}</span>
              </span>
            </div>

            <div className="text-center my-auto px-4 space-y-3">
              <h2 className="text-lg font-black text-amber-400 tracking-tight">
                {d.name || 'Leik'}
              </h2>

              {d.screenDisplay === 'timer' && (
                <div className="inline-flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 border-amber-500 bg-amber-950/40 mx-auto">
                  <span className="text-2xl font-black font-mono text-white">
                    0{d.timerMinutes || 3}:00
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold">
                    Tidtakar
                  </span>
                </div>
              )}

              {d.screenDisplay === 'instruks' && (
                <div className="text-xs text-stone-300 max-w-xs mx-auto text-left space-y-1">
                  {(d.rulesSteps || []).slice(0, 3).map((r: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">{i + 1}.</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-center text-[10px] opacity-40">
              Gjer dykk klare!
            </div>
          </div>
        );
      }

      case 'konkurranse': {
        const d = selectedBlock.data as any;
        return (
          <div className={`w-full h-full p-6 flex flex-col justify-between ${bgClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span className="font-semibold uppercase tracking-wider text-rose-400">
                Konkurranse • {d.competitionType || 'Lag'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px]">
                {d.durationMinutes || 10} min
              </span>
            </div>

            <div className="text-center my-auto px-4 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold">
                <Trophy className="w-3.5 h-3.5 text-rose-400" />
                <span>{d.title || 'Konkurranse'}</span>
              </div>
              {d.task && (
                <p className="text-xs sm:text-sm font-semibold text-white whitespace-pre-line max-w-sm mx-auto">
                  {d.task}
                </p>
              )}
              {d.scoringRules && (
                <p className="text-[11px] text-stone-400">
                  Poeng: {d.scoringRules}
                </p>
              )}
            </div>

            <div className="text-center text-[10px] opacity-40">
              Undervisningsbyggjar • Konkurranse
            </div>
          </div>
        );
      }

      case 'samtale': {
        const d = selectedBlock.data as any;
        const questions: string[] = (d.reflectionQuestions || []).filter((q: string) => q && q.trim());
        const topicText = d.topic && d.topic.trim().toLowerCase() !== 'samtale' ? d.topic.trim() : '';
        const orgText = (d.organization || d.grouping || '').trim();
        const headingTitle = (d.title && d.title.trim()) || 'Samtale';

        return (
          <div className={`w-full h-full p-5 flex flex-col items-center justify-between text-center ${bgClass}`}>
            <div className="w-full shrink-0 flex flex-col items-center justify-center pt-1">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight leading-tight">
                {headingTitle}
              </h2>
              <div className="w-10 h-1 rounded-full bg-current opacity-80 mx-auto mt-1.5" />
            </div>

            <div className="my-auto px-3 text-center max-w-md mx-auto w-full flex flex-col items-center justify-center">
              <div className="space-y-2.5 w-full text-center">
                {questions.length === 0 ? (
                  <p className="text-sm sm:text-base font-semibold leading-snug">
                    {topicText || 'Kva tenkjer de om dette?'}
                  </p>
                ) : (
                  questions.slice(0, 3).map((q: string, i: number) => (
                    <p key={i} className="text-xs sm:text-sm font-semibold leading-snug break-words text-center">
                      {q}
                    </p>
                  ))
                )}
              </div>

              {orgText && (
                <div className="mt-3 text-[10px] font-medium opacity-75">
                  {orgText}
                </div>
              )}
            </div>

            <div className="h-1 shrink-0" />
          </div>
        );
      }

      case 'henteleik': {
        const d = selectedBlock.data as any;
        const items = d.items || [];
        const firstItem = items[0]?.text || 'Gjenstand 1';
        const containerClass = screenTheme === 'dark' ? 'bg-stone-950 text-stone-100' : 'bg-slate-50 text-slate-900';
        const titleClass = screenTheme === 'dark' ? 'text-stone-100' : 'text-slate-900';

        return (
          <div className={`w-full h-full p-6 flex flex-col justify-between ${containerClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-80">
              <span className="font-bold uppercase tracking-wider text-amber-500">
                HENTELEIKEN
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-mono text-[10px]">
                {items.length} gjenstandar
              </span>
            </div>

            <div className="text-center my-auto px-4">
              <h2 className={`text-lg sm:text-2xl font-black tracking-tight leading-tight ${titleClass}`}>
                {firstItem}
              </h2>
            </div>

            <div className="text-center text-[10px] opacity-40">
              Éin og éin gjenstand på storskjerm
            </div>
          </div>
        );
      }

      case 'kims_leik': {
        const d = selectedBlock.data as any;
        const items = d.items || [];
        const containerClass = isDark ? 'bg-[#09090b] text-white' : 'bg-slate-50 text-slate-900';
        const cardClass = isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-800 shadow-2xs';
        const titleClass = isDark ? 'text-white' : 'text-slate-900';
        const badgeClass = isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-300' : 'border-slate-200 bg-white text-slate-700 shadow-2xs';

        return (
          <div className={`w-full h-full p-5 flex flex-col justify-between ${containerClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-80">
              <span className="font-bold uppercase tracking-wider text-amber-500">
                KIMS LEIK
              </span>
              <span className={`px-2 py-0.5 rounded-full border font-mono text-[10px] ${badgeClass}`}>
                {items.length || 16} gjenstandar
              </span>
            </div>

            <div className="text-center my-auto px-2 space-y-2">
              <h2 className={`text-sm font-black tracking-wider uppercase ${titleClass}`}>
                {d.title || 'KIMS LEIK'}
              </h2>
              <div className="grid grid-cols-4 gap-1 max-w-xs mx-auto">
                {items.slice(0, 8).map((it: any, i: number) => {
                  const textVal = typeof it === 'string' ? it : it.text || `Gjenstand ${i + 1}`;
                  return (
                    <div key={i} className={`p-1 rounded border text-[9px] font-bold truncate text-center flex flex-col items-center justify-center ${cardClass}`}>
                      <span className="text-xs">{getItemGraphic(it).emoji}</span>
                      <span className="truncate w-full text-[8px] opacity-70 mt-0.5">{textVal}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-center text-[10px] opacity-50">
              3-stegs visuell minneleik på storskjerm
            </div>
          </div>
        );
      }

      case 'reis_deg': {
        const d = selectedBlock.data as any;
        const statements = d.statements || [];
        return (
          <div className={`w-full h-full p-6 flex flex-col justify-between ${bgClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span className="font-semibold uppercase tracking-wider text-emerald-400">
                Aktivitet • Reis deg
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                {statements.length} påstandar
              </span>
            </div>

            <div className="text-center my-auto px-4 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                Påstand 1 av {statements.length || 1}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {statements[0]?.text || 'Reis deg viss...'}
              </h2>
            </div>

            <div className="text-center text-[10px] opacity-40">
              Visast éin og éin på storskjerm
            </div>
          </div>
        );
      }

      case 'bilete_avdekking': {
        const d = selectedBlock.data as any;
        return (
          <div className={`w-full h-full p-5 flex flex-col justify-between ${bgClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span className="font-semibold uppercase tracking-wider text-amber-400">
                Konkurranse • Bilete-avdekking
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                {d.gridSize || 9} ruter
              </span>
            </div>

            <div className="text-center my-auto px-2 space-y-2">
              <h2 className="text-sm font-bold text-white">
                {d.title || 'Bilete-avdekking'}
              </h2>
              <div className="grid grid-cols-3 gap-1 w-28 h-28 mx-auto border border-amber-500/40 p-1 rounded-lg bg-amber-950/20">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="rounded bg-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-200">
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center text-[10px] opacity-40">
              Avdekk rute for rute
            </div>
          </div>
        );
      }

      case 'beat_for_beat': {
        const d = selectedBlock.data as any;
        const words = d.words || d.items || [];
        return (
          <div className={`w-full h-full p-6 flex flex-col justify-between ${bgClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span className="font-semibold uppercase tracking-wider text-amber-400">
                Konkurranse • Beat for beat
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                {words.length} ord
              </span>
            </div>

            <div className="text-center my-auto px-4 space-y-3">
              <h2 className="text-sm sm:text-base font-black text-white">
                Beat for beat
              </h2>
              <div className="flex flex-wrap justify-center gap-1.5 max-w-xs mx-auto">
                {words.slice(0, 7).map((_: any, i: number) => (
                  <span key={i} className="w-7 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-center text-[10px] opacity-40">
              Gjett songen
            </div>
          </div>
        );
      }

      case 'ord_for_ord': {
        const d = selectedBlock.data as any;
        const words = d.words || [];
        return (
          <div className={`w-full h-full p-6 flex flex-col justify-between ${bgClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span className="font-semibold uppercase tracking-wider text-indigo-400">
                Konkurranse • Ord for ord
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                {words.length} ord
              </span>
            </div>

            <div className="text-center my-auto px-4 space-y-3">
              <h2 className="text-sm sm:text-base font-black text-white">
                Ord for ord
              </h2>
              <div className="flex flex-wrap justify-center gap-1.5 max-w-xs mx-auto">
                {words.slice(0, 7).map((_: any, i: number) => (
                  <span key={i} className="w-7 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-center text-[10px] opacity-40">
              Avdekk sitatet ord for ord
            </div>
          </div>
        );
      }

      case 'bilete':
      case 'bilde': {
        const d = selectedBlock.data as any;
        const images = d.images || [];
        return (
          <div className={`w-full h-full relative overflow-hidden p-0 flex items-center justify-center ${bgClass}`}>
            {images[0]?.url ? (
              <div className="w-full h-full absolute inset-0 overflow-hidden p-0 flex items-center justify-center">
                <img src={images[0].url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="text-xs text-stone-400 italic">Ingen bilet-URL</div>
            )}
          </div>
        );
      }

      case 'video': {
        const d = selectedBlock.data as any;
        return (
          <div className={`w-full h-full p-6 flex flex-col justify-between ${bgClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span className="font-semibold uppercase tracking-wider text-sky-400">
                Video
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono text-[10px]">
                {d.durationMinutes || 5} min
              </span>
            </div>

            <div className="text-center my-auto px-4 space-y-2">
              <h2 className="text-sm font-bold text-white">
                {d.title || 'Videoklipp'}
              </h2>
              <div className="w-full h-28 rounded-xl bg-black overflow-hidden flex items-center justify-center border border-stone-800 text-stone-400 text-xs font-mono">
                {d.videoUrl ? 'Videokilde aktiv' : 'Ingen videokilde'}
              </div>
            </div>

            <div className="text-center text-[10px] opacity-40">
              Storskjerm • Video
            </div>
          </div>
        );
      }

      case 'kven_skal_ut': {
        const d = selectedBlock.data as any;
        return (
          <div className={`w-full h-full p-5 flex flex-col justify-between ${bgClass}`}>
            <div className="flex items-center justify-between text-[11px] opacity-70">
              <span className="font-semibold uppercase tracking-wider text-rose-400">
                Konkurranse • Kven skal ut?
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px]">
                4 val
              </span>
            </div>

            <div className="text-center my-auto px-2 space-y-2">
              <h2 className="text-sm font-bold text-white">
                {d.title || 'Kven skal ut?'}
              </h2>
              <div className="grid grid-cols-2 gap-1.5 max-w-xs mx-auto text-left">
                {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                  const val = d[`option${letter}`];
                  return (
                    <div key={letter} className="p-1.5 rounded bg-white/10 text-stone-200 text-[10px] font-medium truncate flex items-center gap-1">
                      <span className="w-3.5 h-3.5 rounded bg-rose-600 text-white font-bold flex items-center justify-center text-[9px] shrink-0">
                        {letter}
                      </span>
                      <span className="truncate">{val || `Val ${letter}`}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-center text-[10px] opacity-40">
              Finn alternativet som skil seg ut
            </div>
          </div>
        );
      }
    }
  };

  return (
    <aside className="w-96 shrink-0 bg-slate-50 border-l border-slate-200 flex flex-col h-full overflow-hidden select-none">
      {/* ========================================================================= */}
      {/* 1. HOVEDKNAPPAR FOR SAMLINGA                                              */}
      {/* ========================================================================= */}
      <div className="p-4 border-b border-slate-200 bg-white space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Handlingar & Framsyning
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              title="Lukk sidepanel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Hovudknapp: Fullskjerm Presentasjon */}
        <button
          type="button"
          onClick={onOpenFullPresenter}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
          title="Opne fullskjerms presentasjonsvising for samlinga"
        >
          <Play className="w-4 h-4 fill-white text-white" />
          <span>Fullskjerms framsyning</span>
        </button>

        {/* Sekundære knappar: Køyreplan og Eksport */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenPrintPlan}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
            title="Skriv ut leiarark / køyreplan på A4"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Køyreplan</span>
          </button>

          <button
            type="button"
            onClick={onExportJson}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer transition-colors shadow-2xs"
            title="Last ned opplegget som .json-fil"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Eksporter</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 16:9 STORSKJERM FØREHANDSVISING                                       */}
      {/* ========================================================================= */}
      <div className="p-4 border-b border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5 text-slate-600" />
            <span>Førehandsvising (16:9 Storskjerm)</span>
          </span>

          {/* Mørk/lys skjermveljar */}
          <button
            type="button"
            onClick={() => setScreenTheme(screenTheme === 'dark' ? 'light' : 'dark')}
            className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
            title="Bytt mellom lys og mørk førehandsvising"
          >
            {screenTheme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 16:9 Canvas boks */}
        <div 
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-2xs select-text"
        >
          {renderScreenContent()}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LEIAR-NOTATAR / JUKSELAPP FOR VALD BLOKK                              */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Leiar-notatar (til undervisar)</span>
          </span>
          {meta && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {meta.label}
            </span>
          )}
        </div>

        {selectedBlock ? (
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs space-y-2.5">
            {/* Blokkspesifikke stikkord for leiaren */}
            {selectedBlock.type === 'stikkord' && (
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase mb-1">Stikkord ({((selectedBlock.data as any).points || []).length}):</div>
                <div className="space-y-1.5">
                  {((selectedBlock.data as any).points || []).map((pt: any, i: number) => (
                    <div key={i} className="p-1.5 rounded bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                      <div className="font-semibold text-stone-900 dark:text-stone-100">{i + 1}. {pt.text || 'Uten tekst'}</div>
                      {pt.note && <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">{pt.note}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedBlock.type === 'tekst' && (
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase mb-1">Hovudtekst:</div>
                <p className="font-medium text-stone-900 dark:text-stone-100 whitespace-pre-line leading-relaxed">
                  {(selectedBlock.data as any).text || 'Ingen tekst oppgitt'}
                </p>
              </div>
            )}

            {selectedBlock.type === 'undervisning' && (
              <>
                <div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase">Kjernebodskap:</div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">
                    {(selectedBlock.data as any).coreMessage || 'Ikkje oppgitt'}
                  </p>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase mb-1">Momentliste:</div>
                  <ul className="space-y-1 list-disc list-inside text-stone-600 dark:text-stone-300">
                    {((selectedBlock.data as any).moments || []).map((m: string, i: number) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {selectedBlock.type === 'bibelord' && (
              <>
                <div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase">Tekst:</div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">
                    {(selectedBlock.data as any).scriptureRef}
                  </p>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase">Undringskrok:</div>
                  <p className="text-stone-700 dark:text-stone-300 italic">
                    {(selectedBlock.data as any).reflectionQuestion || 'Ikkje oppgitt'}
                  </p>
                </div>
              </>
            )}

            {selectedBlock.type === 'lek' && (
              <>
                <div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase">Utstyr:</div>
                  <p className="text-stone-800 dark:text-stone-200">
                    {(selectedBlock.data as any).equipment || 'Ingen spesielle rekvisittar'}
                  </p>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase mb-1">Reglar:</div>
                  <ol className="space-y-1 list-decimal list-inside text-stone-600 dark:text-stone-300">
                    {((selectedBlock.data as any).rulesSteps || []).map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ol>
                </div>
              </>
            )}

            {selectedBlock.type === 'konkurranse' && (
              <>
                <div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase">Fasit for leiar:</div>
                  <p className="font-bold text-rose-700 dark:text-rose-400">
                    {(selectedBlock.data as any).solution || 'Ingen fasit'}
                  </p>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase">Poengreglar:</div>
                  <p className="text-stone-700 dark:text-stone-300">
                    {(selectedBlock.data as any).scoringRules || '1 poeng'}
                  </p>
                </div>
              </>
            )}

            {selectedBlock.type === 'samtale' && (
              <>
                <div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase">Organisering:</div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">
                    {(selectedBlock.data as any).organization}
                  </p>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-stone-400 uppercase mb-1">Spørsmål:</div>
                  <ul className="space-y-1 list-disc list-inside text-stone-700 dark:text-stone-300">
                    {((selectedBlock.data as any).reflectionQuestions || []).map((q: string, i: number) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {selectedBlock.type === 'informasjon' && (
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase mb-1">Hugs-boks:</div>
                <p className="font-bold text-amber-700 dark:text-amber-400">
                  {(selectedBlock.data as any).noticeBox || 'Ingen varsel'}
                </p>
              </div>
            )}

            {selectedBlock.type === 'bonn_dikt' && (
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase mb-1">Veksellesing:</div>
                <p className="text-stone-700 dark:text-stone-300 font-mono">
                  {(selectedBlock.data as any).responsiveReading || 'Ingen veksellesing'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-stone-400 italic">
            Klikk på eit ledd i lista for å sjå leiar-stikkorda her.
          </p>
        )}
      </div>

      {/* Import-knapp heilt nedst */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <button
          type="button"
          onClick={onImportJson}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 text-xs cursor-pointer transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-slate-400" />
          <span>Importer opplegg frå fil (.json)</span>
        </button>
      </div>
    </aside>
  );
};
