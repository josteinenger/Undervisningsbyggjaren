/**
 * src/components/builder/FullPresenterModal.tsx
 * 
 * Fullskjerms framsyning for kyrkjerom, leir og samlingar:
 * 1. Storskjerm (publikum):
 *    - Fullbreidde 90–95 % storskjerm layout utan ubenytta svarte/kvite rammer.
 *    - Veksle mellom mørk og lys storskjerm-bakgrunn med «Mørk / Lyst 🌗»-knappen.
 *    - Diskrete, svakt synlege grå symboler i øvste høgre hjørne (fullskjerm F11, leiarvisning, lukk Esc).
 * 2. Kvit Leiarvisning (foredragshaldar basert på brukers skisse):
 *    - ALLTID kvit/lys bakgrunn (bg-stone-100 text-stone-900).
 *    - Left column (~25-30%): Un-cropped 16:9 STORSKJERMBILDE preview box øverst, og vertikal strøym med miniatyrbilete av DEI NESTE BILDENE under.
 *    - Right column (~70-75% - 3/4 av skjermen): Dominerande STIKKORD med stor, leseleg skrift (24pt+).
 *    - Klikk på eit stikkord utvidar kortet rett under med fyldigare manus / «kjøtt på beinet» (Accordion).
 *    - Knappen «Bytt skjerm ⇄» byter skjermroller i sanntid via BroadcastChannel dersom visingane opnar feil veg.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  TeachingSession, 
  TeachingBlock, 
  SangSalmeData, 
  QuizData,
  HenteleikData,
  KimsLeikData,
  KimsLeikItem,
  ReisDegData,
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
  SamtaleData,
  StikkordPoint,
  SvartSkjermData,
} from '../../types';
import { BLOCK_METADATA } from '../../lib/undervisningDefaults';
import { calculateSlideTextScale, isRawFileName, getCleanCaption } from '../../lib/presentationUtils';
import { getItemGraphic } from '../../lib/kimsLeikUtils';
import { parseVideoUrl, formatSecondsToMinSec } from '../../lib/videoUtils';
import { AutoFitSlideText } from './AutoFitSlideText';
import { SeamlessCrossfadeSlideshow } from './SeamlessCrossfadeSlideshow';
import { ProjectorScreenIcon, launchPresenterOnScreens, openAudienceWindowManual } from '../../lib/screenUtils';
import { generateChaosPermutation, getPuzzleGridDimension } from '../../lib/kaosPuslespillUtils';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Flame, 
  Tv, 
  Mic,
  Zap,
  Trophy,
  Users,
  AlertCircle,
  HelpCircle,
  Target,
  ListOrdered,
  BookOpen,
  KeyRound,
  Package,
  MessageSquare,
  ExternalLink,
  Maximize,
  Minimize,
  EyeOff,
  Eye,
  Clock,
  RefreshCw,
  SunMoon,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle,
  Music,
  GraduationCap,
  Brain,
  ArrowUpDown,
  LayoutGrid,
  Music2,
  Type,
  Image as ImageIcon,
  Puzzle,
  Sparkles,
  MonitorOff,
  Palette,
  Turtle,
  Footprints,
  Rabbit
} from 'lucide-react';

export type PuzzlePhase = 'idle' | 'revealing' | 'paused' | 'all_revealed' | 'solved';
export type BigScreenPalette =
  | 'bw'
  | 'neon'
  | 'nordic'
  | 'amber'
  | 'burgundy'
  | 'midnight'
  | 'terracotta'
  | 'mocha'
  | 'violet';
export type BigScreenSpeed = 'slow' | 'normal' | 'fast';

export const PALETTE_CONFIGS: Record<BigScreenPalette, {
  name: string;
  dots: string[]; // 2 sirklar for bw, 3 sirklar for resten
  dark: {
    bg: string;
    cardBg: string;
    accent: string;
    glow: string;
    badgeBg: string;
    text: string;
    subtle: string;
  };
  light: {
    bg: string;
    cardBg: string;
    accent: string;
    glow: string;
    badgeBg: string;
    text: string;
    subtle: string;
  };
}> = {
  bw: {
    name: 'Monokrom',
    dots: ['#09090b', '#ffffff'],
    dark: {
      bg: '#050505',
      cardBg: 'rgba(255, 255, 255, 0.04)',
      accent: '#ffffff',
      glow: 'rgba(255, 255, 255, 0.25)',
      badgeBg: '#27272a',
      text: '#ffffff',
      subtle: 'rgba(255, 255, 255, 0.15)',
    },
    light: {
      bg: '#fafafa',
      cardBg: '#ffffff',
      accent: '#09090b',
      glow: 'rgba(0, 0, 0, 0.08)',
      badgeBg: '#e4e4e7',
      text: '#09090b',
      subtle: 'rgba(0, 0, 0, 0.12)',
    },
  },
  neon: {
    name: 'Futuristisk',
    dots: ['#d946ef', '#06b6d4', '#a855f7'],
    dark: {
      bg: '#07050d',
      cardBg: 'rgba(46, 16, 101, 0.22)',
      accent: '#d946ef',
      glow: 'rgba(217, 70, 239, 0.4)',
      badgeBg: '#3b0764',
      text: '#ffffff',
      subtle: 'rgba(6, 182, 212, 0.22)',
    },
    light: {
      bg: '#fdf4ff',
      cardBg: '#ffffff',
      accent: '#c026d3',
      glow: 'rgba(192, 38, 211, 0.15)',
      badgeBg: '#fae8ff',
      text: '#2e1065',
      subtle: 'rgba(192, 38, 211, 0.18)',
    },
  },
  nordic: {
    name: 'Kjøleg nordisk',
    dots: ['#38bdf8', '#0284c7', '#082f49'],
    dark: {
      bg: '#040d1a',
      cardBg: 'rgba(8, 47, 73, 0.25)',
      accent: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.38)',
      badgeBg: '#0c4a6e',
      text: '#ffffff',
      subtle: 'rgba(56, 189, 248, 0.2)',
    },
    light: {
      bg: '#f0f9ff',
      cardBg: '#ffffff',
      accent: '#0284c7',
      glow: 'rgba(2, 132, 199, 0.15)',
      badgeBg: '#e0f2fe',
      text: '#082f49',
      subtle: 'rgba(2, 132, 199, 0.18)',
    },
  },
  amber: {
    name: 'Varm glød',
    dots: ['#fbbf24', '#f59e0b', '#b45309'],
    dark: {
      bg: '#0f0804',
      cardBg: 'rgba(69, 26, 3, 0.25)',
      accent: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.38)',
      badgeBg: '#78350f',
      text: '#ffffff',
      subtle: 'rgba(245, 158, 11, 0.2)',
    },
    light: {
      bg: '#fffbeb',
      cardBg: '#ffffff',
      accent: '#d97706',
      glow: 'rgba(217, 119, 6, 0.15)',
      badgeBg: '#fef3c7',
      text: '#451a03',
      subtle: 'rgba(217, 119, 6, 0.18)',
    },
  },
  burgundy: {
    name: 'Klassisk djup',
    dots: ['#f43f5e', '#be123c', '#4c0519'],
    dark: {
      bg: '#0f0407',
      cardBg: 'rgba(76, 5, 25, 0.28)',
      accent: '#fb7185',
      glow: 'rgba(251, 113, 133, 0.36)',
      badgeBg: '#881337',
      text: '#ffffff',
      subtle: 'rgba(251, 113, 133, 0.2)',
    },
    light: {
      bg: '#fff1f2',
      cardBg: '#ffffff',
      accent: '#be123c',
      glow: 'rgba(190, 18, 60, 0.15)',
      badgeBg: '#ffe4e6',
      text: '#4c0519',
      subtle: 'rgba(190, 18, 60, 0.18)',
    },
  },
  midnight: {
    name: 'Midnatt',
    dots: ['#60a5fa', '#2563eb', '#172554'],
    dark: {
      bg: '#030712',
      cardBg: 'rgba(23, 37, 84, 0.3)',
      accent: '#60a5fa',
      glow: 'rgba(96, 165, 250, 0.38)',
      badgeBg: '#1e3a8a',
      text: '#ffffff',
      subtle: 'rgba(96, 165, 250, 0.2)',
    },
    light: {
      bg: '#eff6ff',
      cardBg: '#ffffff',
      accent: '#2563eb',
      glow: 'rgba(37, 99, 235, 0.15)',
      badgeBg: '#dbeafe',
      text: '#172554',
      subtle: 'rgba(37, 99, 235, 0.18)',
    },
  },
  terracotta: {
    name: 'Jordleg',
    dots: ['#fb923c', '#ea580c', '#7c2d12'],
    dark: {
      bg: '#120805',
      cardBg: 'rgba(124, 45, 18, 0.26)',
      accent: '#fb923c',
      glow: 'rgba(251, 146, 60, 0.36)',
      badgeBg: '#7c2d12',
      text: '#ffffff',
      subtle: 'rgba(251, 146, 60, 0.2)',
    },
    light: {
      bg: '#fff7ed',
      cardBg: '#ffffff',
      accent: '#c2410c',
      glow: 'rgba(194, 65, 12, 0.15)',
      badgeBg: '#ffedd5',
      text: '#431407',
      subtle: 'rgba(194, 65, 12, 0.18)',
    },
  },
  mocha: {
    name: 'Kaffi / Sjokolade',
    dots: ['#e6ccb2', '#b08968', '#432818'],
    dark: {
      bg: '#0e0906',
      cardBg: 'rgba(67, 40, 24, 0.3)',
      accent: '#ddb892',
      glow: 'rgba(221, 184, 146, 0.34)',
      badgeBg: '#582f0e',
      text: '#ffffff',
      subtle: 'rgba(221, 184, 146, 0.2)',
    },
    light: {
      bg: '#faf6f2',
      cardBg: '#ffffff',
      accent: '#7f4f24',
      glow: 'rgba(127, 79, 36, 0.15)',
      badgeBg: '#ede0d4',
      text: '#38220f',
      subtle: 'rgba(127, 79, 36, 0.18)',
    },
  },
  violet: {
    name: 'Reint lilla',
    dots: ['#c084fc', '#9333ea', '#3b0764'],
    dark: {
      bg: '#08040f',
      cardBg: 'rgba(59, 7, 100, 0.26)',
      accent: '#c084fc',
      glow: 'rgba(192, 132, 252, 0.38)',
      badgeBg: '#4c1d95',
      text: '#ffffff',
      subtle: 'rgba(192, 132, 252, 0.2)',
    },
    light: {
      bg: '#faf5ff',
      cardBg: '#ffffff',
      accent: '#7e22ce',
      glow: 'rgba(126, 34, 206, 0.15)',
      badgeBg: '#f3e8ff',
      text: '#2e1065',
      subtle: 'rgba(126, 34, 206, 0.18)',
    },
  },
};

// FART-FAKTORAR (Sekund)
// Rask = i dag (ca. 0.5s border-trace)
// Normal (default) = +0.4s saktere (ca. 0.9s border-trace)
// Sakte = +1.0s saktere enn i dag (ca. 1.5s border-trace)
export const SPEED_DURATIONS: Record<BigScreenSpeed, {
  border: number;
  badge: number;
  text: number;
  slide: number;
}> = {
  fast: { border: 0.5, badge: 0.3, text: 0.35, slide: 0.35 },
  normal: { border: 0.9, badge: 0.45, text: 0.5, slide: 0.5 },
  slow: { border: 1.5, badge: 0.7, text: 0.8, slide: 0.75 },
};

interface FullPresenterModalProps {
  session: TeachingSession;
  initialBlockIndex?: number;
  initialViewMode?: 'audience' | 'leader';
  onClose: () => void;
}

// Skalert 16:9-container for ubeskåren forhandsvisning i leiarvisning (stabil utan state-re-renders)
const ScaledPreviewBox: React.FC<{ isLight?: boolean; children: React.ReactNode }> = ({
  isLight = false,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    const updateScale = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width > 0) {
        const scaleX = Math.max(0.05, (width - 6) / 1440);
        const scaleY = height > 0 ? Math.max(0.05, (height - 6) / 810) : scaleX;
        const safeScale = Math.min(scaleX, scaleY);
        inner.style.transform = `scale(${safeScale})`;
      }
    };

    updateScale();
    const observer = new ResizeObserver(() => {
      updateScale();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`aspect-video w-full rounded-xl overflow-hidden relative flex items-center justify-center p-1 select-none transition-colors duration-200 ${
        isLight
          ? 'bg-zinc-50 border border-zinc-200/90 shadow-sm ring-1 ring-zinc-900/5'
          : 'bg-[#09090b] border border-zinc-800 shadow-md ring-1 ring-white/10'
      }`}
    >
      <div
        ref={innerRef}
        style={{
          width: '1440px',
          height: '810px',
          transform: 'scale(0.22)',
          transformOrigin: 'center center',
        }}
        className="shrink-0 flex items-center justify-center overflow-hidden rounded-lg will-change-transform"
      >
        {children}
      </div>
    </div>
  );
};

export const FullPresenterModal: React.FC<FullPresenterModalProps> = ({
  session,
  initialBlockIndex = 0,
  initialViewMode = 'leader',
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
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
    return Math.max(0, Math.min(initialBlockIndex, Math.max(0, session.blocks.length - 1)));
  });
  const [isBlackout, setIsBlackout] = useState(false);
  const [viewMode, setViewMode] = useState<'audience' | 'leader'>(initialViewMode);
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const [audienceTheme, setAudienceTheme] = useState<'dark' | 'light'>('dark');
  const [palette, setPalette] = useState<BigScreenPalette>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('storskjerm_palette') as BigScreenPalette | null;
      if (saved && saved in PALETTE_CONFIGS) return saved;
    }
    return 'bw';
  });
  const [speed, setSpeed] = useState<BigScreenSpeed>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('storskjerm_speed') as BigScreenSpeed | null;
      if (saved && saved in SPEED_DURATIONS) return saved;
    }
    return 'normal';
  });
  const [isPaletteMenuOpen, setIsPaletteMenuOpen] = useState(false);
  const paletteMenuRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lukk palett- og fartsmeny ved klikk utanfor
  useEffect(() => {
    if (!isPaletteMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteMenuRef.current && !paletteMenuRef.current.contains(e.target as Node)) {
        setIsPaletteMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPaletteMenuOpen]);

  // Ref for unikt vindauge-ID for å hindre at BroadcastChannel slår tilbake på seg sjølv
  const windowIdRef = useRef<string>(`win_${Math.random().toString().substring(2, 7)}`);
  // Stabil BroadcastChannel-referanse som held kanalen open utan hyppig oppretting/lukking
  const bcRef = useRef<BroadcastChannel | null>(null);

  const postPresenterMessage = useCallback((msg: any) => {
    if (typeof window !== 'undefined' && bcRef.current) {
      try {
        bcRef.current.postMessage({
          ...msg,
          senderId: windowIdRef.current,
        });
      } catch (e) {
        console.warn('BroadcastChannel postMessage error:', e);
      }
    }
  }, []);

  const handleSelectPalette = useCallback((nextPalette: BigScreenPalette) => {
    setPalette(nextPalette);
    if (typeof window !== 'undefined') {
      localStorage.setItem('storskjerm_palette', nextPalette);
    }
    postPresenterMessage({
      type: 'UPDATE_THEME',
      palette: nextPalette,
      speed,
    });
  }, [speed, postPresenterMessage]);

  const handleSelectSpeed = useCallback((nextSpeed: BigScreenSpeed) => {
    setSpeed(nextSpeed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('storskjerm_speed', nextSpeed);
    }
    postPresenterMessage({
      type: 'UPDATE_THEME',
      palette,
      speed: nextSpeed,
    });
  }, [palette, postPresenterMessage]);

  // Sub-steg for vers, undervisnings-punkter, quiz-spørsmål og lysbildevising
  const [activeVerseIndex, setActiveVerseIndex] = useState(0);
  const [activePointIndex, setActivePointIndex] = useState(0);
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [quizShowAnswer, setQuizShowAnswer] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState<boolean>(true);
  const [slideshowIntervalSeconds, setSlideshowIntervalSeconds] = useState<number>(3);

  // Video-avspeling og lydstyring for storskjerm
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const videoIframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const handleToggleVideoPlay = useCallback(() => {
    setIsVideoPlaying((prev) => {
      const next = !prev;
      if (bcRef.current) {
        bcRef.current.postMessage({
          type: 'VIDEO_PLAY_PAUSE',
          senderId: windowIdRef.current,
          isPlaying: next,
        });
      }
      return next;
    });
  }, []);

  const handleToggleVideoMute = useCallback(() => {
    setIsVideoMuted((prev) => {
      const next = !prev;
      if (bcRef.current) {
        bcRef.current.postMessage({
          type: 'VIDEO_MUTE_TOGGLE',
          senderId: windowIdRef.current,
          isMuted: next,
        });
      }
      return next;
    });
  }, []);

  const currentBlock: TeachingBlock | undefined = session.blocks[currentIndex];
  const currentBlockRef = useRef(currentBlock);
  currentBlockRef.current = currentBlock;
  const nextBlock: TeachingBlock | undefined = session.blocks[currentIndex + 1];
  const meta = currentBlock ? BLOCK_METADATA[currentBlock.type] : null;

  // Referansar og effekter for automatisk skrolling i leiarpanelet
  const leaderScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLeaderItemRef = useRef<HTMLDivElement | null>(null);

  // 1. Mjuk autoskroll til aktivt kort når storskjerm skrider fram (direkte på behaldar, unngå scrollIntoView-risting)
  useEffect(() => {
    if (currentBlock?.type === 'lysbileteshow') return; // Ikkje rull skjermen for lysbileteseriar
    if (viewMode === 'leader' && activeLeaderItemRef.current && leaderScrollContainerRef.current) {
      const timer = setTimeout(() => {
        const container = leaderScrollContainerRef.current;
        const item = activeLeaderItemRef.current;
        if (!container || !item) return;
        const targetScrollTop = item.offsetTop - container.clientHeight / 2 + item.clientHeight / 2;
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth',
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activePointIndex, activeVerseIndex, currentSlideIndex, viewMode, currentBlock]);

  // 2. Nullstill skrollposisjon til toppen når ein skiftar til eit heilt nytt ledd, samt nullstill videostatus
  useEffect(() => {
    if (viewMode === 'leader' && leaderScrollContainerRef.current) {
      leaderScrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    setIsVideoPlaying(true);
    setIsVideoMuted(false);
  }, [currentIndex, viewMode]);

  // Kims Leik, Beat for beat og Kven skal ut interaktiv avdekking/gissing
  const [kimsRevealedMap, setKimsRevealedMap] = useState<Record<number, boolean>>({});
  const [beatRevealedMap, setBeatRevealedMap] = useState<Record<number, boolean>>({});
  const [showBeatSolution, setShowBeatSolution] = useState<boolean>(false);
  const [kvenSelectedOption, setKvenSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [shakeOption, setShakeOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [kvenRevealedMap, setKvenRevealedMap] = useState<Record<number, boolean>>({});
  const [kvenGreenMap, setKvenGreenMap] = useState<Record<number, boolean>>({});
  const [expandedKeywordIds, setExpandedKeywordIds] = useState<Record<string, boolean>>({});

  // Henteleiken poengbørs (lagsignal -> poeng)
  const [henteleikScores, setHenteleikScores] = useState<Record<number, number>>({});

  // Klokkeslett i sanntid
  const [currentTime, setCurrentTime] = useState<string>('');

  // Timer-tilstand for leik / samtale / stoppeklokke
  const [timerSeconds, setTimerSeconds] = useState(180);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Rein lineær tilstandsmaskin for Kaos-puslespill: 'idle' | 'revealing' | 'paused' | 'solved'
  const [puzzlePhase, setPuzzlePhase] = useState<PuzzlePhase>('idle');
  const [puzzleRevealedCount, setPuzzleRevealedCount] = useState<number>(0);
  const [puzzleSeed, setPuzzleSeed] = useState<number>(42);
  const [puzzleImageAspect, setPuzzleImageAspect] = useState<number | null>(null);

  // Referansar for nøyaktig 30,0 sekund reell klokketid
  const puzzleStartTimeRef = useRef<number | null>(null);
  const puzzleElapsedPauseRef = useRef<number>(0);

  // Styre video-avspeling og lyd på storskjerm i sanntid via postMessage / Video API
  useEffect(() => {
    if (!currentBlock || currentBlock.type !== 'video') return;
    const vData = currentBlock.data as any;
    const videoInfo = parseVideoUrl(vData.videoUrl, vData.startTimeSeconds, vData.stopTimeSeconds, true);

    if (videoInfo.type === 'youtube') {
      const playCmd = isVideoPlaying ? 'playVideo' : 'pauseVideo';
      videoIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: playCmd, args: [] }),
        '*'
      );
      const muteCmd = isVideoMuted ? 'mute' : 'unMute';
      videoIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: muteCmd, args: [] }),
        '*'
      );
    } else if (videoInfo.type === 'vimeo') {
      videoIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ method: isVideoPlaying ? 'play' : 'pause' }),
        '*'
      );
      videoIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ method: 'setVolume', value: isVideoMuted ? 0 : 1 }),
        '*'
      );
    } else if (videoInfo.type === 'html5' && videoElementRef.current) {
      if (isVideoPlaying) {
        videoElementRef.current.play().catch(() => {});
      } else {
        videoElementRef.current.pause();
      }
      videoElementRef.current.muted = isVideoMuted;
    }
  }, [isVideoPlaying, isVideoMuted, currentBlock]);

  // Rekn ut proporsjonane (aspect ratio) til biletet i Kaos-puslespill for å hindre forvrenging
  useEffect(() => {
    if (currentBlock?.type !== 'bilete_avdekking') return;
    const bData = currentBlock.data as BileteAvdekkingData;
    if (!bData?.imageUrl) {
      setPuzzleImageAspect(16 / 9);
      return;
    }

    const img = new Image();
    const applyAspect = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setPuzzleImageAspect(img.naturalWidth / img.naturalHeight);
      }
    };

    img.onload = applyAspect;
    img.src = bData.imageUrl;

    // Cache-sikring: Viss biletet allereie er i nettlesar-minnet (complete),
    // set aspekt-ratio momentant for å hindre unødig layoutskift eller manglande oppdatering:
    if (img.complete && img.naturalWidth && img.naturalHeight) {
      applyAspect();
    }
  }, [currentBlock]);

  // Kaos-puslespill: Handlers som sender éin hending i staden for 25fps brikketeljing
  const handleStartPuzzle = useCallback(() => {
    if (currentBlock?.type !== 'bilete_avdekking') return;
    const d = currentBlock.data as BileteAvdekkingData;
    const gridSize = d.gridSize || 100;
    const now = Date.now();
    puzzleStartTimeRef.current = now;
    setPuzzlePhase('revealing');
    postPresenterMessage({
      type: 'PUZZLE_START',
      startTime: now,
      elapsedPause: puzzleElapsedPauseRef.current,
      durationMs: 30000,
      seed: puzzleSeed,
      gridSize,
    });
  }, [currentBlock, puzzleSeed, postPresenterMessage]);

  const handlePausePuzzle = useCallback(() => {
    if (currentBlock?.type !== 'bilete_avdekking') return;
    let currentElapsed = puzzleElapsedPauseRef.current;
    if (puzzleStartTimeRef.current !== null) {
      currentElapsed += Date.now() - puzzleStartTimeRef.current;
      puzzleElapsedPauseRef.current = currentElapsed;
      puzzleStartTimeRef.current = null;
    }
    setPuzzlePhase('paused');
    postPresenterMessage({
      type: 'PUZZLE_PAUSE',
      elapsedPause: currentElapsed,
    });
  }, [currentBlock, postPresenterMessage]);

  // Vis alle brikker i kaos utan å samle dei (Fase 'all_revealed')
  const handleRevealAllPuzzle = useCallback(() => {
    if (currentBlock?.type !== 'bilete_avdekking') return;
    const d = currentBlock.data as BileteAvdekkingData;
    const gridSize = d.gridSize || 100;
    puzzleStartTimeRef.current = null;
    setPuzzleRevealedCount(gridSize);
    setPuzzlePhase('all_revealed');
    postPresenterMessage({
      type: 'PUZZLE_ALL_REVEALED',
    });
  }, [currentBlock, postPresenterMessage]);

  // Vis fasit og samle brikkene (Fase 'solved')
  const handleSolvePuzzle = useCallback(() => {
    if (currentBlock?.type !== 'bilete_avdekking') return;
    const d = currentBlock.data as BileteAvdekkingData;
    const gridSize = d.gridSize || 100;
    puzzleStartTimeRef.current = null;
    setPuzzleRevealedCount(gridSize);
    setPuzzlePhase('solved');
    postPresenterMessage({
      type: 'PUZZLE_SOLVE',
    });
  }, [currentBlock, postPresenterMessage]);

  // Kaos-puslespill: Både leiar- og publikumsvindauget reknar ut framdrifta sjølvstendig og lokalt utan BroadcastChannel-spam
  useEffect(() => {
    if (puzzlePhase !== 'revealing' || currentBlock?.type !== 'bilete_avdekking') {
      return;
    }

    const d = currentBlock.data as BileteAvdekkingData;
    const gridSize = d.gridSize || 100;
    const TOTAL_DURATION_MS = 30000;

    if (puzzleStartTimeRef.current === null) {
      puzzleStartTimeRef.current = Date.now();
    }

    const interval = setInterval(() => {
      if (puzzleStartTimeRef.current === null) return;
      const now = Date.now();
      const elapsedMs = (now - puzzleStartTimeRef.current) + puzzleElapsedPauseRef.current;
      const progressRatio = Math.min(1, elapsedMs / TOTAL_DURATION_MS);
      const targetCount = Math.floor(progressRatio * gridSize);

      setPuzzleRevealedCount((prev) => {
        if (prev === targetCount) return prev;
        return targetCount;
      });

      if (progressRatio >= 1) {
        setPuzzleRevealedCount(gridSize);
        setPuzzlePhase('all_revealed');
        puzzleStartTimeRef.current = null;
        postPresenterMessage({ type: 'PUZZLE_ALL_REVEALED' });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [puzzlePhase, currentBlock, postPresenterMessage]);

  // Oppdater live klokke
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${h}:${m}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const leaderStateRef = useRef<any>({});
  leaderStateRef.current = {
    currentIndex,
    isBlackout,
    audienceTheme,
    palette,
    speed,
    timerSeconds,
    isTimerRunning,
    activeVerseIndex,
    activePointIndex,
    quizQuestionIndex,
    quizShowAnswer,
    currentSlideIndex,
    isSlideshowPlaying,
    slideshowIntervalSeconds,
    kimsRevealedMap,
    beatRevealedMap,
    showBeatSolution,
    henteleikScores,
    kvenRevealedMap,
    kvenGreenMap,
    puzzlePhase,
    puzzleSeed,
    isVideoPlaying,
    isVideoMuted,
  };

  const handleKvenOptionClick = useCallback((letter: 'A' | 'B' | 'C' | 'D', correctOption: string, taskIdx: number) => {
    const isCorrect = letter === correctOption;
    if (isCorrect) {
      setKvenGreenMap((prev) => ({ ...prev, [taskIdx]: true }));
      setTimeout(() => {
        setQuizShowAnswer(true);
        setKvenRevealedMap((prev) => ({ ...prev, [taskIdx]: true }));
        setKvenGreenMap((prev) => ({ ...prev, [taskIdx]: false }));
      }, 380);
    } else {
      setShakeOption(letter);
      setTimeout(() => setShakeOption(null), 550);
    }

    if (bcRef.current) {
      bcRef.current.postMessage({
        type: 'KVEN_GUESS_OPTION',
        senderId: windowIdRef.current,
        letter,
        isCorrect,
        taskIdx,
      });
    }
  }, []);

  const handleKvenSelectTask = useCallback((taskIdx: number) => {
    setActivePointIndex(taskIdx);
    setQuizShowAnswer(kvenRevealedMap[taskIdx] ?? false);
    setShakeOption(null);
    setKvenSelectedOption(null);
    if (bcRef.current) {
      bcRef.current.postMessage({
        type: 'KVEN_SELECT_TASK',
        senderId: windowIdRef.current,
        taskIdx,
      });
    }
  }, [kvenRevealedMap]);

  // BroadcastChannel for sanntidssynkronisering mellom leiarvindauge og publikumsvindauge
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const bc = new BroadcastChannel('undervisning_presenter_channel');
    bcRef.current = bc;

    // Handtrykk: Dersom dette vindauget monterer i publikumsvisning, be leiarvisinga om å synkronisere noverande tilstand straks
    let retryTimer: any = null;
    if (viewModeRef.current === 'audience') {
      bc.postMessage({ type: 'REQUEST_SYNC', senderId: windowIdRef.current });
      retryTimer = setTimeout(() => {
        if (bcRef.current && viewModeRef.current === 'audience') {
          bcRef.current.postMessage({ type: 'REQUEST_SYNC', senderId: windowIdRef.current });
        }
      }, 200);
    }

    bc.onmessage = (event) => {
      if (!event.data) return;
      if (event.data.senderId === windowIdRef.current) return; // Ignorer eigne meldingar

      // Respons på handtrykk frå publikumsvindauge
      if (event.data.type === 'REQUEST_SYNC') {
        if (viewModeRef.current === 'leader' && bcRef.current) {
          bcRef.current.postMessage({
            type: 'SYNC_STATE',
            senderId: windowIdRef.current,
            ...leaderStateRef.current,
          });
        }
        return;
      }

      if (event.data.type === 'TOGGLE_BLACKOUT') {
        if (typeof event.data.isBlackout === 'boolean') {
          setIsBlackout(event.data.isBlackout);
        } else {
          setIsBlackout((prev) => !prev);
        }
        return;
      }

      if (event.data.type === 'REMOTE_NEXT') {
        if (viewModeRef.current === 'leader') {
          handleNext();
        }
        return;
      }
      if (event.data.type === 'REMOTE_PREV') {
        if (viewModeRef.current === 'leader') {
          handlePrev();
        }
        return;
      }
      if (event.data.type === 'REMOTE_JUMP_NEXT') {
        if (viewModeRef.current === 'leader') {
          handleJumpNextBlock();
        }
        return;
      }
      if (event.data.type === 'REMOTE_JUMP_PREV') {
        if (viewModeRef.current === 'leader') {
          handleJumpPrevBlock();
        }
        return;
      }
      if (event.data.type === 'VIDEO_PLAY_PAUSE') {
        if (typeof event.data.isPlaying === 'boolean') {
          setIsVideoPlaying(event.data.isPlaying);
        }
        return;
      }
      if (event.data.type === 'VIDEO_MUTE_TOGGLE') {
        if (typeof event.data.isMuted === 'boolean') {
          setIsVideoMuted(event.data.isMuted);
        }
        return;
      }
      if (event.data.type === 'KVEN_GUESS_OPTION') {
        const { letter, isCorrect, taskIdx } = event.data;
        if (typeof taskIdx === 'number') {
          setActivePointIndex(taskIdx);
        }
        if (isCorrect) {
          setKvenGreenMap((prev) => ({ ...prev, [taskIdx]: true }));
          setTimeout(() => {
            setQuizShowAnswer(true);
            if (typeof taskIdx === 'number') {
              setKvenRevealedMap((prev) => ({ ...prev, [taskIdx]: true }));
              setKvenGreenMap((prev) => ({ ...prev, [taskIdx]: false }));
            }
          }, 380);
        } else {
          setShakeOption(letter);
          setTimeout(() => setShakeOption(null), 550);
        }
        return;
      }
      if (event.data.type === 'KVEN_RESET_TASK') {
        const { taskIdx } = event.data;
        setQuizShowAnswer(false);
        setShakeOption(null);
        setKvenSelectedOption(null);
        if (typeof taskIdx === 'number') {
          setKvenRevealedMap((prev) => ({ ...prev, [taskIdx]: false }));
          setKvenGreenMap((prev) => ({ ...prev, [taskIdx]: false }));
        }
        return;
      }
      if (event.data.type === 'KVEN_SELECT_TASK') {
        const { taskIdx } = event.data;
        if (typeof taskIdx === 'number') {
          setActivePointIndex(taskIdx);
          setQuizShowAnswer(false);
          setShakeOption(null);
          setKvenSelectedOption(null);
          setKvenGreenMap((prev) => ({ ...prev, [taskIdx]: false }));
        }
        return;
      }

      if (event.data.type === 'UPDATE_THEME') {
        if (event.data.palette && event.data.palette in PALETTE_CONFIGS) {
          setPalette(event.data.palette);
          localStorage.setItem('storskjerm_palette', event.data.palette);
        }
        if (event.data.speed && event.data.speed in SPEED_DURATIONS) {
          setSpeed(event.data.speed);
          localStorage.setItem('storskjerm_speed', event.data.speed);
        }
        return;
      }

      if (event.data.type === 'SYNC_STATE') {
        if (typeof event.data.currentIndex === 'number') {
          setCurrentIndex(event.data.currentIndex);
        }
        if (typeof event.data.isBlackout === 'boolean') {
          setIsBlackout(event.data.isBlackout);
        }
        if (event.data.audienceTheme) {
          setAudienceTheme(event.data.audienceTheme);
        }
        if (event.data.palette && event.data.palette in PALETTE_CONFIGS) {
          setPalette(event.data.palette);
          localStorage.setItem('storskjerm_palette', event.data.palette);
        }
        if (event.data.speed && event.data.speed in SPEED_DURATIONS) {
          setSpeed(event.data.speed);
          localStorage.setItem('storskjerm_speed', event.data.speed);
        }
        if (typeof event.data.timerSeconds === 'number') {
          setTimerSeconds(event.data.timerSeconds);
        }
        if (typeof event.data.isTimerRunning === 'boolean') {
          setIsTimerRunning(event.data.isTimerRunning);
        }
        if (typeof event.data.activeVerseIndex === 'number') {
          setActiveVerseIndex(event.data.activeVerseIndex);
        }
        if (typeof event.data.activePointIndex === 'number') {
          setActivePointIndex(event.data.activePointIndex);
        }
        if (typeof event.data.quizQuestionIndex === 'number') {
          setQuizQuestionIndex(event.data.quizQuestionIndex);
        }
        if (typeof event.data.quizShowAnswer === 'boolean') {
          setQuizShowAnswer(event.data.quizShowAnswer);
        }
        if (typeof event.data.currentSlideIndex === 'number') {
          setCurrentSlideIndex(event.data.currentSlideIndex);
        }
        if (typeof event.data.isSlideshowPlaying === 'boolean') {
          setIsSlideshowPlaying(event.data.isSlideshowPlaying);
        }
        if (typeof event.data.slideshowIntervalSeconds === 'number') {
          setSlideshowIntervalSeconds(event.data.slideshowIntervalSeconds);
        }
        if (event.data.kimsRevealedMap && typeof event.data.kimsRevealedMap === 'object') {
          setKimsRevealedMap(event.data.kimsRevealedMap);
        }
        if (event.data.beatRevealedMap && typeof event.data.beatRevealedMap === 'object') {
          setBeatRevealedMap(event.data.beatRevealedMap);
        }
        if (typeof event.data.showBeatSolution === 'boolean') {
          setShowBeatSolution(event.data.showBeatSolution);
        }
        if (event.data.henteleikScores && typeof event.data.henteleikScores === 'object') {
          setHenteleikScores(event.data.henteleikScores);
        }
        if (event.data.kvenRevealedMap && typeof event.data.kvenRevealedMap === 'object') {
          setKvenRevealedMap(event.data.kvenRevealedMap);
        }
        if (event.data.puzzlePhase) {
          setPuzzlePhase(event.data.puzzlePhase);
          if (event.data.puzzlePhase === 'all_revealed' || event.data.puzzlePhase === 'solved') {
            const b = currentBlockRef.current;
            const gSize = (b?.data as BileteAvdekkingData)?.gridSize || 100;
            setPuzzleRevealedCount(gSize);
          }
        }
        if (typeof event.data.puzzleSeed === 'number') {
          setPuzzleSeed(event.data.puzzleSeed);
        }
        if (typeof event.data.isVideoPlaying === 'boolean') {
          setIsVideoPlaying(event.data.isVideoPlaying);
        }
        if (typeof event.data.isVideoMuted === 'boolean') {
          setIsVideoMuted(event.data.isVideoMuted);
        }
      } else if (event.data.type === 'PUZZLE_START') {
        puzzleStartTimeRef.current = event.data.startTime || Date.now();
        puzzleElapsedPauseRef.current = event.data.elapsedPause || 0;
        if (typeof event.data.seed === 'number') {
          setPuzzleSeed(event.data.seed);
        }
        setPuzzlePhase('revealing');
      } else if (event.data.type === 'PUZZLE_PAUSE') {
        puzzleElapsedPauseRef.current = event.data.elapsedPause || 0;
        puzzleStartTimeRef.current = null;
        setPuzzlePhase('paused');
      } else if (event.data.type === 'PUZZLE_ALL_REVEALED') {
        puzzleStartTimeRef.current = null;
        const b = currentBlockRef.current;
        const gSize = (b?.data as BileteAvdekkingData)?.gridSize || 100;
        setPuzzleRevealedCount(gSize);
        setPuzzlePhase('all_revealed');
      } else if (event.data.type === 'PUZZLE_SOLVE') {
        puzzleStartTimeRef.current = null;
        const b = currentBlockRef.current;
        const gSize = (b?.data as BileteAvdekkingData)?.gridSize || 100;
        setPuzzleRevealedCount(gSize);
        setPuzzlePhase('solved');
      } else if (event.data.type === 'SWAP_SCREENS') {
        // Byt rolle på det andre vindauget
        setViewMode((prev) => (prev === 'leader' ? 'audience' : 'leader'));
      }
    };

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      bc.close();
      bcRef.current = null;
    };
  }, []);

  // Send oppdatering når leiar skiftar slide, tema, palett, fart, timer, Kims leik, Henteleiken poeng, eller mørklegg skjermen
  useEffect(() => {
    if (viewMode === 'leader' && bcRef.current) {
      bcRef.current.postMessage({
        type: 'SYNC_STATE',
        senderId: windowIdRef.current,
        currentIndex,
        isBlackout,
        audienceTheme,
        palette,
        speed,
        timerSeconds,
        isTimerRunning,
        activeVerseIndex,
        activePointIndex,
        quizQuestionIndex,
        quizShowAnswer,
        currentSlideIndex,
        isSlideshowPlaying,
        slideshowIntervalSeconds,
        kimsRevealedMap,
        beatRevealedMap,
        showBeatSolution,
        henteleikScores,
        kvenRevealedMap,
        puzzlePhase,
        puzzleSeed,
        isVideoPlaying,
        isVideoMuted,
      });
    }
  }, [currentIndex, isBlackout, audienceTheme, palette, speed, timerSeconds, isTimerRunning, activeVerseIndex, activePointIndex, quizQuestionIndex, quizShowAnswer, currentSlideIndex, isSlideshowPlaying, slideshowIntervalSeconds, kimsRevealedMap, beatRevealedMap, showBeatSolution, henteleikScores, kvenRevealedMap, puzzlePhase, puzzleSeed, isVideoPlaying, isVideoMuted, viewMode]);

  // Initialiser timer og tilbakestill understeg når ein navigerer til eit nytt ledd
  useEffect(() => {
    setActiveVerseIndex(0);
    setActivePointIndex(0);
    setQuizQuestionIndex(0);
    setQuizShowAnswer(false);
    setCurrentSlideIndex(0);
    setKimsRevealedMap({});
    setBeatRevealedMap({});
    setShowBeatSolution(false);
    setHenteleikScores({});
    setKvenRevealedMap({});
    setPuzzlePhase('idle');
    setPuzzleRevealedCount(0);
    setPuzzleSeed(Date.now() % 100000);
    setIsVideoPlaying(true);
    setIsVideoMuted(false);
    puzzleStartTimeRef.current = null;
    puzzleElapsedPauseRef.current = 0;

    if (!currentBlock) return;
    const d = currentBlock.data as any;
    if (currentBlock.type === 'kims_leik') {
      const kData = currentBlock.data as KimsLeikData;
      setTimerSeconds(kData.timerSeconds || 30);
      setIsTimerRunning(false);
    } else if (currentBlock.type === 'bilde' || currentBlock.type === 'lysbileteshow' || currentBlock.type === 'bilete') {
      const bData = currentBlock.data as any;
      setSlideshowIntervalSeconds(bData.intervalSeconds || bData.durationSeconds || bData.slideIntervalSeconds || 3);
      setIsSlideshowPlaying(bData.autoPlay !== false && bData.autoPlaySlideshow !== false);
      const mins = d.timerMinutes || d.durationMinutes || 5;
      setTimerSeconds(mins * 60);
      setIsTimerRunning(false);
    } else {
      const mins = d.timerMinutes || d.durationMinutes || 3;
      setTimerSeconds(mins * 60);
      setIsTimerRunning(false);
    }
  }, [currentIndex]);

  // Automatisk overgang frå Steg 2 til Steg 3 i Kims Leik når nedteljinga når 0
  useEffect(() => {
    if (timerSeconds === 0 && currentBlock?.type === 'kims_leik' && activePointIndex === 1) {
      setActivePointIndex(2);
    }
  }, [timerSeconds, currentBlock, activePointIndex]);

  // Automatisk framdrift (auto-loop) for Lysbiletevising
  useEffect(() => {
    if (currentBlock?.type !== 'lysbileteshow' && (currentBlock?.type !== 'bilde' || (currentBlock.data as any)?.imageMode !== 'slideshow')) return;
    const images = (currentBlock.data as any)?.images || [];
    if (images.length <= 1) return;
    if (!isSlideshowPlaying) return;

    const intervalMs = Math.max(500, Math.round(slideshowIntervalSeconds * 1000));
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => {
        const next = prev + 1;
        if (next >= images.length) {
          return 0; // Saumlaus auto-loop
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [currentBlock, isSlideshowPlaying, slideshowIntervalSeconds]);

  // Tidtakar-intervall
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleJumpNextBlock = useCallback(() => {
    if (currentIndex < session.blocks.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, session.blocks.length]);

  const handleJumpPrevBlock = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (!currentBlock) return;

    // 1. Sjekk stikkord (og legacy undervisning) med stegvis innholdspunkter
    if (currentBlock.type === 'stikkord' || currentBlock.type === 'undervisning') {
      const d = currentBlock.data as any;
      const points = d.points || d.slidePoints || [];
      if (points.length > 0 && activePointIndex < points.length) {
        setActivePointIndex((prev) => prev + 1);
        return;
      }
    }

    // 2. Sjekk Henteleiken: steg 0 = Startskjerm, steg 1..N = gjenstandar, steg N+1 = Resultattavle
    if (currentBlock.type === 'henteleik') {
      const d = currentBlock.data as HenteleikData;
      const items = d.items || [];
      const totalSteps = items.length + 1; // 0 (Start), 1..N (Gjenstandar), N+1 (Resultat)
      if (activePointIndex < totalSteps) {
        setActivePointIndex((prev) => prev + 1);
        return;
      }
    }

    // 3. Sjekk Reis deg / sit ned: steg 0 er introskjerm, steg 1..N er påstandar, steg N+1 er avslutningsside
    if (currentBlock.type === 'reis_deg') {
      const d = currentBlock.data as ReisDegData;
      const statements = d.statements || [];
      const maxSteps = statements.length + 1; // 0 (Intro), 1..N (Påstandar), N+1 (Avslutningsside)
      if (activePointIndex < maxSteps) {
        setActivePointIndex((prev) => prev + 1);
        return;
      }
    }

    // 3b. Sjekk Kims Leik:
    // Fase 0 (Forside): Høgre piltast skiftar til Fase 1 (Ikonskjerm) og startar nedteljinga med ein gong
    // Fase 1 (Ikonskjerm): Høgre piltast stoppar nedteljinga og hoppar direkte til Fase 2 (Tomme boksar)
    // Fase 2 (Avdekking): Høgre piltast går vidare til neste ledd i programmet
    if (currentBlock.type === 'kims_leik') {
      if (activePointIndex === 0) {
        setActivePointIndex(1);
        setIsTimerRunning(true);
        return;
      }
      if (activePointIndex === 1) {
        setIsTimerRunning(false);
        setActivePointIndex(2);
        return;
      }
    }

    // 4. Sjekk Bilete-avdekking:
    if (currentBlock.type === 'bilete_avdekking') {
      // 1. Frå forside/start eller pause: Høgre pil startar/fortset avdekkinga
      if (puzzlePhase === 'idle' || puzzlePhase === 'paused') {
        handleStartPuzzle();
        return;
      }

      // 2. Under aktiv avdekking: Høgre pil avbryt nedteljinga og viser alle brikkene i kaos med ein gong
      if (puzzlePhase === 'revealing') {
        handleRevealAllPuzzle();
        return;
      }

      // 3. Når alle brikkene er avdekte i kaos: Høgre pil samlar brikkene og viser fasit
      if (puzzlePhase === 'all_revealed') {
        handleSolvePuzzle();
        return;
      }

      // 4. Dersom puslespelet ALLEREDE ER 'solved' (ferdig samla):
      // Slepp køyringa rett vidare ned til hovud-navigeringa for neste hovudblokk.
    }

    // 5. Sjekk Beat for beat / Ord for ord: avdekkjer neste uavdekte ord, deretter fasit
    if (currentBlock.type === 'beat_for_beat' || currentBlock.type === 'ord_for_ord') {
      const d = currentBlock.data as any;
      const words = d.words || [];
      let nextUnrevealedWord = -1;
      for (let i = 0; i < words.length; i++) {
        if (!beatRevealedMap[i]) {
          nextUnrevealedWord = i;
          break;
        }
      }

      if (nextUnrevealedWord !== -1) {
        setBeatRevealedMap((prev) => ({ ...prev, [nextUnrevealedWord]: true }));
        return;
      }

      if (!showBeatSolution) {
        setShowBeatSolution(true);
        return;
      }
    }

    // 6. Sjekk Kven skal ut?: 1. klikk avslører fasit (flyg ut), 2. klikk går til neste oppgåve
    if (currentBlock.type === 'kven_skal_ut') {
      const d = currentBlock.data as KvenSkalUtData;
      const rawItems = Array.isArray(d.items) && d.items.length > 0 ? d.items : [];
      const itemsCount = rawItems.length > 0 ? rawItems.length : 1;
      const currentTask = rawItems[activePointIndex] || rawItems[0];
      const correctOption = currentTask?.correctOption || d.correctOption || 'A';
      const isTaskSolved = quizShowAnswer || Boolean(kvenRevealedMap[activePointIndex]);

      if (!isTaskSolved) {
        handleKvenOptionClick(correctOption as any, correctOption, activePointIndex);
        return;
      }

      if (activePointIndex < itemsCount - 1) {
        handleKvenSelectTask(activePointIndex + 1);
        return;
      }
    }

    // 7. Sjekk sang/salme med fleire vers
    if (currentBlock.type === 'sang_salme') {
      const d = currentBlock.data as SangSalmeData;
      const verses = d.verses || [];
      if (verses.length > 1 && activeVerseIndex < verses.length - 1) {
        setActiveVerseIndex((prev) => prev + 1);
        return;
      }
    }

    // 8. Sjekk quiz
    if (currentBlock.type === 'quiz') {
      const d = currentBlock.data as QuizData;
      const questionsList = (d.questions && d.questions.length > 0)
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

      // Svaravsløring først
      if (!quizShowAnswer) {
        setQuizShowAnswer(true);
        return;
      }

      // Deretter neste spørsmål i quizen
      if (quizQuestionIndex < questionsList.length - 1) {
        setQuizQuestionIndex((prev) => prev + 1);
        setQuizShowAnswer(false);
        return;
      }
    }

    // 8.5. Sjekk BildeBibelen: scene for scene
    if (currentBlock.type === 'bildebibelen') {
      const d = currentBlock.data as BildeBibelenData;
      const scenes = d.scenes || [];
      if (scenes.length > 0 && activePointIndex < scenes.length - 1) {
        setActivePointIndex((prev) => prev + 1);
        return;
      }
    }

    // 9. Elles: Neste hovedblokk (bildekarusellar går automatisk; piltast hoppar direkte til neste ledd)
    if (currentIndex < session.blocks.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, currentBlock, activeVerseIndex, activePointIndex, quizQuestionIndex, quizShowAnswer, beatRevealedMap, showBeatSolution, session.blocks.length, puzzlePhase, handleRevealAllPuzzle, handleSolvePuzzle, handleStartPuzzle]);

  const handlePrev = useCallback(() => {
    if (!currentBlock) return;

    // 1. Stikkord / undervisning / BildeBibelen stegvis innholdspunkter/scenar
    if (currentBlock.type === 'bildebibelen' && activePointIndex > 0) {
      setActivePointIndex((prev) => prev - 1);
      return;
    }

    if ((currentBlock.type === 'stikkord' || currentBlock.type === 'undervisning') && activePointIndex > 0) {
      setActivePointIndex((prev) => prev - 1);
      return;
    }

    // 2. Henteleik, Reis deg, Kims leik
    if ((currentBlock.type === 'henteleik' || currentBlock.type === 'reis_deg' || currentBlock.type === 'kims_leik') && activePointIndex > 0) {
      if (currentBlock.type === 'kims_leik' && activePointIndex === 1) {
        setIsTimerRunning(false);
      }
      setActivePointIndex((prev) => prev - 1);
      return;
    }

    // 3. Bilete-avdekking:
    if (currentBlock.type === 'bilete_avdekking') {
      if (puzzlePhase === 'revealing') {
        handlePausePuzzle();
        return;
      }
      // Viss pauset, idle eller solved: Gå direkte til førre hovudblokk
      if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
      return;
    }

    // 4. Beat for beat / Ord for ord skjul fasit eller sist opna ord
    if (currentBlock.type === 'beat_for_beat' || currentBlock.type === 'ord_for_ord') {
      if (showBeatSolution) {
        setShowBeatSolution(false);
        return;
      }
      const opened = Object.keys(beatRevealedMap).map(Number).filter((i) => beatRevealedMap[i]);
      if (opened.length > 0) {
        const maxIdx = Math.max(...opened);
        setBeatRevealedMap((prev) => {
          const next = { ...prev };
          delete next[maxIdx];
          return next;
        });
        return;
      }
    }

    // 5. Kven skal ut
    if (currentBlock.type === 'kven_skal_ut') {
      const isTaskSolved = quizShowAnswer || Boolean(kvenRevealedMap[activePointIndex]);
      if (isTaskSolved) {
        setQuizShowAnswer(false);
        setKvenRevealedMap((prev) => ({ ...prev, [activePointIndex]: false }));
        setKvenGreenMap((prev) => ({ ...prev, [activePointIndex]: false }));
        setShakeOption(null);
        setKvenSelectedOption(null);
        if (bcRef.current) {
          bcRef.current.postMessage({
            type: 'KVEN_RESET_TASK',
            senderId: windowIdRef.current,
            taskIdx: activePointIndex,
          });
        }
        return;
      }
      if (activePointIndex > 0) {
        handleKvenSelectTask(activePointIndex - 1);
        return;
      }
    }

    // 4. Sang/salme vers
    if (currentBlock.type === 'sang_salme' && activeVerseIndex > 0) {
      setActiveVerseIndex((prev) => prev - 1);
      return;
    }

    // 5. Quiz spørsmål / svaravsløring
    if (currentBlock.type === 'quiz') {
      if (quizShowAnswer) {
        setQuizShowAnswer(false);
        return;
      }
      if (quizQuestionIndex > 0) {
        setQuizQuestionIndex((prev) => prev - 1);
        setQuizShowAnswer(true);
        return;
      }
    }

    // 6. Førre hovedblokk
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex, currentBlock, activeVerseIndex, activePointIndex, quizQuestionIndex, quizShowAnswer, beatRevealedMap, showBeatSolution, puzzlePhase, handlePausePuzzle]);

  // Handtering av nettlesar-fullskjerm (F / F11 / API)
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Tastatursnarvegar for presentasjon
  useEffect(() => {
    // Sørg for at vindauget har fokus når det monterast
    if (typeof window !== 'undefined') {
      window.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Tast S for å løyse puslespel direkte
      if (currentBlock?.type === 'bilete_avdekking' && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSolvePuzzle();
        return;
      }

      // 2. Super-hopp direkte til neste/førre hovudblokk (Shift + Pil, PageDown / PageUp)
      if ((e.shiftKey && e.key === 'ArrowRight') || e.key === 'PageDown') {
        e.preventDefault();
        if (viewModeRef.current === 'audience' && bcRef.current) {
          bcRef.current.postMessage({ type: 'REMOTE_JUMP_NEXT', senderId: windowIdRef.current });
        } else {
          handleJumpNextBlock();
        }
        return;
      }

      if ((e.shiftKey && e.key === 'ArrowLeft') || e.key === 'PageUp') {
        e.preventDefault();
        if (viewModeRef.current === 'audience' && bcRef.current) {
          bcRef.current.postMessage({ type: 'REMOTE_JUMP_PREV', senderId: windowIdRef.current });
        } else {
          handleJumpPrevBlock();
        }
        return;
      }

      // 3. Vanleg framover- og bakovernavigasjon (Høgre / Venstre pil, Mellomrom)
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setIsBlackout((prev) => {
          if (prev) {
            if (bcRef.current) {
              bcRef.current.postMessage({
                type: 'TOGGLE_BLACKOUT',
                senderId: windowIdRef.current,
                isBlackout: false,
              });
            }
            return false;
          }
          return false;
        });
        if (viewModeRef.current === 'audience' && bcRef.current) {
          bcRef.current.postMessage({ type: 'REMOTE_NEXT', senderId: windowIdRef.current });
        } else {
          handleNext();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsBlackout((prev) => {
          if (prev) {
            if (bcRef.current) {
              bcRef.current.postMessage({
                type: 'TOGGLE_BLACKOUT',
                senderId: windowIdRef.current,
                isBlackout: false,
              });
            }
            return false;
          }
          return false;
        });
        if (viewModeRef.current === 'audience' && bcRef.current) {
          bcRef.current.postMessage({ type: 'REMOTE_PREV', senderId: windowIdRef.current });
        } else {
          handlePrev();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'audience') {
            window.close();
          }
          onClose();
        }
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsBlackout((prev) => {
          const next = !prev;
          if (bcRef.current) {
            bcRef.current.postMessage({
              type: 'TOGGLE_BLACKOUT',
              senderId: windowIdRef.current,
              isBlackout: next,
            });
          }
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleJumpNextBlock, handleJumpPrevBlock, onClose, currentBlock, toggleFullscreen, handleSolvePuzzle]);

  // Send meld om bytt skjerm til begge vindauge
  const handleSwapScreens = () => {
    setViewMode((prev) => (prev === 'leader' ? 'audience' : 'leader'));
    postPresenterMessage({ type: 'SWAP_SCREENS' });
  };

  // Veksle mørk / lys storskjerm
  const toggleAudienceTheme = () => {
    setAudienceTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Opne storskjerm på ekstraskjerm/lerret
  const handleOpenExternalAudienceWindow = () => {
    const currentBlockId = currentBlock?.id || '';
    const audienceUrl = `${window.location.origin}${window.location.pathname}?mode=audience&blockIndex=${currentIndex}&blockId=${currentBlockId}`;
    launchPresenterOnScreens(audienceUrl, () => {});
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleKeywordExpand = (id: string) => {
    setExpandedKeywordIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (!currentBlock) {
    return null;
  }

  // =========================================================================
  // =========================================================================
  // 1. RENDER SLIDE INNHALD (PUBLIKUM)
  // =========================================================================
  const renderSlideInnerContent = (blockToRender: TeachingBlock, isActiveBlock: boolean, isLeaderPreview: boolean = false) => {
    const isLight = audienceTheme === 'light';
    const isBigScreen = !isLeaderPreview && isActiveBlock;
    const speedDur = SPEED_DURATIONS[speed];

    // Berekne visingstid for denne blokken
    const getDisplaySeconds = () => {
      if (isActiveBlock) return timerSeconds;
      const d = blockToRender.data as any;
      if (d.timerMinutes) return d.timerMinutes * 60;
      if (d.durationMinutes) return d.durationMinutes * 60;
      return 180;
    };

    const currentDisplaySeconds = getDisplaySeconds();

    const bgContainerClass = 'bg-[var(--screen-bg)] text-[var(--screen-text)] font-sans';

    const cardBgClass = 'bg-[var(--screen-card-bg)] border border-[var(--screen-subtle)] shadow-xs text-[var(--screen-text)]';

    const mainTextColor = 'text-[var(--screen-text)]';
    const subTextColor = isLight ? 'text-zinc-700' : 'text-zinc-400';

    const renderDiscreetMetadata = (titleOrCombined?: string, progressParam?: string) => {
      let rawTitle = '';
      let progress = progressParam || '';

      if (titleOrCombined) {
        if (!progress && titleOrCombined.includes(' • ')) {
          const parts = titleOrCombined.split(' • ');
          rawTitle = parts[0].trim();
          progress = parts.slice(1).join(' • ').trim();
        } else {
          rawTitle = titleOrCombined.trim();
        }
      }

      if (!rawTitle) {
        const d = blockToRender.data as any;
        rawTitle = d?.title || d?.heading || d?.scriptureRef || d?.topic || d?.name || '';
      }

      // VERN FOR KONKURRANSAR OG LEIKAR: ALDRI lek songnamn, bibelvers eller fasit i tittel/metadata på storskjerm!
      const isBeatForBeat = blockToRender.type === 'beat_for_beat';
      const isOrdForOrd = blockToRender.type === 'ord_for_ord';

      if (isBeatForBeat) {
        rawTitle = 'Beat for Beat';
        progress = ''; // Ingen lekkasje eller overlapping oppe til høgre
      } else if (isOrdForOrd) {
        rawTitle = 'Ord for ord';
        progress = ''; // Ingen lekkasje eller overlapping oppe til høgre
      }

      const sessionTitle = session.title?.trim();
      const hasSession = !!sessionTitle;
      const hasBlock = !!rawTitle;
      const isSame = hasSession && hasBlock && sessionTitle.toLowerCase() === rawTitle.toLowerCase();

      if (!hasSession && !hasBlock && !progress) return null;

      return (
        <div className={`absolute top-3 left-6 sm:top-4 sm:left-8 z-20 text-xs sm:text-sm font-medium opacity-60 tracking-wide select-none pointer-events-none flex items-center gap-2 ${mainTextColor}`}>
          {(hasSession || hasBlock) && (
            <span>
              {isBeatForBeat || isOrdForOrd ? (
                <span className="font-semibold">{rawTitle}</span>
              ) : hasSession && hasBlock && !isSame ? (
                <>
                  <span>{sessionTitle}: </span>
                  <span className="font-semibold">{rawTitle}</span>
                </>
              ) : (
                <span className="font-semibold">{rawTitle || sessionTitle}</span>
              )}
            </span>
          )}
          {progress && (
            <>
              {(hasSession || hasBlock) && <span>•</span>}
              <span>{progress}</span>
            </>
          )}
        </div>
      );
    };

    if (blockToRender.hiddenOnScreen) {
      return (
        <div className={`w-full h-full relative flex flex-col items-center justify-center text-center px-6 overflow-hidden space-y-6 my-auto ${bgContainerClass}`}>
          {renderDiscreetMetadata(undefined, 'Skjult på storskjerm')}
          <div className="w-20 h-20 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-slate-400 flex items-center justify-center">
            <EyeOff className="w-10 h-10" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-slate-400">
            Neste ledd vert vist straks
          </h2>
        </div>
      );
    }

    switch (blockToRender.type) {
      case 'stikkord': {
        const d = blockToRender.data as any;
        const points: Array<{ id: string; text: string; note?: string }> = d.points || d.slidePoints || [];
        const step = isActiveBlock ? activePointIndex : points.length;
        const blockTitle = d.title || session.title || 'Stikkord';

        // =====================================================================
        // FASE 1..N: Dynamisk matematisk berekning – maksimal skjermutnytting
        // =====================================================================
        const revealedPoints = points.slice(0, step);
        const total = Math.max(1, points.length);

        // Finn lengste tekst for å tilpasse fontfaktor
        const maxLen = points.reduce((max, p) => Math.max(max, (p.text || '').length), 0);

        // 1. Korthøgd: Disponerer no 82vh av skjermen (opp frå 74vh)
        // Gjev høgare kort og fyller tomrommet nedst
        const rawCardHeightVh = Math.min(20, Math.max(8.0, (82 - (total - 1) * 1.2) / total));

        // 2. Tøffare og større fontfaktor:
        // 0.62 for vanlege stikkord (< 60 teikn) gjev ~75–78px på 1080p ved 6 punkt!
        // 0.50 ved lengre tekstar for å hindre uønskt linjebryting
        const isLongText = maxLen > 60;
        const fontFactor = isLongText ? 0.50 : 0.62;
        const calculatedFontVh = Math.min(7.5, Math.max(2.6, rawCardHeightVh * fontFactor));

        // 3. Større nummer-badge som fyller 78% av korthøgda
        const badgeSizeVh = Math.min(11.0, Math.max(4.8, rawCardHeightVh * 0.78));
        const badgeFontVh = badgeSizeVh * 0.52;

        // 4. Avstand mellom korta
        const gapRem = total <= 4 ? 1.4 : total <= 6 ? 1.0 : 0.65;
        const toSlideVh = (val: number) => (isLeaderPreview ? `${(val * 8.1).toFixed(1)}px` : `${val}vh`);

        const isTitlePhase = step === 0 && points.length > 0;

        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-center p-0 overflow-hidden my-auto select-none ${bgContainerClass}`}>
            {renderDiscreetMetadata(
              blockTitle,
              !isTitlePhase && points.length > 0 ? `Punkt ${step} av ${points.length}` : undefined
            )}

            {/* FASE 0: Rein tittelside med silkemjuk overtoning */}
            <div
              style={{
                transition: 'opacity 400ms ease-in-out, transform 400ms ease-in-out',
                opacity: isTitlePhase ? 1 : 0,
                pointerEvents: isTitlePhase ? 'auto' : 'none',
                transform: isTitlePhase ? 'scale(1)' : 'scale(0.98)',
              }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center pt-14 sm:pt-16 lg:pt-20 pb-8 px-6 sm:px-12 z-10"
            >
              <div className="w-full max-w-[92%] flex-1 flex flex-col justify-center items-center my-auto space-y-6">
                <h1 className={`text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-tight break-words drop-shadow-sm ${mainTextColor}`}>
                  {blockTitle}
                </h1>
                <div
                  style={{
                    backgroundColor: 'var(--screen-accent)',
                    boxShadow: '0 0 18px var(--screen-glow)',
                  }}
                  className="w-24 sm:w-32 h-1.5 rounded-full mx-auto"
                />
                {d.subtitle && (
                  <p className="text-2xl sm:text-3xl md:text-4xl font-medium opacity-80">
                    {d.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* FASE 1..N: Stikkordslista – bom fast forankra, full 94% breidde */}
            <div
              style={{
                transition: isBigScreen ? 'opacity 400ms ease-in-out' : 'none',
                opacity: !isTitlePhase ? 1 : 0,
                pointerEvents: !isTitlePhase ? 'auto' : 'none',
              }}
              className="w-full h-full flex flex-col items-center justify-start text-center pt-14 sm:pt-16 lg:pt-20 px-4 sm:px-8 overflow-hidden z-20"
            >
              {/* Liste forankra frå toppen – full breidde opp mot 94% */}
              <div 
                style={{ gap: `${gapRem}rem` }}
                className="w-full max-w-[94%] flex flex-col justify-start items-stretch overflow-visible"
              >
                {revealedPoints.map((pt, pIdx) => {
                  const isLatest = isActiveBlock && pIdx === step - 1;
                  const animateThisPoint = isBigScreen && isLatest;

                  return (
                    <div
                      key={pt.id || `pt_${pIdx}`}
                      style={{ 
                        minHeight: toSlideVh(rawCardHeightVh),
                        paddingLeft: '2rem',
                        paddingRight: '2rem',
                        backgroundColor: 'var(--screen-card-bg)',
                        color: 'var(--screen-text)',
                        boxShadow: isLatest ? '0 0 25px var(--screen-glow)' : undefined,
                      }}
                      className="w-full relative text-left flex items-center rounded-2xl transition-all duration-300"
                    >
                      {/* Omriss som teiknar seg sjølv (Stroke-draw / Neon trace) */}
                      <svg
                        style={
                          isLatest
                            ? { filter: 'drop-shadow(0 0 10px var(--screen-glow))' }
                            : undefined
                        }
                        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10"
                        aria-hidden="true"
                      >
                        <rect
                          x="1.5"
                          y="1.5"
                          width="calc(100% - 3px)"
                          height="calc(100% - 3px)"
                          rx="16"
                          ry="16"
                          fill="none"
                          pathLength={100}
                          stroke={isLatest ? 'var(--screen-accent)' : 'var(--screen-subtle)'}
                          strokeWidth={isLatest ? 2.75 : 1.5}
                          className={animateThisPoint ? 'animate-stroke-draw' : ''}
                        />
                      </svg>

                      {/* Nummer-badge i var(--screen-badge-bg) og var(--screen-text) */}
                      <span 
                        style={{ 
                          width: toSlideVh(badgeSizeVh), 
                          height: toSlideVh(badgeSizeVh),
                          fontSize: toSlideVh(badgeFontVh),
                          backgroundColor: 'var(--screen-badge-bg)',
                          color: 'var(--screen-text)',
                          borderColor: isLatest ? 'var(--screen-accent)' : 'var(--screen-subtle)',
                          boxShadow: isLatest ? '0 0 14px var(--screen-glow)' : undefined,
                          ...(animateThisPoint ? { animationDelay: '110ms' } : {}),
                        }}
                        className={`rounded-2xl border flex items-center justify-center font-black shrink-0 mr-5 sm:mr-7 z-20 transition-colors duration-300 ${
                          animateThisPoint ? 'animate-badge-pop' : ''
                        }`}
                      >
                        {pIdx + 1}
                      </span>

                      {/* Stikkordtekst med dynamisk tracking-inntoning på storskjerm */}
                      <div className="flex-1 my-auto min-w-0 z-20">
                        <p 
                          style={{ 
                            fontSize: toSlideVh(calculatedFontVh),
                            lineHeight: 1.18,
                            color: 'var(--screen-text)',
                            ...(animateThisPoint ? { animationDelay: '60ms' } : {}),
                          }}
                          className={`tracking-tight break-words font-sans font-bold select-none text-left flex-1 ${
                            animateThisPoint ? 'animate-tracking-in' : ''
                          }`}
                        >
                          {pt.text || `Punkt ${pIdx + 1}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 'tekst': {
        const d = blockToRender.data as any;
        const rawTitle = ((blockToRender as any).title || d.heading || d.title || '').trim();
        const mainText = (d.text || d.slideText || d.slideContent || d.content || '').trim() || rawTitle;
        const showHeading = Boolean(rawTitle && rawTitle.length > 0 && rawTitle !== mainText && rawTitle.toLowerCase() !== 'tekst');

        const wordCount = mainText ? mainText.split(/\s+/).filter(Boolean).length : 0;
        const charCount = mainText.length;
        const isShortText = wordCount < 15 || charCount < 90;
        const isMediumText = !isShortText && wordCount <= 35;

        const dynamicMaxPt = isShortText ? 88 : isMediumText ? 68 : 50;
        const dynamicFontWeight = isShortText ? 'font-black' : 'font-bold';

        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-center pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-12 px-6 sm:px-10 md:px-14 overflow-hidden my-auto ${bgContainerClass}`}>
            {renderDiscreetMetadata(rawTitle || 'Tekst')}

            <div className="w-[92vw] max-w-5xl lg:max-w-6xl mx-auto h-full max-h-[84vh] flex-1 min-h-0 flex flex-col justify-center items-start my-auto overflow-hidden text-left py-2 sm:py-4">
              {showHeading && (
                <div className="w-full shrink-0 mb-6 sm:mb-8">
                  <h2
                    style={{ color: 'var(--screen-accent)' }}
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-left mb-3 sm:mb-4"
                  >
                    {rawTitle}
                  </h2>
                  <div
                    style={{
                      backgroundColor: 'var(--screen-accent)',
                      boxShadow: '0 0 14px var(--screen-glow)',
                    }}
                    className="w-24 sm:w-32 h-1.5 rounded-full"
                  />
                </div>
              )}

              <div className="w-full max-w-full mx-auto flex-1 min-h-0 flex flex-col justify-center items-start overflow-hidden leading-relaxed text-left">
                <AutoFitSlideText
                  text={mainText}
                  subtitle={d.subtitle}
                  align="left"
                  textColorClass={mainTextColor}
                  fontWeightClass={dynamicFontWeight}
                  lineHeightMultiplier={isShortText ? 1.12 : 1.16}
                  maxPt={dynamicMaxPt}
                />
              </div>
            </div>
          </div>
        );
      }

      case 'undervisning': {
        const d = blockToRender.data as any;
        const slidePoints: Array<{ id: string; text: string; note?: string }> = d.slidePoints || [];
        const hasPoints = (d.mode === 'kulepunkt' || slidePoints.length > 0) && slidePoints.length > 0;

        if (hasPoints) {
          const activeIndex = isActiveBlock ? activePointIndex : slidePoints.length - 1;
          const revealedPoints = slidePoints.slice(0, activeIndex + 1);
          const totalRevealed = revealedPoints.length;

          const isLarge = totalRevealed <= 2;
          const isMedium = totalRevealed >= 3 && totalRevealed <= 4;

          const pointTextClass = isLarge
            ? 'text-4xl sm:text-5xl md:text-6xl font-bold leading-tight'
            : isMedium
            ? 'text-3xl sm:text-4xl md:text-5xl font-bold leading-snug'
            : 'text-xl sm:text-2xl md:text-3xl font-semibold leading-tight';

          const pointGapClass = isLarge
            ? 'gap-6 sm:gap-8'
            : isMedium
            ? 'gap-3.5 sm:gap-4'
            : 'gap-2 sm:gap-2.5';

          const pointPaddingClass = isLarge
            ? 'p-6 sm:p-8 rounded-2xl'
            : isMedium
            ? 'p-3.5 sm:p-5 rounded-xl'
            : 'p-2 sm:p-3 rounded-lg';

          const badgeClass = isLarge
            ? 'w-12 h-12 sm:w-14 sm:h-14 text-xl sm:text-2xl'
            : isMedium
            ? 'w-9 h-9 sm:w-10 sm:h-10 text-lg sm:text-xl'
            : 'w-7 h-7 sm:w-8 sm:h-8 text-sm sm:text-base';

          return (
            <div className={`w-full h-full relative flex flex-col items-center justify-center text-center pt-14 sm:pt-16 lg:pt-20 pb-6 sm:pb-8 px-4 sm:px-8 overflow-hidden my-auto ${bgContainerClass}`}>
              {renderDiscreetMetadata(d.title || 'Undervisning')}

              <div className={`w-full max-w-[92%] flex-1 flex flex-col justify-center items-stretch ${pointGapClass} my-auto overflow-hidden`}>
                {revealedPoints.map((pt, pIdx) => {
                  const isLatest = isActiveBlock && pIdx === activeIndex;

                  return (
                    <div
                      key={pt.id || pIdx}
                      style={{
                        backgroundColor: 'var(--screen-card-bg)',
                        color: 'var(--screen-text)',
                        borderColor: isLatest ? 'var(--screen-accent)' : 'var(--screen-subtle)',
                        boxShadow: isLatest ? '0 0 25px var(--screen-glow)' : undefined,
                      }}
                      className={`w-full ${pointPaddingClass} transition-all duration-300 text-left flex items-center gap-3 sm:gap-5 border-2`}
                    >
                      <span
                        style={{
                          backgroundColor: 'var(--screen-badge-bg)',
                          color: 'var(--screen-text)',
                          borderColor: isLatest ? 'var(--screen-accent)' : 'var(--screen-subtle)',
                        }}
                        className={`${badgeClass} rounded-lg border flex items-center justify-center font-bold shrink-0`}
                      >
                        {pIdx + 1}
                      </span>
                      <div className="flex-1 my-auto min-w-0">
                        <p className={`${pointTextClass} tracking-tight break-words font-sans`}>
                          {pt.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        const mainText = d.slideContent || d.coreMessage || d.title || '';

        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-center text-center pt-14 sm:pt-16 lg:pt-20 pb-6 px-4 sm:px-6 md:px-8 overflow-hidden my-auto ${bgContainerClass}`}>
            {renderDiscreetMetadata(d.title || 'Undervisning')}

            <div className="w-[94%] max-w-[94%] h-full flex-1 min-h-0 flex flex-col justify-center items-center my-auto overflow-hidden">
              <div
                style={{
                  backgroundColor: 'var(--screen-accent)',
                  boxShadow: '0 0 18px var(--screen-glow)',
                }}
                className="w-20 sm:w-28 h-1.5 rounded-full mb-5 sm:mb-7 shrink-0"
              />
              <div className="w-full flex-1 min-h-0 flex flex-col justify-center items-center overflow-hidden">
                <AutoFitSlideText
                  text={mainText}
                  subtitle={d.slideSubtitle}
                  textColorClass={mainTextColor}
                  maxPt={70}
                />
              </div>
            </div>
          </div>
        );
      }

      case 'bibelord': {
        const d = blockToRender.data as any;
        const rawText = (d.text || d.verseText || d.quote || d.keyVerse || d.bibleText || '').trim();
        const reference = (d.reference || d.ref || d.scriptureRef || '').trim();

        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-center pt-14 sm:pt-16 lg:pt-20 pb-6 sm:pb-10 px-4 sm:px-8 md:px-12 overflow-hidden my-auto ${bgContainerClass}`}>
            {renderDiscreetMetadata(
              reference ? `${d.title || 'Bibelord'}: ${reference}` : (d.title || 'Bibelord')
            )}

            <div className="w-[94%] max-w-[94vw] h-full flex-1 min-h-0 flex items-center justify-center my-auto overflow-hidden py-2">
              <div className="flex items-stretch gap-6 lg:gap-8 w-full h-full max-h-[82vh]">
                {/* Vertikal linje som veks opp etter vald animasjonsfart */}
                <div
                  style={{
                    backgroundColor: 'var(--screen-accent)',
                    boxShadow: '0 0 16px var(--screen-glow)',
                    animationDuration: 'var(--anim-border-dur)',
                  }}
                  className="w-1.5 sm:w-2 rounded-full shrink-0 animate-scale-y origin-top"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
                  <AutoFitSlideText
                    text={rawText}
                    subtitle={reference}
                    isVerse={true}
                    align="left"
                    textColorClass={mainTextColor}
                    maxPt={92}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'informasjon': {
        const d = blockToRender.data as any;
        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-between text-center pt-14 sm:pt-16 lg:pt-20 pb-6 sm:pb-12 px-6 sm:px-12 overflow-hidden my-auto ${bgContainerClass}`}>
            {renderDiscreetMetadata(d.heading || 'Informasjon')}

            <div className="w-full max-w-[92%] flex-1 flex flex-col justify-center items-center my-auto space-y-8">
              {d.heading && (
                <div className="space-y-4">
                  <h1 className={`text-4xl sm:text-6xl md:text-7xl font-bold leading-tight break-words ${mainTextColor}`}>
                    {d.heading}
                  </h1>
                  <div
                    style={{
                      backgroundColor: 'var(--screen-accent)',
                      boxShadow: '0 0 15px var(--screen-glow)',
                    }}
                    className="w-24 sm:w-32 h-1.5 rounded-full mx-auto"
                  />
                </div>
              )}

              {d.practicalPoints && d.practicalPoints.length > 0 && (
                <div className="w-full space-y-4 text-left">
                  {d.practicalPoints.map((pt: string, i: number) => (
                    <div key={i} className={`flex items-start gap-4 text-2xl sm:text-4xl md:text-5xl font-semibold leading-snug ${mainTextColor}`}>
                      <span
                        style={{ backgroundColor: 'var(--screen-accent)' }}
                        className="w-3.5 h-3.5 rounded-full mt-3 shrink-0"
                      />
                      <span className="break-words">{pt}</span>
                    </div>
                  ))}
                </div>
              )}

              {d.noticeBox && (
                <div
                  style={{
                    backgroundColor: 'var(--screen-card-bg)',
                    borderColor: 'var(--screen-accent)',
                    boxShadow: '0 0 25px var(--screen-glow)',
                    color: 'var(--screen-text)',
                  }}
                  className="w-full p-6 sm:p-8 rounded-2xl border-2 text-2xl sm:text-4xl font-bold text-center leading-snug"
                >
                  {d.noticeBox}
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'bonn_dikt': {
        const d = blockToRender.data as any;
        const mainPrayerText = (d.text || '').trim();
        const responsiveReading = (d.responsiveReading || '').trim();
        const title = ((d.title && d.title.trim()) || 'Bøn').replace(/bønn/gi, 'Bøn');

        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-between text-center pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-12 px-6 sm:px-10 overflow-hidden my-auto ${bgContainerClass}`}>
            {renderDiscreetMetadata(title)}

            {/* 1. TOPPLINJE MED AKSENT */}
            <div className="w-full shrink-0 flex flex-col items-center justify-center z-10 pt-2">
              <h2
                style={{ color: 'var(--screen-accent)' }}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-widest select-none"
              >
                {title}
              </h2>
              <motion.div
                initial={isBigScreen ? { scaleX: 0, opacity: 0 } : false}
                animate={isBigScreen ? { scaleX: 1, opacity: 1 } : false}
                transition={{ duration: speedDur.border || 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  backgroundColor: 'var(--screen-accent)',
                  boxShadow: '0 0 12px var(--screen-glow)',
                  transformOrigin: 'center',
                }}
                className="w-48 sm:w-64 md:w-80 max-w-md h-1.5 rounded-full my-4 mx-auto bg-[var(--screen-accent)] shadow-[0_0_12px_var(--screen-glow)]"
              />
            </div>

            {/* 2. BØNNETEKST I SENTRUM (Open, pustande tekstflate utan ytre boks) */}
            <motion.div
              initial={isBigScreen ? { opacity: 0, y: 10 } : false}
              animate={isBigScreen ? { opacity: 1, y: 0 } : false}
              transition={{ duration: speedDur.text || 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-4xl md:max-w-5xl mx-auto px-6 flex-1 min-h-0 flex flex-col justify-center items-center overflow-hidden"
            >
              <div className="w-full flex-1 min-h-0 flex flex-col justify-center items-center overflow-hidden">
                <AutoFitSlideText
                  text={mainPrayerText}
                  textColorClass={mainTextColor}
                  fontWeightClass="font-normal sm:font-medium"
                  lineHeightMultiplier={1.18}
                  maxPt={78}
                />
              </div>

              {responsiveReading && (
                <div className="w-full shrink-0 mt-6 sm:mt-8 pt-4 sm:pt-6 flex flex-col items-center gap-2.5 sm:gap-3">
                  <span
                    style={{
                      borderColor: 'var(--screen-accent)',
                      color: 'var(--screen-accent)',
                      backgroundColor: 'var(--screen-card-bg)',
                      boxShadow: '0 0 10px var(--screen-glow)',
                    }}
                    className="px-4 py-1 rounded-full border font-sans text-xs sm:text-sm font-semibold tracking-widest uppercase"
                  >
                    Alle
                  </span>
                  <p className={`text-2xl sm:text-4xl md:text-5xl font-sans font-medium leading-relaxed tracking-tight whitespace-pre-line break-words text-center max-w-4xl ${mainTextColor}`}>
                    {responsiveReading}
                  </p>
                </div>
              )}
            </motion.div>

            <div className="h-2 shrink-0" />
          </div>
        );
      }

      case 'lek': {
        const d = blockToRender.data as any;
        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-center text-center pt-14 sm:pt-16 lg:pt-20 pb-6 sm:pb-12 px-6 sm:px-12 overflow-hidden my-auto space-y-8 ${bgContainerClass}`}>
            {renderDiscreetMetadata(`${d.name || 'Leik'} (${d.energyLevel || 'Middels'})`)}

            <h1
              style={{ color: 'var(--screen-accent)' }}
              className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-tight break-words"
            >
              {d.name || 'Leik'}
            </h1>

            <div className="flex flex-col items-center justify-center my-2">
              <div
                style={{
                  borderColor: 'var(--screen-accent)',
                  backgroundColor: 'var(--screen-card-bg)',
                  boxShadow: '0 0 30px var(--screen-glow)',
                }}
                className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border-8 flex flex-col items-center justify-center"
              >
                <span className={`text-6xl sm:text-8xl font-bold font-mono tracking-tight ${mainTextColor}`}>
                  {formatTime(currentDisplaySeconds)}
                </span>
                <span
                  style={{ color: 'var(--screen-accent)' }}
                  className="text-xs sm:text-sm uppercase tracking-widest font-bold mt-2"
                >
                  {isActiveBlock ? (isTimerRunning ? 'Går no' : 'Pausa') : 'Klar'}
                </span>
              </div>
            </div>

            {d.screenDisplay === 'instruks' && d.rulesSteps && d.rulesSteps.length > 0 && (
              <div className={`w-full max-w-4xl p-6 sm:p-8 rounded-2xl ${cardBgClass} text-left space-y-3`}>
                {d.rulesSteps.map((step: string, i: number) => (
                  <div key={i} className={`flex items-start gap-4 text-xl sm:text-3xl font-medium ${mainTextColor}`}>
                    <span style={{ color: 'var(--screen-accent)' }} className="font-bold">{i + 1}.</span>
                    <span className="break-words">{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'konkurranse': {
        const d = blockToRender.data as any;
        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-center text-center pt-14 sm:pt-16 lg:pt-20 pb-6 sm:pb-12 px-6 sm:px-12 overflow-hidden my-auto space-y-8 ${bgContainerClass}`}>
            {renderDiscreetMetadata(`${d.title || 'Konkurranse'} • ${d.competitionType || 'Lag'}`)}

            <h1 className={`text-5xl sm:text-7xl md:text-8xl font-bold leading-tight break-words ${mainTextColor}`}>
              {d.title || 'Konkurranse'}
            </h1>

            {d.task && (
              <div className={`w-full max-w-5xl p-8 sm:p-14 rounded-2xl ${cardBgClass}`}>
                <p className="text-3xl sm:text-5xl md:text-6xl font-medium leading-relaxed break-words">
                  {d.task}
                </p>
                {d.scoringRules && (
                  <div style={{ color: 'var(--screen-accent)' }} className="mt-8 text-xl sm:text-3xl font-mono font-bold">
                    Poeng: {d.scoringRules}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'samtale': {
        const d = blockToRender.data as any;
        const questions: string[] = (d.reflectionQuestions || []).filter((q: string) => q && q.trim());
        const topicText = d.topic && d.topic.trim().toLowerCase() !== 'samtale' ? d.topic.trim() : '';
        const orgText = (d.organization || d.grouping || '').trim();
        const headingTitle = (d.title && d.title.trim()) || 'Samtale';

        const headingSizeClass = isLeaderPreview
          ? 'text-[3.2rem]'
          : 'text-4xl md:text-5xl lg:text-[3.2rem]';
        const questionSizeClass = isLeaderPreview
          ? 'text-[2.6rem]'
          : 'text-2xl md:text-3xl lg:text-[2.6rem]';

        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-between text-center pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-12 px-6 sm:px-12 md:px-16 overflow-hidden my-auto ${bgContainerClass}`}>
            {/* Diskret metadata i hjørnet */}
            {renderDiscreetMetadata(
              `${d.topic || 'Samtale'}${orgText ? ` • ${orgText}` : ''}`
            )}

            {/* 1. OVERSKRIFT «SAMTALE» MED HORISONTAL PALETTFARGA AKSENTSTREK UNDER */}
            <div className="w-full shrink-0 flex flex-col items-center justify-center z-10 pt-2">
              <h1 className={`${headingSizeClass} font-bold tracking-tight leading-tight text-center ${mainTextColor}`}>
                {headingTitle}
              </h1>
              <div
                style={{
                  backgroundColor: 'var(--screen-accent)',
                  boxShadow: '0 0 14px var(--screen-glow)',
                }}
                className="w-24 md:w-32 h-1.5 rounded-full mx-auto mt-3"
              />
            </div>

            {/* 2. SPØRSMÅLA (HOVUDINNHALDET) – REIN, STOR TYPOGRAFI UTAN RAMMER ELLER TAL */}
            <motion.div
              initial={isBigScreen ? { opacity: 0, y: 12 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: isLeaderPreview ? 0 : (speedDur.text || 0.5), delay: isLeaderPreview ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-5xl mx-auto flex-1 min-h-0 flex flex-col justify-center items-center my-auto px-4"
            >
              <div className="w-full space-y-8 md:space-y-10 max-w-5xl mx-auto text-center">
                {questions.length === 0 ? (
                  <p className={`${questionSizeClass} font-semibold leading-snug tracking-tight break-words text-center ${mainTextColor}`}>
                    {topicText || 'Kva tenkjer de om dette?'}
                  </p>
                ) : (
                  questions.map((q, idx) => (
                    <p
                      key={idx}
                      className={`${questionSizeClass} font-semibold leading-snug tracking-tight break-words text-center ${mainTextColor}`}
                    >
                      {q}
                    </p>
                  ))
                )}
              </div>

              {orgText && (
                <div
                  style={{ color: 'var(--screen-accent)' }}
                  className="mt-8 text-lg font-medium opacity-80 tracking-wide text-center"
                >
                  {orgText}
                </div>
              )}
            </motion.div>

            <div className="h-2 shrink-0" />
          </div>
        );
      }

      case 'quiz': {
        const d = blockToRender.data as any;
        const questionsList = (d.questions && d.questions.length > 0)
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
              answer: d.answer || '',
            }];

        const currentQ = questionsList[quizQuestionIndex] || questionsList[0];
        const isAnswerRevealed = isActiveBlock ? quizShowAnswer : false;
        const questionText = currentQ.question || d.title || 'Quiz-spørsmål';

        const answerText = currentQ.answer || currentQ.explanation || 'Ingen fasit oppgitt';
        const isShortAnswer = (answerText || '').length < 70;
        const quizMetaTitle = (d.title || session.title || '').trim();

        // 1. Rekn ut lengde på alternativa
        const optionTexts = (['optionA', 'optionB', 'optionC', 'optionD'] as const)
          .map((k) => String(currentQ[k] || '').trim())
          .filter(Boolean);
        const maxOptionChars = optionTexts.reduce((max, t) => Math.max(max, t.length), 0);
        const maxOptionWords = optionTexts.reduce((max, t) => {
          const words = t ? t.split(/\s+/).filter(Boolean).length : 0;
          return Math.max(max, words);
        }, 0);

        let sharedOptionRem = 2.5;
        if (maxOptionWords <= 5 && maxOptionChars <= 32) {
          sharedOptionRem = 2.5;
        } else {
          const wordProgress = Math.max(0, (maxOptionWords - 5) / 7);
          const charProgress = Math.max(0, (maxOptionChars - 32) / 40);
          const progress = Math.max(wordProgress, charProgress);

          if (progress <= 1) {
            sharedOptionRem = 2.5 - progress * 0.5;
          } else {
            const extraProgress = Math.min(1, (progress - 1) / 0.65);
            sharedOptionRem = Math.max(1.65, 2.0 - extraProgress * 0.35);
          }
        }

        // 2. Skaler opp for ekte storskjerm vs. leiar-forhandsvising
        const storskjermMultiplier = isBigScreen ? 1.25 : 1.0;
        const targetRem = sharedOptionRem * storskjermMultiplier;
        const minRem = isBigScreen ? Math.max(1.9, targetRem * 0.65) : 1.4;
        const vwFactor = (targetRem * 0.92).toFixed(2);

        const sharedOptionFontSize = isLeaderPreview
          ? `${sharedOptionRem.toFixed(2)}rem`
          : `clamp(${minRem.toFixed(2)}rem, ${vwFactor}vw, ${targetRem.toFixed(2)}rem)`;

        const sharedOptionLeadingClass = targetRem >= 2.5 ? 'leading-tight' : 'leading-snug';

        return (
          <div className={`w-full h-full relative flex items-center justify-center overflow-hidden ${bgContainerClass}`}>
            {/* Topp-metadata heilt øvst til venstre på linje med kontrollknappane */}
            <div className={`absolute top-3 left-6 sm:top-4 sm:left-8 z-20 text-xs sm:text-sm font-medium opacity-60 tracking-wide select-none pointer-events-none flex items-center gap-2 ${mainTextColor}`}>
              {quizMetaTitle ? (
                <>
                  <span className="font-semibold">{quizMetaTitle}</span>
                  <span>•</span>
                  <span>Spørsmål {quizQuestionIndex + 1} av {questionsList.length}</span>
                </>
              ) : (
                <span>Spørsmål {quizQuestionIndex + 1} av {questionsList.length}</span>
              )}
            </div>

            <div className={`w-full ${isLeaderPreview ? 'max-w-[94%]' : 'max-w-[94vw] 2xl:max-w-[92vw]'} h-full flex flex-col justify-between pt-14 sm:pt-16 lg:pt-20 pb-8 mx-auto px-4 overflow-hidden`}>
              {/* 1. OVERSKRIFT «QUIZ» + FRAMDRIFTSINDIKATOR («Spørsmål X av Y») */}
              <div className="w-full shrink-0 flex flex-col items-center justify-center text-center mb-4 sm:mb-6">
                <h1 className={`${isLeaderPreview ? 'text-7xl' : 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl'} font-black tracking-tight leading-none max-w-[92%] mx-auto text-center ${mainTextColor}`}>
                  Quiz
                </h1>

                <div className="mt-3 sm:mt-4 min-h-[2.25rem] flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`quiz-progress-${quizQuestionIndex}`}
                      initial={isBigScreen ? { opacity: 0, y: 5 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={isBigScreen ? { opacity: 0, y: -5 } : undefined}
                      transition={{
                        duration: isLeaderPreview ? 0 : (speedDur.text || 0.35),
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{ color: 'var(--screen-accent)' }}
                      className={`font-sans font-bold tracking-wide select-none text-center ${
                        isLeaderPreview ? 'text-2xl' : 'text-xl sm:text-2xl md:text-3xl'
                      }`}
                    >
                      Spørsmål {quizQuestionIndex + 1} av {questionsList.length}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* 2. HOVUDINNHALD: SPØRSMÅL + 2x2 SVARRUTENETT / OPEN FASIT */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`quiz-body-${quizQuestionIndex}`}
                  initial={isBigScreen ? { opacity: 0, y: 8 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={isBigScreen ? { opacity: 0, y: -6 } : undefined}
                  transition={{
                    duration: isLeaderPreview ? 0 : (speedDur.slide || 0.4),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="w-full flex-1 flex flex-col items-center justify-center my-auto min-h-0"
                >
                  <h2
                    style={{
                      fontSize: isLeaderPreview ? undefined : 'clamp(2.0rem, 3.1vw, 3.6rem)',
                    }}
                    className={`shrink-0 ${
                      isLeaderPreview
                        ? 'text-3xl sm:text-4xl lg:text-[2.4rem]'
                        : 'text-3xl md:text-4xl lg:text-5xl'
                    } font-extrabold tracking-tight leading-[1.18] text-center w-full max-w-[92%] mx-auto px-2 mb-5 sm:mb-6 md:mb-8 break-words ${mainTextColor}`}
                  >
                    {questionText}
                  </h2>

                  {d.quizType !== 'open' ? (
                    <div
                      className={`grid grid-cols-2 grid-rows-2 grid-rows-[1fr_1fr] gap-4 sm:gap-5 lg:gap-6 w-full flex-1 min-h-0 ${
                        isLeaderPreview ? 'max-h-[420px]' : 'max-h-[52vh] 2xl:max-h-[56vh]'
                      } my-auto text-left items-stretch overflow-visible`}
                    >
                      {(['A', 'B', 'C', 'D'] as const).map((letter, optIdx) => {
                        const optKey = `option${letter}` as 'optionA' | 'optionB' | 'optionC' | 'optionD';
                        const optText = currentQ[optKey];
                        if (!optText) return null;
                        const isCorrect = currentQ.correctOption === letter;
                        const highlightThis = isAnswerRevealed && isCorrect;
                        const dimThis = isAnswerRevealed && !isCorrect;
                        const baseDelayMs = isBigScreen ? optIdx * 55 : 0;

                        // VIKTIG UNNTAK: Rett svar ved fasit skal ALLTID tvingast til smaragdgrøn (#10b981 / #22c55e)
                        // med kvit tekst og grøn glød, uavhengig av vald fargepalett!
                        const capsuleStyle: React.CSSProperties = highlightThis
                          ? {
                              backgroundColor: '#065f46',
                              color: '#ffffff',
                              boxShadow: '0 0 32px rgba(16, 185, 129, 0.55)',
                            }
                          : {
                              backgroundColor: 'var(--screen-card-bg)',
                              color: 'var(--screen-text)',
                              boxShadow: '0 0 22px var(--screen-glow)',
                            };

                        const strokeColor = highlightThis ? '#22c55e' : 'var(--screen-accent)';

                        return (
                          <div
                            key={letter}
                            style={capsuleStyle}
                            className={`h-full min-h-0 flex items-center p-5 sm:p-6 lg:p-8 rounded-3xl lg:rounded-4xl relative transition-all duration-500 ease-out ${
                              highlightThis && isBigScreen ? 'animate-emerald-pulse ' : ''
                            }${dimThis ? 'opacity-35 ' : ''}`}
                          >
                            {/* Omriss som teiknar seg sjølv (Stroke-draw / Neon trace) */}
                            <svg
                              style={
                                highlightThis
                                  ? { filter: 'drop-shadow(0 0 16px rgba(16, 185, 129, 0.65))' }
                                  : { filter: 'drop-shadow(0 0 10px var(--screen-glow))' }
                              }
                              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10"
                              aria-hidden="true"
                            >
                              <rect
                                x="1.5"
                                y="1.5"
                                width="calc(100% - 3px)"
                                height="calc(100% - 3px)"
                                rx={isBigScreen ? 32 : 24}
                                ry={isBigScreen ? 32 : 24}
                                fill="none"
                                pathLength={100}
                                stroke={strokeColor}
                                strokeWidth={highlightThis ? 3.5 : 2.5}
                                style={isBigScreen ? { animationDelay: `${baseDelayMs}ms` } : undefined}
                                className={isBigScreen ? 'animate-stroke-draw transition-colors duration-500' : ''}
                              />
                            </svg>

                            <div className="flex items-center gap-4 sm:gap-6 w-full z-20">
                              {/* Bokstav-badge (A, B, C, D) */}
                              <span
                                style={{
                                  ...(highlightThis
                                    ? {
                                        backgroundColor: '#10b981',
                                        color: '#ffffff',
                                        borderColor: '#6ee7b7',
                                        boxShadow: '0 0 18px rgba(16, 185, 129, 0.7)',
                                      }
                                    : {
                                        backgroundColor: 'var(--screen-badge-bg)',
                                        color: 'var(--screen-text)',
                                        borderColor: 'var(--screen-subtle)',
                                        boxShadow: '0 0 12px var(--screen-glow)',
                                      }),
                                  ...(isBigScreen ? { animationDelay: `${baseDelayMs + 110}ms` } : {}),
                                }}
                                className={`w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 lg:w-24 lg:h-24 shrink-0 rounded-2xl lg:rounded-3xl border flex items-center justify-center text-2xl sm:text-3xl md:text-4xl font-black transition-all duration-500 ease-out ${
                                  isBigScreen ? 'animate-badge-pop ' : ''
                                }`}
                              >
                                {letter}
                              </span>

                              {/* Svartekst med felles dynamisk fontstorleik for alle 4 alternativ */}
                              <p
                                style={{
                                  fontSize: sharedOptionFontSize,
                                  color: highlightThis ? '#ffffff' : 'var(--screen-text)',
                                  ...(isBigScreen ? { animationDelay: `${baseDelayMs + 60}ms` } : {}),
                                }}
                                className={`font-bold ${sharedOptionLeadingClass} tracking-tight text-left break-words my-auto flex-1 min-w-0 pr-2 ${
                                  isBigScreen ? 'animate-tracking-in ' : ''
                                }`}
                              >
                                {optText}
                              </p>

                              {highlightThis && (
                                <div className="ml-auto shrink-0 flex items-center justify-end pl-2">
                                  <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-[#4ade80] drop-shadow-[0_0_10px_rgba(34,197,94,0.7)] transition-all duration-500 ease-out" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      className="w-full max-w-6xl mx-auto grid transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{
                        gridTemplateRows: isAnswerRevealed ? '1fr' : '0fr',
                      }}
                    >
                      <div className="overflow-hidden">
                        <div
                          style={{ borderColor: '#10b981' }}
                          className={`w-full max-w-5xl mx-auto pt-6 sm:pt-8 my-6 sm:my-8 border-t-2 flex flex-col items-center space-y-4 sm:space-y-5 transition-all duration-700 ease-out ${
                            isAnswerRevealed
                              ? 'opacity-100 translate-y-0'
                              : 'opacity-0 translate-y-8 pointer-events-none'
                          }`}
                        >
                          <span className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-widest text-[#10b981] opacity-95">
                            Fasit
                          </span>
                          <p className={`w-full ${
                            isShortAnswer
                              ? 'text-4xl md:text-5xl lg:text-6xl'
                              : 'text-3xl md:text-4xl lg:text-5xl'
                          } font-extrabold leading-snug break-words text-center ${mainTextColor}`}>
                            {answerText}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        );
      }

      case 'sang_salme': {
        const d = blockToRender.data as any;
        const verses: string[] = d.verses && d.verses.length > 0 ? d.verses : [''];
        const currentVerseIdx = isActiveBlock ? activeVerseIndex : 0;
        const verseText = verses[currentVerseIdx] || verses[0] || '';
        const verseKey = `verse_${currentVerseIdx}_${verseText.substring(0, 15)}`;

        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-center text-center pt-14 sm:pt-16 lg:pt-20 pb-6 px-4 sm:px-8 md:px-12 overflow-hidden my-auto ${bgContainerClass}`}>
            {renderDiscreetMetadata(
              `${d.songNumber ? d.songNumber + ' • ' : ''}${d.title || 'Salme'}${verses.length > 1 ? ` • Vers ${currentVerseIdx + 1} av ${verses.length}` : ''}`
            )}

            <div className="w-full max-w-[96%] 2xl:max-w-[94%] flex-1 flex flex-col justify-center items-center my-auto overflow-hidden px-4 sm:px-8 relative">
              <AnimatePresence>
                <motion.div
                  key={verseKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                  className="absolute inset-0 flex flex-col justify-center items-center"
                >
                  <AutoFitSlideText
                    text={verseText}
                    isSong={true}
                    textColorClass={`${mainTextColor} font-bold text-center`}
                    maxPt={75}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        );
      }

      case 'henteleik': {
        const d = blockToRender.data as HenteleikData;
        const items = d.items || [];
        const step = isActiveBlock ? activePointIndex : 0;

        if (step === 0 || items.length === 0) {
          return (
            <div className={`w-full h-full relative flex flex-col items-center justify-center text-center pt-14 sm:pt-16 lg:pt-20 pb-8 px-8 sm:px-16 overflow-hidden my-auto ${bgContainerClass}`}>
              {renderDiscreetMetadata(d.title || 'Henteleiken')}
              <h1 className={`text-6xl sm:text-8xl md:text-9xl font-black tracking-tight leading-tight uppercase font-sans ${mainTextColor}`}>
                {d.title || 'Henteleiken'}
              </h1>
            </div>
          );
        }

        if (step >= 1 && step <= items.length) {
          const currentItem = items[step - 1];
          const itemText = currentItem ? currentItem.text : `Gjenstand ${step}`;

          return (
            <div className={`w-full h-full relative flex flex-col items-center justify-center text-center pt-14 sm:pt-16 lg:pt-20 pb-8 px-8 sm:px-16 overflow-hidden my-auto ${bgContainerClass}`}>
              {renderDiscreetMetadata(`${d.title || 'Henteleiken'} (${step}/${items.length})`)}

              <div className="w-full flex-1 flex flex-col items-center justify-center my-auto max-w-6xl">
                <AutoFitSlideText
                  text={itemText}
                  textColorClass={mainTextColor}
                  maxPt={85}
                />
              </div>
            </div>
          );
        }

        const teamCount = d.teamCount || 2;
        const teamNames = d.teamNames || ['Lag 1', 'Lag 2', 'Lag 3', 'Lag 4'];
        
        const teamList = Array.from({ length: teamCount }).map((_, i) => ({
          name: teamNames[i] || `Lag ${i + 1}`,
          score: henteleikScores[i] || 0,
          index: i,
        }));

        let maxScore = -1;
        teamList.forEach((t) => {
          if (t.score > maxScore) maxScore = t.score;
        });

        const winners = teamList.filter((t) => t.score === maxScore && maxScore > 0);

        let winnerText = '';
        if (maxScore <= 0) {
          winnerText = 'Ingen poeng registrert ennå!';
        } else if (winners.length === 1) {
          winnerText = `🏆 Vinnar: ${winners[0].name} med ${winners[0].score} poeng!`;
        } else {
          winnerText = `🏆 Uavgjort mellom ${winners.map((w) => w.name).join(' og ')} med ${maxScore} poeng!`;
        }

        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-between text-center pt-14 sm:pt-16 lg:pt-20 pb-6 sm:pb-10 md:pb-12 px-6 sm:px-10 md:px-12 overflow-hidden my-auto ${bgContainerClass}`}>
            {renderDiscreetMetadata(d.title || 'Henteleiken', 'Resultat')}

            <div className="shrink-0 space-y-2">
              <h1 className={`text-5xl sm:text-7xl md:text-8xl font-black tracking-tight uppercase font-sans ${isLight ? 'text-amber-800 font-extrabold' : 'text-amber-400'}`}>
                🏆 Resultat: {d.title || 'Henteleiken'}
              </h1>
            </div>

            <div className="my-auto w-full max-w-6xl 2xl:max-w-[92%] flex-1 flex flex-col justify-center gap-6 md:gap-10 py-4">
              {maxScore <= 0 ? (
                <div className={`p-8 sm:p-12 md:p-14 rounded-3xl md:rounded-[2.5rem] border-4 shadow-md ${
                  isLight
                    ? 'bg-zinc-100 border-zinc-300 text-zinc-800 font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                }`}>
                  <p className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight">
                    {winnerText}
                  </p>
                </div>
              ) : (
                <div className={`p-8 sm:p-12 md:p-14 rounded-3xl md:rounded-[2.5rem] border-4 shadow-2xl ${
                  isLight
                    ? 'bg-amber-100/90 border-amber-400 text-amber-950'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                }`}>
                  <p className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-tight tracking-tight">
                    {winnerText}
                  </p>
                </div>
              )}

              <div className={`grid mx-auto w-full ${
                teamCount === 2 
                  ? 'grid-cols-2 max-w-4xl 2xl:max-w-5xl gap-8 md:gap-12' 
                  : teamCount === 3 
                  ? 'grid-cols-3 max-w-5xl 2xl:max-w-6xl gap-6 md:gap-10' 
                  : 'grid-cols-2 lg:grid-cols-4 max-w-6xl 2xl:max-w-[92%] gap-6 md:gap-8'
              }`}>
                {teamList.map((t) => {
                  const isWinner = winners.some((w) => w.index === t.index);

                  return (
                    <div
                      key={t.index}
                      className={`min-h-[280px] sm:min-h-[360px] md:min-h-[420px] p-6 sm:p-10 md:p-12 rounded-3xl md:rounded-[2.5rem] border-4 flex flex-col items-center justify-between text-center transition-all ${
                        isWinner
                          ? isLight
                            ? 'bg-amber-100/90 border-amber-500 shadow-xl ring-4 ring-amber-400/40 scale-[1.02]'
                            : 'bg-amber-500/30 border-amber-400 text-amber-100 ring-4 ring-amber-400/50 scale-[1.02]'
                          : isLight
                          ? 'bg-white border-zinc-300 shadow-sm'
                          : 'bg-zinc-900/60 border-zinc-800'
                      }`}
                    >
                      <span className={`text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-wider uppercase truncate max-w-full ${
                        isLight ? 'text-zinc-800 font-extrabold' : 'text-zinc-300 font-semibold'
                      }`}>
                        {t.name}
                      </span>
                      <span className={`text-8xl sm:text-9xl md:text-[11rem] lg:text-[13rem] font-black font-mono leading-none my-3 md:my-5 ${
                        isLight ? 'text-amber-700' : 'text-amber-400'
                      }`}>
                        {t.score}
                      </span>
                      <span className={`text-lg sm:text-2xl md:text-3xl lg:text-4xl font-extrabold uppercase tracking-widest ${
                        isLight ? 'text-zinc-600 font-bold' : 'text-zinc-400 font-medium'
                      }`}>
                        poeng
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 h-4" />
          </div>
        );
      }

      case 'kims_leik': {
        const d = blockToRender.data as KimsLeikData;
        const rawItems = d.items || [];
        const items: KimsLeikItem[] = rawItems.map((it, idx) => 
          typeof it === 'string' 
            ? { id: `kims_${idx}`, name: it, emoji: '📦', text: it } 
            : { id: it.id || `kims_${idx}`, name: it.name || it.text || '', emoji: it.emoji || it.iconName || '📦', text: it.text || it.name || '', iconName: it.iconName || it.emoji || '📦' }
        );
        const count = d.itemCount || (items.length >= 20 ? 20 : items.length <= 12 && items.length > 0 ? 12 : 16);
        const activeItems = items.slice(0, count);

        const gridColsClass = count === 20 
          ? 'grid-cols-4 sm:grid-cols-5' 
          : 'grid-cols-3 sm:grid-cols-4';

        const step = isActiveBlock ? activePointIndex : 0;

        const containerBg = bgContainerClass;
        const titleColor = `${mainTextColor} font-black`;
        const cardBgFase2 = cardBgClass;
        const badgeBgFase2 = isLight 
          ? 'text-zinc-700 bg-zinc-200/90 border border-zinc-300 font-semibold' 
          : 'text-zinc-400 bg-zinc-800/80 font-bold';
        const timerBg = cardBgClass;
        const timerText = 'text-[var(--screen-accent)] font-mono font-black';

        if (step === 0) {
          return (
            <div className={`w-full h-full relative flex flex-col items-center justify-center text-center pt-14 sm:pt-16 lg:pt-20 pb-8 px-8 sm:px-16 overflow-hidden my-auto ${containerBg}`}>
              {renderDiscreetMetadata(d.title || 'Kims leik')}
              <h1 className={`text-6xl sm:text-8xl md:text-9xl font-black tracking-wider uppercase font-sans ${titleColor}`}>
                KIMS LEIK
              </h1>
            </div>
          );
        }

        if (step === 1) {
          return (
            <div className={`w-full h-full relative flex flex-col items-center justify-between text-center pt-14 sm:pt-16 lg:pt-20 pb-6 sm:pb-10 px-6 sm:px-10 overflow-hidden my-auto space-y-4 ${containerBg}`}>
              {renderDiscreetMetadata(d.title || 'Kims leik', 'Memorering')}

              <div className={`w-full max-w-6xl flex-1 grid ${gridColsClass} gap-3 sm:gap-5 p-2 items-stretch my-auto overflow-hidden`}>
                {activeItems.map((it, idx) => {
                  const graphic = getItemGraphic(it);

                  return (
                    <div
                      key={it.id || idx}
                      className={`rounded-2xl flex flex-col items-center justify-center p-3 relative overflow-hidden transition-all duration-200 ${cardBgFase2}`}
                    >
                      <span className={`absolute top-2 left-2.5 text-xs font-mono px-2 py-0.5 rounded-md ${badgeBgFase2}`}>
                        {idx + 1}
                      </span>

                      <div className="w-full h-full flex items-center justify-center text-6xl sm:text-7xl md:text-8xl my-auto transition-transform duration-300">
                        {graphic.emoji}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="shrink-0 pb-2">
                <div className={`inline-flex items-center gap-2.5 px-6 py-2.5 rounded-2xl ${timerBg}`}>
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-500 animate-pulse" />
                  <span className={`text-3xl sm:text-4xl ${timerText}`}>
                    {formatTime(currentDisplaySeconds)}
                  </span>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-between text-center pt-14 sm:pt-16 lg:pt-20 pb-6 sm:pb-10 px-6 sm:px-10 overflow-hidden my-auto space-y-4 ${containerBg}`}>
            {renderDiscreetMetadata(d.title || 'Kims leik', 'Kva for gjenstandar hugsar de?')}

            <div className={`w-full max-w-6xl flex-1 grid ${gridColsClass} gap-3 sm:gap-5 p-2 items-stretch my-auto overflow-hidden`}>
              {activeItems.map((it, idx) => {
                const graphic = getItemGraphic(it);
                const isRevealed = kimsRevealedMap[idx] ?? false;

                const revealedBoxClass = isLight
                  ? 'bg-emerald-50 border-2 border-emerald-600 ring-2 ring-emerald-300 shadow-md text-zinc-950'
                  : 'bg-zinc-900 border-emerald-500/90 ring-2 ring-emerald-500/30 text-white shadow-xl';

                const unrevealedBoxClass = isLight
                  ? 'bg-zinc-100 border border-zinc-300 text-zinc-400'
                  : 'bg-zinc-950/80 border border-zinc-800/80 text-zinc-700';

                return (
                  <div
                    key={it.id || idx}
                    className={`rounded-2xl border-2 flex flex-col items-center justify-center p-3 relative transition-all duration-300 overflow-hidden ${
                      isRevealed ? revealedBoxClass : unrevealedBoxClass
                    }`}
                  >
                    <span className={`absolute top-2 left-2.5 text-xs font-mono font-bold px-2 py-0.5 rounded-md z-10 ${
                      isLight ? 'bg-zinc-200 text-zinc-700' : 'bg-zinc-800/90 text-zinc-400'
                    }`}>
                      {idx + 1}
                    </span>

                    {isRevealed ? (
                      <div className="w-full h-full flex flex-col items-center justify-center my-auto">
                        <div className="text-5xl sm:text-6xl md:text-7xl my-auto">
                          {graphic.emoji}
                        </div>
                        <span className={`text-sm sm:text-base font-extrabold truncate w-full mt-1 tracking-tight ${
                          isLight ? 'text-emerald-900' : 'text-emerald-400'
                        }`}>
                          {it.name || it.text || graphic.label}
                        </span>
                      </div>
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-black select-none my-auto ${
                        isLight ? 'text-zinc-400' : 'text-zinc-700'
                      }`}>
                        ?
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'reis_deg': {
        const d = blockToRender.data as ReisDegData;
        const statements = d.statements || [];
        const step = isActiveBlock ? activePointIndex : 0;

        const isIntro = step === 0 || statements.length === 0;
        const isFinished = statements.length > 0 && step > statements.length;
        const isStatementPhase = !isIntro && !isFinished;

        const titleText = d.title || 'Reis deg';
        const introText = d.intro || 'Reis deg dersom påstanden passar for deg, sit ned dersom ikkje!';

        const currentStatement = isStatementPhase ? statements[step - 1] : null;
        const rawStmt = (currentStatement?.statement || `Påstand ${step}`)
          .trim()
          .replace(/^(\d+[.)]\s*|[-•*]\s*)/, '')
          .replace(/^reis\s+deg\s+(dersom|viss|hvis|om)?\s*/i, (_m, g) => (g ? `${g.toLowerCase()} ` : 'hvis '));
        const statementText = rawStmt.replace(
          /^(hvis|dersom|viss|om)\s+([A-ZÆØÅ])/i,
          (_m, intro, firstChar) => `${intro.toLowerCase()} ${firstChar.toLowerCase()}`
        );

        const morphDuration = isLeaderPreview ? 0.25 : Math.max(0.55, speedDur.slide || 0.55);

        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-center text-center overflow-hidden my-auto select-none ${bgContainerClass}`}>
            {renderDiscreetMetadata(
              titleText,
              isStatementPhase
                ? `Påstand ${step} av ${statements.length}`
                : isFinished
                ? 'Ferdig'
                : undefined
            )}

            {/* 1. OVERSKRIFT «REIS DEG»: Glir saumlaust frå senter (intro) opp til fast, balansert topp-plassering (påstand 1..N) */}
            <motion.h1
              initial={false}
              animate={{
                top: isIntro ? '42%' : '10%',
                y: isIntro ? '-50%' : isFinished ? '-25%' : '0%',
                scale: isIntro ? 1.16 : isFinished ? 0.95 : 1,
                opacity: isFinished ? 0 : 1,
              }}
              transition={{
                duration: morphDuration,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ transformOrigin: 'center center' }}
              className={`absolute inset-x-0 mx-auto max-w-[92%] ${
                isLeaderPreview ? 'text-7xl' : 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl'
              } font-black tracking-tight leading-none text-center z-20 pointer-events-none ${mainTextColor}`}
            >
              {titleText}
            </motion.h1>

            {/* 2. MIDTSONE: Påstand + «Påstand X av Y» (eller slutt-melding på siste slide) */}
            <div className="w-full max-w-[92vw] h-full pt-36 sm:pt-44 lg:pt-48 pb-24 sm:pb-28 px-6 sm:px-12 flex flex-col items-center justify-center overflow-hidden z-10">
              <AnimatePresence mode="wait">
                {isStatementPhase && (
                  <motion.div
                    key={`stmt-${step}`}
                    initial={isBigScreen ? { opacity: 0, y: 12 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    exit={isBigScreen ? { opacity: 0, y: -10 } : undefined}
                    transition={{
                      duration: isLeaderPreview ? 0 : (speedDur.text || 0.42),
                      delay: isBigScreen && step === 1 ? 0.12 : 0,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="w-full h-full max-h-[52vh] flex flex-col justify-center items-center my-auto overflow-hidden"
                  >
                    <AutoFitSlideText
                      text={statementText}
                      subtitle={`Påstand ${step} av ${statements.length}`}
                      textColorClass={mainTextColor}
                      maxPt={75}
                    />
                  </motion.div>
                )}

                {isFinished && (
                  <motion.div
                    key="reis-deg-finished"
                    initial={isBigScreen ? { opacity: 0, y: 12, scale: 0.98 } : false}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={isBigScreen ? { opacity: 0, y: -8 } : undefined}
                    transition={{
                      duration: isLeaderPreview ? 0 : (speedDur.slide || 0.45),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="w-full max-w-5xl space-y-4 my-auto flex flex-col items-center justify-center"
                  >
                    <h2 className={`text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-tight ${mainTextColor}`}>
                      Bra jobba! Set dykk ned.
                    </h2>
                    <p className={`text-2xl sm:text-4xl font-medium opacity-70 ${subTextColor}`}>
                      Runden er ferdig.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. INSTRUKSJONSLINJE: Glir frå midten (intro) ned til fast plass i botnen gjennom alle påstandane, og fadar ut til slutt */}
            <motion.p
              initial={false}
              animate={{
                top: isIntro ? '58%' : isFinished ? '93%' : '90%',
                y: '-50%',
                scale: isIntro ? 1 : isFinished ? 0.56 : 0.62,
                opacity: isIntro ? 1 : isFinished ? 0 : 0.78,
              }}
              transition={{
                duration: morphDuration,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                color: 'var(--screen-accent)',
                transformOrigin: 'center center',
              }}
              className={`absolute inset-x-0 mx-auto max-w-5xl px-6 ${
                isLeaderPreview ? 'text-4xl' : 'text-2xl sm:text-3xl md:text-4xl'
              } font-bold tracking-tight leading-snug text-center z-20 pointer-events-none`}
            >
              {introText}
            </motion.p>
          </div>
        );
      }

      case 'bilete_avdekking': {
        const d = blockToRender.data as BileteAvdekkingData;

        if (!d.imageUrl) {
          return (
            <div className={`w-full h-full relative flex items-center justify-center p-12 text-center select-none ${bgContainerClass}`}>
              <div className="space-y-3">
                <p className={`text-3xl sm:text-5xl font-extrabold ${mainTextColor}`}>{d.title || 'Bilete-avdekking'}</p>
                <p className={`text-lg ${subTextColor}`}>
                  {d.clue || 'Last opp eit bilete på arbeidsbordet for å bruke denne konkurransen.'}
                </p>
              </div>
            </div>
          );
        }

        const gridSize = d.gridSize || 100;
        const N = getPuzzleGridDimension(gridSize);
        const permutation = generateChaosPermutation(gridSize, puzzleSeed);
        const isSolved = puzzlePhase === 'solved';
        const isAllRevealed = puzzlePhase === 'all_revealed';

        return (
          <div
            onClick={() => {
              if (puzzlePhase === 'all_revealed') {
                handleSolvePuzzle();
              }
            }}
            className={`w-full h-full relative flex items-center justify-center overflow-hidden my-auto select-none p-4 sm:p-6 md:p-8 transition-colors duration-300 ${bgContainerClass} ${
              isAllRevealed ? 'cursor-pointer' : ''
            }`}
          >
            {/* Sentrert behaldar som tek vare på det nøyaktige proporsjonsforholdet til biletet */}
            <div 
              className={`relative overflow-hidden rounded-2xl shadow-2xl transition-colors duration-300 ${
                isLight 
                  ? 'bg-zinc-100 border border-zinc-200' 
                  : 'bg-stone-950 border border-white/10'
              }`}
              style={{
                aspectRatio: puzzleImageAspect ? `${puzzleImageAspect}` : '16/9',
                width: puzzleImageAspect && puzzleImageAspect < 1 ? 'auto' : '100%',
                height: puzzleImageAspect && puzzleImageAspect < 1 ? '100%' : 'auto',
                maxWidth: isLeaderPreview ? '92%' : '92vw',
                maxHeight: isLeaderPreview ? '86%' : '86vh',
              }}
            >
              {/* Bakgrunnsfliser for uavdekte felt (visest som reine kvite eller mørke brikker før avdekking) */}
              {!isSolved && Array.from({ length: gridSize }).map((_, i) => {
                const r = Math.floor(i / N);
                const c = i % N;
                return (
                  <div
                    key={`slot-${i}`}
                    className={`absolute transition-colors duration-300 ${
                      isLight 
                        ? 'bg-white border-zinc-200/80 shadow-[inset_0_0_2px_rgba(0,0,0,0.05)]' 
                        : 'bg-stone-900/60 border-white/5 shadow-[inset_0_0_2px_rgba(0,0,0,0.4)]'
                    }`}
                    style={{
                      width: `${100 / N}%`,
                      height: `${100 / N}%`,
                      left: `${(c / N) * 100}%`,
                      top: `${(r / N) * 100}%`,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  />
                );
              })}

              {/* 100% brikkenettverk med GPU-akselerert translate3d */}
              {Array.from({ length: gridSize }).map((_, i) => {
                const homeRow = Math.floor(i / N);
                const homeCol = i % N;
                const chaosSlot = permutation[i] ?? i;
                const chaosRow = Math.floor(chaosSlot / N);
                const chaosCol = chaosSlot % N;

                const isRevealed = isActiveBlock ? (i < puzzleRevealedCount || isAllRevealed || isSolved) : false;

                // Delta for flytting frå heim til kaosslot
                const deltaCol = chaosCol - homeCol;
                const deltaRow = chaosRow - homeRow;

                const translateX = isSolved ? 0 : deltaCol * 100;
                const translateY = isSolved ? 0 : deltaRow * 100;

                const tileBorderColor = isSolved 
                  ? 'transparent' 
                  : (isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.25)');

                return (
                  <div
                    key={i}
                    className="absolute overflow-hidden"
                    style={{
                      width: `${100 / N}%`,
                      height: `${100 / N}%`,
                      left: `${(homeCol / N) * 100}%`,
                      top: `${(homeRow / N) * 100}%`,
                      backgroundImage: `url(${d.imageUrl})`,
                      backgroundSize: `${N * 100}% ${N * 100}%`,
                      backgroundPosition: `${(homeCol / (N - 1)) * 100}% ${(homeRow / (N - 1)) * 100}%`,
                      transform: `translate3d(${translateX}%, ${translateY}%, 0)`,
                      opacity: isRevealed ? 1 : 0,
                      borderWidth: isSolved ? '0px' : '1px',
                      borderColor: tileBorderColor,
                      borderStyle: 'solid',
                      boxShadow: isSolved 
                        ? 'none' 
                        : (isLight ? 'inset 0 0 2px rgba(0,0,0,0.08)' : 'inset 0 0 3px rgba(0,0,0,0.4)'),
                      transition: 'transform 2000ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 300ms ease-out, border-color 600ms ease-out, border-width 600ms ease-out',
                      willChange: 'transform, opacity',
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      }

      case 'beat_for_beat': {
        const d = blockToRender.data as BeatForBeatData;
        const words = d.words || [];
        const isStep2Fasit = isActiveBlock ? showBeatSolution : false;

        // Trekk ut reint songnamn (dersom d.title er "Beat for Beat: Deg å få skode", hent "Deg å få skode")
        const rawTitle = d.title || '';
        const songTitle = rawTitle.replace(/^beat\s+for\s+beat\s*:\s*/i, '').trim();

        // STEG 2: DEDIKERT FULLSKJERM-FASIT
        if (isStep2Fasit) {
          return (
            <div className={`w-full h-full relative flex flex-col items-center justify-center text-center pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-14 px-8 sm:px-14 md:px-20 overflow-y-auto my-auto ${bgContainerClass}`}>
              {renderDiscreetMetadata('Beat for Beat', 'Fasit')}

              <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center space-y-6 sm:space-y-8 md:space-y-10 my-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 font-extrabold text-xs sm:text-sm uppercase tracking-widest shadow-xs">
                  <Music2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                  <span>Fasit {d.category ? `• ${d.category}` : '• Song'}</span>
                </div>

                {songTitle && (
                  <h1 className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-tight ${
                    isLight ? 'text-amber-800' : 'text-amber-400'
                  }`}>
                    «{songTitle}»
                  </h1>
                )}

                {d.solution ? (
                  <div className="w-full max-w-5xl mx-auto px-4">
                    <p className={`text-2xl sm:text-4xl md:text-5xl lg:text-[52px] font-medium leading-relaxed sm:leading-relaxed md:leading-[1.38] whitespace-pre-line tracking-normal ${
                      isLight ? 'text-stone-900' : 'text-stone-100'
                    }`}>
                      {d.solution}
                    </p>
                  </div>
                ) : (
                  <p className={`text-xl sm:text-2xl italic opacity-60 ${mainTextColor}`}>
                    Ingen fulltekst oppgitt
                  </p>
                )}
              </div>
            </div>
          );
        }

        // STEG 1: SPELBRETT MED STORE ORDKORT
        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-center text-center pt-14 sm:pt-16 lg:pt-20 pb-6 sm:pb-12 px-6 sm:px-12 md:px-16 overflow-hidden my-auto space-y-8 md:space-y-14 ${bgContainerClass}`}>
            {renderDiscreetMetadata('Beat for Beat')}

            <div className="w-full max-w-7xl flex flex-col justify-center items-center my-auto space-y-8 md:space-y-14">
              {/* STORSKJERM-TITTEL: VESENTLEG STØRRE (64-72px+) OG ALLTID NØYTRAL */}
              <h1 className={`text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight leading-none ${mainTextColor}`}>
                Beat for Beat
              </h1>

              {/* STORE ORDKORT: 44-56px feit skrift, god høgde og luft for å fylle storskjermen */}
              <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-7 md:gap-8 max-w-7xl mx-auto px-4">
                {words.map((word, idx) => {
                  const isRevealed = isActiveBlock ? (beatRevealedMap[idx] ?? false) : false;

                  return (
                    <div
                      key={idx}
                      className={`min-h-[140px] sm:min-h-[160px] md:min-h-[190px] min-w-[130px] sm:min-w-[160px] md:min-w-[200px] px-8 sm:px-10 md:px-12 rounded-3xl md:rounded-4xl transition-all duration-300 flex items-center justify-center text-center shadow-xl ${
                        isRevealed
                          ? isLight
                            ? 'bg-amber-50/95 border-3 border-amber-600 shadow-2xl ring-4 ring-amber-500/20 text-amber-850'
                            : 'bg-zinc-900/95 border-3 border-amber-500 shadow-2xl ring-4 ring-amber-500/30 text-amber-400'
                          : isLight
                          ? 'bg-white border-2 border-zinc-300 shadow-md text-zinc-400 select-none'
                          : 'bg-zinc-900 border-2 border-zinc-700 shadow-xl text-zinc-500 select-none'
                      }`}
                    >
                      {isRevealed ? (
                        <span className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight ${
                          isLight ? 'text-amber-900' : 'text-amber-400'
                        }`}>
                          {word}
                        </span>
                      ) : (
                        <span className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black ${
                          isLight ? 'text-zinc-400' : 'text-zinc-600'
                        }`}>
                          {idx + 1}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 'ord_for_ord': {
        const d = blockToRender.data as OrdForOrdData;
        const words = d.words || [];
        const isStep2Fasit = isActiveBlock ? showBeatSolution : false;

        // STEG 2: DEDIKERT FULLSKJERM-FASIT
        if (isStep2Fasit) {
          return (
            <div className={`w-full h-full relative flex flex-col items-center justify-center text-center pt-14 sm:pt-16 lg:pt-20 pb-8 sm:pb-14 px-8 sm:px-14 md:px-20 overflow-y-auto my-auto ${bgContainerClass}`}>
              {renderDiscreetMetadata('Ord for ord', 'Fasit')}

              <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center space-y-6 sm:space-y-8 md:space-y-10 my-auto">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-500 font-extrabold text-xs sm:text-sm uppercase tracking-widest shadow-xs">
                  <Type className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
                  <span>Fasit {d.reference ? `• ${d.reference}` : '• Sitat'}</span>
                </div>

                {d.reference && (
                  <h1 className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-tight ${
                    isLight ? 'text-indigo-950' : 'text-indigo-300'
                  }`}>
                    {d.reference}
                  </h1>
                )}

                {d.quote ? (
                  <div className="w-full max-w-5xl mx-auto px-4">
                    <p className={`text-2xl sm:text-4xl md:text-5xl lg:text-[52px] font-medium leading-relaxed sm:leading-relaxed md:leading-[1.38] whitespace-pre-line tracking-normal ${
                      isLight ? 'text-stone-900' : 'text-stone-100'
                    }`}>
                      «{d.quote}»
                    </p>
                  </div>
                ) : (
                  <p className={`text-xl sm:text-2xl italic opacity-60 ${mainTextColor}`}>
                    Ingen fulltekst oppgitt
                  </p>
                )}
              </div>
            </div>
          );
        }

        // STEG 1: SPELBRETT MED STORE ORDKORT
        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-center text-center pt-14 sm:pt-16 lg:pt-20 pb-6 sm:pb-12 px-6 sm:px-12 md:px-16 overflow-hidden my-auto space-y-8 md:space-y-14 ${bgContainerClass}`}>
            {renderDiscreetMetadata('Ord for ord')}

            <div className="w-full max-w-7xl flex flex-col justify-center items-center my-auto space-y-8 md:space-y-12">
              {/* STORSKJERM-TITTEL: VESENTLEG STØRRE (64-72px+) OG ALLTID NØYTRAL */}
              <h1 className={`text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight leading-none ${mainTextColor}`}>
                Ord for ord
              </h1>

              {/* Valfritt hint dersom oppgitt */}
              {d.hint && (
                <p className={`text-xl sm:text-2xl md:text-3xl font-medium opacity-80 max-w-4xl mx-auto ${subTextColor}`}>
                  {d.hint}
                </p>
              )}

              {/* STORE ORDKORT: 44-56px feit skrift, god høgde og luft for å fylle storskjermen */}
              <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-7 md:gap-8 max-w-7xl mx-auto px-4">
                {words.map((word, idx) => {
                  const isRevealed = isActiveBlock ? (beatRevealedMap[idx] ?? false) : false;

                  return (
                    <div
                      key={idx}
                      className={`min-h-[140px] sm:min-h-[160px] md:min-h-[190px] min-w-[130px] sm:min-w-[160px] md:min-w-[200px] px-8 sm:px-10 md:px-12 rounded-3xl md:rounded-4xl transition-all duration-300 flex items-center justify-center text-center shadow-xl ${
                        isRevealed
                          ? isLight
                            ? 'bg-indigo-50/95 border-3 border-indigo-600 shadow-2xl ring-4 ring-indigo-500/20 text-indigo-950 font-black'
                            : 'bg-zinc-900/95 border-3 border-indigo-400 shadow-2xl ring-4 ring-indigo-400/30 text-indigo-200 font-black'
                          : isLight
                          ? 'bg-white border-2 border-zinc-300 shadow-md text-zinc-400 select-none font-bold'
                          : 'bg-zinc-900 border-2 border-zinc-700 shadow-xl text-zinc-500 select-none font-bold'
                      }`}
                    >
                      {isRevealed ? (
                        <span className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight ${
                          isLight ? 'text-indigo-950' : 'text-indigo-200'
                        }`}>
                          {word}
                        </span>
                      ) : (
                        <span className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black ${
                          isLight ? 'text-zinc-400' : 'text-zinc-600'
                        }`}>
                          {idx + 1}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 'kven_skal_ut': {
        const d = blockToRender.data as KvenSkalUtData;
        const rawItems = Array.isArray(d.items) && d.items.length > 0 ? d.items : [];
        const items: KvenSkalUtItem[] = rawItems.length > 0
          ? rawItems
          : [
              {
                id: 'ksu_1',
                options: {
                  A: d.optionA || 'Alternativ A',
                  B: d.optionB || 'Alternativ B',
                  C: d.optionC || 'Alternativ C',
                  D: d.optionD || 'Alternativ D',
                },
                correctOption: d.correctOption || 'A',
                explanation: d.explanation || 'Pedagogisk forklaring på kva som skal ut.',
              },
            ];

        // Active task index
        const taskIdx = Math.min(
          items.length - 1,
          Math.max(0, isActiveBlock ? activePointIndex : (d.currentIndex ?? 0))
        );
        const currentTask = items[taskIdx] || items[0];
        const isAnswerRevealed = isActiveBlock ? (quizShowAnswer || Boolean(kvenRevealedMap[taskIdx])) : false;
        const correctLetter = currentTask.correctOption || 'A';
        const categoryOrTitle = d.title || 'Kven skal ut?';

        return (
          <div className={`w-full h-full relative flex flex-col items-center justify-between text-center pt-12 sm:pt-14 lg:pt-16 pb-8 sm:pb-12 px-6 sm:px-10 md:px-12 overflow-hidden my-auto ${bgContainerClass}`}>
            {renderDiscreetMetadata(
              categoryOrTitle,
              items.length > 1 ? `Oppgåve ${taskIdx + 1} av ${items.length}` : undefined
            )}

            {/* HOVUDINNHALD: LØFTA OVERSKRIFT MED GOD LUFT NED TIL STABIL 2x2 GRID */}
            <div className="w-full max-w-[94%] flex-1 flex flex-col justify-center items-center my-auto">
              <h1 className={`${isLeaderPreview ? 'text-7xl' : 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl'} font-black tracking-tight leading-none max-w-[92%] mx-auto -mt-2 sm:-mt-4 mb-10 sm:mb-12 lg:mb-14 ${mainTextColor}`}>
                {categoryOrTitle}
              </h1>

              {/* 2x2 RUTENETT M/ KLIKKBARE STORE GAMESHOW-KORT (STABIL HØGDE 2x2) */}
              <div className={`w-full max-w-[92%] grid ${isLeaderPreview ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-5 sm:gap-7 text-left items-stretch`}>
                {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                  const optText = currentTask.options[letter];
                  if (!optText) return null;

                  const isCorrect = correctLetter === letter;
                  const isShaking = shakeOption === letter;
                  const isEliminated = isAnswerRevealed && isCorrect;
                  const isGreenActive = isActiveBlock && isCorrect && !isEliminated && Boolean(kvenGreenMap[taskIdx]);

                  // Dynamic Card Style
                  const hoverStyles = isLeaderPreview
                    ? isLight
                      ? ' hover:border-amber-400 hover:shadow-xl hover:scale-[1.01]'
                      : ' hover:border-amber-500 hover:shadow-amber-500/10 hover:scale-[1.01]'
                    : '';

                  let cardBgStyles = isLight
                    ? `bg-white border-2 border-stone-200/90 text-stone-900 shadow-lg${hoverStyles}`
                    : `bg-zinc-900/90 border-2 border-zinc-700/80 text-zinc-100 shadow-2xl${hoverStyles}`;

                  let badgeStyles = isLight
                    ? 'bg-neutral-100 text-neutral-700 font-extrabold'
                    : 'bg-neutral-800 text-neutral-300 font-extrabold';

                  if (isEliminated) {
                    cardBgStyles = `${isLight ? 'bg-white text-stone-900' : 'bg-zinc-900/90 text-zinc-100'} ring-4 ring-emerald-500 border-4 border-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.5)] animate-kven-flyout opacity-0 pointer-events-none`;
                    badgeStyles = 'bg-emerald-600 text-white font-black';
                  } else if (isGreenActive) {
                    cardBgStyles = `${isLight ? 'bg-white text-stone-900' : 'bg-zinc-900/90 text-zinc-100'} border-4 border-emerald-500 ring-4 ring-emerald-400/80 shadow-[0_0_35px_rgba(16,185,129,0.5)] scale-[0.98] transition-all duration-300`;
                    badgeStyles = 'bg-emerald-600 text-white font-black';
                  } else if (isShaking) {
                    cardBgStyles = 'bg-rose-500/15 border-2 border-rose-500 text-rose-900 dark:text-rose-100 ring-4 ring-rose-500 animate-kven-shake';
                    badgeStyles = 'bg-rose-600 text-white font-black';
                  }

                  return (
                    <div
                      key={letter}
                      onClick={isLeaderPreview ? () => handleKvenOptionClick(letter, correctLetter, taskIdx) : undefined}
                      className={`min-h-[140px] md:min-h-[180px] p-6 md:p-8 rounded-3xl transition-all duration-300 flex items-center justify-between gap-5 relative overflow-hidden ${isLeaderPreview ? 'cursor-pointer' : 'cursor-default'} select-none ${cardBgStyles}`}
                    >
                      <div className="flex items-center gap-5 min-w-0 flex-1">
                        <span className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl text-2xl md:text-3xl font-extrabold flex items-center justify-center shrink-0 shadow-sm ${badgeStyles}`}>
                          {letter}
                        </span>
                        <p className={`text-3xl md:text-4xl lg:text-5xl 2xl:text-6xl font-bold tracking-tight leading-snug break-words my-auto ${
                          isLight ? 'text-neutral-900' : 'text-neutral-100'
                        }`}>
                          {optText}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 'bilete': {
        const d = blockToRender.data as BileteData;
        const layout = d.layout || '1';
        const images = d.images || [];
        const blockTitle = d.title || 'Bilete';
        const containerBgClass = isLight ? 'bg-white text-zinc-950' : 'bg-black text-white';
        const borderDividerClass = isLight ? 'border-zinc-200' : 'border-zinc-800/80';
        const hasTitle = Boolean(d.title && d.title.trim() && d.title !== 'Bilete');
        const displayCaption = Number(layout) === 1 ? getCleanCaption(images[0]?.caption) : '';

        return (
          <div className={`w-full h-full absolute inset-0 overflow-hidden p-0 flex items-center justify-center select-none ${containerBgClass}`}>
            {hasTitle && (
              <div className="absolute top-3 left-6 sm:top-4 sm:left-8 z-20 pointer-events-none flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium border backdrop-blur-sm shadow-xs ${
                  isLight ? 'bg-white/95 text-zinc-900 border-zinc-200' : 'bg-black/70 text-white border-white/10'
                }`}>
                  {blockTitle}
                </span>
              </div>
            )}

            <div className="w-full h-full absolute inset-0 overflow-hidden p-0 flex items-center justify-center">
              {Number(layout) === 1 ? (
                <div className="w-full h-full absolute inset-0 overflow-hidden p-0 flex items-center justify-center">
                  {images[0]?.url ? (
                    <img
                      src={images[0].url}
                      alt={displayCaption || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={isLight ? 'text-zinc-400' : 'text-stone-500'}>Ingen biletkjelde lagt til</div>
                  )}
                  {displayCaption ? (
                    <div className="absolute bottom-6 inset-x-0 z-10 px-6 text-center pointer-events-none">
                      <p className="inline-block px-5 py-2.5 rounded-2xl bg-black/65 backdrop-blur-md text-white text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-center leading-tight shadow-lg">
                        {displayCaption}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : Number(layout) === 2 ? (
                <div className="w-full h-full grid grid-cols-1 sm:grid-cols-2 gap-0 overflow-hidden p-0">
                  {images.slice(0, 2).map((img, i) => (
                    <div
                      key={img.id || i}
                      className={`w-full h-full relative overflow-hidden flex items-center justify-center border ${borderDividerClass} ${isLight ? 'bg-zinc-50' : 'bg-stone-950'} p-0`}
                    >
                      <span className={`absolute top-3 left-3 text-xs font-mono font-bold px-2.5 py-1 rounded-md z-10 pointer-events-none border shadow-xs ${
                        isLight ? 'bg-white/95 text-zinc-900 border-zinc-300' : 'bg-black/80 text-white border-white/10'
                      }`}>
                        {img.label || ['A', 'B'][i] || i + 1}
                      </span>
                      {img.url ? (
                        <img
                          src={img.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={isLight ? 'text-zinc-400 text-xs' : 'text-stone-500 text-xs'}>Mangler bilete {i + 1}</div>
                      )}
                      {(() => {
                        const cap = getCleanCaption(img.caption);
                        if (!cap) return null;
                        return (
                          <div className="absolute bottom-4 inset-x-0 z-10 px-3 text-center pointer-events-none">
                            <p className="inline-block px-4 py-1.5 rounded-xl bg-black/65 backdrop-blur-md text-white text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-center leading-snug line-clamp-2">
                              {cap}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0 overflow-hidden p-0">
                  {images.slice(0, 4).map((img, i) => (
                    <div
                      key={img.id || i}
                      className={`w-full h-full relative overflow-hidden flex items-center justify-center border ${borderDividerClass} ${isLight ? 'bg-zinc-50' : 'bg-stone-950'} p-0`}
                    >
                      <span className={`absolute top-2 left-2 text-[11px] font-mono font-bold px-2.5 py-1 rounded-md z-10 pointer-events-none border shadow-xs ${
                        isLight ? 'bg-white/95 text-zinc-900 border-zinc-300' : 'bg-black/80 text-white border-white/10'
                      }`}>
                        {img.label || ['A', 'B', 'C', 'D'][i] || i + 1}
                      </span>
                      {img.url ? (
                        <img
                          src={img.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={isLight ? 'text-zinc-400 text-xs' : 'text-stone-500 text-xs'}>Mangler bilete {i + 1}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'lysbileteshow': {
        const d = blockToRender.data as LysbileteshowData;
        const images = d.images || [];
        const activeSlideIdx = isActiveBlock ? currentSlideIndex : 0;
        const containerBgClass = isLight ? 'bg-white text-zinc-950' : 'bg-black text-white';

        return (
          <div className={`w-full h-full relative flex items-center justify-center p-0 overflow-hidden select-none ${containerBgClass}`}>
            <SeamlessCrossfadeSlideshow
              images={images}
              activeSlideIdx={activeSlideIdx}
              isLight={isLight}
            />
          </div>
        );
      }

      case 'bildebibelen': {
        const d = blockToRender.data as BildeBibelenData;
        const scenes = d.scenes || [];
        const sceneIndex = isActiveBlock ? Math.min(activePointIndex, Math.max(0, scenes.length - 1)) : 0;
        const activeScene = scenes[sceneIndex] || scenes[0];
        const containerBgClass = isLight ? 'bg-white text-zinc-950' : 'bg-black text-white';

        if (!activeScene || !activeScene.imageUrl) {
          return (
            <div className={`w-full h-full relative flex flex-col items-center justify-center p-8 text-center select-none ${containerBgClass}`}>
              <BookOpen className="w-16 h-16 opacity-30 mb-4" />
              <h2 className="text-3xl font-bold">{d.title || 'BildeBibelen'}</h2>
              <p className="opacity-60 mt-2">Søk opp og last inn ein teikneserie på arbeidsbordet.</p>
            </div>
          );
        }

        return (
          <div className={`w-full h-full relative flex items-center justify-center p-0 overflow-hidden select-none ${containerBgClass}`}>
            {d.title && d.title.trim() && (
              <div className="absolute top-3 left-6 sm:top-4 sm:left-8 z-20 pointer-events-none">
                <span className={`px-3.5 py-1 rounded-full text-xs sm:text-sm font-medium border backdrop-blur-md shadow-xs ${
                  isLight ? 'bg-white/90 text-zinc-900 border-zinc-200' : 'bg-black/60 text-white border-white/10'
                }`}>
                  {d.title} • Scene {sceneIndex + 1} av {scenes.length}
                </span>
              </div>
            )}

            <SeamlessCrossfadeSlideshow
              images={scenes.map((s) => ({ id: s.id, url: s.imageUrl, caption: s.imageCaption || s.scriptureRef }))}
              activeSlideIdx={sceneIndex}
              isLight={isLight}
            />
          </div>
        );
      }

      case 'bilde': {
        const d = blockToRender.data as BildeData;
        const layout = d.layout || '1';
        const images = d.images || [];
        const blockTitle = d.title || session.title || 'Bilete';
        const isSlideshow = d.imageMode === 'slideshow';
        const activeSlideIdx = isActiveBlock ? currentSlideIndex : 0;
        const activeImg = images[activeSlideIdx] || images[0];

        const containerBgClass = isLight ? 'bg-white text-zinc-950' : 'bg-black text-white';
        const borderDividerClass = isLight ? 'border-zinc-200' : 'border-zinc-800/80';

        if (isSlideshow) {
          return (
            <div className={`w-full h-full relative flex items-center justify-center p-0 overflow-hidden select-none ${containerBgClass}`}>
              {/* Valfri diskret tittel dersom brukaren har gjeve leddet ein eigen tittel */}
              {d.title && d.title.trim() && d.title !== 'Bilete' && (
                <div className="absolute top-3 left-6 sm:top-4 sm:left-8 z-20 pointer-events-none">
                  <span className={`px-3.5 py-1 rounded-full text-xs sm:text-sm font-medium border backdrop-blur-md shadow-xs ${
                    isLight ? 'bg-white/90 text-zinc-900 border-zinc-200' : 'bg-black/60 text-white border-white/10'
                  }`}>
                    {d.title}
                  </span>
                </div>
              )}

              {/* Sjølve lysbiletet med filmisk, saumlaus crossfade utan svart opphald */}
              <SeamlessCrossfadeSlideshow
                images={images}
                activeSlideIdx={activeSlideIdx}
                isLight={isLight}
              />
            </div>
          );
        }

        return (
          <div className={`w-full h-full absolute inset-0 overflow-hidden p-0 flex items-center justify-center select-none ${containerBgClass}`}>
            {/* Diskret, kompakt overlegg for tittel */}
            {d.title && d.title.trim() && d.title !== 'Bilete' && (
              <div className="absolute top-3 left-6 sm:top-4 sm:left-8 z-20 pointer-events-none flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium border backdrop-blur-sm shadow-xs ${
                  isLight ? 'bg-white/95 text-zinc-900 border-zinc-200' : 'bg-black/70 text-white border-white/10'
                }`}>
                  {blockTitle}
                </span>
              </div>
            )}

            {/* Biletflate heilt ut i hjørna */}
            <div className="w-full h-full absolute inset-0 overflow-hidden p-0 flex items-center justify-center">
              {layout === '1' ? (
                <div className="w-full h-full absolute inset-0 overflow-hidden p-0 flex items-center justify-center">
                  {images[0]?.url ? (
                    <img
                      src={images[0].url}
                      alt={getCleanCaption(images[0]?.caption) || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={isLight ? 'text-zinc-400' : 'text-stone-500'}>Ingen biletkjelde lagt til</div>
                  )}
                  {(() => {
                    const displayCaption = getCleanCaption(images[0]?.caption);
                    if (!displayCaption) return null;
                    return (
                      <div className="absolute bottom-6 inset-x-0 z-10 px-6 text-center pointer-events-none">
                        <p className="inline-block px-5 py-2.5 rounded-2xl bg-black/65 backdrop-blur-md text-white text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-center leading-tight shadow-lg">
                          {displayCaption}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              ) : layout === '2' ? (
                <div className="w-full h-full grid grid-cols-1 sm:grid-cols-2 gap-0 overflow-hidden p-0">
                  {images.slice(0, 2).map((img: any, i: number) => (
                    <div
                      key={img.id || i}
                      className={`w-full h-full relative overflow-hidden flex items-center justify-center border ${borderDividerClass} ${isLight ? 'bg-zinc-50' : 'bg-stone-950'} p-0`}
                    >
                      <span className={`absolute top-3 left-3 text-xs font-mono font-bold px-2.5 py-1 rounded-md z-10 pointer-events-none border shadow-xs ${
                        isLight ? 'bg-white/95 text-zinc-900 border-zinc-300' : 'bg-black/80 text-white border-white/10'
                      }`}>
                        {img.label || ['A', 'B'][i] || i + 1}
                      </span>
                      {img.url ? (
                        <img
                          src={img.url}
                          alt={getCleanCaption(img.caption) || ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={isLight ? 'text-zinc-400 text-xs' : 'text-stone-500 text-xs'}>Mangler bilete {i + 1}</div>
                      )}
                      {(() => {
                        const displayCaption = getCleanCaption(img.caption);
                        if (!displayCaption) return null;
                        return (
                          <div className="absolute bottom-4 inset-x-0 z-10 px-3 text-center pointer-events-none">
                            <p className="inline-block px-4 py-1.5 rounded-xl bg-black/65 backdrop-blur-md text-white text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-center leading-snug line-clamp-2">
                              {displayCaption}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0 overflow-hidden p-0">
                  {images.slice(0, 4).map((img: any, i: number) => (
                    <div
                      key={img.id || i}
                      className={`w-full h-full relative overflow-hidden flex items-center justify-center border ${borderDividerClass} ${isLight ? 'bg-zinc-50' : 'bg-stone-950'} p-0`}
                    >
                      <span className={`absolute top-2 left-2 text-[11px] font-mono font-bold px-2.5 py-1 rounded-md z-10 pointer-events-none border shadow-xs ${
                        isLight ? 'bg-white/95 text-zinc-900 border-zinc-300' : 'bg-black/80 text-white border-white/10'
                      }`}>
                        {img.label || ['A', 'B', 'C', 'D'][i] || i + 1}
                      </span>
                      {img.url ? (
                        <img
                          src={img.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={isLight ? 'text-zinc-400 text-xs' : 'text-stone-500 text-xs'}>Mangler bilete {i + 1}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'video': {
        const d = blockToRender.data as any;
        const videoInfo = parseVideoUrl(d.videoUrl, d.startTimeSeconds, d.stopTimeSeconds);
        const blockTitle = d.title;

        if (isLeaderPreview) {
          // I LEIARPREVIEW: ALLTID HELT TUST / DEMPA for å forhindre lyd-ekko 100%!
          return (
            <div className="w-full h-full relative flex flex-col items-center justify-center bg-black text-white p-0 m-0 overflow-hidden select-none">
              {blockTitle && (
                <div className="absolute top-3 left-4 z-20 pointer-events-none flex items-center gap-2 drop-shadow-md">
                  <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs text-white/80 font-bold text-xs border border-white/10 tracking-tight">
                    {blockTitle}
                  </span>
                </div>
              )}
              <div className="w-full h-full flex-1 flex items-center justify-center p-2 overflow-hidden">
                {videoInfo.isValid ? (
                  <div className="w-full h-full max-w-7xl aspect-video rounded-xl overflow-hidden bg-black shadow-2xl flex items-center justify-center relative">
                    {videoInfo.type === 'youtube' && videoInfo.videoId ? (
                      <div className="w-full h-full relative flex items-center justify-center bg-stone-900">
                        <img
                          src={`https://img.youtube.com/vi/${videoInfo.videoId}/hqdefault.jpg`}
                          alt=""
                          className="w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg border border-white/20">
                            <Play className="w-8 h-8 fill-current ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : videoInfo.type === 'vimeo' || videoInfo.type === 'youtube' ? (
                      <iframe
                        src={`${videoInfo.embedUrl}&mute=1&muted=1&autoplay=0`}
                        title={blockTitle || 'Video Preview'}
                        className="w-full h-full border-0 pointer-events-none"
                      />
                    ) : (
                      <video
                        src={videoInfo.embedUrl}
                        muted={true}
                        autoPlay={false}
                        controls={false}
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center text-stone-400 text-xs font-medium p-4 rounded-xl border border-stone-800 bg-stone-900/60">
                    {d.videoUrl ? 'Ugyldig videolenke' : 'Ingen video'}
                  </div>
                )}
              </div>
            </div>
          );
        }

        // PÅ SJØLVE STORSKJERMEN (PUBLIKUM):
        let finalEmbedUrl = videoInfo.embedUrl;
        if (videoInfo.type === 'youtube') {
          if (isVideoMuted) {
            finalEmbedUrl += '&mute=1';
          }
        } else if (videoInfo.type === 'vimeo') {
          if (isVideoMuted) {
            finalEmbedUrl += '&muted=1';
          }
        }

        return (
          <div className="w-full h-full relative flex flex-col items-center justify-center bg-black text-white p-0 m-0 overflow-hidden select-none">
            {/* Diskret overlegg for tittel dersom oppgitt */}
            {blockTitle && (
              <div className="absolute top-3 left-4 sm:top-4 sm:left-6 z-20 pointer-events-none flex items-center gap-2 drop-shadow-md">
                <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs text-white/80 font-bold text-sm sm:text-base border border-white/10 tracking-tight">
                  {blockTitle}
                </span>
              </div>
            )}

            {/* Rein 16:9-vising av videoen utan unødig rammetekst eller teknisk støy */}
            <div className="w-full h-full flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
              {videoInfo.isValid ? (
                <div className="w-full h-full max-w-7xl aspect-video rounded-xl overflow-hidden bg-black shadow-2xl flex items-center justify-center relative">
                  {videoInfo.type === 'youtube' || videoInfo.type === 'vimeo' ? (
                    <iframe
                      ref={videoIframeRef}
                      src={finalEmbedUrl}
                      title={blockTitle || 'Video'}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      ref={videoElementRef}
                      src={videoInfo.embedUrl}
                      controls
                      autoPlay={isVideoPlaying}
                      muted={isVideoMuted}
                      loop={!!d.loop}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              ) : (
                <div className="text-center text-stone-400 text-base sm:text-lg font-medium p-8 rounded-2xl border border-stone-800 bg-stone-900/60">
                  {d.videoUrl ? 'Ugyldig videolenke – sjekk URL på arbeidsbordet' : 'Ingen videokjelde lagt til enno'}
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'svart_skjerm': {
        return (
          <div className="w-full h-full bg-black relative flex items-center justify-center select-none" />
        );
      }
    }
  };

  // =========================================================================
  // 1.2 DYNAMISK TRANSITION-NØKKEL FOR UNIVERSELLE LYSBILDEOVERGONGAR
  // Sikrar at kvar gong noko skiftar (blokk, quiz-spørsmål, fasit, steg, lysbilde)
  // glir innhaldet automatisk mjukt inn.
  // =========================================================================
  const getTransitionKey = (blockToRender: TeachingBlock, isActiveBlock: boolean): string => {
    if (blockToRender.hiddenOnScreen) {
      return `${blockToRender.id}-hidden`;
    }
    if (!isActiveBlock) {
      return `preview-${blockToRender.id}`;
    }

    switch (blockToRender.type) {
      case 'quiz':
        return `${blockToRender.id}`;
      case 'kven_skal_ut': {
        const activeTaskIndex = activePointIndex;
        return `${blockToRender.id}-task${activeTaskIndex}`;
      }
      case 'beat_for_beat':
      case 'ord_for_ord':
        return `${blockToRender.id}-${showBeatSolution ? 'fasit' : 'board'}`;
      case 'reis_deg':
        return `${blockToRender.id}`; // Ikkje step, slik at overskrifta står heilt i ro!
      case 'henteleik':
      case 'kims_leik':
        return `${blockToRender.id}-step${activePointIndex}`;
      case 'stikkord':
      case 'undervisning':
      case 'sang_salme':
      case 'bildebibelen':
      case 'svart_skjerm':
        // MÅ vere stabil slik at storskjermen ikkje unmountast og blinkar ved vers/stikkord/scene-skifte
        return `${blockToRender.id}`;
      case 'lysbileteshow':
      case 'bilete':
      case 'bilde': {
        // MÅ vere stabil slik at SeamlessCrossfadeSlideshow ikkje unmountast ved kvart bilete
        return `${blockToRender.id}`;
      }
      default:
        return `${blockToRender.id}-${activePointIndex || activeVerseIndex || 0}`;
    }
  };

  // =========================================================================
  // 1.3 SENTRAL TRANSITION-WRAPPER PÅ STORSKJERM (KEYNOTE-STIL)
  // Silkemyk kryssfading med 8px translateY, stabil bakgrunn, ingen flimring
  // =========================================================================
  const isDark = audienceTheme === 'dark';
  const themeColors = isDark ? PALETTE_CONFIGS[palette].dark : PALETTE_CONFIGS[palette].light;
  const speedDur = SPEED_DURATIONS[speed];
  const screenCssVars = {
    '--screen-bg': themeColors.bg,
    '--screen-card-bg': themeColors.cardBg,
    '--screen-accent': themeColors.accent,
    '--screen-glow': themeColors.glow,
    '--screen-badge-bg': themeColors.badgeBg,
    '--screen-text': themeColors.text,
    '--screen-subtle': themeColors.subtle,
    '--anim-border-dur': `${speedDur.border}s`,
    '--anim-badge-dur': `${speedDur.badge}s`,
    '--anim-text-dur': `${speedDur.text}s`,
  } as React.CSSProperties;

  const renderAudienceScreen = (blockToRender: TeachingBlock = currentBlock, isLeaderPreview: boolean = false) => {
    const isActiveBlock = blockToRender.id === currentBlock.id;

    // Blackout-modus (heilt svart storskjerm for konsentrasjon i rommet)
    if (isBlackout) {
      if (isLeaderPreview) {
        return (
          <div
            onClick={() => {
              setIsBlackout(false);
              if (bcRef.current) {
                bcRef.current.postMessage({
                  type: 'TOGGLE_BLACKOUT',
                  senderId: windowIdRef.current,
                  isBlackout: false,
                });
              }
            }}
            className="w-full h-full bg-black flex flex-col items-center justify-center text-stone-400 cursor-pointer select-none my-auto rounded-3xl border border-stone-800 p-4 text-center"
          >
            <MonitorOff className="w-12 h-12 text-stone-500 mb-2 animate-pulse" />
            <p className="text-lg font-bold text-stone-200">Storskjerm mørklagd</p>
            <p className="text-xs text-stone-400 mt-1 font-medium">Trykk B eller piltast for å slå på att</p>
          </div>
        );
      }
      return (
        <div className="w-full h-full bg-black select-none transition-colors duration-400" />
      );
    }

    const isSvartSkjerm = blockToRender.type === 'svart_skjerm';
    const transitionKey = getTransitionKey(blockToRender, isActiveBlock);
    const slideDuration = isLeaderPreview ? 0 : (speedDur.slide || 0.5);

    return (
      <div
        style={{
          ...screenCssVars,
          backgroundColor: isSvartSkjerm ? '#000000' : themeColors.bg,
          color: isSvartSkjerm ? '#ffffff' : themeColors.text,
        }}
        className="w-full h-full relative overflow-hidden flex items-center justify-center select-none font-sans"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={transitionKey}
            initial={{ opacity: 0, y: isLeaderPreview ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isLeaderPreview ? 0 : -6 }}
            transition={{
              duration: slideDuration,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="w-full h-full relative flex items-center justify-center overflow-hidden"
          >
            {renderSlideInnerContent(blockToRender, isActiveBlock, isLeaderPreview)}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  // =========================================================================
  // 1.5 UBESKÅRE 16:9 PREVIEW FOR LEIARVISNING (PERFEKT SKALERT 1:1 MIRROR)
  // =========================================================================
  const renderLiveAudiencePreview = (block: TeachingBlock) => {
    const isLight = audienceTheme === 'light';
    const isClickablePuzzle = block.type === 'bilete_avdekking' && puzzlePhase === 'all_revealed';
    return (
      <div
        onClick={() => {
          if (isClickablePuzzle) {
            handleSolvePuzzle();
          }
        }}
        title={isClickablePuzzle ? 'Klikk for å samle brikker og vise fasit' : undefined}
        className={`w-full relative ${isClickablePuzzle ? 'cursor-pointer' : 'pointer-events-none'}`}
      >
        <ScaledPreviewBox isLight={isLight}>
          {renderAudienceScreen(block, true)}
        </ScaledPreviewBox>
      </div>
    );
  };

  // =========================================================================
  // 2. RENDER KVIT LEIARVISNING (FOREDRAGSHALDAR — BASERT PÅ BRUKERS SKISSE)
  // =========================================================================
  const renderLeaderScreen = () => {
    const d = currentBlock.data as any;

    // Generer to-lags stikkord- og utdjupingsliste for gjeldande ledd
    const keywordsList: Array<{ id: string; title: string; detail: string; isActive?: boolean }> = [];

    if (currentBlock.type === 'stikkord') {
      const points = (d.points || d.slidePoints || []) as Array<{ id: string; text: string; note?: string }>;
      
      // På storskjerm er steg 0 tittelside. Steg 1 er punkt 1 (indeks 0), steg 2 er punkt 2 (indeks 1), osv.
      const activePointIdxOnScreen = activePointIndex > 0 ? activePointIndex - 1 : -1;

      points.forEach((pt, pIdx) => {
        if (pt.text && pt.text.trim()) {
          const isActiveOnScreen = pIdx === activePointIdxOnScreen;
          keywordsList.push({
            id: pt.id || `pt_${pIdx}`,
            title: pt.text,
            detail: pt.note || '',
            isActive: isActiveOnScreen,
          });
        }
      });

      if (currentBlock.leaderNotes && currentBlock.leaderNotes.trim()) {
        keywordsList.unshift({
          id: 'stikkord_notes',
          title: 'Innleiing / Manus',
          detail: currentBlock.leaderNotes,
          isActive: activePointIndex === 0,
        });
      }
    } else if (currentBlock.type === 'bibelord') {
      const verseText = d.keyVerse || d.bibleText || '';
      const leaderNote = (d.bibleText && d.bibleText !== d.keyVerse ? d.bibleText : '') || currentBlock.leaderNotes || d.reflectionQuestion || '';
      
      if (verseText.trim()) {
        keywordsList.push({
          id: 'scripture_main',
          title: d.scriptureRef ? `${d.scriptureRef}: «${verseText}»` : `«${verseText}»`,
          detail: leaderNote,
        });
      } else if (d.scriptureRef) {
        keywordsList.push({
          id: 'scripture_ref',
          title: d.scriptureRef,
          detail: leaderNote,
        });
      }
    } else if (currentBlock.type === 'tekst') {
      const mainText = d.text || '';
      const titleText = d.title || '';
      if (titleText && mainText && titleText !== mainText) {
        keywordsList.push({
          id: 'tekst_main',
          title: titleText,
          detail: [mainText, currentBlock.leaderNotes].filter(Boolean).join('\n\n'),
        });
      } else if (mainText || titleText) {
        keywordsList.push({
          id: 'tekst_main',
          title: mainText || titleText,
          detail: currentBlock.leaderNotes || '',
        });
      }
    } else if (currentBlock.type === 'undervisning') {
      if (d.slidePoints && d.slidePoints.length > 0) {
        d.slidePoints.forEach((sp: any, spIdx: number) => {
          if (sp.text && sp.text.trim()) {
            const isActiveOnScreen = spIdx === activePointIndex;
            keywordsList.push({
              id: `sp_${spIdx}`,
              title: sp.text,
              detail: sp.note || '',
              isActive: isActiveOnScreen,
            });
          }
        });
      } else if (d.slideContent || d.coreMessage) {
        keywordsList.push({
          id: 'undervisning_content',
          title: d.coreMessage || d.title || 'Bodskap',
          detail: [d.slideContent, currentBlock.leaderNotes].filter(Boolean).join('\n\n'),
        });
      }

      if (d.moments && d.moments.length > 0) {
        d.moments.forEach((m: string, i: number) => {
          if (m.trim()) {
            keywordsList.push({
              id: `moment_${i}`,
              title: m,
              detail: '',
            });
          }
        });
      }
    } else if (currentBlock.type === 'reis_deg') {
      const statements = (d as ReisDegData).statements || [];
      if (d.intro) {
        keywordsList.push({
          id: 'reisdeg_intro',
          title: `Start: ${d.intro}`,
          detail: 'Instruks på storskjerm.',
          isActive: activePointIndex === 0,
        });
      }
      statements.forEach((item, idx) => {
        const isActiveItem = activePointIndex === idx + 1;
        keywordsList.push({
          id: `reisdeg_item_${idx}`,
          title: `${idx + 1}. ${item.statement}`,
          detail: isActiveItem ? 'Gjeldande påstand på storskjerm.' : '',
          isActive: isActiveItem,
        });
      });
    } else if (currentBlock.type === 'bilete_avdekking') {
      const bData = d as BileteAvdekkingData;
      keywordsList.push({
        id: 'bilete_fasit',
        title: `Løysing: ${bData.solution || bData.title || 'Bilete-avdekking'}`,
        detail: `Kaos-puslespill (${bData.gridSize || 100} brikker). Status: ${puzzlePhase === 'solved' ? 'Løst og samla' : puzzlePhase === 'all_revealed' ? 'Alle brikker avdekt (100 %) i kaos' : puzzlePhase === 'revealing' ? 'Avdekker (30s)' : puzzlePhase === 'paused' ? 'Pause' : 'Klar til start'}.${bData.clue ? ` Hint: ${bData.clue}` : ''}`,
      });
    } else if (currentBlock.type === 'beat_for_beat') {
      const bData = d as BeatForBeatData;
      const words = bData.words || [];
      keywordsList.push({
        id: 'beat_solution',
        title: `Fasit: ${bData.solution || 'Beat for beat'}`,
        detail: `Ordrekke: ${words.join(' — ')}`,
      });
    } else if (currentBlock.type === 'ord_for_ord') {
      const oData = d as OrdForOrdData;
      const words = oData.words || [];
      keywordsList.push({
        id: 'ord_solution',
        title: `Fasit: ${oData.reference ? `${oData.reference}: ` : ''}${oData.quote || 'Ord for ord'}`,
        detail: `Utvalde ord (${words.length}): ${words.join(' — ')}${oData.hint ? `\nHint: ${oData.hint}` : ''}`,
      });
    } else if (currentBlock.type === 'kven_skal_ut') {
      const kData = d as KvenSkalUtData;
      keywordsList.push({
        id: 'kven_skal_ut_fasit',
        title: `Fasit: Alternativ ${kData.correctOption || 'A'} skal ut`,
        detail: kData.explanation || '',
      });
    } else if (currentBlock.type === 'samtale') {
      const sData = d as SamtaleData;
      const leaderPoints = sData.leaderPoints || [];

      if (leaderPoints.length > 0) {
        leaderPoints.forEach((lp: StikkordPoint, lpIdx: number) => {
          if (lp.text && lp.text.trim()) {
            keywordsList.push({
              id: lp.id || `s_lp_${lpIdx}`,
              title: lp.text,
              detail: lp.note || '',
            });
          }
        });
      } else {
        if (sData.reflectionQuestions && sData.reflectionQuestions.length > 0) {
          sData.reflectionQuestions.forEach((q: string, i: number) => {
            if (q && q.trim()) {
              keywordsList.push({
                id: `q_${i}`,
                title: `Spørsmål ${i + 1}: ${q}`,
                detail: i === 0 ? (currentBlock.leaderNotes || '') : '',
              });
            }
          });
        } else if (currentBlock.leaderNotes && currentBlock.leaderNotes.trim()) {
          keywordsList.push({
            id: 'samtale_manus',
            title: 'Manus for leiar',
            detail: currentBlock.leaderNotes,
          });
        }
      }
    } else if (currentBlock.type === 'bonn_dikt') {
      const parts: string[] = [];
      if (currentBlock.leaderNotes && currentBlock.leaderNotes.trim()) {
        parts.push(currentBlock.leaderNotes.trim());
      }
      if (d.text && d.text.trim()) {
        parts.push(d.text.trim());
      }
      if (d.isResponsive && d.responsiveReading && d.responsiveReading.trim()) {
        parts.push(`Felles svar: ${d.responsiveReading.trim()}`);
      }

      keywordsList.push({
        id: 'bonn_main',
        title: d.title || 'Bøn',
        detail: parts.join('\n\n'),
      });
    } else if (currentBlock.type === 'sang_salme') {
      const verses: string[] = d.verses || [];
      verses.forEach((vText, vIdx) => {
        if (vText.trim()) {
          const isActive = vIdx === activeVerseIndex;
          keywordsList.push({
            id: `verse_${vIdx}`,
            title: `Vers ${vIdx + 1}${isActive ? ' (Aktivt vers)' : ''}`,
            detail: vText,
            isActive,
          });
        }
      });
    } else if (currentBlock.type === 'informasjon') {
      keywordsList.push({
        id: 'info_head',
        title: d.heading || 'Informasjon',
        detail: [d.noticeBox ? `Merk: ${d.noticeBox}` : '', currentBlock.leaderNotes].filter(Boolean).join('\n'),
      });
      if (d.practicalPoints && d.practicalPoints.length > 0) {
        d.practicalPoints.forEach((pt: string, idx: number) => {
          if (pt.trim()) {
            keywordsList.push({
              id: `info_pt_${idx}`,
              title: `${idx + 1}. ${pt}`,
              detail: '',
            });
          }
        });
      }
    } else if (currentBlock.type === 'lek' || currentBlock.type === 'konkurranse') {
      keywordsList.push({
        id: 'lek_main',
        title: d.name || d.title || 'Aktivitet',
        detail: [d.equipment ? `Utstyr: ${d.equipment}` : '', d.task ? `Oppgåve: ${d.task}` : '', currentBlock.leaderNotes].filter(Boolean).join('\n'),
      });
    } else if (currentBlock.type === 'video') {
      const vData = d as any;
      const kw = vData.leaderKeywords?.trim();
      const elab = [vData.leaderElaboration, currentBlock.leaderNotes].filter(Boolean).join('\n\n').trim();
      keywordsList.push({
        id: 'video_leader_kw',
        title: kw || vData.title || 'Videoklipp',
        detail: elab || 'Vis videoklippet for forsamlinga og leid an til felles samtale og refleksjon etterpå.',
      });
    } else if (currentBlock.type === 'bilde') {
      const bData = d as BildeData;
      const isSlideshow = bData.imageMode === 'slideshow';
      const images = bData.images || [];

      if (isSlideshow) {
        images.forEach((img, idx) => {
          const isCurrent = idx === currentSlideIndex;
          const cleanCap = getCleanCaption(img.caption);
          const cleanTitle = img.title && !isRawFileName(img.title) ? img.title : '';
          keywordsList.push({
            id: `slide_kw_${idx}`,
            title: `Lysbilete ${idx + 1} av ${images.length}${cleanTitle ? `: ${cleanTitle}` : ''}${isCurrent ? ' ★' : ''}`,
            detail: [cleanCap, img.leaderNote && !isRawFileName(img.leaderNote) ? img.leaderNote : ''].filter(Boolean).join('\n') || (isCurrent ? 'Vises no på storskjerm' : ''),
            isActive: isCurrent,
          });
        });
      } else {
        if (bData.leaderKeywords) {
          keywordsList.push({
            id: 'bilde_kw',
            title: bData.leaderKeywords,
            detail: bData.leaderElaboration || '',
          });
        }
      }
    } else if (currentBlock.type === 'bilete') {
      const bData = d as BileteData;
      if (bData.leaderKeywords) {
        keywordsList.push({
          id: 'bilete_kw',
          title: bData.leaderKeywords,
          detail: bData.leaderElaboration || '',
        });
      }
    } else if (currentBlock.type === 'lysbileteshow') {
      // Lysbileteshow skal ikkje leggje noko til i keywordsList
    } else if (currentBlock.type === 'bildebibelen') {
      const bbData = d as BildeBibelenData;
      const scenes = bbData.scenes || [];
      scenes.forEach((scene, idx) => {
        const isCurrent = idx === activePointIndex;
        keywordsList.push({
          id: scene.id || `scene_kw_${idx}`,
          title: `Scene ${idx + 1} av ${scenes.length}${scene.scriptureRef ? ` (${scene.scriptureRef})` : ''}`,
          detail: scene.narrationScript || scene.imageCaption || '',
          isActive: isCurrent,
        });
      });
    }

    if (keywordsList.length === 0 && currentBlock.type !== 'quiz') {
      keywordsList.push({
        id: 'default_title',
        title: d.title || d.name || d.topic || d.heading || d.scriptureRef || 'Gjennomgang av leddet',
        detail: currentBlock.leaderNotes || '',
      });
    }

    return (
      <div className="w-full h-full bg-stone-100 text-stone-900 flex flex-col font-sans select-none overflow-hidden">
        {/* ========================================================================= */}
        {/* KVIT LEIAR-TOPPLINJE MED KLOKKE, TIDSBRUK OG KNAPPAR FRÅ SKISSA            */}
        {/* ========================================================================= */}
        <header className="h-16 px-6 bg-white border-b border-stone-200 flex items-center justify-between shrink-0 shadow-2xs z-20">
          {/* Venstre: Klokkeslett + Tittel + Tidtakar */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
              <Clock className="w-4 h-4 text-amber-700" />
              <span className="font-mono font-extrabold text-stone-900 text-base">
                {currentTime || '10:22'}
              </span>
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">TID</span>
            </div>

            <div className="h-6 w-px bg-stone-200 hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${meta?.badgeClass}`}>
                  {meta?.label}
                </span>
                <span className="font-extrabold text-sm text-stone-900 truncate max-w-xs sm:max-w-md">
                  {session.title} ({currentIndex + 1} av {session.blocks.length})
                </span>
              </div>
            </div>
          </div>

          {/* Midten: Opne storskjerm ↗, Bytt skjerm ⇄  og  Storskjerm-tema 🌗 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const currentBlockId = currentBlock?.id || '';
                const audienceUrl = `${window.location.origin}${window.location.pathname}?mode=audience&blockIndex=${currentIndex}&blockId=${currentBlockId}`;
                openAudienceWindowManual(audienceUrl);
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              title="Opne storskjerm på lerretet"
            >
              <ProjectorScreenIcon className="w-3.5 h-3.5 text-indigo-300" />
              <span>Opne storskjerm ↗</span>
            </button>

            <button
              type="button"
              onClick={handleSwapScreens}
              className="px-3.5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
              title="Bytt om Leiarvisning og Storskjerm dersom visingane kjem på feil skjerm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Bytt skjerm ⇄</span>
            </button>

            <button
              type="button"
              onClick={toggleAudienceTheme}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs border border-stone-300 flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
              title="Veksle mellom mørk og lys bakgrunn på storskjermen"
            >
              <SunMoon className="w-4 h-4 text-amber-600" />
              <span>Storskjerm: {audienceTheme === 'dark' ? 'Mørk' : 'Lys'}</span>
            </button>

            {/* Diskret nedtrekksmeny [🎨] med 9 fargepalettar (3x3) og 3 fartstrinn (ingen tekst) */}
            <div ref={paletteMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsPaletteMenuOpen((prev) => !prev)}
                className={`p-2 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
                  isPaletteMenuOpen
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-300'
                }`}
              >
                <Palette className="w-4 h-4" strokeWidth={1.75} />
              </button>

              {isPaletteMenuOpen && (
                <div
                  className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2.5 rounded-2xl border shadow-lg z-50 w-52 ${
                    audienceTheme === 'dark'
                      ? 'bg-zinc-900 border-zinc-700'
                      : 'bg-white border-stone-200'
                  }`}
                >
                  {/* 1. Øvst: Knivskarpt 3x3-rutenett med dei 9 palettane */}
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        'bw',
                        'neon',
                        'nordic',
                        'amber',
                        'burgundy',
                        'midnight',
                        'terracotta',
                        'mocha',
                        'violet',
                      ] as BigScreenPalette[]
                    ).map((pKey) => {
                      const cfg = PALETTE_CONFIGS[pKey];
                      const isSelected = palette === pKey;
                      return (
                        <button
                          key={pKey}
                          type="button"
                          onClick={() => handleSelectPalette(pKey)}
                          className={`h-9 px-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                            audienceTheme === 'dark'
                              ? isSelected
                                ? 'bg-zinc-800 ring-2 ring-white/60'
                                : 'bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700/80'
                              : isSelected
                              ? 'bg-stone-100 ring-2 ring-black/60'
                              : 'bg-stone-50 hover:bg-stone-100 border border-stone-200'
                          }`}
                        >
                          {cfg.dots.map((dotColor, dIdx) => (
                            <span
                              key={dIdx}
                              style={{ backgroundColor: dotColor }}
                              className={`w-3 h-3 rounded-full shrink-0 border ${
                                audienceTheme === 'dark' ? 'border-white/25' : 'border-black/15'
                              }`}
                            />
                          ))}
                        </button>
                      );
                    })}
                  </div>

                  {/* 2. Tynn delelinje */}
                  <div
                    className={`h-px my-2.5 ${
                      audienceTheme === 'dark' ? 'bg-zinc-800' : 'bg-stone-200'
                    }`}
                  />

                  {/* 3. Nedst: 3 fart-knappar på éi horisontal linje med enkle strekikon */}
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: 'slow' as BigScreenSpeed, Icon: Turtle },
                      { key: 'normal' as BigScreenSpeed, Icon: Footprints },
                      { key: 'fast' as BigScreenSpeed, Icon: Rabbit },
                    ]).map(({ key, Icon }) => {
                      const isSelected = speed === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleSelectSpeed(key)}
                          className={`h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                            audienceTheme === 'dark'
                              ? isSelected
                                ? 'bg-white text-zinc-900 ring-2 ring-white/60'
                                : 'bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80'
                              : isSelected
                              ? 'bg-stone-900 text-white ring-2 ring-black/60'
                              : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Høgre: Fullskjerm, Mørklegg storskjerm (B) og Avslutt (X) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs border border-stone-300 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              title="Veksle ekte fullskjerm i nettlesaren for leiarvisninga (F11)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-amber-700" /> : <Maximize className="w-4 h-4 text-amber-700" />}
              <span>{isFullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsBlackout((prev) => {
                  const next = !prev;
                  if (bcRef.current) {
                    bcRef.current.postMessage({
                      type: 'TOGGLE_BLACKOUT',
                      senderId: windowIdRef.current,
                      isBlackout: next,
                    });
                  }
                  return next;
                });
              }}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs ${
                isBlackout
                  ? 'bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-400'
                  : 'bg-stone-800 hover:bg-stone-900 text-white'
              }`}
              title="Mørklegg kun storskjermen for publikum (Tast B)"
            >
              {isBlackout ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>{isBlackout ? 'Mørklagd (B)' : 'Mørklegg storskjerm (B)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 hover:text-stone-900 cursor-pointer transition-colors"
              title="Avslutt leiarvisning (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* HOVUDLAYOUT: VENSTRE DEL (16:9 + DEI NESTE BILDENE) & HØGRE DEL (STIKKORD) */}
        {/* ========================================================================= */}
        <div className="flex-1 grid grid-cols-12 gap-5 p-4 sm:p-6 overflow-hidden">
          {/* ----------------------------------------------------------------------- */}
          {/* VENSTRE DEL (~25-30 % AV SKJERMEN)                                      */}
          {/* ----------------------------------------------------------------------- */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col space-y-4 overflow-hidden h-full">
            {/* 1. STORSKJERMBILETE (Miniatyr av publikumsskjermen) */}
            <div className="space-y-1.5 shrink-0">
              <div className="flex items-center justify-between text-xs font-bold text-stone-600">
                <span className="uppercase tracking-wide">STORSKJERMBILETE</span>
                <span className="text-amber-700 font-mono">{d.durationMinutes || 5} min</span>
              </div>

              {currentBlock.hiddenOnScreen && (
                <div className="bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                  <EyeOff className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Skjult for publikum</span>
                </div>
              )}

              {/* Ubeskåre 16:9 miniatyr */}
              {renderLiveAudiencePreview(currentBlock)}
            </div>

            {/* 2. DEI NESTE BILETA (Miniatyrbilete-strøym) */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-3 overflow-hidden">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-2 px-1 flex items-center justify-between">
                <span>DEI NESTE BILETA</span>
                <span>{Math.max(0, session.blocks.length - currentIndex - 1)} ledd att</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {session.blocks.slice(currentIndex + 1).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-2 my-auto">
                    <CheckCircle className="w-8 h-8 text-emerald-500/80" />
                    <p className="text-xs font-bold text-stone-700">Siste bilete i opplegget!</p>
                    <p className="text-[11px] text-stone-500">Ingen fleire bilete etter dette.</p>
                  </div>
                ) : (
                  session.blocks.slice(currentIndex + 1).map((b) => {
                    const idx = session.blocks.findIndex(item => item.id === b.id);
                    const bMeta = BLOCK_METADATA[b.type];
                    const bTitle = (b.data as any)?.title || (b.data as any)?.name || (b.data as any)?.topic || (b.data as any)?.heading || (b.data as any)?.scriptureRef || `Ledd ${idx + 1}`;

                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className="w-full text-left p-2 rounded-2xl border-2 transition-all cursor-pointer flex flex-col space-y-1.5 bg-stone-50/80 hover:bg-stone-100 hover:border-amber-400 border-stone-200 text-stone-800 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs font-bold px-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-5 h-5 rounded-md text-[10px] font-extrabold flex items-center justify-center shrink-0 bg-stone-200 text-stone-700">
                              {idx + 1}
                            </span>
                            <span className="truncate text-stone-900 font-bold">{bTitle}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-semibold text-stone-500">{bMeta?.label}</span>
                            {b.hiddenOnScreen && (
                              <span title="Skjult for publikum">
                                <EyeOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 16:9-miniatyrbilde av dette lysbiletet */}
                        {renderLiveAudiencePreview(b)}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* HØGRE DEL (~70-75 % AV SKJERMEN — 3/4 PLASS FOR STIKKORD)               */}
          {/* ----------------------------------------------------------------------- */}
          <div 
            ref={leaderScrollContainerRef}
            className="col-span-12 lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-6 sm:p-8 flex flex-col h-full overflow-y-auto space-y-6"
          >
            {/* Tittel-ramme for gjeldande ledd */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-4 shrink-0">
              <div>
                <span className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full border ${meta?.badgeClass}`}>
                  {meta?.label}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-stone-900 mt-2">
                  {d.title || d.name || d.topic || d.heading || d.scriptureRef || 'Ledd'}
                </h1>
              </div>

              {currentBlock.type !== 'samtale' && (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-3xl sm:text-4xl font-black font-mono text-amber-700">
                      {formatTime(timerSeconds)}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                      {isTimerRunning ? 'Nedteljing igang' : 'Pausa / Klar'}
                    </div>
                  </div>

                  {/* DEDIKERTE KONTROLLER FOR NEDTELJING I LEIARVISNINGA */}
                  <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-2xl border border-stone-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className={`px-3 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95 ${
                        isTimerRunning
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      title={isTimerRunning ? 'Pause nedteljing' : 'Start nedteljing'}
                    >
                      {isTimerRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                      <span>{isTimerRunning ? 'Pause' : 'Start'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsTimerRunning(false);
                        if (currentBlock.type === 'kims_leik') {
                          const kData = currentBlock.data as KimsLeikData;
                          setTimerSeconds(kData.timerSeconds || 30);
                        } else {
                          const defaultMins = (currentBlock.data as any).timerMinutes || (currentBlock.data as any).durationMinutes || 3;
                          setTimerSeconds(defaultMins * 60);
                        }
                      }}
                      className="p-2 rounded-xl bg-white hover:bg-stone-200 text-stone-700 border border-stone-300 cursor-pointer transition-colors"
                      title="Nullstill nedteljing"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {currentBlock.type === 'kims_leik' ? (
                      <button
                        type="button"
                        onClick={() => setTimerSeconds((prev) => prev + 10)}
                        className="px-2.5 py-2 rounded-xl bg-white hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 cursor-pointer transition-colors flex items-center gap-1"
                        title="Legg til 10 sekund"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+10s</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTimerSeconds((prev) => prev + 60)}
                        className="px-2.5 py-2 rounded-xl bg-white hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 cursor-pointer transition-colors flex items-center gap-1"
                        title="Legg til 1 minutt"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+1m</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* DEDIKERT VIDEO-PANEL MED INFORMASJON OG STATUS FOR LEIAR */}
            {currentBlock.type === 'video' && (() => {
              const vData = d as any;
              const videoInfo = parseVideoUrl(vData.videoUrl, vData.startTimeSeconds, vData.stopTimeSeconds);

              return (
                <div className="bg-purple-50/90 border border-purple-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs select-none">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Tv className="w-4 h-4 text-purple-700 shrink-0" />
                      <span className="font-extrabold text-xs uppercase tracking-wider text-purple-950">
                        VIDEOVISING — STATUS & KONTROLL
                      </span>
                      {videoInfo.isValid && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300 uppercase">
                          {videoInfo.type === 'youtube' ? 'YouTube' : videoInfo.type === 'vimeo' ? 'Vimeo' : 'MP4-fil'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-purple-900">
                      {typeof vData.startTimeSeconds === 'number' && vData.startTimeSeconds > 0 && (
                        <span>Start: {formatSecondsToMinSec(vData.startTimeSeconds)}</span>
                      )}
                      {typeof vData.stopTimeSeconds === 'number' && vData.stopTimeSeconds > 0 && (
                        <span>• Stopp: {formatSecondsToMinSec(vData.stopTimeSeconds)}</span>
                      )}
                      {vData.loop && <span>• Loop</span>}
                      {vData.muted && <span>• Dempa</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600 truncate max-w-md font-mono text-[11px]">
                      {vData.videoUrl || 'Ingen videokjelde lagt til'}
                    </span>
                    {videoInfo.isValid && (
                      <a
                        href={vData.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 underline"
                      >
                        <span>Opne original</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* KONTROLLKNAPPAR FOR PAUSE OG MUTE PÅ STORSKJERM */}
                  {videoInfo.isValid && (
                    <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-purple-200/80">
                      {/* Play / Pause knapp */}
                      <button
                        type="button"
                        onClick={handleToggleVideoPlay}
                        className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-2xs transition-all active:scale-95 ${
                          isVideoPlaying
                            ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400'
                        }`}
                        title={isVideoPlaying ? 'Pause video på storskjerm' : 'Spel av video på storskjerm'}
                      >
                        {isVideoPlaying ? (
                          <>
                            <Pause className="w-4 h-4 fill-current text-amber-100" />
                            <span>⏸ Pause video (storskjerm)</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current text-emerald-100" />
                            <span>▶ Spel av video (storskjerm)</span>
                          </>
                        )}
                      </button>

                      {/* Mute / Unmute knapp */}
                      <button
                        type="button"
                        onClick={handleToggleVideoMute}
                        className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-2xs transition-all active:scale-95 ${
                          isVideoMuted
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400'
                            : 'bg-white hover:bg-stone-100 text-purple-950 border border-purple-300'
                        }`}
                        title={isVideoMuted ? 'Slå på lyd på storskjerm' : 'Demp lyd på storskjerm'}
                      >
                        {isVideoMuted ? (
                          <>
                            <Mic className="w-4 h-4 text-emerald-100" />
                            <span>🔊 Lyd på (storskjerm)</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4 text-purple-700" />
                            <span>🔇 Demp lyd (storskjerm)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* DEDIKERT QUIZ-PANEL MED FASIT OG SPØRSMÅLSNAVIGASJON FOR LEIAR */}
            {currentBlock.type === 'quiz' && (() => {
              const qList = (d.questions && d.questions.length > 0)
                ? d.questions
                : [{
                    id: 'q_1',
                    question: d.question || d.title || 'Quiz-spørsmål',
                    optionA: d.optionA || '',
                    optionB: d.optionB || '',
                    optionC: d.optionC || '',
                    optionD: d.optionD || '',
                    correctOption: d.correctOption || 'A',
                    explanation: d.explanation || '',
                  }];
              const currentQuizQ = qList[quizQuestionIndex] || qList[0];

              return (
                <div className="bg-violet-50/90 border-2 border-violet-200 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-6 h-6 text-violet-600 shrink-0" />
                      <span className="font-extrabold text-sm uppercase tracking-wider text-violet-900">
                        QUIZ-STYRING (Spørsmål {quizQuestionIndex + 1} av {qList.length})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuizShowAnswer(!quizShowAnswer)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
                          quizShowAnswer
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400'
                            : 'bg-violet-600 hover:bg-violet-700 text-white'
                        }`}
                        title="Vis eller skjul det rette svaret på storskjermen"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{quizShowAnswer ? 'Fasit er vist på storskjerm (Skjul)' : 'Avdekk fasit på storskjerm'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Spørsmålstittel */}
                  <h3 className="text-xl sm:text-2xl font-black text-stone-900 leading-snug">
                    {currentQuizQ.question || d.title || 'Quiz-spørsmål'}
                  </h3>

                  {/* Svaralternativer for leiar med tydleg FASIT-markering */}
                  {d.quizType !== 'open' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                        const optKey = `option${letter}` as 'optionA' | 'optionB' | 'optionC' | 'optionD';
                        const optText = currentQuizQ[optKey];
                        if (!optText) return null;
                        const isCorrect = currentQuizQ.correctOption === letter;

                        return (
                          <div
                            key={letter}
                            className={`p-3.5 rounded-xl border-2 flex items-center gap-3 transition-all ${
                              isCorrect
                                ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold shadow-xs'
                                : 'bg-white border-stone-200 text-stone-700'
                            }`}
                          >
                            <span className={`w-8 h-8 rounded-lg text-sm font-black flex items-center justify-center shrink-0 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'
                            }`}>
                              {letter}
                            </span>
                            <span className="text-base sm:text-lg flex-1 leading-snug break-words">
                              {optText}
                            </span>
                            {isCorrect && (
                              <span className="text-xs font-black uppercase tracking-wider bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shrink-0">
                                ★ RETT SVAR
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-100 border-2 border-emerald-300 text-emerald-950 space-y-1">
                      <span className="text-xs font-black uppercase text-emerald-800">Fasit / Svar for leiar:</span>
                      <p className="text-lg font-bold">{currentQuizQ.explanation || 'Ingen fasit skrive inn'}</p>
                    </div>
                  )}

                  {/* Forklaring dersom oppgitt */}
                  {d.quizType !== 'open' && currentQuizQ.explanation && (
                    <div className="p-3 rounded-xl bg-white border border-violet-200 text-stone-800 text-sm">
                      <span className="font-bold text-violet-800">Forklaring / Bakgrunnsnotat for leiar: </span>
                      {currentQuizQ.explanation}
                    </div>
                  )}

                  {/* Spørsmålsveljar for quizer med fleire spørsmål */}
                  {qList.length > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-violet-200/80">
                      <span className="text-xs font-bold text-stone-600">Skift spørsmål:</span>
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                        {qList.map((_: any, qIdx: number) => (
                          <button
                            key={qIdx}
                            type="button"
                            onClick={() => {
                              setQuizQuestionIndex(qIdx);
                              setQuizShowAnswer(false);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-extrabold cursor-pointer transition-all ${
                              qIdx === quizQuestionIndex
                                ? 'bg-violet-600 text-white shadow-xs'
                                : 'bg-white hover:bg-stone-200 border border-stone-300 text-stone-700'
                            }`}
                          >
                            Spørsmål {qIdx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}



            {/* DEDIKERT HENTELEIKEN CONTROL PANEL MED POENGGIVING FOR LEIAR */}
            {currentBlock.type === 'henteleik' && (() => {
              const hData = d as HenteleikData;
              const items = hData.items || [];
              const teamCount = hData.teamCount || 2;
              const teamNames = hData.teamNames || ['Lag 1', 'Lag 2', 'Lag 3', 'Lag 4'];

              const handleAddPoint = (teamIdx: number) => {
                setHenteleikScores((prev) => ({
                  ...prev,
                  [teamIdx]: (prev[teamIdx] || 0) + 1,
                }));
              };

              const handleSubtractPoint = (teamIdx: number) => {
                setHenteleikScores((prev) => ({
                  ...prev,
                  [teamIdx]: Math.max(0, (prev[teamIdx] || 0) - 1),
                }));
              };

              return (
                <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 space-y-2.5 shadow-2xs select-none">
                  {/* Topplinje: Slå saman tittel og knappane for «Startskjerm» og «Resultat» på éi smal linje */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="font-extrabold text-xs uppercase tracking-wider text-amber-950">
                        HENTELEIKEN — LEIARSTYRING & POENGBØRS
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActivePointIndex(0)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-all ${
                          activePointIndex === 0
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-white hover:bg-amber-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        1. Startskjerm
                      </button>

                      <button
                        type="button"
                        onClick={() => setActivePointIndex(items.length + 1)}
                        className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] flex items-center gap-1 cursor-pointer transition-all ${
                          activePointIndex === items.length + 1
                            ? 'bg-emerald-600 text-white ring-1 ring-emerald-400 shadow-2xs'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-600" />
                        <span>🏆 Resultat på storskjerm</span>
                      </button>
                    </div>
                  </div>

                  {/* POENGSTRIPE FOR DEI VALDE LAGA (Rein, kompakt horisontal stripe) */}
                  <div className="p-1.5 bg-white rounded-lg border border-amber-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase shrink-0 px-1">
                      Poengstilling:
                    </div>
                    <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
                      {Array.from({ length: teamCount }).map((_, teamIdx) => {
                        const score = henteleikScores[teamIdx] || 0;
                        const tName = teamNames[teamIdx] || `Lag ${teamIdx + 1}`;

                        return (
                          <div
                            key={teamIdx}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-200"
                          >
                            <span className="text-xs font-bold text-slate-800 truncate max-w-[90px]">{tName}:</span>
                            <span className="text-sm font-black text-amber-700 font-mono">{score}p</span>
                            <div className="flex items-center gap-0.5 ml-1">
                              <button
                                type="button"
                                onClick={() => handleSubtractPoint(teamIdx)}
                                className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold flex items-center justify-center cursor-pointer text-[10px]"
                                title={`Minus 1 poeng til ${tName}`}
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddPoint(teamIdx)}
                                className="w-5 h-5 rounded bg-amber-600 hover:bg-amber-700 text-white font-extrabold flex items-center justify-center cursor-pointer shadow-2xs text-[10px]"
                                title={`Legg til 1 poeng til ${tName}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* KOMPAKT LISTE OVER GJENSTANDAR MED SLIMME KNAPPAR */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase px-0.5">
                      Klikk for å vise på storskjerm, eller gi 1 poeng til vinnarlaget:
                    </div>

                    <div className="space-y-1">
                      {items.map((it, idx) => {
                        const itemStep = idx + 1;
                        const isActive = activePointIndex === itemStep;

                        return (
                          <div
                            key={it.id || idx}
                            className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 transition-all ${
                              isActive
                                ? 'bg-amber-100 border-amber-400 ring-1 ring-amber-300 text-amber-950 font-bold shadow-2xs'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            {/* Klikk på tekst for å skifte storskjerm til denne gjenstanden */}
                            <button
                              type="button"
                              onClick={() => setActivePointIndex(itemStep)}
                              className="flex items-center gap-2 flex-1 text-left cursor-pointer min-w-0"
                            >
                              <span className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                                isActive ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {itemStep}
                              </span>
                              <span className="text-xs font-bold truncate">
                                {it.text || `Gjenstand ${itemStep}`}
                              </span>
                              {isActive && (
                                <span className="text-[9px] font-extrabold bg-amber-600 text-white px-1.5 py-0.2 rounded-full uppercase shrink-0">
                                  På skjerm
                                </span>
                              )}
                            </button>

                            {/* Lag-knappar for å gi 1 poeng med eitt klikk */}
                            <div className="flex items-center gap-1 shrink-0">
                              {Array.from({ length: teamCount }).map((_, teamIdx) => {
                                const tName = teamNames[teamIdx] || `Lag ${teamIdx + 1}`;

                                return (
                                  <button
                                    key={teamIdx}
                                    type="button"
                                    onClick={() => handleAddPoint(teamIdx)}
                                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer shadow-2xs transition-all active:scale-95 flex items-center gap-0.5"
                                    title={`Gi 1 poeng til ${tName}`}
                                  >
                                    <span>+1 {tName}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* DEDIKERT KIMS LEIK CONTROL PANEL FOR LEIAR */}
            {currentBlock.type === 'kims_leik' && (() => {
              const kData = d as KimsLeikData;
              const rawItems = kData.items || [];
              const items: KimsLeikItem[] = rawItems.map((it, idx) => 
                typeof it === 'string' 
                  ? { id: `kims_${idx}`, name: it, emoji: '📦', text: it } 
                  : { id: it.id || `kims_${idx}`, name: it.name || it.text || '', emoji: it.emoji || it.iconName || '📦', text: it.text || it.name || '', iconName: it.iconName || it.emoji || '📦' }
              );
              const count = kData.itemCount || (items.length >= 20 ? 20 : items.length <= 12 && items.length > 0 ? 12 : 16);
              const activeItems = items.slice(0, count);
              const currentPhase = activePointIndex;

              const gridColsClass = count === 20 ? 'grid-cols-5' : 'grid-cols-4';

              const handleToggleItemReveal = (idx: number) => {
                setKimsRevealedMap((prev) => ({
                  ...prev,
                  [idx]: !prev[idx],
                }));
              };

              const handleRevealAll = () => {
                const newMap: Record<number, boolean> = {};
                activeItems.forEach((_, i) => { newMap[i] = true; });
                setKimsRevealedMap(newMap);
              };

              const handleHideAll = () => {
                setKimsRevealedMap({});
              };

              return (
                <div className="bg-amber-50/90 border-2 border-amber-200 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs select-none">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-amber-700 shrink-0" />
                      <span className="font-extrabold text-xs uppercase tracking-wider text-amber-950">
                        KIMS LEIK — LEIARSTYRING ({count} gjenstandar)
                      </span>
                    </div>

                    {/* FASE VELJAR KNAPPAR FOR LEIAR */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActivePointIndex(0)}
                        className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] flex items-center gap-1 cursor-pointer transition-all ${
                          currentPhase === 0
                            ? 'bg-amber-600 text-white ring-2 ring-amber-400 shadow-2xs'
                            : 'bg-white hover:bg-amber-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        <span>1. Startskjerm</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActivePointIndex(1);
                          setIsTimerRunning(true);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] flex items-center gap-1 cursor-pointer transition-all ${
                          currentPhase === 1
                            ? 'bg-amber-600 text-white ring-2 ring-amber-400 shadow-2xs'
                            : 'bg-white hover:bg-amber-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>2. Sjå & hugs</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActivePointIndex(2)}
                        className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] flex items-center gap-1 cursor-pointer transition-all ${
                          currentPhase >= 2
                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-2xs'
                            : 'bg-white hover:bg-emerald-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>3. Felles avdekking</span>
                      </button>
                    </div>
                  </div>

                  {/* Status & Knappar for Steg 3 */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-white/90 p-2.5 rounded-xl border border-amber-200">
                    <div className="text-[11px] font-bold text-slate-800">
                      {currentPhase === 0 && 'Steg 1: Startskjerm (Tittel på storskjerm — ingen gjenstandar enda).'}
                      {currentPhase === 1 && 'Steg 2: Sjå og hugs! Gjenstandar og nedtelling på storskjerm.'}
                      {currentPhase >= 2 && 'Steg 3: Felles avdekking! Klikk på ein gjenstand for å avsløre den på storskjerm.'}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleRevealAll}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Avslør alle</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleHideAll}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] border border-slate-300 cursor-pointer transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Skjul alle</span>
                      </button>
                    </div>
                  </div>

                  {/* MATCHANDE RUTENETT UTAN RULLING (4x3 for 12, 4x4 for 16, 5x4 for 20) */}
                  <div className={`grid ${gridColsClass} gap-2 pt-0.5`}>
                    {activeItems.map((it, idx) => {
                      const graphic = getItemGraphic(it);
                      const isRevealed = kimsRevealedMap[idx] ?? false;

                      return (
                        <button
                          key={it.id || idx}
                          type="button"
                          onClick={() => handleToggleItemReveal(idx)}
                          className={`p-1.5 sm:p-2 rounded-xl border-2 text-center flex flex-col items-center justify-between cursor-pointer transition-all shadow-2xs select-none ${
                            isRevealed
                              ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-400/30'
                              : 'bg-white hover:bg-amber-100/60 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full text-[10px] font-mono text-zinc-400 leading-none">
                            <span>#{idx + 1}</span>
                            {isRevealed && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          </div>
                          <span className="text-2xl sm:text-3xl my-0.5">{graphic.emoji}</span>
                          <span className="text-[11px] font-semibold text-center truncate w-full leading-tight">
                            {it.name || it.text || graphic.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* DEDIKERT REIS DEG CONTROL PANEL FOR LEIAR */}
            {currentBlock.type === 'reis_deg' && (() => {
              const rData = d as ReisDegData;
              const statements = rData.statements || [];
              const currentStep = activePointIndex;

              return (
                <div className="bg-amber-50/90 border-2 border-amber-200 rounded-2xl p-5 space-y-4 shadow-2xs select-none">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-6 h-6 text-amber-700 shrink-0" />
                      <span className="font-extrabold text-sm uppercase tracking-wider text-amber-950">
                        REIS DEG — LEIARSTYRING
                      </span>
                    </div>
                    <div className="text-xs font-bold text-stone-600">
                      Aktivt steg: {currentStep === 0 ? 'Startskjerm' : currentStep > statements.length ? 'Avslutningsside' : `Påstand ${currentStep} av ${statements.length}`}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Steg 0: Startskjerm */}
                    <button
                      type="button"
                      onClick={() => setActivePointIndex(0)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        currentStep === 0
                          ? 'bg-amber-600 text-white border-amber-700 font-bold shadow-xs'
                          : 'bg-white hover:bg-amber-100/60 border-stone-200 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${currentStep === 0 ? 'bg-amber-800 text-white' : 'bg-stone-100 text-stone-600'}`}>
                          0
                        </span>
                        <span className="text-sm">Startskjerm (Tittel & instruksjon)</span>
                      </div>
                      {currentStep === 0 && <span className="text-xs font-extrabold uppercase bg-amber-700 text-white px-2 py-0.5 rounded-full">På skjerm</span>}
                    </button>

                    {/* Steg 1..N: Påstandar */}
                    {statements.map((st, idx) => {
                      const stepNum = idx + 1;
                      const isActive = currentStep === stepNum;

                      return (
                        <button
                          key={st.id || idx}
                          type="button"
                          onClick={() => setActivePointIndex(stepNum)}
                          className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            isActive
                              ? 'bg-amber-600 text-white border-amber-700 font-bold shadow-xs'
                              : 'bg-white hover:bg-amber-100/60 border-stone-200 text-stone-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                            <span className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${isActive ? 'bg-amber-800 text-white' : 'bg-stone-100 text-stone-600'}`}>
                              {stepNum}
                            </span>
                            <span className="text-sm truncate">{st.statement || `Påstand ${stepNum}`}</span>
                          </div>
                          {isActive && <span className="text-xs font-extrabold uppercase bg-amber-700 text-white px-2 py-0.5 rounded-full shrink-0">På skjerm</span>}
                        </button>
                      );
                    })}

                    {/* Steg N+1: Avslutningsside */}
                    <button
                      type="button"
                      onClick={() => setActivePointIndex(statements.length + 1)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        currentStep > statements.length
                          ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
                          : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-950 font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${currentStep > statements.length ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                          🏁
                        </span>
                        <span className="text-sm">Avslutningsside: «Bra jobba! Set dykk ned.»</span>
                      </div>
                      {currentStep > statements.length && <span className="text-xs font-extrabold uppercase bg-emerald-700 text-white px-2 py-0.5 rounded-full">På skjerm</span>}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* DEDIKERT KAOS-PUSLESPILL CONTROL PANEL FOR LEIAR */}
            {currentBlock.type === 'bilete_avdekking' && (() => {
              const bData = d as BileteAvdekkingData;
              const gridSize = bData.gridSize || 100;
              const isSolved = puzzlePhase === 'solved';
              const isAllRevealed = puzzlePhase === 'all_revealed';

              const togglePlayPause = () => {
                if (puzzlePhase === 'idle' || puzzlePhase === 'paused') {
                  handleStartPuzzle();
                } else if (puzzlePhase === 'revealing') {
                  handlePausePuzzle();
                } else if (puzzlePhase === 'all_revealed') {
                  handleSolvePuzzle();
                }
              };

              return (
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs select-none">
                  {/* Header med tittel og fase-merke */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <Puzzle className="w-6 h-6 text-indigo-600 shrink-0" />
                      <div>
                        <span className="font-extrabold text-sm uppercase tracking-wider text-slate-900 block">
                          KAOS-PUSLESPILL ({gridSize} brikker • 30 sek totaltid)
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          Avdekt {puzzleRevealedCount} av {gridSize} ({Math.round((puzzleRevealedCount / gridSize) * 100)}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {puzzlePhase === 'idle' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300">
                          <Play className="w-3.5 h-3.5 fill-current text-slate-600" />
                          Klar til start (Høgre pil)
                        </span>
                      )}
                      {puzzlePhase === 'revealing' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold animate-pulse border border-amber-300">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                          Avdekker... (30s)
                        </span>
                      )}
                      {puzzlePhase === 'paused' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black shadow-xs">
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          PAUSE – publikum gjettar
                        </span>
                      )}
                      {puzzlePhase === 'all_revealed' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-extrabold border border-emerald-400 shadow-xs">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Alle brikker avdekt (100 %) – Trykk Høgre pil eller klikk for å samle brikker og vise fasit
                        </span>
                      )}
                      {puzzlePhase === 'solved' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-xs">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                          Fasit samla og komplett
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Framdriftslinje */}
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-200 ${isSolved || isAllRevealed ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                      style={{ width: `${Math.min(100, (puzzleRevealedCount / gridSize) * 100)}%` }}
                    />
                  </div>

                  {/* Handlingsknappar for leiar */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      disabled={isSolved}
                      className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isAllRevealed
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400 animate-pulse'
                          : puzzlePhase === 'revealing'
                            ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {puzzlePhase === 'idle' ? (
                        <>
                          <Play className="w-4 h-4 fill-current text-indigo-200" />
                          <span>Start nedteljing (Høgre pil / Mellomrom)</span>
                        </>
                      ) : puzzlePhase === 'revealing' ? (
                        <>
                          <Pause className="w-4 h-4 fill-current text-amber-200" />
                          <span>Pause (Venstre pil)</span>
                        </>
                      ) : puzzlePhase === 'all_revealed' ? (
                        <>
                          <Sparkles className="w-4 h-4 text-emerald-200" />
                          <span>Samle brikker og vis fasit (Høgre pil / Klikk)</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current text-indigo-200" />
                          <span>Fortset nedteljing (Høgre pil / Mellomrom)</span>
                        </>
                      )}
                    </button>

                    {!isAllRevealed && (
                      <button
                        type="button"
                        onClick={handleSolvePuzzle}
                        disabled={isSolved}
                        className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-all active:scale-95 ${
                          isSolved 
                            ? 'bg-emerald-700 text-emerald-100 opacity-60 cursor-default'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <Sparkles className="w-4 h-4 text-emerald-200" />
                        <span>{isSolved ? 'Fasit er vist' : 'Vis fasit & samle brikkene (Tast S)'}</span>
                      </button>
                    )}
                  </div>

                  {/* Uforstyrra miniatyrbilete av fasit + rettleiing */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {bData.imageUrl && (
                      <div className="sm:col-span-1 bg-stone-900 rounded-xl overflow-hidden border border-slate-300 relative group aspect-video flex items-center justify-center">
                        <img 
                          src={bData.imageUrl} 
                          alt="Uforstyrra fasit-bilete" 
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute bottom-1 right-1 bg-black/75 px-1.5 py-0.5 rounded text-[10px] text-white font-mono">
                          Heilt bilete (fasit)
                        </div>
                      </div>
                    )}
                    
                    <div className={`sm:col-span-2 p-4 rounded-xl border-2 ${isSolved ? 'bg-emerald-100 border-emerald-300 text-emerald-950 font-bold' : 'bg-white border-slate-200 text-slate-800'} space-y-1.5`}>
                      <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center justify-between">
                        <span>Fasit for leiar:</span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {isSolved ? 'Brikkene er samla' : `${gridSize - puzzleRevealedCount} brikker att i kaoset`}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{bData.solution || 'Ingen fasit oppgitt'}</p>
                      {bData.clue && <p className="text-xs text-slate-600 italic">Hint: {bData.clue}</p>}
                      <div className="pt-2 text-[11px] text-slate-600 flex flex-wrap items-center gap-3 border-t border-slate-200/60 mt-2">
                        <span>💡 <b>Høgre pil / Mellomrom:</b> Start / Fortset / Fullfør</span>
                        <span>💡 <b>Venstre pil:</b> Pause</span>
                        <span>💡 <b>Tast S:</b> Vis fasit og samle brikkene</span>
                        <span>💡 <b>Høgre pil (etter fasit):</b> Gå vidare til neste ledd</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* DEDIKERT BEAT FOR BEAT CONTROL PANEL FOR LEIAR */}
            {currentBlock.type === 'beat_for_beat' && (() => {
              const bData = d as BeatForBeatData;
              const words = bData.words || [];

              const handleToggleWord = (idx: number) => {
                setBeatRevealedMap((prev) => ({
                  ...prev,
                  [idx]: !prev[idx],
                }));
              };

              const handleRevealAllWords = () => {
                const map: Record<number, boolean> = {};
                words.forEach((_, idx) => {
                  map[idx] = true;
                });
                setBeatRevealedMap(map);
              };

              const handleHideAllWords = () => {
                setBeatRevealedMap({});
                setShowBeatSolution(false);
              };

              const revealedCount = Object.values(beatRevealedMap).filter(Boolean).length;
              const allRevealed = words.length > 0 && revealedCount === words.length;

              return (
                <div className="bg-amber-50/90 border-2 border-amber-200 rounded-2xl p-5 space-y-4 shadow-2xs select-none">
                  {/* Topplinje med status og steg-knapp */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Music2 className="w-6 h-6 text-amber-700 shrink-0" />
                      <div>
                        <span className="font-extrabold text-sm uppercase tracking-wider text-amber-950 block">
                          BEAT FOR BEAT — LEIARSTYRING
                        </span>
                        <span className="text-xs text-amber-800">
                          {showBeatSolution 
                            ? '★ Steg 2 aktivt: Fullskjerm-fasit på storskjerm' 
                            : `Steg 1 aktivt: Spelbrett (${revealedCount} av ${words.length} ord snudd)`}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBeatSolution(!showBeatSolution)}
                        className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
                          showBeatSolution
                            ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                        title="Veksle mellom spelbrett (ordkort) og fullskjerm-fasit på storskjerm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          {showBeatSolution 
                            ? 'Gå tilbake til spelbrett (Steg 1)' 
                            : 'Vis fullskjerm-fasit (Steg 2)'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={allRevealed ? handleHideAllWords : handleRevealAllWords}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                        <span>{allRevealed ? 'Skjul alle ord' : 'Snu alle ord'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Ordknappar for leiar */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-stone-700 flex items-center justify-between">
                      <span>Klikk direkte på eit ord for å snu eller skjule det på storskjerm:</span>
                      <span className="text-stone-500 font-medium">Trykk piltast Høgre for å snu neste ord</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {words.map((w, idx) => {
                        const isRevealed = beatRevealedMap[idx] ?? false;

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleToggleWord(idx)}
                            className={`p-3 rounded-xl border-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                              isRevealed
                                ? 'bg-amber-100 border-amber-500 text-amber-950 font-bold shadow-xs'
                                : 'bg-white hover:bg-amber-100/60 border-stone-200 text-stone-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                                isRevealed ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-700'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="text-sm font-bold truncate">{w}</span>
                            </div>
                            {isRevealed && <CheckCircle className="w-4 h-4 text-amber-700 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fasit for leiar */}
                  <div className="p-4 rounded-xl bg-white border border-amber-200 space-y-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
                      <span>Fasit / Fullstendig løysing ({bData.category || 'Song'}):</span>
                      {showBeatSolution && (
                        <span className="text-[11px] font-black text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Vises på storskjerm no
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-black text-amber-950">{bData.solution || 'Ingen fasit oppgitt'}</p>
                  </div>
                </div>
              );
            })()}

            {/* DEDIKERT ORD FOR ORD CONTROL PANEL FOR LEIAR */}
            {currentBlock.type === 'ord_for_ord' && (() => {
              const oData = d as OrdForOrdData;
              const words = oData.words || [];

              const handleToggleWord = (idx: number) => {
                setBeatRevealedMap((prev) => ({
                  ...prev,
                  [idx]: !prev[idx],
                }));
              };

              const handleRevealAllWords = () => {
                const map: Record<number, boolean> = {};
                words.forEach((_, idx) => {
                  map[idx] = true;
                });
                setBeatRevealedMap(map);
              };

              const handleHideAllWords = () => {
                setBeatRevealedMap({});
                setShowBeatSolution(false);
              };

              const revealedCount = Object.values(beatRevealedMap).filter(Boolean).length;
              const allRevealed = words.length > 0 && revealedCount === words.length;

              return (
                <div className="bg-indigo-50/90 border-2 border-indigo-200 rounded-2xl p-5 space-y-4 shadow-2xs select-none">
                  {/* Topplinje med status og steg-knapp */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Type className="w-6 h-6 text-indigo-700 shrink-0" />
                      <div>
                        <span className="font-extrabold text-sm uppercase tracking-wider text-indigo-950 block">
                          ORD FOR ORD — LEIARSTYRING
                        </span>
                        <span className="text-xs text-indigo-800">
                          {showBeatSolution 
                            ? '★ Steg 2 aktivt: Fullskjerm-fasit på storskjerm' 
                            : `Steg 1 aktivt: Spelbrett (${revealedCount} av ${words.length} ord snudd)`}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBeatSolution(!showBeatSolution)}
                        className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
                          showBeatSolution
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-400'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                        title="Veksle mellom spelbrett (ordkort) og fullskjerm-fasit på storskjerm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          {showBeatSolution 
                            ? 'Gå tilbake til spelbrett (Steg 1)' 
                            : 'Vis fullskjerm-fasit (Steg 2)'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={allRevealed ? handleHideAllWords : handleRevealAllWords}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-indigo-100/70 border border-indigo-300 text-indigo-900 font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-indigo-700" />
                        <span>{allRevealed ? 'Skjul alle ord' : 'Snu alle ord'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Ordknappar for leiar */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-stone-700 flex items-center justify-between">
                      <span>Klikk direkte på eit ord for å snu eller skjule det på storskjerm:</span>
                      <span className="text-stone-500 font-medium">Trykk piltast Høgre for å snu neste ord</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {words.map((w, idx) => {
                        const isRevealed = beatRevealedMap[idx] ?? false;

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleToggleWord(idx)}
                            className={`p-3 rounded-xl border-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                              isRevealed
                                ? 'bg-indigo-100 border-indigo-500 text-indigo-950 font-bold shadow-xs'
                                : 'bg-white hover:bg-indigo-100/60 border-stone-200 text-stone-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                                isRevealed ? 'bg-indigo-600 text-white' : 'bg-stone-200 text-stone-700'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="text-sm font-bold truncate">{w}</span>
                            </div>
                            {isRevealed && <CheckCircle className="w-4 h-4 text-indigo-700 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fasit for leiar med dei utvalde orda tydeleg utheva */}
                  <div className="p-4 rounded-xl bg-white border border-indigo-200 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center justify-between">
                      <span>Fasit / Fullstendig bibelvers:</span>
                      {showBeatSolution && (
                        <span className="text-[11px] font-black text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Vises på storskjerm no
                        </span>
                      )}
                    </div>
                    {oData.reference && <p className="text-base font-black text-indigo-950">{oData.reference}</p>}
                    <div className="text-base font-medium text-stone-900 leading-relaxed">
                      {(() => {
                        const fullQuote = oData.quote || (oData as any).text || '';
                        if (!fullQuote) return <span>Ingen fasit oppgitt</span>;
                        if (!words || words.length === 0) return <span>{fullQuote}</span>;

                        const tokens = fullQuote.split(/(\s+)/);
                        const cleanTokens = tokens.map((t: string) => t.trim()).filter(Boolean);
                        const matchIdx = cleanTokens.findIndex((tok: string, idx: number) => {
                          return words.every((w: string, wIdx: number) => cleanTokens[idx + wIdx] === w);
                        });

                        if (matchIdx >= 0) {
                          let currentCleanIdx = 0;
                          return tokens.map((token: string, tIdx: number) => {
                            const isWs = /^\s+$/.test(token);
                            if (isWs) return <span key={tIdx}>{token}</span>;

                            const isMatched = currentCleanIdx >= matchIdx && currentCleanIdx < matchIdx + words.length;
                            currentCleanIdx++;

                            if (isMatched) {
                              return (
                                <span key={tIdx} className="bg-emerald-200 text-emerald-950 font-black px-1.5 py-0.5 rounded border border-emerald-300 shadow-2xs">
                                  {token}
                                </span>
                              );
                            }
                            return <span key={tIdx}>{token}</span>;
                          });
                        }

                        const wordsSet = new Set(words.map((w: string) => w.toLowerCase()));
                        return tokens.map((token: string, tIdx: number) => {
                          const clean = token.trim().toLowerCase();
                          if (clean && wordsSet.has(clean)) {
                            return (
                              <span key={tIdx} className="bg-emerald-200 text-emerald-950 font-black px-1.5 py-0.5 rounded border border-emerald-300">
                                {token}
                              </span>
                            );
                          }
                          return <span key={tIdx}>{token}</span>;
                        });
                      })()}
                    </div>
                    {oData.hint && <p className="text-xs text-stone-600 italic pt-1">Hint: {oData.hint}</p>}
                  </div>
                </div>
              );
            })()}

            {/* DEDIKERT KVEN SKAL UT CONTROL PANEL FOR LEIAR */}
            {currentBlock.type === 'kven_skal_ut' && (() => {
              const kData = d as KvenSkalUtData;
              const rawItems = Array.isArray(kData.items) && kData.items.length > 0 ? kData.items : [];
              const items: KvenSkalUtItem[] = rawItems.length > 0
                ? rawItems
                : [
                    {
                      id: 'ksu_1',
                      options: {
                        A: kData.optionA || 'Alternativ A',
                        B: kData.optionB || 'Alternativ B',
                        C: kData.optionC || 'Alternativ C',
                        D: kData.optionD || 'Alternativ D',
                      },
                      correctOption: kData.correctOption || 'A',
                      explanation: kData.explanation || 'Pedagogisk forklaring på kva som skal ut.',
                    },
                  ];

              const taskIdx = Math.min(items.length - 1, Math.max(0, activePointIndex));
              const currentTask = items[taskIdx] || items[0];
              const correctLetter = currentTask.correctOption || 'A';
              const isTaskSolved = quizShowAnswer || Boolean(kvenRevealedMap[taskIdx]);
              const isGreenActive = kvenGreenMap[taskIdx] || false;
              const isLastTask = taskIdx === items.length - 1;

              return (
                <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-5 space-y-4 shadow-2xs select-none">
                  {/* Topprad: Tittel, task-tabs og hovedknappar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-6 h-6 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-black text-sm uppercase tracking-wider text-stone-900 block">
                          KVEN SKAL UT? — LEIARSTYRING
                        </span>
                        <span className="text-xs font-semibold text-stone-600">
                          Oppgåve {taskIdx + 1} av {items.length}
                        </span>
                      </div>
                    </div>

                    {/* Task Tabs i leiarvising: Oppgåve 1 [D], Oppgåve 2 [B], osv. */}
                    {items.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {items.map((it, i) => {
                          const isAct = i === taskIdx;
                          const letter = it.correctOption || '?';
                          const isSolved = kvenRevealedMap[i];
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleKvenSelectTask(i)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                isAct
                                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 font-black shadow-2xs'
                                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                              }`}
                            >
                              <span>Oppgåve {i + 1}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                isAct ? 'bg-slate-950 text-amber-400' : 'bg-amber-100 text-amber-900'
                              }`}>
                                [{letter}]
                              </span>
                              {isSolved && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Hovedknappar: Avslør fasit & Neste oppgåve (→) */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (isTaskSolved) {
                            setQuizShowAnswer(false);
                            setKvenRevealedMap((prev) => ({ ...prev, [taskIdx]: false }));
                            setKvenGreenMap((prev) => ({ ...prev, [taskIdx]: false }));
                            setShakeOption(null);
                            setKvenSelectedOption(null);
                            if (bcRef.current) {
                              bcRef.current.postMessage({
                                type: 'KVEN_RESET_TASK',
                                senderId: windowIdRef.current,
                                taskIdx,
                              });
                            }
                          } else {
                            handleKvenOptionClick(correctLetter as any, correctLetter, taskIdx);
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
                          isTaskSolved
                            ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400'
                            : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{isTaskSolved ? 'Fasit er avslørt (Skjul)' : 'Avslør fasit'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleNext}
                        className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                          isTaskSolved
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-400/40 animate-pulse shadow-md'
                            : 'bg-stone-800 hover:bg-stone-900 text-white shadow-2xs'
                        }`}
                      >
                        <span>{isLastTask && isTaskSolved ? 'Neste ledd (→)' : 'Neste oppgåve (→)'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Alternativene for aktiv oppgåve i leiarvising (klikkbare boksar) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                      const optText = currentTask.options[letter];
                      if (!optText) return null;
                      const isCorrect = correctLetter === letter;
                      const isShaking = shakeOption === letter;

                      let cardStyle = 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700';
                      let badgeStyle = 'bg-stone-200 text-stone-700';
                      let labelText = '★ SKAL UT';

                      if (isCorrect) {
                        cardStyle = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-950 font-bold shadow-xs';
                        badgeStyle = 'bg-emerald-600 text-white font-bold';
                        labelText = '★ SKAL UT';
                      } else if (isShaking) {
                        cardStyle = 'bg-rose-100 border-rose-500 text-rose-950 animate-kven-shake';
                        badgeStyle = 'bg-rose-600 text-white';
                      }

                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => handleKvenOptionClick(letter, correctLetter, taskIdx)}
                          className={`p-3.5 rounded-xl border-2 flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${cardStyle}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className={`w-8 h-8 rounded-lg text-sm font-black flex items-center justify-center shrink-0 ${badgeStyle}`}>
                              {letter}
                            </span>
                            <span className="text-base font-bold truncate">{optText}</span>
                          </div>
                          {isCorrect && (
                            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shrink-0">
                              {labelText}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Pedagogisk forklaring KUN for leiar */}
                  {currentTask.explanation && (
                    <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-1">
                      <span className="font-bold text-amber-900 text-sm block">Forklaring for leiar:</span>
                      <p className="text-base md:text-lg font-medium text-amber-950 leading-snug">
                        {currentTask.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* DEDIKERT LYSBILDEVISING CONTROL PANEL FOR LEIAR */}
            {(currentBlock.type === 'lysbileteshow' || (currentBlock.type === 'bilde' && d.imageMode === 'slideshow')) && (() => {
              const images = (d.images || []) as any[];

              const speedOptions = [
                { label: '0.5s', val: 0.5 },
                { label: '1s', val: 1 },
                { label: '2s', val: 2 },
                { label: '3s', val: 3 },
                { label: '5s', val: 5 },
                { label: '10s', val: 10 },
                { label: '15s', val: 15 },
                { label: '30s', val: 30 },
              ];

              return (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs select-none mb-6">
                  {/* 1. Kompakt toppkontroll (Knappar og fart) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Tv className="w-5 h-5 text-indigo-600 shrink-0" />
                      <span className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                        LYSBILETESERIE • Bilete {currentSlideIndex + 1} av {images.length}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Play / Pause-knapp */}
                      <button
                        type="button"
                        onClick={() => setIsSlideshowPlaying(!isSlideshowPlaying)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
                          isSlideshowPlaying
                            ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400/30'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/30'
                        }`}
                        title={isSlideshowPlaying ? 'Pause automatisk lysbiletserie' : 'Start automatisk lysbiletserie'}
                      >
                        {isSlideshowPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                        <span>{isSlideshowPlaying ? 'Pause serie' : 'Spel av serie'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentSlideIndex === 0}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold text-xs text-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Førre</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % Math.max(1, images.length))}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <span>Neste</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Fart-knappar */}
                  <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-800">
                        Intervall:
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {speedOptions.map((opt) => {
                          const isSelected = Math.abs(slideshowIntervalSeconds - opt.val) < 0.05;
                          return (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setSlideshowIntervalSeconds(opt.val)}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <span className={`w-2 h-2 rounded-full ${isSlideshowPlaying ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'}`} />
                      <span>{isSlideshowPlaying ? `Autospel (${slideshowIntervalSeconds}s)` : 'Pausa'}</span>
                    </div>
                  </div>

                  {/* 2. Hovudflate: Kun miniatyrbilete i eit ryddig galleri */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                    {images.map((img: any, idx: number) => {
                      const isCurrent = idx === currentSlideIndex;

                      return (
                        <button
                          key={img.id || idx}
                          type="button"
                          onClick={() => setCurrentSlideIndex(idx)}
                          className={`aspect-video rounded-xl overflow-hidden bg-stone-900 relative transition-all duration-200 text-left ${
                            isCurrent
                              ? 'ring-4 ring-amber-500 border-2 border-amber-500 shadow-xl scale-[1.03] z-10'
                              : 'border border-slate-200/90 bg-white opacity-70 hover:opacity-100 hover:border-slate-400 cursor-pointer'
                          }`}
                        >
                          {img.url ? (
                            <img src={img.url} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                              Tom
                            </div>
                          )}

                          {/* Gyllent merke øvst dersom vises no */}
                          {isCurrent && (
                            <span className="absolute top-1 left-1 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1 z-20">
                              ★ VISES NO
                            </span>
                          )}

                          {/* Diskret nummerskilt nede i hjørnet */}
                          <span className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isCurrent ? 'bg-amber-600 text-white' : 'bg-black/70 text-white/90'
                          }`}>
                            #{idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* DEDIKERT BILDEBIBELEN CONTROL PANEL FOR LEIAR */}
            {currentBlock.type === 'bildebibelen' && (() => {
              const bbData = d as BildeBibelenData;
              const scenes = (bbData.scenes || []) as any[];
              const activeSceneIdx = Math.min(activePointIndex, Math.max(0, scenes.length - 1));
              const currentScene = scenes[activeSceneIdx] || scenes[0];
              const scriptText = currentScene
                ? (currentScene.leaderNotes || currentScene.narrationScript || currentScene.imageCaption || '')
                : '';

              return (
                <div className="bg-amber-50/90 border-2 border-amber-200 rounded-2xl p-5 space-y-4 shadow-2xs select-none mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-700 shrink-0" />
                      <span className="font-extrabold text-sm uppercase tracking-wider text-amber-950">
                        BILDEBIBELEN — LEIARPANEL
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-mono font-bold text-xs">
                        Scene {activeSceneIdx + 1} av {scenes.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActivePointIndex((prev) => Math.max(0, prev - 1))}
                        disabled={activeSceneIdx === 0}
                        className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 hover:bg-amber-100 disabled:opacity-40 font-bold text-xs text-amber-900 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Førre scene</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActivePointIndex((prev) => Math.min(scenes.length - 1, prev + 1))}
                        disabled={activeSceneIdx >= scenes.length - 1}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 font-bold text-xs text-white flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <span>Neste scene</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {currentScene && (
                    <div 
                      ref={activeLeaderItemRef}
                      className="p-6 rounded-2xl bg-white border-2 border-amber-500 space-y-4 shadow-md ring-2 ring-amber-300/50"
                    >
                      <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-600 text-white uppercase tracking-wider">
                            ★ Vises på storskjerm
                          </span>
                          <span className="text-sm font-bold text-amber-950">
                            Scene {activeSceneIdx + 1} {currentScene.scriptureRef ? `• ${currentScene.scriptureRef}` : ''}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-stone-500">
                          Piltastar ← / → for å bla i forteljinga
                        </span>
                      </div>

                      <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="w-64 sm:w-80 aspect-video rounded-xl overflow-hidden bg-stone-900 border border-amber-300 shadow-sm shrink-0 flex items-center justify-center">
                          {currentScene.imageUrl ? (
                            <img src={currentScene.imageUrl} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-stone-400 text-xs">Mangler bilde</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-2xl sm:text-3xl font-medium leading-relaxed text-stone-900 whitespace-pre-line">
                            {scriptText || 'Ingen forteljarmanus oppgitt for denne scenen.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* DEDIKERT LEIARPANEL FOR SVART SKJERM */}
            {currentBlock.type === 'svart_skjerm' && (() => {
              const sData = (currentBlock.data || {}) as SvartSkjermData;
              const notes = sData.notes || currentBlock.leaderNotes || '';
              const nextMeta = nextBlock ? BLOCK_METADATA[nextBlock.type] : null;
              const nextTitle = nextBlock 
                ? ((nextBlock.data as any)?.title || (nextBlock.data as any)?.heading || (nextBlock.data as any)?.scriptureRef || (nextBlock.data as any)?.name || nextMeta?.label || 'Neste ledd')
                : null;

              return (
                <div className="space-y-6 select-none">
                  {/* Statusbanner med mørkt badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-950 text-white shadow-md border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 shrink-0">
                        <MonitorOff className="w-5 h-5 text-zinc-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-sm font-black tracking-wide uppercase text-zinc-100">
                            ⬛ Storskjerm er mørk (fokus på formidlar)
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Merksemda i rommet er retta mot deg som formidlar.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-zinc-850 text-zinc-300 border border-zinc-700/80">
                        {sData.durationMinutes ?? 2} minutt
                      </span>
                    </div>
                  </div>

                  {/* Stikkord / Leiarmanus for den munnlege praten */}
                  <div className="p-6 sm:p-8 rounded-2xl bg-amber-50/80 border-2 border-amber-300 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-700" />
                        <span>Stikkord for den munnlege praten</span>
                      </span>
                      <span className="text-xs text-amber-800/80 font-medium">
                        Synleg berre på leiarskjermen
                      </span>
                    </div>

                    {notes.trim() ? (
                      <div className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-relaxed text-slate-900 whitespace-pre-line break-words pt-1">
                        {notes}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-500 italic text-base">
                        Ingen stikkord skrive inn. Prata fritt eller trykk høgre piltast for å gå vidare.
                      </div>
                    )}
                  </div>

                  {/* KIKHOL MOT NESTE STEG */}
                  {nextBlock ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="w-full p-4 sm:p-5 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 transition-all flex items-center justify-between gap-4 cursor-pointer text-left shadow-2xs group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-105 transition-transform">
                          <Eye className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Neste steg
                          </div>
                          <div className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                            {nextTitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm font-bold text-blue-600 shrink-0">
                        <span className="hidden sm:inline">Trykk høgre piltast for å gå vidare</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-100 text-slate-500 text-sm text-center font-medium">
                      Dette er siste ledd i samlinga.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TO-LAGS FORMIDLINGSVISNING FOR LEIAR (Ingen trekkspel, direkte synleg) */}
            {keywordsList.length > 0 && currentBlock.type !== 'quiz' && currentBlock.type !== 'bilete_avdekking' && currentBlock.type !== 'kims_leik' && currentBlock.type !== 'beat_for_beat' && currentBlock.type !== 'ord_for_ord' && currentBlock.type !== 'bildebibelen' && currentBlock.type !== 'lysbileteshow' && currentBlock.type !== 'kven_skal_ut' && currentBlock.type !== 'svart_skjerm' && (
              <div className="flex-1 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Stikkord og manus
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    {keywordsList.length} moment
                  </span>
                </div>

                <div className="flex flex-col gap-6">
                  {keywordsList.map((item, idx) => (
                    <div 
                      key={item.id || idx}
                      ref={item.isActive ? activeLeaderItemRef : null}
                      className={
                        item.isActive 
                          ? 'relative rounded-2xl border-2 border-amber-400 bg-amber-400/10 p-5 shadow-xs transition-all duration-200' 
                          : 'relative rounded-2xl border-2 border-transparent p-5 opacity-60 hover:opacity-100 transition-all duration-200'
                      }
                    >
                      {/* LAG 1 (STIKKORD): Ekstremt tydeleg, stor og feit skrift */}
                      <div className="flex items-center gap-3 mb-2">
                        {item.isActive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-600 text-white shrink-0 uppercase tracking-wide shadow-2xs">
                            ★ På skjerm
                          </span>
                        )}
                        <h3 className={`text-2xl sm:text-3xl font-bold tracking-tight leading-snug break-words ${
                          item.isActive ? 'text-amber-950 font-extrabold' : 'text-slate-900'
                        }`}>
                          {item.title}
                        </h3>
                      </div>

                      {/* LAG 2 (UTDJUPING): Vises direkte under sitt respektive stikkord med innrykk */}
                      {item.detail && item.detail.trim() && (
                        <div className={`pl-4 sm:pl-5 border-l-2 mt-2 ${
                          item.isActive ? 'border-amber-400' : 'border-slate-200'
                        }`}>
                          <p className={`whitespace-pre-line break-words leading-relaxed mb-0 pb-1 ${
                            item.detail.trim().length <= 250
                              ? 'text-xl sm:text-2xl font-medium text-slate-800 leading-snug'
                              : 'text-base sm:text-lg font-normal text-slate-600'
                          }`}>
                            {item.detail}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // 1. REIN STORSKJERM FOR PUBLIKUM
  // =========================================================================
  if (viewMode === 'audience') {
    const slideKey = currentBlock
      ? `${currentBlock.id}-${
          currentBlock.type === 'sang_salme'
            ? activeVerseIndex
            : currentBlock.type === 'beat_for_beat' || currentBlock.type === 'ord_for_ord'
            ? (showBeatSolution ? 'fasit' : 'board')
            : currentBlock.type === 'bilde'
            ? 'static'
            : 0
        }`
      : 'empty';

    return (
      <div 
        onDoubleClick={toggleFullscreen}
        onClick={(e) => {
          // Klikk på bakgrunnen/skjermen set publikumsskjermen i ekte fullskjerm
          if ((e.target as HTMLElement).closest('button')) {
            return;
          }
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
          }
        }}
        style={{
          ...screenCssVars,
          backgroundColor: themeColors.bg,
          color: themeColors.text,
        }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none overflow-hidden font-sans cursor-pointer"
      >
        {/* Sjølve publikumssliden med lynrask overgang */}
        <div className="w-full h-full absolute inset-0 flex items-center justify-center p-0 overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={slideKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.18,
                ease: 'easeOut',
              }}
              className="w-full h-full absolute inset-0 flex items-center justify-center p-0 overflow-hidden"
            >
              {renderAudienceScreen()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Diskret, lekkert overlay/melding nedst for å gå i ekte fullskjerm */}
        {!isFullscreen && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-stone-900/90 hover:bg-stone-800 text-stone-200 hover:text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-2xl border border-stone-700/80 flex items-center gap-2 cursor-pointer transition-all backdrop-blur-md animate-bounce"
            title="Klikk for ekte fullskjerm"
          >
            <Maximize className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Klikk kor som helst her for fullskjerm (eller trykk <strong>F</strong>)</span>
          </div>
        )}

        {/* Hjørnekontroller tilpassa storskjerm-tema (lys/mørk) — neddysa i lys modus, på same topplinje som metadata */}
        <div className={`absolute top-3 right-6 sm:top-4 sm:right-8 z-20 flex items-center gap-1.5 opacity-20 hover:opacity-100 transition-opacity duration-300 p-1 rounded-2xl border backdrop-blur-md ${
          audienceTheme === 'light'
            ? 'bg-stone-200/40 hover:bg-stone-200/90 border-stone-300/40 text-stone-700'
            : 'bg-stone-900/40 hover:bg-stone-900/90 border-stone-800/40 text-stone-400'
        }`}>
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 text-xs font-bold ${
              audienceTheme === 'light'
                ? 'bg-stone-200/80 hover:bg-stone-300 text-stone-800'
                : 'bg-stone-800/60 hover:bg-stone-700 text-stone-300 hover:text-white'
            }`}
            title="Veksle ekte fullskjerm i nettlesaren (F11)"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Avslutt' : 'Fullskjerm'}</span>
          </button>

          <button
            type="button"
            onClick={handleSwapScreens}
            className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 text-xs font-bold ${
              audienceTheme === 'light'
                ? 'bg-stone-200/80 hover:bg-stone-300 text-stone-800'
                : 'bg-stone-800/60 hover:bg-stone-700 text-stone-300 hover:text-white'
            }`}
            title="Bytt til leiarvisning med stikkord og stoppeklokke"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leiarvisning</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl cursor-pointer transition-colors ${
              audienceTheme === 'light'
                ? 'bg-stone-200/80 hover:bg-stone-300 text-stone-800'
                : 'bg-stone-800/60 hover:bg-stone-700 text-stone-300 hover:text-white'
            }`}
            title="Lukk storskjerm (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. LEIARVISNING
  // =========================================================================
  return (
    <div className="fixed inset-0 z-50 bg-stone-100 text-stone-900 flex flex-col select-none overflow-hidden font-sans">
      {renderLeaderScreen()}
    </div>
  );
};
