/**
 * src/lib/imageSearchService.ts
 * 
 * Biletkjelder og søketeneste for Undervisningsbyggjaren:
 * - FreeBibleImages / Sweet Publishing (100% homogen teikneseriestil via Wikimedia Commons)
 * - Gustave Doré & Julius Schnorr von Carolsfeld (klassiske tresnitt i Public Domain)
 * - Klassisk kunst og måleri (Rembrandt, Tissot, Titian m.fl.)
 * - Pixabay & Unsplash (reine natur- og metaforfoto)
 * - Semantisk scene-utvelging (eksposisjon, krise, vending, oppløysing)
 * - Intelligent norsk omsetjing via Gemini før API-kall
 */

export type ArtStyle = 'sweet_publishing' | 'woodcut' | 'classical_painting' | 'photo';

export interface SeriesScene {
  sceneNumber: number;
  url: string;
  title: string;
  filename: string;
  englishDescription?: string;
}

export interface SceneImage {
  id: string;
  url: string;
  label: string;
  sceneIndex: number;
  sceneNumber: number;
  totalScenes: number;
  title?: string;
  leaderNote?: string;
}

export const USER_AGENT_HEADER = {
  'User-Agent': 'UndervisningsbyggjarApp/1.0 (educational church tool; contact@undervisningsbyggjar.no)',
};

export const CURATED_PHOTOS = [
  'https://images.unsplash.com/photo-1548625361-12f5ea11a3b0?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1510936111840-65e151ad71bb?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=1600&q=85',
];

/**
 * Intelligent omsetjing av norsk fritekst / uttrykk til engelsk visuelt søkemotiv
 * og direkte identifikasjon av matchende scene i serien!
 */
export async function translateNorwegianQuery(
  query: string,
  contextTheme: string = '',
  artStyle: ArtStyle = 'sweet_publishing',
  scenes: any[] = []
): Promise<{ englishQuery: string; matchedSceneNumber?: number | null; bibleBook?: string; bibleChapter?: string }> {
  try {
    const res = await fetch('/api/image-search/translate-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, contextTheme, artStyle, scenes }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.englishQuery) {
        return {
          englishQuery: data.englishQuery,
          matchedSceneNumber: data.matchedSceneNumber,
          bibleBook: data.bibleBook,
          bibleChapter: data.bibleChapter,
        };
      }
    }
  } catch (err) {
    console.warn('Feil ved translateNorwegianQuery:', err);
  }
  return { englishQuery: query, matchedSceneNumber: null };
}

/**
 * Normaliser bibelboknamn til Wikimedia Commons standard
 */
function normalizeWikimediaBook(book: string): { fullBook: string; shortBook: string } {
  let b = (book || '').trim();
  b = b.replace(/^(The\s+)?(Gospel of|Book of|First Book of|Second Book of)\s+/i, '');

  if (/^Luke$/i.test(b)) return { fullBook: 'Gospel of Luke', shortBook: 'Luke' };
  if (/^Matthew$/i.test(b)) return { fullBook: 'Gospel of Matthew', shortBook: 'Matthew' };
  if (/^Mark$/i.test(b)) return { fullBook: 'Gospel of Mark', shortBook: 'Mark' };
  if (/^John$/i.test(b)) return { fullBook: 'Gospel of John', shortBook: 'John' };
  if (/^Genesis$/i.test(b)) return { fullBook: 'Book of Genesis', shortBook: 'Genesis' };
  if (/^Exodus$/i.test(b)) return { fullBook: 'Book of Exodus', shortBook: 'Exodus' };
  if (/^(1\s*Sam(uel)?|First Samuel)$/i.test(b)) return { fullBook: 'First Book of Samuel', shortBook: 'Samuel' };
  if (/^(2\s*Sam(uel)?|Second Samuel)$/i.test(b)) return { fullBook: 'Second Book of Samuel', shortBook: 'Samuel' };
  if (/^Acts$/i.test(b)) return { fullBook: 'Acts of the Apostles', shortBook: 'Acts' };

  return { fullBook: book || 'Gospel of Luke', shortBook: b || 'Luke' };
}

/**
 * Hent komplett homogen Sweet Publishing / FreeBibleImages-serie via Wikimedia Commons
 * med streng kapittelfiltrering for å unngå blanding frå andre kapittel!
 */
export async function fetchSweetPublishingSeries(
  bibleBook: string,
  bibleChapter: string,
  fallbackQuery: string
): Promise<SeriesScene[]> {
  const chapterNum = parseInt(bibleChapter || '15', 10) || 15;
  const { fullBook, shortBook } = normalizeWikimediaBook(bibleBook);
  const foundMap = new Map<number, SeriesScene>();

  try {
    // 1. Prioritet 1: Direkte oppslag på kategori i Wikimedia Commons
    const catVariants = [
      `Category:${fullBook} - Chapter ${chapterNum} (Bible illustrations by Sweet Media)`,
      `Category:${shortBook} - Chapter ${chapterNum} (Bible illustrations by Sweet Media)`,
      `Category:Gospel of ${shortBook} - Chapter ${chapterNum} (Bible illustrations by Sweet Media)`,
      `Category:Book of ${shortBook} - Chapter ${chapterNum} (Bible illustrations by Sweet Media)`,
    ];

    for (const cat of catVariants) {
      try {
        const catUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(cat)}&gcmnamespace=6&gcmlimit=50&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
        const catRes = await fetch(catUrl, { headers: USER_AGENT_HEADER });
        if (catRes.ok) {
          const catData = await catRes.json() as any;
          const pages = catData?.query?.pages ? Object.values(catData.query.pages) as any[] : [];

          for (const p of pages) {
            const parsed = parseSceneFile(p.title, p.imageinfo?.[0]?.url, chapterNum);
            if (parsed && !foundMap.has(parsed.sceneNumber)) {
              foundMap.set(parsed.sceneNumber, parsed);
            }
          }

          if (foundMap.size >= 4) {
            break;
          }
        }
      } catch (err) {
        console.warn('Feil ved kategorioppslag:', cat, err);
      }
    }

    // 2. Prioritet 2: Presist sitert søk dersom kategorioppslag ikkje fann heile serien
    if (foundMap.size < 4) {
      const searchQueries = [
        `"${fullBook} Chapter ${chapterNum}" "Bible Illustrations"`,
        `"${shortBook} Chapter ${chapterNum}" "Bible Illustrations by Sweet Media"`,
        `"Bible Illustrations by Sweet Media" ${shortBook} Chapter ${chapterNum}`,
      ];

      for (const sq of searchQueries) {
        try {
          const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(sq)}&gsrnamespace=6&gsrlimit=40&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
          const sRes = await fetch(searchUrl, { headers: USER_AGENT_HEADER });
          if (sRes.ok) {
            const sData = await sRes.json() as any;
            const pages = sData?.query?.pages ? Object.values(sData.query.pages) as any[] : [];

            for (const p of pages) {
              const parsed = parseSceneFile(p.title, p.imageinfo?.[0]?.url, chapterNum);
              if (parsed && !foundMap.has(parsed.sceneNumber)) {
                foundMap.set(parsed.sceneNumber, parsed);
              }
            }

            if (foundMap.size >= 4) {
              break;
            }
          }
        } catch (err) {
          console.warn('Feil ved søk:', sq, err);
        }
      }
    }
  } catch (err) {
    console.warn('Feil ved fetchSweetPublishingSeries:', err);
  }

  // Sorter scenene kronologisk etter scenenummer
  const scenes = Array.from(foundMap.values()).sort((a, b) => a.sceneNumber - b.sceneNumber);

  // Fallback dersom ingenting vart funne i Sweet Publishing for dette kapittelet
  if (scenes.length === 0) {
    const fallbackUrls = await searchWikimediaCommons(`"Bible Illustrations" ${shortBook} ${chapterNum}`, 'sweet_publishing');
    fallbackUrls.forEach((u, i) => {
      scenes.push({
        sceneNumber: i + 1,
        url: u,
        title: `Scene ${i + 1}`,
        filename: `Scene_${i + 1}`,
      });
    });
  }

  return scenes;
}

/**
 * Parser filnamn og sikrar at biletet høyrer til AKKURAT dette kapittelet!
 * Døme: "File:Gospel of Luke Chapter 15-7 (Bible Illustrations by Sweet Media).jpg"
 * -> chapter 15, sceneNumber 7.
 */
function parseSceneFile(title: string, url?: string, targetChapter?: number): SeriesScene | null {
  if (!url) return null;
  const match = title.match(/Chapter\s*(\d+)-(\d+)/i) || title.match(/(\d+)\s*\(/);
  if (!match) return null;

  const chap = parseInt(match[1], 10);
  const sceneNum = parseInt(match[2] || match[1], 10);

  // Dersom targetChapter er oppgitt, krev at kapittelet stemmer!
  // Dette forhindrar at påskeforteljinga / Pontius Pilatus blandar seg inn i Den bortkomne sonen!
  if (targetChapter && chap !== targetChapter) {
    return null;
  }

  return {
    sceneNumber: sceneNum,
    url,
    title: title.replace(/^File:/, '').replace(/\.[^/.]+$/, ''),
    filename: title,
  };
}

/**
 * Semantisk dramaturgisk utvelging av scener frå serien basert på Gemini sine analysar:
 * For 4 ruter:
 * - Scene A: Eksposisjon / Start (f.eks. arven krevst eller reisa startar)
 * - Scene B: Krise / Botnpunkt (f.eks. grisebingen / hungersnauden)
 * - Scene C: Vending / Heimkomst (f.eks. faren spring imot og omfamnar sonen)
 * - Scene D: Oppløysing / Feiring (f.eks. festen og gleda)
 */
export function pickSemanticScenes(
  seriesScenes: SeriesScene[],
  layout: '1' | '2' | '4',
  geminiSelected?: {
    selected4Scenes?: number[];
    selected2Scenes?: number[];
    selected1Scene?: number;
  }
): { selectedScenes: SeriesScene[]; selectedIndices: number[] } {
  if (seriesScenes.length === 0) {
    return { selectedScenes: [], selectedIndices: [] };
  }

  const findSceneByNumber = (targetNum?: number, fallbackIndex: number = 0): SeriesScene => {
    if (typeof targetNum === 'number') {
      const match = seriesScenes.find((s) => s.sceneNumber === targetNum);
      if (match) return match;
    }
    const safeIdx = Math.min(seriesScenes.length - 1, Math.max(0, fallbackIndex));
    return seriesScenes[safeIdx];
  };

  if (layout === '1') {
    // 1 bilde: Det mest ikoniske klimakset (f.eks. omfamninga)
    const target = geminiSelected?.selected1Scene;
    const fallbackIdx = Math.floor(seriesScenes.length * 0.8);
    const scene = findSceneByNumber(target, fallbackIdx);
    const idx = seriesScenes.findIndex((s) => s.sceneNumber === scene.sceneNumber);
    return {
      selectedScenes: [scene],
      selectedIndices: [idx >= 0 ? idx : 0],
    };
  }

  if (layout === '2') {
    // 2 bilde: Dramatisk kontrast (krise vs nåde / før og etter)
    const targets = geminiSelected?.selected2Scenes || [];
    const sceneCrisis = findSceneByNumber(targets[0], Math.floor(seriesScenes.length * 0.45));
    const sceneGrace = findSceneByNumber(targets[1], Math.floor(seriesScenes.length * 0.85));
    const picked = [sceneCrisis, sceneGrace];
    const indices = picked.map((s) => Math.max(0, seriesScenes.findIndex((item) => item.sceneNumber === s.sceneNumber)));
    return {
      selectedScenes: picked,
      selectedIndices: indices,
    };
  }

  // 4 bilde: Klassisk 4-akts tidslinje (Start -> Krise -> Vending -> Feiring)
  const targets = geminiSelected?.selected4Scenes || [];
  const sA = findSceneByNumber(targets[0], 0);
  const sB = findSceneByNumber(targets[1], Math.floor(seriesScenes.length * 0.35));
  const sC = findSceneByNumber(targets[2], Math.floor(seriesScenes.length * 0.75));
  const sD = findSceneByNumber(targets[3], seriesScenes.length - 1);

  const picked = [sA, sB, sC, sD];
  const indices = picked.map((s) => Math.max(0, seriesScenes.findIndex((item) => item.sceneNumber === s.sceneNumber)));

  return {
    selectedScenes: picked,
    selectedIndices: indices,
  };
}

/**
 * Søk Wikimedia Commons med strenge kvalitets- og stilfilter
 */
export async function searchWikimediaCommons(
  rawQuery: string,
  style: ArtStyle = 'sweet_publishing'
): Promise<string[]> {
  try {
    let cleanQuery = rawQuery;

    if (style === 'woodcut') {
      cleanQuery = `("Gustave Doré" OR "Julius Schnorr von Carolsfeld" OR "woodcut" OR "engraving") ${rawQuery} -text -document -page -manuscript -pencil -bookplate`;
    } else if (style === 'classical_painting') {
      cleanQuery = `painting (Rembrandt OR Tissot OR Titian OR Caravaggio OR Rubens OR "classical painting") ${rawQuery} -text -document -page -manuscript -pencil -bookplate`;
    } else if (style === 'sweet_publishing') {
      cleanQuery = `"Bible Illustrations" ${rawQuery} -text -document`;
    } else {
      cleanQuery = `${rawQuery} -text -document -page`;
    }

    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQuery)}&gsrnamespace=6&gsrlimit=15&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
    const resp = await fetch(url, { headers: USER_AGENT_HEADER });
    if (!resp.ok) return [];

    const data = await resp.json() as any;
    const pages = data?.query?.pages ? Object.values(data.query.pages) as any[] : [];
    
    const results: string[] = [];
    for (const p of pages) {
      const info = p.imageinfo?.[0];
      const imgUrl = info?.url;
      const mime = info?.mime || '';
      if (imgUrl && (mime.includes('image/jpeg') || mime.includes('image/png') || mime.includes('image/webp'))) {
        results.push(imgUrl);
      }
    }

    return results;
  } catch (err) {
    console.warn('Feil ved searchWikimediaCommons:', err);
    return [];
  }
}
