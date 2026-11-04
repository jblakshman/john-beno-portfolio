/** RSS feed of the notes at /rss.xml. Built only when sections.notes is on. */
import type { APIRoute } from 'astro';
import { getNotes } from '../lib/notes';
import { site } from '../site.config';

export function getStaticPaths() {
  return site.sections.notes ? [{ params: { feed: 'rss' } }] : [];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async () => {
  const notes = await getNotes();
  const items = notes
    .map((n) => {
      const url = `${site.url}/notes/${n.id}`;
      return `    <item>
      <title>${esc(n.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(n.data.description)}</description>
      <pubDate>${n.data.date.toUTCString()}</pubDate>
${n.data.tags.map((t) => `      <category>${esc(t)}</category>`).join('\n')}
    </item>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.name)} · Notes</title>
    <link>${site.url}/notes</link>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${esc(`Notes by ${site.name} on design, interaction and building things.`)}</description>
    <language>en</language>
${notes[0] ? `    <lastBuildDate>${notes[0].data.date.toUTCString()}</lastBuildDate>\n` : ''}${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
