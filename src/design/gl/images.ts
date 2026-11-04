/**
 * Image shader engine.
 * Each image frame that needs an effect gets its own small WebGL canvas, created
 * when it nears the viewport. Contexts stay alive while there is room (so
 * scrolling back costs nothing) and the one farthest away is released when the
 * budget is reached. Textures are decoded and downscaled off the main thread.
 * Without WebGL, images simply show as normal.
 *
 *  - Develop (entrance): shadows emerge first, a warm tone settles to neutral.
 *  - Loupe (hover): a glass loupe with barrel distortion, chromatic rim and shadow.
 *  - Develop (hover) / Monochrome: color spreads outward from the pointer.
 *  - Flex (scroll): a gentle bow proportional to scroll speed that settles with a spring.
 */

const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uImg;
uniform float uTime;
uniform float uReveal;
uniform float uVel;
uniform vec2 uMouse;
uniform float uLoupe;
uniform float uLoupeR;
uniform float uMono;
uniform float uColorR;
uniform vec3 uPaper;
uniform float uDark;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

vec2 cover(vec2 uv, float zoom) {
  float ra = uRes.x / uRes.y, ri = uImg.x / uImg.y;
  vec2 s = ra > ri ? vec2(1.0, ri / ra) : vec2(ra / ri, 1.0);
  return (uv - 0.5) * s / zoom + 0.5;
}
vec3 tex(vec2 uv, float zoom) { return texture2D(uTex, cover(uv, zoom)).rgb; }

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 px = uv * uRes;

  // Flex: a soft bow, strongest in the middle of the frame
  float bow = 1.0 - pow(uv.x * 2.0 - 1.0, 2.0);
  vec2 suv = uv;
  suv.y -= uVel * 0.03 * bow;
  float zoom = 1.0 + abs(uVel) * 0.045;

  // Loupe
  vec2 d = px - uMouse;
  float r = length(d) / uLoupeR;
  float inside = (1.0 - smoothstep(0.975, 1.0, r)) * uLoupe;
  vec3 col;
  if (inside > 0.002) {
    float barrel = 1.0 - 0.24 * r * r;
    vec2 m = (uMouse + d / 2.2 * barrel) / uRes;
    vec2 luv = mix(suv, m, inside);
    float ca = 0.012 * smoothstep(0.45, 1.0, r) * inside;
    vec2 dir = d / uRes;
    col.r = tex(luv + dir * ca, zoom).r;
    col.g = tex(luv, zoom).g;
    col.b = tex(luv - dir * ca, zoom).b;
  } else {
    col = tex(suv, zoom);
  }

  float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float n = fbm(uv * vec2(3.2, 3.2 * uRes.y / uRes.x) + vec2(uTime * 0.015, -uTime * 0.01));

  // Monochrome at rest; color spreads outward from the pointer with an organic edge
  if (uMono > 0.001) {
    float edge = length(px - uMouse) + (n - 0.5) * 110.0;
    float show = 1.0 - smoothstep(uColorR - 90.0, uColorR, edge);
    vec3 grey = vec3(L) * vec3(1.0, 0.996, 0.988);
    col = mix(col, grey, uMono * (1.0 - show));
  }

  // Develop: each point appears at its own time. Shadows first on light paper,
  // highlights first on dark paper. A warm tone fades to neutral as it finishes.
  if (uReveal < 0.999) {
    float tone = mix(L, 1.0 - L, uDark);
    float thr = tone * 0.72 + n * 0.5;
    float e = smoothstep(thr - 0.32, thr + 0.04, uReveal * 1.42);
    vec3 warm = col * mix(vec3(1.0), vec3(1.08, 0.985, 0.86), (1.0 - uReveal));
    col = mix(uPaper, warm, e);
  }

  // Loupe rim: a thin glass edge, a highlight from the top left, a soft shadow outside
  if (uLoupe > 0.001) {
    float ring = smoothstep(0.94, 0.985, r) * (1.0 - smoothstep(0.985, 1.0, r));
    float ang = atan(d.y, d.x);
    float hl = pow(max(0.0, cos(ang + 2.35)), 5.0);
    col = mix(col, vec3(1.0), ring * (0.28 + 0.6 * hl) * uLoupe);
    float sh = (1.0 - smoothstep(1.0, 1.22, r)) * step(1.0, r) * 0.2 * uLoupe;
    col *= 1.0 - sh;
  }
  gl_FragColor = vec4(col, 1.0);
}`;

type Inst = {
  host: HTMLElement;
  img: HTMLImageElement;
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  u: Record<string, WebGLUniformLocation | null>;
  w: number;
  h: number;
  ready: boolean;
  reveal: number;
  revealStart: number;
  hover: number;
  hoverT: number;
  mx: number;
  my: number;
  tx: number;
  ty: number;
  colorR: number;
  vel: number;
  velV: number;
  ro: ResizeObserver;
};

const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const MAX = 8;
const developed = new WeakSet<Element>();
const insts = new Map<HTMLElement, Inst>();
let io: IntersectionObserver | null = null;
let raf = 0;
let lastY = window.scrollY;
let lastT = performance.now();
let scrollVel = 0;
let pointer = { x: -9999, y: -9999 };
let revealDur = 2.3;

const cfg = (k: string) => root.dataset[k] ?? '';
const mode = () => ({
  develop: cfg('imgin') === 'develop' && !reduce,
  flex: cfg('imgmotion') === 'flex' && !reduce,
  loupe: cfg('hover') === 'loupe' && fine,
  color: (cfg('hover') === 'develop' || cfg('images') === 'mono') && fine,
  mono: cfg('hover') === 'develop' || cfg('images') === 'mono',
});
const needed = () => {
  const m = mode();
  return m.develop || m.flex || m.loupe || m.mono;
};

function cssColor(name: string): [number, number, number] {
  const probe = document.createElement('span');
  probe.style.color = getComputedStyle(root).getPropertyValue(name).trim() || '#fff';
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number) ?? [255, 255, 255];
  probe.remove();
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
}
let paper: [number, number, number] = [1, 1, 1];
let dark = 0;
function readPalette() {
  paper = cssColor('--bg');
  dark = paper[0] * 0.3 + paper[1] * 0.59 + paper[2] * 0.11 < 0.4 ? 1 : 0;
}

function seconds(v: string) {
  const s = v.trim();
  return s.endsWith('ms') ? parseFloat(s) / 1000 : parseFloat(s) || 0.9;
}

function compile(gl: WebGLRenderingContext) {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const names = ['uTex', 'uRes', 'uImg', 'uTime', 'uReveal', 'uVel', 'uMouse', 'uLoupe', 'uLoupeR', 'uMono', 'uColorR', 'uPaper', 'uDark'];
  const u: Record<string, WebGLUniformLocation | null> = {};
  for (const n of names) u[n] = gl.getUniformLocation(prog, n);
  return u;
}

function create(host: HTMLElement) {
  if (insts.has(host)) return;
  if (insts.size >= MAX) evictFarthest();
  const img = host.querySelector('img');
  if (!img) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'fx';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) return;
  let u: Record<string, WebGLUniformLocation | null>;
  try {
    u = compile(gl);
  } catch {
    return;
  }
  host.appendChild(canvas);
  const inst: Inst = {
    host, img, canvas, gl, u, w: 1, h: 1, ready: false,
    reveal: developed.has(host) || !mode().develop ? 1 : 0, revealStart: 0,
    hover: 0, hoverT: 0, mx: -9999, my: -9999, tx: -9999, ty: -9999, colorR: 0, vel: 0, velV: 0,
    ro: new ResizeObserver(() => size(inst)),
  };
  inst.ro.observe(host);
  canvas.addEventListener('webglcontextlost', () => destroy(host));
  insts.set(host, inst);
  size(inst);
  const upload = async () => {
    if (!insts.has(host)) return;
    // Decode and scale off the main thread to about what the frame shows
    // (with headroom for the loupe), instead of uploading the full original.
    let source: TexImageSource = img;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const k = Math.min(1, (Math.max(inst.canvas.width / nw, inst.canvas.height / nh) || 1) * 1.6);
    if ('createImageBitmap' in window && k < 0.9) {
      try {
        source = await createImageBitmap(img, { resizeWidth: Math.round(nw * k), resizeHeight: Math.round(nh * k), resizeQuality: 'high' });
      } catch {}
      if (!insts.has(host)) return;
    }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    } catch {
      destroy(host);
      return;
    }
    if (source instanceof ImageBitmap) source.close();
    inst.ready = true;
    draw(inst, performance.now());
    host.setAttribute('data-gl', '');
    kick();
  };
  if (img.complete && img.naturalWidth) upload();
  else img.addEventListener('load', upload, { once: true });
}

/** Releases the context farthest from the viewport to stay within budget. */
function evictFarthest() {
  const mid = window.innerHeight / 2;
  let far: HTMLElement | null = null;
  let best = -1;
  for (const [host] of insts) {
    const r = host.getBoundingClientRect();
    const d = Math.abs(r.top + r.height / 2 - mid);
    if (d > best) {
      best = d;
      far = host;
    }
  }
  if (far) destroy(far);
}

function destroy(host: HTMLElement) {
  const inst = insts.get(host);
  if (!inst) return;
  inst.ro.disconnect();
  inst.gl.getExtension('WEBGL_lose_context')?.loseContext();
  inst.canvas.remove();
  host.removeAttribute('data-gl');
  insts.delete(host);
}

function size(inst: Inst) {
  const r = inst.host.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  inst.w = Math.max(1, r.width);
  inst.h = Math.max(1, r.height);
  inst.canvas.width = Math.round(inst.w * dpr);
  inst.canvas.height = Math.round(inst.h * dpr);
  inst.gl.viewport(0, 0, inst.canvas.width, inst.canvas.height);
  if (inst.ready) draw(inst, performance.now());
}

function draw(inst: Inst, now: number) {
  const { gl, u } = inst;
  const m = mode();
  gl.uniform1i(u.uTex, 0);
  gl.uniform2f(u.uRes, inst.w, inst.h);
  gl.uniform2f(u.uImg, inst.img.naturalWidth || inst.w, inst.img.naturalHeight || inst.h);
  gl.uniform1f(u.uTime, now / 1000);
  gl.uniform1f(u.uReveal, inst.reveal);
  gl.uniform1f(u.uVel, m.flex ? inst.vel : 0);
  gl.uniform2f(u.uMouse, inst.mx, inst.my);
  gl.uniform1f(u.uLoupe, m.loupe ? inst.hover : 0);
  gl.uniform1f(u.uLoupeR, Math.max(64, Math.min(150, Math.min(inst.w, inst.h) * 0.2)));
  gl.uniform1f(u.uMono, m.mono && inst.host.closest('.p, .q-float, .ix-view') ? 1 : 0);
  gl.uniform1f(u.uColorR, inst.colorR);
  gl.uniform3f(u.uPaper, paper[0], paper[1], paper[2]);
  gl.uniform1f(u.uDark, dark);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function loop(now: number) {
  raf = 0;
  const dt = Math.min(0.05, (now - lastT) / 1000) || 1 / 60;
  lastT = now;
  const y = window.scrollY;
  const raw = (y - lastY) / dt;
  lastY = y;
  scrollVel += (Math.max(-1.3, Math.min(1.3, raw / 2600)) - scrollVel) * 0.25;
  const m = mode();
  let busy = false;
  const vh = window.innerHeight;
  for (const inst of insts.values()) {
    if (!inst.ready) continue;
    const r = inst.host.getBoundingClientRect();
    const onScreen = r.bottom > 0 && r.top < vh && r.width > 0;
    if (!onScreen) continue;
    let dirty = false;

    // Develop entrance starts when the image is properly in view
    if (inst.reveal < 1) {
      if (!inst.revealStart && r.top < vh * 0.88 && r.bottom > vh * 0.08) {
        inst.revealStart = now;
        revealDur = seconds(getComputedStyle(root).getPropertyValue('--dur')) * 2.6;
      }
      if (inst.revealStart) {
        inst.reveal = Math.min(1, (now - inst.revealStart) / 1000 / revealDur);
        if (inst.reveal >= 1) developed.add(inst.host);
        dirty = true;
      }
    }

    // Pointer inside this frame?
    const inside = pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
    inst.tx = pointer.x - r.left;
    inst.ty = pointer.y - r.top;
    const target = inside ? 1 : 0;
    if (Math.abs(inst.hover - target) > 0.001) {
      inst.hover += (target - inst.hover) * 0.18;
      dirty = true;
    } else inst.hover = target;
    if (inside || inst.hover > 0.001) {
      const k = inst.mx < -9000 ? 1 : 0.35;
      const nx = inst.mx + (inst.tx - inst.mx) * k;
      const ny = inst.my + (inst.ty - inst.my) * k;
      if (Math.abs(nx - inst.mx) + Math.abs(ny - inst.my) > 0.05) dirty = true;
      inst.mx = nx;
      inst.my = ny;
    }

    // Color spreading from the pointer
    if (m.mono) {
      const maxR = Math.hypot(inst.w, inst.h) * 1.15;
      const targetR = inside && m.color ? maxR : 0;
      const speed = targetR > inst.colorR ? 0.045 : 0.08;
      if (Math.abs(targetR - inst.colorR) > 0.5) {
        inst.colorR += (targetR - inst.colorR) * speed;
        dirty = true;
      }
    }

    // Flex: a spring toward the current scroll speed
    if (m.flex) {
      const a = (scrollVel - inst.vel) * 120 - inst.velV * 11;
      inst.velV += a * dt;
      inst.vel += inst.velV * dt;
      if (Math.abs(inst.vel) > 0.0005 || Math.abs(inst.velV) > 0.0005) dirty = true;
      else inst.vel = inst.velV = 0;
    }

    if (dirty) {
      draw(inst, now);
      busy = true;
    }
  }
  if (busy || Math.abs(scrollVel) > 0.001) kick();
}

function kick() {
  if (!raf) raf = requestAnimationFrame(loop);
}

const candidates = () => [...document.querySelectorAll<HTMLElement>('main .m, main .prose .fig--none > .fig-m')].filter((el) => el.querySelector('img') && !el.closest('[data-nogl]'));

/* Contexts are created one per frame, so a page with many images (or a Studio
   switch to a new layout) never stalls on several shader compiles at once. */
const queue: HTMLElement[] = [];
let pumping = 0;
function enqueue(el: HTMLElement) {
  if (insts.has(el) || queue.includes(el)) return;
  queue.push(el);
  if (!pumping) pumping = requestAnimationFrame(pump);
}
function pump() {
  pumping = 0;
  // Nearest to the middle of the screen first.
  const mid = window.innerHeight / 2;
  queue.sort((a, b) => Math.abs(a.getBoundingClientRect().top - mid) - Math.abs(b.getBoundingClientRect().top - mid));
  const el = queue.shift();
  if (el && el.isConnected) create(el);
  if (queue.length) pumping = requestAnimationFrame(pump);
}

export function syncImages(replay = false) {
  readPalette();
  io?.disconnect();
  if (!needed()) {
    [...insts.keys()].forEach(destroy);
    return;
  }
  queue.length = 0;
  if (replay) {
    [...insts.keys()].forEach(destroy);
    candidates().forEach((el) => developed.delete(el));
  }
  io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) enqueue(el);
      }),
    { rootMargin: '250px 0px' },
  );
  candidates().forEach((el) => io!.observe(el));
  kick();
}

window.addEventListener('pointermove', (e) => {
  pointer = { x: e.clientX, y: e.clientY };
  if (insts.size) kick();
}, { passive: true });
document.addEventListener('pointerleave', () => {
  pointer = { x: -9999, y: -9999 };
  kick();
});
window.addEventListener('scroll', () => insts.size && kick(), { passive: true });
