/** Block widths inside a case study. "column" (the default) runs from the text column to the right edge. */
export type Width = 'text' | 'column' | 'wide' | 'full';
export const dataW = (w: Width = 'column') => (w === 'column' ? undefined : w);

/** Responsive image widths and sizes for each block width. */
export const imageSizes: Record<Width, { widths: number[]; sizes: string }> = {
  text: { widths: [480, 720, 960, 1280], sizes: '(min-width: 900px) 46vw, 100vw' },
  column: { widths: [640, 960, 1280, 1600, 2000], sizes: '(min-width: 900px) 72vw, 100vw' },
  wide: { widths: [800, 1200, 1600, 2000, 2400], sizes: '100vw' },
  full: { widths: [960, 1440, 1920, 2560], sizes: '100vw' },
};
export const fit = (widths: number[], max: number) => {
  const w = widths.filter((x) => x <= max);
  return w.length ? w : [max];
};
