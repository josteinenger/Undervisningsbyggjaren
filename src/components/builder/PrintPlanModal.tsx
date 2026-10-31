/**
 * src/components/builder/PrintPlanModal.tsx
 * 
 * Lekker, utskriftsvenleg A4-køyreplan for leirleiaren / undervisaren:
 * - Viser samlingstittel, undertittel/målgruppe og samla estimert tid øvst
 * - Ryddig tabell-/tidslinjevising med kolonnene:
 *   1. Klokkeslett / Minutt (akkumulert, t.d. «00:00 - 00:12 (12 min)»)
 *   2. Blokktype og tittel
 *   3. Kjernebodskap / Viktig hugs / Reglar (avhengig av blokktype)
 *   4. Utstyr / Førebuing som krevst
 * - «Skriv ut / Lagre som PDF» med window.print()
 */

import React, { useState } from 'react';
import { TeachingSession, TeachingBlock } from '../../types';
import { BLOCK_METADATA } from '../../lib/undervisningDefaults';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  Clock, 
  Layers, 
  FileText,
  Calendar,
  Sparkles,
  AlertCircle,
  BookOpen,
  LayoutList
} from 'lucide-react';

interface PrintPlanModalProps {
  session: TeachingSession;
  onClose: () => void;
  onSwitchToLeaderGuide?: () => void;
}

export const PrintPlanModal: React.FC<PrintPlanModalProps> = ({
  session,
  onClose,
  onSwitchToLeaderGuide,
}) => {
  const [copied, setCopied] = useState(false);

  const totalMinutes = (session.blocks || []).reduce((acc, b) => {
    const mins = b.data?.durationMinutes ?? (b.type === 'svart_skjerm' ? 0 : 5);
    return acc + (isNaN(mins) ? 0 : mins);
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  // Formater tidspunkt: t.d. «00:00 - 00:12 (12 min)»
  const formatTimeRange = (startMin: number, endMin: number) => {
    const formatClock = (m: number) => {
      const hours = Math.floor(m / 60);
      const mins = m % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };
    return `${formatClock(startMin)} - ${formatClock(endMin)} (${endMin - startMin} min)`;
  };

  // Hent kjernebodskap / viktige reglar per blokk
  const renderCoreContent = (block: TeachingBlock) => {
    const d = block.data as any;
    switch (block.type) {
      case 'stikkord':
        return (
          <div className="space-y-1">
            {d.points && d.points.length > 0 ? (
              <ul className="list-disc list-inside space-y-0.5 text-stone-700 text-[11px]">
                {d.points.map((pt: any, i: number) => (
                  <li key={i}>
                    <span className="font-semibold text-stone-900">{pt.text || `Punkt ${i + 1}`}</span>
                    {pt.note && <span className="text-stone-500 italic"> – {pt.note}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-stone-500 italic">{d.title || 'Stikkord'}</p>
            )}
          </div>
        );

      case 'tekst':
        return (
          <div className="space-y-1">
            {d.text && (
              <p className="font-medium text-stone-900 text-xs italic whitespace-pre-line">
                {d.text}
              </p>
            )}
            {d.leaderNotes && (
              <p className="text-[11px] text-stone-600">
                <span className="font-semibold">Manus: </span>{d.leaderNotes}
              </p>
            )}
          </div>
        );

      case 'undervisning':
        return (
          <div className="space-y-1">
            {d.coreMessage && (
              <p className="font-bold text-stone-900 italic">
                {d.coreMessage}
              </p>
            )}
            {d.moments && d.moments.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-stone-700 text-[11px] pt-0.5">
                {d.moments.map((m: string, i: number) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        );

      case 'bibelord':
        return (
          <div className="space-y-1">
            {d.keyVerse && (
              <p className="font-serif italic text-teal-900 bg-teal-50/80 p-1.5 rounded border border-teal-200">
                {d.keyVerse}
              </p>
            )}
            {d.reflectionQuestion && (
              <p className="text-[11px] text-stone-700">
                <span className="font-semibold text-teal-800">Undring: </span>
                {d.reflectionQuestion}
              </p>
            )}
          </div>
        );

      case 'informasjon':
        return (
          <div className="space-y-1">
            {d.practicalPoints && d.practicalPoints.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-stone-700 text-[11px]">
                {d.practicalPoints.map((p: string, i: number) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            )}
            {d.noticeBox && (
              <div className="p-1.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-semibold text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{d.noticeBox}</span>
              </div>
            )}
          </div>
        );

      case 'bonn_dikt':
        return (
          <div className="space-y-1.5 text-[11px]">
            {block.leaderNotes && block.leaderNotes.trim() && (
              <p className="text-stone-700 not-italic font-sans">
                <span className="font-semibold text-stone-900">Innleiing: </span>
                {block.leaderNotes.trim()}
              </p>
            )}
            {d.text && (
              <p className="whitespace-pre-line text-center font-serif text-purple-950 italic">
                {d.text}
              </p>
            )}
            {d.isResponsive && d.responsiveReading && (
              <div className="mt-1 p-1 bg-purple-50 rounded text-[10px] text-purple-900 not-italic border border-purple-200 font-sans">
                <span className="font-bold">Felles svar: </span>
                {d.responsiveReading}
              </div>
            )}
          </div>
        );

      case 'lek':
        return (
          <div className="space-y-1 text-xs">
            <div className="font-bold text-amber-800 flex items-center gap-1.5">
              <span>Energinivå: {d.energyLevel || 'Middels'}</span>
            </div>
            {d.rulesSteps && d.rulesSteps.length > 0 && (
              <ol className="list-decimal list-inside space-y-0.5 text-stone-700 text-[11px]">
                {d.rulesSteps.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
            )}
          </div>
        );

      case 'konkurranse':
        return (
          <div className="space-y-1 text-xs">
            <p className="text-[11px] text-stone-800">
              <span className="font-bold">Oppgåve: </span>{d.task}
            </p>
            {d.solution && (
              <p className="text-[11px] text-rose-900 bg-rose-50 p-1 rounded border border-rose-200 font-semibold">
                <span className="font-bold">Fasit for leiar: </span>{d.solution}
              </p>
            )}
            {d.scoringRules && (
              <p className="text-[10px] text-stone-500">
                Poeng: {d.scoringRules}
              </p>
            )}
          </div>
        );

      case 'samtale':
        return (
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-emerald-800 text-[11px]">
              Organisering: {d.organization || 'To-og-to'}
            </div>
            {d.reflectionQuestions && d.reflectionQuestions.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-stone-800 text-[11px]">
                {d.reflectionQuestions.map((q: string, i: number) => (
                  <li key={i} className="font-medium">{q}</li>
                ))}
              </ul>
            )}
            {d.summaryPoint && (
              <p className="text-[10px] text-stone-500 italic pt-0.5">
                Oppsummering: {d.summaryPoint}
              </p>
            )}
          </div>
        );

      case 'henteleik':
        return (
          <div className="space-y-1">
            {d.intro && <p className="text-[11px] text-stone-600 italic">{d.intro}</p>}
            {d.items && d.items.length > 0 && (
              <ol className="list-decimal list-inside space-y-0.5 text-stone-800 text-[11px]">
                {d.items.map((it: any, i: number) => (
                  <li key={i} className="font-medium">{it.text}</li>
                ))}
              </ol>
            )}
          </div>
        );

      case 'kims_leik':
        return (
          <div className="space-y-1">
            {d.intro && <p className="text-[11px] text-stone-600 italic">{d.intro}</p>}
            {d.items && d.items.length > 0 && (
              <p className="text-[11px] text-stone-800 font-medium">
                Gjenstandar: {d.items.map((it: any) => it.text).join(', ')}
              </p>
            )}
          </div>
        );

      case 'reis_deg':
        return (
          <div className="space-y-1">
            {d.statements && d.statements.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-stone-800 text-[11px]">
                {d.statements.map((it: any, i: number) => (
                  <li key={i}>{it.text}</li>
                ))}
              </ul>
            )}
          </div>
        );

      case 'bilete_avdekking':
        return (
          <div className="space-y-1 text-[11px]">
            <p className="font-semibold text-stone-800">
              Rutenett: {d.gridSize || 9} ruter
            </p>
            {d.solution && (
              <p className="text-rose-900 bg-rose-50 p-1 rounded font-bold">
                Fasit / Motiv: {d.solution}
              </p>
            )}
          </div>
        );

      case 'beat_for_beat':
        return (
          <div className="space-y-1 text-[11px]">
            {d.items && d.items.length > 0 && (
              <p className="text-stone-700">
                Ordrekke: {d.items.map((it: any) => it.text).join(' - ')}
              </p>
            )}
            {d.solution && (
              <p className="text-amber-900 bg-amber-50 p-1 rounded font-bold">
                Fasit / Song: {d.solution}
              </p>
            )}
          </div>
        );

      case 'kven_skal_ut':
        return (
          <div className="space-y-1 text-[11px]">
            <div className="grid grid-cols-2 gap-1 text-stone-800">
              {(['A', 'B', 'C', 'D'] as const).map((letter) => (
                <div key={letter}>
                  <span className="font-bold">{letter}:</span> {d[`option${letter}`] || '—'}
                </div>
              ))}
            </div>
            <p className="text-rose-900 bg-rose-50 p-1 rounded font-bold">
              Fasit: Alternativ {d.correctOption || 'A'} skal ut. {d.explanation ? `(${d.explanation})` : ''}
            </p>
          </div>
        );
    }
  };

  // Hent utstyr og førebuing som krevst
  const renderEquipment = (block: TeachingBlock) => {
    const d = block.data as any;
    switch (block.type) {
      case 'lek':
        return (
          <div className="text-[11px] font-medium text-amber-900 bg-amber-50/80 p-1.5 rounded border border-amber-200">
            {d.equipment || 'Ingen spesielle rekvisittar'}
          </div>
        );

      case 'konkurranse':
        return (
          <div className="text-[11px] text-stone-700">
            {d.competitionType === 'Kahoot' 
              ? 'Skjerm, internett og mobilar' 
              : 'Ark, skrivesaker, stoppeklokke og eventuell premie'}
          </div>
        );

      case 'stikkord':
        return (
          <div className="text-[11px] text-stone-600">
            Storskjerm (stegvis stikkord)
          </div>
        );

      case 'tekst':
        return (
          <div className="text-[11px] text-stone-600">
            Storskjerm (tekstvising)
          </div>
        );

      case 'undervisning':
        return (
          <div className="text-[11px] text-stone-600">
            {d.slideContent ? 'Storskjerm / bilete' : 'Ingen rekvisittar'}
          </div>
        );

      case 'bibelord':
        return (
          <div className="text-[11px] text-stone-600">
            {d.scriptureRef ? `Bibel (${d.scriptureRef})` : 'Bibel'}
          </div>
        );

      case 'bonn_dikt':
        return (
          <div className="text-[11px] text-stone-600">
            Demp lyset / lystenningsbord
          </div>
        );

      case 'informasjon':
        return (
          <div className="text-[11px] text-stone-600">
            Informasjonsark / storskjerm
          </div>
        );

      case 'samtale':
        return (
          <div className="text-[11px] text-stone-600">
            Sitteunderlag / bordoppsett
          </div>
        );

      case 'henteleik':
        return (
          <div className="text-[11px] text-stone-600">
            {d.items?.length ? `${d.items.length} gjenstandar i rommet` : 'Rom / deltakarar'}
          </div>
        );

      case 'kims_leik':
        return (
          <div className="text-[11px] text-stone-600">
            {d.items?.length ? `${d.items.length} gjenstandar / bord / klede` : 'Gjenstandar og klede'}
          </div>
        );

      case 'reis_deg':
        return (
          <div className="text-[11px] text-stone-600">
            Stolar / sitteplassar
          </div>
        );

      case 'bilete_avdekking':
      case 'beat_for_beat':
      case 'kven_skal_ut':
      case 'quiz':
      case 'sang_salme':
        return (
          <div className="text-[11px] text-stone-600">
            Storskjerm
          </div>
        );
    }
  };

  const getBlockTitle = (block: TeachingBlock): string => {
    const d = block.data as any;
    return d.title || d.heading || d.name || d.topic || d.scriptureRef || BLOCK_METADATA[block.type].label;
  };

  // Kopier ren tekst til utklippstavle
  const handleCopyText = () => {
    let text = `KØYREPLAN: ${session.title || 'Samling'}\n`;
    if (session.subtitle) text += `${session.subtitle}\n`;
    text += `Total tid: ${totalMinutes} minutt\n`;
    text += `=====================================================\n\n`;

    let cumulative = 0;
    session.blocks.forEach((b, idx) => {
      const dur = b.data?.durationMinutes || 5;
      const startMin = cumulative;
      cumulative += dur;
      const meta = BLOCK_METADATA[b.type];
      const title = getBlockTitle(b);

      text += `${idx + 1}. [${meta.label.toUpperCase()}] ${title} (${dur} min • ${startMin}–${cumulative} min)\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  let cumulativeTime = 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-stone-900 print:max-w-none print:max-h-none print:border-none print:shadow-none print:rounded-none">
        
        {/* ========================================================================= */}
        {/* TOPPLINJE FOR MODALEN (SKJULT VED UTSKRIFT)                               */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 bg-stone-50 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            {onSwitchToLeaderGuide ? (
              <div className="inline-flex items-center bg-stone-200/80 p-1 rounded-xl border border-stone-300">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-stone-900 shadow-xs flex items-center gap-1.5 cursor-default"
                >
                  <LayoutList className="w-3.5 h-3.5 text-amber-700" />
                  <span>Kompakt køyreplan</span>
                </button>
                <button
                  type="button"
                  onClick={onSwitchToLeaderGuide}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Fyldig leiarhefte (A4)</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-stone-900">
                    Køyreplan & Leiarark (A4 / PDF)
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    Utskriftsvenleg oversikt til leir, konfirmasjon og samlingar
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopiert!' : 'Kopier tekst'}</span>
            </button>

            {/* «Skriv ut / Lagre som PDF» */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-bold cursor-pointer transition-all shadow-xs hover:shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Skriv ut / Lagre som PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer ml-1"
              title="Lukk"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LEKKER UTSKRIFTSFLATE (A4-FORMAT)                                         */}
        {/* ========================================================================= */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 font-sans space-y-6 print:p-4 print:overflow-visible text-stone-900">
          
          {/* Dokument-hovud: Tittel, undertittel og samla estimert tid */}
          <div className="border-b-2 border-stone-800 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800 font-mono">
                UNDERVISNINGSBYGGJAR • LEIARPLAN
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-950 mt-1 tracking-tight leading-tight">
                {session.title || 'Ungdomssamling'}
              </h1>
              {session.subtitle && (
                <p className="text-sm font-medium text-stone-600 mt-0.5">
                  {session.subtitle}
                </p>
              )}
            </div>

            <div className="text-left sm:text-right sm:self-end text-xs space-y-1 shrink-0 bg-stone-50 print:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border sm:border-none border-stone-200">
              <div className="font-extrabold text-amber-900 text-sm">
                ⏱️ Samla estimert tid: {totalMinutes} minutt
              </div>
              <div className="text-stone-500 text-[11px]">
                {session.blocks.length} {session.blocks.length === 1 ? 'ledd' : 'ledd'} • Utskriftsdato: {new Date().toLocaleDateString('nb-NO')}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RYDDIG TABELL / TIDSLINJEVISING                                           */}
          {/* ========================================================================= */}
          {session.blocks.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">
              Ingen ledd lagt til på arbeidsbordet enno.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-stone-300">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-300 text-[11px] font-bold uppercase tracking-wider text-stone-700">
                    <th className="p-3 w-44 border-r border-stone-300">
                      Klokkeslett / Minutt
                    </th>
                    <th className="p-3 w-56 border-r border-stone-300">
                      Blokktype & Tittel
                    </th>
                    <th className="p-3 border-r border-stone-300">
                      Kjernebodskap / Viktig hugs / Reglar
                    </th>
                    <th className="p-3 w-48">
                      Utstyr / Førebuing som krevst
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-xs">
                  {session.blocks.map((b, idx) => {
                    const dur = b.data?.durationMinutes || 5;
                    const startMin = cumulativeTime;
                    cumulativeTime += dur;
                    const meta = BLOCK_METADATA[b.type];
                    const title = getBlockTitle(b);

                    return (
                      <tr 
                        key={b.id} 
                        className="hover:bg-stone-50/50 print:hover:bg-transparent break-inside-avoid"
                      >
                        {/* Kolonne 1: Klokkeslett / Minutt (akkumulert) */}
                        <td className="p-3 align-top border-r border-stone-200 bg-stone-50/40 print:bg-transparent font-mono">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-800 mb-1">
                            Ledd {idx + 1}
                          </span>
                          <div className="font-extrabold text-stone-900 text-xs">
                            {formatTimeRange(startMin, cumulativeTime)}
                          </div>
                        </td>

                        {/* Kolonne 2: Blokktype og tittel */}
                        <td className="p-3 align-top border-r border-stone-200 space-y-1">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                          <div className="font-bold text-sm text-stone-950 leading-snug">
                            {title}
                          </div>
                        </td>

                        {/* Kolonne 3: Kjernebodskap / Viktig hugs / Reglar */}
                        <td className="p-3 align-top border-r border-stone-200">
                          {renderCoreContent(b)}
                        </td>

                        {/* Kolonne 4: Utstyr / Førebuing som krevst */}
                        <td className="p-3 align-top">
                          {renderEquipment(b)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bunntekst for leirleiaren */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-400">
            <span>Undervisningsbyggjar for Den norske kyrkja</span>
            <span>Hugs: Tilpass tempoet etter stemninga i rommet!</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BUNNLINJE (SKJULT VED UTSKRIFT)                                           */}
        {/* ========================================================================= */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between print:hidden">
          <span className="text-xs text-stone-500">
            Tips: Vel «Lagre som PDF» i utskriftsdialogen for å dele fila digitalt.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 cursor-pointer transition-colors"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};
