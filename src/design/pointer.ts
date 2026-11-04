/**
 * Pointers.
 *  - Adaptive (like iPadOS): a soft dot that wraps around controls with spring
 *    physics, nudges them toward the pointer, and turns into a beam over text.
 *  - Label: a small pill that names what a click will do.
 */
const root = document.documentElement;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Spring = { x: number; v: number };
const sp = (x = 0): Spring => ({ x, v: 0 });
function step(s: Spring, target: number, k: number, c: number, dt: number) {
  const a = k * (target - s.x) - c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
}

export function initPointer() {
  if (!fine) return;
  const ptr = document.querySelector<HTMLElement>('.ptr');
  const ptrText = ptr?.querySelector('span');
  const label = document.querySelector<HTMLElement>('.cur--label');
  const labelText = label?.querySelector('span');
  if (!ptr || !label || !ptrText || !labelText) return;

  let px = -100, py = -100;
  const x = sp(-100), y = sp(-100), w = sp(18), h = sp(18), r = sp(9);
  const lx = sp(-100), ly = sp(-100);
  let mode: 'dot' | 'wrap' | 'beam' | 'big' | 'hidden' = 'dot';
  let target = { x: -100, y: -100, w: 18, h: 18, r: 9 };
  let magnet: HTMLElement | null = null;
  const mx = sp(), my = sp();
  let magnetTarget = { x: 0, y: 0 };
  let releasing: { el: HTMLElement; x: Spring; y: Spring }[] = [];
  let last = performance.now();

  const isText = (el: Element) => {
    const t = el.closest('p, h1, h2, h3, h4, li, dd, dt, figcaption, blockquote');
    if (!t || el.closest('a, button, label, summary, [data-cur]')) return null;
    return t as HTMLElement;
  };

  function resolve(e: PointerEvent) {
    const t = e.target as HTMLElement;
    const kind = root.dataset.cursor;
    if (kind === 'label') {
      const c = t.closest?.<HTMLElement>('[data-cur]');
      if (c) {
        labelText!.textContent = c.dataset.cur ?? '';
        label!.dataset.on = '';
      } else delete label!.dataset.on;
      return;
    }
    if (kind !== 'pointer') return;
    const hv = root.dataset.hover;
    // Over a project image with the loupe, the loupe is the pointer.
    if (hv === 'loupe' && t.closest('.p .m, .prose .fig--none > .fig-m')) {
      setMagnet(null);
      mode = 'hidden';
      target = { x: px, y: py, w: 18, h: 18, r: 9 };
      return;
    }
    const card = t.closest<HTMLElement>('[data-cur]');
    if (card && !t.closest('.pill')) {
      setMagnet(null);
      mode = 'big';
      ptrText!.textContent = card.dataset.cur?.replace(' case study', '') ?? '';
      target = { x: px, y: py, w: 76, h: 76, r: 38 };
      return;
    }
    const ctl = t.closest<HTMLElement>('a, button, summary, label, [role="button"]');
    if (ctl) {
      const b = ctl.getBoundingClientRect();
      if (b.width < 420 && b.height < 120) {
        setMagnet(ctl);
        mode = 'wrap';
        const padX = Math.min(12, 6 + b.height * 0.1);
        const padY = 5;
        const br = parseFloat(getComputedStyle(ctl).borderTopLeftRadius) || 0;
        const rad = br > b.height / 2 - 1 ? (b.height + padY * 2) / 2 : Math.min(12, (b.height + padY * 2) / 2);
        target = { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width + padX * 2, h: b.height + padY * 2, r: rad };
        magnetTarget = { x: ((px - (b.left + b.width / 2)) / b.width) * 6, y: ((py - (b.top + b.height / 2)) / b.height) * 4 };
        return;
      }
    }
    setMagnet(null);
    const text = isText(t);
    if (text) {
      const fs = parseFloat(getComputedStyle(text).fontSize) || 16;
      mode = 'beam';
      target = { x: px, y: py, w: 2, h: Math.round(fs * 1.15), r: 1 };
      return;
    }
    mode = 'dot';
    target = { x: px, y: py, w: 18, h: 18, r: 9 };
  }

  function setMagnet(el: HTMLElement | null) {
    if (magnet === el) return;
    if (magnet) releasing.push({ el: magnet, x: { ...mx }, y: { ...my } });
    magnet = el;
    mx.x = my.x = mx.v = my.v = 0;
    magnetTarget = { x: 0, y: 0 };
  }

  function loop(now: number) {
    const dt = Math.min(0.033, (now - last) / 1000) || 1 / 60;
    last = now;
    const kind = root.dataset.cursor;
    if (kind === 'label') {
      step(lx, px, 520, 40, dt);
      step(ly, py, 520, 40, dt);
      label!.style.transform = `translate3d(${lx.x}px, ${ly.x}px, 0)`;
    }
    if (kind === 'pointer') {
      const k = reduce ? 4000 : 600;
      const c = reduce ? 120 : 44;
      if (magnet) {
        step(mx, magnetTarget.x, 400, 30, dt);
        step(my, magnetTarget.y, 400, 30, dt);
        magnet.style.translate = `${mx.x.toFixed(2)}px ${my.x.toFixed(2)}px`;
      }
      releasing = releasing.filter((m) => {
        step(m.x, 0, 300, 26, dt);
        step(m.y, 0, 300, 26, dt);
        const done = Math.abs(m.x.x) < 0.05 && Math.abs(m.y.x) < 0.05 && Math.abs(m.x.v) < 0.5;
        m.el.style.translate = done ? '' : `${m.x.x.toFixed(2)}px ${m.y.x.toFixed(2)}px`;
        return !done;
      });
      const tx = mode === 'wrap' ? target.x + mx.x : target.x;
      const ty = mode === 'wrap' ? target.y + my.x : target.y;
      step(x, tx, mode === 'beam' || mode === 'dot' ? k * 1.6 : k, c, dt);
      step(y, ty, mode === 'beam' || mode === 'dot' ? k * 1.6 : k, c, dt);
      step(w, target.w, 520, 38, dt);
      step(h, target.h, 520, 38, dt);
      step(r, target.r, 520, 38, dt);
      ptr!.dataset.mode = mode;
      ptr!.style.transform = `translate3d(${(x.x - w.x / 2).toFixed(2)}px, ${(y.x - h.x / 2).toFixed(2)}px, 0)`;
      ptr!.style.width = `${Math.max(1, w.x).toFixed(2)}px`;
      ptr!.style.height = `${Math.max(1, h.x).toFixed(2)}px`;
      ptr!.style.borderRadius = `${Math.max(0, r.x).toFixed(2)}px`;
    }
    requestAnimationFrame(loop);
  }

  document.addEventListener('pointermove', (e) => {
    const first = px < -50;
    px = e.clientX;
    py = e.clientY;
    if (first) {
      x.x = lx.x = px;
      y.x = ly.x = py;
    }
    resolve(e);
    if (mode === 'dot' || mode === 'beam' || mode === 'big' || mode === 'hidden') {
      target.x = px;
      target.y = py;
    }
  });
  document.addEventListener('pointerdown', () => {
    if (root.dataset.cursor !== 'pointer') return;
    w.v -= 140;
    h.v -= 140;
  });
  document.addEventListener('pointerleave', () => {
    mode = 'hidden';
    delete label.dataset.on;
    setMagnet(null);
  });
  window.addEventListener('scroll', () => {
    // Controls move under a resting pointer while scrolling; re-check.
    const el = document.elementFromPoint(px, py);
    if (el) resolve({ target: el } as unknown as PointerEvent);
  }, { passive: true });
  requestAnimationFrame(loop);
}
