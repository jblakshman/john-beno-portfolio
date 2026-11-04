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

## Where things live

| What | Where |
| --- | --- |
| Name, role, email, profiles, legal details | `src/site.config.ts` |
| Case studies (text) | `src/content/work/*.mdx` |
| Case study images | `src/assets/work/<project>/` |
| Videos | `public/media/` |
| Design Studio | `src/lab/`, `src/pages/lab/` |
| Colors, type sizes, spacing | top of `src/styles/global.css` |
| Pages | `src/pages/` |
| CV | `public/files/john-beno-lakshman-cv.pdf` |

## Add a case study

1. Put the images in `src/assets/work/my-project/` (PNG or JPG, large is fine;
   the build creates optimized AVIF and WebP versions automatically).
2. Copy `src/content/work/voicenotes.mdx` to `src/content/work/my-project.mdx`.
   The file name becomes the URL: `/work/my-project`.
3. Edit the fields at the top (title, summary, cover, order, ...) and write the text.
   Use `## Heading` for sections (they appear in the side navigation) and the
   `<Figure>`, `<Gallery>` and `<Video>` components for media.
4. Set `draft: true` to hide it while you work on it.

Videos must be under 25 MB each (Cloudflare's limit). To compress one:

```bash
ffmpeg -i input.mov -an -vf "scale=1600:-2" -c:v libx264 -crf 27 -preset slow -movflags +faststart public/media/output.mp4
```

## Design Studio

`/lab` is a private configurator (hidden from search engines) for trying layouts,
typography, colors, motion and page transitions on the real content. Its code lives in
`src/lab/`, `src/components/lab/`, `src/styles/lab/` and `src/pages/lab/`. Use
**Copy my setup** there and send the result to Claude to build that combination into
the real site.

## Search engine setup built into the site

- Every page has a unique title, description, canonical URL and social preview image.
- Structured data (JSON-LD) describes you as a Person on the home page, a ProfilePage
  on About, and each project as a CreativeWork, linked to the profiles in
  `site.config.ts`.
- `sitemap-index.xml` is generated on every build; `robots.txt` points to it.
- Fonts are self-hosted, so the site makes no requests to Google (GDPR-friendly)
  and loads fast.
