import { experiments } from '../experiments';
import type { Mode } from '../experiments/kit';

/** Mounts every element with data-experiment="name" on the page. */
document.querySelectorAll<HTMLElement>('[data-experiment]').forEach(async (host) => {
  const load = experiments[host.dataset.experiment ?? ''];
  if (!load) return;
  const mod = await load();
  mod.default(host, { mode: (host.dataset.mode as Mode) ?? 'tile' });
  host.dataset.mounted = '';
});
