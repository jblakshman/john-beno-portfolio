/**
 * Design Studio: every option the configurator offers.
 * Each group maps to a data attribute on <html> (data-<group>) in the preview pages,
 * and the stylesheets and scripts react to it.
 */
export type Option = { id: string; label: string; note: string };
export type Group = { id: string; label: string; hint: string; options: Option[] };

export const groups: Group[] = [
  {
    id: 'layout',
    label: 'Work layout',
    hint: 'How your projects are presented on the home page.',
    options: [
      { id: 'rows', label: 'Rows', note: 'Details on the left stay pinned while large images scroll past. Clear and calm.' },
      { id: 'index', label: 'Index', note: 'Three columns: you, a list of projects, and a preview that changes as you move through the list.' },
      { id: 'reel', label: 'Reel', note: 'Scrolling down moves a horizontal strip of projects sideways, with a ruler showing where you are.' },
      { id: 'slides', label: 'Slides', note: 'One project per screen. Titles and images change in place as you scroll, like flipping through a presentation.' },
      { id: 'stack', label: 'Stack', note: 'Projects stack like cards; each new one slides over the last, which steps back.' },
      { id: 'quiet', label: 'Quiet', note: 'Text first. A short list with a small image that appears next to the pointer.' },
      { id: 'strips', label: 'Strips', note: 'Thin bands of imagery that open up when you point at them.' },
      { id: 'blueprint', label: 'Blueprint', note: 'A measured grid with fine construction lines and dimensions, for a design engineer.' },
      { id: 'gallery', label: 'Gallery', note: 'An editorial grid with varied sizes and generous white space, like a printed catalogue.' },
    ],
  },
  {
    id: 'hero',
    label: 'Opening',
    hint: 'The first thing people see.',
    options: [
      { id: 'statement', label: 'Statement', note: 'One large sentence with a small portrait set into the line.' },
      { id: 'giant', label: 'Giant name', note: 'Your name set edge to edge, details underneath.' },
      { id: 'split', label: 'Portrait', note: 'Introduction on one side, a tall portrait on the other.' },
      { id: 'minimal', label: 'Minimal', note: 'Small type and lots of space. Confident restraint.' },
      { id: 'typeset', label: 'Typeset', note: 'A short sentence broken into indented lines, set like a poster.' },
    ],
  },
  {
    id: 'type',
    label: 'Typography',
    hint: 'Display, text and label typefaces.',
    options: [
      { id: 'mona', label: 'Mona', note: 'Mona Sans with Martian Mono. Precise and current.' },
      { id: 'native', label: 'Native', note: 'The system font, so on Apple devices it is San Francisco. Feels like your apps.' },
      { id: 'gallery', label: 'Gallery', note: 'Instrument Serif headlines, Instrument Sans text. Art-book elegance.' },
      { id: 'horology', label: 'Horology', note: 'Cormorant Garamond with Manrope. Quiet luxury, a nod to Orient.' },
      { id: 'editorial', label: 'Editorial', note: 'Newsreader with Geist. A magazine voice.' },
      { id: 'technical', label: 'Technical', note: 'Geist and Geist Mono throughout. Engineered clarity.' },
      { id: 'wide', label: 'Wide', note: 'Archivo at its widest for headlines. Bold, architectural.' },
      { id: 'soft', label: 'Soft', note: 'Fraunces in its soft style with DM Sans. Warm and human.' },
      { id: 'expressive', label: 'Expressive', note: 'Bricolage Grotesque. Lively proportions with character.' },
      { id: 'artful', label: 'Artful', note: 'Syne with Hanken Grotesk. Gallery-poster energy.' },
    ],
  },
  {
    id: 'palette',
    label: 'Color',
    hint: 'Background, text and one accent.',
    options: [
      { id: 'paper', label: 'Paper', note: 'Off-white, ink black, ultramarine.' },
      { id: 'ink', label: 'Ink', note: 'Near-black with soft white text.' },
      { id: 'bone', label: 'Bone', note: 'Warm bone white with espresso and olive.' },
      { id: 'fog', label: 'Fog', note: 'Cool grey with a calm cobalt.' },
      { id: 'studio', label: 'Studio', note: 'Light grey and graphite with a clear blue, close to Apple’s own pages.' },
      { id: 'graphite', label: 'Graphite', note: 'iOS dark mode greys with a bright blue.' },
      { id: 'midnight', label: 'Midnight', note: 'Deep navy with champagne.' },
      { id: 'velvet', label: 'Velvet', note: 'Ivory, charcoal and mauve from the Orient identity.' },
      { id: 'forest', label: 'Forest', note: 'Dark green with pale sage.' },
      { id: 'sage', label: 'Sage', note: 'Pale green-grey with deep green.' },
      { id: 'klein', label: 'Klein', note: 'White and black with a single International Klein Blue.' },
      { id: 'chalk', label: 'Chalk', note: 'Pure black and white. Nothing else.' },
    ],
  },
  {
    id: 'motion',
    label: 'Motion feel',
    hint: 'Timing and easing used by every animation.',
    options: [
      { id: 'calm', label: 'Calm', note: 'Long, soft deceleration. Unhurried.' },
      { id: 'crisp', label: 'Crisp', note: 'Short and decisive. Feels fast and precise.' },
      { id: 'spring', label: 'Spring', note: 'A little overshoot, like iOS. Physical and alive.' },
    ],
  },
  {
    id: 'pt',
    label: 'Page transition',
    hint: 'What happens between pages. Use “Try it” to see one.',
    options: [
      { id: 'none', label: 'Instant', note: 'No transition at all.' },
      { id: 'fade', label: 'Fade', note: 'A short crossfade.' },
      { id: 'rise', label: 'Rise', note: 'The old page drifts up and away, the new one settles in.' },
      { id: 'push', label: 'Push', note: 'Pages slide sideways like iOS navigation, and back goes back the other way.' },
      { id: 'wipe', label: 'Wipe', note: 'The new page wipes up over the old, which steps back into depth.' },
      { id: 'iris', label: 'Iris', note: 'The new page opens from exactly where you clicked.' },
      { id: 'morph', label: 'Morph', note: 'The project image grows into the case study header. Everything else fades.' },
      { id: 'blur', label: 'Focus pull', note: 'The old page goes out of focus while the new one comes into focus.' },
      { id: 'blinds', label: 'Blinds', note: 'The new page arrives in horizontal bands.' },
    ],
  },
  {
    id: 'reveal',
    label: 'Text entrance',
    hint: 'How headlines appear.',
    options: [
      { id: 'none', label: 'None', note: 'Text is simply there.' },
      { id: 'lines', label: 'Lines', note: 'Each line slides up from behind a mask.' },
      { id: 'words', label: 'Words', note: 'Words come into focus one after another.' },
      { id: 'weight', label: 'Weight', note: 'Letters grow from hairline to full weight. Works best with variable fonts.' },
      { id: 'ink', label: 'Ink', note: 'Text is revealed by a soft edge sweeping across, like ink spreading.' },
      { id: 'letters', label: 'Letters', note: 'Letters rise in a fast, fine cascade.' },
    ],
  },
  {
    id: 'hover',
    label: 'Project hover',
    hint: 'What a project does when you point at it.',
    options: [
      { id: 'zoom', label: 'Zoom', note: 'The image moves slightly closer.' },
      { id: 'lift', label: 'Lift', note: 'The image tilts toward the pointer with a soft sheen, like an Apple TV poster.' },
      { id: 'focus', label: 'Depth of field', note: 'The project you point at stays sharp; the others blur and fade back.' },
      { id: 'color', label: 'Develop', note: 'Images rest in black and white and develop into color.' },
      { id: 'preview', label: 'Preview', note: 'A prototype video starts playing inside the frame.' },
      { id: 'caption', label: 'Caption', note: 'A caption with the project details rises into the image.' },
    ],
  },
  {
    id: 'link',
    label: 'Link hover',
    hint: 'Navigation and text links.',
    options: [
      { id: 'grow', label: 'Underline', note: 'An underline draws in from the left.' },
      { id: 'slide', label: 'Pass through', note: 'The underline leaves to the right and returns from the left.' },
      { id: 'mark', label: 'Highlight', note: 'A soft highlight sweeps behind the word.' },
      { id: 'roll', label: 'Roll', note: 'The word rolls up and is replaced by itself.' },
    ],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    hint: 'Only on devices with a mouse or trackpad.',
    options: [
      { id: 'native', label: 'System', note: 'The normal pointer. Often the right choice.' },
      { id: 'label', label: 'Label', note: 'A small pill names what will happen, like “View case study”.' },
      { id: 'dot', label: 'Dot', note: 'A small dot that trails the pointer and grows over links.' },
    ],
  },
  {
    id: 'nav',
    label: 'Navigation',
    hint: 'Where the menu lives.',
    options: [
      { id: 'bar', label: 'Bar', note: 'A quiet bar along the top.' },
      { id: 'island', label: 'Island', note: 'A floating pill that expands when you reach for it, inspired by the Dynamic Island.' },
      { id: 'index', label: 'Side index', note: 'Sections listed down the left edge, the current one highlighted.' },
      { id: 'corner', label: 'Corners', note: 'Name in one corner, Menu in the other, opening a full-screen menu.' },
      { id: 'split', label: 'Split', note: 'Name, links and local time spread across the top in a single line of labels.' },
    ],
  },
  {
    id: 'scroll',
    label: 'Scrolling',
    hint: 'How the page moves.',
    options: [
      { id: 'native', label: 'Native', note: 'The browser’s own scrolling.' },
      { id: 'smooth', label: 'Smooth', note: 'Gentle inertia on mouse wheels. Touch stays native.' },
      { id: 'parallax', label: 'Smooth + depth', note: 'Smooth scrolling, and images drift slightly within their frames.' },
    ],
  },
  {
    id: 'progress',
    label: 'Progress',
    hint: 'A sense of where you are on the page.',
    options: [
      { id: 'none', label: 'None', note: 'Nothing extra.' },
      { id: 'ruler', label: 'Ruler', note: 'Fine tick marks at the top, with a window that travels along them.' },
      { id: 'bar', label: 'Line', note: 'A hairline that fills along the top edge.' },
      { id: 'counter', label: 'Section', note: 'The current section name in a corner.' },
    ],
  },
  {
    id: 'intro',
    label: 'Arrival',
    hint: 'Shown once per visit.',
    options: [
      { id: 'none', label: 'None', note: 'Straight to the content.' },
      { id: 'name', label: 'Name', note: 'Your name sets itself, then the page opens.' },
      { id: 'curtain', label: 'Curtain', note: 'A panel with your name and Munich time lifts away.' },
    ],
  },
  {
    id: 'case',
    label: 'Case study',
    hint: 'Layout of project pages.',
    options: [
      { id: 'classic', label: 'Classic', note: 'Title, details, large image, then text with a section index.' },
      { id: 'cinematic', label: 'Cinematic', note: 'A full-screen image with the title set over it.' },
      { id: 'editorial', label: 'Editorial', note: 'Centered title and a margin column for section names and notes.' },
    ],
  },
  {
    id: 'radius',
    label: 'Corners',
    hint: 'Roundness of images and buttons.',
    options: [
      { id: 'sharp', label: 'Sharp', note: 'Square corners.' },
      { id: 'soft', label: 'Soft', note: 'Slightly rounded.' },
      { id: 'round', label: 'Round', note: 'Generously rounded, like app icons.' },
    ],
  },
  {
    id: 'images',
    label: 'Images',
    hint: 'Treatment of project imagery.',
    options: [
      { id: 'color', label: 'Color', note: 'As they are.' },
      { id: 'mono', label: 'Monochrome', note: 'Black and white everywhere.' },
    ],
  },
  {
    id: 'grain',
    label: 'Texture',
    hint: 'A barely visible film grain over the page.',
    options: [
      { id: 'off', label: 'Off', note: 'Clean.' },
      { id: 'on', label: 'Film grain', note: 'Subtle analog texture.' },
    ],
  },
];

export type Config = Record<string, string>;

export const defaults: Config = {
  layout: 'rows',
  hero: 'statement',
  type: 'mona',
  palette: 'paper',
  motion: 'calm',
  pt: 'rise',
  reveal: 'lines',
  hover: 'zoom',
  link: 'grow',
  cursor: 'label',
  nav: 'bar',
  scroll: 'native',
  progress: 'none',
  intro: 'none',
  case: 'classic',
  radius: 'soft',
  images: 'color',
  grain: 'off',
};

export const presets: { id: string; label: string; note: string; config: Partial<Config> }[] = [
  { id: 'current', label: 'Current site', note: 'What is live today.', config: { ...defaults } },
  {
    id: 'gallery',
    label: 'Gallery',
    note: 'Art-book serif, editorial grid, slow and precise.',
    config: { layout: 'gallery', hero: 'minimal', type: 'gallery', palette: 'bone', motion: 'calm', pt: 'morph', reveal: 'ink', hover: 'focus', link: 'slide', cursor: 'native', nav: 'corner', scroll: 'parallax', progress: 'counter', intro: 'none', case: 'editorial', radius: 'sharp', images: 'color', grain: 'off' },
  },
  {
    id: 'horology',
    label: 'Horology',
    note: 'One project at a time, quiet luxury.',
    config: { layout: 'slides', hero: 'typeset', type: 'horology', palette: 'midnight', motion: 'calm', pt: 'blur', reveal: 'words', hover: 'lift', link: 'grow', cursor: 'native', nav: 'island', scroll: 'smooth', progress: 'ruler', intro: 'curtain', case: 'cinematic', radius: 'soft', images: 'color', grain: 'on' },
  },
  {
    id: 'engineer',
    label: 'Engineer',
    note: 'Measured grid, technical type, decisive motion.',
    config: { layout: 'blueprint', hero: 'split', type: 'technical', palette: 'fog', motion: 'crisp', pt: 'push', reveal: 'letters', hover: 'caption', link: 'roll', cursor: 'dot', nav: 'split', scroll: 'native', progress: 'bar', intro: 'none', case: 'classic', radius: 'sharp', images: 'color', grain: 'off' },
  },
  {
    id: 'reel',
    label: 'Reel',
    note: 'Wide type, sideways reel, a little bounce.',
    config: { layout: 'reel', hero: 'giant', type: 'wide', palette: 'chalk', motion: 'spring', pt: 'wipe', reveal: 'weight', hover: 'zoom', link: 'mark', cursor: 'label', nav: 'island', scroll: 'smooth', progress: 'ruler', intro: 'name', case: 'cinematic', radius: 'sharp', images: 'color', grain: 'off' },
  },
  {
    id: 'native',
    label: 'Native',
    note: 'Feels like an Apple app: system type, springs, push.',
    config: { layout: 'stack', hero: 'statement', type: 'native', palette: 'graphite', motion: 'spring', pt: 'push', reveal: 'lines', hover: 'lift', link: 'grow', cursor: 'native', nav: 'island', scroll: 'smooth', progress: 'none', intro: 'none', case: 'cinematic', radius: 'round', images: 'color', grain: 'off' },
  },
  {
    id: 'quiet',
    label: 'Quiet',
    note: 'Almost only text. Lets the work speak.',
    config: { layout: 'quiet', hero: 'minimal', type: 'native', palette: 'studio', motion: 'crisp', pt: 'fade', reveal: 'none', hover: 'zoom', link: 'grow', cursor: 'native', nav: 'bar', scroll: 'native', progress: 'none', intro: 'none', case: 'classic', radius: 'round', images: 'color', grain: 'off' },
  },
  {
    id: 'darkroom',
    label: 'Darkroom',
    note: 'Index layout, monochrome images that develop on hover.',
    config: { layout: 'index', hero: 'statement', type: 'editorial', palette: 'ink', motion: 'calm', pt: 'iris', reveal: 'words', hover: 'color', link: 'slide', cursor: 'native', nav: 'index', scroll: 'smooth', progress: 'counter', intro: 'none', case: 'editorial', radius: 'soft', images: 'mono', grain: 'on' },
  },
  {
    id: 'garden',
    label: 'Garden',
    note: 'Soft serif, sage tones, bands that open.',
    config: { layout: 'strips', hero: 'split', type: 'soft', palette: 'sage', motion: 'calm', pt: 'blinds', reveal: 'ink', hover: 'preview', link: 'mark', cursor: 'label', nav: 'corner', scroll: 'smooth', progress: 'bar', intro: 'none', case: 'editorial', radius: 'round', images: 'color', grain: 'off' },
  },
];

export const STORAGE_KEY = 'jb-lab-config';

export function sanitize(input: Partial<Config> | null | undefined): Config {
  const out: Config = { ...defaults };
  if (!input) return out;
  for (const g of groups) {
    const v = input[g.id];
    if (v && g.options.some((o) => o.id === v)) out[g.id] = v;
  }
  return out;
}
