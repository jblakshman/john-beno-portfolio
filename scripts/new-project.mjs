#!/usr/bin/env node
/**
 * Start a new case study from the template.
 *
 *   npm run new -- "Project name"
 *
 * Creates src/content/work/<slug>.mdx (as a draft, so it only shows in the
 * Studio) and src/assets/work/<slug>/ with placeholder images to replace.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('Give the project a name:  npm run new -- "Project name"');
  process.exit(1);
}
const slug = title
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const work = 'src/content/work';
const file = join(work, `${slug}.mdx`);
const assets = join('src/assets/work', slug);
if (existsSync(file)) {
  console.error(`${file} already exists.`);
  process.exit(1);
}

// Next free position in the work list.
const orders = readdirSync(work)
  .filter((f) => f.endsWith('.mdx') && f !== 'case-study-template.mdx')
  .map((f) => Number(/^order:\s*(\d+)/m.exec(readFileSync(join(work, f), 'utf8'))?.[1] ?? 0));
const order = Math.max(0, ...orders) + 1;

let mdx = readFileSync(join(work, 'case-study-template.mdx'), 'utf8');
mdx = mdx
  .replace(/^---\n(#.*\n)+/, '---\n# Draft: visible in the Studio only. Set draft: false to publish. Guide: CONTENT.md\n')
  .replace(/^title: .*$/m, `title: ${title}`)
  .replace(/^order: .*$/m, `order: ${order}`)
  .replace(/^featured: .*$/m, 'featured: true')
  .replaceAll('case-study-template/', `${slug}/`);
writeFileSync(file, mdx);

mkdirSync(assets, { recursive: true });
for (const f of readdirSync('src/assets/work/case-study-template')) copyFileSync(join('src/assets/work/case-study-template', f), join(assets, f));

console.log(`
  Created ${file}
  Created ${assets}/ with placeholder images

  Next:
  1. npm run dev, open http://localhost:4321/lab and pick "${title} (draft)" in the page menu
  2. Replace the images in ${assets}/ and the text in the .mdx file
  3. Set draft: false when it is ready to go live
`);
