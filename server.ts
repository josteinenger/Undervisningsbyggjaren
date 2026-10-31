/**
 * server.ts
 * Produksjonsserver for Undervisningsbyggjar
 * 
 * - Fullt uavhengig webserver for AI Studio
 * - API-endepunkt for Gemini AI: /api/teaching-builder/generate og /api/visionary/generate
 * - Integrert med Vite-middlewares i utviklingsmodus
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, Schema } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const CACHE_DIR = path.join(process.cwd(), 'cached_images');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}
app.use('/cached-images', express.static(CACHE_DIR));

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

// =========================================================================
// 1. UNDERVISNINGSBYGGJAR: DEDIKERT GEMINI GENERERINGS-ENDPOINT FOR DEI 7 BLOKKENE
// =========================================================================

const teachingBlockItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      enum: [
        'stikkord', 'tekst', 'undervisning', 'bibelord', 'informasjon', 'bonn_dikt',
        'samtale', 'sang_salme', 'henteleik', 'kims_leik', 'reis_deg', 'bilete_avdekking',
        'bilete', 'bilde', 'lysbileteshow', 'bildebibelen', 'video', 'quiz', 'beat_for_beat',
        'ord_for_ord', 'kven_skal_ut', 'svart_skjerm', 'lek', 'konkurranse'
      ],
      description: 'Typen blokk i Undervisningsbyggaren',
    },
    title: { type: Type.STRING, description: 'Tittel eller emne' },
    durationMinutes: { type: Type.INTEGER, description: 'Tidsbruk i minutt' },
    coreMessage: { type: Type.STRING, description: 'Kjernebodskap / One-liner' },
    moments: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Momentliste til undervisar' },
    slideContent: { type: Type.STRING, description: 'Lysbilete-innhald for storskjerm' },
    slideSubtitle: { type: Type.STRING, description: 'Undertittel for storskjerm' },
    scriptureRef: { type: Type.STRING, description: 'Bibeltilvising' },
    bibleText: { type: Type.STRING, description: 'Sjølve bibelteksten for storskjerm' },
    verseText: { type: Type.STRING, description: 'Ordrett bibeltekst på nynorsk (Bibel 2024/2011) for STORSKJERM' },
    keyVerse: { type: Type.STRING, description: 'Nøkkelvers utheva for storskjerm' },
    explanation: { type: Type.STRING, description: 'Utdjuping og leiar-notat for LEIARVISING (IKKJE på storskjerm)' },
    reflectionQuestion: { type: Type.STRING, description: 'Samtalespørsmål eller undringskrok' },
    heading: { type: Type.STRING, description: 'Overskrift for info' },
    practicalPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Praktiske punkt' },
    noticeBox: { type: Type.STRING, description: 'Viktig varsel / hugs-boks' },
    text: { type: Type.STRING, description: 'Bønnetekst eller dikt' },
    responsiveReading: { type: Type.STRING, description: 'Veksellesing' },
    isResponsive: { type: Type.BOOLEAN, description: 'Om veksellesing er aktivert' },
    name: { type: Type.STRING, description: 'Namn på leiken' },
    energyLevel: { type: Type.STRING, enum: ['Rolig', 'Middels', 'Høgt tempo'], description: 'Energinivå' },
    equipment: { type: Type.STRING, description: 'Utstyr og rekvisittar' },
    rulesSteps: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Trinn-for-trinn reglar' },
    screenDisplay: { type: Type.STRING, enum: ['timer', 'bilde', 'instruks', 'ingen'], description: 'Skjermvising' },
    timerMinutes: { type: Type.INTEGER, description: 'Tid for timer i minutt' },
    timerSeconds: { type: Type.INTEGER, description: 'Tid i sekund for timer (f.eks. 30)' },
    competitionType: { type: Type.STRING, enum: ['Individuell', 'Lag', 'Duell', 'Quiz'], description: 'Type konkurranse' },
    task: { type: Type.STRING, description: 'Oppgåve eller spørsmål' },
    solution: { type: Type.STRING, description: 'Fasit for leiar' },
    clue: { type: Type.STRING, description: 'Hint eller rettleiing' },
    imageUrl: { type: Type.STRING, description: 'Bilde-URL for bilete_avdekking eller bilde' },
    gridSize: { type: Type.INTEGER, description: 'Rutestorleik for avdekking (standard 100)' },
    englishSearchQuery: { type: Type.STRING, description: 'Pixabay søkeord for bilde' },
    scoringRules: { type: Type.STRING, description: 'Poengreglar' },
    topic: { type: Type.STRING, description: 'Tema for samtale' },
    organization: { type: Type.STRING, enum: ['To-og-to', 'Smågrupper', 'Plenum'], description: 'Organisering' },
    reflectionQuestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: '2–3 refleksjonsspørsmål' },
    summaryPoint: { type: Type.STRING, description: 'Oppsummeringspunkt' },
    layout: { type: Type.STRING, description: 'Bilde-oppsett: 1, 2 eller 4' },
    images: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { url: { type: Type.STRING }, label: { type: Type.STRING } } } },
    videoUrl: { type: Type.STRING, description: 'Videokilde URL' },
    leaderKeywords: { type: Type.STRING, description: 'Leiarstikkord' },
    leaderElaboration: { type: Type.STRING, description: 'Utdjupande leiartekst' },
    startTimeSeconds: { type: Type.INTEGER },
    stopTimeSeconds: { type: Type.INTEGER },
    loop: { type: Type.BOOLEAN },
    muted: { type: Type.BOOLEAN },
  },
  required: ['type'],
};

const teachingSessionResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Tittel på heile samlinga' },
    subtitle: { type: Type.STRING, description: 'Målgruppe og tidsramme' },
    blocks: {
      type: Type.ARRAY,
      items: teachingBlockItemSchema,
      description: 'Komplett liste over dei 7 blokktypane i pedagogisk rekkjefølgje',
    },
  },
  required: ['title', 'blocks'],
};

app.post('/api/teaching-builder/generate', async (req, res) => {
  try {
    const { prompt, sourceDocuments, pastedSourceText, targetDuration = 60 } = req.body;
    console.log('[TeachingBuilder API] Generating session for:', prompt);

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'Ingen GEMINI_API_KEY konfigurert på server, bruker lokal generator.',
      });
    }

    const systemInstruction = `Du er ein pedagogisk og teologisk assistent for ein prest eller kateket i Den norske kyrkja som planlegg undervisningsopplegg for leir, konfirmasjon, trusopplæring og ungdomskveldar i verktøyet «Undervisningsbyggjar».

DU SKAL BYGGJE EI HEILSKAPLEG SAMLING SAMANSETT AV DEI 7 FASTE BLOKK-TYPANE:
1. 'undervisning': Kjernebodskap («One-liner»), 3-4 momenter til undervisar, og kort slåande tekst til storskjerm (slideContent).
2. 'bibelord': Bibeltilvising (reference / scriptureRef: f.eks. Lukas 15, 20), sjølve bibelteksten KUN for STORSKJERM (verseText / bibleText: ordrett henta frå Bibel 2024/2011 nynorsk med «...»), utheva nøkkelvers til storskjerm, og leiar-notat / utdjuping (explanation / leaderNotes: KUN for LEIARVISING, aldri på storskjerm som bibeltekst).
3. 'informasjon': Praktiske punkt (kiosk, leirpåmelding, tider) og ein hugs-boks (noticeBox).
4. 'bonn_dikt': Sentrert bønnetekst med valfri veksellesing for forsamlinga.
5. 'lek': Namn på leiken, energinivå ('Rolig' | 'Middels' | 'Høgt tempo'), utstyr, trinnvise enkle reglar, og skjermvising (timer/instruks).
6. 'konkurranse': Konkurransetittel, type ('Individuell' | 'Lag' | 'Duell' | 'Quiz'), oppgåve, fasit for leiar, og poengreglar.
7. 'samtale': Tema, organisering ('To-og-to' | 'Smågrupper' | 'Plenum'), 2–3 korte og konkrete refleksjonsspørsmål for konfirmantar (13–14 år), ALDRI meir enn 3 spørsmål! Bruk superenkelt språk om vennegjengen, skulen eller Snap. ABSOLUTT FORBOD mot abstrakte ord som 'utanforskap' eller 'inkludering'. Maks 8–12 ord per spørsmål. Standard tidsbruk: 6–8 minutt.

REGLAR FOR KVALITET OG TID:
- Tilpass summen av durationMinutes slik at heile samlinga treffer omtrent den ynska tida (f.eks. ca. ${targetDuration} minutt).
- Bruk levande, varmt og ungdommeleg språk tilpassa konfirmantar og ungdom.
- Bygg ein god dramaturgisk boge: Start gjerne med ein isbrytande lek, gå over i bibel og undervisning, fordjup i samtale to-og-to eller i grupper, krydre med ein quiz/konkurranse, og rund av med bøn og praktisk info.
- Viss brukaren legg ved kjeldetekst eller dokument (leiarhefte, fagtekst), hent all teologi, forteljingar og reglar direkte frå desse kildene!`;

    const contentParts: any[] = [];
    const textSources: string[] = [];

    const docsList = Array.isArray(sourceDocuments) ? sourceDocuments : [];
    for (const doc of docsList) {
      if (doc.base64Data && doc.type) {
        contentParts.push({
          inlineData: {
            mimeType: doc.type,
            data: doc.base64Data,
          },
        });
      } else if (doc.textContent) {
        textSources.push(`KILDE: "${doc.name || 'Dokument'}":\n${doc.textContent}`);
      }
    }

    if (pastedSourceText && pastedSourceText.trim()) {
      textSources.push(`INNLIMT KILDETEKST FRA LEDERHEFTE:\n${pastedSourceText.trim()}`);
    }

    let finalPrompt = prompt?.trim() || `Lag ei komplett samling på ca. ${targetDuration} minutt tilpassa konfirmantar og ungdom.`;
    if (textSources.length > 0) {
      finalPrompt = `${textSources.join('\n\n====================\n\n')}\n\n====================\nBRUKARENS BESTILLING:\n${finalPrompt}`;
    }

    contentParts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contentParts,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: teachingSessionResponseSchema,
        maxOutputTokens: 8192,
        temperature: 0.4,
      },
    });

    const text = response.text?.trim() || '{}';
    let rawResult: any = {};
    try {
      rawResult = JSON.parse(text);
    } catch {
      rawResult = {};
    }

    const title = rawResult.title || 'Ny samling med Gemini';
    const subtitle = rawResult.subtitle || `Konfirmantar • ${targetDuration} minutt`;
    const blocks = Array.isArray(rawResult.blocks) ? rawResult.blocks : [];

    const generatedBlocks = blocks.map((b: any, idx: number) => {
      const type = b.type || 'undervisning';
      const id = `block_${type}_${Date.now()}_${idx + 1}`;
      let blockData = {
        ...b,
        durationMinutes: typeof b.durationMinutes === 'number' ? b.durationMinutes : 8,
      };

      if (type === 'video') {
        blockData.videoUrl = '';
        blockData.suggestedYouTubeUrl = '';
        blockData.leaderNotes = '«(Set inn eiga videolenke på arbeidsbordet)»';
      } else if (type === 'sang_salme') {
        blockData.songText = '';
        blockData.verses = [];
        blockData.leaderNotes = '«(Set inn eiga salmetekst på arbeidsbordet)»';
      } else if (type === 'samtale') {
        blockData.durationMinutes = typeof blockData.durationMinutes === 'number' ? Math.min(10, Math.max(5, blockData.durationMinutes)) : 7;
        let qs = Array.isArray(blockData.reflectionQuestions)
          ? blockData.reflectionQuestions.map((q: any) => String(q).trim()).filter(Boolean)
          : [];
        if (qs.length === 0) {
          qs = [
            'Er det lett eller vanskeleg å seie unnskyld når du har dumma deg ut?',
            'Kva skal til for at du tilgjev ein ven som har svikta deg?',
          ];
        }
        blockData.reflectionQuestions = qs.slice(0, 3);
      }

      return {
        id,
        type,
        isExpanded: idx === 0,
        data: blockData,
      };
    });

    return res.json({
      success: true,
      title,
      subtitle,
      blocks: generatedBlocks,
      message: `Gemini skapte ei samling med ${generatedBlocks.length} ledd!`,
    });
  } catch (err: any) {
    console.warn('[TeachingBuilder API] Feil ved generering:', err?.message);
    return res.status(200).json({
      success: false,
      fallback: true,
      message: err?.message || 'Gemini kall feilet',
    });
  }
});

// =========================================================================
// 1.5 KIMS LEIK: KI-GENERATOR FOR GJENSTANDAR
// =========================================================================

const kimsLeikResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Eit enkelt konkret substantiv (t.d. Kross, Palmegrein, Nyklar, Kaffekopp)' },
          emoji: { type: Type.STRING, description: 'Den offisielle Unicode-emojien som best illustrerer tingen (t.d. ✝️, 🌿, 🔑, ☕)' },
        },
        required: ['name', 'emoji'],
      },
      description: 'Liste over unike, konkrete gjenstandar med name og emoji utan duplikat',
    },
  },
  required: ['items'],
};

app.post('/api/kims-leik/generate', async (req, res) => {
  try {
    const { prompt, count = 16 } = req.body;
    const rawLang = req.body.lang || req.body.language || 'nn';
    const language: 'nn' | 'nb' = rawLang === 'nb' ? 'nb' : 'nn';
    const langLabel = language === 'nb' ? 'bokmål' : 'nynorsk';
    console.log('[KimsLeik API] Generating items for prompt:', prompt, 'count:', count, 'lang:', language);

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'Ingen GEMINI_API_KEY konfigurert på server',
      });
    }

    const systemInstruction = `Du er ein assistent for kyrkjeleg trusopplæring, leir og samlingar i Den norske kyrkja.
Generer nøyaktig ${count} unike, konkrete gjenstandar på 100 % konsekvent ${langLabel} tilpassa temaet '${prompt}'.

${getLanguageInstruction(language)}

STRENGE REGLAR FOR KIMS LEIK:
1. FORBOD MOT DUPLIKAT: Alle gjenstandar i brettet MÅ vere heilt unike. Ingen gjenstand eller emoji skal førekomme fleire gonger.
2. BERRE KONKRETE ENKELTORD/SUBSTANTIV: Kvar gjenstand skal vere eit kort, fysisk substantiv på ${langLabel} (t.d. ${language === 'nb' ? '«Kors», «Palmegrein», «Nøkler», «Kaffekopp», «Bibel», «Stearinlys», «Gris», «Gullring», «Sandal», «Brød»' : '«Kross», «Palmegrein», «Nyklar», «Kaffekopp», «Bibel», «Stearinlys», «Gris», «Gullring», «Sandal», «Brød»'}).
3. FORBOD MOT SETNINGAR OG LANGE SKILDRINGAR: ALDRI generer uttrykk som «En liten grisestatue», «En skje med grøt» eller «En figur av en far».
4. FOR KVAR GJENSTAND MÅ DU LEGGJE VED DEN OFFISIELLE UNICODE-EMOJIEN:
   Returner eit JSON-objekt der 'items' inneheld gjenstandar med "name" på ${langLabel} og "emoji":
   [
     { "name": "${language === 'nb' ? 'Kors' : 'Kross'}", "emoji": "✝️" },
     { "name": "Palmegrein", "emoji": "🌿" },
     { "name": "${language === 'nb' ? 'Nøkler' : 'Nyklar'}", "emoji": "🔑" },
     { "name": "Kaffekopp", "emoji": "☕" }
   ]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ text: `Generer nøyaktig ${count} unike enkeltord-gjenstandar på ${langLabel} med sin offisielle Unicode-emoji for Kims leik om: ${prompt}` }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: kimsLeikResponseSchema,
        temperature: 0.4,
      },
    });

    const text = response.text?.trim() || '{}';
    let rawResult: any = {};
    try {
      rawResult = JSON.parse(text);
    } catch {
      rawResult = {};
    }

    const rawItems = Array.isArray(rawResult.items) ? rawResult.items : [];
    const formattedItems = rawItems.map((it: any) => {
      if (typeof it === 'object' && it !== null) {
        const name = (it.name || it.text || '').trim();
        const emoji = (it.emoji || it.iconName || '📦').trim();
        return {
          name,
          emoji,
          text: name,
          iconName: emoji,
        };
      }
      const name = String(it || '').trim();
      return {
        name,
        emoji: '📦',
        text: name,
        iconName: '📦',
      };
    });

    return res.json({ success: true, items: formattedItems });
  } catch (err: any) {
    console.warn('[KimsLeik API] Feil ved generering:', err?.message);
    return res.status(200).json({ success: false, fallback: true, message: err?.message });
  }
});

// =========================================================================
// 1.4 PIXABAY BILDSØK-TENESTE MED DRIFTSSIKKER FALLBACK
// =========================================================================

const CURATED_THEMATIC_PHOTOS: Record<string, string[]> = {
  nature: [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=85',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=85',
    'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=1600&q=85',
    'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=85',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=85',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=85',
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=85',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=85',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=85',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=85',
    'https://images.unsplash.com/photo-1510936111840-65e151ad71bb?auto=format&fit=crop&w=1600&q=85',
    'https://images.unsplash.com/photo-1548625361-12f5ea11a3b0?auto=format&fit=crop&w=1600&q=85',
  ],
  guessing: [
    'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=1600&q=85', // Fjellrev / Rev
    'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=1600&q=85', // Luftballong
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1600&q=85', // Hund
    'https://images.unsplash.com/photo-1548625361-12f5ea11a3b0?auto=format&fit=crop&w=1600&q=85', // Katedral
    'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=1600&q=85', // Panda
    'https://images.unsplash.com/photo-1482192505345-5655af888cc4?auto=format&fit=crop&w=1600&q=85', // Nordlys
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=85', // Ørken
    'https://images.unsplash.com/photo-1543946207-39bd91e70ca7?auto=format&fit=crop&w=1600&q=85', // Pingvin
  ]
};

function looksLikeNorwegianOrSentence(q: string): boolean {
  const s = (q || '').trim();
  if (!s) return true;
  if (/[æøåÆØÅ]/.test(s)) return true;
  if (/\b(ein|ei|et|ett|den|det|dei|som|for|med|til|frå|fra|på|i|og|eller|ikkje|ikke|korleis|hvordan|kvifor|hvorfor|kven|hvem|kva|hva|pengesetel|pengeseddel|hjarte|hjerte|leirkrukke|krukke|gullring|bortkomne|fortapte|sonen|sønnen|sau|lam|kross|kors|kyrkje|kirke|bøn|bønn|fellesskap|vennskap|nåde|tilgjeving|tilgivelse|einsamheit|ensomhet|leirbål|stjernehimmel)\b/i.test(s)) {
    return true;
  }
  if (s.split(/\s+/).length > 5) return true;
  return false;
}

function extractMainEnglishNoun(englishQuery: string): string {
  const stopWords = new Set([
    'a', 'an', 'the', 'of', 'in', 'on', 'at', 'with', 'and', 'or', 'for', 'to', 'from', 'by',
    'red', 'blue', 'green', 'yellow', 'golden', 'gold', 'silver', 'white', 'black', 'dark', 'bright', 'light',
    'ancient', 'old', 'vintage', 'modern', 'new', 'young', 'happy', 'sad', 'lonely', 'peaceful', 'calm',
    'wooden', 'stone', 'clay', 'metal', 'beautiful', 'warm', 'glowing', 'shiny', 'small', 'big', 'large',
    'symbol', 'concept', 'illustration', 'photo', 'picture', 'image', 'scene', 'background', 'close', 'closeup'
  ]);
  const words = (englishQuery || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3);

  if (words.length === 0) return 'nature';
  const nouns = words.filter(w => !stopWords.has(w));
  if (nouns.length > 0) {
    // I engelsk (t.d. "ancient clay pottery jar", "red heart", "golden ring") står hovudsubstantivet oftast først eller sist blant substantiva
    return nouns[0];
  }
  return words[words.length - 1];
}

async function translateQueryToEnglishPixabayTags(rawQuery: string, contextTheme: string = ''): Promise<string> {
  const clean = (rawQuery || '')
    .replace(/^fasit\s*:\s*/i, '')
    .replace(/^biletet?\s+viser\s*:\s*/i, '')
    .replace(/^(ein|ei|et|ett|en)\s+/i, '')
    .trim();

  if (!clean) return 'nature landscape';

  // Dersom strengen allereie er korte, reine engelske fototags (2–4 ord utan norske teikn/ord), bruk han direkte
  if (!looksLikeNorwegianOrSentence(clean)) {
    return clean;
  }

  if (apiKey) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Pixabay tag translation timeout')), 4500)
      );
      const genPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            text: `Omset dette norske motivet, fasit-ordet eller temaet til 2–3 konkrete, visuelle engelske fototags som gjev blinkskot på Pixabay (kun fysiske ting/motiv som kan fotograferast, ALDRI abstrakte ord):
Motiv: "${clean}"${contextTheme ? `\nKontekst: "${contextTheme}"` : ''}

Døme:
- "Ein pengesetel" -> "banknote cash money"
- "Eit hjarte" -> "red heart symbol"
- "Ei leirkrukke" -> "ancient clay pottery jar"
- "Ein gullring" -> "golden ring jewelry"
- "Ein sau på fjellet" -> "white sheep mountain"
- "Den bortkomne sonen / tilgjeving" -> "father son hug sunset"

Svar KUN med dei 2–3 engelske fototagsa på éi linje utan punktum eller hermeteikn.`,
          },
        ],
        config: {
          temperature: 0.1,
        },
      });

      const resp: any = await Promise.race([genPromise, timeoutPromise]);
      const tags = (resp.text || '')
        .replace(/["'«»`.,;:\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (tags && tags.length >= 2) {
        return tags;
      }
    } catch (err: any) {
      console.warn('[Pixabay AI-omsetjing] Feil/timeout ved omsetjing av søkeord:', err?.message);
    }
  }

  return clean;
}

async function searchWikimediaCommons(
  cleanQuery: string, 
  count: number = 5
): Promise<Array<{ id: string; url: string; caption: string; alt: string }>> {
  try {
    const wUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(cleanQuery + ' filetype:bitmap')}&gsrlimit=${Math.max(count * 2, 8)}&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
    const res = await fetch(wUrl, {
      headers: { 'User-Agent': 'KyrkjeApp/1.0 (undervisning@kirken.no)' },
    });
    if (res.ok) {
      const data = (await res.json()) as any;
      const pages = data?.query?.pages;
      if (pages && typeof pages === 'object') {
        const results: Array<{ id: string; url: string; caption: string; alt: string }> = [];
        const pageList = Object.values(pages);
        for (const p of pageList as any[]) {
          const img = p.imageinfo?.[0];
          if (img?.url) {
            const url = img.url;
            const mime = (img.mime || '').toLowerCase();
            // Filtrer ut filer som ikkje er vanlege bitmap-bilete
            if (
              mime.includes('image/jpeg') || 
              mime.includes('image/png') || 
              mime.includes('image/webp') || 
              /\.(jpe?g|png|webp)($|\?)/i.test(url)
            ) {
              results.push({
                id: `wm_${p.pageid || Date.now()}_${results.length}`,
                url,
                caption: cleanQuery,
                alt: cleanQuery,
              });
              if (results.length >= count) break;
            }
          }
        }
        if (results.length > 0) {
          return results;
        }
      }
    }
  } catch (err: any) {
    console.warn('[Wikimedia Commons API] Søk feilet:', err?.message);
  }
  return [];
}

async function searchPixabayPhotos(
  query: string, 
  count: number = 10,
  category: 'general' | 'guessing' = 'general',
  offset: number = 0
): Promise<Array<{ id: string; url: string; caption: string; alt: string }>> {
  const pixabayKey = process.env.PIXABAY_API_KEY || process.env.PIXABAY_KEY || '25503371-70973648ec6a14ec31ba5dd8c';
  const rawQuery = (query || '').trim();
  const cleanQuery = await translateQueryToEnglishPixabayTags(rawQuery);

  console.log(`[Pixabay] Søkjer: raw="${rawQuery}", englishTags="${cleanQuery}", nøkkelAktiv=${Boolean(pixabayKey)}`);

  // 1. Primærsøk på Pixabay med dei engelske fototagsa (cleanQuery)
  if (pixabayKey && (cleanQuery || rawQuery)) {
    try {
      const q = cleanQuery || rawQuery;
      const pUrl = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(q)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=15`;
      const pRes = await fetch(pUrl, { headers: { 'User-Agent': 'Undervisningsbyggjar/1.0' } });
      if (pRes.ok) {
        const pData = (await pRes.json()) as any;
        if (Array.isArray(pData?.hits) && pData.hits.length > 0) {
          return pData.hits.slice(0, count).map((h: any, i: number) => ({
            id: `px_${h.id || Date.now()}_${i}`,
            url: h.largeImageURL || h.webformatURL,
            caption: '',
            alt: h.tags || rawQuery || cleanQuery,
          }));
        }
      }
    } catch (err: any) {
      console.warn('[Pixabay API] Primærsøk feilet:', err?.message);
    }

    // 2. Dersom Pixabay gjev 0 treff, gjer eit forenkla søk på berre hovudsubstantivet (t.d. "banknote", "heart", "jar")
    try {
      const mainNoun = extractMainEnglishNoun(cleanQuery || rawQuery);
      console.log(`[Pixabay] 0 treff på "${cleanQuery}". Prøver forenkla søk på hovudsubstantiv: "${mainNoun}"`);

      const pUrlSimp = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(mainNoun)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=15`;
      const pResSimp = await fetch(pUrlSimp, { headers: { 'User-Agent': 'Undervisningsbyggjar/1.0' } });
      if (pResSimp.ok) {
        const pDataSimp = (await pResSimp.json()) as any;
        if (Array.isArray(pDataSimp?.hits) && pDataSimp.hits.length > 0) {
          return pDataSimp.hits.slice(0, count).map((h: any, i: number) => ({
            id: `px_simp_${h.id || Date.now()}_${i}`,
            url: h.largeImageURL || h.webformatURL,
            caption: '',
            alt: h.tags || rawQuery || cleanQuery,
          }));
        }
      }
    } catch (err: any) {
      console.warn('[Pixabay API] Forenkla søk feilet:', err?.message);
    }
  }

  // 3. Fallback skal KUN vere dei kuraterte Unsplash-bileta i CURATED_THEMATIC_PHOTOS, ALDRI Wikimedia Commons!
  const pool = category === 'guessing' ? CURATED_THEMATIC_PHOTOS.guessing : CURATED_THEMATIC_PHOTOS.nature;
  const results: Array<{ id: string; url: string; caption: string; alt: string }> = [];

  for (let i = 0; i < count; i++) {
    const fallbackUrl = pool[(offset + i) % pool.length];
    results.push({
      id: `photo_${Date.now()}_${offset + i + 1}`,
      url: fallbackUrl,
      caption: '',
      alt: rawQuery || cleanQuery || `Bilete ${offset + i + 1}`,
    });
  }

  return results;
}

app.post('/api/pixabay/search', async (req, res) => {
  try {
    const { query = '', count = 10, category = 'general', offset = 0 } = req.body;
    const hits = await searchPixabayPhotos(query, count, category, offset);
    return res.json({ success: true, hits, query });
  } catch (err: any) {
    return res.json({ success: false, hits: [], message: err?.message });
  }
});

// Hjelpefunksjon for å laste ned og cache Pixabay-bilete lokalt
async function cacheRemoteImageLocally(url: string): Promise<string> {
  if (!url || !url.startsWith('http')) return url;
  if (url.startsWith('/cached-images') || url.startsWith('data:')) return url;
  try {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const ext = url.includes('.png') ? '.png' : url.includes('.webp') ? '.webp' : '.jpg';
    const filename = `${hash}${ext}`;
    const filePath = path.join(CACHE_DIR, filename);

    if (!fs.existsSync(filePath)) {
      const res = await fetch(url, { headers: { 'User-Agent': 'Undervisningsbyggjar/1.0' } });
      if (!res.ok) throw new Error(`Kunne ikkje hente bilete: ${res.statusText}`);
      const arrayBuffer = await res.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    }
    return `/cached-images/${filename}`;
  } catch (err) {
    console.error('Feil ved biletcaching:', err);
    return url;
  }
}

async function downloadAndCachePixabayImage(remoteUrl: string, _prefix: string = 'px'): Promise<string> {
  return cacheRemoteImageLocally(remoteUrl);
}

app.post('/api/pixabay/cache-image', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Mangler url', success: false, message: 'Mangler url' });
    const localPath = await cacheRemoteImageLocally(url);
    res.json({ success: true, localUrl: localPath });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// =========================================================================
// 1.7 AI-ASSISTENT: SINGEL-BLOKK GENERERING FOR ENKELTBLOKKER
// =========================================================================

const singleBlockResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    blockType: { type: Type.STRING },
    title: { type: Type.STRING, description: 'Kort, rein tittel for blokka, t.d. "Borte og funnet igjen" – ALDRI heile instruksjonssetninga til brukaren' },
    durationMinutes: { type: Type.INTEGER },

    // Stikkord & Kulepunkt (3–4 konkrete punkt):
    stikkord: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Array med 3–4 konkrete, munnlege stikkord på 2–5 ord kvar for storskjerm',
    },
    points: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          keyword: { type: Type.STRING, description: 'Kort, konkret munnleg stikkord (2–5 ord) for storskjerm' },
          text: { type: Type.STRING, description: 'Same som keyword (2–5 ord)' },
          leaderNotes: { type: Type.STRING, description: 'Folkeleg og naturleg munnleg manus (maks 2–3 korte setningar) som utdjupar stikkordet, utan svulstige filosofiske spørsmål' },
          note: { type: Type.STRING, description: 'Same som leaderNotes' },
        },
        required: ['keyword', 'leaderNotes'],
      },
    },

    // Tekst (storskjerm og leiarvising):
    slideText: { type: Type.STRING, description: 'Kort, tydeleg bodskap, sitat eller utsegn til storskjerm (maks 2-3 linjer)' },
    content: { type: Type.STRING },
    text: { type: Type.STRING },
    subtitle: { type: Type.STRING },
    leaderNotes: { type: Type.STRING, description: 'Munnleg manus eller bakgrunnsnotat til leiaren' },

    // Bibelord (ordrett henta frå Det Norske Bibelselskap si Bibel 2024 / 2011 på vald målform, aldri 1978/85, med «...»):
    bibleRef: { type: Type.STRING, description: 'F.eks. Luk 15,11–24' },
    reference: { type: Type.STRING, description: 'F.eks. Lukas 15,11–24' },
    scriptureRef: { type: Type.STRING },
    verseText: { type: Type.STRING, description: 'Ordrett bibeltekst på vald målform (nynorsk eller bokmål) frå Bibel 2024/2011 med gåsaugo «...» KUN for STORSKJERM. Må ALDRI vere tom eller erstattast av leiar-notat.' },
    bibleText: { type: Type.STRING },
    keyVerse: { type: Type.STRING },
    explanation: { type: Type.STRING, description: 'Valfri utdjuping, kommentar eller bakgrunnsstoff som KUN visast i LEIARVISING, ALDRI på storskjerm som bibeltekst.' },
    reflectionQuestion: { type: Type.STRING },

    // Bøn / Dikt (Patrick Hand-venleg munnleg formatering):
    responsiveReading: { type: Type.STRING },
    isResponsive: { type: Type.BOOLEAN },

    // Pixabay bilde & lysbileteshow:
    layout: { type: Type.INTEGER, description: 'Tal på bilete: 1, 2 eller 4' },
    imageQueries: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          slot: { type: Type.STRING, description: 'Plassering eller motivnamn (t.d. "Slot 1", "Slot 2")' },
          englishQuery: { type: Type.STRING, description: 'Spissa, konkrete engelske søkeord (2–4 tags for Pixabay) tilpassa dette einskildmotivet' },
          caption: { type: Type.STRING, description: 'Som hovudregel tom streng ("") med mindre brukaren eksplisitt ber om bildetekst' },
        },
        required: ['englishQuery'],
      },
      description: 'Dersom brukaren ber om 1, 2 eller 4 bilete, ei liste med eit eige spissa søkeobjekt per motiv',
    },
    imageSearchQueries: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Eitt presist, engelsk søkeord på 2–4 ord PER bilete',
    },
    imageCaptions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Som hovudregel tomme strenger ["", ""] med mindre brukaren eksplisitt ber om undertekstar',
    },
    englishSearchQuery: {
      type: Type.STRING,
      description: 'OBLIGATORISK for "bilete_avdekking", "bilete" og "lysbileteshow": 2–4 spissa, engelske fototags for Pixabay. For "bilete_avdekking" SKAL dette vere det konkrete, visuelle motivet til fasiten (t.d. fasit: "Ein pengesetel" -> englishSearchQuery: "banknote cash money", fasit: "Eit hjarte" -> englishSearchQuery: "red heart symbol", fasit: "Ei leirkrukke" -> englishSearchQuery: "ancient clay pottery jar").',
    },
    imageCaption: { type: Type.STRING, description: 'SKAL VERE TOM STRENG (""). KUN fyllast ut viss brukaren eksplisitt ber om det.' },
    interval: { type: Type.INTEGER, description: 'Intervall i sekund for lysbileteshow' },
    intervalSeconds: { type: Type.INTEGER },
    loop: { type: Type.BOOLEAN },
    autoLoop: { type: Type.BOOLEAN },

    // Bilete-avdekking:
    fasit: { type: Type.STRING, description: 'Kva dette eine biletet førestiller på vald målform (t.d. "Ein pengesetel", "Eit hjarte", "Ei leirkrukke", "Ein gullring")' },
    solution: { type: Type.STRING, description: 'Same som fasit' },
    clue: { type: Type.STRING, description: 'Lurt hint tilpassa forsamlinga' },
    hints: { type: Type.ARRAY, items: { type: Type.STRING }, description: '2-3 hint for leiaren' },
    gridSize: { type: Type.INTEGER },

    // Video:
    suggestedYouTubeUrl: { type: Type.STRING, description: 'Reell YouTube URL tilpassa temaet' },
    videoUrl: { type: Type.STRING },
    videoIntroduction: { type: Type.STRING, description: 'Kva leiaren seier før videoen startar' },
    videoSummary: { type: Type.STRING, description: 'Kva leiaren seier etter videoen' },

    // Quiz:
    quizMode: { type: Type.STRING },
    quizQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING,
            description: 'Klart spørsmål på vald målform (nynorsk eller bokmål) retta mot 14-åringar',
          },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Array med nøyaktig 4 alternativ [A, B, C, D]',
          },
          optionA: { type: Type.STRING, description: 'Alternativ A (første alternativ i options)' },
          optionB: { type: Type.STRING, description: 'Alternativ B (andre alternativ i options)' },
          optionC: { type: Type.STRING, description: 'Alternativ C (tredje alternativ i options)' },
          optionD: { type: Type.STRING, description: 'Alternativ D (fjerde alternativ i options)' },
          correctOption: {
            type: Type.STRING,
            enum: ['A', 'B', 'C', 'D'],
            description: 'Nøyaktig éin bokstav: "A", "B", "C" eller "D" som peiker på det FAKTISK korrekte svaret i options-arrayen. Varier naturleg mellom A, B, C og D (aldri meir enn to like på rad).',
          },
          correctLetter: { type: Type.STRING },
          correctAnswer: { type: Type.STRING },
          correctIndex: { type: Type.INTEGER },
          answerIndex: { type: Type.INTEGER },
          correctAnswerIndex: { type: Type.INTEGER },
          answer: { type: Type.STRING },
          explanation: {
            type: Type.STRING,
            description: 'Ei kort, pedagogisk forklaring (1–2 setningar) på vald målform om kvifor dette alternativet er rett. Teksten "Alternativ X er rett svar" er STRENGT FORBODE.',
          },
        },
        required: ['question', 'options', 'correctOption', 'explanation'],
      },
    },

    // Kims leik:
    items: { type: Type.ARRAY, items: { type: Type.STRING } },
    kimsItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          emoji: { type: Type.STRING },
        },
        required: ['name', 'emoji'],
      },
    },
    itemCount: { type: Type.INTEGER },
    countdownSeconds: { type: Type.INTEGER },
    timerSeconds: { type: Type.INTEGER },

    // Informasjon:
    heading: { type: Type.STRING },
    practicalPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    noticeBox: { type: Type.STRING },

    // Henteleik, Reis deg & Konkurransar:
    intro: { type: Type.STRING },
    henteleikItems: { type: Type.ARRAY, items: { type: Type.STRING } },
    statements: { type: Type.ARRAY, items: { type: Type.STRING } },
    category: { type: Type.STRING },
    words: { type: Type.ARRAY, items: { type: Type.STRING } },
    quote: { type: Type.STRING },
    hint: { type: Type.STRING },

    // Samtale & Song/Salme:
    topic: { type: Type.STRING },
    organization: { type: Type.STRING },
    reflectionQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    summaryPoint: { type: Type.STRING },
    songNumber: { type: Type.STRING },
    verses: { type: Type.ARRAY, items: { type: Type.STRING } },

    // Kven skal ut:
    kvenSkalUtItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          options: {
            type: Type.OBJECT,
            properties: {
              A: { type: Type.STRING },
              B: { type: Type.STRING },
              C: { type: Type.STRING },
              D: { type: Type.STRING },
            },
            required: ['A', 'B', 'C', 'D'],
          },
          optionA: { type: Type.STRING },
          optionB: { type: Type.STRING },
          optionC: { type: Type.STRING },
          optionD: { type: Type.STRING },
          correctOption: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
      },
    },
    optionA: { type: Type.STRING },
    optionB: { type: Type.STRING },
    optionC: { type: Type.STRING },
    optionD: { type: Type.STRING },
    correctOption: { type: Type.STRING },
  },
  required: ['blockType', 'title'],
};

app.post('/api/image-search/translate-query', async (req, res) => {
  try {
    const { query = '', contextTheme = '', scenes = [], artStyle = 'sweet_publishing' } = req.body;
    console.log('[ImageTranslate API] Translating query:', query, 'context:', contextTheme, 'scenes count:', scenes?.length);

    if (!apiKey || !query.trim()) {
      return res.json({ success: true, englishQuery: query.trim(), matchedSceneNumber: null });
    }

    const systemInstruction = `Du er ein ekspert på bibelkunst, illustrasjonar og biletkuratering for Den norske kyrkja.
Oppgåva di er å analysere det norske bibeluttrykket eller motivet '${query}' for temaet '${contextTheme}'.
Dersom ei liste med scener for forteljinga er oppgitt, skal du identifisere kva 'sceneNumber' i lista som semantisk best svarer til dette uttrykket.
Døme:
- Tema: 'Den bortkomne sonen', uttrykk: 'Mata grisene' -> matchedSceneNumber: 6 (eller der han passar grisene)
- Uttrykk: 'Da kom han til seg selv' -> matchedSceneNumber: 7 (anger i grisebingen)
- Uttrykk: 'Faren spring imot' -> matchedSceneNumber: 10
- Uttrykk: 'Omfamning og tilgjeving' -> matchedSceneNumber: 11
- Uttrykk: 'Festen' -> matchedSceneNumber: 12
Generer også eit presist engelsk søkeuttrykk (2-5 ord) i englishQuery.`;

    const scenesPrompt = Array.isArray(scenes) && scenes.length > 0
      ? `\nSCENER I SERIEN:\n${scenes.map((s: any) => `Scene ${s.sceneNumber}: "${s.title}" - ${s.englishDescription || ''}`).join('\n')}`
      : '';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        text: `Tema: ${contextTheme}\nStil: ${artStyle}\nNorsk uttrykk / scene: "${query}"${scenesPrompt}\nFinn presist engelsk søkemotiv og evt matching sceneNumber.`
      }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            englishQuery: { type: Type.STRING, description: 'Engelsk konkret visuelt søkeord' },
            matchedSceneNumber: { type: Type.INTEGER, description: 'Scenenummer i serien dersom det matcher ei scene, elles null' },
            bibleBook: { type: Type.STRING },
            bibleChapter: { type: Type.STRING },
          },
          required: ['englishQuery'],
        },
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json({
      success: true,
      englishQuery: parsed.englishQuery || query,
      matchedSceneNumber: typeof parsed.matchedSceneNumber === 'number' ? parsed.matchedSceneNumber : null,
      bibleBook: parsed.bibleBook,
      bibleChapter: parsed.bibleChapter,
    });
  } catch (err: any) {
    console.warn('[ImageTranslate API] Feil:', err?.message);
    return res.json({ success: false, fallback: true, englishQuery: req.body.query || '', matchedSceneNumber: null });
  }
});

// =========================================================================
// 1.6 BILDEBIBELEN: KI-GENERATOR MED TEIKNESERIESCENER OG NORSK LEIARMANUS
// =========================================================================

app.post('/api/bildebibelen/fetch-story', async (req, res) => {
  try {
    const rawQuery = (req.body.storyQuery || req.body.query || '').trim();
    console.log('[BildeBibelen API] Hentar serie for:', rawQuery);

    if (!rawQuery) {
      return res.status(400).json({ success: false, message: 'Ingen søkefrase eller URL oppgitt' });
    }

    let targetUrl = '';
    let storyTitle = rawQuery;

    // A) Dersom brukaren limte inn ei direkte lenke til freebibleimages.org
    if (/freebibleimages\.org\/illustrations\//i.test(rawQuery)) {
      targetUrl = rawQuery.split('?')[0];
    } else {
      // B) Smart mapping for kjende bibelforteljingar til FreeBibleImages sine slugs
      const qLower = rawQuery.toLowerCase();
      let slug = '';
      
      if (/bortkomn|to søn|to brød|arv/i.test(qLower)) {
        slug = 'parable-two-sons';
        storyTitle = 'Den bortkomne sonen (Lukas 15)';
      } else if (/noa|ark/i.test(qLower)) {
        slug = 'noahs-ark';
        storyTitle = 'Noas ark (1. Mosebok 6–9)';
      } else if (/samaritan/i.test(qLower)) {
        slug = 'good-samaritan';
        storyTitle = 'Den gode samaritanen (Lukas 10)';
      } else if (/sakaus|sakkaus/i.test(qLower)) {
        slug = 'zacchaeus-tree';
        storyTitle = 'Sakkaus (Lukas 19)';
      } else if (/jona|storfisk|kval/i.test(qLower)) {
        slug = 'jonah-big-fish';
        storyTitle = 'Jona og storfisken (Jona 1–4)';
      } else if (/david.*goliat/i.test(qLower)) {
        slug = 'david-goliath';
        storyTitle = 'David og Goliat (1. Sam 17)';
      }

      if (slug) {
        targetUrl = `https://www.freebibleimages.org/illustrations/${slug}/`;
      } else {
        // C) Dynamisk søk mot FreeBibleImages via engelsk omsetjing frå Gemini
        let searchKeyword = rawQuery;
        if (apiKey) {
          try {
            const trResp = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [{ text: `Omsett denne bibelforteljinga til 2-3 enkle engelske søkeord for FreeBibleImages: "${rawQuery}". Svar berre med dei engelske orda.` }],
              config: { temperature: 0.1 }
            });
            searchKeyword = trResp.text?.trim() || rawQuery;
          } catch {}
        }

        const searchUrl = `https://www.freebibleimages.org/search/?s=${encodeURIComponent(searchKeyword)}`;
        const sRes = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (sRes.ok) {
          const sHtml = await sRes.text();
          // Finn data-stories attributt frå FreeBibleImages søkeresultat
          const storyMatch = sHtml.match(/data-stories="([^"]+)"/);
          if (storyMatch) {
            try {
              const decoded = JSON.parse(Buffer.from(storyMatch[1], 'base64').toString('utf-8'));
              // Finn Sweet Publishing eller første illustrasjons-serie
              const chosen = decoded.find((item: any[]) => item[2] === 'illustrations' && /Sweet/i.test(item[6])) || decoded[0];
              if (chosen && chosen[3]) {
                targetUrl = `https://www.freebibleimages.org/illustrations/${chosen[3]}/`;
                storyTitle = chosen[0] || rawQuery;
              }
            } catch {}
          }
        }
      }
    }

    if (!targetUrl) {
      targetUrl = 'https://www.freebibleimages.org/illustrations/parable-two-sons/';
    }

    console.log('[BildeBibelen API] Hentar HTML frå:', targetUrl);
    const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!pageRes.ok) throw new Error(`Kunne ikkje hente sida: ${pageRes.statusText}`);
    const html = await pageRes.text();

    // Hent ut alle slides med bilde-URL og den offisielle engelske teksten
    const slideMatches = [...html.matchAll(/<a href="([^"]+)"[^>]*data-slideshow-caption="([^"]+)"/g)];
    const rawSlides: Array<{ sceneNumber: number; imageUrl: string; englishCaption: string }> = [];

    for (let i = 0; i < slideMatches.length; i++) {
      const imgUrl = slideMatches[i][1];
      let caption = slideMatches[i][2]
        .replace(/&ndash;/g, '-')
        .replace(/&mdash;/g, '-')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();

      // Dropp lisens-/avslutningsslide dersom den berre heiter "Slide X"
      if (/^Slide\s+\d+$/i.test(caption)) continue;

      rawSlides.push({
        sceneNumber: rawSlides.length + 1,
        imageUrl: imgUrl,
        englishCaption: caption,
      });
    }

    if (rawSlides.length === 0) {
      throw new Error('Fann ingen teikneserieruter på sida');
    }

    console.log(`[BildeBibelen API] Fann ${rawSlides.length} ruter med engelsk biletetekst. Omset til norske stikkord...`);

    // La Gemini omsetje dei offisielle biletetekstane direkte til stikkord på vald målform
    const rawLang = req.body.lang || req.body.language || 'nn';
    const language: 'nn' | 'nb' = rawLang === 'nb' ? 'nb' : 'nn';
    const langLabel = language === 'nb' ? 'bokmål' : 'nynorsk';
    let translatedNotes: Array<{ sceneNumber: number; leaderNotes: string }> = [];

    if (apiKey) {
      try {
        const inputList = rawSlides.map(s => `Rute ${s.sceneNumber}: "${s.englishCaption}"`).join('\n');
        const prompt = `Her er dei offisielle engelske biletetekstane for kvar rute i teikneserien frå FreeBibleImages:

${inputList}

OPPGÅVE:
Omsett og omarbeid kvar biletetekst til KORTE, SLÅANDE STIKKORD PÅ 100 % KONSEKVENT ${langLabel.toUpperCase()} for leiaren som snakkar til ungdommane medan biletet visest på storskjerm.

${getLanguageInstruction(language)}

STRENGE KRAV:
1. SPRÅK: 100 % konsekvent og god ${langLabel} tilpassa ungdommane.
2. FORMAT: Ikkje lange avsnitt! Kvar rute skal ha 2–3 korte stikkord adskilt med kulepunkt (" • ") eller linjeskift.
3. KONSIST: Maks 12–18 ord totalt per rute. Færre ord er betre!`;

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ text: prompt }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sceneNumber: { type: Type.INTEGER },
                  leaderNotes: { type: Type.STRING },
                },
                required: ['sceneNumber', 'leaderNotes'],
              },
            },
            temperature: 0.2,
          },
        });

        const parsed = JSON.parse(geminiRes.text?.trim() || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          translatedNotes = parsed;
        }
      } catch (err: any) {
        console.warn('[BildeBibelen API] KI-omsetjing feila, brukar enkel fallback:', err?.message);
      }
    }

    // Sett saman ferdige scener med perfekt samsvar mellom bilde og manus
    const finalScenes = rawSlides.map((s, idx) => {
      const tr = translatedNotes.find(t => t.sceneNumber === s.sceneNumber) || translatedNotes[idx];
      return {
        id: `bbs_${Date.now()}_${idx + 1}`,
        sceneNumber: s.sceneNumber,
        imageUrl: s.imageUrl,
        leaderNotes: tr?.leaderNotes || s.englishCaption,
      };
    });

    return res.json({
      success: true,
      title: storyTitle,
      storyQuery: rawQuery,
      scenes: finalScenes,
    });
  } catch (err: any) {
    console.error('[BildeBibelen API] Feil:', err?.message);
    return res.status(200).json({ success: false, fallback: true, message: err?.message });
  }
});

// =========================================================================
// 1.7 KIMS LEIK GENERATOR (16/12/20 TEMATISKE GJENSTANDAR MED EMOJI)
// =========================================================================

app.post('/api/kims-leik/generate', async (req, res) => {
  try {
    const { prompt = '', count = 16 } = req.body;
    console.log('[KimsLeik API] Generating items for prompt:', prompt, 'count:', count);

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'Ingen GEMINI_API_KEY konfigurert på server',
      });
    }

    const systemInstruction = `Du er ein leir- og trusopplæringsassistent for Den norske kyrkja.
Di oppgåve er å generere nøyaktig ${count} unike, konkrete og tematiske gjenstandar for Kims leik om temaet "${prompt}".
Krav:
- Kvar gjenstand MÅ ha eit kort norsk/nynorsk namn ("name", 1-2 ord)
- Kvar gjenstand MÅ ha ein gyldig, offisiell Unicode-emoji ("emoji") som representerer tingen
- Alle ${count} gjenstandar i lista MÅ vere ulike (ingen duplikat!)`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ text: `Generer ${count} unike gjenstandar med emoji for temaet "${prompt}".` }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  emoji: { type: Type.STRING },
                },
                required: ['name', 'emoji'],
              },
            },
          },
          required: ['items'],
        },
        temperature: 0.4,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return res.json({ success: true, items });
  } catch (err: any) {
    console.warn('[KimsLeik API] Feil ved generering:', err?.message);
    return res.status(200).json({ success: false, fallback: true, message: err?.message });
  }
});

// Reinser blokk-titlar for administrative prefiks ("Utdjuping:", "Bolk 1:", etc.) og hakeparentesar [ ... ]
function cleanBlockTitle(rawTitle: string, blockType?: string, language: 'nn' | 'nb' = 'nn'): string {
  const normType = blockType ? normalizeBlockType(blockType) : '';
  const isNb = language === 'nb';

  // Reine aktivitetsblokker skal ha rein og diskret tittel på storskjermen (bevar evt. rundenummer som "Bilete-avdekking 1", "Bilete-avdekking 2")
  if (normType === 'bilete_avdekking') {
    const roundMatch = String(rawTitle || '').match(/(?:avdekking|runde|biletgåte|bildegåte)\s*(\d+)\b/i) || String(rawTitle || '').match(/^[^0-9]*\b([1-5])\s*$/);
    const suffix = roundMatch ? ` ${roundMatch[1]}` : '';
    return (isNb ? 'Bildeavdekking' : 'Bilete-avdekking') + suffix;
  }
  if (normType === 'kven_skal_ut') return isNb ? 'Hvem skal ut?' : 'Kven skal ut?';
  if (normType === 'henteleik') return isNb ? 'Henteleken' : 'Henteleiken';
  if (normType === 'kims_leik') return isNb ? 'Kims lek' : 'Kims leik';
  if (normType === 'reis_deg') return 'Reis deg';
  if (normType === 'svart_skjerm') return 'Svart skjerm';

  let t = String(rawTitle || '').trim();

  // Fjern hakeparentesar som [Undervisning], [Bolk 1], [10 min] osv.
  t = t.replace(/\[[^\]]*\]/g, '').trim();

  // Fjern gjentakande administrative prefiks (t.d. "Bolk 1: Utdjuping: Alltid ein plass til deg")
  const prefixRegex = /^(?:bolk\s*\d*|del\s*\d*|punkt\s*\d*|utdjuping|utdyping|undervisning|tema|oppsummering|innleiing|innledning|oppstart|avslutning|aktivitet|konkurranse|isbrytar|isbryter|forteljing|fortelling|refleksjon|samtale|bibelord|bibeltekst|bøn|bønn|song\s*\/\s*salme|sang\s*\/\s*salme|song|salme|sang|bilete|bilde|video|informasjon|stikkord|tekst)\s*[:–—-]\s*/i;
  let prev = '';
  while (t && t !== prev && prefixRegex.test(t)) {
    prev = t;
    t = t.replace(prefixRegex, '').trim();
  }

  // Fjern ytre gåsaugo eller hermeteikn dersom heile tittelen er pakka inn i dei
  t = t.replace(/^«([^»]+)»$/, '$1').replace(/^"([^"]+)"$/, '$1').trim();

  if (!t) {
    if (normType === 'bonn_dikt') return isNb ? 'Bønn' : 'Bøn';
    if (normType === 'samtale') return 'Samtale';
    if (normType === 'bibelord') return 'Bibelord';
    if (normType === 'informasjon') return 'Praktisk informasjon';
    if (normType === 'sang_salme') return isNb ? 'Sang / Salme' : 'Song / Salme';
    if (normType === 'reis_deg') return 'Reis deg';
    if (normType === 'beat_for_beat') return 'Beat for beat';
    if (normType === 'ord_for_ord') return 'Ord for ord';
    if (normType === 'quiz') return 'Quiz';
    if (normType === 'bilete') return isNb ? 'Bilde' : 'Bilete';
    if (normType === 'lysbileteshow') return isNb ? 'Lysbildeshow' : 'Lysbileteshow';
    if (normType === 'bildebibelen') return 'BildeBibelen';
    if (normType === 'video') return 'Video';
    return isNb ? 'Hovedbudskap' : 'Hovudbodskap';
  }

  return t;
}

// Sikrar at fiktive '/cached-images/...'-stiar eller ugyldige biletlenker ALDRI slepp gjennom
function sanitizeImageUrl(rawUrl: any): string {
  const s = String(rawUrl || '').trim();
  if (!s) return '';
  if (s.startsWith('/cached-images/')) {
    const filename = path.basename(s);
    const fullPath = path.join(CACHE_DIR, filename);
    if (fs.existsSync(fullPath)) {
      return `/cached-images/${filename}`;
    }
    return '';
  }
  if (/^https?:\/\/(images\.unsplash\.com|cdn\.pixabay\.com|pixabay\.com|www\.freebibleimages\.org|upload\.wikimedia\.org)\//i.test(s)) {
    return s;
  }
  if (/^https?:\/\/[^\s"'<>]+\.(jpe?g|png|webp|gif)(\?[^\s"'<>]*)?$/i.test(s)) {
    return s;
  }
  if (s.startsWith('data:image/')) {
    return s;
  }
  return '';
}

// Tvingar tidsestimat (durationMinutes) inn i realistiske rammer per kloss-type
function clampRealisticBlockDuration(blockType: string, rawDuration?: any, questionCount?: number): number {
  const norm = normalizeBlockType(blockType || 'stikkord');
  const num = typeof rawDuration === 'number' && !Number.isNaN(rawDuration) ? Math.round(rawDuration) : undefined;

  switch (norm) {
    case 'svart_skjerm':
      return 0;
    case 'bilete_avdekking':
      // 1.5 - 2 min per kloss (ALDRI 8 minutt for éin kloss!)
      return 2;
    case 'kims_leik':
    case 'henteleik':
      // 2 - 3 min
      return num !== undefined && num >= 2 && num <= 3 ? num : 3;
    case 'reis_deg':
    case 'kven_skal_ut':
      // 2 - 4 min
      return num !== undefined && num >= 2 && num <= 4 ? num : 3;
    case 'quiz': {
      // 1 - 1.5 min per spørsmål (maks 4-6 min for 3-4 spørsmål)
      if (typeof questionCount === 'number' && questionCount > 0) {
        return Math.min(6, Math.max(2, Math.round(questionCount * 1.3)));
      }
      return num !== undefined && num >= 2 && num <= 6 ? num : 4;
    }
    case 'stikkord':
    case 'tekst':
    case 'undervisning':
      // 2 - 4 min
      return num !== undefined && num >= 2 && num <= 4 ? num : 3;
    case 'samtale':
      // 5 - 8 min
      return num !== undefined && num >= 5 && num <= 8 ? num : 6;
    case 'bonn_dikt':
    case 'bibelord':
    case 'informasjon':
      // 1 - 2 min
      return num !== undefined && num >= 1 && num <= 2 ? num : 2;
    case 'sang_salme':
    case 'bilete':
    case 'bilde':
    case 'lysbileteshow':
    case 'beat_for_beat':
    case 'ord_for_ord':
      return num !== undefined && num >= 2 && num <= 5 ? num : 3;
    case 'video':
    case 'bildebibelen':
      return num !== undefined && num >= 3 && num <= 7 ? num : 4;
    default:
      return num !== undefined && num >= 1 && num <= 6 ? num : 3;
  }
}

// Dersom AI har slått saman fleire runder med bilete_avdekking i éi enkelt blokk i storyboardet,
// splittar denne funksjonen dei opp til separate, sjølvstendige 'bilete_avdekking'-klossar (2 min kvar).
function expandMultiRoundBileteAvdekkingSections(rawSections: any[], promptText: string, language: 'nn' | 'nb' = 'nn'): any[] {
  if (!Array.isArray(rawSections) || rawSections.length === 0) return [];
  const isNb = language === 'nb';
  const baseTitle = isNb ? 'Bilde-avdekking' : 'Bilete-avdekking';

  const existingAvdekkingCount = rawSections.filter(
    (s: any) => normalizeBlockType(s?.blockType || '') === 'bilete_avdekking'
  ).length;

  const result: any[] = [];
  let avdekkingIndex = 0;

  for (let i = 0; i < rawSections.length; i++) {
    const sec = rawSections[i];
    const normType = normalizeBlockType(sec?.blockType || '');
    if (normType !== 'bilete_avdekking') {
      result.push(sec);
      continue;
    }

    avdekkingIndex++;
    const combinedText = `${sec.title || ''} ${sec.bigScreenSummary || ''} ${sec.leaderScript || ''} ${existingAvdekkingCount === 1 ? promptText : ''}`;

    // Sjekk om brukaren eller seksjonen nemner fleire runder (t.d. "tre bileteavdekkingar", "3 bilete", eller liste i parentes "t.d. ring, hjarte, pengesetel")
    const requestedRoundsMatch = combinedText.match(/\b(2|3|4|to|tre|fire)\s+(?:ulike\s+|forskjellige\s+|raske\s+)?(?:rundar\s+med\s+|runder\s+med\s+)?(?:bilete?-?avdekking(?:ar|er)?|bilde-?avdekking(?:er)?|biletgåter|bildegåter|bilete|bilder)\b/i);
    const numMap: Record<string, number> = { '2': 2, 'to': 2, '3': 3, 'tre': 3, '4': 4, 'fire': 4 };
    const requestedRoundCount = requestedRoundsMatch ? (numMap[requestedRoundsMatch[1].toLowerCase()] || 1) : 1;

    // Prøv å hente ut opplista motiv frå parentes eller nummerert liste, t.d. "(t.d. ring, hjarte, pengesetel)" eller "1. ... 2. ... 3. ..."
    const extractedMotifs: string[] = [];
    const parenMatch = combinedText.match(/\(\s*(?:t\.d\.|f\.eks\.|for eksempel|til dømes)?\s*([^)]{4,80})\)/i);
    if (parenMatch && parenMatch[1].includes(',')) {
      const parts = parenMatch[1]
        .split(/\s*(?:,|og|eller|\/)\s*/i)
        .map(p => p.replace(/^(?:ein|ei|et|ett|en)\s+/i, '').trim())
        .filter(p => p.length >= 2 && p.length <= 30);
      if (parts.length >= 2) {
        extractedMotifs.push(...parts);
      }
    }

    if (existingAvdekkingCount === 1 && (extractedMotifs.length >= 2 || requestedRoundCount >= 2)) {
      const totalRounds = Math.max(extractedMotifs.length, requestedRoundCount);
      for (let mIdx = 0; mIdx < totalRounds; mIdx++) {
        const rawMotif = extractedMotifs[mIdx] || `${isNb ? 'Motiv' : 'Motiv'} ${mIdx + 1}`;
        const capMotif = rawMotif.charAt(0).toUpperCase() + rawMotif.slice(1);
        result.push({
          ...sec,
          id: `sec_${Date.now()}_${i + 1}_${mIdx + 1}`,
          blockType: 'bilete_avdekking',
          title: `${baseTitle} ${mIdx + 1}`,
          durationMinutes: 2,
          bigScreenSummary: isNb
            ? `100 brikker skjuler motivet: ${capMotif}. Ungdommene gjetter hva som kommer fram.`
            : `100 brikker skjuler motivet: ${capMotif}. Ungdommane gjettar kva som kjem fram.`,
          leaderScript: isNb
            ? `Fasit: ${capMotif}. Runde ${mIdx + 1} av bilde-avdekking! Rop ut så snart dere ser hva som skjuler seg bak rutene.`
            : `Fasit: ${capMotif}. Runde ${mIdx + 1} av bilete-avdekking! Rop ut så snart de ser kva som skjuler seg bak rutene.`,
        });
      }
    } else {
      const roundTitle = existingAvdekkingCount > 1 ? `${baseTitle} ${avdekkingIndex}` : (sec.title || baseTitle);
      result.push({
        ...sec,
        blockType: 'bilete_avdekking',
        title: roundTitle,
        durationMinutes: 2,
      });
    }
  }

  return result;
}

function cleanCoreMessage(raw: string, language: 'nn' | 'nb' = 'nn'): string {
  const fallback = language === 'nb'
    ? 'Gud møter oss alltid med åpne armer, tilgivelse og kjærlighet uansett hva vi har gjort.'
    : 'Gud møter oss alltid med opne armar, tilgjeving og kjærleik uansett kva vi har gjort.';
  let s = String(raw || '').trim().replace(/^«([^»]+)»$/, '$1').replace(/^"([^"]+)"$/, '$1').trim();
  if (!s) return fallback;

  // Hald berre første setning dersom AI skreiv fleire setningar
  const firstSentenceMatch = s.match(/^[^.!?]+[.!?]?/);
  if (firstSentenceMatch && firstSentenceMatch[0].trim().length > 5) {
    s = firstSentenceMatch[0].trim();
  }

  // Kutt til maks 20 ord dersom setninga er for lang
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 20) {
    s = words.slice(0, 19).join(' ').replace(/[,;–—-]+$/, '') + '.';
  } else if (!/[.!?]$/.test(s)) {
    s = `${s}.`;
  }
  return s;
}

// Sikrar at klossen 'samtale' ALLTID vert vald (aldri 'tekst' eller 'stikkord') når storyboardet eller brukaren ber om samtale, diskusjon i grupper eller to-og-to-spørsmål
function resolveSectionBlockType(rawType: string, title?: string, bigScreenSummary?: string, leaderScript?: string): string {
  const norm = normalizeBlockType(rawType || 'stikkord');
  if (norm === 'tekst' || norm === 'stikkord' || norm === 'undervisning') {
    const titleAndSummary = `${title || ''} ${bigScreenSummary || ''}`.toLowerCase();
    const fullContext = `${titleAndSummary} ${leaderScript || ''}`.toLowerCase();
    const questionMarkCount = (fullContext.match(/\?/g) || []).length;
    const summaryQuestionMarkCount = (titleAndSummary.match(/\?/g) || []).length;

    const hasSamtaleKeywordInTitleOrSummary =
      /\b(samtale|samtalespørsmål|refleksjon|refleksjonsspørsmål|spørsmål|diskusjon|drøfting|gruppesamtale|smågrupper|to-og-to|to\s+og\s+to|snakk\s+saman|snakk\s+sammen|snakke\s+saman|snakke\s+sammen|summe\s+saman|summe\s+sammen|parvis|diskuter\s+i\s+grupper)\b/i.test(titleAndSummary);

    const hasSamtaleKeywordInFullContext =
      /\b(samtale|samtalespørsmål|refleksjonsspørsmål|diskusjon\s+i\s+grupper|drøfting|to-og-to|to\s+og\s+to|smågrupper|gruppesamtale|snakk\s+saman|snakk\s+sammen|snakke\s+saman|snakke\s+sammen)\b/i.test(fullContext);

    if (
      hasSamtaleKeywordInTitleOrSummary ||
      (norm === 'tekst' && (hasSamtaleKeywordInFullContext || questionMarkCount >= 2)) ||
      summaryQuestionMarkCount >= 2
    ) {
      return 'samtale';
    }
  }
  return norm;
}

function resolveCorrectOption(q: any, options: string[]): 'A' | 'B' | 'C' | 'D' {
  if (!q || typeof q !== 'object') return 'B';

  // 1. Viss feltet er ein bokstav A, B, C eller D:
  const rawLetter = (q.correctOption || q.correctLetter || q.correctAnswer || q.answer || '').toString().trim().toUpperCase();
  if (['A', 'B', 'C', 'D'].includes(rawLetter)) return rawLetter as any;

  // Sjekk også om strengen er t.d. "ALTERNATIV B", "B)", "B." osv.
  const letterPrefixMatch = rawLetter.match(/^(?:ALTERNATIV\s+|VAL\s+|SVAR\s+)?([A-D])(?:[).:\-\s]|$)/);
  if (letterPrefixMatch && ['A', 'B', 'C', 'D'].includes(letterPrefixMatch[1]) && rawLetter.length <= 15) {
    return letterPrefixMatch[1] as 'A' | 'B' | 'C' | 'D';
  }

  // 2. Viss feltet er eit indeks-tal (0=A, 1=B, 2=C, 3=D):
  const rawIdx = q.correctIndex ?? q.answerIndex ?? q.correctAnswerIndex;
  if (typeof rawIdx === 'number' && rawIdx >= 0 && rawIdx <= 3) {
    return ['A', 'B', 'C', 'D'][rawIdx] as any;
  }

  // 3. Viss Gemini returnerte heile svarteksten i staden for ein bokstav:
  const answerTextCandidate = typeof q.correctAnswer === 'string' && q.correctAnswer.trim()
    ? q.correctAnswer.trim()
    : typeof q.answer === 'string' && q.answer.trim()
    ? q.answer.trim()
    : typeof q.correctOption === 'string' && q.correctOption.trim()
    ? q.correctOption.trim()
    : '';

  if (answerTextCandidate && options?.length) {
    const cleanCand = answerTextCandidate.replace(/^[A-D][).:\-\s]+/i, '').trim().toLowerCase();
    const matchIdx = options.findIndex(opt => {
      const cleanOpt = (opt || '').replace(/^[A-D][).:\-\s]+/i, '').trim().toLowerCase();
      return (
        opt.trim().toLowerCase() === answerTextCandidate.toLowerCase() ||
        cleanOpt === cleanCand ||
        (cleanCand.length > 2 && cleanOpt.includes(cleanCand)) ||
        (cleanOpt.length > 2 && cleanCand.includes(cleanOpt))
      );
    });
    if (matchIdx >= 0 && matchIdx <= 3) {
      return ['A', 'B', 'C', 'D'][matchIdx] as any;
    }
  }

  // 4. Viss ingenting matcher, logg ein åtvaring og vel 'B' som reserve framfor alltid 'A'
  console.warn('[Quiz] Kunne ikkje fastslå correctOption for spørsmål, vel reserve B:', {
    question: q.question,
    correctOption: q.correctOption,
    correctAnswer: q.correctAnswer,
    correctIndex: q.correctIndex,
  });
  return 'B';
}

function normalizeQuizQuestions(rawQuestions: any[], themeContext: string = ''): any[] {
  const stripOptionPrefix = (val: any): string =>
    String(val || '')
      .trim()
      .replace(/^(?:alternativ\s+)?[A-D][).:\-\s]+/i, '')
      .trim();

  const normalized = (Array.isArray(rawQuestions) ? rawQuestions : []).map((q: any, idx: number) => {
    const rawOpts = Array.isArray(q?.options) && q.options.length > 0
      ? q.options.map((o: any) => stripOptionPrefix(o))
      : [];

    const optA = stripOptionPrefix(q?.optionA) || rawOpts[0] || 'Alternativ A';
    const optB = stripOptionPrefix(q?.optionB) || rawOpts[1] || 'Alternativ B';
    const optC = stripOptionPrefix(q?.optionC) || rawOpts[2] || 'Alternativ C';
    const optD = stripOptionPrefix(q?.optionD) || rawOpts[3] || 'Alternativ D';
    const optionsList = [optA, optB, optC, optD];

    const correctOpt = resolveCorrectOption(q, optionsList);
    const winningText = { A: optA, B: optB, C: optC, D: optD }[correctOpt];

    let expl = String(q?.explanation || q?.forklaring || q?.rationale || '').trim();
    const isForbiddenExplanation = !expl || /^alternativ\s+[a-d]\s+er\s+rett\s+svar\.?$/i.test(expl);
    if (isForbiddenExplanation) {
      expl = `«${winningText}» er det rette svaret på spørsmålet${themeContext ? ` i arbeidet med ${themeContext}` : ''}.`;
    }

    return {
      id: q?.id || `q_${Date.now()}_${idx + 1}`,
      question: String(q?.question || `Spørsmål ${idx + 1}`).trim(),
      options: [optA, optB, optC, optD],
      optionA: optA,
      optionB: optB,
      optionC: optC,
      optionD: optD,
      correctOption: correctOpt,
      explanation: expl,
    };
  });

  // Sørg for fasit-variasjon: Aldri same bokstav på meir enn to spørsmål på rad!
  // Dersom 3 på rad har same bokstav, byter vi plass på det rette alternativet og eit anna alternativ
  // slik at det FAKTISK rette svaret følgjer med til den nye bokstaven.
  const letters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
  for (let i = 2; i < normalized.length; i++) {
    const prev2 = normalized[i - 2].correctOption;
    const prev1 = normalized[i - 1].correctOption;
    const curr = normalized[i].correctOption;
    if (curr === prev1 && curr === prev2) {
      const targetLetter = letters[(letters.indexOf(curr) + (i % 3) + 1) % 4];
      const item = normalized[i];
      const currKey = `option${curr}` as 'optionA' | 'optionB' | 'optionC' | 'optionD';
      const targetKey = `option${targetLetter}` as 'optionA' | 'optionB' | 'optionC' | 'optionD';

      const tempText = item[currKey];
      item[currKey] = item[targetKey];
      item[targetKey] = tempText;
      item.options = [item.optionA, item.optionB, item.optionC, item.optionD];
      item.correctOption = targetLetter;
    }
  }

  return normalized;
}

function resolveLanguageFromRequest(explicitLang?: string, textHint?: string): 'nn' | 'nb' {
  if (textHint) {
    if (/\b(omsett\s+til\s+bokmål|oversett\s+til\s+bokmål|skriv\s+på\s+bokmål|på\s+bokmål|målform:\s*bokmål|bruk\s+bokmål)\b/i.test(textHint)) {
      return 'nb';
    }
    if (/\b(omsett\s+til\s+nynorsk|oversett\s+til\s+nynorsk|skriv\s+på\s+nynorsk|på\s+nynorsk|målform:\s*nynorsk|bruk\s+nynorsk)\b/i.test(textHint)) {
      return 'nn';
    }
  }
  return explicitLang === 'nb' ? 'nb' : 'nn';
}

function getLanguageInstruction(language: 'nn' | 'nb' = 'nn'): string {
  if (language === 'nb') {
    return 'STRENGT KRAV TIL MÅLFORM: 100 % KONSEKVENT BOKMÅL. All generert tekst (titlar, storskjermtekst, spørsmål, svaralternativ, leiarmanus, teologisk bakgrunn, pedagogiske tips og kjernebodskap) SKAL vere på 100 % konsekvent, levande og varmt bokmål. Bruk ALDRI nynorske former (som ikkje, ein, ei, eit, korleis, kvifor, de/dykk, eller -ar/-ane-endingar). Bibelsitat SKAL siterast ordrett frå Det Norske Bibelselskap si Bibel 2024/2011 bokmål.';
  }
  return 'STRENGT KRAV TIL MÅLFORM: 100 % KONSEKVENT NYNORSK. All generert tekst (titlar, storskjermtekst, spørsmål, svaralternativ, leiarmanus, teologisk bakgrunn, pedagogiske tips og kjernebodskap) SKAL vere på 100 % konsekvent, god, varm og munnleg nynorsk. Bibelsitat SKAL siterast ordrett frå Det Norske Bibelselskap si Bibel 2024/2011 nynorsk.';
}

async function generateBlockPayload(params: {
  blockType: string;
  prompt: string;
  language?: 'nn' | 'nb';
  sessionTitle?: string;
  targetGroup?: string;
  leaderScriptFromStoryboard?: string;
  bigScreenSummary?: string;
  targetAudience?: string;
  layout?: string | number;
  artStyle?: string;
  count?: number;
  itemCount?: number;
  quizMode?: string;
  questionCount?: number;
  gridSize?: number;
  durationMinutes?: number;
}): Promise<any> {
  const blockType = resolveSectionBlockType(
    params.blockType || 'tekst',
    params.prompt,
    params.bigScreenSummary,
    params.leaderScriptFromStoryboard
  );
  const prompt = (params.prompt || '').trim();
  const language: 'nn' | 'nb' = resolveLanguageFromRequest(params.language, `${prompt} ${params.leaderScriptFromStoryboard || ''}`);
  const langLabel = language === 'nb' ? 'bokmål' : 'nynorsk';
  const targetGroup = params.targetGroup || (language === 'nb' ? 'Konfirmanter (14 år)' : 'Konfirmantar (14 år)');
  const targetAudience = params.targetAudience || '';
  const sessionTitle = (params.sessionTitle || '').trim();
  const leaderScriptFromStoryboard = (params.leaderScriptFromStoryboard || '').trim();
  const bigScreenSummary = (params.bigScreenSummary || '').trim();
  const resolvedQuestionCount = (typeof params.questionCount === 'number' && [3, 5, 8].includes(params.questionCount))
    ? params.questionCount
    : 5;
  const normalizedQuizMode = (params.quizMode === 'open') ? 'open' : 'multiple_choice';

  // Hurtigretur for svart_skjerm (treng ikkje AI-kall)
  if (blockType === 'svart_skjerm') {
    return {
      title: 'Svart skjerm',
      durationMinutes: typeof params.durationMinutes === 'number' ? params.durationMinutes : 0,
      notes: leaderScriptFromStoryboard,
      leaderNotes: leaderScriptFromStoryboard,
    };
  }

  console.log('[generateBlockPayload] Type:', blockType, 'lang:', language, 'prompt:', prompt, 'sessionTitle:', sessionTitle);

  const promptLower = `${prompt} ${bigScreenSummary}`.toLowerCase();
  const wordToNumMap: Record<string, number> = {
    'eitt': 1, 'ett': 1, '1': 1, 'ein': 1, 'en': 1,
    'to': 2, '2': 2,
    'tre': 3, '3': 3,
    'fire': 4, '4': 4,
    'fem': 5, '5': 5,
    'seks': 6, '6': 6,
    'sju': 7, 'syv': 7, '7': 7,
    'åtte': 8, '8': 8,
  };

  // Tolk ønsket tal på oppgåver for 'kven_skal_ut' (standard 3 oppgåver)
  let targetKvenCount = 3;
  const kvenNumMap: Record<string, number> = {
    'eitt': 1, 'ett': 1, '1': 1, 'ein': 1, 'en': 1,
    'to': 2, '2': 2,
    'tre': 3, '3': 3,
    'fire': 4, '4': 4,
    'fem': 5, '5': 5,
  };
  const kvenCountMatch = promptLower.match(/(\d+)\s*(oppgåver?|runder?|spørsmål)?/);
  if (kvenCountMatch) {
    const n = parseInt(kvenCountMatch[1], 10);
    if (n >= 1 && n <= 5) targetKvenCount = n;
  } else {
    for (const [token, val] of Object.entries(kvenNumMap)) {
      const regex = new RegExp(`(^|\\s|\\b)${token}(\\s*(oppgåver?|runder?|spørsmål)?)?(\\s|\\b|$)`, 'i');
      if (regex.test(promptLower)) {
        targetKvenCount = val;
        break;
      }
    }
  }

  // Tolk ønsket tal på punkt for 'stikkord' (3–5 punkt som standard)
  let targetStikkordCount = 4;
  for (const [token, val] of Object.entries(wordToNumMap)) {
    const regex = new RegExp(`(^|\\s|\\b)${token}\\s*(punkt|stikkord|kulepunkt|moment)(\\s|\\b|$)`, 'i');
    if (regex.test(promptLower)) {
      targetStikkordCount = Math.max(3, Math.min(5, val));
      break;
    }
  }

  // Tolk ønsket tal på samtalespørsmål for 'samtale' (1, 2, 3)
  let targetSamtaleQuestionCount: number | null = null;
  const numMatch = promptLower.match(/(\d+)\s*(spørsmål|samtalespørsmål|refleksjonsspørsmål)/);
  if (numMatch) {
    targetSamtaleQuestionCount = Math.max(1, Math.min(3, parseInt(numMatch[1], 10)));
  } else {
    for (const [token, val] of Object.entries(wordToNumMap)) {
      const regex = new RegExp(`(^|\\s|\\b)${token}\\s*(spørsmål|samtalespørsmål|refleksjonsspørsmål)(\\s|\\b|$)`, 'i');
      if (regex.test(promptLower)) {
        targetSamtaleQuestionCount = Math.max(1, Math.min(3, val));
        break;
      }
    }
  }

  // Tolk ønsket tal på gjenstandar for 'henteleik' (standard 6)
  let targetHenteleikCount = 6;
  const henteNumMap: Record<string, number> = {
    'tre': 3, 'fire': 4, 'fem': 5, 'seks': 6, 'sju': 7, 'syv': 7, 'åtte': 8, 'ni': 9, 'ti': 10,
  };
  const henteWithWordMatch = promptLower.match(/(\d+)\s*(?:gjenstand(?:ar|er)?|ting|oppdrag)\b/i);
  if (henteWithWordMatch) {
    const n = parseInt(henteWithWordMatch[1], 10);
    if (n >= 3 && n <= 10) targetHenteleikCount = n;
  } else {
    for (const [token, val] of Object.entries(henteNumMap)) {
      const regexWithWord = new RegExp(`\\b${token}\\s*(?:gjenstand(?:ar|er)?|ting|oppdrag)\\b`, 'i');
      if (regexWithWord.test(promptLower)) {
        targetHenteleikCount = val;
        break;
      }
    }
  }

  let rawResult: any = {};

  if (apiKey) {
    try {
      const contextLines = [
        `Samlingstema: '${sessionTitle || prompt}'.`,
        `Bolk/oppgåve: '${prompt}'.`,
        bigScreenSummary ? `Planlagt storskjerminnhald: '${bigScreenSummary}'.` : '',
        leaderScriptFromStoryboard ? `Planlagt leiarmanus frå storyboard: '${leaderScriptFromStoryboard}'.` : '',
      ].filter(Boolean).join('\n');

      const systemInstruction = `Du er ein pedagogisk og teologisk AI-assistent for Den norske kyrkja som skapar byggjesteinar for konfirmantar (14 år), leir og ungdomskveldar.
Di oppgåve er å generere ÉI ENKELTBLOKK av typen '${blockType}' for målgruppa '${targetGroup}'.
${contextLines}

${getLanguageInstruction(language)}

OVERORDNA REGLAR FOR TITTEL, LEIARMANUS, BILETE OG TIDSBRUK:
- TITTEL-REINSING: Bruk ALDRI administrative prefiks som «Utdjuping:», «Utdyping:», «Undervisning:», «Bolk 1:», «Tema:», «Oppsummering:» eller hakeparentesar [ ... ] i 'title'. Skriv berre sjølve tittelen på ${langLabel}.
- For reine aktivitetsblokker ('bilete_avdekking', 'kven_skal_ut', 'henteleik', 'kims_leik') skal 'title' alltid vere rein og diskret på ${langLabel} ('${language === 'nb' ? 'Bilde-avdekking' : 'Bilete-avdekking'}', '${language === 'nb' ? 'Hvem skal ut?' : 'Kven skal ut?'}', '${language === 'nb' ? 'Henteleken' : 'Henteleiken'}', '${language === 'nb' ? 'Kims lek' : 'Kims leik'}').
- KUTT UT AI-KLISJEAR – FOLKELEG OG ENKELT MANUS ('leaderNotes'): Skriv folkeleg og naturleg på 100 % konsekvent ${langLabel}, akkurat som ein ungdomsleiar som pratar i eit kyrkjerom. Ingen svulstige filosofiske spørsmål! Maks 2–3 korte setningar som utdjupar stikkorda eller introduserer aktiviteten.${leaderScriptFromStoryboard ? ` Ta vare på og flett inn leiarmanuset frå storyboardet på ${langLabel}: "${leaderScriptFromStoryboard}".` : ''}
- BILETLENKER: Dersom du ikkje har ei garantert gyldig biletlenke (Unsplash eller liknande), la 'imageUrl' vere tom streng (""). Sett ALDRI fiktive '/cached-images/...'-stiar!
- REALISTISK TIDSBRUK ('durationMinutes'):
  * 'bilete_avdekking': 2 min (1.5–2 min per kloss, ALDRI 8 minutt!)
  * 'kims_leik' / 'henteleik': 2–3 min
  * 'reis_deg' / 'kven_skal_ut': 2–4 min
  * 'quiz': 1–1.5 min per spørsmål (maks 4–6 min for 3–4 spørsmål)
  * 'stikkord' / kort undervisning: 2–4 min
  * 'samtale' i grupper: 5–8 min
  * 'bonn_dikt' / 'bibelord' / 'informasjon': 1–2 min

KRAV TIL KVAR ENKELT BLOKKTYPE OG RETTE FELTNAMN (14 ÅR / KONFIRMANTER):

1. 'stikkord':
   - Tittel ('title'): Rein tematisk tittel på ${langLabel} utan prefiks.
   - Fyll ALLTID ut BÅDE 'stikkord' (array med 3–4 konkrete, munnlege stikkord på 2–5 ord kvar) OG 'points' (3–4 punkt) skreddarsydd til temaet på ${langLabel}.
   - Kvart punkt i 'points' MÅ ha:
     * text: Kort, konkret munnleg stikkord for storskjerm på ${langLabel} (2–5 ord)
     * keyword: Same som text (2–5 ord)
     * note: Folkeleg og naturleg munnleg manus på ${langLabel} (maks 2–3 korte setningar) som utdjupar akkurat dette stikkordet, som ein ungdomsleiar som pratar i eit kyrkjerom. Ingen svulstige filosofiske spørsmål! ALDRI dupliser same tekst på fleire punkt!
     * leaderNotes: Same som note
   - STRENGT FORBOD mot generiske naud-tekstar som «Nåde utan vilkår» eller «Ny start».
   - leaderNotes (rot-nivå): Folkeleg, enkel og naturleg leiar-tekst på ${langLabel} (maks 2–3 korte setningar som utdjupar stikkorda).

2. 'tekst':
   - VIKTIG: 'tekst' skal KUN brukast til samanhengande bodskap, sitat eller kort forteljing – ALDRI til samtalespørsmål eller gruppediskusjon!
   - Tittel ('title'): Rein, fengande overskrift på ${langLabel} utan prefiks.
   - slideText: 2–3 sentrale, slåande setningar til storskjerm på ${langLabel} (unngå harde linjeskift midt i setningar, slik at teksten fyller storskjermen med stor, lesbar font).
   - content: Same som slideText.
   - text: Same som slideText.
   - leaderNotes: Kort, folkeleg munnleg leiarmanus på ${langLabel} (maks 2–3 korte, naturlege setningar).

3. 'bibelord':
   - KRAV TIL BIBELUTGÅVE: Teksten SKAL vere ordrett henta frå Det Norske Bibelselskap si offisielle ${langLabel}-omsetjing: primært Bibel 2024 (${langLabel}), subsidiært Bibel 2011 (${langLabel}). ${language === 'nb' ? 'Bruk 100 % bokmål i bibelteksten (aldri nynorsk!).' : 'Bruk 100 % nynorsk i bibelteksten.'}
   - KRYSTALLKLAR FELTDELING:
     * reference / scriptureRef / bibleRef: KUN bibeltilvising (t.d. "Lukas 15, 20" eller "Luk 15, 11–24").
     * verseText / bibleText / keyVerse: Ordrett bibeltekst på ${langLabel} frå 2024/2011 for STORSKJERM med gåsaugo rundt («...»). Må ALDRI vere tom eller innehalde leiar-notat.
     * explanation / leaderNotes / notes: Kort munnleg utdjuping og regi på ${langLabel} for LEIARVISING (2–3 setningar), ALDRI på storskjerm.

4. 'bilete':
   - Sett 'layout' til 1, 2 eller 4 (1 som standard med mindre 2 eller 4 er etterspurt).
   - Lag ein rein, kort tittel i 'title' utan prefiks.
   - For KVART bilete i oppsettet: Skap eit søkeobjekt i 'imageQueries' med:
     * slot: 'Slot 1', 'Slot 2' osv.
     * englishQuery: Omset abstrakte norske temaord til konkrete visuelle engelske fotomotiv (2–4 ord). Døme: "einsamheit / ensomhet" -> "lonely teenager sitting bench alone" eller "sad person window rain".
     * caption: SKAL VERE TOM STRENG ("") som standard.

5. 'lysbileteshow':
   - title: Rein tittel utan prefiks.
   - englishSearchQuery: Konkrete visuelle engelske søkeord for Pixabay (t.d. "mountains starry sky nature landscape").
   - interval: 4.
   - loop: true.

6. 'bilete_avdekking' (Kaos-puslespill – alltid éin sjølvstendig kloss per runde/bilete):
   - title: "${language === 'nb' ? 'Bilde-avdekking' : 'Bilete-avdekking'}".
   - durationMinutes: 2 (alltid 1.5–2 min per kloss, ALDRI 8 minutt!).
   - gridSize: 100 (alltid 100 som standard).
   - fasit / solution: Eitt konkret motiv/gjenstand på ${langLabel} knytt til denne runda (t.d. "Ein pengesetel" / "En pengeseddel", "Eit hjarte" / "Et hjerte", "Ei leirkrukke" / "En leirkrukke", "Ein gullring" / "En gullring"). Slå ALDRI saman fleire bilete i éin kloss!
   - englishSearchQuery: OBLIGATORISK! 2–4 spissa, engelske fototags for Pixabay som beskriver det konkrete, visuelle motivet til fasiten (t.d. fasit: "Ein pengesetel" -> englishSearchQuery: "banknote cash money", fasit: "Eit hjarte" -> englishSearchQuery: "red heart symbol", fasit: "Ei leirkrukke" -> englishSearchQuery: "ancient clay pottery jar").
   - imageUrl: Tom streng ("") med mindre du har ei garantert gyldig Unsplash-lenke. Sett ALDRI fiktive '/cached-images/...'-stiar!
   - leaderNotes: Skal KUN innehalde fasiten og det korte, folkelege munnlege leiarmanuset på ${langLabel} (2–3 korte setningar). INGEN liste med «hint»!
   - clue: Tom streng ("").
   - hints: Tom liste ([]).

7. 'kims_leik':
   - title: "${language === 'nb' ? 'Kims lek' : 'Kims leik'}".
   - countdownSeconds: 30, timerSeconds: 30, itemCount: 16.
   - Generer 16 unike, konkrete gjenstandar i 'kimsItems' med kort 'name' på ${langLabel} (1–2 ord) og 'emoji'.

8. 'video':
   - title: Rein video-tittel utan prefiks.
   - videoUrl: Tom streng ("").
   - leaderNotes: Kort munnleg leiarmanus på ${langLabel} + '«(${language === 'nb' ? 'Sett inn egen videolenke på arbeidsbordet' : 'Set inn eiga videolenke på arbeidsbordet'})»'.

9. 'bonn_dikt':
   - title: Rein tittel på ${langLabel} (t.d. "${language === 'nb' ? 'Bønn for kvelden' : 'Bøn for kvelden'}").
   - leaderNotes: Ei kort, munnleg innleiing FØR bøna på ${langLabel} (1–2 setningar, t.d. "${language === 'nb' ? 'La oss samle tankene våre og be sammen...' : 'La oss samle tankane våre og be saman...'}"). Skal ALDRI innehalde sjølve bønneteksten eller avsluttast med 'Amen.'!
   - text: KUN sjølve bønneteksten som visast på storskjerm: ei kort, varm, livsnær og ærleg bøn for 14-åringar på ${langLabel} (3–5 enkle linjer), avslutta med 'Amen.'

10. 'quiz':
    - Generer nøyaktig ${resolvedQuestionCount} unike spørsmål i 'quizQuestions'.
    - Kvar oppgåve SKAL ha:
      * question: Klart spørsmål på ${langLabel} retta mot 14-åringar.
      * options: Array med nøyaktig 4 alternativ [A, B, C, D] på ${langLabel} (fyll også ut optionA, optionB, optionC, optionD med dei same 4 alternativa).
      * correctOption: Nøyaktig éin bokstav: "A", "B", "C" eller "D" som peiker på det FAKTISK korrekte svaret i options-arrayen.
      * explanation: Ei kort, pedagogisk forklaring (1–2 setningar) på ${langLabel} om kvifor dette alternativet er rett.
    - FORBOD: Teksten "Alternativ X er rett svar" er STRENGT FORBODE som forklaring! Forklaringa skal alltid omtale det faktiske innhaldet.
    - FASIT-VARIASJON: Rett svar skal fordelast naturleg mellom A, B, C og D på tvers av dei ${resolvedQuestionCount} spørsmåla – det skal ALDRI vere same bokstav på meir enn to spørsmål på rad.

11. 'henteleik':
    - title: "${language === 'nb' ? 'Henteleken' : 'Henteleiken'}".
    - intro: "${language === 'nb' ? 'Finn fram det dere tror laget trenger!' : 'Finn fram det de trur laget treng!'}".
    - henteleikItems: Generer NØYAKTIG ${targetHenteleikCount} gjenstandar i 'henteleikItems' på ${langLabel}.
    - STRENGE KRAV FOR 14-ÅRINGAR:
      * Kvart punkt SKAL vere ultrakort: MAKS 1–2 ORD!
      * Gjenstandane må vere ting ungdommar faktisk har på seg eller i rommet.
      * Gode døme: "${language === 'nb' ? 'Rød genser", "En sko", "Noe rundt", "Briller", "Bibel", "Mynt", "Nøkkel", "Klokke' : 'Raud genser", "Ein sko", "Noko rundt", "Briller", "Bibel", "Mynt", "Nøkkel", "Klokke'}".
      * FORBOD mot setningar eller forklaringar over 2 ord!

12. 'reis_deg':
    - title: "Reis deg".
    - intro: "${language === 'nb' ? 'Reis deg hvis påstanden passer for deg, sitt ned hvis ikke!' : 'Reis deg dersom påstanden passar for deg, sit ned dersom ikkje!'}".
    - statements: 4–6 engasjerande påstandar på ${langLabel} tilpassa 14-åringar.
    - VIKTIG REGEL FOR PÅSTANDAR: I klossen 'Reis deg' skal ALLE påstandar ALLTID starte med 'hvis...' eller 'dersom...' med liten forbokstav etter innleiingsordet (til dømes 'hvis du elskar å game!' eller 'dersom du har vore vaken heile natta'), sidan overskrifta 'Reis deg' allereie står fast øvst på storskjermen. Skriv ALDRI 'Reis deg' eller nummerering først i sjølve påstanden!

13. 'beat_for_beat':
    - title: "Beat for beat".
    - category: Kategori (t.d. "Salme", "Lovsong").
    - solution: Full songtittel eller tekstlinje.
    - words: Løysinga oppdelt i einskildord.

14. 'ord_for_ord':
    - title: "Ord for ord".
    - quote: Kjend bibelvers på moderne ${langLabel} (Bibel 2024 / 2011 ${langLabel}).
    - reference: Bibelreferanse (t.d. "Johannes 3, 16").
    - hint: Kort hint på ${langLabel}.
    - words: Sitatet oppdelt i einskildord.

15. 'kven_skal_ut':
    - title: "${language === 'nb' ? 'Hvem skal ut?' : 'Kven skal ut?'}".
    - Generer NØYAKTIG ${targetKvenCount} oppgåver (3 som standard) i 'kvenSkalUtItems' på ${langLabel}.
    - Korte ord/omgrep (1–3 ord) på A, B, C og D. Sprei 'correctOption' mellom A, B, C og D.
    - explanation: Ultrakort, stikkordsmessig fasit for leiar på ${langLabel} (MAKS 6–8 ORD! T.d. "Fasit: D. A–C er gåver, D er straff.").

16. 'sang_salme':
    - title: Rein tittel på songen/salmen utan prefiks.
    - songNumber: Valfritt nummer.
    - verses: [].
    - songText: "".

17. 'samtale':
    - VIKTIG: Når storyboardet eller brukaren ber om samtale, diskusjon i grupper eller to-og-to-spørsmål, skal klossen 'samtale' ALLTID fyllast ut med 2 opne, engasjerande spørsmål i 'reflectionQuestions'-arrayen (ALDRI som flat brødtekst i 'text' eller 'slideText').
    - title: Rein tittel på ${langLabel} utan prefiks (t.d. "Samtale").
    - topic: Hovudtema for samtalen på ${langLabel}.
    - organization: "To-og-to" | "Smågrupper" | "Plenum".
    - reflectionQuestions: NØYAKTIG ${targetSamtaleQuestionCount || 2} opne, engasjerande og livsnære samtalespørsmål på ${langLabel} tilpassa målgruppa (maks 8–14 ord per spørsmål, avslutta med spørsmålsteikn '?').

18. 'informasjon':
    - heading: "Praktisk informasjon".
    - practicalPoints: Enkel og ryddig med 2–3 konkrete punkt på ${langLabel}:
      * "${language === 'nb' ? 'Husk neste samling [tid/sted]' : 'Hugs neste samling [tid/stad]'}"
      * "${language === 'nb' ? 'Kiosk og prat etter samlingen' : 'Kiosk og prat etter samlinga'}"
      * "Takk for i dag!"`;

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI generation timed out etter 18 sekund')), 18000);
      });

      const generatePromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          text: `Generer ein fullstendig utfylt '${blockType}'-blokk for temaet: "${prompt || sessionTitle}". Målgruppe: ${targetGroup}.${bigScreenSummary ? ` Storskjerm-oppsummering: "${bigScreenSummary}".` : ''}${leaderScriptFromStoryboard ? ` Leiarmanus frå storyboard: "${leaderScriptFromStoryboard}".` : ''}${blockType === 'stikkord' ? ` Generer ${targetStikkordCount} ferske punkt i 'points' der kvart punkt har sitt eige unike munnlege leiarmanus.` : ''}${blockType === 'henteleik' ? ` Generer ${targetHenteleikCount} ultrakorte gjenstandar (maks 1–2 ord per gjenstand) i 'henteleikItems'.` : ''} Sørg for alle naudsynte felt.`
        }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: singleBlockResponseSchema,
          temperature: 0.35,
        },
      });

      const response: any = await Promise.race([generatePromise, timeoutPromise]);
      const text = response.text?.trim() || '{}';
      try { rawResult = JSON.parse(text); } catch { rawResult = {}; }
    } catch (geminiErr: any) {
      console.warn('[generateBlockPayload] Gemini feila eller fekk timeout, nyttar tematisk struktur:', geminiErr?.message);
      rawResult = {};
    }
  }

  // =========================================================================
  // POST-PROSESSERING OG DATAKONTRAKTER PER BLOKKTYPE
  // =========================================================================

  // Sett realistisk varigheit basert på blokktype og eventuell verdi frå storyboard
  rawResult.durationMinutes = clampRealisticBlockDuration(
    blockType,
    typeof params.durationMinutes === 'number' && params.durationMinutes >= 0
      ? params.durationMinutes
      : rawResult.durationMinutes,
    resolvedQuestionCount
  );

  // Sikre at eventuelt imageUrl fra AI aldri har fiktiv '/cached-images/...'-sti
  if (rawResult.imageUrl) {
    rawResult.imageUrl = sanitizeImageUrl(rawResult.imageUrl);
  }

  // A. STIKKORD (3–4 konkrete, munnlege stikkord på 2–5 ord kvar + folkeleg manus i både 'stikkord' og 'points')
  if (blockType === 'stikkord' || blockType === 'undervisning') {
    rawResult.title = cleanBlockTitle(
      rawResult.title || prompt || sessionTitle || (language === 'nb' ? 'Hovedbudskap' : 'Hovudbodskap'),
      'stikkord',
      language
    );
    let pts = Array.isArray(rawResult.points) ? rawResult.points : [];
    if (pts.length === 0 && Array.isArray(rawResult.stikkordItems) && rawResult.stikkordItems.length > 0) {
      pts = rawResult.stikkordItems.map((it: any) => ({
        keyword: it.title || it.text || '',
        text: it.title || it.text || '',
        leaderNotes: it.detail || it.note || '',
        note: it.detail || it.note || '',
      }));
    }
    if (pts.length === 0 && Array.isArray(rawResult.stikkord) && rawResult.stikkord.length > 0) {
      pts = rawResult.stikkord.map((kw: any) => ({
        keyword: String(kw || '').trim(),
        text: String(kw || '').trim(),
        leaderNotes: '',
        note: '',
      }));
    }

    // Bygg dynamiske, tematiske punkt dersom AI ikkje leverte punkt (ALDRI hardkoda "Nåde utan vilkår / Ny start")
    const forbiddenGeneric = /^(nåde utan vilkår|nåde uten vilkår|ny start)$/i;
    pts = pts.filter((p: any) => {
      const kw = String(p?.text || p?.keyword || p?.title || '').trim();
      return kw.length > 0 && !forbiddenGeneric.test(kw);
    });

    if (pts.length === 0) {
      const cleanTheme = cleanBlockTitle(prompt || sessionTitle || 'Dagens tema', 'stikkord', language);
      const summarySentences = (bigScreenSummary || '')
        .split(/[.!?•\n]+/)
        .map(s => s.trim())
        .filter(s => s.length > 2);
      const scriptSentences = (leaderScriptFromStoryboard || '')
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 5);

      const fallbackKeywords = language === 'nb'
        ? [
            summarySentences[0] ? summarySentences[0].split(/\s+/).slice(0, 5).join(' ') : `Hva handler «${cleanTheme}» om?`,
            summarySentences[1] ? summarySentences[1].split(/\s+/).slice(0, 5).join(' ') : 'Rom for å være seg selv',
            summarySentences[2] ? summarySentences[2].split(/\s+/).slice(0, 5).join(' ') : 'Midt i vår egen hverdag',
          ]
        : [
            summarySentences[0] ? summarySentences[0].split(/\s+/).slice(0, 5).join(' ') : `Kva handlar «${cleanTheme}» om?`,
            summarySentences[1] ? summarySentences[1].split(/\s+/).slice(0, 5).join(' ') : 'Rom for å vere seg sjølv',
            summarySentences[2] ? summarySentences[2].split(/\s+/).slice(0, 5).join(' ') : 'Midt i vår eigen kvardag',
          ];
      const fallbackNotes = language === 'nb'
        ? [
            scriptSentences[0] || `Her ser vi hva «${cleanTheme}» egentlig handler om i praksis. Det møter oss akkurat der vi er i hverdagen.`,
            scriptSentences[1] || `I kirken trenger ingen å spille en rolle eller late som. Her er det plass til hele deg.`,
            scriptSentences[2] || `Ta med dere denne tanken videre når vi nå skal snakke sammen og dele tanker.`,
          ]
        : [
            scriptSentences[0] || `Her ser vi kva «${cleanTheme}» eigentleg handlar om i praksis. Det møter oss akkurat der vi er i kvardagen.`,
            scriptSentences[1] || `I kyrkja treng ingen å spele ei rolle eller late som. Her er det plass til heile deg.`,
            scriptSentences[2] || `Ta med dykk denne tanken vidare når vi no skal snakke saman og dele tankar.`,
          ];

      pts = fallbackKeywords.map((kw, i) => ({
        keyword: kw,
        text: kw,
        leaderNotes: fallbackNotes[i],
        note: fallbackNotes[i],
      }));
    }

    // Sørg for 3–4 konkrete, munnlege stikkord (2–5 ord kvar) og folkeleg leiarmanus (maks 2–3 korte setningar)
    const usedNotes = new Set<string>();
    rawResult.points = pts.slice(0, 4).map((p: any, idx: number) => {
      let titleText = cleanBlockTitle(p.text || p.keyword || p.title || `Punkt ${idx + 1}`, 'stikkord', language);
      const kwWords = titleText.split(/\s+/).filter(Boolean);
      if (kwWords.length > 6) {
        titleText = kwWords.slice(0, 5).join(' ').replace(/[,;:.!?–—-]+$/, '');
      }

      let noteText = String(p.note || p.leaderNotes || p.detail || '').trim();
      if (!noteText || usedNotes.has(noteText.toLowerCase())) {
        const angleDescriptions = language === 'nb'
          ? [
              `Her handler «${titleText}» rett og slett om hvordan vi møter hverandre på en vanlig hverdag. Vi trenger alle å vite at vi hører til.`,
              `Når vi snakker om «${titleText}», betyr det at du slipper å være perfekt for å være god nok.`,
              `Dette punktet minner oss om at Gud alltid står med åpne armer, uansett hva vi har gjort før.`,
              `Ta med dere «${titleText}» som en rød tråd inn i resten av samlingen i dag.`,
            ]
          : [
              `Her handlar «${titleText}» rett og slett om korleis vi møter kvarandre på ein vanleg kvardag. Vi treng alle å vite at vi høyrer til.`,
              `Når vi snakkar om «${titleText}», betyr det at du slepp å vere perfekt for å vere god nok.`,
              `Dette punktet minner oss om at Gud alltid står med opne armar, uansett kva vi har gjort før.`,
              `Ta med dykk «${titleText}» som ein raud tråd inn i resten av samlinga i dag.`,
            ];
        noteText = angleDescriptions[idx % angleDescriptions.length];
      }
      // Kutt eventuelle lange avhandlinger til maks 3 korte setningar
      const noteSentences = noteText.match(/[^.!?]+[.!?]+/g);
      if (noteSentences && noteSentences.length > 3) {
        noteText = noteSentences.slice(0, 3).join(' ').trim();
      }
      usedNotes.add(noteText.toLowerCase());

      return {
        id: p.id || `sp_${Date.now()}_${idx + 1}`,
        keyword: titleText,
        text: titleText,
        title: titleText,
        leaderNotes: noteText,
        note: noteText,
        detail: noteText,
      };
    });

    // Fyll ALLTID ut både 'stikkord' (array med 3–4 konkrete, munnlege stikkord) og 'points'
    rawResult.stikkord = rawResult.points.map((p: any) => p.keyword);
    rawResult.stikkordItems = rawResult.points.map((p: any) => ({
      title: p.keyword,
      text: p.keyword,
      detail: p.note,
      note: p.note,
    }));

    let rootScript = (leaderScriptFromStoryboard || rawResult.leaderNotes || '').trim();
    if (rootScript) {
      const rootSentences = rootScript.match(/[^.!?]+[.!?]+/g);
      if (rootSentences && rootSentences.length > 3) {
        rootScript = rootSentences.slice(0, 3).join(' ').trim();
      }
    }
    rawResult.leaderNotes = rootScript || rawResult.points.map((p: any) => `• ${p.keyword}: ${p.note}`).join('\n\n');
  }

  // B. TEKST
  if (blockType === 'tekst') {
    rawResult.title = cleanBlockTitle(rawResult.title || prompt || 'Tekst', 'tekst', language);
    const slideTxt = (rawResult.slideText || rawResult.text || rawResult.content || rawResult.slideContent || bigScreenSummary || prompt).trim();
    rawResult.slideText = slideTxt;
    rawResult.content = slideTxt;
    rawResult.text = slideTxt;
    rawResult.leaderNotes = leaderScriptFromStoryboard || rawResult.leaderNotes || rawResult.coreMessage || (
      language === 'nb'
        ? `Formidle hovedtanken i «${rawResult.title}» med dine egne ord.`
        : `Formidle hovudtanken i «${rawResult.title}» med dine eigne ord.`
    );
  }

  // C. BIBELORD
  if (blockType === 'bibelord') {
    const refMatch = `${rawResult.reference || ''} ${rawResult.scriptureRef || ''} ${rawResult.bibleRef || ''} ${prompt} ${bigScreenSummary}`.match(/([1-3]?\s*[A-ZÆØÅa-zæøå]+\s*\d+[\d\s,–:-]*)/);
    const ref = (rawResult.reference || rawResult.scriptureRef || rawResult.bibleRef || (refMatch ? refMatch[1] : '') || 'Lukas 15, 20').trim();
    let vText = (rawResult.verseText || rawResult.bibleText || rawResult.keyVerse || '').trim();
    if (!vText && rawResult.content && !rawResult.explanation && rawResult.content !== rawResult.leaderNotes) {
      vText = rawResult.content.trim();
    }
    if (!vText) {
      vText = language === 'nb'
        ? '«For så høyt har Gud elsket verden at han ga sin Sønn, den enbårne, for at hver den som tror på ham, ikke skal gå fortapt, men ha evig liv.»'
        : '«For så høgt har Gud elska verda at han gav Son sin, den einborne, så kvar den som trur på han, ikkje skal gå tapt, men ha evig liv.»';
    }
    if (!vText.startsWith('«') && !vText.startsWith('"')) {
      vText = `«${vText}»`;
    }
    const expl = (leaderScriptFromStoryboard || rawResult.explanation || rawResult.notes || rawResult.leaderNotes || rawResult.leaderElaboration || '').trim();

    rawResult.title = cleanBlockTitle(rawResult.title || ref, 'bibelord', language);
    rawResult.bibleRef = ref;
    rawResult.reference = ref;
    rawResult.scriptureRef = ref;

    rawResult.verseText = vText;
    rawResult.bibleText = vText;
    rawResult.keyVerse = vText;

    rawResult.explanation = expl;
    rawResult.notes = expl;
    rawResult.leaderNotes = expl;
  }

  // D. BILETE (Konkrete engelske søkeord for abstrakte tema + tom caption som standard + Unsplash fallback)
  if (blockType === 'bilete' || blockType === 'bilde') {
    let layout: 1 | 2 | 4 = 1;
    const reqLayout = Number(params.layout);
    if (rawResult.layout === 1 || rawResult.layout === 2 || rawResult.layout === 4) {
      layout = rawResult.layout as (1 | 2 | 4);
    } else if (reqLayout === 1 || reqLayout === 2 || reqLayout === 4) {
      layout = reqLayout as (1 | 2 | 4);
    } else if (/fire|4|rutenett/i.test(prompt)) {
      layout = 4;
    } else if (/to|2|ved sida/i.test(prompt)) {
      layout = 2;
    }

    const slotQueries: Array<{ query: string; caption: string }> = [];

    if (Array.isArray(rawResult.imageQueries) && rawResult.imageQueries.length > 0) {
      for (const item of rawResult.imageQueries) {
        if (typeof item === 'object' && item) {
          const q = (item.englishQuery || item.query || item.slot || '').trim();
          if (q) slotQueries.push({ query: q, caption: '' });
        } else if (typeof item === 'string' && item.trim()) {
          slotQueries.push({ query: item.trim(), caption: '' });
        }
      }
    }

    if (slotQueries.length === 0) {
      if (Array.isArray(rawResult.imageSearchQueries) && rawResult.imageSearchQueries.length > 0) {
        for (let i = 0; i < rawResult.imageSearchQueries.length; i++) {
          const q = (rawResult.imageSearchQueries[i] || '').trim();
          if (q) slotQueries.push({ query: q, caption: '' });
        }
      } else if (rawResult.englishSearchQuery) {
        slotQueries.push({ query: rawResult.englishSearchQuery.trim(), caption: '' });
      }
    }

    // Omset eventuelle abstrakte norske temaord til konkrete visuelle engelske søk via Gemini
    const translatedThemeQuery = await translateQueryToEnglishPixabayTags(
      rawResult.englishSearchQuery || `${prompt} ${bigScreenSummary}`,
      sessionTitle
    );
    const fallbackThematicWords = [
      translatedThemeQuery || 'sunrise mountain nature light',
      'joyful welcome celebration reunion hug',
      'calm peaceful sunrise sunlight horizon',
      'starry night sky clouds mountains',
    ];
    while (slotQueries.length < layout) {
      const nextFallback = fallbackThematicWords[slotQueries.length % fallbackThematicWords.length];
      slotQueries.push({ query: nextFallback, caption: '' });
    }

    const images: Array<{ id: string; url: string; caption: string; alt: string }> = [];
    const usedUrls = new Set<string>();

    for (let i = 0; i < layout; i++) {
      const item = slotQueries[i] || { query: 'nature landscape', caption: '' };
      const currentQuery = await translateQueryToEnglishPixabayTags(item.query || 'nature landscape', sessionTitle);
      const hits = await searchPixabayPhotos(currentQuery, 6, 'general', i);

      let chosenUrl = '';
      if (Array.isArray(hits) && hits.length > 0) {
        for (const hit of hits) {
          if (hit.url && !usedUrls.has(hit.url)) {
            chosenUrl = hit.url;
            break;
          }
        }
      }

      // Fallback til tematisk Unsplash-foto dersom Pixabay gjev 0 treff
      if (!chosenUrl) {
        const pool = CURATED_THEMATIC_PHOTOS.nature;
        for (let pIdx = 0; pIdx < pool.length; pIdx++) {
          const candidate = pool[(i + pIdx) % pool.length];
          if (!usedUrls.has(candidate)) {
            chosenUrl = candidate;
            break;
          }
        }
        if (!chosenUrl) {
          chosenUrl = pool[i % pool.length];
        }
      }

      usedUrls.add(chosenUrl);
      const cachedChosenUrl = await downloadAndCachePixabayImage(chosenUrl, 'ai');

      // Standard caption (bildetekst) skal vere tom ("")
      images.push({
        id: `img_${Date.now()}_${i + 1}`,
        url: cachedChosenUrl,
        caption: '',
        alt: currentQuery,
      });
    }

    rawResult.title = cleanBlockTitle(
      (rawResult.title && !rawResult.title.toLowerCase().startsWith('gi meg'))
        ? rawResult.title
        : (prompt.length < 35 ? prompt : (language === 'nb' ? 'Bilde' : 'Bilete')),
      'bilete',
      language
    );
    rawResult.layout = layout;
    rawResult.images = images;
    if (leaderScriptFromStoryboard) {
      rawResult.leaderNotes = leaderScriptFromStoryboard;
    }
  }

  // E. LYSBILETESHOW
  if (blockType === 'lysbileteshow') {
    const pQuery = await translateQueryToEnglishPixabayTags(
      rawResult.englishSearchQuery || prompt || 'nature landscape',
      sessionTitle
    );
    const hits = await searchPixabayPhotos(pQuery, 12, 'general');
    rawResult.title = cleanBlockTitle(
      rawResult.title || prompt || (language === 'nb' ? 'Lysbildeshow' : 'Lysbileteshow'),
      'lysbileteshow',
      language
    );
    rawResult.interval = 4;
    rawResult.intervalSeconds = 4;
    rawResult.loop = true;
    rawResult.autoLoop = true;
    rawResult.autoPlay = true;
    rawResult.images = await Promise.all(
      hits.map(async (h, i) => ({
        id: `ls_${Date.now()}_${i + 1}`,
        url: await downloadAndCachePixabayImage(h.url, 'ai'),
        caption: '',
        title: `${language === 'nb' ? 'Bilde' : 'Bilete'} ${i + 1}`,
      }))
    );
    if (leaderScriptFromStoryboard) {
      rawResult.leaderNotes = leaderScriptFromStoryboard;
    }
  }

  // F. BILETEAVDEKKING (gridSize: 100, 1.5–2 min per kloss, hent frå Pixabay via rawResult.englishSearchQuery eller AI-omsetjing av fasit/tema – ALDRI kompass-fallback!)
  if (blockType === 'bilete_avdekking') {
    const scriptFasitMatch = `${leaderScriptFromStoryboard || ''} ${bigScreenSummary || ''}`.match(/(?:fasit|motivet?)\s*:\s*([^.\n!]+)/i);
    const extractedFromScript = scriptFasitMatch ? scriptFasitMatch[1].trim() : '';

    const rawSol = cleanBlockTitle(rawResult.fasit || rawResult.solution || extractedFromScript || '', '', language);
    const isGenericSol =
      !rawSol ||
      /^(bilete?-?avdekking\s*\d*|bilde-?avdekking\s*\d*|gjett\s+biletet|gjett\s+bildet|hovudbodskap|hovedbudskap)$/i.test(rawSol.trim());

    const finalSolution = isGenericSol
      ? (extractedFromScript || cleanBlockTitle(prompt || sessionTitle || (language === 'nb' ? 'Hemmelig motiv' : 'Hemmeleg motiv'), '', language))
      : rawSol;

    const rawEng = (rawResult.englishSearchQuery || '').trim();
    const pQuery =
      rawEng && !looksLikeNorwegianOrSentence(rawEng) && !/abstract|concept|theme/i.test(rawEng)
        ? rawEng
        : await translateQueryToEnglishPixabayTags(finalSolution || prompt || sessionTitle, sessionTitle);

    const hits = await searchPixabayPhotos(pQuery, 4, 'guessing');
    rawResult.title = cleanBlockTitle(params.prompt || rawResult.title || '', 'bilete_avdekking', language);
    rawResult.durationMinutes = 2;
    const candidateUrl = sanitizeImageUrl(hits[0]?.url) || sanitizeImageUrl(rawResult.imageUrl) || '';
    rawResult.imageUrl = candidateUrl;
    rawResult.gridSize = 100;
    rawResult.timerSeconds = 30;
    rawResult.fasit = finalSolution;
    rawResult.solution = finalSolution;
    rawResult.englishSearchQuery = pQuery;
    // Ingen liste med hint!
    rawResult.clue = '';
    rawResult.hints = [];

    const cleanScript = (leaderScriptFromStoryboard || rawResult.leaderNotes || '')
      .split('\n')
      .filter((line: string) => !/^\s*(hint\s*\d*|ledetråd|fasit\s*:)/i.test(line.trim()))
      .join(' ')
      .trim();

    rawResult.leaderNotes = cleanScript
      ? `Fasit: ${finalSolution}\n\n${cleanScript}`
      : `Fasit: ${finalSolution}`;
  }

  // G. KIMS LEIK
  if (blockType === 'kims_leik') {
    rawResult.title = language === 'nb' ? 'Kims lek' : 'Kims leik';
    rawResult.countdownSeconds = 30;
    rawResult.timerSeconds = 30;
    rawResult.itemCount = 16;
    let rawItems = Array.isArray(rawResult.kimsItems) && rawResult.kimsItems.length > 0
      ? rawResult.kimsItems
      : Array.isArray(rawResult.items) ? rawResult.items : [];
    if (rawItems.length < 16) {
      const fallbacks = language === 'nb'
        ? [
            { name: 'Kors', emoji: '✝️' },
            { name: 'Palmegrein', emoji: '🌿' },
            { name: 'Nøkler', emoji: '🔑' },
            { name: 'Kaffekopp', emoji: '☕' },
            { name: 'Bibel', emoji: '📖' },
            { name: 'Stearinlys', emoji: '🕯️' },
            { name: 'Brød', emoji: '🍞' },
            { name: 'Fisk', emoji: '🐟' },
            { name: 'Vannmugge', emoji: '🏺' },
            { name: 'Gullring', emoji: '💍' },
            { name: 'Sandal', emoji: '🩴' },
            { name: 'Hjerte', emoji: '❤️' },
            { name: 'Krone', emoji: '👑' },
            { name: 'Stjerne', emoji: '✨' },
            { name: 'Klokke', emoji: '🔔' },
            { name: 'Gave', emoji: '🎁' },
          ]
        : [
            { name: 'Kross', emoji: '✝️' },
            { name: 'Palmegrein', emoji: '🌿' },
            { name: 'Nyklar', emoji: '🔑' },
            { name: 'Kaffekopp', emoji: '☕' },
            { name: 'Bibel', emoji: '📖' },
            { name: 'Stearinlys', emoji: '🕯️' },
            { name: 'Brød', emoji: '🍞' },
            { name: 'Fisk', emoji: '🐟' },
            { name: 'Vassmugge', emoji: '🏺' },
            { name: 'Gullring', emoji: '💍' },
            { name: 'Sandal', emoji: '🩴' },
            { name: 'Hjarte', emoji: '❤️' },
            { name: 'Krone', emoji: '👑' },
            { name: 'Stjerne', emoji: '✨' },
            { name: 'Klokke', emoji: '🔔' },
            { name: 'Gåve', emoji: '🎁' },
          ];
      rawItems = [...rawItems, ...fallbacks].slice(0, 16);
    }
    rawResult.items = rawItems.slice(0, 16).map((it: any, idx: number) => {
      const name = (typeof it === 'object' && it ? it.name || it.text : String(it || 'Gjenstand')).trim();
      const emoji = (typeof it === 'object' && it ? it.emoji || it.iconName : '📦').trim();
      return {
        id: `kims_${Date.now()}_${idx + 1}`,
        name,
        emoji,
        text: name,
        iconName: emoji,
      };
    });
    if (leaderScriptFromStoryboard) {
      rawResult.leaderNotes = leaderScriptFromStoryboard;
    }
  }

  // H. VIDEO
  if (blockType === 'video') {
    rawResult.title = cleanBlockTitle(rawResult.title || prompt || 'Video', 'video', language);
    rawResult.videoUrl = '';
    rawResult.suggestedYouTubeUrl = '';
    rawResult.autoplay = false;
    rawResult.isPlaying = false;
    const videoHint = language === 'nb'
      ? '«(Sett inn egen videolenke på arbeidsbordet)»'
      : '«(Set inn eiga videolenke på arbeidsbordet)»';
    rawResult.leaderNotes = leaderScriptFromStoryboard
      ? `${leaderScriptFromStoryboard}\n\n${videoHint}`
      : videoHint;
    rawResult.durationMinutes = rawResult.durationMinutes || 5;
  }

  // I. BØN / DIKT
  if (blockType === 'bonn_dikt') {
    rawResult.title = cleanBlockTitle(rawResult.title || (language === 'nb' ? 'Bønn' : 'Bøn'), 'bonn_dikt', language);
    rawResult.isResponsive = !!rawResult.responsiveReading;
    let bText = (rawResult.text || '').trim();
    bText = bText.replace(/\r\n/g, '\n').replace(/\n{2,}/g, '\n').trim();
    if (!bText.toLowerCase().includes('amen')) {
      bText = bText
        ? `${bText}\nAmen.`
        : (language === 'nb'
            ? 'Kjære Gud, takk for at du kjenner oss akkurat slik vi er.\nHjelp oss å se hverandre og vite at vi hører til her sammen med deg.\nAmen.'
            : 'Kjære Gud, takk for at du kjenner oss akkurat slik vi er.\nHjelp oss å sjå kvarandre og vite at vi høyrer til her saman med deg.\nAmen.');
    }
    rawResult.text = bText;
    const rawIntro = (leaderScriptFromStoryboard || rawResult.leaderNotes || '').trim();
    // Sørg for at leaderNotes er ei kort munnleg innleiing FØR bøna og ikkje dupliserer sjølve bønneteksten
    if (rawIntro && rawIntro !== bText) {
      rawResult.leaderNotes = rawIntro.replace(/\s*Amen\.?\s*$/i, '').trim();
    } else {
      rawResult.leaderNotes = language === 'nb'
        ? 'La oss samle tankene våre og be sammen.'
        : 'La oss samle tankane våre og be saman.';
    }
  }

  // J. QUIZ
  if (blockType === 'quiz') {
    rawResult.title = cleanBlockTitle(rawResult.title || prompt || 'Quiz', 'quiz', language);
    rawResult.quizType = 'mc';
    rawResult.quizMode = normalizedQuizMode;
    const rawQList = Array.isArray(rawResult.quizQuestions) && rawResult.quizQuestions.length > 0
      ? rawResult.quizQuestions
      : Array.isArray(rawResult.questions) && rawResult.questions.length > 0
      ? rawResult.questions
      : [];

    const normalizedQuestions = normalizeQuizQuestions(rawQList, rawResult.title || sessionTitle || prompt);
    rawResult.questions = normalizedQuestions;
    rawResult.quizQuestions = normalizedQuestions;

    if (normalizedQuestions.length > 0) {
      const firstQ = normalizedQuestions[0];
      rawResult.question = firstQ.question;
      rawResult.optionA = firstQ.optionA;
      rawResult.optionB = firstQ.optionB;
      rawResult.optionC = firstQ.optionC;
      rawResult.optionD = firstQ.optionD;
      rawResult.correctOption = firstQ.correctOption;
      rawResult.explanation = firstQ.explanation;
    }

    if (leaderScriptFromStoryboard) {
      rawResult.leaderNotes = leaderScriptFromStoryboard;
    }
  }

  // K. HENTELEIK (Ultrakort: maks 1–2 ord per gjenstand, fysiske ting ungdommar har på seg eller i rommet)
  if (blockType === 'henteleik') {
    rawResult.title = language === 'nb' ? 'Henteleken' : 'Henteleiken';
    rawResult.intro = rawResult.intro || (language === 'nb' ? 'Finn fram det dere tror laget trenger!' : 'Finn fram det de trur laget treng!');
    rawResult.durationMinutes = rawResult.durationMinutes || 7;

    let rawList: any[] = [];
    if (Array.isArray(rawResult.henteleikItems) && rawResult.henteleikItems.length > 0) {
      rawList = rawResult.henteleikItems;
    } else if (Array.isArray(rawResult.items) && rawResult.items.length > 0) {
      rawList = rawResult.items;
    } else if (Array.isArray(rawResult.objects) && rawResult.objects.length > 0) {
      rawList = rawResult.objects;
    }

    // Kutt ned kvart punkt til maks 1–2 ord dersom AI skreiv lengre uttrykk
    const shortenToTwoWords = (input: string): string => {
      const cleaned = input
        .replace(/^[•\-*\d.)\s]+/, '')
        .replace(/\([^)]*\)/g, '')
        .trim();
      const words = cleaned.split(/\s+/).filter(Boolean);
      if (words.length <= 2) return words.join(' ');
      return words.slice(0, 2).join(' ');
    };

    let rawItems: string[] = rawList
      .map((it: any) => (typeof it === 'object' && it ? it.text || it.name || it.title : String(it || '')).trim())
      .filter((s: string) => s.length > 0 && !s.toLowerCase().startsWith('generer'))
      .map(shortenToTwoWords)
      .filter(Boolean);

    const shortDefaults = language === 'nb'
      ? [
          'Rød genser',
          'En sko',
          'Noe rundt',
          'Briller',
          'Bibel',
          'Mynt',
          'Nøkkel',
          'Klokke',
          'Jakke',
          'Drikkeflaske',
        ]
      : [
          'Raud genser',
          'Ein sko',
          'Noko rundt',
          'Briller',
          'Bibel',
          'Mynt',
          'Nøkkel',
          'Klokke',
          'Jakke',
          'Drikkeflaske',
        ];

    if (rawItems.length > targetHenteleikCount) {
      rawItems = rawItems.slice(0, targetHenteleikCount);
    } else {
      for (const defItem of shortDefaults) {
        if (rawItems.length >= targetHenteleikCount) break;
        if (!rawItems.some(existing => existing.toLowerCase() === defItem.toLowerCase())) {
          rawItems.push(defItem);
        }
      }
    }

    rawResult.items = rawItems.map((it: string, idx: number) => ({
      id: `h_${Date.now()}_${idx + 1}`,
      text: it,
    }));
    if (leaderScriptFromStoryboard) {
      rawResult.leaderNotes = leaderScriptFromStoryboard;
    }
  }

  // L. REIS DEG
  if (blockType === 'reis_deg') {
    rawResult.title = 'Reis deg';
    rawResult.intro = rawResult.intro || (
      language === 'nb'
        ? 'Reis deg hvis påstanden passer for deg, sitt ned hvis ikke!'
        : 'Reis deg dersom påstanden passar for deg, sit ned dersom ikkje!'
    );
    rawResult.durationMinutes = rawResult.durationMinutes || 4;
    let rawStmts = Array.isArray(rawResult.statements) && rawResult.statements.length > 0 ? rawResult.statements : [];
    if (rawStmts.length === 0) {
      rawStmts = language === 'nb'
        ? [
            'hvis du har på deg noe blått',
            'hvis du liker taco bedre enn pizza',
            'hvis du har vært på leir før',
            'hvis du sto opp før klokken 07:00 i dag',
          ]
        : [
            'dersom du har på deg noko blått',
            'dersom du likar taco betre enn pizza',
            'dersom du har vore på leir før',
            'dersom du stod opp før klokka 07:00 i dag',
          ];
    }
    rawResult.statements = rawStmts.map((st: any, idx: number) => {
      const rawText = (typeof st === 'object' && st ? st.statement || st.text : String(st)).trim();
      let cleanedText = rawText
        .replace(/^(\d+[.)]\s*|[-•*]\s*)/, '')
        .replace(/^reis\s+deg\s+(dersom|viss|hvis|om)?\s*/i, (_m: string, g: string) => (g ? `${g.toLowerCase()} ` : (language === 'nb' ? 'hvis ' : 'dersom ')))
        .trim();
      if (!/^(hvis|dersom|viss|om)\s+/i.test(cleanedText)) {
        const lowerFirst = cleanedText.charAt(0).toLowerCase() + cleanedText.slice(1);
        cleanedText = `${language === 'nb' ? 'hvis' : 'dersom'} ${lowerFirst}`;
      } else {
        cleanedText = cleanedText.replace(
          /^(hvis|dersom|viss|om)\s+([A-ZÆØÅ])/i,
          (_m: string, intro: string, firstChar: string) => `${intro.toLowerCase()} ${firstChar.toLowerCase()}`
        );
      }
      return {
        id: `rd_${Date.now()}_${idx + 1}`,
        statement: cleanedText,
      };
    });
    if (leaderScriptFromStoryboard) {
      rawResult.leaderNotes = leaderScriptFromStoryboard;
    }
  }

  // M. BEAT FOR BEAT
  if (blockType === 'beat_for_beat') {
    rawResult.title = 'Beat for beat';
    rawResult.durationMinutes = rawResult.durationMinutes || 7;
    const sol = (rawResult.solution || prompt || 'Deg være ære, Herre over dødens makt').trim();
    rawResult.solution = sol;
    rawResult.category = rawResult.category || (language === 'nb' ? 'Sang / Salme' : 'Song / Salme');
    const wList = Array.isArray(rawResult.words) && rawResult.words.length > 0 ? rawResult.words : sol.split(/\s+/).filter(Boolean);
    rawResult.words = wList.map((w: any) => String(w).trim());
    if (leaderScriptFromStoryboard) {
      rawResult.leaderNotes = leaderScriptFromStoryboard;
    }
  }

  // N. ORD FOR ORD
  if (blockType === 'ord_for_ord') {
    rawResult.title = 'Ord for ord';
    rawResult.durationMinutes = rawResult.durationMinutes || 6;
    const defaultOrdForOrdQuote = language === 'nb'
      ? 'For så høyt har Gud elsket verden at han ga sin Sønn, den enbårne'
      : 'For så høgt har Gud elska verda at han gav Son sin, den einborne';
    const q = (rawResult.quote || rawResult.verseText || rawResult.text || defaultOrdForOrdQuote).trim();
    rawResult.quote = q;
    rawResult.text = q;
    rawResult.reference = (rawResult.reference || rawResult.scriptureRef || 'Johannes 3, 16').trim();
    rawResult.hint = rawResult.hint || 'Kjent bibelvers';
    const maxWords = typeof rawResult.maxWords === 'number' ? Math.min(10, Math.max(5, rawResult.maxWords)) : 7;
    const startIndex = typeof rawResult.startIndex === 'number' ? rawResult.startIndex : 0;
    rawResult.maxWords = maxWords;
    rawResult.startIndex = startIndex;

    const tokens = q.replace(/[\r\n]+/g, ' ').split(/\s+/).map((w: any) => String(w).trim()).filter(Boolean);
    let wList = Array.isArray(rawResult.words) && rawResult.words.length >= 5 && rawResult.words.length <= 10
      ? rawResult.words
      : tokens.slice(startIndex, startIndex + maxWords);
    if (wList.length === 0) {
      wList = tokens.slice(0, 7);
    }
    rawResult.words = wList.map((w: any) => String(w).trim());
    if (leaderScriptFromStoryboard) {
      rawResult.leaderNotes = leaderScriptFromStoryboard;
    }
  }

  // O. KVEN SKAL UT? (3 oppgåver som standard, korte ord, ultrakort fasit maks 6–8 ord)
  if (blockType === 'kven_skal_ut') {
    rawResult.title = language === 'nb' ? 'Hvem skal ut?' : 'Kven skal ut?';
    rawResult.durationMinutes = rawResult.durationMinutes || 5;

    let rawItems = Array.isArray(rawResult.items) && rawResult.items.length > 0
      ? rawResult.items
      : Array.isArray(rawResult.kvenSkalUtItems) && rawResult.kvenSkalUtItems.length > 0
      ? rawResult.kvenSkalUtItems
      : Array.isArray(rawResult.oppgaver) && rawResult.oppgaver.length > 0
      ? rawResult.oppgaver
      : Array.isArray(rawResult.tasks) && rawResult.tasks.length > 0
      ? rawResult.tasks
      : [];

    if (rawItems.length === 0 && (rawResult.optionA || rawResult.optionB || rawResult.valg || rawResult.options)) {
      rawItems = [{
        options: rawResult.options || rawResult.alternatives || rawResult.valg || {
          A: rawResult.optionA,
          B: rawResult.optionB,
          C: rawResult.optionC,
          D: rawResult.optionD,
        },
        optionA: rawResult.optionA,
        optionB: rawResult.optionB,
        optionC: rawResult.optionC,
        optionD: rawResult.optionD,
        correctOption: rawResult.correctOption || rawResult.correctAnswer || rawResult.fasit || rawResult.correct || rawResult.skalUt,
        explanation: rawResult.explanation || rawResult.forklaring || rawResult.reason || rawResult.begrunnelse,
      }];
    }

    const normalizedItems: any[] = [];
    const fallbackOptionWords = language === 'nb'
      ? [
          ['Tro', 'Håp', 'Kjærlighet', 'Baksnakking'],
          ['Festkappe', 'Gullring', 'Sandaler', 'Misunnelse'],
          ['Dåp', 'Nattverd', 'Velsignelse', 'Egoisme'],
        ]
      : [
          ['Tru', 'Håp', 'Kjærleik', 'Baksnakking'],
          ['Festkappe', 'Gullring', 'Sandalar', 'Misunning'],
          ['Dåp', 'Nattverd', 'Velsigning', 'Egoisme'],
        ];

    for (let i = 0; i < rawItems.length; i++) {
      const raw = rawItems[i];
      if (!raw || typeof raw !== 'object') continue;

      const fallbackPair = fallbackOptionWords[i % fallbackOptionWords.length];
      const optsObj = raw.options || raw.alternatives || raw.valg || raw.val || {};

      let optA = String(optsObj.A || raw.optionA || (Array.isArray(optsObj) ? optsObj[0] : '') || '').trim();
      let optB = String(optsObj.B || raw.optionB || (Array.isArray(optsObj) ? optsObj[1] : '') || '').trim();
      let optC = String(optsObj.C || raw.optionC || (Array.isArray(optsObj) ? optsObj[2] : '') || '').trim();
      let optD = String(optsObj.D || raw.optionD || (Array.isArray(optsObj) ? optsObj[3] : '') || '').trim();

      const isDummy = (str: string) => !str || /^(alternativ|valg?|option)\s*[a-d1-4]?$/i.test(str.trim());
      if (isDummy(optA)) optA = fallbackPair[0];
      if (isDummy(optB)) optB = fallbackPair[1];
      if (isDummy(optC)) optC = fallbackPair[2];
      if (isDummy(optD)) optD = fallbackPair[3];

      const rawCorr = String(raw.correctOption || raw.correctAnswer || raw.fasit || raw.correct || raw.skalUt || '').trim();
      let corr: 'A' | 'B' | 'C' | 'D' = 'D';

      const match = rawCorr.match(/\b([A-D])\b/i);
      if (match) {
        corr = match[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      } else if (typeof raw.correctIndex === 'number' && raw.correctIndex >= 0 && raw.correctIndex <= 3) {
        corr = (['A', 'B', 'C', 'D'][raw.correctIndex]) as 'A' | 'B' | 'C' | 'D';
      } else {
        corr = (['A', 'B', 'C', 'D'][i % 4]) as 'A' | 'B' | 'C' | 'D';
      }

      const expl = String(raw.explanation || raw.forklaring || raw.reason || raw.begrunnelse || raw.rationale || '').trim();
      const optsMap: Record<string, string> = { A: optA, B: optB, C: optC, D: optD };
      const selectedOptText = optsMap[corr] || 'ordet';

      let finalExpl = expl;
      if (!finalExpl || finalExpl.length < 5) {
        finalExpl = language === 'nb'
          ? `Fasit: ${corr}. ${selectedOptText} skiller seg ut.`
          : `Fasit: ${corr}. ${selectedOptText} skil seg ut.`;
      } else if (!finalExpl.startsWith('Fasit:')) {
        finalExpl = `Fasit: ${corr}. ${finalExpl}`;
      }
      // Kutt ned til ultrakort fasit (maks 8–10 ord)
      const explWords = finalExpl.split(/\s+/);
      if (explWords.length > 10) {
        finalExpl = `${explWords.slice(0, 9).join(' ')}.`;
      }

      normalizedItems.push({
        id: raw.id || `ksu_${Date.now()}_${i + 1}`,
        options: {
          A: optA,
          B: optB,
          C: optC,
          D: optD,
        },
        correctOption: corr,
        explanation: finalExpl,
      });
    }

    if (normalizedItems.length === 0) {
      const defaults = language === 'nb'
        ? [
            {
              options: { A: 'Misunnelse', B: 'Gullring', C: 'Festkappe', D: 'Sandaler' },
              correctOption: 'A' as const,
              explanation: 'Fasit: A. B–D er gaver ved hjemkomst.',
            },
            {
              options: { A: 'Tilgivelse', B: 'Kjærlighet', C: 'Åpne armer', D: 'Straff' },
              correctOption: 'D' as const,
              explanation: 'Fasit: D. A–C er nåde, D er krav.',
            },
            {
              options: { A: 'Yngste sønnen', B: 'Gjeldskrav', C: 'Faren', D: 'Eldste sønnen' },
              correctOption: 'B' as const,
              explanation: 'Fasit: B. A, C, D er familien i lignelsen.',
            },
          ]
        : [
            {
              options: { A: 'Misunning', B: 'Gullring', C: 'Festkappe', D: 'Sandalar' },
              correctOption: 'A' as const,
              explanation: 'Fasit: A. B–D er gåver ved heimkomst.',
            },
            {
              options: { A: 'Tilgjeving', B: 'Kjærleik', C: 'Opne armar', D: 'Straff' },
              correctOption: 'D' as const,
              explanation: 'Fasit: D. A–C er nåde, D er krav.',
            },
            {
              options: { A: 'Yngste sonen', B: 'Gjeldskrav', C: 'Faren', D: 'Eldste sonen' },
              correctOption: 'B' as const,
              explanation: 'Fasit: B. A, C, D er familien i likninga.',
            },
          ];

      for (let i = 0; i < defaults.length; i++) {
        normalizedItems.push({
          id: `ksu_${Date.now()}_${i + 1}`,
          options: defaults[i].options,
          correctOption: defaults[i].correctOption,
          explanation: defaults[i].explanation,
        });
      }
    }

    const targetLetters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'D', 'B', 'C', 'A'];
    const currentLetters = normalizedItems.map((it) => it.correctOption);
    const allSame = currentLetters.length > 1 && currentLetters.every((l) => l === currentLetters[0]);

    if (allSame) {
      for (let i = 0; i < normalizedItems.length; i++) {
        const item = normalizedItems[i];
        const origCorr = item.correctOption;
        const targetCorr = targetLetters[i % targetLetters.length];
        if (origCorr !== targetCorr) {
          const origText = item.options[origCorr];
          const targetText = item.options[targetCorr];
          item.options[origCorr] = targetText;
          item.options[targetCorr] = origText;
          item.correctOption = targetCorr;
          item.explanation = language === 'nb'
            ? `Fasit: ${targetCorr}. ${origText} skiller seg ut.`
            : `Fasit: ${targetCorr}. ${origText} skil seg ut.`;
        }
      }
    }

    const finalKvenItems = normalizedItems.slice(0, targetKvenCount);
    rawResult.items = finalKvenItems;
    rawResult.kvenSkalUtItems = finalKvenItems;
    rawResult.currentIndex = 0;

    const first = finalKvenItems[0];
    if (first) {
      rawResult.optionA = first.options.A;
      rawResult.optionB = first.options.B;
      rawResult.optionC = first.options.C;
      rawResult.optionD = first.options.D;
      rawResult.correctOption = first.correctOption;
      rawResult.explanation = first.explanation;
    }
    if (leaderScriptFromStoryboard) {
      rawResult.leaderNotes = leaderScriptFromStoryboard;
    }
  }

  // P. SANG / SALME
  if (blockType === 'sang_salme') {
    rawResult.title = cleanBlockTitle(
      rawResult.title || prompt || (language === 'nb' ? 'Sang / Salme' : 'Song / Salme'),
      'sang_salme',
      language
    );
    rawResult.durationMinutes = rawResult.durationMinutes || 4;
    rawResult.songNumber = rawResult.songNumber || '';
    rawResult.songText = '';
    rawResult.verses = [];
    const songHint = language === 'nb'
      ? '«(Sett inn egen salmetekst på arbeidsbordet)»'
      : '«(Set inn eiga salmetekst på arbeidsbordet)»';
    rawResult.leaderNotes = leaderScriptFromStoryboard
      ? `${leaderScriptFromStoryboard}\n\n${songHint}`
      : songHint;
  }

  // Q. SAMTALE (ALLTID 2 opne, engasjerande spørsmål i datastrukturen, ALDRI flat brødtekst)
  if (blockType === 'samtale') {
    rawResult.title = cleanBlockTitle(rawResult.title || prompt || 'Samtale', 'samtale', language);
    rawResult.topic = cleanBlockTitle(rawResult.topic || prompt || 'Dagens tema', 'samtale', language);
    rawResult.organization = rawResult.organization || 'To-og-to';
    rawResult.durationMinutes = typeof rawResult.durationMinutes === 'number' ? rawResult.durationMinutes : 7;

    let qs: string[] = [];
    if (Array.isArray(rawResult.reflectionQuestions) && rawResult.reflectionQuestions.length > 0) {
      qs = rawResult.reflectionQuestions.map((q: any) => String(q?.text || q?.question || q || '').trim()).filter(Boolean);
    } else if (Array.isArray(rawResult.questions) && rawResult.questions.length > 0) {
      qs = rawResult.questions.map((q: any) => String(q?.text || q?.question || q || '').trim()).filter(Boolean);
    }

    // Dersom AI la spørsmål i flat tekst, i bigScreenSummary eller i leaderScript, trekk ut spørsmåla til strukturerte punkt
    if (qs.length === 0) {
      const candidateBlob = `${rawResult.slideText || ''}\n${rawResult.text || ''}\n${rawResult.content || ''}\n${bigScreenSummary || ''}\n${leaderScriptFromStoryboard || ''}`;
      const questionMatches = candidateBlob.match(/[^.!?\n•\-*]+\?/g);
      if (questionMatches && questionMatches.length > 0) {
        qs = questionMatches
          .map(q => q.replace(/^[\d.)•\-*\s«"']+|[»"'\s]+$/g, '').trim())
          .filter(q => q.length > 8);
      }
    }

    const desiredCount = targetSamtaleQuestionCount || 2;

    if (qs.length < desiredCount) {
      const confirmandFallbacks = language === 'nb'
        ? [
            'Er det lett eller vanskelig å si unnskyld når du har dummet deg ut?',
            'Hva skal til for at du tilgir en venn som har sviktet deg?',
            'Hvordan merker du om noen i klassen eller gruppen føler seg alene?',
          ]
        : [
            'Er det lett eller vanskeleg å seie unnskyld når du har dumma deg ut?',
            'Kva skal til for at du tilgjev ein ven som har svikta deg?',
            'Korleis merkar du om nokon i klassen kjenner seg åleine?',
          ];
      for (const fb of confirmandFallbacks) {
        if (qs.length >= desiredCount) break;
        if (!qs.includes(fb)) qs.push(fb);
      }
    }

    const finalQuestions = qs.slice(0, desiredCount).map((q: string) => {
      const cleanQ = q.replace(/^(\d+[.)]\s*|[-•*]\s*)/, '').trim();
      return cleanQ.endsWith('?') ? cleanQ : `${cleanQ}?`;
    });

    rawResult.reflectionQuestions = finalQuestions;
    rawResult.questions = finalQuestions;
    // Fjern flat brødtekst slik at 'samtale' alltid brukar den opne spørsmålsstrukturen
    delete rawResult.slideText;
    delete rawResult.text;
    delete rawResult.content;

    rawResult.summaryPoint = rawResult.summaryPoint || 'Felles oppsummering i plenum.';
    if (leaderScriptFromStoryboard) {
      rawResult.leaderNotes = leaderScriptFromStoryboard;
    }
  }

  // R. INFORMASJON (Enkel og ryddig med 2–3 konkrete punkt)
  if (blockType === 'informasjon') {
    rawResult.heading = cleanBlockTitle(rawResult.heading || rawResult.title || 'Praktisk informasjon', 'informasjon', language);
    rawResult.title = rawResult.heading;
    rawResult.durationMinutes = rawResult.durationMinutes || 4;
    const defaultInfoPoints = language === 'nb'
      ? [
          'Husk neste samling [tid/sted]',
          'Kiosk og prat etter samlingen',
          'Takk for i dag!',
        ]
      : [
          'Hugs neste samling [tid/stad]',
          'Kiosk og prat etter samlinga',
          'Takk for i dag!',
        ];
    const pts = Array.isArray(rawResult.practicalPoints) && rawResult.practicalPoints.length >= 2 && rawResult.practicalPoints.length <= 3
      ? rawResult.practicalPoints.map((p: any) => String(p).trim()).filter(Boolean)
      : defaultInfoPoints;
    rawResult.practicalPoints = pts.length >= 2 ? pts.slice(0, 3) : defaultInfoPoints;
    rawResult.noticeBox = rawResult.noticeBox || '';
    if (leaderScriptFromStoryboard) {
      rawResult.leaderNotes = leaderScriptFromStoryboard;
    }
  }

  // S. BILDEBIBELEN
  if (blockType === 'bildebibelen') {
    rawResult.title = cleanBlockTitle(rawResult.title || prompt || 'BildeBibelen', 'bildebibelen', language);
    rawResult.storyQuery = rawResult.storyQuery || prompt || sessionTitle || (language === 'nb' ? 'Den bortkomne sønnen' : 'Den bortkomne sonen');
    rawResult.scenes = Array.isArray(rawResult.scenes) ? rawResult.scenes : [];
    rawResult.durationMinutes = rawResult.durationMinutes || 7;
    if (leaderScriptFromStoryboard) {
      rawResult.leaderNotes = leaderScriptFromStoryboard;
    }
  }

  // Sikre at leiarmanus frå storyboard alltid er bevart på blokka
  if (leaderScriptFromStoryboard && !rawResult.leaderNotes) {
    rawResult.leaderNotes = leaderScriptFromStoryboard;
  }

  return rawResult;
}

const handleSingleBlockGenerateRequest = async (req: express.Request, res: express.Response) => {
  try {
    const rawLang = req.body?.language || req.body?.lang || 'nn';
    const rawResult = await generateBlockPayload({
      blockType: req.body?.blockType || 'tekst',
      prompt: req.body?.prompt || '',
      language: rawLang === 'nb' ? 'nb' : 'nn',
      targetGroup: req.body?.targetGroup || 'Ungdom',
      targetAudience: req.body?.targetAudience || '',
      sessionTitle: req.body?.sessionTitle || '',
      layout: req.body?.layout,
      artStyle: req.body?.artStyle,
      count: req.body?.count,
      itemCount: req.body?.itemCount,
      quizMode: req.body?.quizMode,
      questionCount: req.body?.questionCount,
      gridSize: req.body?.gridSize,
    });

    return res.json({ success: true, blockData: rawResult });
  } catch (err: any) {
    console.warn('[SingleBlock API] Feil ved generering:', err?.message);
    return res.status(200).json({ success: false, fallback: true, message: err?.message });
  }
};

app.post('/api/single-block/generate', handleSingleBlockGenerateRequest);
app.post('/api/generate-block', handleSingleBlockGenerateRequest);

// =========================================================================
// 1.7 REFINEMENT AV ENKELTBLOKK (AI-DRAWER / CHAT I SANNTID)
// =========================================================================

const refineBlockResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    replyMessage: {
      type: Type.STRING,
      description: 'Ei kort, hyggeleg og presis forklaring om kva du har endra eller forbetra i blokka.',
    },
    updatedDataJson: {
      type: Type.STRING,
      description: 'Eit gyldig JSON-serialisert objekt av heile den oppdaterte blokka (updatedData). Viktig: Behold alle eksisterande felt og eigenskapar som brukaren ikkje har bede om å endre.',
    },
    newImageQueries: {
      type: Type.ARRAY,
      description: 'Dersom brukaren ber om nye fotografi/bilete (for bilete eller lysbileteshow), oppgi søkeord for kvart bilde som skal hentast frå Pixabay.',
      items: {
        type: Type.OBJECT,
        properties: {
          slotIndex: { type: Type.INTEGER, description: '0-basert bildeindeks (0 for første bilde, 1 for andre, etc.)' },
          englishQuery: { type: Type.STRING, description: '2-4 spissa engelske søkeord for Pixabay' },
          caption: { type: Type.STRING, description: 'Valfri bildetekst' },
        },
        required: ['slotIndex', 'englishQuery'],
      },
    },
  },
  required: ['replyMessage', 'updatedDataJson'],
};

const handleRefineBlockRequest = async (req: express.Request, res: express.Response) => {
  try {
    const { blockType, currentData, instruction, chatHistory = [], sessionTitle = '' } = req.body;
    const cleanInstruction = (instruction || '').trim();
    const rawLang = req.body.lang || req.body.language || req.body.storyboard?.language || 'nn';
    const language: 'nn' | 'nb' = resolveLanguageFromRequest(rawLang, cleanInstruction);
    const langLabel = language === 'nb' ? 'bokmål' : 'nynorsk';

    console.log(`[RefineBlock API] Justerer blokk type="${blockType}", lang="${language}", instruks: "${cleanInstruction}"`);

    if (!cleanInstruction) {
      return res.status(400).json({ success: false, message: 'Ingen instruks oppgitt.' });
    }

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        message: 'Ingen GEMINI_API_KEY konfigurert på server.',
        updatedData: currentData,
        replyMessage: 'Kunne ikkje kontakte AI fordi API-nøkkel manglar på serveren.',
      });
    }

    const systemInstruction = `Du er ein dyktig, pedagogisk assistent for konfirmant- og ungdomsleiarar i Den norske kyrkja.
Brukaren har ei eksisterande undervisningsblokk av typen "${blockType}".
Målet ditt er å finjustere, utvide, omformulere eller forbetre denne blokka basert på brukarens nye instruks.

STRENGE REGLAR:
1. NON-DESTRUCTIVE: Du skal KUN endre det brukaren ber om eller som er ein direkte konsekvens av instruksen. BEHOLD ALLE ANDRE FELT NØYAKTIG SLIK DEI ER! Ikkje slett eksisterande data, spørsmål eller felt med mindre brukaren ber om det.
2. ${getLanguageInstruction(language)}
3. INNHALDSREGLAR ETTER TYPE:
   - 'bilete': Layout kan vere 1, 2 eller 4. Dersom brukaren ber om fleire bilete, eit anna layout eller eit nytt motiv, oppdater layout og legg inn spissa engelske søkeord i 'newImageQueries' (2-4 tags, t.d. "lost sheep desert", "sunset mountain cross").
   - 'samtale': Gjer spørsmål opne, ærlege og relevante for ungdomskvardagen på ${langLabel}. Unngå floskler.
   - 'kven_skal_ut': 4 alternativ (A, B, C, D) med logisk fasit (correctOption) og god pedagogisk forklaring på ${langLabel}.
   - 'quiz': Kvart spørsmål skal ha 'question', 'options' [A, B, C, D] (samt optionA..D), 'correctOption' ("A", "B", "C" eller "D" som peiker på det FAKTISK korrekte svaret) og 'explanation' (1–2 pedagogiske setningar på ${langLabel} om kvifor svaret er rett; teksten "Alternativ X er rett svar" er STRENGT FORBODE). Fordel fasit-bokstavane naturleg mellom A, B, C og D (aldri meir enn to like på rad).
   - 'bonn_dikt': Ærleg, varmt og poetisk språk på ${langLabel} utan klisjear. 'leaderNotes' er ei kort, munnleg innleiing FØR bøna, medan 'text' er KUN sjølve bønneteksten på storskjerm avslutta med "Amen.".
   - 'bibelord': Krystallklar feltdeling: 'reference'/'scriptureRef' er KUN bibeltilvising (f.eks. Lukas 15, 20), 'verseText'/'bibleText' er KUN ordrett bibeltekst (Bibel 2024 / 2011 ${langLabel}) for STORSKJERM (aldri leiar-notat), og 'explanation'/'notes'/'leaderNotes' er KUN leiarvising / utdjuping (aldri vise på storskjerm som bibeltekst).
   - 'stikkord': Konsise moment for storskjerm og gode, fyldige talernotatar for leiaren på ${langLabel}.
   - 'henteleik': Konkrete, gjenkjennelege gjenstandar på ${langLabel} som ungdommar kan finne i rommet eller blant eigedelane sine.
   - 'reis_deg': Alle påstandar i 'statements' SKAL starte med 'hvis...' eller 'dersom...' med liten forbokstav etter innleiingsordet (t.d. 'hvis du elskar å game!' eller 'dersom du har vore vaken heile natta'). Skriv ALDRI 'Reis deg' eller nummerering først i påstanden.
4. updatedDataJson MÅ vere ein gyldig JSON-streng som representerer heile det oppdaterte datobjektet for blokka.
5. replyMessage: Skriv 1–2 korte, hyggelege og oppmuntrande setningar på ${langLabel} om nøyaktig kva du har endra eller lagt til.`;

    const formattedHistory = Array.isArray(chatHistory) && chatHistory.length > 0
      ? chatHistory.map((m: any) => `${m.role === 'user' ? 'Brukar' : 'AI-assistent'}: ${m.text || m.content || ''}`).join('\n')
      : '';

    const promptText = `
HOVUDTEMA FOR SAMLINGA: ${sessionTitle || 'Kyrkjeleg ungdomssamling'}
BLOKKTYPE: ${blockType}

EKSISTERANDE DATA FOR DENNE BLOKKA:
${JSON.stringify(currentData, null, 2)}

${formattedHistory ? `TIDLEGARE SAMTALE OM DENNE BLOKKA:\n${formattedHistory}\n` : ''}

BRUKARENS NYE INSTRUKS:
"${cleanInstruction}"

Instruksjon: Oppdater blokka non-destruktivt i samsvar med instruksen. Behold alle andre felt intakt. Returner updatedDataJson, replyMessage og eventuelle newImageQueries.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: refineBlockResponseSchema,
        temperature: 0.4,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    let updatedData = { ...currentData };

    try {
      if (typeof parsed.updatedDataJson === 'string') {
        const decoded = JSON.parse(parsed.updatedDataJson);
        if (decoded && typeof decoded === 'object') {
          updatedData = { ...updatedData, ...decoded };
        }
      } else if (parsed.updatedDataJson && typeof parsed.updatedDataJson === 'object') {
        updatedData = { ...updatedData, ...parsed.updatedDataJson };
      }
    } catch (parseErr) {
      console.warn('[RefineBlock API] Feil ved parsing av updatedDataJson, nytta shallow merge:', parseErr);
    }

    // Handsam bilde-henting for 'bilete', 'bilde', 'lysbileteshow' og 'bilete_avdekking'
    if (blockType === 'bilete' || blockType === 'bilde') {
      const layout = parseInt(String(updatedData.layout || currentData.layout || 1), 10) || 1;
      updatedData.layout = layout;
      let imagesList = Array.isArray(updatedData.images) ? [...updatedData.images] : [];

      while (imagesList.length < layout) {
        imagesList.push({
          url: '',
          label: '',
          caption: '',
          englishQuery: '',
        });
      }

      // Sjekk om Gemini returnerte spesifikke nye søkeord i newImageQueries
      if (Array.isArray(parsed.newImageQueries) && parsed.newImageQueries.length > 0) {
        for (const item of parsed.newImageQueries) {
          const slot = typeof item.slotIndex === 'number' ? item.slotIndex : 0;
          if (slot >= 0 && slot < layout && item.englishQuery) {
            const hits = await searchPixabayPhotos(item.englishQuery, 4, 'general', slot);
            if (hits.length > 0) {
              const cachedUrl = await downloadAndCachePixabayImage(hits[0].url, 'ai');
              imagesList[slot] = {
                ...imagesList[slot],
                url: cachedUrl,
                label: item.caption || imagesList[slot]?.label || '',
                caption: item.caption || imagesList[slot]?.caption || '',
                englishQuery: item.englishQuery,
              };
            }
          }
        }
      }

      // Dersom layout vart utvida (t.d. frå 1 til 2 eller 4) og nokre slot-ar manglar bilete
      for (let i = 0; i < layout; i++) {
        if (!imagesList[i]?.url) {
          const q = imagesList[i]?.englishQuery || updatedData.englishSearchQuery || 'nature landscape calm';
          const hits = await searchPixabayPhotos(q, 4, 'general', i);
          if (hits.length > 0) {
            const cachedUrl = await downloadAndCachePixabayImage(hits[0].url, 'ai');
            imagesList[i] = {
              ...imagesList[i],
              url: cachedUrl,
              label: imagesList[i]?.label || '',
              caption: imagesList[i]?.caption || '',
            };
          }
        }
      }

      updatedData.images = imagesList.slice(0, layout);
    } else if (blockType === 'lysbileteshow') {
      if (Array.isArray(parsed.newImageQueries) && parsed.newImageQueries.length > 0) {
        const query = parsed.newImageQueries[0]?.englishQuery || 'peaceful nature landscape';
        const hits = await searchPixabayPhotos(query, 12, 'general');
        if (hits.length > 0) {
          updatedData.images = await Promise.all(
            hits.map(async (h, i) => ({
              id: `img_${Date.now()}_${i + 1}`,
              url: await downloadAndCachePixabayImage(h.url, 'ai'),
              caption: h.caption || '',
            }))
          );
        }
      } else if (updatedData.englishSearchQuery && updatedData.englishSearchQuery !== currentData.englishSearchQuery) {
        const hits = await searchPixabayPhotos(updatedData.englishSearchQuery, 12, 'general');
        if (hits.length > 0) {
          updatedData.images = await Promise.all(
            hits.map(async (h, i) => ({
              id: `img_${Date.now()}_${i + 1}`,
              url: await downloadAndCachePixabayImage(h.url, 'ai'),
              caption: h.caption || '',
            }))
          );
        }
      }
    } else if (blockType === 'bilete_avdekking') {
      updatedData.durationMinutes = 2;
      const q = (Array.isArray(parsed.newImageQueries) && parsed.newImageQueries[0]?.englishQuery) || updatedData.englishSearchQuery || updatedData.fasit || updatedData.title;
      if (q) {
        const hits = await searchPixabayPhotos(q, 4, 'guessing');
        if (hits.length > 0 && hits[0]?.url) {
          updatedData.imageUrl = sanitizeImageUrl(hits[0].url);
        }
      }
      updatedData.imageUrl = sanitizeImageUrl(updatedData.imageUrl);
    } else if (blockType === 'stikkord') {
      if (Array.isArray(updatedData.points) && updatedData.points.length > 0) {
        updatedData.stikkord = updatedData.points.map((p: any) => String(p?.keyword || p?.text || '').trim()).filter(Boolean);
      } else if (Array.isArray(updatedData.stikkord) && updatedData.stikkord.length > 0) {
        updatedData.points = updatedData.stikkord.map((kw: any, i: number) => ({
          id: `sp_${Date.now()}_${i + 1}`,
          keyword: String(kw).trim(),
          text: String(kw).trim(),
          leaderNotes: '',
          note: '',
        }));
      }
    } else if (blockType === 'quiz') {
      const rawQs = Array.isArray(updatedData.questions) && updatedData.questions.length > 0
        ? updatedData.questions
        : Array.isArray(updatedData.quizQuestions) && updatedData.quizQuestions.length > 0
        ? updatedData.quizQuestions
        : [];
      if (rawQs.length > 0) {
        const normQs = normalizeQuizQuestions(rawQs, updatedData.title || sessionTitle);
        updatedData.questions = normQs;
        updatedData.quizQuestions = normQs;
        updatedData.question = normQs[0].question;
        updatedData.optionA = normQs[0].optionA;
        updatedData.optionB = normQs[0].optionB;
        updatedData.optionC = normQs[0].optionC;
        updatedData.optionD = normQs[0].optionD;
        updatedData.correctOption = normQs[0].correctOption;
        updatedData.explanation = normQs[0].explanation;
      }
    } else if (blockType === 'reis_deg') {
      updatedData.title = updatedData.title || 'Reis deg';
      if (Array.isArray(updatedData.statements)) {
        updatedData.statements = updatedData.statements.map((st: any, idx: number) => {
          const rawText = (typeof st === 'object' && st ? st.statement || st.text : String(st)).trim();
          let cleanedText = rawText
            .replace(/^(\d+[.)]\s*|[-•*]\s*)/, '')
            .replace(/^reis\s+deg\s+(dersom|viss|hvis|om)?\s*/i, (_m: string, g: string) => (g ? `${g.toLowerCase()} ` : 'hvis '))
            .trim();
          if (!/^(hvis|dersom|viss|om)\s+/i.test(cleanedText)) {
            const lowerFirst = cleanedText.charAt(0).toLowerCase() + cleanedText.slice(1);
            cleanedText = `${language === 'nb' ? 'hvis' : 'dersom'} ${lowerFirst}`;
          } else {
            cleanedText = cleanedText.replace(
              /^(hvis|dersom|viss|om)\s+([A-ZÆØÅ])/i,
              (_m: string, intro: string, firstChar: string) => `${intro.toLowerCase()} ${firstChar.toLowerCase()}`
            );
          }
          return {
            id: (typeof st === 'object' && st?.id) || `rd_${Date.now()}_${idx + 1}`,
            statement: cleanedText,
          };
        });
      }
    }

    const replyMessage = (parsed.replyMessage || 'Eg har oppdatert blokka etter ønsket ditt!').trim();

    return res.json({
      success: true,
      updatedData,
      replyMessage,
    });
  } catch (err: any) {
    console.error('[RefineBlock API] Feil under generering:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Feil under justering av blokk.',
      updatedData: req.body?.currentData,
      replyMessage: 'Det oppstod ein uventa feil ved kontakt med AI. Prøv igjen.',
    });
  }
};

app.post('/api/gemini/refine-block', handleRefineBlockRequest);
app.post('/api/teaching-block/refine', handleRefineBlockRequest);

// =========================================================================
// 1.8 STORYBOARD STUDIO & REGI (GENERATE, REFINE & BUILD BLOCKS)
// =========================================================================

const storyboardSectionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    durationMinutes: { type: Type.INTEGER, description: 'Tidsbruk i minutt (f.eks. 5)' },
    blockType: {
      type: Type.STRING,
      enum: ['stikkord', 'tekst', 'undervisning', 'bibelord', 'informasjon', 'bonn_dikt', 'samtale', 'sang_salme', 'henteleik', 'kims_leik', 'reis_deg', 'bilete_avdekking', 'bilete', 'bilde', 'lysbileteshow', 'bildebibelen', 'video', 'quiz', 'beat_for_beat', 'ord_for_ord', 'kven_skal_ut', 'svart_skjerm'],
      description: 'Typen byggestein for denne bolken',
    },
    title: { type: Type.STRING, description: 'Tittel på bolken' },
    bigScreenSummary: { type: Type.STRING, description: 'Kort oppsummering av kva storskjermen viser (1-2 linjer)' },
    leaderScript: { type: Type.STRING, description: 'Munnleg leiarmanus, overgangar og tips for aktiviteten (2-4 linjer på vald målform)' },
  },
  required: ['blockType', 'title', 'durationMinutes', 'bigScreenSummary', 'leaderScript'],
};

const storyboardResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Tittel på heile samlinga' },
    subtitle: { type: Type.STRING, description: 'Målgruppe og tidsramme, f.eks. "Konfirmantar • 45 minutt"' },
    targetGroup: { type: Type.STRING, description: 'Målgruppe, f.eks. Konfirmantar (14–15 år)' },
    targetDurationMinutes: { type: Type.INTEGER, description: 'Total tidsramme i minutt' },
    language: { type: Type.STRING, enum: ['nn', 'nb'], description: 'Vald målform: nn (nynorsk) eller nb (bokmål)' },
    redThread: {
      type: Type.STRING,
      description: 'Kjernebodskap i samlinga: ALLTID éi enkelt, klar og konsis setning (under 20 ord). Unngå lange, innskotne setningar med mange komma og oppramsingar.',
    },
    theologicalBackground: {
      type: Type.STRING,
      description: 'Teologisk og fagleg bakgrunn for leiaren (3-5 setningar sakprosa om temaet, bibelteksten si historiske/teologiske ramme, gjerne basert på kildedokument eller bibeltekst).',
    },
    pedagogicalTips: {
      type: Type.STRING,
      description: 'Pedagogiske tips, fallgruver og gode innfallsvinklar for målgruppa (3-5 setningar om kva som kan vere krevjande med dette temaet, og korleis møte det på ein trygg og engasjerande måte).',
    },
    sections: {
      type: Type.ARRAY,
      items: storyboardSectionSchema,
      description: 'Bolkar i dramaturgisk rekkjefølgje',
    },
  },
  required: ['title', 'redThread', 'sections'],
};

// =========================================================================
// 1.8.0 AI-ASSISTANSE I TEMAFELTET ("FÅ IDÉAR")
// =========================================================================

const themeIdeasResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    ideas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Kort, fengande tittel på vinklinga (3–6 ord)' },
          angle: { type: Type.STRING, description: 'Kort skildring av vinklinga (t.d. Identitet, Vennegjeng, Kvardagsdilemma, Nåde)' },
          promptText: { type: Type.STRING, description: 'Ferdig formulert bestillingstekst (1–2 setningar) som kan fyllast rett inn i hovudfeltet' },
        },
        required: ['title', 'angle', 'promptText'],
      },
      description: '3 til 4 konkrete, engasjerande vinklingar tilpassa målgruppa',
    },
  },
  required: ['ideas'],
};

app.post('/api/storyboard/theme-ideas', async (req, res) => {
  const rawTopic = (req.body.topic || req.body.prompt || '').trim();
  const targetGroup = (req.body.targetGroup || 'Konfirmantar (14–15 år)').trim();
  const explicitLang = req.body.lang || req.body.language;
  const language: 'nn' | 'nb' =
    explicitLang === 'nb'
      ? 'nb'
      : explicitLang === 'nn'
      ? 'nn'
      : resolveLanguageFromRequest(explicitLang || 'nn', rawTopic);
  const langLabel = language === 'nb' ? 'bokmål' : 'nynorsk';
  const topicText = rawTopic || (language === 'nb' ? 'Tro, fellesskap og å høre til' : 'Tru, fellesskap og å høyre til');

  const fallbackIdeas = language === 'nb'
    ? [
        {
          title: 'Vennegjeng og tilhørighet',
          angle: 'Vennekrets',
          promptText: `${topicText} – vinklet mot vennskap, frykten for å falle utenfor, og hvordan Gud alltid holder døren åpen for oss.`,
        },
        {
          title: 'Å drite seg ut og få en ny sjanse',
          angle: 'Nåde & Tilgivelse',
          promptText: `${topicText} – om følelsen av å ha gjort feil, vanskelige unnskyldninger i hverdagen, og nåde som en helt ny start.`,
        },
        {
          title: 'Hvem er jeg når ingen ser meg?',
          angle: 'Identitet',
          promptText: `${topicText} – vinklet mot identitet, press på sosiale medier, og det å være elsket akkurat som man er.`,
        },
        {
          title: 'Vanskelige valg i hverdagen',
          angle: 'Hverdagsdilemma',
          promptText: `${topicText} – utforsket gjennom konkrete hverdagsdilemmaer på skolen og fritiden, med lek, bildegåte og ærlig samtale.`,
        },
      ]
    : [
        {
          title: 'Vennegjeng og å høyre til',
          angle: 'Vennekrins',
          promptText: `${topicText} – vinkla mot vennskap, frykta for å falle utanfor, og korleis Gud alltid held døra open for oss.`,
        },
        {
          title: 'Å dumme seg ut og få ein ny sjanse',
          angle: 'Nåde & Tilgjeving',
          promptText: `${topicText} – om kjensla av å ha gjort feil, vanskelege unnskyldningar i kvardagen, og nåde som ein heilt ny start.`,
        },
        {
          title: 'Kven er eg når ingen ser meg?',
          angle: 'Identitet',
          promptText: `${topicText} – vinkla mot identitet, press på sosiale medium, og det å vere elska akkurat slik ein er.`,
        },
        {
          title: 'Vanskelege val i kvardagen',
          angle: 'Kvardagsdilemma',
          promptText: `${topicText} – utforska gjennom konkrete kvardagsdilemma på skulen og fritida, med leik, biletgåte og ærleg samtale.`,
        },
      ];

  try {
    if (!apiKey) {
      return res.json({ success: true, ideas: fallbackIdeas });
    }

    const systemInstruction = `Du er ein kreativ og erfaren ungdomsarbeidar, kateket og prest i Den norske kyrkja.
Brukaren ønskjer 4 konkrete, engasjerande vinklingar på temaet/bibelteksten "${topicText}" tilpassa målgruppa "${targetGroup}".

${getLanguageInstruction(language)}

REGLAR FOR FORSLAGA:
1. Lag nøyaktig 4 ulike, livsnære vinklingar (til dømes vinkla mot: 1. Identitet/sjølvbilete, 2. Vennekrins/fellesskap, 3. Kvardagsdilemma/val, 4. Nåde/ny sjanse).
2. 'title': Kort, fengande overskrift (3–6 ord) på ${langLabel}.
3. 'angle': Eitt eller to ord som beskriver vinklinga (t.d. "${language === 'nb' ? 'Identitet", "Vennekrets", "Hverdagsdilemma", "Nåde' : 'Identitet", "Vennekrins", "Kvardagsdilemma", "Nåde'}").
4. 'promptText': Ei konkret, inspirerande bestilling (1–2 setningar på ${langLabel}) som brukaren kan sette rett inn i temafeltet for å generere eit spennande undervisningsopplegg.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ text: `Gi 4 engasjerande vinklingar på "${topicText}" for målgruppa "${targetGroup}" på ${langLabel}.` }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: themeIdeasResponseSchema,
        temperature: 0.5,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const ideas = Array.isArray(parsed.ideas) && parsed.ideas.length > 0 ? parsed.ideas.slice(0, 4) : fallbackIdeas;
    return res.json({ success: true, ideas });
  } catch (err: any) {
    console.warn('[ThemeIdeas API] Feil, nyttar fallbackIdeas:', err?.message);
    return res.json({
      success: true,
      ideas: fallbackIdeas,
    });
  }
});

app.post('/api/storyboard/generate', async (req, res) => {
  try {
    const { prompt = '', targetGroup = 'Konfirmantar (14–15 år)', targetDuration = 45, sourceDocuments, pastedSourceText } = req.body;
    const rawLang = req.body.lang || req.body.language || req.body.storyboard?.language || 'nn';
    const language: 'nn' | 'nb' = resolveLanguageFromRequest(rawLang, prompt);
    const langLabel = language === 'nb' ? 'bokmål' : 'nynorsk';
    console.log('[Storyboard API] Generating Storyboard for prompt:', prompt, 'targetGroup:', targetGroup, 'targetDuration:', targetDuration, 'language:', language);

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'Ingen GEMINI_API_KEY konfigurert på server.',
      });
    }

    const systemInstruction = `Du er ein erfaren, teologisk klok og pedagogisk regi-assistent for Den norske kyrkja.
Di oppgåve er å lage eit visuelt STORYBOARD OG LEIARHEFTE for ei samling for målgruppa '${targetGroup}' med total tidsramme på ca. ${targetDuration} minutt.

${getLanguageInstruction(language)}

OBLIGATORISK DRAMATURGISK FORMEL OG VARIASJON I BYGGJEKLOSSAR:
- FORBOD MOT EINSFORMIGE FORELESINGSREKKJER: Det er STRENGT FORBODE å lage tørre, einsformige oppramsingar som berre består av Stikkord → Bibelord → Samtale → Bøn! Du SKAL ta aktivt i bruk heile spekteret av aktivitets- og konkurranseklossar.
- Du SKAL følgje denne obligatoriske 5-stegs dramaturgiske kurva for samlinga:
  1. AKTIVERANDE START (ALLTID bolk 1): Samlinga MÅ ALLTID starte med ein engasjerande leik eller isbrytar: vel '${'reis_deg'}', '${'henteleik'}' eller '${'kven_skal_ut'}'.
  2. NYSGJERRIGHEIT / VISUELT ANKER (bolk 2): Bruk ei biletgåte ('${'bilete_avdekking'}'), '${'quiz'}' eller '${'kims_leik'}' direkte knytt til kveldens tema/bibeltekst for å skape nysgjerrigheit og fokus.
  3. FOKUSERT FORMIDLING (midtbolk, 1–2 klossar): Bruk '${'stikkord'}' på skjerm med 3–4 korte, konkrete munnlege stikkord (2–5 ord kvar) kopla til eit folkeleg, naturleg leiarmanus (maks 2–3 korte setningar), gjerne kombinert med '${'bibelord'}' eller '${'bildebibelen'}'.
  4. INVOLVERING / SAMTALE: Bruk '${'samtale'}'-klossen med 2 konkrete, opne spørsmål som engasjerer ungdommane personleg (to-og-to eller smågrupper).
  5. AVRUNDING (siste bolk): Kort, livsnær '${'bonn_dikt'}' (bøn) eller roleg avslutning.

STRENGE REGLAR FOR AKTIVITETAR OG FLEIRE BILETEAVDEKKINGAR:
- STRENG REGEL: Ein 'bilete_avdekking'-kloss kan KUN vise eitt bilete og éin fasit!
- Dersom brukaren ber om fleire runder med bileteavdekking (t.d. "tre bileteavdekkingar på rad" eller 3 biletgåter), SKAL storyboardet generere éin eigen, separat seksjon for kvar runde ('${language === 'nb' ? 'Bilde-avdekking 1' : 'Bilete-avdekking 1'}', '${language === 'nb' ? 'Bilde-avdekking 2' : 'Bilete-avdekking 2'}', '${language === 'nb' ? 'Bilde-avdekking 3' : 'Bilete-avdekking 3'}'), kvar med sitt eige konkrete motiv/fasit i 'bigScreenSummary' og 'leaderScript'. Det er STRENGT FORBODE å slå saman fleire bilete i éin seksjon!
- Biletlenker: Dersom du ikkje har ei garantert gyldig biletlenke (Unsplash eller liknande), la eventuelle biletlenker vere tom streng (""). Sett ALDRI fiktive '/cached-images/...'-stiar!

REALISTISKE TIDSBRUK-ESTIMAT ('durationMinutes'):
- 'bilete_avdekking': 2 min per kloss (1.5–2 min per kloss – ALDRI 8 minutt for éin kloss!).
- 'kims_leik' / 'henteleik': 2–3 min.
- 'reis_deg' / 'kven_skal_ut': 2–4 min.
- 'quiz': 1–1.5 min per spørsmål (maks 4–6 min for 3–4 spørsmål).
- 'stikkord' / kort undervisning ('tekst'): 2–4 min.
- 'samtale' i grupper: 5–8 min.
- 'bonn_dikt' / 'bibelord' / avslutning ('informasjon'): 1–2 min.
- 'svart_skjerm': 0 min.

KUTT UT AI-KLISJEAR – KORTE STIKKORD OG FOLKELEG, ENKELT MANUS:
- For 'stikkord'-klossar: Oppgi 3–4 konkrete, munnlege stikkord på 2–5 ord kvar i 'bigScreenSummary' (som ved blokkbygging fyller 'points' med 3–4 konkrete stikkord).
- I 'leaderScript' (manus): Skriv 2–3 korte, munnlege setningar på ${langLabel}, akkurat som ein ungdomsleiar som pratar i eit kyrkjerom – ikkje svulstig AI-prosa eller filosofiske klisjear!

REGLAR FOR STORYBOARDET:
1. KJERNEBODSKAP ('redThread'): Kjernebodskapen skal ALLTID vere éi enkelt, klar og konsis setning (under 20 ord) på 100 % konsekvent ${langLabel}. Unngå lange, innskotne setningar med mange komma og oppramsingar.
1b. LEIARFØREBUING ('theologicalBackground' og 'pedagogicalTips'):
   - 'theologicalBackground': Skriv ein fyldig og reflektert teologisk og fagleg bakgrunn (4–6 setningar sakprosa) på ${langLabel} om temaet og bibelteksten si historiske og teologiske ramme, som leiaren les heime for å vere fagleg trygg.
   - 'pedagogicalTips': Skriv konkrete pedagogiske tips, fallgruver og gode innfallsvinklar (4–6 setningar sakprosa) på ${langLabel} om kva som kan vere krevjande for målgruppa med dette temaet, og korleis leiaren møter det på ein varm og inkluderande måte.
STRENG REGEL FOR SAMTALE OG REFLEKSJON:
Dersom ein bolk handlar om at ungdommane skal snakke saman, reflektere to-og-to, drøfte spørsmål i grupper eller svare på opne refleksjonsspørsmål, SKAL DU ALLTID VELJE BLOCKTYPE 'samtale'! Det er STRENGT FORBODE å velje 'tekst' eller 'stikkord' til samtaleøkter. 'tekst'-klossen skal KUN nyttast til korte munnlege sitat, anker for ei forteljing eller ein kort, konsis bodskap (maks 1–3 setningar).

2. FULL BLOKKATALOG FOR VAL AV RETT BLOKKTYPE:
   FASTE BYGGJESTEINAR:
   - 'stikkord': Munnleg undervisning med 3–4 konkrete kulepunkt (2–5 ord kvar) på storskjerm og folkeleg, kort leiarmanus (2–3 setningar, 2–4 min).
   - 'tekst': KUN for korte munnlege sitat, anker for ei forteljing eller ein kort, konsis bodskap (maks 1–3 setningar, 2–4 min). BRUK ALDRI 'tekst' for samtale, gruppediskusjon eller to-og-to-spørsmål!
   - 'bibelord': Vers frå Bibelen (Bibel 2024/2011 på ${langLabel}) for storskjerm med referanse (1–2 min).
   - 'bilete': 1, 2 eller 4 faste bilete med eller utan bildetekst (2–3 min).
   - 'lysbileteshow': Rullande fotoserie med Ken Burns-effekt (2–3 min).
   - 'bildebibelen': Teikneserie frå FreeBibleImages med leiarmanus (f.eks. Den bortkomne sonen, 4–6 min).
   - 'video': Videoklipp med spelar (3–5 min).
   - 'svart_skjerm': Svart skjerm / pause. SKAL ALLTID HA durationMinutes: 0 som standard!
   - 'bonn_dikt': Bøn eller veksellesing ('leaderScript' skal vere ei kort munnleg innleiing FØR bøna, 1–2 min).
   - 'sang_salme': ALLTID når ein skal synge, lytte til musikk eller ha song (3–4 min).
   - 'samtale': ALLTID når ungdommane skal ha samtale, diskusjon i grupper eller to-og-to-spørsmål om 2 opne, engasjerande spørsmål (5–8 min).
   - 'informasjon': Praktiske punkt, tider og hugs-boks (1–2 min).

   AKTIVITETSBANKEN:
   - 'bilete_avdekking': (Biletgåte / bileteavdekking, 2 min per kloss). Eit bilete er dekt av 100 ruter som gradvis forsvinn medan deltakarane gjettar motivet. Kvar runde MÅ vere sin eigen kloss!
   - 'henteleik': Fysisk leik der lag spring og finn 6 gjenstandar i rommet (2–3 min).
   - 'kims_leik': Hugseleik der 16 gjenstandar vert viste i 30 sekund (2–3 min).
   - 'reis_deg': Interaktiv stand-up påstand-aktivitet der påstandane startar med '${language === 'nb' ? 'hvis...' : 'dersom...'}' (2–4 min).

   KONKURRANSEBANKEN:
   - 'quiz': Fleirvalsquiz med spørsmål og svaralternativ A–D (1–1.5 min per spørsmål, maks 4–6 min for 3–4 spørsmål).
   - 'kven_skal_ut': Fire ord/omgrep der eitt skil seg ut, med forklaring (2–4 min).
   - 'beat_for_beat': Avdekk songtekst ord for ord (3–4 min).
   - 'ord_for_ord': Avdekk bibelvers eller sitat ord for ord (3–4 min).

3. FOR KVAR BOLK, OPPGI PÅ 100 % KONSEKVENT ${langLabel.toUpperCase()}:
   - blockType: gyldig kloss-type frå katalogen over
   - title: Tittel på bolken på ${langLabel}
   - durationMinutes: Realistisk tidsbruk i minutt etter reglane over (0 for svart_skjerm)
   - bigScreenSummary: Kort, tydeleg oppsummering på ${langLabel} om kva storskjermen viser (for 'stikkord': 3–4 korte stikkord på 2–5 ord kvar; for 'bilete_avdekking': kva dette eine biletet førestiller)
   - leaderScript: Folkeleg, enkelt og naturleg munnleg leiarmanus på ${langLabel} (maks 2–3 korte setningar, utan svulstige filosofiske spørsmål)`;

    const contentParts: any[] = [];
    const textSources: string[] = [];

    const docsList = Array.isArray(sourceDocuments) ? sourceDocuments : [];
    for (const doc of docsList) {
      if (doc.base64Data && doc.type) {
        contentParts.push({ inlineData: { mimeType: doc.type, data: doc.base64Data } });
      } else if (doc.textContent) {
        textSources.push(`KILDE: "${doc.name || 'Dokument'}":\n${doc.textContent}`);
      }
    }

    if (pastedSourceText && pastedSourceText.trim()) {
      textSources.push(`INNLIMT KILDETEKST:\n${pastedSourceText.trim()}`);
    }

    let finalPrompt = prompt?.trim() || (language === 'nb'
      ? `Lag et storyboard og lederhefte for en ungdomskveld på ${targetDuration} minutter.`
      : `Lag eit storyboard og leiarhefte for ein ungdomskveld på ${targetDuration} minutt.`);
    if (textSources.length > 0) {
      finalPrompt = `${textSources.join('\n\n====================\n\n')}\n\n====================\nBRUKARENS BESTILLING:\n${finalPrompt}`;
    }

    contentParts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contentParts,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: storyboardResponseSchema,
        temperature: 0.4,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    
    // Beregn sequential timeRanges og sørg for at fleire bileteavdekkingar alltid er separate blokker med realistisk tid
    let currentMin = 0;
    const rawSections = expandMultiRoundBileteAvdekkingSections(
      Array.isArray(parsed.sections) ? parsed.sections : [],
      finalPrompt,
      language
    );
    const processedSections = rawSections.map((sec: any, idx: number) => {
      const normSecType = resolveSectionBlockType(sec.blockType, sec.title, sec.bigScreenSummary, sec.leaderScript);
      const isBlack = normSecType === 'svart_skjerm';
      const dur = clampRealisticBlockDuration(normSecType, sec.durationMinutes);

      let timeRange = '';
      if (isBlack && dur === 0) {
        timeRange = 'Pause / Svart skjerm';
      } else {
        const startStr = String(currentMin).padStart(2, '0');
        currentMin += dur;
        const endStr = String(currentMin).padStart(2, '0');
        timeRange = `${startStr}–${endStr} min`;
      }

      return {
        id: sec.id || `sec_${Date.now()}_${idx + 1}`,
        timeRange,
        durationMinutes: dur,
        blockType: normSecType,
        title: cleanBlockTitle(sec.title || `Bolk ${idx + 1}`, normSecType, language),
        bigScreenSummary: sec.bigScreenSummary || 'Visning på storskjerm',
        leaderScript: sec.leaderScript || (language === 'nb' ? 'Ledermanus og veiledning for denne bolken.' : 'Leiarmanus og rettleiing for denne bolken.'),
      };
    });

    const storyboardData = {
      title: cleanBlockTitle(parsed.title || 'Ungdomssamling', undefined, language),
      subtitle: parsed.subtitle || `${targetGroup} • ${currentMin} ${language === 'nb' ? 'minutter' : 'minutt'}`,
      targetGroup: parsed.targetGroup || targetGroup,
      targetDurationMinutes: currentMin,
      language: language === 'nb' ? 'nb' : 'nn',
      redThread: cleanCoreMessage(parsed.redThread || parsed.coreMessage || parsed.mainMessage, language),
      theologicalBackground: parsed.theologicalBackground || '',
      pedagogicalTips: parsed.pedagogicalTips || '',
      sections: processedSections,
    };

    return res.json({
      success: true,
      storyboard: storyboardData,
    });
  } catch (err: any) {
    console.error('[Storyboard API] Feil ved generering:', err);
    return res.status(200).json({
      success: false,
      fallback: true,
      message: err?.message || 'Kunne ikkje generere storyboard.',
    });
  }
});

// =========================================================================
// 1.8.1 MÅLRETTA AI-JUSTERING AV ÉI ENKELT STORYBOARD-BLOKK (RAD-NIVÅ)
// =========================================================================

const adjustStoryboardBlockSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    replyMessage: {
      type: Type.STRING,
      description: 'Kort forklaring (1 setning) på kva som vart oppdatert i denne klossen.',
    },
    updatedSection: storyboardSectionSchema,
  },
  required: ['replyMessage', 'updatedSection'],
};

app.post('/api/storyboard/adjust-block', async (req, res) => {
  try {
    const {
      storyboard,
      currentStoryboard,
      sectionIndex,
      sectionId,
      section,
      instruction = '',
    } = req.body;

    const activeBoard = storyboard || currentStoryboard;
    const cleanInstruction = String(instruction || '').trim();
    const rawLang = req.body.lang || req.body.language || activeBoard?.language || 'nn';
    const language: 'nn' | 'nb' = resolveLanguageFromRequest(rawLang, cleanInstruction);
    const langLabel = language === 'nb' ? 'bokmål' : 'nynorsk';

    if (!activeBoard || !Array.isArray(activeBoard.sections)) {
      return res.status(400).json({ success: false, message: 'Mangler gyldig storyboard.' });
    }

    const idx = typeof sectionIndex === 'number' && sectionIndex >= 0 && sectionIndex < activeBoard.sections.length
      ? sectionIndex
      : activeBoard.sections.findIndex((s: any) => s.id === sectionId || s.id === section?.id);

    if (idx < 0 || idx >= activeBoard.sections.length) {
      return res.status(400).json({ success: false, message: 'Fann ikkje den valde klossen i storyboardet.' });
    }

    const targetSection = section || activeBoard.sections[idx];

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        message: 'Ingen GEMINI_API_KEY konfigurert på server.',
        updatedStoryboard: activeBoard,
      });
    }

    const systemInstruction = `Du er ein pedagogisk regi-assistent for Den norske kyrkja.
Leiaren vil justere KUN ÉIN SPESIFIKK KLOSS (bolk nr. ${idx + 1} av ${activeBoard.sections.length}) i storyboardet "${activeBoard.title || 'Samling'}" for målgruppa "${activeBoard.targetGroup || 'Konfirmantar'}".
Kjernebodskap for samlinga: "${activeBoard.redThread || ''}".

${getLanguageInstruction(language)}

REGLAR FOR OPPDATERING AV DENNE ENKELTKLOSSEN:
1. Du skal KUN oppdatere denne eine klossen (updatedSection) basert på brukarens ønske: "${cleanInstruction}".
2. Dersom brukaren ber om ein spesifikk leik eller kloss (t.d. "Byt til Kims leik" -> blockType: 'kims_leik', "Byt til quiz" -> blockType: 'quiz', "Reis deg" -> blockType: 'reis_deg', "Henteleik" -> blockType: 'henteleik', "Kven skal ut" -> blockType: 'kven_skal_ut', "Biletgåte" -> blockType: 'bilete_avdekking') eller "Gjer meir interaktiv / legg til leik", vel rett blockType frå katalogen ('reis_deg', 'henteleik', 'kven_skal_ut', 'bilete_avdekking', 'kims_leik', 'quiz', 'beat_for_beat', 'ord_for_ord', 'samtale', 'bildebibelen', 'stikkord', 'bibelord', 'bonn_dikt', 'sang_salme', 'bilete', 'lysbileteshow').
3. Dersom brukaren ber om innhaldsendring (t.d. "Gjer quizen meir krevjande", "Fokuser meir på tilgiving", eller "Gjer leiarmanus enklare og meir munnleg"), oppdater 'title', 'bigScreenSummary' og 'leaderScript' slik at ønsket kjem tydeleg og konkret fram.
4. STRENG REGEL FOR SAMTALE OG REFLEKSJON: Dersom ein bolk handlar om at ungdommane skal snakke saman, reflektere to-og-to, drøfte spørsmål i grupper eller svare på opne refleksjonsspørsmål, SKAL DU ALLTID VELJE BLOCKTYPE 'samtale'! Det er STRENGT FORBODE å velje 'tekst' eller 'stikkord' til samtaleøkter. 'tekst'-klossen skal KUN nyttast til korte munnlege sitat, anker for ei forteljing eller ein kort, konsis bodskap (maks 1–3 setningar).
5. Sørg for at 'title', 'blockType', 'durationMinutes', 'bigScreenSummary' og 'leaderScript' heng naturleg saman og er på 100 % konsekvent ${langLabel}.`;

    const promptText = `
NOVERANDE KLOSS (Bolk ${idx + 1}):
${JSON.stringify(targetSection, null, 2)}

KONTEKST (Andre klossar i storyboardet):
${activeBoard.sections.map((s: any, i: number) => `${i + 1}. [${s.blockType}] ${s.title} (${s.durationMinutes} min)`).join('\n')}

LEIARENS ØNSKE FOR DENNE KLOSSEN:
"${cleanInstruction}"

Returner updatedSection og replyMessage på ${langLabel}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: adjustStoryboardBlockSchema,
        temperature: 0.4,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const rawUpdated = parsed.updatedSection || targetSection;
    const normType = resolveSectionBlockType(
      rawUpdated.blockType || targetSection.blockType,
      rawUpdated.title || targetSection.title,
      rawUpdated.bigScreenSummary || targetSection.bigScreenSummary,
      rawUpdated.leaderScript || targetSection.leaderScript
    );
    const dur = clampRealisticBlockDuration(normType, rawUpdated.durationMinutes ?? targetSection.durationMinutes);

    const nextSections = activeBoard.sections.map((sec: any, i: number) => {
      if (i !== idx) return sec;
      return {
        ...sec,
        id: sec.id || `sec_${Date.now()}_${i + 1}`,
        blockType: normType,
        title: cleanBlockTitle(rawUpdated.title || sec.title, normType, language),
        durationMinutes: dur,
        bigScreenSummary: rawUpdated.bigScreenSummary || sec.bigScreenSummary,
        leaderScript: rawUpdated.leaderScript || sec.leaderScript,
      };
    });

    // Re-beregn timeRanges for alle bolkar slik at tidslinja heng saman
    let currentMin = 0;
    const recalculatedSections = nextSections.map((sec: any) => {
      const secType = normalizeBlockType(sec.blockType);
      const secBlack = secType === 'svart_skjerm';
      const secDur = clampRealisticBlockDuration(secType, sec.durationMinutes);

      let timeRange = '';
      if (secBlack && secDur === 0) {
        timeRange = 'Pause / Svart skjerm';
      } else {
        const startStr = String(currentMin).padStart(2, '0');
        currentMin += secDur;
        const endStr = String(currentMin).padStart(2, '0');
        timeRange = `${startStr}–${endStr} min`;
      }
      return {
        ...sec,
        blockType: secType,
        durationMinutes: secDur,
        timeRange,
      };
    });

    const updatedStoryboard = {
      ...activeBoard,
      language,
      targetDurationMinutes: currentMin,
      sections: recalculatedSections,
    };

    return res.json({
      success: true,
      updatedSection: recalculatedSections[idx],
      updatedStoryboard,
      replyMessage: parsed.replyMessage || (language === 'nb' ? 'Klossen ble oppdatert!' : 'Klossen vart oppdatert!'),
    });
  } catch (err: any) {
    console.error('[Storyboard AdjustBlock API] Feil:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Kunne ikkje justere klossen.',
    });
  }
});

const refineStoryboardResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    replyMessage: {
      type: Type.STRING,
      description: 'Ei kort, hyggeleg og presis forklaring om kva du har endra i storyboardet.',
    },
    updatedStoryboardJson: {
      type: Type.STRING,
      description: 'Eit gyldig JSON-serialisert objekt av heile det oppdaterte storyboardet (inkl. language: "nn" | "nb").',
    },
  },
  required: ['replyMessage', 'updatedStoryboardJson'],
};

const handleRefineStoryboardRequest = async (req: express.Request, res: express.Response) => {
  try {
    const { currentStoryboard, instruction, chatHistory = [] } = req.body;
    const cleanInstruction = (instruction || '').trim();
    const rawLang = req.body.lang || req.body.language || currentStoryboard?.language || req.body.storyboard?.language || 'nn';
    const language: 'nn' | 'nb' = resolveLanguageFromRequest(rawLang, cleanInstruction);
    const langLabel = language === 'nb' ? 'bokmål' : 'nynorsk';

    console.log(`[Storyboard Refine API] Instruks: "${cleanInstruction}", lang: "${language}"`);

    if (!cleanInstruction) {
      return res.status(400).json({ success: false, message: 'Ingen instruks oppgitt.' });
    }

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        message: 'Ingen GEMINI_API_KEY konfigurert på server.',
        updatedStoryboard: currentStoryboard,
        replyMessage: 'Kunne ikkje kontakte AI fordi API-nøkkel manglar på serveren.',
      });
    }

    const systemInstruction = `Du er ein dyktig regi-assistent for Den norske kyrkja som hjelper ein leiar med å justere eit storyboard for ei ungdomssamling.
Du får det noverande storyboardet og brukarens nye instruks.

${getLanguageInstruction(language)}

REGLAR FOR JUSTERING, BLOKKTYPAR OG SVARTE SKJERMAR:
1. NON-DESTRUCTIVE: Endre KUN det brukaren ber om (f.eks. korta ned tidsbruk, byta ut ein aktivitet, fokusere meir på eit tema, eller bytte målform). Behold uendrede bolkar slik dei er!
2. BEREGN TIMING PÅ NYTT: Oppdater durationMinutes og timeRange på alle bolkar så rekkjefølgja og tidsbruken framleis henger saman.
3. REGLAR FOR SVARTE SKJERMAR (svart_skjerm):
   - 'svart_skjerm' SKAL ALLTID HA durationMinutes: 0 med mindre brukaren eksplisitt ber om eit spesifikt minuttall for ein svart skjerm.
   - Dersom brukaren i chat ber om: "Legg svart skjerm mellom kvar blokk" eller "Fjern minutta på dei svarte skjermane", SKAL AI ALDRI fjerne sjølve blokkene! Den skal behalde eller setje inn svarte skjermar med durationMinutes: 0.
   - Ingen av dei eksisterande innhaldsblokkene skal miste si opphavlege tid eller verte korta ned på grunn av svarte skjermar med 0 minutt.
4. REGLAR FOR BLOKKTYPAR I HEILE KATALOGEN:
   FASTE BYGGJESTEINAR:
   - 'stikkord': Munnleg undervisning med 3–6 trinnvise kulepunkt på storskjerm.
   - 'tekst': KUN til korte munnlege sitat, anker for ei forteljing eller ein kort, konsis bodskap (maks 1–3 setningar).
   - 'bibelord': Vers frå Bibelen for storskjerm med referanse.
   - 'bilete': 1, 2 eller 4 faste bilete med eller utan bildetekst.
   - 'lysbileteshow': Rullande fotoserie med Ken Burns-effekt.
   - 'bildebibelen': Teikneserie frå FreeBibleImages med leiarmanus.
   - 'video': Videoklipp med spelar.
   - 'svart_skjerm': Pause / storskjerm av (0 minutt standard).
   - 'bonn_dikt': Bøn eller veksellesing ('leaderScript' skal vere ei kort munnleg innleiing FØR bøna).
   - 'sang_salme': ALLTID når ein skal synge, lytte til musikk eller ha song. ALDRI bruk 'stikkord' for musikk!
   - 'samtale': ALLTID når ungdommane skal snakke saman to-og-to eller i grupper.
   - 'informasjon': Praktiske punkt, tider og hugs-boks.

   STRENG REGEL FOR SAMTALE OG REFLEKSJON: Dersom ein bolk handlar om at ungdommane skal snakke saman, reflektere to-og-to, drøfte spørsmål i grupper eller svare på opne refleksjonsspørsmål, SKAL DU ALLTID VELJE BLOCKTYPE 'samtale'! Det er STRENGT FORBODE å velje 'tekst' eller 'stikkord' til samtaleøkter. 'tekst'-klossen skal KUN nyttast til korte munnlege sitat, anker for ei forteljing eller ein kort, konsis bodskap (maks 1–3 setningar).

   AKTIVITETSBANKEN:
   - 'bilete_avdekking': (Kaos-puslespill / bileteavdekking). Eit bilete er dekt av ruter (100) som gradvis forsvinn medan deltakarane gjettar kva motivet er innen 30 sek. Inneheld fasit/solution, hint og Pixabay-søkeord.
   - 'henteleik': Fysisk leik der lag spring og finn 6 gjenstandar i rommet.
   - 'kims_leik': Hugseleik der 12–20 gjenstandar vert viste i 30 sekund.
   - 'reis_deg': Interaktiv stand-up påstand-aktivitet. I klossen 'Reis deg' skal alle påstandar starte med 'hvis...' eller 'dersom...' (til dømes 'hvis du elskar å game!' eller 'dersom du har vore vaken heile natta'), sidan overskrifta 'Reis deg' allereie står fast på storskjermen.

   KONKURRANSEBANKEN:
   - 'quiz': Fleirvalsquiz med 1–10 spørsmål og svaralternativ A–D.
   - 'kven_skal_ut': Fire ord/omgrep der eitt skil seg ut, med forklaring.
   - 'beat_for_beat': Avdekk songtekst ord for ord.
   - 'ord_for_ord': Avdekk bibelvers eller sitat ord for ord.
5. Dersom brukaren i chat ber om «omsett til bokmål» / «skriv på bokmål», skal du omsetje innhaldet i storyboardet til bokmål og sette "language": "nb" i updatedStoryboardJson (og tilsvarande "language": "nn" dersom brukaren ber om nynorsk).
6. Returner updatedStoryboardJson som ein JSON-streng med heile det oppdaterte storyboard-objektet (title, subtitle, targetGroup, targetDurationMinutes, language, redThread, theologicalBackground, pedagogicalTips, sections).
7. replyMessage: 1–2 korte, opne setningar på ${langLabel} om kva du har justert.`;

    const formattedHistory = Array.isArray(chatHistory) && chatHistory.length > 0
      ? chatHistory.map((m: any) => `${m.role === 'user' ? 'Brukar' : 'AI-assistent'}: ${m.text || m.content || ''}`).join('\n')
      : '';

    const promptText = `
NOVERANDE STORYBOARD:
${JSON.stringify(currentStoryboard, null, 2)}

${formattedHistory ? `TIDLEGARE CHAT:\n${formattedHistory}\n` : ''}

BRUKARENS INSTRUKS:
"${cleanInstruction}"

Oppdater storyboardet i samsvar med instruksen.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: refineStoryboardResponseSchema,
        temperature: 0.4,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    let updatedStoryboard = { ...currentStoryboard };

    try {
      if (typeof parsed.updatedStoryboardJson === 'string') {
        const decoded = JSON.parse(parsed.updatedStoryboardJson);
        if (decoded && typeof decoded === 'object') {
          updatedStoryboard = decoded;
        }
      } else if (parsed.updatedStoryboardJson && typeof parsed.updatedStoryboardJson === 'object') {
        updatedStoryboard = parsed.updatedStoryboardJson;
      }
    } catch (parseErr) {
      console.warn('[Storyboard Refine API] Parsing feilet, nytta fallback:', parseErr);
    }

    updatedStoryboard.language = updatedStoryboard.language === 'nb' || language === 'nb' ? 'nb' : 'nn';

    // Re-beregn timeRanges for alle seksjonar (svarte skjermar med 0 minutt aukar ikkje currentMin)
    let currentMin = 0;
    if (Array.isArray(updatedStoryboard.sections)) {
      const expandedSections = expandMultiRoundBileteAvdekkingSections(
        updatedStoryboard.sections,
        cleanInstruction,
        updatedStoryboard.language
      );
      updatedStoryboard.sections = expandedSections.map((sec: any, idx: number) => {
        const normSecType = resolveSectionBlockType(sec.blockType, sec.title, sec.bigScreenSummary, sec.leaderScript);
        const isBlack = normSecType === 'svart_skjerm';
        const dur = clampRealisticBlockDuration(normSecType, sec.durationMinutes);

        let timeRange = '';
        if (isBlack && dur === 0) {
          timeRange = 'Pause / Svart skjerm';
        } else {
          const startStr = String(currentMin).padStart(2, '0');
          currentMin += dur;
          const endStr = String(currentMin).padStart(2, '0');
          timeRange = `${startStr}–${endStr} min`;
        }

        return {
          ...sec,
          id: sec.id || `sec_${Date.now()}_${idx + 1}`,
          blockType: normSecType,
          title: cleanBlockTitle(sec.title || `Bolk ${idx + 1}`, normSecType, updatedStoryboard.language),
          timeRange,
          durationMinutes: dur,
        };
      });
      updatedStoryboard.targetDurationMinutes = currentMin;
    }
    if (updatedStoryboard.redThread) {
      updatedStoryboard.redThread = cleanCoreMessage(updatedStoryboard.redThread, updatedStoryboard.language);
    }

    const replyMessage = (parsed.replyMessage || (language === 'nb' ? 'Jeg har oppdatert storyboardet etter ønsket ditt!' : 'Eg har oppdatert storyboardet etter ønsket ditt!')).trim();

    return res.json({
      success: true,
      updatedStoryboard,
      replyMessage,
    });
  } catch (err: any) {
    console.error('[Storyboard Refine API] Feil:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Feil ved justering av storyboard.',
      updatedStoryboard: req.body?.currentStoryboard,
      replyMessage: 'Det oppstod ein feil under justering. Prøv igjen.',
    });
  }
};

app.post('/api/storyboard/refine', handleRefineStoryboardRequest);
app.post('/api/storyboard/chat', handleRefineStoryboardRequest);

function normalizeBlockType(raw: string): string {
  const t = (raw || '').toLowerCase().trim();
  if (!t) return 'stikkord';

  // 1. bilete_avdekking: avdekk, bileteavdekking, bilete-avdekking, bildeavdekking, bilde-avdekking, puslespill, kaos, kaos-puslespill
  if (
    t.includes('avdekk') ||
    t.includes('puslespill') ||
    t.includes('kaos') ||
    t.includes('bildeavdekking') ||
    t.includes('bileteavdekking') ||
    t === 'bilete_avdekking' ||
    t === 'bilde_avdekking'
  ) {
    return 'bilete_avdekking';
  }

  // 2. kims_leik: kims, kims_leik, kimsleik, kimslek, hukommelse, huskeleik, huskeleker
  if (t.includes('kims') || t.includes('hukommelse') || t.includes('huskeleik') || t === 'kims_leik') {
    return 'kims_leik';
  }

  // 3. reis_deg: reis_deg, reisdeg, reis, standup, stand_up, paastand, påstand
  if (t.includes('reis') || t.includes('standup') || t.includes('stand_up') || t.includes('paastand') || t.includes('påstand') || t === 'reis_deg') {
    return 'reis_deg';
  }

  // 4. beat_for_beat: beat_for_beat, beatforbeat, beat, songtekst, sangtekst
  if (t.includes('beat') || t === 'beat_for_beat') {
    return 'beat_for_beat';
  }

  // 5. ord_for_ord: ord_for_ord, ordforord
  if (t.includes('ord_for_ord') || t.includes('ordforord') || (t.includes('ord') && t.includes('avdekk'))) {
    return 'ord_for_ord';
  }

  // 6. kven_skal_ut: kven_skal_ut, kvenskalut, hvem_skal_ut, hvemskalut, skal_ut, odd_one_out
  if (t.includes('kven') || t.includes('hvem') || t.includes('skal_ut') || t.includes('skalut') || t === 'kven_skal_ut') {
    return 'kven_skal_ut';
  }

  // 7. henteleik: hente, henteløp, henteleik, hentelek
  if (t.includes('hente') || t === 'henteleik') {
    return 'henteleik';
  }

  // 8. song_salme: song, salme, sang, musikk, lovsang, sang_salme
  if (t.includes('song') || t.includes('sang') || t.includes('salme') || t.includes('lovsang') || t === 'sang_salme') {
    return 'sang_salme';
  }

  // 9. bonn_dikt: bøn, bønn, dikt, bonn, bonn_dikt, veksellesing
  if (t.includes('bøn') || t.includes('bønn') || t.includes('dikt') || t.includes('bonn') || t === 'bonn_dikt') {
    return 'bonn_dikt';
  }

  // 10. bildebibelen: bildebibel, bildebibelen, freebible, freebibleimages
  if (t.includes('bildebibel') || t.includes('freebible') || t === 'bildebibelen') {
    return 'bildebibelen';
  }

  // 11. lysbileteshow: slideshow, lysbilete, lysbilde, lysbildeshow, lysbileteshow
  if (t.includes('slideshow') || t.includes('lysbilete') || t.includes('lysbilde') || t === 'lysbileteshow') {
    return 'lysbileteshow';
  }

  // 12. bilete / bilde: bilete, bilde, foto, fotografi, illustrasjon
  if (t.includes('bilde') || t.includes('bilete') || t.includes('foto') || t === 'bilete') {
    return 'bilete';
  }

  // 13. bibelord: bibel, bibeltekst, bibelvers, bibelsitat, scripture, bibelord
  if (t.includes('bibel') || t.includes('skriftord') || t === 'bibelord') {
    return 'bibelord';
  }

  // 14. samtale: samtale, drøfting, diskusjon, refleksjon, gruppesamtale
  if (t.includes('samtale') || t.includes('drøfting') || t.includes('diskusjon') || t === 'samtale') {
    return 'samtale';
  }

  // 15. svart_skjerm: svart, mørk, pause, blackout, pause_skjerm, svart_skjerm
  if (t.includes('svart') || t.includes('pause') || t.includes('blackout') || t.includes('mørk') || t === 'svart_skjerm') {
    return 'svart_skjerm';
  }

  // 16. informasjon: info, informasjon, praktisk, tider, beskjed
  if (t.includes('info') || t === 'informasjon') {
    return 'informasjon';
  }

  // 17. video: video, film, videoklipp
  if (t.includes('video') || t.includes('film') || t === 'video') {
    return 'video';
  }

  // 18. quiz: quiz, spørrekonkurranse, rebus
  if (t.includes('quiz') || t.includes('rebus') || t === 'quiz') {
    return 'quiz';
  }

  // 19. lek / konkurranse
  if (t === 'lek') return 'lek';
  if (t === 'konkurranse') return 'konkurranse';

  // 20. tekst / undervisning / stikkord
  if (t.includes('tekst') || t === 'forteljing' || t === 'sitat') return 'tekst';
  if (t.includes('undervisning') || t.includes('stikkord') || t.includes('poeng')) return 'stikkord';

  return 'stikkord';
}

app.post('/api/storyboard/build-blocks', async (req, res) => {
  try {
    const { storyboard } = req.body;
    const language: 'nn' | 'nb' = (req.body.lang || req.body.language || storyboard?.language) === 'nb' ? 'nb' : 'nn';
    console.log('[Storyboard API] Byggjer blokker sekvensielt med felles generateBlockPayload (language:', language, ')...');

    if (!storyboard || !Array.isArray(storyboard.sections)) {
      return res.status(400).json({ success: false, message: 'Ingen gyldig storyboard oppgitt.' });
    }

    const sessionTitle = cleanBlockTitle(
      storyboard.title || (language === 'nb' ? 'Samling fra storyboard' : 'Samling frå storyboard'),
      undefined,
      language
    );
    const subtitle = storyboard.subtitle || '';
    const targetGroup = storyboard.targetGroup || (language === 'nb' ? 'Konfirmanter (14 år)' : 'Konfirmantar (14 år)');
    const sections = storyboard.sections;

    const generatedBlocks: any[] = [];

    // Gå igjennom kvar seksjon sekvensielt og kall felles generateBlockPayload
    for (let idx = 0; idx < sections.length; idx++) {
      const sec = sections[idx] || {};
      const leaderScript = (sec.leaderScript || '').trim();
      const bigScreenSummary = (sec.bigScreenSummary || '').trim();
      const type = resolveSectionBlockType(sec.blockType || 'stikkord', sec.title, bigScreenSummary, leaderScript);
      const dur = clampRealisticBlockDuration(type, sec.durationMinutes);

      const cleanedSecTitle = cleanBlockTitle(sec.title || `Bolk ${idx + 1}`, type, language);

      const blockData = await generateBlockPayload({
        blockType: type,
        prompt: type === 'bilete_avdekking' ? `${sec.title || ''} ${bigScreenSummary}`.trim() || cleanedSecTitle : cleanedSecTitle,
        language: storyboard.language || language || 'nn',
        sessionTitle,
        targetGroup,
        leaderScriptFromStoryboard: leaderScript,
        bigScreenSummary,
        durationMinutes: dur,
      });

      blockData.durationMinutes = dur;
      if (leaderScript && !blockData.leaderNotes) {
        blockData.leaderNotes = leaderScript;
      }

      generatedBlocks.push({
        id: `block_${type}_${Date.now()}_${idx + 1}`,
        type,
        isExpanded: idx === 0,
        leaderNotes: blockData.leaderNotes || leaderScript,
        data: blockData,
      });
    }

    return res.json({
      success: true,
      title: sessionTitle,
      subtitle,
      blocks: generatedBlocks,
    });
  } catch (err: any) {
    console.error('[Storyboard Build API] Feil:', err);
    return res.status(200).json({
      success: false,
      fallback: true,
      message: err?.message || 'Feil ved bygging av blokker.',
    });
  }
});

// =========================================================================
// 1.9 LEIARMANUS 2-STEGS SKAPINGSFLYT (SKRIV MANUS -> BYGG BLOKKER)
// =========================================================================

app.post('/api/manuscript/generate', async (req, res) => {
  try {
    const { prompt, sourceDocuments, pastedSourceText } = req.body;
    const rawLang = req.body.language || req.body.storyboard?.language || 'nn';
    const language: 'nn' | 'nb' = resolveLanguageFromRequest(rawLang, prompt);
    console.log('[Manuscript API] Generating Leader Manuscript for prompt:', prompt, 'language:', language);

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'Ingen GEMINI_API_KEY konfigurert på server.',
      });
    }

    const systemInstruction = `Du er ein inspirerande, teologisk klok og munnleg undervisar, prest og kateket i Den norske kyrkja.
Oppgåva di er å skrive eit levande, munnleg LEIARMANUS for ei samling med konfirmantar og ungdommar.

${getLanguageInstruction(language)}

REGLAR FOR LEIARMANUSET:
1. Skriv i eit direkte, varmt, munnleg og engasjerande språk — akkurat slik ein leiar snakkar og fortel til ungdommane i rommet.
2. Flett inn forslag til aktivitetar, storskjermvisningar og samtale direkte i teksten ved hjelp av hakepar / vinkelklammer, f.eks.:
   - [SKJERM: Bibelord - Luk 15, 11-24] (Sitér alltid ordrett tekst frå Bibel 2024, subsidiært 2011; aldri 1978/85)
   - [AKTIVITET: Henteleiken med 6 symbolske gjenstandar: Bibel, Nøkkel, Hjarte, Lys, Vann, Brød]
   - [SAMTALE: 2 refleksjonsspørsmål om tilgiving og nye sjansar]
   - [STIKKORD: Kva vil det si å tru?]
   - [QUIZ: 3 spørsmål om temaet]
   - [BØNN: Samlingsbønn]
3. Del opp manuset i tydelege avsnitt med gode overskrifter (mål, innleiing, forteljing, utdjuping, refleksjonsrunde, avslutning).
4. Bruk informasjon frå eventuelle opplasta kjelder eller innlimte kjeldetekstar dersom dei er oppgitte.`;

    const contentParts: any[] = [];
    const textSources: string[] = [];

    const docsList = Array.isArray(sourceDocuments) ? sourceDocuments : [];
    for (const doc of docsList) {
      if (doc.base64Data && doc.type) {
        contentParts.push({
          inlineData: { mimeType: doc.type, data: doc.base64Data },
        });
      } else if (doc.textContent) {
        textSources.push(`KILDE: "${doc.name || 'Dokument'}":\n${doc.textContent}`);
      }
    }

    if (pastedSourceText && pastedSourceText.trim()) {
      textSources.push(`INNLIMT KILDETEKST:\n${pastedSourceText.trim()}`);
    }

    let finalPrompt = prompt?.trim() || 'Skriv eit munnleg undervisningsmanus for konfirmantar om trua, nåden og fellesskapet.';
    if (textSources.length > 0) {
      finalPrompt = `${textSources.join('\n\n====================\n\n')}\n\n====================\nBRUKARENS TEMA / INNSPILL:\n${finalPrompt}`;
    }

    contentParts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contentParts,
      config: {
        systemInstruction,
        maxOutputTokens: 8192,
        temperature: 0.5,
      },
    });

    const manuscriptText = response.text?.trim() || '';
    return res.json({
      success: true,
      manuscript: manuscriptText,
    });
  } catch (err: any) {
    console.warn('[Manuscript API] Feil ved generering av manus:', err?.message);
    return res.status(200).json({
      success: false,
      fallback: true,
      message: err?.message || 'Kunne ikkje generere manus',
    });
  }
});

app.post('/api/manuscript/build-blocks', async (req, res) => {
  try {
    const { manuscriptText } = req.body;
    console.log('[Manuscript API] Building blocks from edited manuscript text...');

    if (!manuscriptText || !manuscriptText.trim()) {
      return res.status(400).json({ success: false, message: 'Ingen manustekst sendt inn.' });
    }

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'Ingen GEMINI_API_KEY konfigurert på server.',
      });
    }

    const systemInstruction = `Du er ein teologisk og pedagogisk byggjeassistent for Den norske kyrkja. Du får eit ferdig redigert leiarmanus for ei undervisningssamling med konfirmantar eller ungdommar.

OPPGÅVA DI:
Les heile manuset nøyaktig. Ekstraher og opprett alle dei naudsynte blokkene på arbeidsbordet i heilt rett pedagogisk rekkjefølgje:
- Viss manuset har [SKJERM: Bibelord ...] eller siterer bibeltekstar -> opprett 'bibelord'-blokk med scriptureRef, bibleText, keyVerse og reflectionQuestion. KRAV TIL BIBELUTGÅVE: Teksten SKAL vere ordrett henta frå Det Norske Bibelselskap si offisielle nynorskomsetjing: primært Bibel 2024, subsidiært Bibel 2011. Det er strengt forbode å bruke Bibel 1978/85, 1938 eller eldre omsetjingar!
- Viss manuset har [AKTIVITET: Henteleiken ...] -> opprett 'henteleik'-blokk med dei gjenstandane manuset foreslo.
- Viss manuset har [SAMTALE ...] -> opprett 'samtale'-blokk med tema, organisering ('To-og-to'|'Smågrupper'|'Plenum') og dei eksakte spørsmåla.
- Viss manuset har [STIKKORD ...] eller undervisningsnotat -> opprett 'stikkord' eller 'undervisning'-blokk med kulepunkt og detaljerte leiar-notatar henta rett frå teksten i manuset.
- Viss manuset har [QUIZ ...] eller konkurranse -> opprett 'quiz' eller 'konkurranse'-blokk.
- Viss manuset har [BØNN ...] -> opprett 'bonn_dikt'-blokk.
- Legg inn heile eller delar av manusteksten i leaderNotes for kvar enkelt blokk slik at leiaren kjenner seg igjen!`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ text: `Bygg ut alle blokker frå dette godkjende leiarmanuset:\n\n${manuscriptText}` }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: teachingSessionResponseSchema,
        maxOutputTokens: 8192,
        temperature: 0.3,
      },
    });

    const text = response.text?.trim() || '{}';
    let rawResult: any = {};
    try { rawResult = JSON.parse(text); } catch { rawResult = {}; }

    const title = rawResult.title || 'Samling frå leiarmanus';
    const subtitle = rawResult.subtitle || 'Konfirmantar / Ungdom';
    const blocks = Array.isArray(rawResult.blocks) ? rawResult.blocks : [];

    const generatedBlocks = blocks.map((b: any, idx: number) => {
      const type = b.type || 'undervisning';
      const id = `block_${type}_${Date.now()}_${idx + 1}`;
      let blockData = {
        ...b,
        durationMinutes: typeof b.durationMinutes === 'number' ? b.durationMinutes : 8,
      };

      if (type === 'video') {
        blockData.videoUrl = '';
        blockData.suggestedYouTubeUrl = '';
        blockData.leaderNotes = '«(Set inn eiga videolenke på arbeidsbordet)»';
      } else if (type === 'sang_salme') {
        blockData.songText = '';
        blockData.verses = [];
        blockData.leaderNotes = '«(Set inn eiga salmetekst på arbeidsbordet)»';
      } else if (type === 'samtale') {
        blockData.durationMinutes = typeof blockData.durationMinutes === 'number' ? Math.min(10, Math.max(5, blockData.durationMinutes)) : 7;
        let qs = Array.isArray(blockData.reflectionQuestions)
          ? blockData.reflectionQuestions.map((q: any) => String(q).trim()).filter(Boolean)
          : [];
        if (qs.length === 0) {
          qs = [
            'Er det lett eller vanskeleg å seie unnskyld når du har dumma deg ut?',
            'Kva skal til for at du tilgjev ein ven som har svikta deg?',
          ];
        }
        blockData.reflectionQuestions = qs.slice(0, 3);
      }

      return {
        id,
        type,
        isExpanded: idx === 0,
        data: blockData,
      };
    });

    return res.json({
      success: true,
      title,
      subtitle,
      blocks: generatedBlocks,
    });
  } catch (err: any) {
    console.warn('[Manuscript API] Feil ved bygging av blokker:', err?.message);
    return res.status(200).json({
      success: false,
      fallback: true,
      message: err?.message || 'Feil ved bygging av blokker',
    });
  }
});

// =========================================================================
// 2. VISIONARY SLIDES GENERATOR (STØTTE FOR BAKOVERKOMPATIBILITET)
// =========================================================================

const visionarySlideSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      enum: ['undervisning', 'salme', 'quiz', 'interaktiv'],
      description: 'Typen slide: undervisning, salme, quiz eller interaktiv',
    },
    title: { type: Type.STRING, description: 'Hovedtittel for sliden' },
    subtitle: { type: Type.STRING, description: 'Undertittel eller ingress' },
    bodyText: { type: Type.STRING, description: 'Hovedtekst eller bibelsitat' },
    scriptureRef: { type: Type.STRING, description: 'Bibelreferanse' },
    items: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Kulepunkter' },
    speakerNotes: { type: Type.STRING, description: 'Muntlig manus for lederen' },
    speakerBullets: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Stikkordsliste' },
    estimatedMinutes: { type: Type.INTEGER, description: 'Tid i minutter' },
  },
  required: ['type', 'title'],
};

const visionaryResponseSchema: Schema = {
  type: Type.ARRAY,
  items: visionarySlideSchema,
  description: 'Liste over strukturerte slides',
};

app.post('/api/visionary/generate', async (req, res) => {
  try {
    const { prompt, currentSlides, insertMode, sourceDocuments, pastedSourceText } = req.body;
    
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'Ingen GEMINI_API_KEY konfigurert på server.',
      });
    }

    const systemInstruction = `Du er en pedagogisk assistent for Den norske kirke som lager visninger og undervisning for ungdom.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ text: prompt || 'Lag ei samling for ungdom' }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: visionaryResponseSchema,
        maxOutputTokens: 8192,
        temperature: 0.4,
      },
    });

    const text = response.text?.trim() || '[]';
    let rawSlides: any[] = [];
    try {
      rawSlides = JSON.parse(text);
    } catch {
      rawSlides = [];
    }

    const generatedSlides = rawSlides.map((s: any, idx: number) => ({
      id: `slide_${Date.now()}_${idx + 1}`,
      type: s.type || 'undervisning',
      order: idx + 1,
      title: s.title || 'Slide',
      content: {
        title: s.title || 'Slide',
        subtitle: s.subtitle,
        bodyText: s.bodyText,
        items: s.items,
        speakerNotes: s.speakerNotes || '',
        speakerBullets: s.speakerBullets || [],
        estimatedMinutes: s.estimatedMinutes || 5,
      },
      createdAt: new Date().toISOString(),
    }));

    return res.json({
      success: true,
      slides: generatedSlides,
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      fallback: true,
      message: err?.message || 'Gemini feil',
    });
  }
});

// =========================================================================
// 3. SERVER OPPSTART & VITE MIDDLEWARE
// =========================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Undervisningsbyggjar server køyrer på http://0.0.0.0:${port}`);
  });
}

startServer();