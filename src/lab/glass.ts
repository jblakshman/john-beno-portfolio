/**
 * Liquid Glass navigation.
 * A displacement map shaped like the pill's rounded edge bends the page behind
 * it (Chromium supports SVG filters in backdrop-filter; other browsers fall back
 * to frosted glass with the same highlights). A specular highlight follows the
 * pointer as if it were the light source.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';
const isChromium = !!(navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands?.some((b) => /Chromium/.test(b.brand));

function makeMap(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const r = h / 2;
  const bevel = Math.min(h * 0.42, 16);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Signed distance to a stadium (pill) shape and its outward normal
      const cx = Math.min(Math.max(x + 0.5, r), w - r);
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - r;
      const len = Math.hypot(dx, dy) || 1;
      const dist = r - len; // distance inside from the edge
      let ox = 0, oy = 0;
      if (dist > 0 && dist < bevel) {
        const t = Math.pow(1 - dist / bevel, 2.4);
        ox = (-dx / len) * t;
        oy = (-dy / len) * t;
      }
      const i = (y * w + x) * 4;
      img.data[i] = Math.round(128 + ox * 127);
      img.data[i + 1] = Math.round(128 + oy * 127);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

export function initGlass() {
  const pill = document.querySelector<HTMLElement>('[data-island]');
  if (!pill) return;

  if (isChromium) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = `<filter id="lg-filter" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feImage result="map" x="0" y="0" preserveAspectRatio="none" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="soft" />
      <feDisplacementMap in="soft" in2="map" scale="28" xChannelSelector="R" yChannelSelector="G" />
    </filter>`;
    document.body.appendChild(svg);
    const feImage = svg.querySelector('feImage')!;
    let lastW = 0, lastH = 0, pending = 0;
    const update = () => {
      pending = 0;
      const r = pill.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      if (!w || !h || (w === lastW && h === lastH)) return;
      lastW = w;
      lastH = h;
      feImage.setAttribute('href', makeMap(w, h));
      feImage.setAttribute('width', String(w));
      feImage.setAttribute('height', String(h));
      pill.dataset.refract = '';
    };
    new ResizeObserver(() => {
      if (!pending) pending = requestAnimationFrame(update);
    }).observe(pill);
    update();
  }

  // The highlight leans toward the pointer
  window.addEventListener('pointermove', (e) => {
    const r = pill.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const ang = Math.atan2(e.clientY - cy, e.clientX - cx);
    const near = Math.max(0, 1 - Math.hypot(e.clientX - cx, e.clientY - cy) / 600);
    pill.style.setProperty('--lx', `${50 + Math.cos(ang) * 38}%`);
    pill.style.setProperty('--ly', `${50 + Math.sin(ang) * 70}%`);
    pill.style.setProperty('--li', (0.35 + near * 0.65).toFixed(3));
  }, { passive: true });
}
