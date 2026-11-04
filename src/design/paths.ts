/**
 * The same components render the live site (/) and the Studio preview (/lab/p).
 * Links are built from the base of the page they appear on.
 */
export function paths(url: URL) {
  const base = url.pathname.startsWith('/lab/p') ? '/lab/p' : '';
  return {
    base,
    preview: base !== '',
    home: base || '/',
    work: base ? `${base}#work` : '/#work',
    about: `${base}/about`,
    apps: `${base}/apps`,
    notes: `${base}/notes`,
    colophon: `${base}/colophon`,
    project: (id: string) => `${base}/work/${id}`,
    note: (id: string) => `${base}/notes/${id}`,
  };
}
