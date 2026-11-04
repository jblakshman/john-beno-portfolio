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
