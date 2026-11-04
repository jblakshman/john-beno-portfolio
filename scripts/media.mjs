#!/usr/bin/env node
/**
 * Prepare videos for the site with ffmpeg (brew install ffmpeg).
 *
 *   npm run media -- web   input.mov [--name demo] [--project slug] [--audio]
 *   npm run media -- scrub input.mov [--name walkthrough] [--project slug]
 *   npm run media -- loop  input.mov [--name preview] [--project slug] [--start 2 --length 6]
 *
 * web    H.264 for <Video>, up to 1920 px wide, sound removed unless --audio.
 * scrub  For <Scrub>: a keyframe every 3 frames so scrolling can seek smoothly.
 * loop   A short, small, silent loop for a project's previewVideo.
 *
 * The video goes to public/media/<name>.mp4. A poster frame goes to
 * src/assets/work/<project>/<name>-poster.jpg (or src/assets/media/).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const [mode, input, ...rest] = process.argv.slice(2);
const opt = (k, d) => {
  const i = rest.indexOf(`--${k}`);
  return i === -1 ? d : rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[i + 1] : true;
};
if (!['web', 'scrub', 'loop'].includes(mode) || !input) {
  console.error('Usage: npm run media -- <web|scrub|loop> <input> [--name n] [--project slug]');
  process.exit(1);
}
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('ffmpeg is not installed. On a Mac: brew install ffmpeg');
  process.exit(1);
}

const name = opt('name', basename(input, extname(input)).toLowerCase().replace(/[^a-z0-9]+/g, '-'));
const project = opt('project');
const out = join('public/media', `${name}.mp4`);
const posterDir = project ? join('src/assets/work', project) : 'src/assets/media';
const poster = join(posterDir, `${name}-poster.jpg`);
mkdirSync('public/media', { recursive: true });
mkdirSync(posterDir, { recursive: true });

const settings = {
  web: { width: 1920, crf: 23, extra: [] },
  scrub: { width: 1600, crf: 22, extra: ['-g', '3', '-keyint_min', '3', '-sc_threshold', '0', '-bf', '0'] },
  loop: { width: 1280, crf: 28, extra: [] },
}[mode];
const audio = mode === 'web' && opt('audio') ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an'];
const trim = mode === 'loop' ? ['-ss', String(opt('start', 0)), '-t', String(opt('length', 6))] : [];

execFileSync(
  'ffmpeg',
  ['-y', '-hide_banner', '-loglevel', 'error', ...trim, '-i', input,
    '-vf', `scale='min(${settings.width},iw)':-2:flags=lanczos,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(settings.crf), '-profile:v', 'high',
    ...settings.extra, ...audio, '-movflags', '+faststart', out],
  { stdio: 'inherit' },
);
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', out, '-vf', 'select=eq(n\\,0)', '-frames:v', '1', '-q:v', '3', poster], { stdio: 'inherit' });

const mb = (statSync(out).size / 1e6).toFixed(1);
const posterImport = project ? `../../assets/work/${project}/${name}-poster.jpg` : `../../assets/media/${name}-poster.jpg`;
const var_ = name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()) + 'Poster';
console.log(`\n  ${out}  (${mb} MB)\n  ${poster}\n`);
if (Number(mb) > 12) console.log('  Larger than 12 MB. Consider a shorter clip, or --name with a smaller crop.\n');
console.log('  In your .mdx file:\n');
console.log(`  import ${var_} from '${posterImport}';`);
if (mode === 'scrub') console.log(`  <Scrub src="/media/${name}.mp4" poster={${var_}} label="…" steps={['…', '…', '…']} />\n`);
else if (mode === 'loop') console.log(`  previewVideo: /media/${name}.mp4   (in the frontmatter)\n`);
else console.log(`  <Video src="/media/${name}.mp4" poster={${var_}} caption="…" />\n`);
