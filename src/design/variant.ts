import { design } from '../design.config';

/**
 * Which variants a page renders. The live site renders only the look chosen
 * in design.config.ts (less HTML, no hidden images downloading); the Studio
 * preview renders every variant so it can switch between them instantly.
 */
export const variantOf = (preview: boolean) => (group: string, id: string) => preview || design[group] === id;
