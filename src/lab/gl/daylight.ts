/**
 * Daylight: soft window light and leaf shadows over the page.
 * The sun's height, direction and warmth follow the real time in Munich.
 * Rendered at low resolution (light is soft anyway), 30 fps, paused when hidden.
 * On light palettes the canvas multiplies (shade), on dark ones it screens (glow).
 */
const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform float uElev;   // 0 at the horizon, 1 high
uniform float uSide;   // -1 morning (light from the left) .. 1 evening (from the right)
uniform float uWarm;   // 0 neutral .. 1 golden
uniform float uNight;  // 0 day .. 1 night
uniform float uDark;   // dark palette

float hash(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }

// A soft rectangle: 1 inside, falling off over 'soft'
float softBox(vec2 p, vec2 c, vec2 h, float soft) {
  vec2 d = abs(p - c) - h;
  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  return 1.0 - smoothstep(-soft, soft, dist);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  p.y -= uScroll * 0.035;

  // The window is projected onto the page: lower sun, longer and more skewed light
  float skew = uSide * mix(1.1, 0.25, uElev);
  float stretch = mix(1.55, 1.0, uElev);
  vec2 q = p;
  float cx = aspect * (0.5 + uSide * 0.22);
  q.x = (q.x - cx) - (q.y - 0.62) * skew;
  q.y = (q.y - 0.62) / stretch;

  // Penumbra: soft at low sun, crisper at noon. Leaves sway inside the light.
  float soft = mix(0.05, 0.022, uElev);
  float paneW = 0.2, paneH = 0.27, gap = 0.022;
  float win = 0.0;
  win += softBox(q, vec2(-paneW * 0.5 - gap * 0.5, paneH * 0.5 + gap * 0.5), vec2(paneW * 0.5, paneH * 0.5), soft);
  win += softBox(q, vec2(paneW * 0.5 + gap * 0.5, paneH * 0.5 + gap * 0.5), vec2(paneW * 0.5, paneH * 0.5), soft);
  win += softBox(q, vec2(-paneW * 0.5 - gap * 0.5, -paneH * 0.5 - gap * 0.5), vec2(paneW * 0.5, paneH * 0.5), soft);
  win += softBox(q, vec2(paneW * 0.5 + gap * 0.5, -paneH * 0.5 - gap * 0.5), vec2(paneW * 0.5, paneH * 0.5), soft);
  win = clamp(win, 0.0, 1.0);

  float t = uTime * 0.05;
  vec2 lp = q * 4.2;
  vec2 warp = vec2(fbm(lp * 0.6 + vec2(t, 0.0)), fbm(lp * 0.6 + vec2(0.0, -t) + 7.3));
  float leaves = fbm(lp + warp * 1.1 + vec2(t * 0.4, t * 0.2));
  float leafShade = smoothstep(0.5, 0.64, leaves) * 0.75;
  float cloud = 0.88 + 0.12 * smoothstep(0.2, 0.8, fbm(vec2(uTime * 0.012, 3.0)));
  float light = win * (1.0 - leafShade) * cloud;

  // Night: no window light; a faint warm lamp pool low on the page instead
  float lamp = (1.0 - smoothstep(0.0, 0.85, length((p - vec2(aspect * 0.12, -0.05)) * vec2(0.75, 1.0)))) * 0.75;
  light = mix(light, lamp, uNight);

  // Light palettes multiply: the page keeps its color where light falls and
  // takes a slightly cool shade elsewhere. Dark palettes screen a faint glow.
  vec3 sun = mix(vec3(1.0, 0.996, 0.988), vec3(1.0, 0.975, 0.915), uWarm);
  vec3 shade = mix(vec3(0.962, 0.967, 0.978), vec3(0.972, 0.969, 0.972), uNight);
  vec3 lit = mix(sun, vec3(1.0, 0.95, 0.86), uNight);
  vec3 onLight = mix(shade, lit, light);
  vec3 onDark = lit * light * mix(0.075, 0.055, uNight) * vec3(1.0, 0.93, 0.82);
  gl_FragColor = vec4(mix(onLight, onDark, uDark), 1.0);
}`;

const root = document.documentElement;
let gl: WebGLRenderingContext | null = null;
let canvas: HTMLCanvasElement | null = null;
let u: Record<string, WebGLUniformLocation | null> = {};
let raf = 0;
let last = 0;
let hourOverride: number | null = null;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Munich local hour as a decimal, e.g. 14.5 */
function munichHour() {
  if (hourOverride !== null) return hourOverride;
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 12);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h + m / 60;
}

/** Rough sun model for Munich: sunrise and sunset vary with the season. */
function sun() {
  const now = new Date();
  const day = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 864e5);
  const season = Math.cos(((day - 172) / 365) * Math.PI * 2); // 1 midsummer, -1 midwinter
  const half = 6.2 + season * 2.1; // half day length in hours
  const noon = 13.2;
  const h = munichHour();
  const x = (h - noon) / half; // -1 sunrise .. 1 sunset
  const up = Math.abs(x) < 1;
  const elev = up ? Math.cos(x * Math.PI * 0.5) * (0.55 + season * 0.25 + 0.2) : 0;
  return {
    elev: Math.max(0, Math.min(1, elev)),
    side: Math.max(-1, Math.min(1, x)),
    warm: up ? Math.pow(Math.abs(x), 2.2) : 1,
    night: up ? Math.max(0, (Math.abs(x) - 0.92) / 0.08) : 1,
  };
}

function setup() {
  canvas = document.querySelector<HTMLCanvasElement>('canvas.daylight');
  if (!canvas) return false;
  gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) return false;
  const sh = (type: number, src: string) => {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  for (const n of ['uRes', 'uTime', 'uScroll', 'uElev', 'uSide', 'uWarm', 'uNight', 'uDark']) u[n] = gl.getUniformLocation(prog, n);
  resize();
  window.addEventListener('resize', resize);
  return true;
}

function resize() {
  if (!canvas || !gl) return;
  const scale = window.innerWidth < 760 ? 0.35 : 0.5;
  canvas.width = Math.max(2, Math.round(window.innerWidth * scale));
  canvas.height = Math.max(2, Math.round(window.innerHeight * scale));
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function frame(now: number) {
  raf = 0;
  if (!gl || !canvas || root.dataset.ambient !== 'daylight') return;
  if (now - last > 33 || reduce) {
    last = now;
    const s = sun();
    const bg = getComputedStyle(document.body).backgroundColor.match(/\d+/g)?.map(Number) ?? [255, 255, 255];
    const dark = (bg[0] * 0.3 + bg[1] * 0.59 + bg[2] * 0.11) / 255 < 0.4 ? 1 : 0;
    gl.uniform2f(u.uRes, window.innerWidth, window.innerHeight);
    gl.uniform1f(u.uTime, reduce ? 20 : now / 1000);
    gl.uniform1f(u.uScroll, window.scrollY / Math.max(1, window.innerHeight));
    gl.uniform1f(u.uElev, s.elev);
    gl.uniform1f(u.uSide, s.side);
    gl.uniform1f(u.uWarm, s.warm);
    gl.uniform1f(u.uNight, s.night);
    gl.uniform1f(u.uDark, dark);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    canvas.dataset.ready = '';
  }
  if (!reduce && !document.hidden) raf = requestAnimationFrame(frame);
}

export function syncDaylight() {
  if (root.dataset.ambient !== 'daylight') {
    cancelAnimationFrame(raf);
    raf = 0;
    return;
  }
  if (!gl && !setup()) return;
  if (!raf) raf = requestAnimationFrame(frame);
}

export function setDaylightHour(h: number | null) {
  hourOverride = h;
  if (reduce && gl) requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => !document.hidden && syncDaylight());
