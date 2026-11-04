/**
 * Haptic table: an interactive illustration of the Tactical Haptic Twin.
 *
 * A shape display (a table of pins) forms a city district: the physical stage.
 * An AR layer then adds what moves: fire spreading, routes and units, with 2D
 * labels pinned to points in the 3D scene. A token placed on the table sends
 * a unit, and the digital twin follows.
 *
 * Plain WebGL2: one instanced draw for every pin, a shadow map for the light,
 * no libraries. It renders only while on screen and something is moving.
 */

type Vec3 = [number, number, number];

const W = 44;
const D = 30;
const N = W * D;
const PIN = 0.86;

/* Small math ------------------------------------------------------------ */
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
function perspective(fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function ortho(l: number, r: number, b: number, t: number, n: number, f: number) {
  return new Float32Array([2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]);
}
function lookAt(eye: Vec3, at: Vec3, up: Vec3 = [0, 1, 0]) {
  const z = norm(sub(eye, at));
  const x = norm(cross(up, z));
  const y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
}
function mul(a: Float32Array, b: Float32Array) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
function project(m: Float32Array, p: Vec3) {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  return { x: x / w, y: y / w, w };
}

/* The district ---------------------------------------------------------- */
function rand(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function smoothNoise(x: number, z: number) {
  return (Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.27 - 0.4) + Math.sin(x * 0.07 - z * 0.11 + 2.1)) * 0.5;
}
const streetX = new Set([4, 5, 14, 23, 24, 32, 39]);
const streetZ = new Set([3, 10, 11, 19, 26]);
const isStreet = (x: number, z: number) => streetX.has(x) || streetZ.has(z) || x === 0 || z === 0 || x === W - 1 || z === D - 1;
const idx = (x: number, z: number) => z * W + x;
const world = (x: number, z: number): [number, number] => [x - W / 2 + 0.5, z - D / 2 + 0.5];

function buildCity() {
  const r = rand(7);
  const terrain = new Float32Array(N);
  const city = new Float32Array(N);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) terrain[idx(x, z)] = 0.16 + 0.22 * (smoothNoise(x, z) * 0.5 + 0.5);
  // Lots: blocks between streets split into 2–3 cell plots, each its own height.
  const lotH = new Map<string, number>();
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, z);
      if (isStreet(x, z)) {
        city[i] = terrain[i] * 0.55;
        continue;
      }
      // A park: low, with a few trees.
      if (x > 24 && x < 32 && z > 19 && z < 26) {
        city[i] = terrain[i] * 0.8 + (r() < 0.16 ? 0.45 + r() * 0.3 : 0);
        continue;
      }
      const key = `${Math.floor(x / 3)}:${Math.floor(z / 2)}`;
      if (!lotH.has(key)) {
        const center = 1 - Math.min(1, Math.hypot(x - W * 0.55, z - D * 0.45) / 24);
        lotH.set(key, 0.45 + Math.pow(r(), 2.4) * (0.9 + center * 2.1));
      }
      city[i] = terrain[i] + lotH.get(key)!;
    }
  }
  return city;
}

/** Shortest walk along streets between two cells. */
function route(from: [number, number], to: [number, number]) {
  const prev = new Int32Array(N).fill(-1);
  const q = [idx(...from)];
  prev[q[0]] = q[0];
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    if (i === idx(...to)) break;
    const x = i % W, z = (i / W) | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= D || !isStreet(nx, nz)) continue;
      const j = idx(nx, nz);
      if (prev[j] !== -1) continue;
      prev[j] = i;
      q.push(j);
    }
  }
  const path: [number, number][] = [];
  for (let i = idx(...to); ; i = prev[i]) {
    path.push([i % W, (i / W) | 0]);
    if (prev[i] === i || prev[i] === -1) break;
  }
  return path.reverse();
}

/* Geometry ---------------------------------------------------------------- */
function cube() {
  const f: [Vec3, Vec3[]][] = [
    [[0, 1, 0], [[-0.5, 1, -0.5], [-0.5, 1, 0.5], [0.5, 1, 0.5], [0.5, 1, -0.5]]],
    [[0, -1, 0], [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]]],
    [[1, 0, 0], [[0.5, 0, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5], [0.5, 0, 0.5]]],
    [[-1, 0, 0], [[-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 1, 0.5], [-0.5, 1, -0.5]]],
    [[0, 0, 1], [[-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5]]],
    [[0, 0, -1], [[-0.5, 0, -0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5], [0.5, 0, -0.5]]],
  ];
  const v: number[] = [], ix: number[] = [];
  f.forEach(([n, q], k) => {
    q.forEach((p) => v.push(...p, ...n));
    ix.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3);
  });
  return { v: new Float32Array(v), i: new Uint16Array(ix) };
}
function cylinder(seg = 32) {
  const v: number[] = [], ix: number[] = [];
  for (let s = 0; s <= seg; s++) {
    const a = (s / seg) * Math.PI * 2, c = Math.cos(a) * 0.5, sn = Math.sin(a) * 0.5;
    v.push(c, 0, sn, c * 2, 0, sn * 2, c, 1, sn, c * 2, 0, sn * 2);
  }
  for (let s = 0; s < seg; s++) {
    const a = s * 2, b = a + 2;
    ix.push(a, a + 1, b + 1, a, b + 1, b);
  }
  const top = v.length / 6;
  v.push(0, 1, 0, 0, 1, 0);
  for (let s = 0; s <= seg; s++) {
    const a = (s / seg) * Math.PI * 2;
    v.push(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5, 0, 1, 0);
  }
  for (let s = 0; s < seg; s++) ix.push(top, top + 1 + s + 1, top + 1 + s);
  return { v: new Float32Array(v), i: new Uint16Array(ix) };
}

/* Shaders ------------------------------------------------------------------ */
const SOLID_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in vec2 aOff;
layout(location=3) in float aH;
uniform mat4 uVP, uLightVP;
uniform vec2 uSize;
uniform float uY;
out vec3 vNor, vWorld;
out vec4 vLight;
out float vLocalY;
void main() {
  vec3 p = vec3(aPos.x * uSize.x + aOff.x, aPos.y * aH + uY, aPos.z * uSize.y + aOff.y);
  vWorld = p; vNor = aNor; vLocalY = aPos.y * aH;
  vLight = uLightVP * vec4(p, 1.0);
  gl_Position = uVP * vec4(p, 1.0);
}`;
const SOLID_FS = `#version 300 es
precision highp float;
precision highp sampler2DShadow;
in vec3 vNor, vWorld;
in vec4 vLight;
in float vLocalY;
uniform sampler2DShadow uShadow;
uniform vec3 uLightDir, uColor, uFire;
uniform vec2 uFireC;
uniform float uFireR, uTime, uEmit, uHeat;
out vec4 o;
float shade(vec4 lp) {
  vec3 c = lp.xyz / lp.w * 0.5 + 0.5;
  if (c.z > 1.0) return 1.0;
  vec2 t = 1.0 / vec2(textureSize(uShadow, 0));
  float s = 0.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) s += texture(uShadow, vec3(c.xy + vec2(x, y) * t * 1.2, c.z - 0.0012));
  return s / 9.0;
}
void main() {
  vec3 n = normalize(vNor);
  float top = step(0.5, n.y);
  float diff = max(dot(n, -uLightDir), 0.0);
  float sh = shade(vLight);
  // Like a white architectural model: bounce light keeps the sides light,
  // the sun adds soft shadows, and the gaps between pins fall into shade.
  float ambient = mix(0.52, 0.66, top) + 0.04 * n.z;
  float ao = mix(mix(0.68, 1.0, smoothstep(0.0, 0.8, vLocalY)), 1.0, top);
  vec3 col = uColor * (ambient + 0.46 * diff * mix(0.22, 1.0, sh)) * ao;
  // Heat from the fire, flickering, strongest on roofs.
  float heat = uHeat * clamp((uFireR - distance(vWorld.xz, uFireC)) / 1.6, 0.0, 1.0);
  float flick = 0.82 + 0.18 * sin(uTime * 6.0 + vWorld.x * 2.7 + vWorld.z * 1.9);
  col = mix(col, uFire * (0.75 + 0.5 * top) * flick, heat * (0.55 + 0.35 * top));
  col = mix(col, uColor * (0.84 + 0.16 * n.y), uEmit);
  o = vec4(col, 1.0);
}`;
const DEPTH_FS = `#version 300 es
precision mediump float;
void main() {}`;
const RIBBON_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aRib; // distance along the path, side (-1..1)
uniform mat4 uVP;
out vec2 vRib;
void main() { vRib = aRib; gl_Position = uVP * vec4(aPos, 1.0); }`;
const RIBBON_FS = `#version 300 es
precision highp float;
in vec2 vRib;
uniform vec3 uColor;
uniform float uProg, uTime, uAlpha;
out vec4 o;
void main() {
  if (vRib.x > uProg) discard;
  float edge = 1.0 - smoothstep(0.55, 1.0, abs(vRib.y));
  float flow = 0.62 + 0.38 * smoothstep(0.35, 0.5, abs(fract(vRib.x * 0.9 - uTime * 1.4) - 0.5));
  float head = smoothstep(uProg - 1.4, uProg, vRib.x);
  o = vec4(uColor * (1.05 + head * 0.5), min(1.0, 0.9 * flow + head * 0.3) * edge * uAlpha);
}`;
const SPRITE_VS = `#version 300 es
layout(location=0) in vec2 aQ;
uniform mat4 uVP;
uniform vec3 uC, uRight, uUp;
uniform float uS;
out vec2 vQ;
void main() { vQ = aQ; gl_Position = uVP * vec4(uC + (uRight * aQ.x + uUp * aQ.y) * uS, 1.0); }`;
const SPRITE_FS = `#version 300 es
precision mediump float;
in vec2 vQ;
uniform vec3 uColor;
uniform float uAlpha;
out vec4 o;
void main() { float d = length(vQ); o = vec4(uColor, uAlpha * pow(max(0.0, 1.0 - d), 2.2)); }`;

/** Starts compiling a program without waiting for the GPU driver. */
function startProgram(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const sh = (t: number, src: string) => {
    const s = gl.createShader(t)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  const p = gl.createProgram()!;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  const u = new Proxy({} as Record<string, WebGLUniformLocation | null>, { get: (c, k: string) => (k in c ? c[k] : (c[k] = gl.getUniformLocation(p, k))) });
  return { p, u, v, f };
}
/**
 * Waits for programs to finish compiling. With KHR_parallel_shader_compile the
 * driver compiles in the background while the page keeps scrolling smoothly;
 * without it, this simply checks the result.
 */
async function finishPrograms(gl: WebGL2RenderingContext, progs: ReturnType<typeof startProgram>[]) {
  const ext = gl.getExtension('KHR_parallel_shader_compile');
  if (ext) {
    const done = () => progs.every((x) => gl.getProgramParameter(x.p, ext.COMPLETION_STATUS_KHR));
    while (!done()) await new Promise((r) => requestAnimationFrame(r));
  }
  for (const x of progs) {
    if (!gl.getProgramParameter(x.p, gl.LINK_STATUS)) {
      throw new Error(gl.getShaderInfoLog(x.v) || gl.getShaderInfoLog(x.f) || gl.getProgramInfoLog(x.p) || 'link');
    }
  }
}

function cssColor(el: Element, name: string): Vec3 {
  const probe = document.createElement('span');
  probe.style.color = getComputedStyle(el).getPropertyValue(name).trim() || '#888';
  el.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number) ?? [128, 128, 128];
  probe.remove();
  return [m[0] / 255, m[1] / 255, m[2] / 255];
}
const lum = (c: Vec3) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/* Mount ------------------------------------------------------------------- */
export async function mountTable(host: HTMLElement) {
  const canvas = host.querySelector<HTMLCanvasElement>('canvas')!;
  const labels = host.querySelector<HTMLElement>('[data-labels]')!;
  const ctx = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!ctx) return null;
  const gl: WebGL2RenderingContext = ctx;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const solid = startProgram(gl, SOLID_VS, SOLID_FS);
  const depth = startProgram(gl, SOLID_VS, DEPTH_FS);
  const ribbon = startProgram(gl, RIBBON_VS, RIBBON_FS);
  const sprite = startProgram(gl, SPRITE_VS, SPRITE_FS);
  try {
    await finishPrograms(gl, [solid, depth, ribbon, sprite]);
  } catch (err) {
    console.warn('Haptic table shaders did not compile:', err);
    return null;
  }

  /* Pins */
  const city = buildCity();
  const flat = new Float32Array(N).fill(0.12);
  const heights = new Float32Array(flat);
  const target = new Float32Array(flat);
  const offsets = new Float32Array(N * 2);
  const delay = new Float32Array(N);
  for (let z = 0; z < D; z++)
    for (let x = 0; x < W; x++) {
      const [wx, wz] = world(x, z);
      offsets.set([wx, wz], idx(x, z) * 2);
      delay[idx(x, z)] = Math.hypot(x, z * 1.2) * 0.022;
    }
  const box = cube();
  const cyl = cylinder();
  const geom = (g: { v: Float32Array; i: Uint16Array }) => {
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, g.v, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.i, gl.STATIC_DRAW);
    return { vao, count: g.i.length };
  };
  const pins = geom(box);
  gl.bindVertexArray(pins.vao);
  const offBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, offBuf);
  gl.bufferData(gl.ARRAY_BUFFER, offsets, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(2, 1);
  const hBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, hBuf);
  gl.bufferData(gl.ARRAY_BUFFER, heights, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(3, 1);
  const slab = geom(box);
  const disc = geom(cyl);
  gl.bindVertexArray(null);

  /* Shadow map */
  const S = 2048;
  const shadowTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, shadowTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, S, S);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTex, 0);
  gl.drawBuffers([gl.NONE]);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const lightDir = norm([0.55, -1, 0.42]);
  const lightVP = mul(ortho(-30, 30, -24, 24, 1, 140), lookAt([-lightDir[0] * 60, -lightDir[1] * 60, -lightDir[2] * 60], [0, 0, 0], [0, 0, 1]));

  /* Quad for sprites */
  const quad = gl.createVertexArray()!;
  gl.bindVertexArray(quad);
  const qb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, qb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  /* Routes along the streets, drawn as ribbons just above them */
  const cityAt = (x: number, z: number) => city[idx(x, z)];
  const station: [number, number] = [0, 11];
  const fireLot: [number, number] = [28, 14];
  const fireGoal: [number, number] = [32, 14];
  const tokenCell: [number, number] = [14, 22];
  const tokenGoal: [number, number] = [24, 14];
  function makeRibbon(path: [number, number][]) {
    const pts = path.map(([x, z]) => {
      const [wx, wz] = world(x, z);
      return [wx, cityAt(x, z) + 0.06, wz] as Vec3;
    });
    const v: number[] = [];
    let dist = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const t = norm([b[0] - a[0], 0, b[2] - a[2]]);
      const side: Vec3 = [-t[2] * 0.3, 0, t[0] * 0.3];
      if (i > 0) dist += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]);
      const p = pts[i];
      v.push(p[0] - side[0], p[1], p[2] - side[2], dist, -1, p[0] + side[0], p[1], p[2] + side[2], dist, 1);
    }
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
    gl.bindVertexArray(null);
    return { vao, count: pts.length * 2, length: dist, pts };
  }
  const r1 = makeRibbon(route(station, fireGoal));
  const r2 = makeRibbon(route(tokenCell, tokenGoal));
  const along = (r: ReturnType<typeof makeRibbon>, d: number): Vec3 => {
    let acc = 0;
    for (let i = 1; i < r.pts.length; i++) {
      const a = r.pts[i - 1], b = r.pts[i];
      const l = Math.hypot(b[0] - a[0], b[2] - a[2]);
      if (acc + l >= d) {
        const t = (d - acc) / (l || 1);
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      }
      acc += l;
    }
    return r.pts[r.pts.length - 1];
  };

  /* Colors follow the page (palette and light or dark) */
  let colors = { pin: [0.94, 0.94, 0.92] as Vec3, table: [0.85, 0.85, 0.83] as Vec3, ar: [0.24, 0.48, 1] as Vec3, fire: [1, 0.42, 0.24] as Vec3, token: [0.12, 0.12, 0.11] as Vec3, dark: false };
  function readColors() {
    const bg = cssColor(host, '--bg');
    const ink = cssColor(host, '--ink');
    const dark = lum(bg) < 0.4;
    colors = {
      pin: dark ? mix3(bg, [1, 1, 1], 0.62) : mix3(bg, [1, 1, 1], 0.55),
      table: dark ? mix3(bg, [1, 1, 1], 0.3) : mix3(bg, ink, 0.1),
      ar: dark ? [0.36, 0.62, 1] : [0.05, 0.3, 1],
      fire: [1, 0.42, 0.24],
      token: dark ? [0.92, 0.9, 0.86] : [0.1, 0.1, 0.09],
      dark,
    };
  }
  readColors();

  /* Story */
  let stage = -1;
  let stageAt = 0;
  let fireAt = -1, fireOutAt = -1;
  let arAlpha = 0, arTarget = 0;
  let r1At = -1, r2At = -1;
  let tokenY = 6, tokenOn = false;
  let pinsMoving = true;

  function setStage(s: number, now = performance.now()) {
    if (s === stage) return;
    const prev = stage;
    stage = s;
    stageAt = now;
    target.set(s === 0 ? flat : city);
    pinsMoving = true;
    if (s >= 2 && prev < 2) {
      fireAt = now;
      fireOutAt = -1;
      r1At = now + 600;
    }
    if (s < 2 && prev >= 2) fireOutAt = now;
    arTarget = s >= 2 ? 1 : 0;
    if (s === 3 && prev !== 3) {
      tokenOn = true;
      tokenY = 6;
      r2At = now + 900;
    }
    if (s < 3) {
      tokenOn = false;
      r2At = -1;
    }
    if (s < 2) r1At = -1;
    kick();
  }

  /* Camera: a slow drift, and drag to look around */
  let az = -0.62, el = 0.66, dragAz = 0, dragEl = 0, velAz = 0;
  let dragging = false, lastX = 0, lastY = 0, startX = 0, startY = 0, decided = false, pid = -1;
  canvas.addEventListener('pointerdown', (e) => {
    pid = e.pointerId;
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    decided = e.pointerType === 'mouse';
    dragging = decided;
    if (dragging) canvas.setPointerCapture(pid);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid) return;
    if (!decided) {
      const dx = Math.abs(e.clientX - startX), dy = Math.abs(e.clientY - startY);
      if (dy > 8 && dy > dx) return void (pid = -1);
      if (dx < 6) return;
      decided = dragging = true;
      canvas.setPointerCapture(pid);
    }
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    dragAz -= dx * 0.006;
    dragEl = Math.max(-0.35, Math.min(0.42, dragEl + dy * 0.004));
    velAz = -dx * 0.006;
    host.dataset.dragged = '';
    kick();
  });
  const end = () => {
    dragging = false;
    pid = -1;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  /* Labels: crisp HTML pinned to points in the scene */
  const label = (text: string, kind: string) => {
    const el = document.createElement('span');
    el.className = `ht-tag ht-tag--${kind}`;
    el.innerHTML = `<i></i>${text}`;
    labels.appendChild(el);
    return el;
  };
  const tags = { fire: label('Fire', 'fire'), u1: label('Unit 1', 'ar'), u2: label('Unit 2', 'ar'), token: label('Token', 'token'), u3: label('Unit 3', 'ar') };
  const placed: { el: HTMLElement; x: number; y: number }[] = [];
  function place(el: HTMLElement, vp: Float32Array, p: Vec3, on: boolean, w: number, h: number) {
    const s = project(vp, p);
    const vis = on && s.w > 0 && Math.abs(s.x) < 1.05 && Math.abs(s.y) < 1.05;
    el.dataset.on = vis ? '1' : '';
    if (vis) placed.push({ el, x: (s.x * 0.5 + 0.5) * w, y: (-s.y * 0.5 + 0.5) * h });
  }
  /** Labels that would overlap are nudged apart vertically, then positioned. */
  function settleLabels() {
    placed.sort((a, b) => b.y - a.y);
    for (let i = 0; i < placed.length; i++) {
      const a = placed[i];
      const wa = a.el.offsetWidth, ha = a.el.offsetHeight + 4;
      for (let j = 0; j < i; j++) {
        const b = placed[j];
        if (Math.abs(a.x - b.x) < (wa + b.el.offsetWidth) / 2 && Math.abs(a.y - b.y) < ha) a.y = b.y - ha;
      }
      a.el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
    }
    placed.length = 0;
  }

  /* Size */
  let cw = 1, ch = 1;
  const ro = new ResizeObserver(() => {
    const r = canvas.getBoundingClientRect();
    // 1.5x is sharp with antialiasing and costs half the pixels of 2x.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cw = Math.max(1, r.width);
    ch = Math.max(1, r.height);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    kick();
  });
  ro.observe(canvas);

  /* Camera distance: fit the whole table, with room around it, for this frame shape */
  const FOV = 0.42;
  let radius = 90, fitFor = 0;
  function fit(aspect: number) {
    fitFor = aspect;
    const corners: Vec3[] = [];
    for (const x of [-W / 2 - 0.7, W / 2 + 0.7]) for (const z of [-D / 2 - 0.7, D / 2 + 0.7]) for (const y of [-0.6, 2.6]) corners.push([x, y, z]);
    const r0 = 100;
    const a0 = aspect < 1 ? az + 1.45 : az;
    const e0 = aspect < 1 ? el + 0.22 : el;
    const eye: Vec3 = [Math.sin(a0) * Math.cos(e0) * r0, Math.sin(e0) * r0, Math.cos(a0) * Math.cos(e0) * r0];
    const m = mul(perspective(FOV, aspect, 1, 600), lookAt(eye, [0, 0.4, 0]));
    let mx = 0, my = 0;
    for (const c of corners) {
      const s = project(m, c);
      mx = Math.max(mx, Math.abs(s.x));
      my = Math.max(my, Math.abs(s.y));
    }
    radius = r0 * Math.max(mx / (aspect < 1 ? 1.02 : 0.97), my / 0.94);
  }

  /* Frame */
  let raf = 0, visible = false, last = performance.now();
  // Ambient motion (the drift, the fire, the flowing routes) runs at 30 fps;
  // dragging and step changes get every frame.
  let wasBusy = true, shadowDirty = true;
  function kick() {
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }
  function frame(now: number) {
    raf = 0;
    if (!wasBusy && !dragging && now - last < 30) return kick();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    let busy = false;

    // Pins rise in a wave from one corner.
    if (pinsMoving) {
      const since = (now - stageAt) / 1000;
      const k = reduce ? 1 : 1 - Math.exp(-dt * 5.5);
      let moving = false;
      for (let i = 0; i < N; i++) {
        if (!reduce && since < delay[i]) {
          moving = true;
          continue;
        }
        const d = target[i] - heights[i];
        if (Math.abs(d) > 0.002) {
          heights[i] += d * k;
          moving = true;
        } else heights[i] = target[i];
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, hBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, heights);
      shadowDirty = true;
      pinsMoving = moving;
      busy ||= moving;
    }
    arAlpha += (arTarget - arAlpha) * (reduce ? 1 : 1 - Math.exp(-dt * 4));
    if (Math.abs(arTarget - arAlpha) > 0.002) busy = true;
    else arAlpha = arTarget;
    if (tokenOn && tokenY > 0) {
      tokenY = reduce ? 0 : Math.max(0, tokenY - dt * 14);
      busy = true;
    }

    // Camera
    if (!dragging) {
      dragAz += velAz;
      velAz *= 0.92;
      if (Math.abs(velAz) > 0.0002) busy = true;
    }
    const drift = reduce ? 0 : Math.sin(t * 0.12) * 0.1;
    const aspect = cw / ch;
    // On a tall frame, turn the table so its long side runs into the depth.
    const baseAz = aspect < 1 ? az + 1.45 : az;
    const baseEl = aspect < 1 ? el + 0.22 : el;
    const A = baseAz + dragAz + drift, E = Math.max(0.3, Math.min(1.2, baseEl + dragEl));
    if (fitFor !== aspect) fit(aspect);
    const eye: Vec3 = [Math.sin(A) * Math.cos(E) * radius, Math.sin(E) * radius, Math.cos(A) * Math.cos(E) * radius];
    const proj = perspective(FOV, aspect, 1, 600);
    const view = lookAt(eye, [0, 0.4, 0]);
    const vp = mul(proj, view);

    // Fire grows, then breathes.
    let fireR = 0;
    if (fireAt > 0) fireR = Math.min(4.6, ((now - fireAt) / 1000) * 1.3) + Math.sin(t * 1.7) * 0.15;
    if (fireOutAt > 0) fireR *= Math.max(0, 1 - (now - fireOutAt) / 700);
    if (fireOutAt > 0 && now - fireOutAt > 700) {
      fireAt = fireOutAt = -1;
    }
    const fireHeat = fireAt > 0 ? 1 : 0;
    const [fx, fz] = world(...fireLot);
    const fireTop: Vec3 = [fx, city[idx(...fireLot)] + 0.4, fz];

    // Shadow pass: the light never moves, so the map only changes with the pins.
    if (shadowDirty) {
    shadowDirty = false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, S, S);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(depth.p);
    gl.uniformMatrix4fv(depth.u.uVP, false, lightVP);
    gl.uniformMatrix4fv(depth.u.uLightVP, false, lightVP);
    gl.uniform2f(depth.u.uSize, PIN, PIN);
    gl.uniform1f(depth.u.uY, 0);
    gl.bindVertexArray(pins.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, pins.count, gl.UNSIGNED_SHORT, 0, N);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // Main pass
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Soft contact shadow under the table
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.useProgram(sprite.p);
    gl.uniformMatrix4fv(sprite.u.uVP, false, vp);
    gl.uniform3f(sprite.u.uC, 0, -0.62, 0);
    gl.uniform3f(sprite.u.uRight, 1.15, 0, 0);
    gl.uniform3f(sprite.u.uUp, 0, 0, 0.82);
    gl.uniform1f(sprite.u.uS, 30);
    gl.uniform3f(sprite.u.uColor, 0, 0, 0);
    gl.uniform1f(sprite.u.uAlpha, colors.dark ? 0.5 : 0.22);
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.depthMask(true);
    gl.disable(gl.BLEND);

    // Table, pins, token and units
    gl.useProgram(solid.p);
    gl.uniformMatrix4fv(solid.u.uVP, false, vp);
    gl.uniformMatrix4fv(solid.u.uLightVP, false, lightVP);
    gl.uniform3f(solid.u.uLightDir, lightDir[0], lightDir[1], lightDir[2]);
    gl.uniform3f(solid.u.uFire, ...colors.fire);
    gl.uniform2f(solid.u.uFireC, fx, fz);
    gl.uniform1f(solid.u.uFireR, fireR);
    gl.uniform1f(solid.u.uTime, t);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, shadowTex);
    gl.uniform1i(solid.u.uShadow, 0);

    gl.uniform1f(solid.u.uEmit, 0);
    gl.uniform1f(solid.u.uHeat, 0);
    gl.uniform3f(solid.u.uColor, ...colors.table);
    gl.uniform2f(solid.u.uSize, W + 1.4, D + 1.4);
    gl.uniform1f(solid.u.uY, -0.6);
    gl.bindVertexArray(slab.vao);
    gl.vertexAttrib2f(2, 0, 0);
    gl.vertexAttrib1f(3, 0.6);
    gl.drawElements(gl.TRIANGLES, slab.count, gl.UNSIGNED_SHORT, 0);

    gl.uniform1f(solid.u.uHeat, fireHeat);
    gl.uniform3f(solid.u.uColor, ...colors.pin);
    gl.uniform2f(solid.u.uSize, PIN, PIN);
    gl.uniform1f(solid.u.uY, 0);
    gl.bindVertexArray(pins.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, pins.count, gl.UNSIGNED_SHORT, 0, N);

    gl.uniform1f(solid.u.uHeat, 0);
    gl.bindVertexArray(disc.vao);
    const drawDisc = (p: Vec3, size: number, h: number, color: Vec3, emit: number) => {
      gl.uniform3f(solid.u.uColor, ...color);
      gl.uniform1f(solid.u.uEmit, emit);
      gl.uniform2f(solid.u.uSize, size, size);
      gl.uniform1f(solid.u.uY, p[1]);
      gl.vertexAttrib2f(2, p[0], p[2]);
      gl.vertexAttrib1f(3, h);
      gl.drawElements(gl.TRIANGLES, disc.count, gl.UNSIGNED_SHORT, 0);
    };
    const [tx, tz] = world(...tokenCell);
    const tokenPos: Vec3 = [tx, city[idx(...tokenCell)] + tokenY, tz];
    if (tokenOn) drawDisc(tokenPos, 1.5, 0.42, colors.token, 0);

    // Units travel along their routes.
    const speed = 7;
    const units: { p: Vec3; on: boolean; tag: HTMLElement }[] = [];
    if (r1At > 0) {
      const s = Math.max(0, (now - r1At) / 1000);
      units.push({ p: along(r1, Math.min(r1.length, s * speed)), on: true, tag: tags.u1 });
      units.push({ p: along(r1, Math.min(r1.length - 3.2, Math.max(0, s * speed - 3))), on: s * speed > 3, tag: tags.u2 });
    }
    if (r2At > 0) {
      const s = Math.max(0, (now - r2At) / 1000);
      units.push({ p: along(r2, Math.min(r2.length, s * speed)), on: true, tag: tags.u3 });
    }
    for (const u of units) if (u.on && arAlpha > 0.02) drawDisc(u.p, 0.72, 0.28, colors.ar, 0.85);

    // AR layer
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-2, -2);
    gl.useProgram(ribbon.p);
    gl.uniformMatrix4fv(ribbon.u.uVP, false, vp);
    gl.uniform3f(ribbon.u.uColor, ...colors.ar);
    gl.uniform1f(ribbon.u.uTime, t);
    const drawRibbon = (r: ReturnType<typeof makeRibbon>, at: number, alpha: number) => {
      if (at < 0 || arAlpha < 0.01) return;
      const prog = Math.min(r.length + 0.01, Math.max(0, ((now - at) / 1000) * 9));
      if (prog < r.length) busy = true;
      gl.uniform1f(ribbon.u.uProg, prog);
      gl.uniform1f(ribbon.u.uAlpha, alpha * arAlpha);
      gl.bindVertexArray(r.vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, r.count);
    };
    drawRibbon(r1, r1At, stage === 3 ? 0.4 : 1);
    drawRibbon(r2, r2At, 1);
    gl.disable(gl.POLYGON_OFFSET_FILL);

    // Heat glow above the fire
    if (fireR > 0.05) {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(sprite.p);
      gl.uniformMatrix4fv(sprite.u.uVP, false, vp);
      gl.uniform3f(sprite.u.uC, ...fireTop);
      gl.uniform3f(sprite.u.uRight, view[0], view[4], view[8]);
      gl.uniform3f(sprite.u.uUp, view[1], view[5], view[9]);
      gl.uniform1f(sprite.u.uS, 1.2 + fireR * 0.9);
      gl.uniform3f(sprite.u.uColor, ...colors.fire);
      gl.uniform1f(sprite.u.uAlpha, (colors.dark ? 0.55 : 0.4) * Math.min(1, fireR / 2));
      gl.bindVertexArray(quad);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);

    // Labels
    place(tags.fire, vp, [fireTop[0], fireTop[1] + 1.2, fireTop[2]], fireR > 1, cw, ch);
    // Once the token is in play, only its unit is named; the first two have arrived.
    for (const u of units) place(u.tag, vp, [u.p[0], u.p[1] + 0.9, u.p[2]], u.on && arAlpha > 0.5 && (stage < 3 || u.tag === tags.u3), cw, ch);
    if (r1At < 0) {
      place(tags.u1, vp, [0, 0, 0], false, cw, ch);
      place(tags.u2, vp, [0, 0, 0], false, cw, ch);
    }
    if (r2At < 0) place(tags.u3, vp, [0, 0, 0], false, cw, ch);
    place(tags.token, vp, [tokenPos[0], tokenPos[1] + 1.1, tokenPos[2]], tokenOn && tokenY < 0.5, cw, ch);
    settleLabels();

    // While on screen the scene keeps its slow drift; with reduced motion it
    // renders only while something changes.
    wasBusy = busy || dragging;
    if (!reduce || busy) kick();
  }

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && !document.hidden;
    if (visible) {
      last = performance.now();
      kick();
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  });
  io.observe(host);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden && host.getBoundingClientRect().bottom > 0 && host.getBoundingClientRect().top < innerHeight;
    if (visible) kick();
  });
  new MutationObserver(() => {
    readColors();
    kick();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette', 'data-scheme'] });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    host.dataset.fallback = '';
  });

  return { setStage };
}
