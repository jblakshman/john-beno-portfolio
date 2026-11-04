/**
 * Studio runtime. Runs inside every preview page, brings the chosen options to
 * life, and listens to the Studio panel so changes apply without reloading.
 */
import type Lenis from 'lenis';
import { defaults, STORAGE_KEY, type Config } from './defaults';

const root = document.documentElement;
const isPreview = root.hasAttribute('data-preview');
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const cfg = (k: string) => root.dataset[k] ?? defaults[k];

/* Heavier pieces load only when the chosen look uses them ---------------- */
const once = <T,>(load: () => Promise<T>) => {
  let p: Promise<T> | null = null;
  return () => (p ??= load());
};
const lazy = {
  images: once(() => import('./gl/images')),
  daylight: once(() => import('./gl/daylight')),
  pointer: once(() => import('./pointer')),
  glass: once(() => import('./glass')),
  scrub: once(() => import('./scrub')),
  lenis: once(() => import('lenis')),
};
const wantsImages = () => cfg('imgin') === 'develop' || cfg('imgmotion') === 'flex' || cfg('hover') === 'loupe' || cfg('hover') === 'develop' || cfg('images') === 'mono';
let imagesLoaded = false;
function syncImages(replay = false) {
  if (!wantsImages() && !imagesLoaded) return;
  lazy.images().then((m) => {
    imagesLoaded = true;
    m.syncImages(replay);
  });
}
let daylightLoaded = false;
function syncDaylight() {
  if (cfg('ambient') !== 'daylight' && !daylightLoaded) return;
  lazy.daylight().then((m) => {
    daylightLoaded = true;
    m.syncDaylight();
  });
}
let pointerLoaded = false;
function syncPointer() {
  if (cfg('cursor') === 'native' || pointerLoaded || !fine) return;
  pointerLoaded = true;
  lazy.pointer().then((m) => m.initPointer());
}
let glassLoaded = false;
function syncGlass() {
  if (cfg('nav') !== 'island' || glassLoaded) return;
  glassLoaded = true;
  lazy.glass().then((m) => m.initGlass());
}
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* Clock ----------------------------------------------------------------- */
const clockFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
const tick = () => document.querySelectorAll<HTMLTimeElement>('[data-clock]').forEach((c) => (c.textContent = clockFmt.format(new Date())));
tick();
setInterval(tick, 15000);

/* Fit text to its container ([data-fit]) ------------------------------- */
function fitAll() {
  document.querySelectorAll<HTMLElement>('[data-fit]').forEach((el) => {
    const box = el.parentElement;
    if (!box || !el.offsetParent) return;
    el.style.setProperty('--fit', '100px');
    el.style.display = 'inline-block';
    const natural = el.getBoundingClientRect().width;
    el.style.display = '';
    const cs = getComputedStyle(box);
    const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (natural > 0) el.style.setProperty('--fit', `${Math.floor(((100 * avail) / natural) * 10) / 10}px`);
  });
}

/* Text entrance --------------------------------------------------------- */
const originals = new WeakMap<HTMLElement, string>();
let revealIO: IntersectionObserver | null = null;

function splitWords(el: HTMLElement) {
  let i = 0;
  const walk = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? '';
        if (!text.trim()) continue;
        const frag = document.createDocumentFragment();
        text.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(' '));
          const w = document.createElement('span');
          w.className = 'rw';
          w.style.setProperty('--i', String(i++));
          const inner = document.createElement('span');
          inner.className = 'ri';
          inner.textContent = part;
          w.appendChild(inner);
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child instanceof HTMLElement) {
        if (child.querySelector('img') || child.matches('img')) {
          child.classList.add('ratom');
          child.style.setProperty('--i', String(i++));
        } else walk(child);
      }
    }
  };
  walk(el);
}

function assignLines(el: HTMLElement) {
  let line = -1;
  let lastTop = -Infinity;
  for (const it of el.querySelectorAll<HTMLElement>('.rw, .ratom')) {
    const top = it.offsetTop;
    if (top > lastTop + 4) {
      line++;
      lastTop = top;
    }
    it.style.setProperty('--l', String(line));
  }
}

function setupReveal(replay = false) {
  const mode = cfg('reveal');
  revealIO?.disconnect();
  const els = [...document.querySelectorAll<HTMLElement>('[data-rv]')];
  for (const el of els) {
    if (!originals.has(el)) originals.set(el, el.innerHTML);
    el.classList.add('rv-reset');
    el.classList.remove('in');
    el.innerHTML = originals.get(el)!;
    if (mode === 'lines' || mode === 'words') splitWords(el);
  }
  if (mode === 'lines') els.forEach((el) => el.offsetParent && assignLines(el));
  root.dataset.rvReady = '';
  void document.body.offsetHeight;
  els.forEach((el) => el.classList.remove('rv-reset'));
  if (mode === 'none' || reduce) return els.forEach((el) => el.classList.add('in'));
  revealIO = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        (e.target as HTMLElement).classList.add('in');
        revealIO?.unobserve(e.target);
      }),
    { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
  );
  const start = () => els.forEach((el) => revealIO!.observe(el));
  replay ? requestAnimationFrame(() => requestAnimationFrame(start)) : start();
}

/* Image entrance: Unveil ------------------------------------------------ */
let unveilIO: IntersectionObserver | null = null;
function setupUnveil(replay = false) {
  unveilIO?.disconnect();
  const frames = [...document.querySelectorAll<HTMLElement>('.m[data-in]')];
  if (cfg('imgin') !== 'unveil' || reduce) return frames.forEach((f) => (f.dataset.in = 'on'));
  if (replay) frames.forEach((f) => (f.dataset.in = ''));
  // A frame clipped to nothing never counts as visible, so watch its parent instead.
  const owner = new Map<Element, HTMLElement[]>();
  frames.forEach((f) => {
    if (f.dataset.in === 'on' || !f.parentElement) return;
    const list = owner.get(f.parentElement) ?? [];
    list.push(f);
    owner.set(f.parentElement, list);
  });
  unveilIO = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        owner.get(e.target)?.forEach((f) => (f.dataset.in = 'on'));
        unveilIO?.unobserve(e.target);
      }),
    { threshold: 0.08 },
  );
  requestAnimationFrame(() => owner.forEach((_, el) => unveilIO!.observe(el)));
}

/* Lift hover ------------------------------------------------------------ */
document.addEventListener('pointermove', (e) => {
  if (cfg('hover') !== 'lift' || !fine) return;
  const m = (e.target as HTMLElement).closest?.('.p')?.querySelector<HTMLElement>('.m');
  if (!m) return;
  const r = m.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  m.style.setProperty('--ry', `${(x - 0.5) * 6}deg`);
  m.style.setProperty('--rx', `${(0.5 - y) * 4}deg`);
  m.style.setProperty('--gx', `${x * 100}%`);
  m.style.setProperty('--gy', `${y * 100}%`);
});
document.addEventListener('pointerout', (e) => {
  const p = (e.target as HTMLElement).closest?.('.p');
  if (!p || p.contains(e.relatedTarget as Node)) return;
  const m = p.querySelector<HTMLElement>('.m');
  m?.style.removeProperty('--rx');
  m?.style.removeProperty('--ry');
});

/* Smooth scrolling ------------------------------------------------------ */
let lenis: Lenis | null = null;
let lenisToken = 0;
function setupScroll() {
  const want = cfg('scroll') === 'smooth' && !reduce;
  const token = ++lenisToken;
  if (!want) {
    lenis?.destroy();
    lenis = null;
    return;
  }
  if (lenis) return;
  lazy.lenis().then(({ default: L }) => {
    if (token !== lenisToken || lenis) return;
    lenis = new L({ lerp: cfg('motion') === 'crisp' ? 0.15 : 0.085, smoothWheel: true, anchors: { offset: -80 } });
    const raf = (t: number) => {
      lenis?.raf(t);
      if (lenis) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  });
}

/* Scroll-driven layouts -------------------------------------------------- */
let ticking = false;
let indexHover = false;
function onScroll() {
  ticking = false;
  const vh = window.innerHeight;
  const layout = cfg('layout');

  const now = document.querySelector('[data-island-now]');
  if (now) {
    let name = 'Home';
    for (const s of document.querySelectorAll<HTMLElement>('[data-section]')) if (s.offsetParent && s.getBoundingClientRect().top < vh * 0.4) name = s.dataset.section!;
    if (now.textContent !== name) now.textContent = name;
  }

  if (layout === 'reel' && window.innerWidth > 760) {
    const sec = document.querySelector<HTMLElement>('[data-reel]');
    const track = document.querySelector<HTMLElement>('[data-reel-track]');
    if (sec && track) {
      const r = sec.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - vh));
      const shift = Math.max(0, track.scrollWidth - window.innerWidth);
      track.style.setProperty('--rx', `${(-p * shift).toFixed(1)}px`);
      sec.style.setProperty('--rp', p.toFixed(4));
      const n = track.children.length;
      const count = sec.querySelector('[data-reel-count]');
      if (count) count.textContent = `${String(Math.min(n, Math.round(p * (n - 1)) + 1)).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    }
  }

  if (layout === 'slides' && window.innerWidth > 900) {
    const sec = document.querySelector<HTMLElement>('[data-slides]');
    if (sec) {
      const r = sec.getBoundingClientRect();
      const n = sec.querySelectorAll('.sl-t').length;
      const p = clamp(-r.top / (r.height - vh), 0, 0.9999);
      const idx = Math.floor(p * n);
      sec.querySelectorAll<HTMLElement>('[data-i]').forEach((el) => {
        const i = Number(el.dataset.i);
        i === idx ? (el.dataset.on = '') : delete el.dataset.on;
        i < idx ? (el.dataset.past = '') : delete el.dataset.past;
        if (el.matches('.sl-t')) el.querySelector('.pill')?.setAttribute('tabindex', i === idx ? '0' : '-1');
      });
    }
  }

  if (layout === 'stack') {
    const cards = [...document.querySelectorAll<HTMLElement>('.st-card')];
    cards.forEach((c, i) => {
      const next = cards[i + 1];
      if (!next) return c.style.setProperty('--cov', '0');
      const a = c.getBoundingClientRect();
      const b = next.getBoundingClientRect();
      c.style.setProperty('--cov', clamp(1 - (b.top - a.top) / a.height).toFixed(3));
    });
  }

  if (layout === 'index' && !indexHover && window.innerWidth > 900) {
    let best: HTMLElement | null = null;
    let bestD = Infinity;
    for (const it of document.querySelectorAll<HTMLElement>('.ix-list .p')) {
      const r = it.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - vh * 0.45);
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    if (best) setIndexActive(Number(best.dataset.ix));
  }

  const toc = [...document.querySelectorAll<HTMLAnchorElement>('[data-toc]')];
  if (toc.length) {
    let id = toc[0].dataset.toc;
    for (const a of toc) {
      const t = document.getElementById(a.dataset.toc!);
      if (t && t.getBoundingClientRect().top < vh * 0.35) id = a.dataset.toc;
    }
    toc.forEach((a) => (a.dataset.toc === id ? (a.dataset.active = '') : delete a.dataset.active));
  }
}
const requestScroll = () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(onScroll);
  }
};
window.addEventListener('scroll', requestScroll, { passive: true });
window.addEventListener('resize', () => {
  fitAll();
  requestScroll();
});

/* Index layout */
function setIndexActive(i: number) {
  document.querySelectorAll<HTMLElement>('.ix-list .p').forEach((el) => (Number(el.dataset.ix) === i ? (el.dataset.active = '') : delete el.dataset.active));
  document.querySelectorAll<HTMLElement>('.ix-pic').forEach((el, k) => (k === i ? (el.dataset.active = '') : delete el.dataset.active));
  const cap = document.querySelector('[data-ix-caption]');
  const item = document.querySelector<HTMLElement>(`.ix-list .p[data-ix="${i}"]`);
  if (cap && item) cap.textContent = `${item.querySelector('.ix-title')?.textContent ?? ''} · ${item.querySelector('.lbl:last-child')?.textContent ?? ''}`;
}
document.querySelectorAll<HTMLElement>('.ix-list .p').forEach((el) => {
  const on = () => {
    indexHover = true;
    setIndexActive(Number(el.dataset.ix));
  };
  el.addEventListener('pointerenter', on);
  el.addEventListener('focusin', on);
  el.addEventListener('pointerleave', () => (indexHover = false));
});
setIndexActive(0);

/* Quiet layout: a small image beside the pointer */
const qFloat = document.querySelector<HTMLElement>('.q-float');
if (qFloat && fine) {
  let tx = 0, ty = 0, cx = 0, cy = 0, active = -1, raf = 0;
  const pics = [...qFloat.querySelectorAll<HTMLElement>('.q-pic')];
  const loop = () => {
    cx += (tx - cx) * 0.16;
    cy += (ty - cy) * 0.16;
    qFloat.style.setProperty('--qx', `${cx.toFixed(1)}px`);
    qFloat.style.setProperty('--qy', `${cy.toFixed(1)}px`);
    raf = active >= 0 || Math.abs(tx - cx) > 0.5 ? requestAnimationFrame(loop) : 0;
  };
  document.querySelectorAll<HTMLElement>('.q-list .p').forEach((el) => {
    el.addEventListener('pointerenter', (e) => {
      active = Number(el.dataset.q);
      if (!raf) {
        cx = tx = e.clientX + 32;
        cy = ty = e.clientY - 120;
      }
      pics.forEach((p, k) => (k === active ? (p.dataset.on = '') : delete p.dataset.on));
      if (!raf) raf = requestAnimationFrame(loop);
    });
    el.addEventListener('pointermove', (e) => {
      tx = e.clientX + 32;
      ty = e.clientY - 120;
    });
    el.addEventListener('pointerleave', () => {
      active = -1;
      pics.forEach((p) => delete p.dataset.on);
    });
  });
}

/* Navigation: island on touch, full-screen menu ------------------------- */
const island = document.querySelector<HTMLElement>('[data-island]');
island?.addEventListener('click', (e) => {
  if (!fine && !(e.target as HTMLElement).closest('.isl-links a')) {
    e.preventDefault();
    island.toggleAttribute('data-open');
  }
});
const menu = document.getElementById('site-menu');
const openBtns = document.querySelectorAll<HTMLButtonElement>('[data-menu-open]');
const setMenu = (open: boolean) => {
  if (!menu) return;
  menu.hidden = !open;
  openBtns.forEach((b) => b.setAttribute('aria-expanded', String(open)));
  open ? lenis?.stop() : lenis?.start();
};
openBtns.forEach((b) => b.addEventListener('click', () => setMenu(true)));
document.querySelector('[data-menu-close]')?.addEventListener('click', () => setMenu(false));
document.querySelectorAll('[data-menu-link]').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

/* Copy email ------------------------------------------------------------ */
document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((b) =>
  b.addEventListener('click', async () => {
    const l = b.querySelector('[data-copy-label]');
    try {
      await navigator.clipboard.writeText(b.dataset.copy ?? '');
      if (l) l.textContent = 'Copied';
    } catch {
      if (l) l.textContent = 'Press ⌘C';
    }
    setTimeout(() => l && (l.textContent = 'Copy email'), 1600);
  }),
);

/* Page transitions: remember the clicked card for Open ------------------- */
const onScreen = (el: Element | null) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
};
/** The image a link visually belongs to, so Open can grow from it. */
function frameFor(a: HTMLAnchorElement): HTMLElement | null {
  if (a.closest('.ix-list')) return document.querySelector<HTMLElement>('.ix-pic[data-active]');
  const own = a.closest('.p, .next-a')?.querySelector<HTMLElement>('.m');
  if (onScreen(own ?? null)) return own!;
  const href = a.getAttribute('href');
  for (const el of document.querySelectorAll<HTMLElement>(`a[href="${href}"] .m`)) if (onScreen(el)) return el;
  return null;
}
function rememberCard(a: HTMLAnchorElement) {
  try {
    const frame = frameFor(a);
    if (!frame) return sessionStorage.removeItem('jb-vt-rect');
    const r = frame.getBoundingClientRect();
    const rad = parseFloat(getComputedStyle(frame).borderTopLeftRadius) || 0;
    sessionStorage.setItem('jb-vt-rect', JSON.stringify({ t: r.top, l: r.left, r: r.right, b: r.bottom, rad }));
  } catch {}
}
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest?.('a');
  if (!a || a.target === '_blank' || !a.href.startsWith(location.origin) || (a.hash && a.pathname === location.pathname)) return;
  rememberCard(a);
});

/* Apply configuration ----------------------------------------------------- */
function apply(config: Config, changed?: string, preview = false) {
  for (const k of Object.keys(defaults)) if (config[k]) root.setAttribute(`data-${k}`, config[k]);
  if (!preview && isPreview) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {}
  }
  const all = !changed;
  if (all || ['type', 'hero', 'layout', 'reveal', 'nav'].includes(changed!)) {
    requestAnimationFrame(() => {
      fitAll();
      setupReveal(true);
      requestScroll();
    });
  }
  if (all || ['imgin', 'imgmotion', 'hover', 'images', 'palette', 'layout', 'case', 'hero'].includes(changed!)) {
    requestAnimationFrame(() => syncImages(changed === 'imgin' || all));
  }
  if (all || changed === 'cursor') syncPointer();
  if (all || changed === 'nav') syncGlass();
  if (all || changed === 'palette' || changed === 'dark') {
    delete root.dataset.scheme;
    delete root.dataset.base;
    try { sessionStorage.removeItem('jb-preview-scheme'); } catch {}
  }
  if (all || changed === 'imgin' || changed === 'layout') setupUnveil(true);
  if (all || changed === 'ambient' || changed === 'palette') syncDaylight();
  if (all || changed === 'scroll' || changed === 'motion') {
    lenis?.destroy();
    lenis = null;
    setupScroll();
  }
  if (changed === 'layout' && !preview) document.getElementById('work')?.scrollIntoView({ block: 'start' });
  if (changed === 'layout' && preview) {
    const w = document.getElementById('work');
    if (w && w.getBoundingClientRect().top > window.innerHeight) w.scrollIntoView({ block: 'start' });
  }
  if (changed === 'hero' && !preview) window.scrollTo({ top: 0 });
  if ((changed === 'imgin' || changed === 'hover' || changed === 'imgmotion') && !preview && !document.querySelector('.case')) document.getElementById('work')?.scrollIntoView({ block: 'start' });
  if (changed === 'case' && !document.querySelector('.case')) {
    const first = document.querySelector<HTMLAnchorElement>('a[href*="/work/"]');
    if (first) location.href = first.href;
  }
}

if (isPreview) window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
  if (e.data.type === 'lab:config') {
    // A pinned look (the Studio's compare pane) survives navigation inside this frame.
    if (e.data.pin) window.name = `jbcfg:${JSON.stringify(e.data.config)}`;
    apply(e.data.config, e.data.changed, !!e.data.preview);
  }
  if (e.data.type === 'lab:hour') lazy.daylight().then((m) => m.setDaylightHour(e.data.hour));
  if (e.data.type === 'lab:sync') syncScroll = !!e.data.on;
  if (e.data.type === 'lab:scrollto') {
    const max = document.documentElement.scrollHeight - innerHeight;
    followUntil = performance.now() + 180;
    const y = Math.round(e.data.r * max);
    lenis ? lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
  }
  if (e.data.type === 'lab:try-transition') {
    if (document.querySelector('.case')) {
      if (history.length > 1) history.back();
      else location.href = '/lab/p';
      return;
    }
    const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/work/"]')].filter((a) => a.offsetParent);
    const inView = links.find((a) => {
      const r = a.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight;
    });
    const first = inView ?? links[0];
    if (first) {
      rememberCard(first);
      location.href = first.href;
    }
  }
});
if (isPreview && window.parent !== window) window.parent.postMessage({ type: 'lab:page', path: location.pathname, title: document.title }, location.origin);

/* Studio compare: report scroll so the other preview can follow ---------- */
let syncScroll = false;
let followUntil = 0;
let scrollRaf = 0;
if (isPreview && window.parent !== window) {
  addEventListener(
    'scroll',
    () => {
      if (!syncScroll || scrollRaf || performance.now() < followUntil) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const max = document.documentElement.scrollHeight - innerHeight;
        window.parent.postMessage({ type: 'lab:scroll', r: max > 0 ? scrollY / max : 0 }, location.origin);
      });
    },
    { passive: true },
  );
}

/* Start ---------------------------------------------------------------- */
setupScroll();
fitAll();
setupReveal();
setupUnveil();
syncImages();
syncDaylight();
syncPointer();
syncGlass();
if (document.querySelector('[data-scrub]')) lazy.scrub().then((m) => m.initScrub());
requestScroll();

/* Videos that play while visible ---------------------------------------- */
const autoVideos = document.querySelectorAll<HTMLVideoElement>('video[data-autoplay]');
if (autoVideos.length && !reduce) {
  const vio = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      const v = e.target as HTMLVideoElement;
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }),
    { rootMargin: '10% 0px' },
  );
  autoVideos.forEach((v) => vio.observe(v));
}

/* Light and dark ------------------------------------------------------- */
document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((b) =>
  b.addEventListener('click', () => {
    const dark = root.dataset.dark;
    if (!dark || dark === 'none') return;
    const toDark = root.dataset.scheme !== 'dark';
    const swap = () => {
      if (toDark) {
        root.dataset.base = root.dataset.palette ?? '';
        root.dataset.palette = dark;
        root.dataset.scheme = 'dark';
      } else {
        root.dataset.palette = root.dataset.base || cfg('palette');
        delete root.dataset.scheme;
        delete root.dataset.base;
      }
      try {
        if (isPreview) sessionStorage.setItem('jb-preview-scheme', toDark ? 'dark' : 'light');
        else localStorage.setItem('theme', toDark ? 'dark' : 'light');
      } catch {}
      syncImages();
      syncDaylight();
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
    if (!doc.startViewTransition || reduce) return swap();
    root.dataset.switching = '';
    const end = () => delete root.dataset.switching;
    doc.startViewTransition(swap).finished.then(end, end);
  }),
);
document.fonts?.ready.then(() => {
  fitAll();
  if (cfg('reveal') === 'lines') document.querySelectorAll<HTMLElement>('[data-rv]').forEach((el) => el.offsetParent && assignLines(el));
  requestScroll();
});
