import { clamp, cssVar, reducedMotion, stage, visibleLoop, type Mount } from './kit';

/**
 * Pin Table: a field of pins that rises under the pointer, like a
 * shape-changing display. A nod to the Tactical Haptic Twin.
 */
const mount: Mount = (host, { mode }) => {
  const s = stage(host);
  const { g, size, pointer } = s;
  const calm = reducedMotion();
  const hue = cssVar(host, '--hue', '#ff6a3d');
  const ink = cssVar(host, '--ink', '#f2f1ed');

  type Pin = { bx: number; by: number; h: number; v: number };
  let pins: Pin[] = [];
  let cols = 0;
  let rows = 0;
  let spacing = 0;
  const ripples: { x: number; y: number; t: number }[] = [];

  const layout = () => {
    spacing = mode === 'full' ? clamp(size.w / 34, 16, 30) : clamp(size.w / 18, 11, 18);
    cols = Math.ceil(size.w / spacing) + 2;
    rows = Math.ceil(size.h / (spacing * 0.62)) + 4;
    pins = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        pins.push({ bx: (i - 0.5) * spacing + (j % 2) * spacing * 0.5, by: (j - 1) * spacing * 0.62, h: 0, v: 0 });
      }
    }
  };
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(host);

  const onDown = () => ripples.push({ x: pointer.x, y: pointer.y, t: 0 });
  host.addEventListener('pointerdown', onDown);

  const maxH = () => spacing * (mode === 'full' ? 3.2 : 2.6);
  const radius = () => spacing * (mode === 'full' ? 5 : 4);

  // When nobody is pointing, a slow "ghost" pointer wanders so the table is never still.
  const ghost = { x: 0, y: 0 };
  let idleFor = 0;

  const stop = visibleLoop(host, (t, dt) => {
    g.clearRect(0, 0, size.w, size.h);
    const R = radius();
    const H = maxH();
    for (const r of ripples) r.t += dt;
    while (ripples.length && ripples[0].t > 2.2) ripples.shift();

    idleFor = pointer.inside ? 0 : idleFor + dt;
    const useGhost = !pointer.inside && !calm && idleFor > 0.4;
    ghost.x = size.w * (0.5 + 0.34 * Math.sin(t * 0.37));
    ghost.y = size.h * (0.52 + 0.3 * Math.sin(t * 0.53 + 1.3));
    const fx = pointer.inside ? pointer.x : ghost.x;
    const fy = pointer.inside ? pointer.y : ghost.y;
    const strength = pointer.inside ? (pointer.down ? 1.25 : 1) : useGhost ? 0.8 : 0;

    const dot = spacing * 0.085;
    const colW = Math.max(1, spacing * 0.16);
    for (const p of pins) {
      let target = 0;
      if (strength) {
        const dx = p.bx - fx;
        const dy = (p.by - fy) * 1.25;
        target = Math.exp(-(dx * dx + dy * dy) / (R * R)) * strength;
      }
      if (!calm) target += 0.035 * (Math.sin(p.bx * 0.016 + t * 1.1) + Math.cos(p.by * 0.028 - t * 0.8));
      for (const r of ripples) {
        const d = Math.hypot(p.bx - r.x, (p.by - r.y) * 1.25);
        const front = r.t * spacing * 22;
        target += Math.exp(-((d - front) ** 2) / (spacing * spacing * 6)) * (1 - r.t / 2.2) * 0.9;
      }
      // Spring toward the target height.
      p.v += (target - p.h) * 0.16;
      p.v *= 0.78;
      p.h += p.v;

      const k = clamp(p.h, 0, 1.2);
      const hh = Math.max(0, p.h) * H;
      const topY = p.by - hh;
      if (hh > 1.5) {
        g.globalAlpha = 0.06 + k * 0.3;
        g.fillStyle = ink;
        g.fillRect(p.bx - colW / 2, topY, colW, hh);
      }
      g.globalAlpha = 0.2 + Math.min(1, k) * 0.8;
      g.fillStyle = k > 0.22 ? hue : ink;
      g.beginPath();
      g.arc(p.bx, topY, dot * (1 + k * 1.6), 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  });

  return () => {
    stop();
    ro.disconnect();
    host.removeEventListener('pointerdown', onDown);
    s.destroy();
  };
};
export default mount;
