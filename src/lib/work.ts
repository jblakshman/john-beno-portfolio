import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'work'>;
export type ProjectData = Project['data'];

/**
 * Projects in the order set by `order`. Drafts are left out unless asked for
 * (the Studio preview shows them; the live site never does).
 */
export async function getProjects({ drafts = false } = {}): Promise<Project[]> {
  return (await getCollection('work', ({ data }) => drafts || !data.draft)).sort((a, b) => a.data.order - b.data.order);
}

/**
 * Checks a published project for things that are easy to miss before it
 * goes live, and prints them during the build. Drafts are not checked.
 */
const audited = new Set<string>();
function audit(p: Project) {
  if (p.data.draft || audited.has(p.id)) return;
  audited.add(p.id);
  const d = p.data;
  const issues: string[] = [];
  const body = p.body ?? '';
  if (/placeholder|example\.com|One sentence that says|Replace with/i.test(JSON.stringify(d) + body)) issues.push('still contains template text or placeholder images');
  if (d.summary.length > 160) issues.push(`summary is ${d.summary.length} characters (aim for under 150)`);
  if (d.description.length < 70 || d.description.length > 170) issues.push(`description is ${d.description.length} characters (aim for 150–160)`);
  if (d.cover.width < 1600) issues.push(`cover is ${d.cover.width} px wide (use at least 1600, ideally 2400)`);
  if (/\balt=""/.test(body)) issues.push('an image has empty alt text');
  if (issues.length) console.warn(`\n⚠️  ${p.id}:\n${issues.map((i) => `   - ${i}`).join('\n')}\n`);
}

/** Static paths for the case study pages, each with the project that follows it. */
export async function projectPaths({ drafts = false } = {}) {
  const all = await getProjects({ drafts });
  all.forEach(audit);
  const ring = all.filter((p) => !p.data.draft && p.data.featured && !p.data.unlisted);
  return all.map((project) => {
    const i = ring.indexOf(project);
    return { params: { slug: project.id }, props: { project, next: ring[(i + 1) % ring.length] ?? all[0] } };
  });
}

/** The facts shown in a case study header, in reading order. Empty fields are skipped. */
export function facts(d: ProjectData) {
  const when = d.period ?? (d.year ? String(d.year) : '');
  const timeline = [when, d.duration].filter(Boolean).join(' · ');
  const rows: { k: string; v: string }[] = [];
  if (d.role) rows.push({ k: 'Role', v: d.role });
  if (timeline) rows.push({ k: 'Timeline', v: timeline });
  if (d.client) rows.push({ k: 'Client', v: d.client });
  rows.push({ k: 'Context', v: d.context });
  if (d.team.length) rows.push({ k: 'Team', v: d.team.join(', ') });
  if (!d.role) rows.push({ k: 'Disciplines', v: d.disciplines.join(', ') });
  if (d.platforms.length) rows.push({ k: 'Platforms', v: d.platforms.join(', ') });
  rows.push({ k: 'Tools', v: d.tools.join(', ') });
  return rows;
}

const linkOrder = ['live', 'appstore', 'testflight', 'prototype', 'video', 'code', 'file', 'press'];
export const sortedLinks = (d: ProjectData) => [...d.links].sort((a, b) => linkOrder.indexOf(a.type) - linkOrder.indexOf(b.type));

/* Per-project accent ------------------------------------------------------ */

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (h: string) => {
  const [r, g, b] = rgb(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
/** Text color that reads best on top of the given color. */
const onColor = (h: string) => (contrast(h, '#ffffff') >= contrast(h, '#111111') ? '#ffffff' : '#111111');
const lighten = (h: string, t: number) =>
  '#' + rgb(h).map((c) => Math.round((c + (1 - c) * t) * 255).toString(16).padStart(2, '0')).join('');

/** CSS variables for a project's accent; a single color gets a lighter partner for dark backgrounds. */
export function accentVars(accent: ProjectData['accent']) {
  if (!accent) return undefined;
  const light = typeof accent === 'string' ? accent : accent.light;
  const dark = typeof accent === 'string' ? lighten(accent, 0.3) : accent.dark;
  return `--pa-l:${light};--pa-l-on:${onColor(light)};--pa-d:${dark};--pa-d-on:${onColor(dark)}`;
}
