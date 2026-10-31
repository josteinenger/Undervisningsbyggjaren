import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { getCleanCaption } from '../../lib/presentationUtils';

interface KenBurnsPreset {
  initial: { scale: number; x: number; y: number };
  animate: { scale: number; x: number; y: number };
}

const KEN_BURNS_PRESETS: KenBurnsPreset[] = [
  { initial: { scale: 1.05, x: 0, y: 0 }, animate: { scale: 1.12, x: 0, y: 0 } },
  { initial: { scale: 1.14, x: -16, y: -12 }, animate: { scale: 1.06, x: 0, y: 0 } },
  { initial: { scale: 1.06, x: 0, y: 0 }, animate: { scale: 1.13, x: -20, y: 12 } },
  { initial: { scale: 1.14, x: 12, y: 8 }, animate: { scale: 1.06, x: -8, y: -6 } },
  { initial: { scale: 1.08, x: -22, y: 0 }, animate: { scale: 1.08, x: 22, y: 0 } },
  { initial: { scale: 1.06, x: 6, y: 18 }, animate: { scale: 1.13, x: -6, y: -14 } },
];

interface TrueCrossfadeSlideshowProps {
  images: Array<{ id?: string; url: string; caption?: string }>;
  activeSlideIdx: number;
  isLight?: boolean;
}

export const SeamlessCrossfadeSlideshow: React.FC<TrueCrossfadeSlideshowProps> = ({
  images = [],
  activeSlideIdx = 0,
  isLight = false,
}) => {
  if (!images || images.length === 0) {
    return (
      <div className={`w-full h-full flex items-center justify-center p-0 text-base font-medium ${
        isLight ? 'bg-white text-zinc-400' : 'bg-black text-stone-500'
      }`}>
        Ingen biletkjelder lagt til i denne serien
      </div>
    );
  }

  const safeIdx = Math.max(0, Math.min(images.length - 1, activeSlideIdx));
  const currentImg = images[safeIdx] || images[0];
  const currentCaption = getCleanCaption(currentImg?.caption);
  const slideKey = currentImg?.id || `slide_${safeIdx}_${currentImg?.url}`;

  const idHash = currentImg?.id ? currentImg.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) : 0;
  const presetIdx = (safeIdx + idHash) % KEN_BURNS_PRESETS.length;
  const preset = KEN_BURNS_PRESETS[presetIdx];

  return (
    <div className={`w-full h-full relative overflow-hidden flex items-center justify-center select-none ${
      isLight ? 'bg-white text-zinc-950' : 'bg-black text-white'
    }`}>
      <AnimatePresence>
        <motion.div
          key={slideKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.7,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden p-0 pointer-events-none"
        >
          {currentImg?.url && (
            <motion.img
              src={currentImg.url}
              alt={currentCaption || ''}
              initial={preset.initial}
              animate={preset.animate}
              transition={{
                duration: 16,
                ease: 'easeOut',
              }}
              className="w-full h-full object-cover select-none pointer-events-none will-change-transform"
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
