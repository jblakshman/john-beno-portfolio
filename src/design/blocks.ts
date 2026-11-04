/**
 * Behaviour for case study blocks: Compare, Annotate and Embed.
 * Loaded only on pages that use one of them.
 */

/* Compare: drag, tap or use the arrow keys ------------------------------- */
document.querySelectorAll<HTMLElement>('[data-compare]').forEach((fig) => {
  const area = fig.querySelector<HTMLElement>('.cmp-m')!;
  const range = fig.querySelector<HTMLInputElement>('.cmp-range')!;
  const set = (x: number) => {
    const v = Math.min(100, Math.max(0, x));
    fig.style.setProperty('--x', `${v}%`);
    range.value = String(v);
    fig.dataset.edge = v < 12 ? 'a' : v > 88 ? 'b' : '';
  };
  const fromEvent = (e: PointerEvent) => {
    const r = area.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  };
  let id: number | null = null;
  let startX = 0, startY = 0, dragging = false;
  area.addEventListener('pointerdown', (e) => {
    id = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    dragging = e.pointerType === 'mouse';
    if (dragging) {
      area.setPointerCapture(id);
      fig.dataset.drag = '';
      fromEvent(e);
    }
  });
  area.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    if (!dragging) {
      // On touch, only take over once the gesture is clearly sideways.
      const dx = Math.abs(e.clientX - startX), dy = Math.abs(e.clientY - startY);
      if (dy > 8 && dy > dx) return void (id = null);
      if (dx < 6) return;
      dragging = true;
      area.setPointerCapture(e.pointerId);
      fig.dataset.drag = '';
    }
    fromEvent(e);
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    if (!dragging && e.type === 'pointerup') fromEvent(e); // a tap jumps to the spot
    id = null;
    dragging = false;
    delete fig.dataset.drag;
  };
  area.addEventListener('pointerup', end);
  area.addEventListener('pointercancel', end);
  range.addEventListener('input', () => set(Number(range.value)));
});

/* Annotate: link markers and notes -------------------------------------- */
document.querySelectorAll<HTMLElement>('[data-annotate]').forEach((fig) => {
  const items = [...fig.querySelectorAll<HTMLElement>('[data-k]')];
  const show = (k: string | null) => {
    items.forEach((el) => (el.dataset.k === k ? (el.dataset.on = '') : delete el.dataset.on));
    k === null ? delete fig.dataset.any : (fig.dataset.any = '');
  };
  fig.querySelectorAll<HTMLElement>('li[data-k]').forEach((li) => {
    li.addEventListener('pointerenter', () => show(li.dataset.k!));
    li.addEventListener('focus', () => show(li.dataset.k!));
    li.addEventListener('pointerleave', () => show(null));
    li.addEventListener('blur', () => show(null));
  });
});

/* Embed: load the third-party frame only when asked ---------------------- */
document.querySelectorAll<HTMLElement>('[data-embed]').forEach((fig) => {
  fig.querySelector('.emb-go')?.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = fig.dataset.embed!;
    frame.title = fig.dataset.title ?? 'Embedded content';
    frame.allow = 'autoplay; fullscreen; picture-in-picture; clipboard-write';
    frame.allowFullscreen = true;
    frame.setAttribute('loading', 'eager');
    const m = fig.querySelector('.emb-m')!;
    m.replaceChildren(frame);
    fig.dataset.loaded = '';
    frame.focus();
  });
});

/* Zoom: click an image to see it large ---------------------------------- */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll<HTMLElement>('figure[data-zoom]').forEach((fig) => {
  const trigger = fig.querySelector<HTMLButtonElement>('.fig-zoom');
  const source = fig.querySelector<HTMLImageElement>('.fig-m img');
  if (!trigger || !source) return;
  trigger.addEventListener('click', () => openZoom(fig, source, trigger));
});

function openZoom(fig: HTMLElement, source: HTMLImageElement, trigger: HTMLButtonElement) {
  const caption = fig.querySelector('figcaption')?.textContent ?? '';
  const layer = document.createElement('div');
  layer.className = 'zoom';
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', source.alt || 'Image');
  const bg = document.createElement('div');
  bg.className = 'zoom-bg';
  const img = document.createElement('img');
  img.alt = source.alt;
  img.src = source.currentSrc || source.src;
  img.decoding = 'async';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'zoom-x pill';
  close.textContent = 'Close';
  layer.append(bg, img, close);
  if (caption) {
    const cap = document.createElement('p');
    cap.className = 'zoom-cap';
    cap.textContent = caption;
    layer.append(cap);
  }
  document.body.append(layer);

  // Fit the image into the window, leaving room for the caption and button.
  const ratio = (source.naturalWidth || source.width) / (source.naturalHeight || source.height) || 1;
  const pad = Math.max(16, innerWidth * 0.04);
  const top = 64, bottom = caption ? 72 : 40;
  let w = Math.min(innerWidth - pad * 2, (source.naturalWidth || 2400) * 1.5);
  let h = w / ratio;
  if (h > innerHeight - top - bottom) {
    h = innerHeight - top - bottom;
    w = h * ratio;
  }
  const end = { left: (innerWidth - w) / 2, top: top + (innerHeight - top - bottom - h) / 2, width: w, height: h };
  Object.assign(img.style, { left: `${end.left}px`, top: `${end.top}px`, width: `${end.width}px`, height: `${end.height}px` });
  const from = () => {
    const r = source.getBoundingClientRect();
    return `translate(${r.left - end.left}px, ${r.top - end.top}px) scale(${r.width / end.width}, ${r.height / end.height})`;
  };
  const timing = { duration: reduceMotion ? 0 : 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' };
  img.animate([{ transform: from() }, { transform: 'none' }], timing);
  requestAnimationFrame(() => (layer.dataset.open = ''));
  fig.dataset.zoomed = '';

  // Swap in the large version once it has loaded.
  const large = new Image();
  large.src = fig.dataset.zoom!;
  large.decode().then(() => (img.src = large.src), () => {});

  close.focus({ preventScroll: true });
  let closing = false;
  const shut = () => {
    if (closing) return;
    closing = true;
    delete layer.dataset.open;
    const anim = img.animate([{ transform: 'none' }, { transform: from() }], { ...timing, duration: reduceMotion ? 0 : 380, fill: 'forwards' });
    anim.finished.finally(() => {
      layer.remove();
      delete fig.dataset.zoomed;
    });
    removeEventListener('keydown', onKey);
    removeEventListener('wheel', shut);
    removeEventListener('scroll', shut);
    trigger.focus({ preventScroll: true });
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') shut();
    if (e.key === 'Tab') {
      e.preventDefault(); // Close is the only control in the dialog.
      close.focus();
    }
  };
  layer.addEventListener('click', shut);
  addEventListener('keydown', onKey);
  addEventListener('wheel', shut, { passive: true });
  addEventListener('scroll', shut, { passive: true });
}
