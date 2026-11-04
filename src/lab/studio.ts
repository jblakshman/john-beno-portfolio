/** Design Studio panel: keeps the configuration and talks to the preview. */
import { groups, presets, defaults, sanitize, STORAGE_KEY, type Config } from './options';

const frame = document.querySelector<HTMLIFrameElement>('[data-frame]')!;
const studio = document.querySelector<HTMLElement>('.studio')!;
const toast = document.querySelector<HTMLElement>('[data-toast]')!;

const encode = (c: Config) => btoa(unescape(encodeURIComponent(JSON.stringify(c))));
const decode = (s: string) => JSON.parse(decodeURIComponent(escape(atob(s))));

function load(): Config {
  const m = location.hash.match(/c=([^&]+)/);
  if (m) {
    try {
      return sanitize(decode(decodeURIComponent(m[1])));
    } catch {}
  }
  try {
    return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    return { ...defaults };
  }
}

let config = load();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
  history.replaceState(null, '', `#c=${encodeURIComponent(encode(config))}`);
  const full = document.querySelector<HTMLAnchorElement>('[data-open-full]');
  if (full) full.href = `/lab/p#c=${encodeURIComponent(encode(config))}`;
}

function send(changed?: string) {
  frame.contentWindow?.postMessage({ type: 'lab:config', config, changed }, location.origin);
}

function syncPanel() {
  for (const g of groups) {
    const input = document.querySelector<HTMLInputElement>(`input[name="${g.id}"][value="${config[g.id]}"]`);
    if (input) input.checked = true;
    const v = document.querySelector(`[data-value="${g.id}"]`);
    if (v) v.textContent = g.options.find((o) => o.id === config[g.id])?.label ?? '';
  }
  document.querySelectorAll<HTMLElement>('[data-preset]').forEach((b) => {
    const p = presets.find((x) => x.id === b.dataset.preset)!;
    const match = Object.entries(p.config).every(([k, v]) => config[k] === v);
    b.setAttribute('aria-pressed', String(match));
  });
}

function show(msg: string) {
  toast.textContent = msg;
  toast.dataset.on = '';
  clearTimeout((show as any).t);
  (show as any).t = setTimeout(() => delete toast.dataset.on, 1800);
}

// Option changes
document.querySelectorAll<HTMLInputElement>('.opt input').forEach((input) =>
  input.addEventListener('change', () => {
    previewing = false;
    clearTimeout(hoverTimer);
    config = { ...config, [input.name]: input.value };
    save();
    syncPanel();
    send(input.name);
  }),
);

// Hover an option to preview it; leaving the list restores the saved choice.
const noHoverPreview = new Set(['pt', 'case', 'scroll', 'imgin']);
let hoverTimer = 0;
let previewing = false;
document.querySelectorAll<HTMLElement>('.opts').forEach((list) => {
  const group = list.closest<HTMLElement>('[data-group]')?.dataset.group ?? '';
  if (noHoverPreview.has(group)) return;
  list.querySelectorAll<HTMLLabelElement>('.opt').forEach((opt) => {
    opt.addEventListener('pointerenter', (e) => {
      if ((e as PointerEvent).pointerType !== 'mouse') return;
      const value = opt.querySelector('input')!.value;
      clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => {
        if (value === config[group] && !previewing) return;
        previewing = true;
        frame.contentWindow?.postMessage({ type: 'lab:config', config: { ...config, [group]: value }, changed: group, preview: true }, location.origin);
      }, 140);
    });
  });
  list.addEventListener('pointerleave', () => {
    clearTimeout(hoverTimer);
    if (!previewing) return;
    previewing = false;
    hoverTimer = window.setTimeout(() => send(group), 60);
  });
});

// Presets
document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) =>
  b.addEventListener('click', () => {
    const p = presets.find((x) => x.id === b.dataset.preset)!;
    config = sanitize({ ...defaults, ...p.config });
    save();
    syncPanel();
    send();
    show(`${p.label} applied`);
  }),
);

// Shuffle and reset
document.querySelector('[data-shuffle]')?.addEventListener('click', () => {
  const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const next: Config = {};
  for (const g of groups) next[g.id] = pick(g.options).id;
  // Keep a few calm defaults so a shuffle stays usable.
  next.images = Math.random() < 0.25 ? 'mono' : 'color';
  next.ambient = Math.random() < 0.5 ? next.ambient : 'none';
  config = sanitize(next);
  save();
  syncPanel();
  send();
  show('Shuffled');
});
document.querySelector('[data-reset]')?.addEventListener('click', () => {
  config = { ...defaults };
  save();
  syncPanel();
  send();
  show('Back to the current site');
});

// Try a page transition
document.querySelectorAll<HTMLElement>('[data-try]').forEach((b) => {
  const run = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (config.pt === 'none') show('Instant has no transition');
    frame.contentWindow?.postMessage({ type: 'lab:try-transition' }, location.origin);
  };
  b.addEventListener('click', run);
  b.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && run(e));
});

// Copy the setup as readable text plus JSON
document.querySelector('[data-copy-setup]')?.addEventListener('click', async () => {
  const lines = groups.map((g) => `- ${g.label}: ${g.options.find((o) => o.id === config[g.id])?.label} (${config[g.id]})`);
  const text = `My portfolio setup from the Design Studio:\n${lines.join('\n')}\n\nConfig: ${JSON.stringify(config)}\nLink: ${location.origin}/lab#c=${encodeURIComponent(encode(config))}`;
  try {
    await navigator.clipboard.writeText(text);
    show('Setup copied');
  } catch {
    prompt('Copy your setup:', text);
  }
});

// Device sizes, scaled to fit the stage
const viewport = document.querySelector<HTMLElement>('[data-viewport]')!;
const device = document.querySelector<HTMLElement>('[data-device-frame]')!;
function fitDevice() {
  const kind = studio.dataset.device;
  if (kind === 'desktop' || window.innerWidth <= 860) {
    device.style.transform = '';
    return;
  }
  const w = kind === 'phone' ? 390 : 834;
  const h = kind === 'phone' ? 844 : 1112;
  const s = Math.min(1, (viewport.clientWidth - 48) / w, (viewport.clientHeight - 48) / h);
  device.style.transform = `scale(${s})`;
}
document.querySelectorAll<HTMLButtonElement>('[data-device-btn]').forEach((b) =>
  b.addEventListener('click', () => {
    studio.dataset.device = b.dataset.deviceBtn;
    document.querySelectorAll('[data-device-btn]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    fitDevice();
  }),
);
window.addEventListener('resize', fitDevice);

// Remember which groups are open
const OPEN_KEY = 'jb-lab-open';
try {
  const open = JSON.parse(localStorage.getItem(OPEN_KEY) || 'null') as string[] | null;
  if (open) document.querySelectorAll<HTMLDetailsElement>('details[data-group]').forEach((d) => (d.open = open.includes(d.dataset.group!)));
} catch {}
document.querySelectorAll<HTMLDetailsElement>('details[data-group]').forEach((d) =>
  d.addEventListener('toggle', () => {
    const open = [...document.querySelectorAll<HTMLDetailsElement>('details[data-group]')].filter((x) => x.open).map((x) => x.dataset.group);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(open));
    } catch {}
  }),
);

// Daylight time of day
const hour = document.querySelector<HTMLInputElement>('[data-hour]');
const hourOut = document.querySelector<HTMLOutputElement>('[data-hour-out]');
hour?.addEventListener('input', () => {
  const h = Number(hour.value);
  if (hourOut) hourOut.textContent = `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
  frame.contentWindow?.postMessage({ type: 'lab:hour', hour: h }, location.origin);
});
document.querySelector('[data-hour-now]')?.addEventListener('click', () => {
  if (hourOut) hourOut.textContent = 'now';
  frame.contentWindow?.postMessage({ type: 'lab:hour', hour: null }, location.origin);
});

// Messages from the preview
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.data?.type !== 'lab:page') return;
  const where = document.querySelector('[data-where]');
  const title = String(e.data.title || '').replace(' · Studio preview', '');
  if (where) where.textContent = `/ ${title}`;
});
frame.addEventListener('load', () => send());

save();
syncPanel();
