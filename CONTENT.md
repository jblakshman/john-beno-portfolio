# Adding your work

Everything you need to put a new project on the site, from an empty file to a
published case study. For running and deploying the site, see
[README.md](./README.md) and [DEPLOY.md](./DEPLOY.md).

## The short version

```bash
npm run new -- "Project name"
```

```bash
npm run dev
```

1. Open http://localhost:4321/lab, pick **Project name (draft)** in the page menu
   at the top, and keep it open while you write.
2. Replace the placeholder images in `src/assets/work/project-name/` and the text
   in `src/content/work/project-name.mdx`. The preview reloads as you save.
3. When it is ready, set `draft: false`, run `npm run build` and fix anything it
   warns about. Then commit and push; the site updates in about five minutes.

Drafts only exist in the Studio preview. They never appear on the live site, in
the sitemap or in search results.

## The fields at the top of a project

Only the first block is required. Everything else appears on the page only when
you fill it in.

| Field | What it is for |
| --- | --- |
| `title` | Project name. Becomes the page title. |
| `summary` | One sentence for the work list and under the title. Under 150 characters. |
| `description` | What Google and link previews show. 150–160 characters, with your name in it. |
| `order` | Position in the work list, lowest first. |
| `disciplines`, `tools` | Short lists, e.g. `[UX Research, Prototyping]`. |
| `context` | e.g. `Semester 7 · University project` or `Client · Freelance`. |
| `cover`, `coverAlt` | The main image (at least 1600 px wide, 2400 is ideal) and a description of it. |
| `role` | Your part in one line: `Lead designer · research, interaction, prototyping`. |
| `period` / `year`, `duration` | `Oct 2025 – Feb 2026`, `16 weeks`. |
| `team`, `client`, `platforms` | Who you worked with, for whom, on what. |
| `glance` | Three short answers (challenge, approach, outcome) shown as **At a glance** under the header. The most read part of any case study: write it last, and make each line stand on its own. |
| `links` | Prototype, live site, App Store, video, code. Each has a `label`, `url` and `type`. |
| `accent` | A color for this project, e.g. `'#e5533d'`. It tints small details on the page: the contents marker, focus rings, text selection. Give a pair (`{ light: '#…', dark: '#…' }`) if one color does not work on both backgrounds. |
| `credits` | Collaborators, shown at the end. |
| `kind` | `case-study`, `app` or `experiment`. |
| `featured` | `false` keeps a project off the home page but reachable by link. |
| `status` | `in-progress` adds an "In progress" tag. |
| `previewVideo` | A short silent loop some work layouts play on the cover (`npm run media -- loop`). |
| `draft` | `true` while you work on it. |

## Blocks

Import a block at the top of the `.mdx` file, then use it anywhere in the text.
`src/content/work/case-study-template.mdx` uses every one of them, and you can see
them all live in the Studio under **Case study template (draft)**.

Most blocks take `w` for their width:

- `text`: the width of the text column
- `column` (default): from the text column to the right edge
- `wide`: the full content width, under the contents list
- `full`: edge to edge

| Block | Use it for |
| --- | --- |
| `Figure` | One image. `frame="mat"` puts UI screens on a soft surface, `frame="phone"` and `frame="browser"` add a light device frame. `ratio="16/9"` crops. |
| `Gallery` | Two to four figures side by side (`cols={3}`), or `layout="strip"` for a sideways-scrolling row of phone screens. |
| `Video` | A recording. `autoplay` loops it silently while it is on screen; without it, it has controls. |
| `Scrub` | A video that plays as the reader scrolls, with captions at set moments. For walkthroughs. |
| `Compare` | Before and after with a draggable handle. Both images need the same size. |
| `Annotate` | A screen with numbered notes. Place markers with `x` and `y` in percent. |
| `Decision` | The options you considered and why one won. Shows how you think. |
| `Steps` | Phases of a project, or the steps of a flow. Up to four per row. |
| `Stats` | Results in numbers. Only numbers you measured; say how in `note`. |
| `Quote` | Something a participant or client said. |
| `Note` | A short aside, e.g. `label="What I learned"`. |
| `Palette` | Colors of a design system or brand. |
| `Embed` | A Figma, ProtoPie, YouTube or Vimeo embed. Nothing loads from that service until someone clicks, so pages stay fast and private. |
| Code | A normal Markdown code fence (` ```swift `). Colors follow light and dark mode. |

The device frames for playable app demos (`MacWindow`, `IPhone`) are shown on the
Apps page in the Studio.

## Images

- **Formats**: PNG for screens and UI, JPG for photos. Export UI at 2× (a 1440 px
  wide screen becomes 2880 px). The build makes AVIF and WebP versions at several
  sizes automatically, so large originals are fine.
- **Sizes**: covers 2400 × 1500 (16:10), full-width images at least 2400 px wide,
  everything else at least 1600 px.
- **Alt text**: describe what the image shows and why it is there, in one sentence.
  Not "Screenshot 3", and not "Image of".
- **Captions**: say what to look at. "The new list groups recordings by project"
  beats "Redesigned list".

## Video

You need ffmpeg once: `brew install ffmpeg`.

```bash
npm run media -- web ~/Desktop/demo.mov --project project-name
```

This writes `public/media/demo.mp4` and a poster frame into the project's image
folder, and prints the line to paste into your `.mdx` file. `scrub` prepares a
video for the `Scrub` block, `loop` makes a small preview loop (add `--start 2
--length 6` to pick the moment). Keep each video under 12 MB; Cloudflare's hard
limit is 25 MB.

## Writing a case study people finish

Most people who look at a portfolio spend a minute or two per project. Write for
that reader first and for the one who reads everything second.

1. **Lead with the outcome.** The title, summary and At a glance card should tell
   the whole story on their own.
2. **Show the thinking, not the process.** Skip the generic double-diamond diagram.
   Show two or three moments where you made a choice, what you weighed, and why.
   That is what the `Decision` block is for.
3. **One idea per image**, with a caption that says what to look at.
4. **Be specific about your role.** In team projects, say what was yours.
5. **Be honest about the context.** Student and concept projects are fine; say
   that they are. Do not invent metrics. Qualitative results (what people said and
   did in tests) are worth more than vague numbers.
6. **End with what you learned** and what you would do next. Short and honest
   reads as senior.
7. **Length**: 800 to 1,500 words and 10 to 20 images is plenty. Cut anything
   that would be true of any project.

A good structure: Context → Research → Exploration → Design → Prototype and
testing → Outcome → Reflection. Rename and merge sections freely; the contents
list on the left follows your `##` headings.

## Before you publish

Run `npm run build`. It warns about any live project that still has template
text or placeholder images, an empty alt text, a summary or description of the
wrong length, or a cover that is too small. Then check:

- [ ] At a glance reads well on its own
- [ ] Every image has alt text and the captions say something
- [ ] Links work and open the right thing
- [ ] It reads well on a phone (Studio → Phone)
- [ ] Light and dark mode both look right (the toggle in the navigation)

## Other things you can change

| What | Where |
| --- | --- |
| The look of the live site | Design Studio (`/lab`) → **Copy for the live site** → paste over `src/design.config.ts` |
| Name, role, email, profiles, Impressum address | `src/site.config.ts` |
| Show the Apps or Notes section on the live site | `sections` in `src/site.config.ts` |
| About page text | `src/components/site/AboutContent.astro` |
| Home page intro | `src/components/site/Hero.astro` |
| CV | replace `public/files/john-beno-lakshman-cv.pdf` |
