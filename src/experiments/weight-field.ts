import { clamp, reducedMotion, type Mount } from './kit';

/**
 * Weight Field: letters gain weight and width as the pointer comes closer.
 * Mona Sans is a variable font with a weight axis (200–900) and a width axis (75–125).
 */
const mount: Mount = (host, { mode }) => {
  const full = mode === 'full';
  const lines = full ? ['LEARNING', 'THROUGH', 'MAKING'] : ['LEARNING', 'THROUGH', 'MAKING'];
  const box = document.createElement('div');
  box.setAttribute('aria-label', lines.join(' ').toLowerCase());
  box.setAttribute('role', 'img');
  box.style.cssText = `position:absolute;inset:0;display:grid;align-content:center;justify-items:center;gap:0;font-family:var(--font-sans);color:var(--ink);line-height:.86;letter-spacing:-0.02em;user-select:none;padding:${full ? '6vh 4vw' : '10px'};`;
  host.appendChild(box);

  const letters: HTMLSpanElement[] = [];
  const rowsEl: HTMLDivElement[] = [];
  for (const word of lines) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;white-space:nowrap;';
    for (const ch of word) {
      const sp = document.createElement('span');
      sp.textContent = ch;
      sp.setAttribute('aria-hidden', 'true');
      sp.style.cssText = "display:inline-block;font-variation-settings:'wght' 300,'wdth' 90;transition:color .4s;";
      row.appendChild(sp);
      letters.push(sp);
    }
    box.appendChild(row);
    rowsEl.push(row);
  }

  // Fit text size to the host.
  const fit = () => {
    const r = host.getBoundingClientRect();
    const longest = Math.max(...lines.map((l) => l.length));
    const size = Math.min((r.width * 0.92) / (longest * 0.72), (r.height * 0.86) / (lines.length * 0.9));
    box.style.fontSize = `${Math.max(12, size)}px`;
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(host);

  let invert = false;
  let px = -1e4,
    py = -1e4,
    inside = false;
  const move = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    px = e.clientX - r.left;
    py = e.clientY - r.top;
    inside = true;
  };
  const leave = () => (inside = false);
  const click = () => {
    if (full) invert = !invert;
  };
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerleave', leave);
  host.addEventListener('click', click);

  const state = letters.map(() => ({ w: 300, d: 90 }));
  let raf = 0;
  const calm = reducedMotion();
  const frame = (now: number) => {
    const t = now / 1000;
    const r = host.getBoundingClientRect();
    const reach = Math.max(r.width, r.height) * (full ? 0.32 : 0.45);
    // Read all positions first, then write, so the browser lays out once per frame.
    const rects = letters.map((el) => el.getBoundingClientRect());
    letters.forEach((el, i) => {
      const b = rects[i];
      const cx = b.left - r.left + b.width / 2;
      const cy = b.top - r.top + b.height / 2;
      let k: number;
      if (inside) {
        const d = Math.hypot(cx - px, cy - py);
        k = clamp(1 - d / reach, 0, 1);
        k = k * k * (3 - 2 * k);
      } else if (!calm) {
        k = 0.5 + 0.5 * Math.sin(cx / r.width * 5 - t * 1.6 + cy / r.height * 2);
        k *= 0.85;
      } else k = 0.3;
      if (invert) k = 1 - k;
      const tw = 200 + k * 700;
      const td = 75 + k * 50;
      const s = state[i];
      s.w += (tw - s.w) * 0.18;
      s.d += (td - s.d) * 0.18;
      el.style.fontVariationSettings = `'wght' ${s.w.toFixed(0)}, 'wdth' ${s.d.toFixed(1)}`;
      el.style.color = k > 0.82 ? 'var(--hue)' : '';
    });
    raf = requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      if (!raf) raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  });
  io.observe(host);

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    host.removeEventListener('pointermove', move);
    host.removeEventListener('pointerleave', leave);
    host.removeEventListener('click', click);
    box.remove();
  };
};
export default mount;
