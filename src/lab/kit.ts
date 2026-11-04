/** Behaviour for the app kit: window controls, sidebar, segmented control, iOS large title and sheet. */

// macOS window
document.querySelectorAll<HTMLElement>('[data-mac-stage]').forEach((stage) => {
  const restore = stage.querySelector<HTMLButtonElement>('[data-mw-restore]')!;
  stage.querySelectorAll<HTMLButtonElement>('[data-mw]').forEach((b) =>
    b.addEventListener('click', () => {
      const a = b.dataset.mw;
      if (a === 'zoom') stage.toggleAttribute('data-zoom');
      if (a === 'min') { stage.setAttribute('data-min', ''); restore.hidden = false; }
      if (a === 'close') { stage.setAttribute('data-closed', ''); restore.hidden = false; }
    }),
  );
  restore.addEventListener('click', () => {
    stage.removeAttribute('data-min');
    stage.removeAttribute('data-closed');
    restore.hidden = true;
  });
});

// Sidebar selection with a sliding highlight
document.querySelectorAll<HTMLElement>('[data-sidebar]').forEach((side) => {
  const pill = side.querySelector<HTMLElement>('.k-side-pill')!;
  const items = [...side.querySelectorAll<HTMLButtonElement>('.k-side-i')];
  const move = (el: HTMLElement) => pill.style.setProperty('--py', `${el.offsetTop}px`);
  items.forEach((it) =>
    it.addEventListener('click', () => {
      items.forEach((x) => x.setAttribute('aria-current', String(x === it)));
      move(it);
      const title = side.closest('.mw')?.querySelector('.k-title');
      if (title) title.textContent = it.lastChild?.textContent?.trim() ?? '';
    }),
  );
  const cur = items.find((x) => x.getAttribute('aria-current') === 'true');
  if (cur) requestAnimationFrame(() => move(cur));
});

// Segmented control
document.querySelectorAll<HTMLElement>('[data-seg]').forEach((seg) => {
  const btns = [...seg.querySelectorAll<HTMLButtonElement>('button')];
  btns.forEach((b, i) =>
    b.addEventListener('click', () => {
      btns.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      seg.style.setProperty('--si', String(i));
      const pane = seg.closest('.mw')?.querySelector<HTMLElement>('.k-pane');
      if (pane) pane.dataset.view = b.textContent?.trim().toLowerCase() === 'cards' ? 'cards' : 'list';
    }),
  );
});

// Switch and slider in the sample pane
document.querySelectorAll<HTMLElement>('.k-pane').forEach((pane) => {
  pane.querySelector<HTMLInputElement>('.k-switch input')?.addEventListener('change', (e) => (pane.dataset.details = (e.target as HTMLInputElement).checked ? 'on' : 'off'));
  pane.querySelector<HTMLInputElement>('[data-size]')?.addEventListener('input', (e) => pane.style.setProperty('--k-size', (e.target as HTMLInputElement).value));
});

// iOS: large title collapses into the navigation bar
document.querySelectorAll<HTMLElement>('[data-ios]').forEach((app) => {
  const scroller = app.querySelector<HTMLElement>('[data-ios-scroll]')!;
  const large = app.querySelector<HTMLElement>('.io-large')!;
  scroller.addEventListener('scroll', () => {
    const y = scroller.scrollTop;
    const h = large.offsetHeight;
    app.toggleAttribute('data-collapsed', y > h * 0.8);
    large.style.transform = y < 0 ? `scale(${1 + Math.min(0.12, -y / 600)})` : '';
    large.style.opacity = String(Math.max(0, 1 - y / (h * 0.9)));
  }, { passive: true });

  // Sheet with two detents and flick to dismiss
  const sheet = app.querySelector<HTMLElement>('[data-sheet]')!;
  const dim = document.createElement('div');
  dim.className = 'io-dim';
  app.insertBefore(dim, sheet);
  const H = () => sheet.offsetHeight;
  const detents = () => [H() * 0.45, 0]; // translateY values: half, full
  let y = 0;
  const set = (v: number, anim = true) => {
    y = v;
    sheet.toggleAttribute('data-anim', anim);
    sheet.style.setProperty('--sy', `${v}px`);
  };
  const open = () => {
    sheet.hidden = false;
    set(H(), false);
    app.setAttribute('data-sheet-open', '');
    requestAnimationFrame(() => requestAnimationFrame(() => set(detents()[0])));
  };
  const close = () => {
    set(H());
    app.removeAttribute('data-sheet-open');
    setTimeout(() => (sheet.hidden = true), 450);
  };
  app.querySelector('[data-sheet-open]')?.addEventListener('click', open);
  app.querySelectorAll('[data-sheet-close]').forEach((b) => b.addEventListener('click', close));
  dim.addEventListener('click', close);

  let startY = 0, base = 0, lastY = 0, lastT = 0, vel = 0, dragging = false;
  sheet.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging = true;
    startY = lastY = e.clientY;
    lastT = performance.now();
    base = y;
    sheet.setPointerCapture(e.pointerId);
    sheet.removeAttribute('data-anim');
  });
  sheet.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    let v = base + (e.clientY - startY);
    if (v < 0) v = v / 3; // rubber band past the top
    set(v, false);
    const now = performance.now();
    vel = (e.clientY - lastY) / Math.max(1, now - lastT);
    lastY = e.clientY;
    lastT = now;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (vel > 0.9 || y > H() * 0.75) return close();
    const projected = y + vel * 180;
    const [half, full] = detents();
    set(Math.abs(projected - half) < Math.abs(projected - full) ? half : full);
  };
  sheet.addEventListener('pointerup', end);
  sheet.addEventListener('pointercancel', end);
});
