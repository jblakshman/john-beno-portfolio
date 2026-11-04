import type { Mount } from './kit';

/** Every experiment, loaded on demand. Add new ones here and in src/content/playground. */
export const experiments: Record<string, () => Promise<{ default: Mount }>> = {
  'pin-table': () => import('./pin-table'),
  'tone-grid': () => import('./tone-grid'),
  'weight-field': () => import('./weight-field'),
  sweep: () => import('./sweep'),
  'tag-drop': () => import('./tag-drop'),
};
