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
  document.querySelectorAll<HTMLElement>('.look').forEach((chip, i) => (looks[i] && same(looks[i].config, config) ? (chip.dataset.on = '') : delete chip.dataset.on));
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

// Copy the setup as a ready-to-paste src/design.config.ts
const configFile = (c: Config) => {
  const notes = groups.map((g) => `  ${g.id}: '${c[g.id]}', // ${g.label}: ${g.options.find((o) => o.id === c[g.id])?.label ?? ''}`);
  return `import type { Config } from './design/options';

/**
 * The live site's look. Choose it in the Design Studio (/lab), press
 * "Copy for the live site" and paste the result over this file.
 * Studio link for this look: ${location.origin}/lab#c=${encodeURIComponent(encode(c))}
 */
export const design: Config = {
${notes.join('\n')}
};
`;
};
document.querySelector('[data-copy-setup]')?.addEventListener('click', async () => {
  const text = configFile(config);
  try {
    await navigator.clipboard.writeText(text);
    show('Copied. Paste it over src/design.config.ts');
  } catch {
    prompt('Copy this into src/design.config.ts:', text);
  }
});

// Device sizes, scaled to fit the stage (and to half of it when comparing)
const sizes: Record<string, [number, number]> = { desktop: [1440, 900], tablet: [834, 1112], phone: [390, 844] };
function fitDevice() {
  const kind = studio.dataset.device ?? 'desktop';
  const comparing = studio.hasAttribute('data-compare');
  document.querySelectorAll<HTMLElement>('[data-device-frame]').forEach((d) => {
    const pane = d.parentElement!;
    if ((kind === 'desktop' && !comparing) || window.innerWidth <= 860) {
      d.style.transform = '';
      return;
    }
    const [w, h] = sizes[kind];
    const s = Math.min(1, (pane.clientWidth - 40) / w, (pane.clientHeight - (comparing ? 76 : 48)) / h);
    d.style.transform = `scale(${s})`;
    pane.style.setProperty('--dev-h', `${h * s}px`);
  });
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

// Messages from the previews
const frameB = document.querySelector<HTMLIFrameElement>('[data-frame-b]')!;
const paneB = document.querySelector<HTMLElement>('[data-pane-b]')!;
const pathOf = (p: unknown) => String(p || '').replace(/\.html$/, '').replace(/\/$/, '') || '/lab/p';
let pathA = '/lab/p';
let pathB = '';
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data) return;
  const fromA = e.source === frame.contentWindow;
  const fromB = e.source === frameB.contentWindow;
  if (e.data.type === 'lab:page') {
    const path = pathOf(e.data.path);
    if (fromA) {
      pathA = path;
      if (pagePick && [...pagePick.options].some((o) => o.value === path)) pagePick.value = path;
      document.querySelector<HTMLAnchorElement>('[data-open-full]')?.setAttribute('href', path);
      if (comparing() && pathB && pathB !== path) frameB.contentWindow?.location.assign(path);
    }
    if (fromB) {
      pathB = path;
      if (comparing() && pathA !== path) frame.contentWindow?.location.assign(path);
    }
  }
  // While comparing, scrolling one preview scrolls the other to the same point.
  if (e.data.type === 'lab:scroll' && comparing()) {
    const other = fromA ? frameB : fromB ? frame : null;
    other?.contentWindow?.postMessage({ type: 'lab:scrollto', r: e.data.r }, location.origin);
  }
});
const pagePick = document.querySelector<HTMLSelectElement>('[data-page]');
pagePick?.addEventListener('change', () => {
  frame.contentWindow?.location.assign(pagePick.value);
  document.querySelector<HTMLAnchorElement>('[data-open-full]')?.setAttribute('href', pagePick.value);
});

/* Saved looks ------------------------------------------------------------ */
type Look = { name: string; config: Config };
const LOOKS_KEY = 'jb-lab-looks';
let looks: Look[] = [];
try {
  looks = (JSON.parse(localStorage.getItem(LOOKS_KEY) || '[]') as Look[]).map((l) => ({ name: String(l.name), config: sanitize(l.config) }));
} catch {}
const storeLooks = () => {
  try {
    localStorage.setItem(LOOKS_KEY, JSON.stringify(looks));
  } catch {}
};
const labelOf = (g: string, c: Config) => groups.find((x) => x.id === g)?.options.find((o) => o.id === c[g])?.label ?? '';
const same = (a: Config, b: Config) => groups.every((g) => a[g.id] === b[g.id]);
const list = document.querySelector<HTMLElement>('[data-looks-list]')!;
function renderLooks() {
  list.replaceChildren(
    ...looks.map((l, i) => {
      const chip = document.createElement('span');
      chip.className = 'look';
      if (same(l.config, config)) chip.dataset.on = '';
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.textContent = l.name;
      apply.title = 'Apply. Double-click to rename.';
      apply.addEventListener('click', () => {
        config = { ...l.config };
        save();
        syncPanel();
        send();
        show(`${l.name} applied`);
      });
      apply.addEventListener('dblclick', () => {
        const name = prompt('Name this look', l.name)?.trim();
        if (name) {
          l.name = name;
          storeLooks();
          renderLooks();
        }
      });
      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = '×';
      del.setAttribute('aria-label', `Delete ${l.name}`);
      del.addEventListener('click', () => {
        looks.splice(i, 1);
        storeLooks();
        renderLooks();
      });
      chip.append(apply, del);
      return chip;
    }),
  );
  fillB();
}
document.querySelector('[data-save-look]')?.addEventListener('click', () => {
  if (looks.some((l) => same(l.config, config))) return show('This look is already saved');
  const name = [labelOf('layout', config), labelOf('palette', config), labelOf('type', config)].join(' · ');
  looks.push({ name, config: { ...config } });
  storeLooks();
  renderLooks();
  show('Look saved');
});

/* Compare two looks side by side ----------------------------------------- */
const pickB = document.querySelector<HTMLSelectElement>('[data-b-look]')!;
const compareBtn = document.querySelector<HTMLButtonElement>('[data-compare-btn]');
const comparing = () => studio.hasAttribute('data-compare');
function fillB() {
  const keep = pickB.value || 'live';
  const opt = (v: string, t: string) => Object.assign(document.createElement('option'), { value: v, textContent: t });
  const group = (label: string, items: HTMLOptionElement[]) => {
    const g = document.createElement('optgroup');
    g.label = label;
    g.append(...items);
    return g;
  };
  pickB.replaceChildren(
    opt('live', 'Live site'),
    group('Presets', presets.map((p) => opt(`preset:${p.id}`, p.label))),
    ...(looks.length ? [group('Your looks', looks.map((l, i) => opt(`look:${i}`, l.name)))] : []),
  );
  pickB.value = [...pickB.options].some((o) => o.value === keep) ? keep : 'live';
}
function configB(): Config {
  const v = pickB.value;
  if (v.startsWith('preset:')) return sanitize({ ...defaults, ...presets.find((p) => `preset:${p.id}` === v)?.config });
  if (v.startsWith('look:')) return { ...(looks[Number(v.slice(5))]?.config ?? defaults) };
  return { ...defaults };
}
function sendB() {
  // pin: the preview keeps this look on every page it navigates to.
  frameB.contentWindow?.postMessage({ type: 'lab:config', config: configB(), preview: true, pin: true }, location.origin);
}
pickB.addEventListener('change', sendB);
frameB.addEventListener('load', () => {
  sendB();
  frameB.contentWindow?.postMessage({ type: 'lab:sync', on: true }, location.origin);
});
frame.addEventListener('load', () => frame.contentWindow?.postMessage({ type: 'lab:sync', on: comparing() }, location.origin));
compareBtn?.addEventListener('click', () => {
  const on = !comparing();
  studio.toggleAttribute('data-compare', on);
  compareBtn.setAttribute('aria-pressed', String(on));
  paneB.hidden = !on;
  frame.contentWindow?.postMessage({ type: 'lab:sync', on }, location.origin);
  if (on) {
    // The look rides along in the address on first load, so B never shows A's look first.
    if (pathB !== pathA || !frameB.src) frameB.src = `${pathA}#c=${encodeURIComponent(encode(configB()))}`;
    else frameB.contentWindow?.postMessage({ type: 'lab:sync', on: true }, location.origin);
  }
  requestAnimationFrame(fitDevice);
});
renderLooks();

frame.addEventListener('load', () => send());

save();
syncPanel();
