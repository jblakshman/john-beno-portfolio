import { getImage } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import portrait from '../assets/about/portrait-standing.jpg';
import { site } from '../site.config';

/**
 * Structured data (JSON-LD). This is what tells Google that this website,
 * the person "John Beno Lakshman" and the profiles listed in site.config.ts
 * all belong together.
 */
export const personId = `${site.url}/#person`;
export const websiteId = `${site.url}/#website`;

export function person(imageUrl?: string) {
  return {
    '@type': 'Person',
    '@id': personId,
    name: site.name,
    alternateName: site.shortName,
    givenName: site.givenName,
    familyName: site.familyName,
    jobTitle: site.role,
    description: site.description,
    url: site.url,
    email: `mailto:${site.email}`,
    ...(imageUrl ? { image: imageUrl } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.location.city,
      addressRegion: site.location.region,
      addressCountry: site.location.country,
    },
    affiliation: {
      '@type': 'CollegeOrUniversity',
      name: site.school.name,
      url: site.school.url,
    },
    knowsAbout: site.knowsAbout,
    knowsLanguage: site.languages.map((l) => l.code),
    ...(site.profiles.length ? { sameAs: site.profiles.map((p) => p.url) } : {}),
  };
}

export function website() {
  return {
    '@type': 'WebSite',
    '@id': websiteId,
    name: site.name,
    alternateName: [site.shortName, 'john-beno.com'],
    url: `${site.url}/`,
    inLanguage: 'en',
    publisher: { '@id': personId },
  };
}

export function breadcrumbs(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

/* Page graphs ------------------------------------------------------------ */


async function portraitUrl() {
  const img = await getImage({ src: portrait, width: 800, format: 'jpg' });
  return new URL(img.src, site.url).href;
}

export async function homeGraph() {
  return graph(website(), person(await portraitUrl()));
}

export async function aboutGraph() {
  return graph(
    {
      '@type': 'ProfilePage',
      '@id': `${site.url}/about#profile`,
      url: `${site.url}/about`,
      name: `About ${site.name}`,
      mainEntity: { '@id': personId },
      isPartOf: { '@id': websiteId },
    },
    person(await portraitUrl()),
    website(),
  );
}

export function caseGraph(project: CollectionEntry<'work'>) {
  const d = project.data;
  const url = `${site.url}/work/${project.id}`;
  return graph(
    {
      '@type': 'CreativeWork',
      '@id': `${url}#work`,
      name: d.title,
      headline: `${d.title}: ${d.summary}`,
      description: d.description,
      url,
      author: { '@id': personId },
      creator: { '@id': personId },
      genre: d.disciplines,
      keywords: [...d.disciplines, ...d.tools].join(', '),
      inLanguage: 'en',
      isPartOf: { '@id': websiteId },
    },
    person(),
    breadcrumbs([
      { name: site.name, url: `${site.url}/` },
      { name: 'Work', url: `${site.url}/#work` },
      { name: d.title, url },
    ]),
  );
}
