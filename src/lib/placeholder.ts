import sharp from 'sharp';
import type { ImageMetadata } from 'astro';

/**
 * A placeholder for an image while it loads: its dominant color and a tiny
 * (16 px) blurred preview, computed once per image at build time. The
 * browser scales the preview up smoothly, which reads as a soft blur.
 */
type Placeholder = { color: string; preview: string };
const cache = new Map<string, Promise<Placeholder | undefined>>();

export function placeholder(img: ImageMetadata): Promise<Placeholder | undefined> {
  const path = (img as ImageMetadata & { fsPath?: string }).fsPath;
  if (!path) return Promise.resolve(undefined);
  if (!cache.has(path)) {
    cache.set(
      path,
      (async () => {
        try {
          const { dominant } = await sharp(path).stats();
          const buf = await sharp(path).resize(16, 16, { fit: 'inside' }).webp({ quality: 50 }).toBuffer();
          return { color: `rgb(${dominant.r} ${dominant.g} ${dominant.b})`, preview: `data:image/webp;base64,${buf.toString('base64')}` };
        } catch {
          return undefined;
        }
      })(),
    );
  }
  return cache.get(path)!;
}

/** Inline style for a frame that shows the placeholder behind its image. */
export async function placeholderStyle(img: ImageMetadata) {
  const p = await placeholder(img);
  return p ? `--ph-c:${p.color};--ph:url(${p.preview})` : '';
}

/** Marks an image as loaded so it can fade in over its placeholder. */
export const onLoaded = "this.dataset.l=''";
