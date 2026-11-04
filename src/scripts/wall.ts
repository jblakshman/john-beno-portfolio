/**
 * The playground wall: an endless, draggable canvas of live experiment tiles.
 * Tiles are created as they scroll into view and destroyed when they leave,
 * so only what you can see is running.
 */
import { experiments } from '../experiments';

type Item = { slug: string; title: string; description: string; experiment: string; tags: string[]; hue: string; sound: boolean };

const wall = document.querySelector<HTMLElement>('[data-wall]');
const world = document.querySelector<HTMLElement>('[data-world]');
const list = document.querySelector<HTMLElement>('[data-list]');
const toggle = document.querySelector<HTMLButtonElement>('[data-view-toggle]');
const hint = document.querySelector<HTMLElement>('[data-hint]');
const items: Item[] = JSON.parse(document.getElementById('pg-data')?.textContent ?? '[]');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (wall && world && list && toggle && items.length) {
  const cards: (Item | null)[] = [null, ...items]; // null = the intro card
  const N = cards.length;
  const mod = (a: number, n: number) => ((a % n) + n) % n;

  let W = 0,
    H = 0,
    GAP = 0;
  const measure = () => {
    const vw = window.innerWidth;
    W = Math.round(Math.min(400, Math.max(250, vw < 700 ? vw * 0.72 : vw * 0.27)));
    H = Math.round(W * 0.86);
    GAP = Math.round(Math.max(14, W * 0.06));
  };
  measure();

  const cam = { x: 0, y: 0, vx: 0, vy: 0 };
  const tiles = new Map<string, { el: HTMLElement; destroy?: () => void }>();

  const colX = (c: number) => c * (W + GAP);
  const rowY = (c: number, r: number) => r * (H + GAP) + (mod(c, 2) === 1 ? (H + GAP) / 2 : 0);

  function makeTile(c: number, r: number) {
    const card = cards[mod(c + 2 * r, N)];
    const el = document.createElement(card ? 'a' : 'div');
    el.className = card ? 'tile' : 'tile tile--intro';
    // Stop the browser's native link dragging, which would cancel panning.
    el.setAttribute('draggable', 'false');
    el.style.width = `${W}px`;
    el.style.height = `${H}px`;
    el.style.transform = `translate3d(${colX(c)}px, ${rowY(c, r)}px, 0)`;
    el.style.animationDelay = `${Math.min(400, (Math.abs(c) + Math.abs(r)) * 40)}ms`;
    let destroy: (() => void) | undefined;
    if (card) {
      (el as HTMLAnchorElement).href = `/playground/${card.slug}`;
      el.style.setProperty('--hue', card.hue);
      el.setAttribute('aria-label', `${card.title}: ${card.description}`);
      const stage = document.createElement('div');
      stage.className = 'tile-stage';
      const cap = document.createElement('div');
      cap.className = 'tile-caption';
      cap.innerHTML = `<span class="tile-title"></span><span class="label"></span>`;
      cap.children[0].textContent = card.title;
      cap.children[1].textContent = card.tags.join(' · ') + (card.sound ? ' · Sound' : '');
      el.append(stage, cap);
      let alive = true;
      experiments[card.experiment]?.().then((m) => {
        if (alive) destroy = m.default(stage, { mode: 'tile' });
      });
      return {
        el,
        destroy: () => {
          alive = false;
          destroy?.();
        },
      };
    }
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<p class="label" style="color:inherit;opacity:.6">Playground</p><h2>Things that move.</h2><p>Experiments by John Beno Lakshman. Drag to explore, open a tile to play with it full screen.</p>`;
    return { el };
  }

  function render() {
    const vw = wall!.clientWidth;
    const vh = wall!.clientHeight;
    world!.style.transform = `translate3d(${-cam.x}px, ${-cam.y}px, 0)`;
    const margin = W * 0.25;
    const c0 = Math.floor((cam.x - margin) / (W + GAP));
    const c1 = Math.floor((cam.x + vw + margin) / (W + GAP));
    const keep = new Set<string>();
    for (let c = c0; c <= c1; c++) {
      const off = mod(c, 2) === 1 ? (H + GAP) / 2 : 0;
      const r0 = Math.floor((cam.y - off - margin) / (H + GAP));
      const r1 = Math.floor((cam.y - off + vh + margin) / (H + GAP));
      for (let r = r0; r <= r1; r++) {
        const key = `${c},${r}`;
        keep.add(key);
        if (!tiles.has(key)) {
          const t = makeTile(c, r);
          world!.appendChild(t.el);
          tiles.set(key, t);
        }
      }
    }
    for (const [key, t] of tiles) {
      if (!keep.has(key)) {
        t.destroy?.();
        t.el.remove();
        tiles.delete(key);
      }
    }
  }

  function clearAll() {
    for (const t of tiles.values()) {
      t.destroy?.();
      t.el.remove();
    }
    tiles.clear();
  }

  // Start with the intro card near the top left of the screen.
  cam.x = -Math.round(window.innerWidth * 0.08);
  cam.y = -Math.round(window.innerHeight * 0.14);

  // Motion: drag, inertia, wheel, keys, and a slow idle drift.
  let raf = 0;
  let dragging = false;
  let moved = 0;
  let lastInput = performance.now();
  let pid = -1;
  let lx = 0,
    ly = 0,
    lt = 0;

  const tick = () => {
    raf = 0;
    if (!dragging) {
      cam.x += cam.vx;
      cam.y += cam.vy;
      cam.vx *= 0.93;
      cam.vy *= 0.93;
      if (Math.abs(cam.vx) < 0.05) cam.vx = 0;
      if (Math.abs(cam.vy) < 0.05) cam.vy = 0;
      const idle = performance.now() - lastInput > 2500;
      if (idle && !reduce && cam.vx === 0 && cam.vy === 0) {
        cam.x += 0.25;
        cam.y += 0.12;
      }
    }
    render();
    if (dragging || cam.vx || cam.vy || !reduce) raf = requestAnimationFrame(tick);
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const touched = () => {
    lastInput = performance.now();
    if (hint) hint.style.opacity = '0';
    kick();
  };

  wall.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    moved = 0;
    pid = e.pointerId;
    lx = e.clientX;
    ly = e.clientY;
    lt = performance.now();
    cam.vx = cam.vy = 0;
    touched();
  });
  wall.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pid) return;
    const dx = e.clientX - lx;
    const dy = e.clientY - ly;
    const now = performance.now();
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 6 && !wall.hasAttribute('data-dragging')) {
      wall.setAttribute('data-dragging', '');
      wall.setPointerCapture(pid);
    }
    cam.x -= dx;
    cam.y -= dy;
    const dt = Math.max(8, now - lt);
    cam.vx = (-dx / dt) * 16;
    cam.vy = (-dy / dt) * 16;
    lx = e.clientX;
    ly = e.clientY;
    lt = now;
    touched();
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (performance.now() - lt > 80) cam.vx = cam.vy = 0;
    setTimeout(() => wall.removeAttribute('data-dragging'), 0);
    kick();
  };
  wall.addEventListener('dragstart', (e) => e.preventDefault());
  wall.addEventListener('pointerup', end);
  wall.addEventListener('pointercancel', end);
  // A drag should never open a tile.
  wall.addEventListener(
    'click',
    (e) => {
      if (moved > 6) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );
  wall.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      cam.x += e.deltaX;
      cam.y += e.deltaY;
      touched();
    },
    { passive: false },
  );
  wall.addEventListener('keydown', (e) => {
    const step = 26;
    if (e.key === 'ArrowRight') cam.vx += step / 4;
    else if (e.key === 'ArrowLeft') cam.vx -= step / 4;
    else if (e.key === 'ArrowDown') cam.vy += step / 4;
    else if (e.key === 'ArrowUp') cam.vy -= step / 4;
    else return;
    e.preventDefault();
    touched();
  });
  // Keep keyboard focus visible: bring a focused tile into view.
  wall.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement;
    if (!t.classList?.contains('tile')) return;
    const r = t.getBoundingClientRect();
    const pad = 40;
    if (r.left < pad) cam.x -= pad - r.left;
    if (r.right > window.innerWidth - pad) cam.x += r.right - (window.innerWidth - pad);
    if (r.top < 80) cam.y -= 80 - r.top;
    if (r.bottom > window.innerHeight - 80) cam.y += r.bottom - (window.innerHeight - 80);
    touched();
  });
  window.addEventListener('resize', () => {
    measure();
    clearAll();
    render();
  });

  // Canvas or list view, remembered per visitor.
  const setView = (view: 'canvas' | 'list') => {
    const isList = view === 'list';
    wall.hidden = isList;
    list.hidden = !isList;
    toggle.textContent = isList ? 'Canvas view' : 'List view';
    toggle.setAttribute('aria-pressed', String(isList));
    if (hint) hint.hidden = isList;
    try {
      localStorage.setItem('pg-view', view);
    } catch {}
    if (isList) {
      clearAll();
      cancelAnimationFrame(raf);
      raf = 0;
      document.documentElement.style.overflow = '';
    } else {
      document.documentElement.style.overflow = 'hidden';
      render();
      kick();
    }
  };
  toggle.addEventListener('click', () => setView(wall.hidden ? 'canvas' : 'list'));
  let saved: string | null = null;
  try {
    saved = localStorage.getItem('pg-view');
  } catch {}
  setView(saved === 'list' ? 'list' : 'canvas');
}
