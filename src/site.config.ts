/**
 * Everything personal lives here. Edit this file to change your name, role,
 * email, links or legal details across the whole site.
 */
export const site = {
  url: 'https://john-beno.com',
  name: 'John Beno Lakshman',
  shortName: 'John Beno',
  givenName: 'John Beno',
  familyName: 'Lakshman',
  role: 'UX/UI Designer & Design Engineer',
  /** Used for <meta name="description"> on the home page and in search results. */
  description:
    'Portfolio of John Beno Lakshman, a UX/UI designer and design engineer in Munich. Computer science & design student at Hochschule München. Case studies, experiments and contact.',
  tagline: 'Learning through making, exploring through design, and staying curious about what comes next.',
  location: { city: 'Munich', region: 'Bavaria', country: 'DE', countryName: 'Germany', timeZone: 'Europe/Berlin' },
  /**
   * Switch this to hello@john-beno.com once iCloud+ custom email is set up
   * (see DEPLOY.md, step 7).
   */
  email: 'john_beno@icloud.com' as string,
  /** Optional. Leave empty to keep your number off the public site. */
  phone: '' as string,
  school: {
    name: 'Hochschule München University of Applied Sciences',
    url: 'https://www.hm.edu',
    program: 'B.Sc. Computer Science & Design',
  },
  cv: '/files/john-beno-lakshman-cv.pdf',
  /**
   * What you are open to, shown with a small green dot in the navigation,
   * the footer and on the About page. e.g. 'Open to internships from March 2026'.
   * Leave empty to hide it.
   */
  availability: '' as string,
  /**
   * Sections that appear in the navigation and sitemap. Switch one on when it
   * has real content. (The Design Studio preview always shows them.)
   */
  sections: {
    apps: false,
    notes: false,
    colophon: false,
  },
  /**
   * Profiles that belong to you. Every link here is shown in the footer and
   * listed in the structured data (sameAs), which helps Google connect them
   * to this site. Add LinkedIn first, then any others.
   * Example: { label: 'LinkedIn', url: 'https://www.linkedin.com/in/your-handle' }
   */
  profiles: [] as { label: string; url: string }[],
  knowsAbout: [
    'User experience design',
    'User interface design',
    'Interaction design',
    'Prototyping',
    'Augmented reality',
    'Brand identity',
    'Photography',
    'Videography',
    'Music production',
  ],
  languages: [
    { code: 'de', name: 'German' },
    { code: 'en', name: 'English' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  ],
  /**
   * Legal notice (Impressum, § 5 DDG). A German site that presents your
   * professional services needs a postal address here before launch.
   * See DEPLOY.md for options if you don't want to publish your home address.
   */
  legal: {
    address: [] as string[], // e.g. ['Musterstraße 1', '80331 München', 'Germany']
  },
} as const;

export type Site = typeof site;
