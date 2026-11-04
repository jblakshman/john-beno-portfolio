import { cssVar, reducedMotion, stage, visibleLoop, type Mount } from './kit';

/**
 * Sweep: a watch dial running on Munich time. Three escapements to compare:
 * a quartz tick (1 beat/s), a mechanical 28,800 vph movement (8 beats/s) and a
 * continuous glide. Drag across the dial to travel through time; double-click to return.
 */
type Movement = 'quartz' | 'mechanical' | 'glide';

const mount: Mount = (host, { mode }) => {
  const full = mode === 'full';
  const s = stage(host);
  const { g, size } = s;
  const hue = cssVar(host, '--hue', '#c9a27a');
  const ink = cssVar(host, '--ink', '#f2f1ed');
  const calm = reducedMotion();
  let movement: Movement = calm ? 'quartz' : 'mechanical';
  let offset = 0; // ms of time travel
  let dragAngle: number | null = null;

  const fmtParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });
  const munich = (ms: number) => {
    const parts = fmtParts.formatToParts(new Date(ms));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    return { h: get('hour'), m: get('minute'), s: get('second'), ms: ms % 1000 };
  };

  let controls: HTMLDivElement | null = null;
  let readout: HTMLParagraphElement | null = null;
  if (full) {
    controls = document.createElement('div');
    controls.setAttribute('role', 'radiogroup');
    controls.setAttribute('aria-label', 'Movement');
    controls.style.cssText = 'position:absolute;left:50%;bottom:clamp(16px,4vh,40px);transform:translateX(-50%);display:flex;gap:8px;flex-wrap:wrap;justify-content:center;';
    const opts: [Movement, string][] = [
      ['quartz', 'Quartz · 1 beat/s'],
      ['mechanical', 'Mechanical · 8 beats/s'],
      ['glide', 'Glide'],
    ];
    const btns: HTMLButtonElement[] = [];
    for (const [id, label] of opts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill';
      b.textContent = label;
      b.setAttribute('role', 'radio');
      b.addEventListener('click', () => {
        movement = id;
        sync();
      });
      btns.push(b);
      controls.appendChild(b);
    }
    const sync = () =>
      btns.forEach((b, i) => {
        const on = opts[i][0] === movement;
        b.setAttribute('aria-checked', String(on));
        b.classList.toggle('pill--solid', on);
      });
    sync();
    readout = document.createElement('p');
    readout.className = 'label';
    readout.style.cssText = 'position:absolute;left:50%;bottom:calc(clamp(16px,4vh,40px) + 52px);transform:translateX(-50%);white-space:nowrap;';
    host.append(controls, readout);
  }

  const center = () => ({ cx: size.w / 2, cy: size.h / 2, r: Math.min(size.w, size.h * (full ? 0.86 : 1)) * (full ? 0.3 : 0.4) });
  const angleAt = (x: number, y: number) => {
    const { cx, cy } = center();
    return Math.atan2(y - cy, x - cx);
  };
  const onDown = (e: PointerEvent) => {
    if (!full) return;
    const r = host.getBoundingClientRect();
    dragAngle = angleAt(e.clientX - r.left, e.clientY - r.top);
    host.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (dragAngle === null) return;
    const r = host.getBoundingClientRect();
    const a = angleAt(e.clientX - r.left, e.clientY - r.top);
    let d = a - dragAngle;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    offset += (d / (Math.PI * 2)) * 3600_000; // one turn = one hour
    dragAngle = a;
  };
  const onUp = () => (dragAngle = null);
  const onDbl = () => (offset = 0);
  host.addEventListener('pointerdown', onDown);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerup', onUp);
  host.addEventListener('dblclick', onDbl);
  if (full) host.style.touchAction = 'none';

  const hand = (angle: number, len: number, width: number, color: string, tail = 0) => {
    g.save();
    g.rotate(angle);
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, tail);
    g.lineTo(0, -len);
    g.stroke();
    g.restore();
  };

  const stop = visibleLoop(host, () => {
    const now = Date.now() + offset;
    const t = munich(now);
    let sec = t.s + t.ms / 1000;
    if (movement === 'quartz') sec = Math.floor(sec);
    else if (movement === 'mechanical') sec = Math.floor(sec * 8) / 8;
    const min = t.m + sec / 60;
    const hr = (t.h % 12) + min / 60;

    const { cx, cy, r } = center();
    g.clearRect(0, 0, size.w, size.h);
    g.save();
    g.translate(cx, cy);

    // Bezel and dial
    g.fillStyle = 'rgba(255,255,255,0.03)';
    g.beginPath();
    g.arc(0, 0, r * 1.06, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = ink;
    g.globalAlpha = 0.25;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(0, 0, r * 1.06, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;

    // Minute track
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const major = i % 5 === 0;
      g.save();
      g.rotate(a);
      g.strokeStyle = ink;
      g.globalAlpha = major ? 0.95 : 0.35;
      g.lineWidth = major ? Math.max(2, r * 0.022) : 1;
      g.beginPath();
      g.moveTo(0, -r * (major ? 0.82 : 0.9));
      g.lineTo(0, -r * 0.96);
      g.stroke();
      g.restore();
    }
    g.globalAlpha = 1;

    if (full || r > 70) {
      g.fillStyle = ink;
      g.globalAlpha = 0.5;
      g.font = `500 ${Math.max(8, r * 0.06)}px "Martian Mono Variable", ui-monospace, monospace`;
      g.textAlign = 'center';
      g.fillText('MÜNCHEN', 0, r * 0.42);
      g.fillText(movement === 'mechanical' ? '28 800 A/h' : movement === 'quartz' ? 'QUARTZ' : 'GLIDE', 0, r * 0.52);
      g.globalAlpha = 1;
    }

    hand((hr / 12) * Math.PI * 2, r * 0.52, Math.max(3, r * 0.045), ink);
    hand((min / 60) * Math.PI * 2, r * 0.8, Math.max(2, r * 0.03), ink);
    hand((sec / 60) * Math.PI * 2, r * 0.9, Math.max(1, r * 0.01), hue, r * 0.18);
    g.fillStyle = hue;
    g.beginPath();
    g.arc(0, 0, Math.max(3, r * 0.03), 0, Math.PI * 2);
    g.fill();
    g.restore();

    if (readout) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const travel = Math.round(offset / 60000);
      readout.textContent = `Munich ${pad(t.h)}:${pad(t.m)}:${pad(t.s)}${travel ? ` · ${travel > 0 ? '+' : ''}${travel} min · double-click to return` : ' · drag the dial to travel'}`;
    }
  });

  return () => {
    stop();
    host.removeEventListener('pointerdown', onDown);
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('pointerup', onUp);
    host.removeEventListener('dblclick', onDbl);
    controls?.remove();
    readout?.remove();
    s.destroy();
  };
};
export default mount;
