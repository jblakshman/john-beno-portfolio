import { clamp, reducedMotion, stage, visibleLoop, type Mount } from './kit';

/**
 * Tag Drop: the tags from the Voice Notes redesign, falling into a box.
 * Grab one and throw it. Simple circle physics with position-based collisions.
 */
const TAGS = ['#vocal', '#riff', '#verse', '#chorus', '#bass', '#idea', '#hook', '#take 2', '#demo', '#loop', '#bridge', '#keys', '#outro', '#beat'];
// Soft blue, yellow, green, purple and pink, after the Voice Notes color coding.
const COLORS = ['#a9c8f5', '#f6d38c', '#a8dcb0', '#c6b8f2', '#f4a9b8'];

type Body = { x: number; y: number; px: number; py: number; r: number; label: string; color: string };

const mount: Mount = (host, { mode }) => {
  const full = mode === 'full';
  const s = stage(host);
  const { g, size, pointer } = s;
  const calm = reducedMotion();
  const bodies: Body[] = [];
  let grabbed: Body | null = null;

  const spawn = () => {
    bodies.length = 0;
    const base = Math.min(size.w, size.h);
    const count = full ? TAGS.length : 9;
    for (let i = 0; i < count; i++) {
      const r = base * (full ? 0.075 : 0.11) * (0.8 + ((i * 37) % 10) / 22);
      const x = size.w * (0.2 + ((i * 53) % 60) / 100);
      const y = -r * (1 + i * 1.6);
      bodies.push({ x, y, px: x, py: y, r, label: TAGS[i % TAGS.length], color: COLORS[i % COLORS.length] });
    }
  };
  spawn();
  let lastW = size.w;

  const onDown = (e: PointerEvent) => {
    if (!full) return;
    const hit = bodies.find((b) => Math.hypot(b.x - pointer.x, b.y - pointer.y) < b.r);
    if (hit) {
      grabbed = hit;
      host.setPointerCapture(e.pointerId);
    }
  };
  const onUp = () => (grabbed = null);
  const onDbl = () => full && spawn();
  host.addEventListener('pointerdown', onDown);
  host.addEventListener('pointerup', onUp);
  host.addEventListener('dblclick', onDbl);
  if (full) host.style.touchAction = 'none';

  const stop = visibleLoop(host, (t, dt) => {
    if (Math.abs(size.w - lastW) > 40) {
      spawn();
      lastW = size.w;
    }
    const steps = 3;
    const h = dt / steps;
    // Tiles tilt gently over time; full mode leans toward the pointer.
    let gx = 0;
    if (!full && !calm) gx = Math.sin(t * 0.6) * 500;
    if (full && pointer.inside && !grabbed) gx = ((pointer.x / size.w) - 0.5) * 300;
    const gy = 1600;

    for (let k = 0; k < steps; k++) {
      for (const b of bodies) {
        const vx = (b.x - b.px) * 0.995;
        const vy = (b.y - b.py) * 0.995;
        b.px = b.x;
        b.py = b.y;
        b.x += vx + gx * h * h;
        b.y += vy + gy * h * h;
      }
      if (grabbed) {
        grabbed.x += (pointer.x - grabbed.x) * 0.35;
        grabbed.y += (pointer.y - grabbed.y) * 0.35;
      }
      // Collisions between bodies
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i];
          const b = bodies[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const min = a.r + b.r;
          const d2 = dx * dx + dy * dy;
          if (d2 < min * min && d2 > 0.0001) {
            const d = Math.sqrt(d2);
            const push = (min - d) / 2;
            const nx = dx / d;
            const ny = dy / d;
            a.x -= nx * push;
            a.y -= ny * push;
            b.x += nx * push;
            b.y += ny * push;
          }
        }
      }
      // Walls (open top so tags can fall in)
      for (const b of bodies) {
        if (b.y > size.h - b.r) {
          const vy = b.y - b.py;
          b.y = size.h - b.r;
          b.py = b.y + vy * 0.35;
        }
        if (b.x < b.r) {
          b.x = b.r;
          b.px = b.x + (b.x - b.px) * 0.3;
        }
        if (b.x > size.w - b.r) {
          b.x = size.w - b.r;
          b.px = b.x + (b.x - b.px) * 0.3;
        }
      }
    }

    g.clearRect(0, 0, size.w, size.h);
    for (const b of bodies) {
      const hover = full && Math.hypot(b.x - pointer.x, b.y - pointer.y) < b.r;
      g.fillStyle = b.color;
      g.beginPath();
      g.arc(b.x, b.y, b.r * (b === grabbed ? 1.06 : hover ? 1.03 : 1), 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#121211';
      g.font = `550 ${clamp(b.r * 0.34, 8, 22)}px "Martian Mono Variable", ui-monospace, monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(b.label, b.x, b.y);
    }
    host.style.cursor = full ? (grabbed ? 'grabbing' : bodies.some((b) => Math.hypot(b.x - pointer.x, b.y - pointer.y) < b.r) ? 'grab' : '') : '';
  });

  return () => {
    stop();
    host.removeEventListener('pointerdown', onDown);
    host.removeEventListener('pointerup', onUp);
    host.removeEventListener('dblclick', onDbl);
    s.destroy();
  };
};
export default mount;
