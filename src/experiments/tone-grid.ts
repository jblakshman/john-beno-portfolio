import { reducedMotion, type Mount } from './kit';

/**
 * Tone Grid: an eight-step sequencer tuned to a pentatonic scale, so every
 * pattern sounds pleasant. Sound only starts after the visitor asks for it.
 */
const NOTES = [523.25, 440.0, 392.0, 329.63, 293.66, 261.63]; // C5 A4 G4 E4 D4 C4
const NAMES = ['C5', 'A4', 'G4', 'E4', 'D4', 'C4'];
const STEPS = 8;
const PRESET = [
  [0, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 1],
  [0, 1, 0, 0, 0, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0],
  [1, 0, 0, 0, 1, 0, 0, 0],
];

const mount: Mount = (host, { mode }) => {
  const full = mode === 'full';
  const grid = PRESET.map((r) => r.map(Boolean));
  const wrap = document.createElement('div');
  wrap.className = 'tg';
  wrap.style.cssText = `position:absolute;inset:0;display:grid;place-items:center;container-type:size;padding:${full ? 'clamp(16px,4vw,48px)' : '14px'};`;
  host.appendChild(wrap);

  const board = document.createElement('div');
  board.setAttribute('role', full ? 'grid' : 'presentation');
  if (full) board.setAttribute('aria-label', 'Sequencer: six notes by eight steps');
  const width = full ? 'min(88vw, 640px, calc(58svh * 1.36))' : 'min(78%, calc(100cqh * 1.25))';
  board.style.cssText = `display:grid;width:${width};grid-template-columns:repeat(${STEPS}, minmax(0, 1fr));gap:${full ? 'min(1.2vw, 10px)' : '4px'};`;
  wrap.appendChild(board);

  const cells: HTMLElement[][] = [];
  for (let r = 0; r < NOTES.length; r++) {
    cells[r] = [];
    for (let c = 0; c < STEPS; c++) {
      const el = document.createElement(full ? 'button' : 'span');
      el.style.cssText = `aspect-ratio:1;border-radius:${full ? '10px' : '5px'};border:1px solid color-mix(in oklab, var(--ink) 18%, transparent);background:transparent;transition:background .25s, transform .25s cubic-bezier(.34,1.4,.64,1), box-shadow .3s;`;
      if (full) {
        el.setAttribute('type', 'button');
        el.setAttribute('aria-label', `${NAMES[r]}, step ${c + 1}`);
        el.addEventListener('click', () => {
          grid[r][c] = !grid[r][c];
          paint();
          ensureAudio();
          if (grid[r][c]) play(r, 0.12);
        });
      }
      board.appendChild(el);
      cells[r][c] = el;
    }
  }

  let controls: HTMLElement | null = null;
  let soundBtn: HTMLButtonElement | null = null;
  if (full) {
    controls = document.createElement('div');
    controls.style.cssText = 'position:absolute;left:50%;bottom:clamp(16px,4vh,40px);transform:translateX(-50%);display:flex;gap:8px;flex-wrap:wrap;justify-content:center;';
    const mk = (label: string, fn: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill';
      b.textContent = label;
      b.addEventListener('click', fn);
      controls!.appendChild(b);
      return b;
    };
    soundBtn = mk('Turn sound on', () => {
      if (audio && audio.state === 'running') {
        audio.suspend();
        soundBtn!.textContent = 'Turn sound on';
      } else {
        ensureAudio();
        audio!.resume();
        soundBtn!.textContent = 'Mute';
      }
    });
    soundBtn.classList.add('pill--solid');
    mk('Shuffle', () => {
      for (let r = 0; r < NOTES.length; r++) for (let c = 0; c < STEPS; c++) grid[r][c] = Math.random() < 0.16;
      paint();
    });
    mk('Clear', () => {
      grid.forEach((row) => row.fill(false));
      paint();
    });
    host.appendChild(controls);
  }

  // Audio --------------------------------------------------------------------
  let audio: AudioContext | null = null;
  let out: GainNode | null = null;
  function ensureAudio() {
    if (!full || audio) return;
    audio = new AudioContext();
    out = audio.createGain();
    out.gain.value = 0.5;
    const delay = audio.createDelay();
    delay.delayTime.value = 0.33;
    const fb = audio.createGain();
    fb.gain.value = 0.28;
    const wet = audio.createGain();
    wet.gain.value = 0.35;
    out.connect(audio.destination);
    out.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(audio.destination);
    if (soundBtn) soundBtn.textContent = 'Mute';
  }
  function play(row: number, when = 0) {
    if (!audio || !out || audio.state !== 'running') return;
    const t = audio.currentTime + when;
    const osc = audio.createOscillator();
    const osc2 = audio.createOscillator();
    const env = audio.createGain();
    osc.type = 'triangle';
    osc2.type = 'sine';
    osc.frequency.value = NOTES[row];
    osc2.frequency.value = NOTES[row] * 2.001;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.22, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(env);
    osc2.connect(env);
    env.connect(out);
    osc.start(t);
    osc2.start(t);
    osc.stop(t + 1);
    osc2.stop(t + 1);
  }

  // Visuals ------------------------------------------------------------------
  let step = -1;
  function paint() {
    for (let r = 0; r < NOTES.length; r++) {
      for (let c = 0; c < STEPS; c++) {
        const on = grid[r][c];
        const el = cells[r][c];
        const hit = on && c === step;
        el.style.background = on ? (hit ? 'var(--hue)' : 'color-mix(in oklab, var(--hue) 55%, transparent)') : c === step ? 'color-mix(in oklab, var(--ink) 8%, transparent)' : 'transparent';
        el.style.transform = hit ? 'scale(1.12)' : 'scale(1)';
        el.style.boxShadow = hit ? '0 0 24px color-mix(in oklab, var(--hue) 70%, transparent)' : 'none';
        if (full) el.setAttribute('aria-pressed', String(on));
      }
    }
  }
  paint();

  const bpm = 112;
  const interval = 60_000 / bpm / 2;
  let timer = 0;
  const advance = () => {
    step = (step + 1) % STEPS;
    for (let r = 0; r < NOTES.length; r++) if (grid[r][step]) play(r);
    paint();
  };
  const startClock = () => {
    if (!timer) timer = window.setInterval(advance, interval);
  };
  const stopClock = () => {
    clearInterval(timer);
    timer = 0;
  };
  const io = new IntersectionObserver(([e]) => (e.isIntersecting && !(reducedMotion() && !full) ? startClock() : stopClock()));
  io.observe(host);

  return () => {
    stopClock();
    io.disconnect();
    audio?.close();
    wrap.remove();
    controls?.remove();
  };
};
export default mount;
