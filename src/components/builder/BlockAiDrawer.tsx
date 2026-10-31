/**
 * src/components/builder/BlockAiDrawer.tsx
 * Interaktiv høgreskuff (AI-assistent) for enkeltblokker OG Storyboard/Regi.
 * 
 * - Standard-modus: Sanntids samtale-flyt for å finjustere innhaldet i ei enkeltblokk.
 * - Storyboard-modus: Sparring og regi på heile samlinga (storyboard).
 * - Beheld eksisterande data non-destruktivt.
 * - Har «↩ Angre» (undo-stack) for å angre den siste justeringa med eitt klikk.
 */

import React, { useState, useEffect, useRef } from 'react';
import { TeachingBlock, BlockType, AiStoryboard } from '../../types';
import { BLOCK_METADATA, getBlockMetadata, normalizeBlockType } from '../../lib/undervisningDefaults';
import { 
  Sparkles, 
  X, 
  Send, 
  RotateCcw, 
  Loader2, 
  Bot, 
  User, 
  Lightbulb, 
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  MessagesSquare,
  HelpCircle,
  HeartHandshake,
  ListOrdered,
  BookMarked,
  PackageCheck,
  FileText,
  Compass
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isUndoNotice?: boolean;
}

interface BlockAiDrawerProps {
  block?: TeachingBlock | null;
  sessionTitle?: string;
  language?: 'nn' | 'nb';
  onClose: () => void;
  onUpdateBlockData?: (updatedData: any, newLeaderNotes?: string) => void;
  // Storyboard mode:
  storyboardMode?: boolean;
  storyboard?: AiStoryboard | null;
  isBuildingBlocks?: boolean;
  onUpdateStoryboard?: (updatedStoryboard: AiStoryboard) => void;
  onApproveStoryboard?: () => void;
}

export const BlockAiDrawer: React.FC<BlockAiDrawerProps> = ({
  block,
  sessionTitle = '',
  language = 'nn',
  onClose,
  onUpdateBlockData,
  storyboardMode = false,
  storyboard = null,
  isBuildingBlocks = false,
  onUpdateStoryboard,
  onApproveStoryboard,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialiser samtale når blokka eller storyboard byter
  useEffect(() => {
    setUndoStack([]);
    setError(null);
    setInputPrompt('');

    if (storyboardMode && storyboard) {
      setMessages([
        {
          id: `welcome_storyboard_${Date.now()}`,
          role: 'assistant',
          text: language === 'nb'
            ? 'Hva vil du justere på storyboardet? Skriv til meg her, så oppdaterer jeg fremvisningen og lederheftet.'
            : 'Kva vil du justere på storyboardet? Skriv til meg her, så oppdaterer eg framsyninga og leiarheftet.',
          timestamp: new Date(),
        },
      ]);
    } else if (block) {
      const meta = getBlockMetadata(block.type, language);
      const blockTitle = block.data?.title || block.title || meta?.label || (language === 'nb' ? 'blokken' : 'blokka');
      setMessages([
        {
          id: `welcome_${block.id}`,
          role: 'assistant',
          text: language === 'nb'
            ? `Hva vil du justere i «${blockTitle}»? Skriv til meg her, så oppdaterer jeg blokken.`
            : `Kva vil du justere i «${blockTitle}»? Skriv til meg her, så oppdaterer eg blokka.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [block?.id, storyboardMode, storyboard?.title, language]);

  // Rull automatisk til botnen når det kjem nye meldingar
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!storyboardMode && !block) return null;

  const safeType = block ? normalizeBlockType(block.type) : 'stikkord';
  const meta = block ? getBlockMetadata(safeType, language) : null;
  const blockTitle = storyboardMode 
    ? storyboard?.title || 'Storyboard & Regi' 
    : block?.data?.title || block?.title || meta?.label || 'Blokk';

  const handleSendPrompt = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    if (storyboardMode && storyboard) {
      // Storyboard Refinement Flow
      const currentSnapshot = JSON.parse(JSON.stringify(storyboard));
      setUndoStack((prev) => [...prev, currentSnapshot]);

      try {
        const resolvedLang = storyboard.language || language || 'nn';
        const response = await fetch('/api/storyboard/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentStoryboard: storyboard,
            lang: resolvedLang,
            language: resolvedLang,
            instruction: text,
            chatHistory: messages.slice(-6).map((m) => ({
              role: m.role,
              text: m.text,
            })),
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Kunne ikkje oppdatere storyboard.');
        }

        if (onUpdateStoryboard && result.updatedStoryboard) {
          onUpdateStoryboard(result.updatedStoryboard);
        }

        const assistantMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          text: result.replyMessage || 'Eg har oppdatert storyboardet etter ønsket ditt!',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        console.error('[BlockAiDrawer Storyboard] Feil:', err);
        setError(err?.message || 'Feil ved sending til AI.');
        const errorMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: `Det oppstod ein feil: ${err?.message || 'Kunne ikkje fullføre endringa'}. Du kan prøve på nytt eller angre.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } else if (block && onUpdateBlockData) {
      // Standard Block Refinement Flow
      const currentSnapshot = JSON.parse(JSON.stringify(block.data || {}));
      setUndoStack((prev) => [...prev, currentSnapshot]);

      try {
        const resolvedLang = storyboard?.language || language || 'nn';
        const response = await fetch('/api/gemini/refine-block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockType: block.type,
            currentData: block.data || {},
            lang: resolvedLang,
            language: resolvedLang,
            instruction: text,
            chatHistory: messages.slice(-6).map((m) => ({
              role: m.role,
              text: m.text,
            })),
            sessionTitle,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Kunne ikkje oppdatere blokka.');
        }

        onUpdateBlockData(result.updatedData);

        const assistantMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          text: result.replyMessage || 'Eg har oppdatert blokka etter ønsket ditt!',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        console.error('[BlockAiDrawer] Feil:', err);
        setError(err?.message || 'Feil ved sending til AI.');
        const errorMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: `Det oppstod ein feil: ${err?.message || 'Kunne ikkje fullføre endringa'}. Du kan prøve på nytt eller angre.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || isLoading) return;

    const previousSnapshot = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));

    if (storyboardMode && onUpdateStoryboard) {
      onUpdateStoryboard(previousSnapshot);
    } else if (block && onUpdateBlockData) {
      onUpdateBlockData(previousSnapshot);
    }

    const undoMsg: ChatMessage = {
      id: `undo_${Date.now()}`,
      role: 'assistant',
      text: '↩ Rulla tilbake til forrige versjon.',
      timestamp: new Date(),
      isUndoNotice: true,
    };
    setMessages((prev) => [...prev, undoMsg]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  return (
    <aside 
      className="w-full sm:w-80 md:w-84 lg:w-96 xl:w-[400px] shrink-0 border-l border-slate-200 bg-white h-full flex flex-col shadow-xl z-20 transition-all duration-300 animate-in slide-in-from-right duration-300 ease-in-out"
      aria-label="AI-assistent"
    >
      {/* 1. TOPPLINJE */}
      <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200/80 shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-sm font-semibold text-slate-900 truncate">
            AI-assistent
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {undoStack.length > 0 && (
            <button
              type="button"
              onClick={handleUndo}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Angre den siste AI-endringa"
            >
              <RotateCcw className="w-3 h-3 text-amber-700" />
              <span>Angre</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Lukk AI-assistent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. CHAT-MELDINGSOMRÅDE */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-slate-50/30 to-white">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-2xs ${
                  isUser
                    ? 'bg-slate-800 text-white'
                    : msg.isUndoNotice
                    ? 'bg-amber-200 text-amber-800'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : msg.isUndoNotice ? <RotateCcw className="w-3 h-3" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-xs'
                    : msg.isUndoNotice
                    ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-xs italic'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div className="text-[9px] mt-1 text-right text-slate-400">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2.5 items-start">
            <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs text-amber-900 shadow-2xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
              <span>{storyboardMode ? 'Justerer storyboardet sanntid...' : 'Forbetrar blokka non-destruktivt...'}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. TEKSTFELT OG GODKJENNINGSKNAPP */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50/60 shrink-0">
        {error && (
          <div className="mb-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
            <span className="truncate">{error}</span>
          </div>
        )}

        <div className="relative flex items-end bg-white border border-slate-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200 rounded-xl shadow-2xs transition-all">
          <textarea
            ref={inputRef}
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={
              storyboardMode
                ? 'Skriv kva du vil endre i storyboardet... (Enter for å sende)'
                : `Skriv kva du vil endre i «${blockTitle}»... (Enter for å sende)`
            }
            className="w-full px-3 py-2 text-xs text-slate-800 placeholder-slate-400 bg-transparent resize-none focus:outline-none max-h-28"
          />

          <div className="p-1.5">
            <button
              type="button"
              onClick={() => handleSendPrompt()}
              disabled={!inputPrompt.trim() || isLoading}
              className="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white disabled:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs shrink-0 flex items-center justify-center"
              title="Send instruks til AI"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
