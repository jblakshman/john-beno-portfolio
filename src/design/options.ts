/**
 * Design Studio: every option the configurator offers.
 * Each group maps to a data attribute on <html> (data-<group>) in the preview pages,
 * and the stylesheets and scripts react to it.
 */
export type Option = { id: string; label: string; note: string };
export type Group = { id: string; section: string; label: string; hint: string; options: Option[] };

export const sections = ['Structure', 'Type and color', 'Motion', 'Interaction', 'Atmosphere'] as const;

export const groups: Group[] = [
  // Structure ---------------------------------------------------------------
  {
    id: 'layout',
    section: 'Structure',
    label: 'Work layout',
    hint: 'How projects are presented on the home page.',
    options: [
      { id: 'rows', label: 'Rows', note: 'Details stay pinned on the left while large images pass on the right.' },
      { id: 'index', label: 'Index', note: 'You, a list, and a preview that follows your reading position.' },
      { id: 'slides', label: 'Slides', note: 'One project per screen. Scrolling turns the page.' },
      { id: 'reel', label: 'Reel', note: 'Scrolling down moves a strip of projects sideways.' },
      { id: 'stack', label: 'Stack', note: 'Each project slides over the last, which steps back.' },
      { id: 'gallery', label: 'Gallery', note: 'An editorial grid with varied sizes and generous space.' },
      { id: 'quiet', label: 'Quiet', note: 'Text only. A small image appears beside the pointer.' },
    ],
  },
  {
    id: 'hero',
    section: 'Structure',
    label: 'Opening',
    hint: 'The first screen.',
    options: [
      { id: 'statement', label: 'Statement', note: 'One sentence with your portrait set into the line.' },
      { id: 'giant', label: 'Giant name', note: 'Your name edge to edge.' },
      { id: 'typeset', label: 'Typeset', note: 'A short sentence set in indented lines, like a poster.' },
      { id: 'split', label: 'Portrait', note: 'Introduction beside a tall portrait.' },
      { id: 'minimal', label: 'Minimal', note: 'Small type, lots of space.' },
    ],
  },
  {
    id: 'case',
    section: 'Structure',
    label: 'Case study',
    hint: 'Layout of project pages.',
    options: [
      { id: 'classic', label: 'Classic', note: 'Title, details, large image, text with contents.' },
      { id: 'cinematic', label: 'Cinematic', note: 'A full-screen image with the title set over it.' },
      { id: 'editorial', label: 'Editorial', note: 'Centered title and a margin column of chapters.' },
    ],
  },
  {
    id: 'nav',
    section: 'Structure',
    label: 'Navigation',
    hint: 'Where the menu lives.',
    options: [
      { id: 'bar', label: 'Bar', note: 'A quiet line along the top.' },
      { id: 'island', label: 'Liquid Glass', note: 'A floating glass pill that bends the page beneath it and opens when you reach for it.' },
      { id: 'index', label: 'Side index', note: 'Sections down the left edge.' },
      { id: 'corner', label: 'Corners', note: 'Name and Menu in the corners; a full-screen menu.' },
    ],
  },

  // Type and color ------------------------------------------------------------
  {
    id: 'type',
    section: 'Type and color',
    label: 'Typography',
    hint: 'Headline and text typefaces.',
    options: [
      { id: 'mona', label: 'Mona', note: 'Mona Sans with Martian Mono. Precise.' },
      { id: 'native', label: 'Native', note: 'San Francisco on Apple devices. Feels like your apps.' },
      { id: 'gallery', label: 'Gallery', note: 'Instrument Serif headlines, Instrument Sans text.' },
      { id: 'horology', label: 'Horology', note: 'Cormorant Garamond with Manrope.' },
      { id: 'editorial', label: 'Editorial', note: 'Newsreader with Geist.' },
      { id: 'wide', label: 'Wide', note: 'Archivo at its widest. Architectural.' },
    ],
  },
  {
    id: 'palette',
    section: 'Type and color',
    label: 'Color',
    hint: 'Background, text and one accent.',
    options: [
      { id: 'paper', label: 'Paper', note: 'Off-white, ink, ultramarine.' },
      { id: 'bone', label: 'Bone', note: 'Warm white, espresso, olive.' },
      { id: 'studio', label: 'Studio', note: 'Apple-like greys with a clear blue.' },
      { id: 'velvet', label: 'Velvet', note: 'Ivory, charcoal, mauve.' },
      { id: 'sage', label: 'Sage', note: 'Pale green-grey, deep green.' },
      { id: 'ink', label: 'Ink', note: 'Near-black, soft white.' },
      { id: 'graphite', label: 'Graphite', note: 'iOS dark mode.' },
      { id: 'midnight', label: 'Midnight', note: 'Deep navy, champagne.' },
    ],
  },
  {
    id: 'dark',
    section: 'Type and color',
    label: 'Dark mode',
    hint: 'Used when a visitor’s device is set to dark. The moon in the menu switches by hand.',
    options: [
      { id: 'ink', label: 'Ink', note: 'Near-black with soft white.' },
      { id: 'graphite', label: 'Graphite', note: 'iOS dark mode greys.' },
      { id: 'midnight', label: 'Midnight', note: 'Deep navy with champagne.' },
      { id: 'none', label: 'Always light', note: 'No dark mode; the chosen color is always used.' },
    ],
  },
  {
    id: 'images',
    section: 'Type and color',
    label: 'Images',
    hint: 'Treatment of project imagery.',
    options: [
      { id: 'color', label: 'Color', note: 'As they are.' },
      { id: 'mono', label: 'Monochrome', note: 'Black and white until you point at them.' },
    ],
  },
  {
    id: 'radius',
    section: 'Type and color',
    label: 'Corners',
    hint: 'Roundness of images and buttons.',
    options: [
      { id: 'sharp', label: 'Sharp', note: 'Square.' },
      { id: 'soft', label: 'Soft', note: 'Slightly rounded.' },
      { id: 'round', label: 'Round', note: 'Like app icons.' },
    ],
  },

  // Motion ---------------------------------------------------------------------
  {
    id: 'motion',
    section: 'Motion',
    label: 'Motion feel',
    hint: 'Timing and easing for everything.',
    options: [
      { id: 'calm', label: 'Calm', note: 'Long, soft deceleration.' },
      { id: 'crisp', label: 'Crisp', note: 'Short and decisive.' },
      { id: 'spring', label: 'Spring', note: 'A little overshoot, like iOS.' },
    ],
  },
  {
    id: 'scroll',
    section: 'Motion',
    label: 'Scrolling',
    hint: 'Mouse wheels only; touch stays native.',
    options: [
      { id: 'native', label: 'Native', note: 'The browser’s own scrolling.' },
      { id: 'smooth', label: 'Smooth', note: 'Gentle inertia.' },
    ],
  },
  {
    id: 'pt',
    section: 'Motion',
    label: 'Page transition',
    hint: 'Between pages. Click a project in the preview, or use Try it.',
    options: [
      { id: 'open', label: 'Open', note: 'The case study grows out of the card you clicked, like opening an app, and closes back into it.' },
      { id: 'morph', label: 'Morph', note: 'The project image travels into the case study header.' },
      { id: 'develop', label: 'Develop', note: 'The new page appears like a print in the developer tray.' },
      { id: 'focus', label: 'Focus pull', note: 'One page goes out of focus as the next comes in.' },
      { id: 'push', label: 'Push', note: 'Sideways like iOS; back goes back.' },
      { id: 'rise', label: 'Rise', note: 'A soft lift and settle.' },
      { id: 'fade', label: 'Fade', note: 'A short crossfade.' },
    ],
  },
  {
    id: 'reveal',
    section: 'Motion',
    label: 'Text entrance',
    hint: 'How headlines appear.',
    options: [
      { id: 'lines', label: 'Lines', note: 'Each line slides up from behind a mask.' },
      { id: 'words', label: 'Focus', note: 'Words come into focus one after another.' },
      { id: 'weight', label: 'Weight', note: 'Letters grow from hairline to full weight.' },
      { id: 'ink', label: 'Ink', note: 'A soft edge sweeps across the text.' },
      { id: 'none', label: 'None', note: 'Text is simply there.' },
    ],
  },
  {
    id: 'imgin',
    section: 'Motion',
    label: 'Image entrance',
    hint: 'How images arrive as you scroll.',
    options: [
      { id: 'develop', label: 'Develop', note: 'Images emerge like photographic paper: shadows first, a warm tone settling to neutral.' },
      { id: 'unveil', label: 'Unveil', note: 'The frame opens from the bottom while the image settles.' },
      { id: 'none', label: 'None', note: 'Images are simply there.' },
    ],
  },
  {
    id: 'imgmotion',
    section: 'Motion',
    label: 'Image motion',
    hint: 'What images do while you scroll.',
    options: [
      { id: 'flex', label: 'Flex', note: 'Images bend very slightly with scroll speed and settle like fabric.' },
      { id: 'depth', label: 'Depth', note: 'Images drift inside their frames for a sense of depth.' },
      { id: 'still', label: 'Still', note: 'Nothing moves.' },
    ],
  },

  // Interaction ------------------------------------------------------------------
  {
    id: 'hover',
    section: 'Interaction',
    label: 'Project hover',
    hint: 'What a project does under the pointer.',
    options: [
      { id: 'loupe', label: 'Loupe', note: 'A glass loupe magnifies details with real lens distortion.' },
      { id: 'develop', label: 'Develop', note: 'Color spreads outward from the pointer, organically.' },
      { id: 'lift', label: 'Lift', note: 'The image tilts toward the pointer with a soft sheen.' },
      { id: 'focus', label: 'Depth of field', note: 'The project you point at stays sharp; the rest fall back.' },
      { id: 'zoom', label: 'Zoom', note: 'The image moves slightly closer.' },
    ],
  },
  {
    id: 'cursor',
    section: 'Interaction',
    label: 'Pointer',
    hint: 'Mouse and trackpad only.',
    options: [
      { id: 'pointer', label: 'Adaptive', note: 'Like iPadOS: a soft dot that wraps around buttons and becomes a beam over text.' },
      { id: 'label', label: 'Label', note: 'A small pill names what a click will do.' },
      { id: 'native', label: 'System', note: 'The normal pointer.' },
    ],
  },
  {
    id: 'link',
    section: 'Interaction',
    label: 'Link hover',
    hint: 'Navigation and text links.',
    options: [
      { id: 'grow', label: 'Underline', note: 'An underline draws in from the left.' },
      { id: 'slide', label: 'Pass through', note: 'The underline leaves right and returns from the left.' },
    ],
  },

  // Atmosphere -------------------------------------------------------------------
  {
    id: 'ambient',
    section: 'Atmosphere',
    label: 'Ambient',
    hint: 'Barely-there life in the background.',
    options: [
      { id: 'daylight', label: 'Daylight', note: 'Soft window light and leaf shadows drift over the page, following the real time of day in Munich.' },
      { id: 'grain', label: 'Film grain', note: 'A faint analog texture.' },
      { id: 'none', label: 'None', note: 'Clean.' },
    ],
  },
];

import { defaults, STORAGE_KEY, type Config } from './defaults';
export { defaults, STORAGE_KEY, type Config };

export const presets: { id: string; label: string; note: string; config: Partial<Config> }[] = [
  {
    id: 'darkroom',
    label: 'Darkroom',
    note: 'Prints that develop, a loupe, window light.',
    config: { layout: 'gallery', hero: 'minimal', case: 'editorial', nav: 'corner', type: 'gallery', palette: 'bone', images: 'color', radius: 'sharp', motion: 'calm', scroll: 'smooth', pt: 'develop', reveal: 'ink', imgin: 'develop', imgmotion: 'flex', hover: 'loupe', cursor: 'pointer', link: 'slide', ambient: 'daylight' },
  },
  {
    id: 'native',
    label: 'Native',
    note: 'Feels like an Apple app: glass, springs, Open.',
    config: { layout: 'stack', hero: 'statement', case: 'cinematic', nav: 'island', type: 'native', palette: 'studio', images: 'color', radius: 'round', motion: 'spring', scroll: 'smooth', pt: 'open', reveal: 'lines', imgin: 'unveil', imgmotion: 'still', hover: 'lift', cursor: 'pointer', link: 'grow', ambient: 'none' },
  },
  {
    id: 'horology',
    label: 'Horology',
    note: 'One project at a time, quiet luxury.',
    config: { layout: 'slides', hero: 'typeset', case: 'cinematic', nav: 'island', type: 'horology', palette: 'midnight', images: 'color', radius: 'soft', motion: 'calm', scroll: 'smooth', pt: 'focus', reveal: 'words', imgin: 'develop', imgmotion: 'still', hover: 'loupe', cursor: 'native', link: 'grow', ambient: 'grain' },
  },
  {
    id: 'index',
    label: 'Index',
    note: 'Editorial index, monochrome that develops into color.',
    config: { layout: 'index', hero: 'statement', case: 'editorial', nav: 'index', type: 'editorial', palette: 'ink', images: 'mono', radius: 'soft', motion: 'calm', scroll: 'smooth', pt: 'morph', reveal: 'words', imgin: 'develop', imgmotion: 'flex', hover: 'develop', cursor: 'label', link: 'slide', ambient: 'grain' },
  },
  {
    id: 'reel',
    label: 'Reel',
    note: 'Wide type, a sideways reel, a little bounce.',
    config: { layout: 'reel', hero: 'giant', case: 'cinematic', nav: 'island', type: 'wide', palette: 'paper', images: 'color', radius: 'sharp', motion: 'spring', scroll: 'smooth', pt: 'open', reveal: 'weight', imgin: 'unveil', imgmotion: 'flex', hover: 'zoom', cursor: 'label', link: 'grow', ambient: 'none' },
  },
  {
    id: 'quiet',
    label: 'Quiet',
    note: 'Almost only text. Lets the work speak.',
    config: { layout: 'quiet', hero: 'minimal', case: 'classic', nav: 'bar', type: 'native', palette: 'studio', images: 'color', radius: 'round', motion: 'crisp', scroll: 'native', pt: 'fade', reveal: 'none', imgin: 'none', imgmotion: 'still', hover: 'zoom', cursor: 'native', link: 'grow', ambient: 'none' },
  },
  { id: 'current', label: 'Live site', note: 'What is live today (src/design.config.ts).', config: { ...defaults } },
];


export function sanitize(input: Partial<Config> | null | undefined): Config {
  const out: Config = { ...defaults };
  if (!input) return out;
  for (const g of groups) {
    const v = input[g.id];
    if (v && g.options.some((o) => o.id === v)) out[g.id] = v;
  }
  return out;
}
