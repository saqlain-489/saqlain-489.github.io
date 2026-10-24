import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/** Every motion in the scene repeats over this many seconds, so a capture of one loop is seamless. */
export const LOOP = 8;
const TAU = Math.PI * 2;

export const PALETTE = {
  teal: 0x2dd4bf,
  cyan: 0x67e8f9,
  violet: 0xa78bfa,
  amber: 0xfbbf24,
  green: 0x4ade80,
  slate: 0xcbd5e1,
};

export interface AgentNode {
  id: string;
  label: string;
  sub: string;
  detail: string;
  color: number;
  position: THREE.Vector3;
}

export const NODES: AgentNode[] = [
  { id: 'plan', label: 'PLAN', sub: 'planner agent', detail: 'Turns a brief into a blueprint. Code validates it and returns exact fixes.', color: PALETTE.teal, position: new THREE.Vector3(-5.6, 0.9, -0.6) },
  { id: 'write', label: 'WRITE ×3', sub: 'parallel writers', detail: 'A cheap model drafts in parallel; only the last retry goes to the strong model.', color: PALETTE.cyan, position: new THREE.Vector3(-2.3, -0.55, 0.9) },
  { id: 'check', label: '17 CHECKS', sub: 'rules in code', detail: 'Rules decide what code can. Every rejection returns as an exact instruction.', color: PALETTE.slate, position: new THREE.Vector3(0.75, 0.75, -0.3) },
  { id: 'judge', label: 'JUDGE', sub: 'screen → escalate', detail: 'A cheap judge screens everything; the strong model reads only what it flagged.', color: PALETTE.violet, position: new THREE.Vector3(3.75, -0.45, 0.55) },
  { id: 'ship', label: 'SHIP', sub: 'evals gate CI', detail: 'Only what passes ships, with every retry and escalation in the run report.', color: PALETTE.green, position: new THREE.Vector3(6.4, 0.85, -0.7) },
];

const byId = (id: string) => NODES.find((n) => n.id === id)!;

/* ------------------------------------------------------------------ */
/* Timeline: one packet's journey, in seconds within the loop           */
/* ------------------------------------------------------------------ */

interface Leg { edge: string; from: number; to: number; color: number }
const LEGS: Leg[] = [
  { edge: 'plan>write', from: 0.15, to: 1.05, color: PALETTE.teal },
  { edge: 'write>check', from: 1.15, to: 2.0, color: PALETTE.cyan },
  { edge: 'check>write', from: 2.25, to: 3.1, color: PALETTE.amber },
  { edge: 'write>check', from: 3.2, to: 4.05, color: PALETTE.cyan },
  { edge: 'check>judge', from: 4.3, to: 5.15, color: PALETTE.violet },
  { edge: 'judge>ship', from: 5.85, to: 6.75, color: PALETTE.green },
];

/** Moments a node reacts: [node, time, colour]. */
const PULSES: [string, number, number][] = [
  ['write', 1.05, PALETTE.cyan],
  ['check', 2.0, PALETTE.amber],
  ['write', 3.1, PALETTE.amber],
  ['check', 4.05, PALETTE.green],
  ['judge', 5.15, PALETTE.violet],
  ['ship', 6.75, PALETTE.green],
];

/** Smooth bump that is 1 at `at` and fades over `width` seconds, wrapping around the loop. */
function pulse(t: number, at: number, width: number): number {
  let d = ((t - at) % LOOP + LOOP) % LOOP;
  if (d > LOOP / 2) d -= LOOP;
  if (d < 0) return Math.max(0, 1 + d / (width * 0.25)) ** 2 * 0.6;
  return Math.max(0, 1 - d / width) ** 2;
}

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

/* ------------------------------------------------------------------ */
/* Shaders                                                              */
/* ------------------------------------------------------------------ */

const orbVertex = /* glsl */ `
  varying vec3 vNormal; varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const orbFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uIntensity;
  varying vec3 vNormal; varying vec3 vView;
  void main() {
    float facing = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
    float rim = pow(1.0 - facing, 2.2);
    vec3 core = mix(uColor * 0.55, vec3(1.0), pow(facing, 6.0) * 0.55);
    gl_FragColor = vec4((core + uColor * rim * 1.6) * uIntensity, 1.0);
  }`;

const edgeVertex = /* glsl */ `
  varying float vU;
  void main() { vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const edgeFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uPhase; uniform float uOpacity; uniform float uStreaks;
  varying float vU;
  void main() {
    float s = fract(vU * uStreaks - uPhase);
    float streak = smoothstep(0.0, 0.06, s) * (1.0 - smoothstep(0.06, 0.32, s));
    float ends = smoothstep(0.0, 0.08, vU) * smoothstep(1.0, 0.92, vU);
    gl_FragColor = vec4(uColor * (0.55 + 2.6 * streak), uOpacity * ends * (0.28 + 0.9 * streak));
  }`;

const starVertex = /* glsl */ `
  attribute float aSize; attribute float aPhase; attribute vec3 aColor;
  uniform float uTime; uniform float uPixelRatio;
  varying vec3 vColor; varying float vTwinkle;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vTwinkle = 0.55 + 0.45 * sin(6.2831853 * (uTime / ${LOOP.toFixed(1)}) * 2.0 + aPhase);
    vColor = aColor;
    gl_PointSize = aSize * uPixelRatio * (60.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const starFragment = /* glsl */ `
  varying vec3 vColor; varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor * (0.45 + 0.6 * vTwinkle), a * a * vTwinkle * 0.8);
  }`;

const gridVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const gridFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uTime;
  varying vec3 vWorld;
  float line(vec2 p, float s) {
    vec2 q = p / s;
    vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }
  void main() {
    vec2 p = vWorld.xz + vec2(0.0, uTime * 2.0 / ${LOOP.toFixed(1)});
    float d = length(vWorld.xz - vec2(0.5, 0.0));
    float fade = exp(-d * 0.085) * smoothstep(0.0, 6.0, d + 3.0);
    float g = line(p, 1.0) * 0.35 + line(p, 4.0) * 0.75;
    gl_FragColor = vec4(uColor, g * fade * 0.55);
  }`;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function backgroundTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#04060c';
  g.fillRect(0, 0, 1024, 512);
  const glow = (x: number, y: number, r: number, color: string) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(4,6,12,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 512);
  };
  glow(820, 40, 520, 'rgba(45,212,191,0.16)');
  glow(120, 520, 560, 'rgba(139,92,246,0.14)');
  glow(560, 300, 380, 'rgba(14,22,40,0.55)');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function curveBetween(a: THREE.Vector3, b: THREE.Vector3, lift: THREE.Vector3): THREE.CatmullRomCurve3 {
  const mid = a.clone().lerp(b, 0.5).add(lift);
  return new THREE.CatmullRomCurve3([a.clone(), mid, b.clone()], false, 'centripetal');
}

/* ------------------------------------------------------------------ */
/* The scene                                                            */
/* ------------------------------------------------------------------ */

export interface ConstellationOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  pixelRatio?: number;
  /** Fraction of the frame width the graph is pushed right by, to leave room for text on the left. */
  shift?: number;
  stars?: number;
  /** Hold the camera, grid and stars still so a captured loop compresses to a small file. */
  calm?: boolean;
  /** Tall screens: the pipeline runs top to bottom in the upper part of the frame. */
  portrait?: boolean;
  /** On tall screens, the vertical band (fractions of the height) the pipeline must fit in. */
  band?: [number, number];
}

export interface Constellation {
  renderAt(t: number, view?: { yaw: number; pitch: number }): void;
  resize(width: number, height: number, pixelRatio?: number, shift?: number, portrait?: boolean, band?: [number, number]): void;
  /** Screen position (CSS px) and visibility of each agent node after the last render. */
  project(): { id: string; x: number; y: number; depth: number }[];
  pick(clientX: number, clientY: number, rect: DOMRect): AgentNode | null;
  dispose(): void;
}

export function createConstellation(opts: ConstellationOptions): Constellation {
  const renderer = new THREE.WebGLRenderer({ canvas: opts.canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(opts.pixelRatio ?? Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = backgroundTexture();
  scene.fog = new THREE.FogExp2(0x04060c, 0.018);

  const camera = new THREE.PerspectiveCamera(34, opts.width / opts.height, 0.1, 200);
  const center = new THREE.Vector3(0.4, 0.05, 0);
  const target = center.clone();
  let shift = opts.shift ?? 0;
  let portrait = opts.portrait ?? false;
  let band: [number, number] = opts.band ?? [0.11, 0.46];
  const graph = new THREE.Group();
  scene.add(graph);

  const glow = glowTexture();
  const disposables: { dispose(): void }[] = [glow];
  const track = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  /* Grid floor and stars ------------------------------------------------ */
  const gridMat = track(new THREE.ShaderMaterial({
    vertexShader: gridVertex, fragmentShader: gridFragment, transparent: true, depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color(0x2dd4bf).multiplyScalar(0.55) }, uTime: { value: 0 } },
  }));
  const grid = new THREE.Mesh(track(new THREE.PlaneGeometry(140, 140)), gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = -2.8;
  scene.add(grid);

  const starCount = opts.stars ?? 1100;
  const starGeo = track(new THREE.BufferGeometry());
  const pos = new Float32Array(starCount * 3), size = new Float32Array(starCount), phase = new Float32Array(starCount), col = new Float32Array(starCount * 3);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const starColors = [new THREE.Color(0xe2e8f0), new THREE.Color(PALETTE.teal), new THREE.Color(PALETTE.violet)];
  for (let i = 0; i < starCount; i++) {
    const r = 18 + rand() * 44, th = rand() * TAU, ph = (rand() - 0.35) * 1.1;
    pos.set([Math.cos(th) * Math.cos(ph) * r, Math.sin(ph) * r * 0.6 + 2, Math.sin(th) * Math.cos(ph) * r - 10], i * 3);
    size[i] = 0.5 + rand() * rand() * 1.6;
    phase[i] = rand() * TAU;
    const c = starColors[i % 7 === 0 ? 1 : i % 11 === 0 ? 2 : 0];
    col.set([c.r, c.g, c.b], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  const starMat = track(new THREE.ShaderMaterial({
    vertexShader: starVertex, fragmentShader: starFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: renderer.getPixelRatio() } },
  }));
  scene.add(new THREE.Points(starGeo, starMat));

  /* Edges ---------------------------------------------------------------- */
  const P = (id: string) => byId(id).position;
  const curves: Record<string, THREE.CatmullRomCurve3> = {
    'plan>write': curveBetween(P('plan'), P('write'), new THREE.Vector3(0, 0.55, 0.3)),
    'write>check': curveBetween(P('write'), P('check'), new THREE.Vector3(0, 0.55, 0.2)),
    'check>write': curveBetween(P('check'), P('write'), new THREE.Vector3(0, -1.7, 0.9)),
    'check>judge': curveBetween(P('check'), P('judge'), new THREE.Vector3(0, 0.5, 0.35)),
    'judge>ship': curveBetween(P('judge'), P('ship'), new THREE.Vector3(0, 0.55, 0.2)),
  };
  const edgeStyle: Record<string, { color: number; streaks: number; speed: number; opacity: number }> = {
    'plan>write': { color: PALETTE.teal, streaks: 2, speed: 2, opacity: 0.9 },
    'write>check': { color: PALETTE.cyan, streaks: 2, speed: 3, opacity: 0.9 },
    'check>write': { color: PALETTE.amber, streaks: 1, speed: 1, opacity: 0.55 },
    'check>judge': { color: PALETTE.violet, streaks: 2, speed: 2, opacity: 0.9 },
    'judge>ship': { color: PALETTE.green, streaks: 2, speed: 2, opacity: 0.9 },
  };
  const edgeMats: Record<string, THREE.ShaderMaterial> = {};
  for (const [key, curve] of Object.entries(curves)) {
    const s = edgeStyle[key];
    const mat = track(new THREE.ShaderMaterial({
      vertexShader: edgeVertex, fragmentShader: edgeFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(s.color) }, uPhase: { value: 0 }, uOpacity: { value: s.opacity }, uStreaks: { value: s.streaks } },
    }));
    edgeMats[key] = mat;
    graph.add(new THREE.Mesh(track(new THREE.TubeGeometry(curve, 160, key === 'check>write' ? 0.016 : 0.022, 8, false)), mat));
  }

  /* Nodes ---------------------------------------------------------------- */
  interface NodeParts { core: THREE.Mesh; mat: THREE.ShaderMaterial; halo: THREE.Sprite; rings: THREE.Mesh[]; base: THREE.Color; hit: THREE.Mesh; extras: THREE.Mesh[] }
  const parts: Record<string, NodeParts> = {};
  const coreGeo = track(new THREE.IcosahedronGeometry(1, 4));
  const hitGeo = track(new THREE.SphereGeometry(0.85, 12, 12));
  const hitMat = track(new THREE.MeshBasicMaterial({ visible: false }));
  for (const n of NODES) {
    const r = n.id === 'write' ? 0.3 : 0.36;
    const mat = track(new THREE.ShaderMaterial({ vertexShader: orbVertex, fragmentShader: orbFragment, uniforms: { uColor: { value: new THREE.Color(n.color) }, uIntensity: { value: 1.4 } } }));
    const core = new THREE.Mesh(coreGeo, mat);
    core.scale.setScalar(r);
    core.position.copy(n.position);
    graph.add(core);

    const haloMat = track(new THREE.SpriteMaterial({ map: glow, color: n.color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(r * 5.2);
    halo.position.copy(n.position);
    graph.add(halo);

    const rings: THREE.Mesh[] = [];
    const ringCount = n.id === 'judge' ? 2 : 1;
    for (let k = 0; k < ringCount; k++) {
      const ringMat = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(n.color).multiplyScalar(1.3), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      const ring = new THREE.Mesh(track(new THREE.TorusGeometry(r * (1.85 + k * 0.75), 0.011, 8, 120)), ringMat);
      ring.position.copy(n.position);
      ring.rotation.set(1.15 + k * 0.5, 0.25 * k, 0);
      graph.add(ring);
      rings.push(ring);
    }

    // Parallel writers: three small orbs circling the writer node.
    const extras: THREE.Mesh[] = [];
    if (n.id === 'write') {
      for (let k = 0; k < 3; k++) {
        const m = new THREE.Mesh(coreGeo, track(new THREE.ShaderMaterial({ vertexShader: orbVertex, fragmentShader: orbFragment, uniforms: { uColor: { value: new THREE.Color(PALETTE.cyan) }, uIntensity: { value: 1.25 } } })));
        m.scale.setScalar(0.085);
        graph.add(m);
        extras.push(m);
      }
    }

    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.copy(n.position);
    hit.userData.node = n;
    graph.add(hit);
    parts[n.id] = { core, mat, halo, rings, base: new THREE.Color(n.color), hit, extras };
  }

  // A shockwave ring at SHIP when a packet lands.
  const shockMat = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.green).multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const shock = new THREE.Mesh(track(new THREE.RingGeometry(0.955, 1, 96)), shockMat);
  shock.position.copy(P('ship'));
  graph.add(shock);

  /* Packets ------------------------------------------------------------- */
  const packetMat = track(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const packetGeo = track(new THREE.SphereGeometry(0.075, 16, 16));
  const makePacket = (scale = 1) => {
    const mesh = new THREE.Mesh(packetGeo, packetMat.clone());
    track(mesh.material as THREE.Material);
    mesh.scale.setScalar(scale);
    const haloMat = track(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(0.62 * scale);
    const trail = Array.from({ length: 7 }, (_, i) => {
      const s = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })));
      s.scale.setScalar((0.34 - i * 0.035) * scale);
      graph.add(s);
      return s;
    });
    graph.add(mesh, halo);
    return { mesh, halo, trail };
  };
  const hero = makePacket(1.25);
  const ambient = Array.from({ length: 6 }, () => makePacket(0.7));
  const AMBIENT_ROUTES: { edge: string; offset: number; color: number }[] = [
    { edge: 'plan>write', offset: 0.5, color: PALETTE.teal },
    { edge: 'write>check', offset: 0.15, color: PALETTE.cyan },
    { edge: 'write>check', offset: 0.65, color: PALETTE.cyan },
    { edge: 'check>judge', offset: 0.35, color: PALETTE.violet },
    { edge: 'judge>ship', offset: 0.05, color: PALETTE.green },
    { edge: 'judge>ship', offset: 0.55, color: PALETTE.green },
  ];

  const tmpColor = new THREE.Color();
  const placePacket = (p: ReturnType<typeof makePacket>, curve: THREE.CatmullRomCurve3 | null, u: number, color: number, alpha: number) => {
    const visible = !!curve && alpha > 0.001;
    p.mesh.visible = p.halo.visible = visible;
    p.trail.forEach((s) => (s.visible = visible));
    if (!visible || !curve) return;
    const pt = curve.getPointAt(Math.min(1, Math.max(0, u)));
    p.mesh.position.copy(pt);
    p.halo.position.copy(pt);
    tmpColor.set(color);
    (p.mesh.material as THREE.MeshBasicMaterial).color.copy(tmpColor).multiplyScalar(2.6 * alpha);
    (p.halo.material as THREE.SpriteMaterial).color.copy(tmpColor);
    (p.halo.material as THREE.SpriteMaterial).opacity = 0.95 * alpha;
    p.trail.forEach((s, i) => {
      const tu = Math.max(0, u - (i + 1) * 0.022);
      s.position.copy(curve.getPointAt(Math.min(1, tu)));
      (s.material as THREE.SpriteMaterial).color.copy(tmpColor);
      (s.material as THREE.SpriteMaterial).opacity = alpha * 0.5 * (1 - i / p.trail.length) * (u > 0.02 ? 1 : 0);
    });
  };

  /* Post-processing ------------------------------------------------------ */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(opts.width, opts.height), 0.8, 0.6, 0.24);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let width = opts.width, height = opts.height;
  const applySize = () => {
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    graph.rotation.z = portrait ? -Math.PI / 2 : 0;
    graph.updateMatrixWorld(true);
    target.copy(center).applyEuler(graph.rotation);
    if (portrait) {
      // The pipeline (about 13.6 units tall once turned) fills the free band above the text.
      const [top, bottom] = band;
      camera.userData.radius = 13.6 / (2 * halfTan * Math.max(0.2, bottom - top));
      camera.filmOffset = 0;
      camera.setViewOffset(width, height, 0, height * (0.5 - (top + bottom) / 2), width, height);
    } else {
      // `shift` is a fraction of the frame width: the graph's centre lands at (0.5 + shift) of the width,
      // and the camera backs off until the graph (half-span about 7.8 units with labels) fits beside the text.
      const room = Math.max(0.3, 1 - 2 * shift);
      camera.userData.radius = Math.min(34, Math.max(13, 7.8 / (halfTan * camera.aspect * room)));
      camera.filmOffset = -shift * camera.getFilmWidth() * 2 * halfTan * camera.aspect;
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    starMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  };
  applySize();

  /* Frame ---------------------------------------------------------------- */
  const projected = NODES.map((n) => ({ id: n.id, x: 0, y: 0, depth: 0 }));
  const v = new THREE.Vector3();

  function renderAt(t: number, view = { yaw: 0, pitch: 0 }) {
    const k = ((t % LOOP) + LOOP) % LOOP;
    const w = (TAU * k) / LOOP;

    const R = camera.userData.radius as number;
    const sway = opts.calm ? 0 : 1;
    const yaw = 0.09 * sway * Math.sin(w) + view.yaw;
    const pitch = 0.17 + 0.035 * sway * Math.sin(w + 1.3) + view.pitch;
    camera.position.set(target.x + R * Math.sin(yaw) * Math.cos(pitch), target.y + R * Math.sin(pitch), target.z + R * Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(target);

    gridMat.uniforms.uTime.value = opts.calm ? 0 : k;
    starMat.uniforms.uTime.value = opts.calm ? 0 : k;
    for (const [key, mat] of Object.entries(edgeMats)) mat.uniforms.uPhase.value = (k / LOOP) * edgeStyle[key].speed;

    // Node reactions.
    for (const n of NODES) {
      const p = parts[n.id];
      let flash = 0;
      const flashColor = tmpColor.copy(p.base);
      for (const [id, at, color] of PULSES) {
        if (id !== n.id) continue;
        const b = pulse(k, at, opts.calm ? 0.5 : 0.9);
        if (b > flash) { flash = b; flashColor.set(color); }
      }
      // Calm captures hold the glow steady: slow, wide fades are what make lossy animated WebP smear.
      const breathe = opts.calm ? 0.5 : 0.5 + 0.5 * Math.sin(w * 2 + n.position.x);
      p.mat.uniforms.uColor.value.copy(p.base).lerp(flashColor, Math.min(1, flash * 1.2));
      p.mat.uniforms.uIntensity.value = 1.2 + 0.22 * breathe + flash * 1.35;
      p.core.scale.setScalar((n.id === 'write' ? 0.3 : 0.36) * (1 + flash * 0.22));
      (p.halo.material as THREE.SpriteMaterial).opacity = 0.38 + 0.1 * breathe + flash * 0.35;
      (p.halo.material as THREE.SpriteMaterial).color.copy(p.mat.uniforms.uColor.value);
      p.rings.forEach((ring, i) => {
        ring.rotation.z = (opts.calm ? 0.6 : w) * (i % 2 ? -1 : 1) + i;
        ring.rotation.x = 1.15 + i * 0.5 + (opts.calm ? 0 : 0.12 * Math.sin(w + i));
        const escalate = n.id === 'judge' && i === 1 ? pulse(k, 5.35, 0.7) : 0;
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.32 + 0.2 * breathe + flash * 0.5 + escalate * 0.9;
        ring.scale.setScalar(1 + escalate * 0.18);
      });
      p.extras.forEach((m, i) => {
        const a = w * 2 + (i * TAU) / 3;
        m.position.set(n.position.x + Math.cos(a) * 0.62, n.position.y + Math.sin(a) * 0.62 * 0.42, n.position.z + Math.sin(a) * 0.62 * 0.9);
      });
    }

    const landed = pulse(k, 6.75, 1.1);
    shock.scale.setScalar(0.45 + (1 - landed) * 1.45);
    shockMat.opacity = landed * 0.9;
    shock.lookAt(camera.position);

    // The hero packet.
    const leg = LEGS.find((l) => k >= l.from && k <= l.to);
    if (leg) placePacket(hero, curves[leg.edge], ease((k - leg.from) / (leg.to - leg.from)), leg.color, 1);
    else placePacket(hero, null, 0, 0xffffff, 0);

    // Ambient traffic: dimmer packets, two trips per loop so the pattern repeats exactly.
    ambient.forEach((p, i) => {
      const r = AMBIENT_ROUTES[i];
      const u = ((k / LOOP) * 2 + r.offset) % 1;
      const fade = Math.sin(Math.PI * u);
      placePacket(p, curves[r.edge], u, r.color, opts.calm ? 0 : 0.38 * fade);
    });

    composer.render();

    for (let i = 0; i < NODES.length; i++) {
      v.copy(NODES[i].position).applyMatrix4(graph.matrixWorld).project(camera);
      projected[i].x = (v.x * 0.5 + 0.5) * width;
      projected[i].y = (-v.y * 0.5 + 0.5) * height;
      projected[i].depth = v.z;
    }
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hits = NODES.map((n) => parts[n.id].hit);

  return {
    renderAt,
    resize(w2, h2, pr, s, tall, freeBand) {
      width = w2;
      height = h2;
      if (pr) renderer.setPixelRatio(pr);
      if (s !== undefined) shift = s;
      if (tall !== undefined) portrait = tall;
      if (freeBand) band = freeBand;
      applySize();
    },
    project: () => projected,
    pick(clientX, clientY, rect) {
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(hits, false)[0];
      return (hit?.object.userData.node as AgentNode) ?? null;
    },
    dispose() {
      for (const d of disposables) d.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
