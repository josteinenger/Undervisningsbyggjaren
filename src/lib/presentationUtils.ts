/**
 * src/lib/presentationUtils.ts
 * Verktøy for dynamisk fontskalering og berekning av PowerPoint-ekvivalent punktstorleik
 * for storskjermvising av «Tekst» og «Bibelord».
 */

export interface SlideTextScale {
  charCount: number;
  estimatedPt: number;
  isUnderWarningThreshold: boolean; // true dersom estimatedPt <= 36
  cssClass: string;
  lineHeightClass: string;
}

export function calculateSlideTextScale(
  text: string = '',
  hasSubtitleOrRef: boolean = false
): SlideTextScale {
  const trimmed = (text || '').trim();
  const charCount = trimmed.length;

  if (charCount === 0) {
    return {
      charCount: 0,
      estimatedPt: 70,
      isUnderWarningThreshold: false,
      cssClass: 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[5.5rem] font-extrabold',
      lineHeightClass: 'leading-[1.12]',
    };
  }

  // Tilleggsvekt dersom det òg er ei tilvising (scriptureRef) eller undertittel på same skjerm
  const effectiveLength = hasSubtitleOrRef ? charCount + 45 : charCount;

  let estimatedPt: number;
  let cssClass: string;
  let lineHeightClass: string;

  if (effectiveLength <= 80) {
    // 1-2 korte linjer: maksimal PowerPoint-storleik (~70 pt tak)
    estimatedPt = 70;
    cssClass = 'text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[6.25rem] font-extrabold';
    lineHeightClass = 'leading-[1.10]';
  } else if (effectiveLength <= 200) {
    // 2-3 linjer: ca. 65 pt
    estimatedPt = 65;
    cssClass = 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[5.5rem] font-bold';
    lineHeightClass = 'leading-[1.14]';
  } else if (effectiveLength <= 400) {
    // 3-5 linjer: ca. 58 pt
    estimatedPt = 58;
    cssClass = 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[4.75rem] font-bold';
    lineHeightClass = 'leading-[1.18]';
  } else if (effectiveLength <= 650) {
    // 5-8 linjer (som slektstavla i Matt 1, ca. 635 teikn): ca. 50-52 pt
    // Fyller storskjermen fantastisk frå topp til tå og venstre til høgre!
    estimatedPt = 52;
    cssClass = 'text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[4.0rem] font-semibold';
    lineHeightClass = 'leading-[1.22]';
  } else if (effectiveLength <= 950) {
    // 8-12 linjer: ca. 42-44 pt
    estimatedPt = 42;
    cssClass = 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[3.35rem] font-medium';
    lineHeightClass = 'leading-[1.26]';
  } else if (effectiveLength <= 1350) {
    // Faller under 36 pt (tilsvarer ca. 32-34 pt) -> UTLEYS VARSEL PÅ ARBEIDSBORDET
    estimatedPt = 34;
    cssClass = 'text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-[2.65rem] font-normal';
    lineHeightClass = 'leading-[1.30]';
  } else if (effectiveLength <= 1900) {
    // ca. 28 pt
    estimatedPt = 28;
    cssClass = 'text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-[2.1rem] font-normal';
    lineHeightClass = 'leading-[1.32]';
  } else if (effectiveLength <= 2600) {
    // ca. 22 pt
    estimatedPt = 22;
    cssClass = 'text-base sm:text-lg md:text-xl lg:text-2xl xl:text-[1.7rem] font-normal';
    lineHeightClass = 'leading-relaxed';
  } else if (effectiveLength <= 3500) {
    // ca. 18 pt
    estimatedPt = 18;
    cssClass = 'text-sm sm:text-base md:text-lg lg:text-xl xl:text-[1.4rem] font-normal';
    lineHeightClass = 'leading-relaxed';
  } else {
    // Ekstremt lang tekst: inga nedre fysisk sperre, skalerer jamt vidare ned
    estimatedPt = Math.max(8, Math.round(18 - (effectiveLength - 3500) / 400));
    cssClass = 'text-xs sm:text-xs md:text-sm lg:text-base xl:text-[1.1rem] font-normal';
    lineHeightClass = 'leading-normal';
  }

  return {
    charCount,
    estimatedPt,
    isUnderWarningThreshold: estimatedPt <= 36,
    cssClass,
    lineHeightClass,
  };
}

/**
 * Sjekkar om ein tekststreng berre er eit rått kamera- eller filnamnmønster
 * (t.d. IMG 7690, IMG_7690, DSC_0012, PHOTO-12, bilde.jpg, heic, png osv.)
 */
export function isRawFileName(text?: string): boolean {
  if (!text || !text.trim()) return true;
  const t = text.trim();
  return (
    /^(IMG[_\s-]?\d+|DSC[_\s-]?\d+|PHOTO[_\s-]?\d+|IMAGE[_\s-]?\d+|\d{8}[_\s-]?\d+)/i.test(t) ||
    /\.(jpe?g|png|webp|heic|heif|svg|gif)$/i.test(t)
  );
}

/**
 * Returnerer rein bildetekst dersom brukaren har skrive reelt innhald.
 * Dersom teksten er tom eller berre eit filnamn, returnerast ein tom streng.
 */
export function getCleanCaption(caption?: string): string {
  if (!caption || isRawFileName(caption)) return '';
  return caption.trim();
}
