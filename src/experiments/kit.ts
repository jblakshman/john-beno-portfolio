/** Shared helpers for playground experiments. */
export type Mode = 'tile' | 'full';
export type Mount = (host: HTMLElement, opts: { mode: Mode }) => () => void;

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface Pointer {
  x: number;
  y: number;
  inside: boolean;
  down: boolean;
  /** Smoothed velocity in px/s */
  vx: number;
  vy: number;
}

/** A canvas that fills its host, handles device pixel ratio and tracks the pointer. */
export function stage(host: HTMLElement, maxDpr = 2) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  host.appendChild(canvas);
  const g = canvas.getContext('2d')!;
  const size = { w: 1, h: 1, dpr: 1 };
  const pointer: Pointer = { x: -1e4, y: -1e4, inside: false, down: false, vx: 0, vy: 0 };
  let lastMove = 0;

  const resize = () => {
    const r = host.getBoundingClientRect();
    size.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    size.w = Math.max(1, r.width);
    size.h = Math.max(1, r.height);
    canvas.width = Math.round(size.w * size.dpr);
    canvas.height = Math.round(size.h * size.dpr);
    g.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  const local = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onMove = (e: PointerEvent) => {
    const p = local(e);
    const now = performance.now();
    const dt = Math.max(1, now - lastMove) / 1000;
    pointer.vx = pointer.vx * 0.6 + ((p.x - pointer.x) / dt) * 0.4;
    pointer.vy = pointer.vy * 0.6 + ((p.y - pointer.y) / dt) * 0.4;
    lastMove = now;
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.inside = true;
  };
  const onLeave = () => {
    pointer.inside = false;
    pointer.down = false;
  };
  const onDown = (e: PointerEvent) => {
    onMove(e);
    pointer.down = true;
  };
  const onUp = () => (pointer.down = false);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerenter', onMove);
  host.addEventListener('pointerleave', onLeave);
  host.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);

  return {
    canvas,
    g,
    size,
    pointer,
    destroy() {
      ro.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerenter', onMove);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      canvas.remove();
    },
  };
}

/** requestAnimationFrame loop that only runs while the host is on screen. */
export function visibleLoop(host: HTMLElement, frame: (t: number, dt: number) => void) {
  let raf = 0;
  let last = 0;
  let visible = false;
  const step = (now: number) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    frame(now / 1000, dt);
    raf = requestAnimationFrame(step);
  };
  const start = () => {
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(step);
    }
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible && !document.hidden ? start() : stop();
  });
  io.observe(host);
  const onVis = () => (visible && !document.hidden ? start() : stop());
  document.addEventListener('visibilitychange', onVis);
  // Draw one frame immediately so the tile is never blank.
  requestAnimationFrame((n) => frame(n / 1000, 1 / 60));
  return () => {
    stop();
    io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  };
}

/** Read a CSS custom property from the host (falls back to the given value). */
export function cssVar(el: HTMLElement, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
