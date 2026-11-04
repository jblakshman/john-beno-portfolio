# john-beno.com

The portfolio of John Beno Lakshman. Built with [Astro](https://astro.build), plain CSS
and a little TypeScript. It compiles to static files and is hosted for free on
Cloudflare. To launch it, follow **[DEPLOY.md](./DEPLOY.md)**.

## Run it locally

You need Node.js 22 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:4321. Changes appear instantly.

`npm run build` creates the production site in `dist/`, and `npm run preview` serves it.

## Adding work

Everything about adding projects, the case study blocks, images, video and
writing is in **[CONTENT.md](./CONTENT.md)**. The short version:

```bash
npm run new -- "Project name"
```

## Where things live

| What | Where |
| --- | --- |
| The live site's look (layout, type, color, motion) | `src/design.config.ts`, chosen in the Design Studio |
| Name, role, email, profiles, legal details, optional sections | `src/site.config.ts` |
| Case studies (text) | `src/content/work/*.mdx` |
| Case study images | `src/assets/work/<project>/` |
| Videos | `public/media/` |
| Case study blocks | `src/components/blocks/` |
| Page content (home, about, case study, apps) | `src/components/site/` |
| Pages and routes | `src/pages/` |
| Design system: options, runtime, shaders | `src/design/` |
| Styles | `src/styles/site/` |
| CV | `public/files/john-beno-lakshman-cv.pdf` |
| Scripts (`npm run new`, `npm run media`) | `scripts/` |

## Design Studio

`/lab` is a private configurator (hidden from search engines) that runs the real
site in a preview with every option switchable: layouts, typography, palettes and
their dark partners, motion, page transitions, image effects, cursor and ambient
light. The live site and the Studio share the same components and runtime, so
what you see there is exactly what ships.

- The page menu at the top opens any page, including drafts.
- **Copy for the live site** copies a ready `src/design.config.ts`; paste it over
  the file and push.
- Drafts (`draft: true`) are visible in the Studio only.

## Search engine setup built into the site

- Every page has a unique title, description, canonical URL and social preview image.
- Structured data (JSON-LD) describes you as a Person on the home page, a ProfilePage
  on About, and each project as a CreativeWork, linked to the profiles in
  `site.config.ts`.
- `sitemap-index.xml` is generated on every build; `robots.txt` points to it.
- Fonts are self-hosted, so the site makes no requests to Google (GDPR-friendly)
  and loads fast.
