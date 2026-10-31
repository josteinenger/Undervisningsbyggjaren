/**
 * src/lib/kaosPuslespillUtils.ts
 * Logikk og matematikk for «Kaos-puslespill» med deterministisk permutasjon og brikke-koordinatar.
 */

export interface PuzzlePieceCoord {
  id: number;
  homeRow: number;
  homeCol: number;
  chaosRow: number;
  chaosCol: number;
}

/**
 * Genererer ein deterministisk permutasjon (derangement) av N*N brikker,
 * slik at brikkene vert kasta ut i eit uordna kaos.
 */
export function generateChaosPermutation(gridSize: number, seed: number = 42): number[] {
  let s = Math.abs(seed % 2147483647) + 1;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const arr = Array.from({ length: gridSize }, (_, i) => i);
  // Fisher-Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Trygg at ingen brikker ligg i si heime-rute dersom gridSize > 1
  if (gridSize > 1) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === i) {
        const swapWith = (i + 1) % arr.length;
        [arr[i], arr[swapWith]] = [arr[swapWith], arr[i]];
      }
    }
  }
  return arr;
}

/**
 * Reknar ut kolonnar/rader N for eit gjeve brikketal (100->10, 64->8, 36->6, 25->5, 16->4, 9->3)
 */
export function getPuzzleGridDimension(gridSize: number): number {
  if (gridSize >= 100) return 10;
  if (gridSize >= 64) return 8;
  if (gridSize >= 36) return 6;
  if (gridSize >= 25) return 5;
  if (gridSize >= 16) return 4;
  return 3;
}
