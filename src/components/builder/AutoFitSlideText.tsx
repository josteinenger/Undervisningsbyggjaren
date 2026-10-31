/**
 * src/components/builder/AutoFitSlideText.tsx
 * Dynamisk fontskalering som automatisk fyller heile skjermen (topp til tå og venstre til høgre)
 * basert på faktisk tilgjengeleg behaldarstorleik (ResizeObserver + binærsøk).
 * 
 * - Øvre tak: ~70 pt (~94px)
 * - Inga nedre fysisk grense
 * - Balansert tekstbryting (text-balance)
 * - Støtte for hovudtekst (Tekst eller Bibelvers) pluss valfri tilvising/undertittel
 */
import React, { useRef, useLayoutEffect, useState } from 'react';

interface AutoFitSlideTextProps {
  text: string;
  subtitle?: string;
  isVerse?: boolean;
  isSong?: boolean;
  preserveLineBreaks?: boolean;
  handwriteEffect?: boolean;
  handwriteKey?: string;
  align?: 'center' | 'left';
  className?: string;
  textColorClass?: string;
  fontWeightClass?: string;
  lineHeightMultiplier?: number;
  maxPt?: number; // standard 70 pt (~94px)
  fontFamily?: string;
}

export const AutoFitSlideText: React.FC<AutoFitSlideTextProps> = ({
  text,
  subtitle,
  isVerse = false,
  isSong = false,
  preserveLineBreaks = false,
  align = 'center',
  className = '',
  textColorClass = 'text-stone-50',
  fontWeightClass = 'font-bold',
  lineHeightMultiplier = 1,
  maxPt = 70,
  fontFamily,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const subRef = useRef<HTMLDivElement>(null);

  // Rens eksisterande gåsaugo i teksten før vising
  const cleanText = (text || '').trim().replace(/^[«"]\s*/, '').replace(/\s*[»"]$/, '');
  const renderText = isVerse ? `«${cleanText}»` : text;

  // Line count og kompresjonsbehov
  const rawLines = (renderText || '').split('\n');
  const lineCount = rawLines.length;
  const hasExplicitLineBreaks = Boolean(isSong || preserveLineBreaks);
  const isMultiLineOrDense = lineCount > 4 || (renderText || '').length > 200;

  const getComputedLineHeight = (sizePx: number) => {
    let baseLh = 1.2;
    if (isMultiLineOrDense) {
      if (sizePx > 60) baseLh = 1.08;
      else if (sizePx > 40) baseLh = 1.12;
      else baseLh = 1.15;
    } else if (sizePx > 70) {
      baseLh = 1.12;
    } else if (sizePx > 45) {
      baseLh = 1.16;
    }
    return Number((baseLh * lineHeightMultiplier).toFixed(2));
  };

  // Initial estimert fontstorleik for å unngå FOUT før useLayoutEffect
  const [fontSizePx, setFontSizePx] = useState<number>(() => {
    const len = (renderText || '').trim().length;
    if (len <= 80) return 92;
    if (len <= 200) return 80;
    if (len <= 400) return 68;
    if (len <= 750) return 56;
    if (len <= 1100) return 44;
    return 32;
  });

  const [lineHeightVal, setLineHeightVal] = useState<number>(() => getComputedLineHeight(fontSizePx));
  const [subSizePx, setSubSizePx] = useState<number>(28);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const performFit = () => {
      const contWidth = container.clientWidth;
      const contHeight = container.clientHeight;
      if (contWidth <= 20 || contHeight <= 20) return;

      const subEl = subRef.current;
      const hasSub = !!subtitle;
      
      // Reserver plass for undertittel/tilvising
      const subReservedHeight = hasSub ? Math.max(72, contHeight * 0.15) : 0;
      
      const widthRatio = 0.98;
      const maxAllowedWidth = Math.max(100, contWidth * widthRatio);
      const maxAllowedHeight = Math.max(60, contHeight * 0.92 - subReservedHeight);

      // Berekne PowerPoint-pt proporsjonalt med skjermhøgda:
      // Standard 16:9 / 16:10 lysbilete er 540 pt høgt. 70 pt utgjer ~13 % av skjermhøgda.
      const ptToPxRatio = contHeight / 540;
      const maxCeilingPx = Math.max(90, Math.round(maxPt * ptToPxRatio));
      const minCeilingPx = 8;

      textEl.style.width = '100%';
      textEl.style.maxWidth = `${maxAllowedWidth}px`;
      if (fontFamily) {
        textEl.style.fontFamily = fontFamily;
      }

      let best = minCeilingPx;

      // Dersom det er song/salme eller faste linjeskift: prøv først å finne største fontstorleik
      // der ingen av dei faste verselinjene brekk over på ei ekstra rad.
      if (hasExplicitLineBreaks) {
        let lowNoWrap = minCeilingPx;
        let highNoWrap = maxCeilingPx;
        let bestNoWrap = minCeilingPx;

        for (let i = 0; i < 12; i++) {
          const mid = (lowNoWrap + highNoWrap) / 2;
          const lh = getComputedLineHeight(mid);
          textEl.style.fontSize = `${mid}px`;
          textEl.style.lineHeight = `${lh}`;

          // Forventa maksimal høgd dersom kvar linje i teksten held seg på éi rad:
          const expectedSingleLineHeight = (lineCount + 0.42) * mid * lh;
          const noLineWrapped = textEl.scrollHeight <= expectedSingleLineHeight;
          const fitsBox = textEl.scrollHeight <= maxAllowedHeight && textEl.scrollWidth <= maxAllowedWidth + 4;

          if (fitsBox && noLineWrapped) {
            bestNoWrap = mid;
            lowNoWrap = mid + 0.5;
          } else {
            highNoWrap = mid - 0.5;
          }
        }

        // Bruk linje-bevarande storleik så sant teksten framleis er godt leseleg (>= 24px)
        if (bestNoWrap >= 24) {
          best = bestNoWrap;
        }
      }

      // Dersom ikkje song/linjebevaring slo inn (eller ei linje er unormalt lang), køyr standard binærsøk
      if (best <= minCeilingPx) {
        let low = minCeilingPx;
        let high = maxCeilingPx;

        for (let i = 0; i < 10; i++) {
          const mid = (low + high) / 2;
          const lh = getComputedLineHeight(mid);
          textEl.style.fontSize = `${mid}px`;
          textEl.style.lineHeight = `${lh}`;

          const fits = textEl.scrollHeight <= maxAllowedHeight && textEl.scrollWidth <= maxAllowedWidth + 4;
          if (fits) {
            best = mid;
            low = mid + 0.5; // prøv endå større for å utnytte heile arealet
          } else {
            high = mid - 0.5; // for stort, skaler ned
          }
        }
      }

      const finalLh = getComputedLineHeight(best);
      setFontSizePx(best);
      setLineHeightVal(finalLh);
      textEl.style.fontSize = `${best}px`;
      textEl.style.lineHeight = `${finalLh}`;

      if (hasSub) {
        const calculatedSubPx = Math.max(18, Math.min(46, Math.round(best * 0.44)));
        setSubSizePx(calculatedSubPx);
        if (subEl) {
          subEl.style.fontSize = `${calculatedSubPx}px`;
          if (fontFamily) {
            subEl.style.fontFamily = fontFamily;
          }
        }
      }
    };

    performFit();

    const ro = new ResizeObserver(() => {
      performFit();
    });
    ro.observe(container);

    return () => ro.disconnect();
  }, [renderText, subtitle, maxPt, fontFamily, isVerse, isSong, preserveLineBreaks, hasExplicitLineBreaks, lineCount, align]);

  const alignItemsClass = align === 'left' ? 'items-start text-left' : 'items-center text-center';

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col justify-center ${alignItemsClass} overflow-hidden my-auto font-sans ${className}`}
    >
      <div
        className={`w-full flex-1 flex flex-col justify-center ${alignItemsClass} my-auto overflow-hidden`}
      >
        <p
          ref={textRef}
          style={{
            fontFamily: fontFamily || undefined,
            fontSize: `${fontSizePx}px`,
            lineHeight: lineHeightVal,
          }}
          className={`font-sans ${fontWeightClass} tracking-tight break-words ${textColorClass} w-full max-w-full drop-shadow-xs select-none whitespace-pre-line ${
            hasExplicitLineBreaks ? '' : 'text-balance'
          }`}
        >
          {renderText}
        </p>

        {subtitle && (
          <div
            ref={subRef}
            style={{
              fontFamily: fontFamily || undefined,
              fontSize: `${subSizePx}px`,
              color: 'var(--screen-accent)',
            }}
            className="font-sans font-bold tracking-wide shrink-0 select-none mt-4 sm:mt-6"
          >
            {isVerse ? `— ${subtitle}` : subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
