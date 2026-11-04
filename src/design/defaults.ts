/**
 * The small part of the design system every page needs: the live look and
 * where the Studio keeps its own. The option catalogue (labels, notes,
 * presets) lives in options.ts and is only loaded by the Studio.
 */
import { design } from '../design.config';

export type Config = Record<string, string>;

/** The live site's look; the Studio starts from it. */
export const defaults: Config = { ...design };

export const STORAGE_KEY = 'jb-lab-config-v2';
