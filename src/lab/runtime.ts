/**
 * Studio runtime. Runs inside every preview page and brings the chosen
 * options to life. It also listens to the Studio panel (postMessage) so
 * changes apply instantly without reloading.
 */
import Lenis from 'lenis';
import { defaults, STORAGE_KEY, type Config } from './options';

const root = document.documentElement;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const cfg = (k: string) => root.dataset[k] ?? defaults[k];
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ------------------------------------------------------------------ */
/* Clock                                                               */
/* ------------------------------------------------------------------ */
const clockFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
const tick = () => document.querySelectorAll<HTMLTimeElement>('[data-clock]').forEach((c) => (c.textContent = clockFmt.format(new Date())));
tick();
setInterval(tick, 15000);

/* ------------------------------------------------------------------ */
/* Fit text to width ([data-fit])                                      */
/* ------------------------------------------------------------------ */
function fitAll() {
  document.querySelectorAll<HTMLElement>('[data-fit]').forEach((el) => {
    const box = el.parentElement;
    if (!box || !el.offsetParent) return;
    el.style.setProperty('--fit', '100px');
    el.style.display = 'inline-block';
    const natural = el.getBoundingClientRect().width;
    el.style.display = '';
    const avail = box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) - parseFloat(getComputedStyle(box).paddingRight);
    if (natural > 0) el.style.setProperty('--fit', `${Math.floor(((100 * avail) / natural) * 10) / 10}px`);
  });
}

/* ------------------------------------------------------------------ */
/* Text entrance                                                       */
/* ------------------------------------------------------------------ */
const originals = new WeakMap<HTMLElement, string>();
let revealIO: IntersectionObserver | null = null;

function splitWords(el: HTMLElement, letters: boolean) {
  let i = 0;
  const walk = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? '';
        if (!text.trim()) continue;
        const frag = document.createDocumentFragment();
        text.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
            return;
          }
          const w = document.createElement('span');
          w.className = 'rw';
          const inner = document.createElement('span');
          inner.className = 'ri';
          if (letters) {
            for (const ch of part) {
              const c = document.createElement('span');
              c.className = 'rc';
              c.textContent = ch;
              c.style.setProperty('--i', String(i++));
              inner.appendChild(c);
            }
          } else {
            inner.textContent = part;
            w.style.setProperty('--i', String(i++));
          }
          w.appendChild(inner);
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child instanceof HTMLElement) {
        // Inline images and chips move as one piece.
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
  const items = [...el.querySelectorAll<HTMLElement>('.rw, .ratom')];
  let line = -1;
  let lastTop = -Infinity;
  for (const it of items) {
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
    if (mode === 'lines' || mode === 'words' || mode === 'letters') splitWords(el, mode === 'letters');
  }
  if (mode === 'lines') els.forEach((el) => el.offsetParent && assignLines(el));
  void document.body.offsetHeight;
  els.forEach((el) => el.classList.remove('rv-reset'));
  if (mode === 'none' || reduce) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  revealIO = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('in');
          revealIO?.unobserve(e.target);
        }
      }),
    { threshold: 0.15, rootMargin: '0px 0px -5% 0px' },
  );
  const start = () => els.forEach((el) => revealIO!.observe(el));
  if (replay) requestAnimationFrame(() => requestAnimationFrame(start));
  else start();
}

/* ------------------------------------------------------------------ */
/* Project hovers: preview video and lift                              */
/* ------------------------------------------------------------------ */
document.addEventListener('pointerover', (e) => {
  const p = (e.target as HTMLElement).closest?.('.p');
  if (!p || cfg('hover') !== 'preview' || !fine) return;
  const v = p.querySelector<HTMLVideoElement>('video.pv');
  if (!v) return;
  if (!v.src) v.src = v.dataset.src!;
  v.play().then(() => (v.dataset.ready = ''), () => {});
});
document.addEventListener('pointerout', (e) => {
  const p = (e.target as HTMLElement).closest?.('.p');
  if (!p || p.contains(e.relatedTarget as Node)) return;
  p.querySelector<HTMLVideoElement>('video.pv')?.pause();
  const m = p.querySelector<HTMLElement>('.m');
  if (m) {
    m.style.removeProperty('--rx');
    m.style.removeProperty('--ry');
  }
});
document.addEventListener('pointermove', (e) => {
  if (cfg('hover') !== 'lift' || !fine) return;
  const p = (e.target as HTMLElement).closest?.('.p');
  const m = p?.querySelector<HTMLElement>('.m');
  if (!m) return;
  const r = m.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  m.style.setProperty('--ry', `${(x - 0.5) * 7}deg`);
  m.style.setProperty('--rx', `${(0.5 - y) * 5}deg`);
  m.style.setProperty('--gx', `${x * 100}%`);
  m.style.setProperty('--gy', `${y * 100}%`);
});

/* ------------------------------------------------------------------ */
/* Cursor                                                              */
/* ------------------------------------------------------------------ */
if (fine) {
  const label = document.querySelector<HTMLElement>('.cur--label')!;
  const labelText = label.querySelector('span')!;
  const dot = document.querySelector<HTMLElement>('.cur--dot')!;
  let x = -100, y = -100, lx = -100, ly = -100, dx = -100, dy = -100;
  const loop = () => {
    lx += (x - lx) * 0.25;
    ly += (y - ly) * 0.25;
    dx += (x - dx) * 0.35;
    dy += (y - dy) * 0.35;
    label.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
    dot.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  document.addEventListener('pointermove', (e) => {
    x = e.clientX;
    y = e.clientY;
    const t = e.target as HTMLElement;
    const c = t.closest?.<HTMLElement>('[data-cur]');
    if (c) {
      labelText.textContent = c.dataset.cur ?? '';
      label.dataset.on = '';
    } else delete label.dataset.on;
    if (t.closest?.('a, button, [data-cur]')) dot.dataset.on = '';
    else delete dot.dataset.on;
  });
  document.addEventListener('pointerleave', () => {
    delete label.dataset.on;
    delete dot.dataset.on;
  });
}

/* ------------------------------------------------------------------ */
/* Smooth scrolling                                                    */
/* ------------------------------------------------------------------ */
let lenis: Lenis | null = null;
function setupScroll() {
  const want = cfg('scroll') !== 'native' && !reduce;
  if (want && !lenis) {
    lenis = new Lenis({ lerp: cfg('motion') === 'crisp' ? 0.16 : 0.09, smoothWheel: true, anchors: { offset: -80 } });
    const raf = (t: number) => {
      lenis?.raf(t);
      if (lenis) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  } else if (!want && lenis) {
    lenis.destroy();
    lenis = null;
  }
}

/* ------------------------------------------------------------------ */
/* Scroll-driven layouts and progress                                  */
/* ------------------------------------------------------------------ */
let ticking = false;
let indexHover = false;
const sections = () => [...document.querySelectorAll<HTMLElement>('[data-section]')].filter((s) => s.offsetParent);

function onScroll() {
  ticking = false;
  const vh = window.innerHeight;
  const max = document.documentElement.scrollHeight - vh;
  root.style.setProperty('--sp', String(max > 0 ? clamp(window.scrollY / max) : 0));
  const layout = cfg('layout');

  // Current section (progress counter, island, side index)
  const secs = sections();
  let cur = secs[0];
  for (const s of secs) if (s.getBoundingClientRect().top < vh * 0.4) cur = s;
  if (cur) {
    const name = cur.dataset.section!;
    const n = document.querySelector('[data-counter-n]');
    const t = document.querySelector('[data-counter-t]');
    if (t && t.textContent !== name) {
      t.textContent = name;
      if (n) n.textContent = String(secs.indexOf(cur) + 1).padStart(2, '0');
    }
    const now = document.querySelector('[data-island-now]');
    if (now) now.textContent = name;
    document.querySelectorAll<HTMLElement>('[data-index-link]').forEach((a) => {
      const on = (a.dataset.indexLink === 'work' && name === 'Work') || (a.dataset.indexLink === 'contact' && cur === secs[secs.length - 1]);
      on ? (a.dataset.active = '') : delete a.dataset.active;
    });
  }

  // Reel: vertical scroll moves the strip sideways
  if (layout === 'reel' && window.innerWidth > 760) {
    const sec = document.querySelector<HTMLElement>('[data-reel]');
    const track = document.querySelector<HTMLElement>('[data-reel-track]');
    if (sec && track) {
      const r = sec.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - vh));
      const shift = Math.max(0, track.scrollWidth - window.innerWidth);
      track.style.setProperty('--rx', `${-p * shift}px`);
      sec.style.setProperty('--rp', String(p));
      const count = sec.querySelector('[data-reel-count]');
      const nItems = track.children.length;
      if (count) count.textContent = `${String(Math.min(nItems, Math.round(p * (nItems - 1)) + 1)).padStart(2, '0')} / ${String(nItems).padStart(2, '0')}`;
    }
  }

  // Slides: one project per screen
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

  // Stack: earlier cards step back as the next one covers them
  if (layout === 'stack') {
    const cards = [...document.querySelectorAll<HTMLElement>('.st-card')];
    cards.forEach((c, i) => {
      const next = cards[i + 1];
      if (!next) return c.style.setProperty('--cov', '0');
      const a = c.getBoundingClientRect();
      const b = next.getBoundingClientRect();
      c.style.setProperty('--cov', String(clamp(1 - (b.top - a.top) / a.height).toFixed(3)));
    });
  }

  // Index: when not hovering, follow the item nearest the middle
  if (layout === 'index' && !indexHover && window.innerWidth > 900) {
    const items = [...document.querySelectorAll<HTMLElement>('.ix-list .p')];
    let best = items[0];
    let bestD = Infinity;
    for (const it of items) {
      const r = it.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - vh * 0.45);
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    if (best) setIndexActive(Number(best.dataset.ix));
  }

  // Case study contents
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
  const pics = document.querySelectorAll<HTMLElement>('.ix-pic');
  pics.forEach((el, k) => (k === i ? (el.dataset.active = '') : delete el.dataset.active));
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

/* Quiet layout: a small image follows the pointer */
const qFloat = document.querySelector<HTMLElement>('.q-float');
if (qFloat && fine) {
  let tx = 0, ty = 0, cx = 0, cy = 0, active = -1, raf = 0;
  const pics = [...qFloat.querySelectorAll<HTMLElement>('.q-pic')];
  const loop = () => {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    qFloat.style.setProperty('--qx', `${cx}px`);
    qFloat.style.setProperty('--qy', `${cy}px`);
    raf = active >= 0 || Math.abs(tx - cx) > 0.5 ? requestAnimationFrame(loop) : 0;
  };
  document.querySelectorAll<HTMLElement>('.q-list .p').forEach((el) => {
    el.addEventListener('pointerenter', (e) => {
      active = Number(el.dataset.q);
      if (!raf) {
        cx = tx = e.clientX + 28;
        cy = ty = e.clientY - 110;
      }
      pics.forEach((p, k) => (k === active ? (p.dataset.on = '') : delete p.dataset.on));
      if (!raf) raf = requestAnimationFrame(loop);
    });
    el.addEventListener('pointermove', (e) => {
      tx = e.clientX + 28;
      ty = e.clientY - 110;
    });
    el.addEventListener('pointerleave', () => {
      active = -1;
      pics.forEach((p) => delete p.dataset.on);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Navigation: island, full-screen menu                                */
/* ------------------------------------------------------------------ */
const island = document.querySelector<HTMLElement>('[data-island]');
island?.addEventListener('click', (e) => {
  if (!fine && !(e.target as HTMLElement).closest('.isl-links a')) {
    e.preventDefault();
    island.toggleAttribute('data-open');
  }
});
const menu = document.getElementById('lab-menu');
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

/* Roll links need a duplicated label */
document.querySelectorAll<HTMLElement>('a.ln, button .ln').forEach((a) => {
  if (a.querySelector('.roll') || a.children.length) return;
  const t = a.textContent ?? '';
  a.innerHTML = `<span class="roll"><span>${t}</span><span aria-hidden="true">${t}</span></span>`;
});

/* Copy email */
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

/* ------------------------------------------------------------------ */
/* Page transitions: remember where the click happened (Iris)          */
/* ------------------------------------------------------------------ */
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest?.('a');
  if (!a || a.target === '_blank' || !a.href.startsWith(location.origin) || a.hash && a.pathname === location.pathname) return;
  try {
    sessionStorage.setItem('jb-vt-point', JSON.stringify({ x: e.clientX, y: e.clientY }));
  } catch {}
});

/* ------------------------------------------------------------------ */
/* Arrival                                                             */
/* ------------------------------------------------------------------ */
function runIntro(force = false) {
  const mode = cfg('intro');
  document.querySelectorAll<HTMLElement>('.intro').forEach((el) => {
    delete el.dataset.go;
    delete el.dataset.set;
    el.dataset.done = '';
  });
  if (mode === 'none' || reduce) return;
  let seen = false;
  try {
    seen = sessionStorage.getItem('jb-intro') === '1';
    sessionStorage.setItem('jb-intro', '1');
  } catch {}
  if (seen && !force) return;
  const el = document.querySelector<HTMLElement>(`.intro--${mode}`);
  if (!el) return;
  delete el.dataset.done;
  lenis?.stop();
  setTimeout(() => (el.dataset.set = ''), 80);
  setTimeout(() => (el.dataset.go = ''), mode === 'name' ? 1150 : 950);
  el.addEventListener(
    'animationend',
    () => {
      el.dataset.done = '';
      lenis?.start();
      setupReveal(true);
    },
    { once: true },
  );
}
// Hide arrival screens before first paint if they've already been seen this session.
try {
  if (sessionStorage.getItem('jb-intro') === '1') document.querySelectorAll<HTMLElement>('.intro').forEach((el) => (el.dataset.done = ''));
} catch {}

/* ------------------------------------------------------------------ */
/* Apply configuration                                                 */
/* ------------------------------------------------------------------ */
function apply(config: Config, changed?: string, preview = false) {
  for (const k of Object.keys(defaults)) if (config[k]) root.setAttribute(`data-${k}`, config[k]);
  if (!preview) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {}
  }
  if (!changed || ['type', 'hero', 'layout', 'reveal', 'nav'].includes(changed)) {
    requestAnimationFrame(() => {
      fitAll();
      setupReveal(true);
      requestScroll();
    });
  }
  if (changed === 'scroll' || changed === 'motion') {
    lenis?.destroy();
    lenis = null;
    setupScroll();
  }
  if (changed === 'intro') runIntro(true);
  if (changed === 'layout' && !preview) document.getElementById('work')?.scrollIntoView({ block: 'start' });
  if (changed === 'layout' && preview) {
    const w = document.getElementById('work');
    if (w && w.getBoundingClientRect().top > window.innerHeight) w.scrollIntoView({ block: 'start' });
  }
  if (changed === 'hero') window.scrollTo({ top: 0 });
  if (changed === 'case' && !document.querySelector('.case')) {
    const first = document.querySelector<HTMLAnchorElement>('a[href^="/lab/p/work/"]');
    if (first) location.href = first.href;
  }
  if ((changed === 'images' || changed === 'hover') && !preview) document.getElementById('work')?.scrollIntoView({ block: 'start' });
  if (changed === 'progress' || changed === 'cursor') requestScroll();
}

window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
  if (e.data.type === 'lab:config') apply(e.data.config, e.data.changed, !!e.data.preview);
  if (e.data.type === 'lab:try-transition') {
    const onCase = !!document.querySelector('.case');
    if (onCase) history.length > 1 ? history.back() : (location.href = '/lab/p');
    else {
      const first = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="/lab/p/work/"]')].find((a) => a.offsetParent);
      if (first) {
        const r = first.getBoundingClientRect();
        try {
          sessionStorage.setItem('jb-vt-point', JSON.stringify({ x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 200) }));
        } catch {}
        location.href = first.href;
      }
    }
  }
});

// Tell the Studio which page is showing.
if (window.parent !== window) window.parent.postMessage({ type: 'lab:page', path: location.pathname, title: document.title }, location.origin);

/* ------------------------------------------------------------------ */
/* Start                                                               */
/* ------------------------------------------------------------------ */
setupScroll();
fitAll();
document.fonts?.ready.then(() => {
  fitAll();
  // Web fonts change line breaks; recompute line groups without replaying.
  if (cfg('reveal') === 'lines') document.querySelectorAll<HTMLElement>('[data-rv]').forEach((el) => el.offsetParent && assignLines(el));
  requestScroll();
});
setupReveal();
runIntro();
requestScroll();
