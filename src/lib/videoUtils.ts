/**
 * src/lib/videoUtils.ts
 * Hjelpefunksjonar for parsing, validering og automatisk konvertering av videolenker
 * (YouTube, Vimeo, MP4/WebM) samt handtering av min:sek tidsstyring.
 */

export interface ParsedVideoInfo {
  isValid: boolean;
  type: 'youtube' | 'vimeo' | 'html5' | 'unknown';
  videoId?: string;
  embedUrl: string;
  rawUrl: string;
  errorMessage?: string | null;
}

/**
 * Konverterer sekund til formatet «min:sek» (t.d. 95 -> «1:35», 0 -> «0:00»)
 */
export function formatSecondsToMinSec(totalSeconds?: number): string {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) return '';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Tolkar brukarinput som anten «min:sek» (t.d. «1:30» -> 90) eller reine sekund («45» -> 45)
 */
export function parseMinSecToSeconds(val: string): number | undefined {
  if (!val || !val.trim()) return undefined;
  const clean = val.trim();
  if (clean.includes(':')) {
    const parts = clean.split(':');
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) {
      return Math.max(0, m * 60 + s);
    }
    if (!isNaN(m)) return Math.max(0, m * 60);
  }
  const sec = parseInt(clean, 10);
  return !isNaN(sec) ? Math.max(0, sec) : undefined;
}

/**
 * Validerer og formaterer ei videolenke til ei godkjent innbyggings-URL (embedUrl)
 */
export function parseVideoUrl(
  url: string,
  startTimeSeconds?: number,
  stopTimeSeconds?: number,
  autoplay: boolean = false
): ParsedVideoInfo {
  if (!url || !url.trim()) {
    return {
      isValid: false,
      type: 'unknown',
      embedUrl: '',
      rawUrl: '',
      errorMessage: null,
    };
  }

  const clean = url.trim();

  // YouTube-match:
  // Støttar youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const ytMatch = clean.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );

  if (ytMatch && ytMatch[1]) {
    const id = ytMatch[1];
    let embed = `https://www.youtube.com/embed/${id}?autoplay=${autoplay ? '1' : '0'}&rel=0&enablejsapi=1`;
    if (typeof startTimeSeconds === 'number' && startTimeSeconds > 0) {
      embed += `&start=${Math.floor(startTimeSeconds)}`;
    }
    if (typeof stopTimeSeconds === 'number' && stopTimeSeconds > 0) {
      embed += `&end=${Math.floor(stopTimeSeconds)}`;
    }
    return {
      isValid: true,
      type: 'youtube',
      videoId: id,
      embedUrl: embed,
      rawUrl: clean,
      errorMessage: null,
    };
  }

  // Vimeo-match:
  // Støttar vimeo.com/ID og player.vimeo.com/video/ID
  const vimeoMatch = clean.match(
    /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?))/i
  );

  if (vimeoMatch && vimeoMatch[1]) {
    const id = vimeoMatch[1];
    let embed = `https://player.vimeo.com/video/${id}?autoplay=${autoplay ? '1' : '0'}`;
    if (typeof startTimeSeconds === 'number' && startTimeSeconds > 0) {
      embed += `#t=${Math.floor(startTimeSeconds)}s`;
    }
    return {
      isValid: true,
      type: 'vimeo',
      videoId: id,
      embedUrl: embed,
      rawUrl: clean,
      errorMessage: null,
    };
  }

  // Direkte MP4 / WebM / OGG / MOV eller videofil-URL:
  const isDirectFile = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i.test(clean);
  const isHttp = /^https?:\/\/.+/i.test(clean);

  if (isDirectFile || (isHttp && (clean.includes('video') || clean.includes('storage.googleapis') || clean.includes('blob') || clean.includes('cdn')))) {
    let embed = clean;
    if (typeof startTimeSeconds === 'number' && startTimeSeconds > 0) {
      const start = Math.floor(startTimeSeconds);
      const stop = typeof stopTimeSeconds === 'number' && stopTimeSeconds > start ? Math.floor(stopTimeSeconds) : '';
      embed += `#t=${start}${stop ? `,${stop}` : ''}`;
    }
    return {
      isValid: true,
      type: 'html5',
      embedUrl: embed,
      rawUrl: clean,
      errorMessage: null,
    };
  }

  // Dersom lenka ser ut som eit forsøk på YouTube eller Vimeo men mangla gyldig ID:
  if (clean.includes('youtube') || clean.includes('youtu.be') || clean.includes('vimeo')) {
    return {
      isValid: false,
      type: 'unknown',
      embedUrl: '',
      rawUrl: clean,
      errorMessage: 'Ugyldig videolenke – sjekk at heile YouTube- eller Vimeo-adressa er kopiert.',
    };
  }

  // Generisk http URL:
  if (isHttp) {
    return {
      isValid: true,
      type: 'html5',
      embedUrl: clean,
      rawUrl: clean,
      errorMessage: null,
    };
  }

  return {
    isValid: false,
    type: 'unknown',
    embedUrl: '',
    rawUrl: clean,
    errorMessage: 'Ugyldig videolenke – lim inn ei lenke frå YouTube, Vimeo eller ei MP4-fil.',
  };
}
