/**
 * Small progressive enhancements for every page. Everything here is optional:
 * the site works and reads fine without JavaScript.
 */
const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

/* Theme toggle ---------------------------------------------------------- */
function effectiveTheme(): 'light' | 'dark' {
  const explicit = root.dataset.theme;
  if (explicit === 'light' || explicit === 'dark') return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((btn) => {
  const sync = () => btn.setAttribute('aria-label', `Switch to ${effectiveTheme() === 'dark' ? 'light' : 'dark'} theme`);
  sync();
  btn.addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    const apply = () => {
      root.dataset.theme = next;
      try {
        localStorage.setItem('theme', next);
      } catch {}
      sync();
    };
    // Smooth cross-fade where same-document view transitions are supported.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !reduceMotion.matches) doc.startViewTransition(apply);
    else apply();
  });
});

/* Local time in Munich -------------------------------------------------- */
const clockFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
const clocks = document.querySelectorAll<HTMLTimeElement>('[data-clock]');
function tick() {
  const now = new Date();
  const text = clockFmt.format(now);
  clocks.forEach((c) => {
    c.textContent = text;
    c.dateTime = now.toISOString();
  });
}
if (clocks.length) {
  tick();
  setInterval(tick, 15_000);
}

/* Header border once the page scrolls ----------------------------------- */
const onScroll = () => root.classList.toggle('scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* Mobile menu ------------------------------------------------------------ */
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.getElementById('mobile-menu');
if (menuBtn && menu) {
  const setOpen = (open: boolean) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', () => setOpen(menu.hasAttribute('hidden')));
  menu.querySelectorAll('[data-menu-link]').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      menuBtn.focus();
    }
  });
}

/* Copy email ------------------------------------------------------------- */
document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
  const label = btn.querySelector<HTMLElement>('[data-copy-label]');
  const original = label?.textContent ?? '';
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy ?? '');
      btn.dataset.copied = '';
      if (label) label.textContent = 'Copied';
    } catch {
      if (label) label.textContent = 'Press ⌘C / Ctrl+C';
      const sel = window.getSelection();
      const email = btn.parentElement?.querySelector('a');
      if (sel && email) {
        const range = document.createRange();
        range.selectNodeContents(email);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    setTimeout(() => {
      delete btn.dataset.copied;
      if (label) label.textContent = original;
    }, 1800);
  });
});

/* Back to top without leaving a hash in the URL -------------------------- */
document.querySelectorAll('[data-to-top]').forEach((a) =>
  a.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    document.getElementById('main')?.focus({ preventScroll: true });
  }),
);

/* Cursor label that follows the pointer over projects -------------------- */
const cursor = document.querySelector<HTMLElement>('.cursor-label');
const cursorText = cursor?.querySelector('span');
if (cursor && cursorText && finePointer.matches) {
  let x = 0,
    y = 0,
    cx = 0,
    cy = 0,
    raf = 0,
    active = false;
  const loop = () => {
    cx += (x - cx) * 0.22;
    cy += (y - cy) * 0.22;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    if (active || Math.abs(x - cx) > 0.5 || Math.abs(y - cy) > 0.5) raf = requestAnimationFrame(loop);
    else raf = 0;
  };
  const start = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };
  document.querySelectorAll<HTMLElement>('[data-cursor]').forEach((el) => {
    el.addEventListener('pointerenter', (e) => {
      cursorText.textContent = el.dataset.cursor ?? '';
      x = cx = e.clientX;
      y = cy = e.clientY;
      active = true;
      cursor.dataset.visible = '';
      start();
    });
    el.addEventListener('pointermove', (e) => {
      x = e.clientX;
      y = e.clientY;
      start();
    });
    el.addEventListener('pointerleave', () => {
      active = false;
      delete cursor.dataset.visible;
    });
  });
}

/* Hover-to-preview videos on project rows -------------------------------- */
if (finePointer.matches && !reduceMotion.matches) {
  document.querySelectorAll<HTMLElement>('.project').forEach((row) => {
    const video = row.querySelector<HTMLVideoElement>('video[data-src]');
    if (!video) return;
    row.addEventListener('pointerenter', () => {
      if (!video.src) video.src = video.dataset.src!;
      video.play().then(
        () => (video.dataset.ready = ''),
        () => {},
      );
    });
    row.addEventListener('pointerleave', () => video.pause());
  });
}

/* Autoplay muted videos only while visible -------------------------------- */
const autoVideos = document.querySelectorAll<HTMLVideoElement>('video[data-autoplay]');
if (autoVideos.length) {
  if (reduceMotion.matches) {
    autoVideos.forEach((v) => (v.controls = true));
  } else {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          const v = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) v.play().catch(() => (v.controls = true));
          else v.pause();
        }),
      { threshold: 0.25 },
    );
    autoVideos.forEach((v) => io.observe(v));
  }
}

/* Highlight the current section in side navigation ---------------------- */
const tocLinks = document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]');
if (tocLinks.length) {
  const byId = new Map<string, HTMLAnchorElement>();
  tocLinks.forEach((a) => byId.set(a.dataset.tocLink!, a));
  const targets = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
  const setActive = (id: string) => tocLinks.forEach((a) => (a.dataset.tocLink === id ? (a.dataset.active = '') : delete a.dataset.active));
  const update = () => {
    const line = window.innerHeight * 0.35;
    let current = targets[0]?.id;
    for (const t of targets) if (t.getBoundingClientRect().top <= line) current = t.id;
    if (current) setActive(current);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
}

/* Footer wordmark: letters widen and gain weight near the pointer --------- */
const wordmark = document.querySelector<HTMLElement>('[data-wordmark]');
if (wordmark) {
  const fit = () => {
    const wrap = wordmark.parentElement!;
    wordmark.style.setProperty('--wm-size', '100px');
    const natural = wordmark.getBoundingClientRect().width;
    const available = wrap.clientWidth;
    if (natural > 0) wordmark.style.setProperty('--wm-size', `${Math.floor((100 * available) / natural * 10) / 10}px`);
  };
  document.fonts?.ready.then(fit);
  fit();
  window.addEventListener('resize', fit);

  if (finePointer.matches && !reduceMotion.matches) {
    const letters = [...wordmark.querySelectorAll<HTMLElement>('span:not(.sp)')];
    let pending = false;
    let px = 0;
    const apply = () => {
      pending = false;
      for (const el of letters) {
        const r = el.getBoundingClientRect();
        const d = Math.abs(px - (r.left + r.width / 2)) / window.innerWidth;
        const k = Math.max(0, 1 - d * 5); // 1 near the pointer, 0 far away
        el.style.setProperty('--g', String(Math.round(420 + k * 380)));
        el.style.setProperty('--w', String(Math.round(92 + k * 33)));
      }
    };
    const reset = () => letters.forEach((el) => (el.style.removeProperty('--g'), el.style.removeProperty('--w')));
    wordmark.closest('footer')?.addEventListener('pointermove', (e) => {
      const rect = wordmark.getBoundingClientRect();
      if (e.clientY < rect.top - 160) return reset();
      px = e.clientX;
      if (!pending) {
        pending = true;
        requestAnimationFrame(apply);
      }
    });
    wordmark.closest('footer')?.addEventListener('pointerleave', reset);
  }
}
