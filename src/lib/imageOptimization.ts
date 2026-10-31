/**
 * src/lib/imageOptimization.ts
 * Klientside bilete-optimalisering via HTML5 Canvas
 * 
 * - Skalerer store bilete ned til maks 1920px (full HD)
 * - Beheld aspektforhold og komprimerer til WebP/JPEG med god visuell kvalitet (~0.82)
 * - Gjer at samlinga kan halde 100+ bilete i minnet utan at nettlesaren eller localStorage kræsjar
 */

export async function optimizeImageFile(file: File, maxDim: number = 1920, quality: number = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Fila er ikkje eit gyldig bilete'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Om biletet allereie er mindre enn maxDim og fila er under 400KB, bruk direkte
        if (width <= maxDim && height <= maxDim && file.size < 400 * 1024) {
          resolve(e.target?.result as string);
          return;
        }

        // Berekne nye proporsjonale dimensjonar
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = '';
        try {
          dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };

      img.onerror = () => {
        resolve(e.target?.result as string);
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
