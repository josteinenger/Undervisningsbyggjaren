/**
 * src/components/builder/LeaderManuscriptModal.tsx
 * 
 * 2-stegs skapingsflyt for Leiarmanus med Gemini:
 * Steg 1: Skap og rediger munnleg leiarmanus (med tema, kjelder, og fritt redigeringsfelt)
 * Steg 2: Bygg ut alle undervisningsblokker på arbeidsbordet basert på det godkjende manuset
 * Inkluderer reint A4-utskriftsformat for permen ("Skriv ut manus").
 */

import React, { useState, useRef } from 'react';
import { TeachingBlock } from '../../types';
import { 
  BookOpen, 
  Sparkles, 
  X, 
  Upload, 
  FileText, 
  Printer, 
  ArrowRight, 
  Check, 
  Trash2, 
  AlertCircle,
  File,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Wand2,
  Copy,
  Edit3,
  Layers
} from 'lucide-react';
export interface AttachedSourceFile {
  id: string;
  name: string;
  type: string;
  sizeFormatted: string;
  base64Data?: string;
  textContent?: string;
}

interface LeaderManuscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySession: (blocks: TeachingBlock[], title?: string, subtitle?: string) => void;
}

export const LeaderManuscriptModal: React.FC<LeaderManuscriptModalProps> = ({
  isOpen,
  onClose,
  onApplySession,
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [topicPrompt, setTopicPrompt] = useState('');
  const [pastedSourceText, setPastedSourceText] = useState('');
  const [isRawTextOpen, setIsRawTextOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedSourceFile[]>([]);
  
  // Sjølve manusteksten (redigerbar av leiaren)
  const [manuscriptText, setManuscriptText] = useState<string>(
    'Her kjem leiarmanuset ditt... Skriv inn eit tema og trykk «Generer leiarmanus» for å starta!'
  );
  
  const [isGeneratingManuscript, setIsGeneratingManuscript] = useState(false);
  const [isBuildingBlocks, setIsBuildingBlocks] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Formatér filstørrelse
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Opplasting av kjeldedokument
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_SINGLE_BYTES = 8 * 1024 * 1024;
    const MAX_TOTAL_BYTES = 15 * 1024 * 1024;
    let runningTotalBytes = attachedFiles.reduce((sum, f) => {
      if (f.base64Data) return sum + Math.round((f.base64Data.length * 3) / 4);
      if (f.textContent) return sum + f.textContent.length;
      return sum;
    }, 0);

    const newAttached: AttachedSourceFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_SINGLE_BYTES || runningTotalBytes + file.size > MAX_TOTAL_BYTES) {
        setStatusMsg({
          text: `Fila «${file.name}» er for stor (${(file.size / 1024 / 1024).toFixed(1)} MB). Av omsyn til AI-overføring bør PDF-ar vere under 8 MB. Eit godt tips er å kopiere og lime inn teksten direkte i tekstfeltet nedanfor i staden.`,
          type: 'error',
        });
        continue;
      }
      runningTotalBytes += file.size;

      const fileId = `file_${Date.now()}_${i}`;
      const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md');
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const isImage = file.type.startsWith('image/');

      try {
        if (isText) {
          const text = await file.text();
          newAttached.push({
            id: fileId,
            name: file.name,
            type: file.type || 'text/plain',
            sizeFormatted: formatSize(file.size),
            textContent: text,
          });
        } else if (isPdf || isImage) {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result as string;
              const base64 = res.split(',')[1] || '';
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          newAttached.push({
            id: fileId,
            name: file.name,
            type: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
            sizeFormatted: formatSize(file.size),
            base64Data,
          });
        }
      } catch (err) {
        console.warn('Feil ved lesing av fil:', err);
      }
    }

    setAttachedFiles((prev) => [...prev, ...newAttached]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Steg 1: Generer leiarmanus med Gemini
  const handleGenerateManuscript = async () => {
    setIsGeneratingManuscript(true);
    setStatusMsg({ text: 'Gemini skriv levande leiarmanus...', type: 'info' });

    try {
      const sourceDocuments = attachedFiles.map((f) => ({
        name: f.name,
        type: f.type,
        base64Data: f.base64Data,
        textContent: f.textContent,
      }));

      const response = await fetch('/api/manuscript/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: topicPrompt,
          sourceDocuments,
          pastedSourceText,
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
      const data = await response.json();

      if (data.success && data.manuscript) {
        setManuscriptText(data.manuscript);
        setStatusMsg({ text: 'Leiarmanus vart skapt! Du kan no redigere teksten fritt under.', type: 'success' });
        setActiveStep(1);
      } else {
        throw new Error(data.message || 'Kunne ikkje generere manus');
      }
    } catch (err: any) {
      console.error('Feil ved manustilvirking:', err);
      setStatusMsg({ text: err.message || 'Det oppstod ei feil under manustilvirking.', type: 'error' });
    } finally {
      setIsGeneratingManuscript(false);
    }
  };

  // Steg 2: Bygg ut blokker på arbeidsbordet frå det godkjende manuset
  const handleBuildBlocksFromManuscript = async () => {
    if (!manuscriptText || !manuscriptText.trim()) {
      setStatusMsg({ text: 'Manuset er tomt. Skriv eller generer eit manus først.', type: 'error' });
      return;
    }

    setIsBuildingBlocks(true);
    setStatusMsg({ text: 'Les manus og byggjer ut blokkene på arbeidsbordet...', type: 'info' });

    try {
      const response = await fetch('/api/manuscript/build-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manuscriptText,
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
      const data = await response.json();

      if (data.success && Array.isArray(data.blocks)) {
        onApplySession(data.blocks, data.title || 'Samling frå Leiarmanus', data.subtitle || 'Bygd ut frå godkjend manus');
        setStatusMsg({ text: 'Suksess! Arbeidsbordet er no oppdatert ut frå manuset ditt.', type: 'success' });
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        throw new Error(data.message || 'Kunne ikkje byggje ut blokkene');
      }
    } catch (err: any) {
      console.error('Feil ved blokkbygging:', err);
      setStatusMsg({ text: err.message || 'Feilet ved bygging av blokker.', type: 'error' });
    } finally {
      setIsBuildingBlocks(false);
    }
  };

  // Skriv ut manus for permen (A4 print)
  const handlePrintManuscript = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      {/* Modalboks */}
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* TOPPLINJE / HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Leiarmanus & 2-stegs skapingsflyt
              </h2>
              <p className="text-xs text-slate-300">
                Skap og rediger undervisningsmanuset ditt først — og bygg deretter ut arbeidsbordet!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintManuscript}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-medium cursor-pointer transition-colors"
              title="Skriv ut manuset i rent A4-format for permen"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Skriv ut manus (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              title="Lukk"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TO STEG INDIKATOR-PANEL */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* STEG 1 BADGE */}
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeStep === 1
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-950/20 flex items-center justify-center text-[11px]">1</span>
              <span>1. Skap manus med Gemini</span>
            </button>

            <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />

            {/* STEG 2 BADGE */}
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeStep === 2
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-bold">2</span>
              <span>2. Bygg opplegg på arbeidsbordet</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 italic hidden md:block">
            {activeStep === 1
              ? 'Formuler tema, generer munnleg manus og gjør taleenkle endringar.'
              : 'Gjer deg klar til å forvandle manusteksten til konkrete visningsblokker!'}
          </p>
        </div>

        {/* STATUS MELDING */}
        {statusMsg && (
          <div className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 border-b shrink-0 ${
            statusMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {statusMsg.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {statusMsg.type === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
            {statusMsg.type === 'info' && <Sparkles className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* HOVUDINNHALD (SCROLLBART VINDAG) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-100/60">
          
          {/* STEG 1: SKAP MANUS PANELER */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-amber-500" />
                <span>Steg 1: Tema, Kjelder og Skaping</span>
              </h3>
              <span className="text-xs text-slate-400">Valfritt om du har eit eige skrive manus</span>
            </div>

            {/* Prompt/Tema felt */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kva tema, forteljing eller opplegg skal leiarmanuset handla om?
              </label>
              <textarea
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                placeholder="Døme: Lag eit munnleg og spennande undervisningsmanus for konfirmantar om 'Heimkomsten og Den bortkomne sonen' (Lukas 15). Flett inn Henteleik, samtalespørsmål og eit tydeleg oppslag til storskjerm."
                className="w-full h-20 p-3 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-slate-800 bg-slate-50/50 resize-none"
              />
            </div>

            {/* Filopplasting og Kjeldetekst */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <div className="flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept=".pdf,.txt,.md,.png,.jpg,.jpeg"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Legg ved leiarhefte / kjelde (PDF, tekst, bilete)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsRawTextOpen(!isRawTextOpen)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>{isRawTextOpen ? 'Skjul innliming' : 'Lim inn råtekst'}</span>
                {isRawTextOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Vedlagte filer lista */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {attachedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-xs text-amber-900"
                  >
                    {file.type.includes('pdf') ? (
                      <File className="w-3.5 h-3.5 text-amber-600" />
                    ) : file.type.includes('image') ? (
                      <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span className="font-medium max-w-[160px] truncate">{file.name}</span>
                    <span className="text-[10px] text-amber-700">({file.sizeFormatted})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.id)}
                      className="ml-1 p-0.5 hover:bg-amber-200/60 rounded cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-amber-800" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Innlimt tekst felt */}
            {isRawTextOpen && (
              <div className="pt-2">
                <textarea
                  value={pastedSourceText}
                  onChange={(e) => setPastedSourceText(e.target.value)}
                  placeholder="Lim inn tekst direkte frå eit leiarhefte, teologisk artikkel eller førebuing..."
                  className="w-full h-24 p-3 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white resize-none"
                />
              </div>
            )}

            {/* Knapp for å generere manus */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleGenerateManuscript}
                disabled={isGeneratingManuscript}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isGeneratingManuscript ? 'animate-spin' : ''}`} />
                <span>{isGeneratingManuscript ? 'Skapar leiarmanus med Gemini...' : '✨ Generer leiarmanus med Gemini'}</span>
              </button>
            </div>
          </div>

          {/* MANUSKREFT REDIGERINGSFELT (STORT, DEILIG TALE- OG LESEFELT) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Redigerbart Leiarmanus (Munnleg undervisning)
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{manuscriptText.split(/\s+/).filter(Boolean).length} ord</span>
                <span>•</span>
                <span>{manuscriptText.split('\n').length} linjer</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 italic">
              Du har full redaksjonell kontroll! Stryk, legg til, formuler om på ditt eige munnlege vis. 
              Gjenkjennlege klammer som <code className="bg-slate-100 px-1 rounded text-amber-700">[SKJERM: ...]</code>, <code className="bg-slate-100 px-1 rounded text-amber-700">[AKTIVITET: Henteleiken ...]</code> og <code className="bg-slate-100 px-1 rounded text-amber-700">[SAMTALE: ...]</code> vert automatisk fanga opp i Steg 2.
            </p>

            {/* Stort tekstområde for manuset */}
            <textarea
              value={manuscriptText}
              onChange={(e) => setManuscriptText(e.target.value)}
              className="w-full h-80 p-4 rounded-xl border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-serif text-slate-900 text-base leading-relaxed bg-amber-50/20 resize-y shadow-inner"
              placeholder="Skriv eller lim inn manuset ditt her..."
            />
          </div>

          {/* STEG 2: BYGG BLOKKER HENDING */}
          <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-slate-800">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Steg 2: Bygg opplegg på arbeidsbordet
                </h4>
              </div>
              <p className="text-xs text-slate-300">
                Trykk knappen for å la Gemini analysere manuset ditt og fylle arbeidsbordet automatisk med bibelord, Henteleik, samtalespørsmål og leiarnotatar!
              </p>
            </div>

            <button
              type="button"
              onClick={handleBuildBlocksFromManuscript}
              disabled={isBuildingBlocks || !manuscriptText.trim()}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isBuildingBlocks ? 'animate-spin' : ''}`} />
              <span>{isBuildingBlocks ? 'Byggjer opplegg...' : '🚀 Bygg opplegg på arbeidsbordet'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* SKJULT SKRIV-UT CONTAINER FOR PERMEN (A4-FORMAT) */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-serif text-base leading-relaxed z-[9999]">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="border-b-2 border-black pb-4 mb-6">
            <h1 className="text-2xl font-bold uppercase tracking-tight">LEIARMANUS</h1>
            <p className="text-sm italic">Undervisning og samling for konfirmantar / ungdom</p>
          </div>
          <div className="whitespace-pre-wrap font-serif text-base leading-loose">
            {manuscriptText}
          </div>
        </div>
      </div>

    </div>
  );
};
