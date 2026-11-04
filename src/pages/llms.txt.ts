/**
 * /llms.txt: a plain summary of the site for AI assistants and the tools
 * recruiters use to read portfolios (llmstxt.org). Generated from the same
 * content as the pages, so it is never out of date.
 */
import type { APIRoute } from 'astro';
import { getProjects } from '../lib/work';
import { getNotes } from '../lib/notes';
import { site } from '../site.config';

export const GET: APIRoute = async () => {
  const projects = (await getProjects()).filter((p) => !p.data.unlisted);
  const notes = site.sections.notes ? await getNotes() : [];
  const url = (path: string) => `${site.url}${path}`;
  const lines = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `${site.school.program} at ${site.school.name}.${site.availability ? ` ${site.availability}.` : ''}`,
    `Contact: ${site.email}`,
    '',
    '## Work',
    '',
    ...projects.map((p) => {
      const d = p.data;
      const facts = [d.role && `Role: ${d.role}`, `Context: ${d.context}`, `Disciplines: ${d.disciplines.join(', ')}`, `Tools: ${d.tools.join(', ')}`].filter(Boolean).join('. ');
      return `- [${d.title}](${url(`/work/${p.id}`)}): ${d.summary} ${facts}.${d.status === 'in-progress' ? ' (In progress.)' : ''}`;
    }),
    '',
    ...(notes.length ? ['## Notes', '', ...notes.map((n) => `- [${n.data.title}](${url(`/notes/${n.id}`)}): ${n.data.description}`), ''] : []),
    '## More',
    '',
    `- [About](${url('/about')}): background, approach, education, skills and tools`,
    `- [CV (PDF)](${url(site.cv)})`,
    ...site.profiles.map((p) => `- [${p.label}](${p.url})`),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
