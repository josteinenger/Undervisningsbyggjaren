/**
 * src/components/builder/SavedSessionsModal.tsx
 * 
 * Arkiv og fildeling for Undervisningsbyggjar:
 * - Visar alle lagra samlingar på einheita (og klargjort for Firestore)
 * - Last ned opplegg som .json-fil (for deling med kollegaer)
 * - Importer opplegg frå .json-fil
 * - Last inn vald samling på arbeidsbordet
 * - Slett eller dupliser lagra samlingar
 */

import React, { useState, useEffect, useRef } from 'react';
import { TeachingSession } from '../../types';
import { 
  loadTeachingSessions, 
  saveTeachingSession, 
  deleteTeachingSession 
} from '../../services/storageService';
import { 
  FolderOpen, 
  Trash2, 
  X, 
  Clock, 
  Layers, 
  ArrowRight,
  BookOpen,
  Download,
  Upload,
  Check,
  AlertCircle
} from 'lucide-react';

interface SavedSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSession: (session: TeachingSession) => void;
  currentSession: TeachingSession;
}

export const SavedSessionsModal: React.FC<SavedSessionsModalProps> = ({
  isOpen,
  onClose,
  onLoadSession,
  currentSession,
}) => {
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const importFileInputRef = useRef<HTMLInputElement>(null);

  const refreshSessions = async () => {
    setIsLoading(true);
    const data = await loadTeachingSessions();
    setSessions(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      refreshSessions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const calculateTotalMinutes = (session: TeachingSession): number => {
    return (session.blocks || []).reduce((acc, b) => {
      const mins = b.data?.durationMinutes ?? 5;
      return acc + (isNaN(mins) ? 5 : mins);
    }, 0);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Er du sikker på at du vil slette denne lagra samlinga?')) {
      await deleteTeachingSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      showStatus('Samlinga vart sletta.');
    }
  };

  // Last ned ei samling som JSON-fil
  const handleDownloadSessionJson = (sessionToExport: TeachingSession, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sessionToExport, null, 2));
      const downloadAnchor = document.createElement('a');
      const safeTitle = (sessionToExport.title || 'samling').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `${safeTitle}_køyreplan.json`;
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showStatus(`Lasta ned «${sessionToExport.title}» som JSON!`);
    } catch (err: any) {
      showStatus(`Kunne ikkje laste ned fil: ${err?.message}`, 'error');
    }
  };

  // Importer ei samling frå JSON-fil
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed && Array.isArray(parsed.blocks)) {
          const importedSession: TeachingSession = {
            id: `session_${Date.now()}`,
            title: parsed.title || 'Importert samling',
            subtitle: parsed.subtitle || '',
            blocks: parsed.blocks,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await saveTeachingSession(importedSession);
          await refreshSessions();
          onLoadSession(importedSession);
          showStatus(`Importerte og opna «${importedSession.title}»!`);
        } else {
          showStatus('Fila inneheld ikkje eit gyldig samlingsopplegg.', 'error');
        }
      } catch (err: any) {
        showStatus(`Kunne ikkje lese fila: ${err?.message}`, 'error');
      }
    };

    reader.readAsText(file);
    if (importFileInputRef.current) importFileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Skjult input for JSON-filimport */}
        <input
          type="file"
          ref={importFileInputRef}
          onChange={handleImportJsonFile}
          accept=".json,application/json"
          className="hidden"
        />

        {/* ========================================================================= */}
        {/* TOPPLINJE                                                                 */}
        {/* ========================================================================= */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-100 leading-tight">
                Arkiv & Fildeling
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Oversikt over lagra samlingar og JSON-deling
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Statusmelding toast */}
        {statusMessage && (
          <div className={`px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 ${
            statusMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {statusMessage.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* HANDLINGSLINJE FOR FIL-EKSPORT OG IMPORT                                  */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col gap-3">
          <div className="text-xs text-stone-700 dark:text-stone-300">
            <span className="font-bold">Aktivt opplegg:</span> «{currentSession.title || 'Uten tittel'}»{' '}
            <span className="text-stone-500">({currentSession.blocks.length} blokker)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Last ned som fil (.json) */}
            <button
              type="button"
              onClick={() => handleDownloadSessionJson(currentSession)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:border-amber-500 text-stone-800 dark:text-stone-200 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              title="Last ned det aktive opplegget som .json-fil"
            >
              <Download className="w-3.5 h-3.5 text-amber-700" />
              <span>Last ned som fil (.json)</span>
            </button>

            {/* Importer opplegg (.json) */}
            <button
              type="button"
              onClick={() => importFileInputRef.current?.click()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
              title="Importer og opne eit samlingsopplegg frå ei .json-fil"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importer opplegg (.json)</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LISTE OVER LAGRA SAMLINGAR                                                */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-400 px-1">
            <span>Lagra samlingar på denne einheita</span>
            <span>{sessions.length} opplegg</span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-stone-400">
              Hentar lagra samlingar...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center space-y-2 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-3xl p-6">
              <BookOpen className="w-10 h-10 mx-auto text-stone-300 dark:text-stone-700" />
              <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                Ingen lagra opplegg enno
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Bygg eit opplegg på arbeidsbordet og trykk «Lagre», eller trykk «Importer opplegg (.json)» for å hente inn ei fil frå ein kollega.
              </p>
            </div>
          ) : (
            sessions.map((sess) => {
              const totalMins = calculateTotalMinutes(sess);
              return (
                <div
                  key={sess.id}
                  onClick={() => {
                    onLoadSession(sess);
                    onClose();
                  }}
                  className="p-3.5 sm:p-4 rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-amber-500 bg-white dark:bg-stone-950/60 shadow-xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors truncate">
                        {sess.title || 'Uten tittel'}
                      </h4>
                      {sess.subtitle && (
                        <span className="text-[11px] text-stone-400 truncate hidden sm:inline">
                          • {sess.subtitle}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>ca. {totalMins} min</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-stone-400" />
                        <span>{sess.blocks?.length || 0} blokker</span>
                      </span>
                      {sess.updatedAt && (
                        <span className="text-[11px] text-stone-400 hidden sm:inline">
                          Lagra {new Date(sess.updatedAt).toLocaleDateString('no-NO')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Last ned enkeltsamling (.json) */}
                    <button
                      type="button"
                      onClick={(e) => handleDownloadSessionJson(sess, e)}
                      className="p-2 rounded-xl text-stone-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer transition-colors"
                      title="Last ned dette opplegget som .json"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Slett samling */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(sess.id, e)}
                      className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                      title="Slett opplegg frå arkivet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Opne pil */}
                    <div className="p-2 rounded-xl text-stone-400 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================================= */}
        {/* BUNNLINJE                                                                 */}
        {/* ========================================================================= */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 flex items-center justify-between">
          <span className="text-[11px] text-stone-500">
            Format: Undervisningsbyggjar (.json)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};
