/* =====================================================================
   JV – JARVIS VISUAL SDK
   High-level toolkit the AI (and the model library) use to build
   high-quality, interactive, technically meaningful 3D scenes.
   Runs inside the sandboxed scene iframe. `three` is shared via importmap.
   ===================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export { THREE };
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);

/* ---------------- materials ---------------- */
const PRESETS = {
  steel: { color: '#b9c2c9', metalness: 0.95, roughness: 0.32 },
  stahl: 'steel',
  chrome: { color: '#e8edf0', metalness: 1, roughness: 0.08 },
  aluminum: { color: '#c9d1d8', metalness: 0.9, roughness: 0.42 },
  aluminium: 'aluminum',
  castIron: { color: '#5a6168', metalness: 0.75, roughness: 0.62 },
  guss: 'castIron',
  darkSteel: { color: '#3c434a', metalness: 0.9, roughness: 0.4 },
  brass: { color: '#c9a24a', metalness: 1, roughness: 0.3 },
  copper: { color: '#c46f3d', metalness: 1, roughness: 0.3 },
  gold: { color: '#e6c15a', metalness: 1, roughness: 0.22 },
  rubber: { color: '#1d2023', metalness: 0, roughness: 0.9 },
  plastic: { color: '#e8edf2', metalness: 0, roughness: 0.45 },
  paint: { color: '#2d6cdf', metalness: 0.35, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 },
  carbon: { color: '#202428', metalness: 0.4, roughness: 0.35, clearcoat: 1 },
  ceramic: { color: '#f2efe8', metalness: 0, roughness: 0.25 },
  glass: { color: '#cfefff', metalness: 0, roughness: 0.05, transmission: 0.92, thickness: 0.3, transparent: true, opacity: 0.35, ior: 1.45 },
  water: { color: '#2f8fd8', metalness: 0, roughness: 0.1, transmission: 0.6, transparent: true, opacity: 0.6 },
  tissue: { color: '#c8505a', metalness: 0, roughness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.4, sheen: 1, sheenColor: '#ff9aa2' },
  muscle: { color: '#a8323e', metalness: 0, roughness: 0.6, sheen: 1, sheenColor: '#ff7b88' },
  blood: { color: '#8c0a14', metalness: 0, roughness: 0.3, clearcoat: 1 },
  bloodOxy: { color: '#d4202c', metalness: 0, roughness: 0.3, clearcoat: 1 },
  vein: { color: '#3a4fae', metalness: 0, roughness: 0.4, clearcoat: 0.8 },
  fat: { color: '#f0d27a', metalness: 0, roughness: 0.6 },
  bone: { color: '#eee6d2', metalness: 0, roughness: 0.7 },
  leaf: { color: '#3f9a3a', metalness: 0, roughness: 0.6, side: THREE.DoubleSide },
  wood: { color: '#8a5a35', metalness: 0, roughness: 0.7 },
  concrete: { color: '#8d9196', metalness: 0, roughness: 0.95 },
  rock: { color: '#6e6258', metalness: 0, roughness: 0.95, flatShading: true },
  ice: { color: '#dff4ff', metalness: 0, roughness: 0.15, transmission: 0.5, transparent: true, opacity: 0.85 },
  holo: { color: '#2de2ff', metalness: 0, roughness: 0.3, emissive: '#2de2ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.55 },
  glow: { color: '#ffffff', emissive: '#2de2ff', emissiveIntensity: 2.2 },
  fire: { color: '#ff9a2e', emissive: '#ff6a00', emissiveIntensity: 3, transparent: true, opacity: 0.85 },
  sun: { color: '#fff4c2', emissive: '#ffb02e', emissiveIntensity: 2.6 },
};
function material(name = 'steel', over = {}) {
  let p = PRESETS[name]; if (typeof p === 'string') p = PRESETS[p];
  if (!p) p = { color: name.startsWith?.('#') ? name : '#b9c2c9', metalness: 0.4, roughness: 0.5 };
  const o = { ...p, ...over };
  const physical = o.transmission != null || o.clearcoat != null || o.sheen != null;
  const m = physical ? new THREE.MeshPhysicalMaterial() : new THREE.MeshStandardMaterial();
  for (const [k, v] of Object.entries(o)) {
    if (k === 'color' || k === 'emissive' || k === 'sheenColor') m[k] = new THREE.Color(v);
    else if (k in m) m[k] = v;
  }
  if (o.opacity != null && o.opacity < 1) m.transparent = true;
  return m;
}

/* ---------------- procedural geometry ---------------- */
const geo = {
  box: (w = 1, h = 1, d = 1, r = 0) => (r > 0 ? new RoundedBoxGeometry(w, h, d, 4, r) : new THREE.BoxGeometry(w, h, d)),
  cylinder: (rTop = 0.5, rBottom = rTop, h = 1, seg = 48, open = false) => new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open),
  sphere: (r = 0.5, seg = 48) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.66)),
  cone: (r = 0.5, h = 1, seg = 48) => new THREE.ConeGeometry(r, h, seg),
  torus: (R = 0.5, r = 0.1, seg = 96) => new THREE.TorusGeometry(R, r, 24, seg),
  capsule: (r = 0.25, len = 0.6) => new THREE.CapsuleGeometry(r, len, 12, 24),
  /** hollow cylinder (tube wall) along Y */
  tube: (rOuter = 0.5, rInner = 0.4, h = 1, seg = 64) => {
    const s = new THREE.Shape(); s.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, rInner, 0, Math.PI * 2, true); s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: seg });
    g.rotateX(-Math.PI / 2); g.translate(0, -h / 2, 0); return g;
  },
  /** revolve a 2D profile [[radius, y], ...] around Y */
  lathe: (profile, seg = 64) => new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), seg),
  /** extrude a 2D outline [[x,y],...] along Z (centered) */
  extrude: (outline, depth = 0.2, { bevel = 0.01, holes = [] } = {}) => {
    const s = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of holes) {
      if (h.circle) { const p = new THREE.Path(); p.absarc(h.circle[0], h.circle[1], h.circle[2], 0, Math.PI * 2, true); s.holes.push(p); }
      else s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    }
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 24 });
    g.translate(0, 0, -depth / 2); return g;
  },
  /** pipe along a 3D path */
  pipe: (points, r = 0.05, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed), Math.max(32, points.length * 16), r, 16, closed),
  /** involute-ish spur gear in XY plane, thickness along Z */
  gear: ({ teeth = 20, radius = 0.5, width = 0.15, bore = 0.12, depth = null } = {}) => {
    const d = depth ?? radius * 0.14; const s = new THREE.Shape(); const n = teeth * 4;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2, k = i % 4;
      const r = k === 0 || k === 3 ? radius - d : radius;
      const da = (k === 1 ? 0.18 : k === 2 ? -0.18 : 0) * (Math.PI * 2 / teeth) * 0.25;
      const x = Math.cos(a + da) * r, y = Math.sin(a + da) * r; i ? s.lineTo(x, y) : s.moveTo(x, y);
    }
    if (bore > 0) { const h = new THREE.Path(); h.absarc(0, 0, bore, 0, Math.PI * 2, true); s.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1, curveSegments: 8 });
    g.translate(0, 0, -width / 2); return g;
  },
  /** coil spring along Y, from y=0 to y=length */
  spring: ({ radius = 0.1, wire = 0.015, turns = 8, length = 0.5 } = {}) => {
    const pts = []; const N = turns * 24;
    for (let i = 0; i <= N; i++) { const a = (i / 24) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * radius, (i / N) * length, Math.sin(a) * radius)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 2, wire, 8, false);
  },
  /** NACA 4-digit airfoil extruded along Z (span) – chord along X */
  airfoil: ({ chord = 1, thickness = 0.12, camber = 0.02, camberPos = 0.4, span = 2 } = {}) => {
    const pts = [], N = 60;
    const yt = (x) => 5 * thickness * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
    const yc = (x) => (x < camberPos ? (camber / camberPos ** 2) * (2 * camberPos * x - x * x) : (camber / (1 - camberPos) ** 2) * (1 - 2 * camberPos + 2 * camberPos * x - x * x));
    for (let i = 0; i <= N; i++) { const x = 1 - i / N; pts.push([x * chord - chord / 2, (yc(x) + yt(x)) * chord]); }
    for (let i = 1; i < N; i++) { const x = i / N; pts.push([x * chord - chord / 2, (yc(x) - yt(x)) * chord]); }
    return geo.extrude(pts, span, { bevel: 0 });
  },
  /** sweep a (elliptic) cross-section along a 3D spine: radii = number | [r…] | (u)=>r | (u)=>[rx,ry]. Fuselages, vessels, blades, worms, bones. */
  sweep: (points, radii = 0.1, { segments = 96, radial = 24, closed = false, caps = true } = {}) => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed);
    const rf = typeof radii === 'function' ? radii : Array.isArray(radii) ? (u) => { const x = u * (radii.length - 1), i = Math.min(radii.length - 2, Math.floor(x)); const a = radii[i], b = radii[i + 1], k = x - i; const L = (q, w) => (Array.isArray(q) ? q : [q, q])[w]; return [L(a, 0) + (L(b, 0) - L(a, 0)) * k, L(a, 1) + (L(b, 1) - L(a, 1)) * k]; } : () => radii;
    const frames = curve.computeFrenetFrames(segments, closed);
    const pos = [], idx = [];
    for (let i = 0; i <= segments; i++) {
      const u = i / segments, c = curve.getPointAt(u); let r = rf(u); if (!Array.isArray(r)) r = [r, r];
      const N = frames.normals[i], B = frames.binormals[i];
      for (let j = 0; j <= radial; j++) { const a = (j / radial) * Math.PI * 2; pos.push(c.x + (N.x * Math.cos(a) * r[0] + B.x * Math.sin(a) * r[1]), c.y + (N.y * Math.cos(a) * r[0] + B.y * Math.sin(a) * r[1]), c.z + (N.z * Math.cos(a) * r[0] + B.z * Math.sin(a) * r[1])); }
    }
    for (let i = 0; i < segments; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    if (caps && !closed) for (const [ring, flip] of [[0, true], [segments, false]]) { const c = curve.getPointAt(ring / segments); const ci = pos.length / 3; pos.push(c.x, c.y, c.z); for (let j = 0; j < radial; j++) { const a = ring * (radial + 1) + j; flip ? idx.push(ci, a + 1, a) : idx.push(ci, a, a + 1); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  },
  /** organic body: sphere deformed by shape(dir:Vector3)=>radiusScale (+ optional smooth noise). Organs, rocks, cells, fruits. */
  organic: (shape = () => 1, { radius = 0.5, detail = 5, noise = 0, seed = 1 } = {}) => {
    const g = new THREE.IcosahedronGeometry(radius, detail); const p = g.attributes.position; const v = new THREE.Vector3();
    const n3 = (x, y, z) => Math.sin(x * 3.1 + seed) * Math.sin(y * 2.7 + seed * 1.3) * Math.sin(z * 3.3 + seed * 0.7);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const d = v.clone().normalize(); const k = shape(d) * (1 + noise * n3(d.x * 2, d.y * 2, d.z * 2)); v.copy(d.multiplyScalar(radius * k)); p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g;
  },
  /** arrow from a to b (force/flow vectors) */
  arrow: (a, b, r = 0.03) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length(), head = Math.min(L * 0.3, r * 6);
    const shaft = new THREE.CylinderGeometry(r, r, L - head, 16); shaft.translate(0, (L - head) / 2, 0); const tip = new THREE.ConeGeometry(r * 2.4, head, 20); tip.translate(0, L - head / 2, 0);
    const g = BufferGeometryUtils.mergeGeometries([shaft.toNonIndexed(), tip.toNonIndexed()]); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.applyQuaternion(q); g.translate(...A.toArray()); return g; },
  /** merge several geometries (already transformed) into one */
  merge: (list) => BufferGeometryUtils.mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false),
};

/* ---------------- kinematics / motion helpers ---------------- */
const kin = {
  /** exact crank–slider: returns piston offset from crank axis and rod angle (rad) */
  crankSlider(angle, r, l) {
    const s = Math.sin(angle), c = Math.cos(angle);
    const y = r * c + Math.sqrt(l * l - r * r * s * s);
    const rod = Math.asin((r * s) / l);
    return { y, rodAngle: rod, pin: { x: r * s, y: r * c } };
  },
  /** smooth valve/cam lift (0..1) for crank degree `deg` in a 720° cycle; open/close in crank degrees */
  camLift(deg, open, close) {
    const d = ((deg % 720) + 720) % 720;
    let span = close - open; if (span < 0) span += 720;
    let x = d - open; if (x < 0) x += 720;
    if (x > span) return 0;
    return Math.sin((x / span) * Math.PI) ** 1.6;
  },
  /** angular speed of a driven gear */
  gearRatio: (teethDriver, teethDriven) => teethDriver / teethDriven,
  orbit: (radius, period, t, phase = 0) => { const a = (t / period) * Math.PI * 2 + phase; return [Math.cos(a) * radius, 0, Math.sin(a) * radius]; },
  smooth, clamp, lerp: THREE.MathUtils.lerp,
};

/* ---------------- UI (inside iframe) ---------------- */
const CSS = `
html,body{margin:0;height:100%;overflow:hidden;background:transparent;font-family:Rajdhani,system-ui,sans-serif;color:#cfefff;-webkit-user-select:none;user-select:none}
#jv{position:fixed;inset:0}
#jv canvas{display:block;width:100%;height:100%;touch-action:none;outline:none}
.jv-top{position:fixed;left:10px;right:10px;top:8px;display:flex;gap:6px;align-items:center;pointer-events:none;flex-wrap:nowrap;overflow:hidden}
.jv-top .jv-badge{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:0 1 auto}
.jv-badge{pointer-events:auto;font:700 9.5px Orbitron,system-ui;letter-spacing:.14em;padding:5px 8px;border-radius:5px;background:rgba(2,12,20,.7);border:1px solid rgba(45,226,255,.35);color:#7ff3ff;backdrop-filter:blur(6px)}
.jv-badge.warn{color:#ffb02e;border-color:rgba(255,176,46,.5)}
.jv-phases{position:fixed;left:50%;transform:translateX(-50%);top:38px;display:flex;gap:4px;pointer-events:auto;max-width:98vw}
@media (max-width:520px){.jv-ph{font-size:8.5px;padding:6px 6px;letter-spacing:.02em}.jv-phinfo{font-size:13px;top:70px}.jv-info{top:auto;bottom:62px;right:8px;left:8px;width:auto}.jv-params{top:auto;bottom:62px}}
.jv-ph{font:700 10px Orbitron,system-ui;letter-spacing:.08em;padding:7px 10px;border-radius:6px;background:rgba(2,12,20,.65);border:1px solid rgba(45,226,255,.22);color:#6f97ad;cursor:pointer;transition:all .25s;white-space:nowrap}
.jv-ph.on{color:#02060c;background:#2de2ff;border-color:#2de2ff;box-shadow:0 0 18px rgba(45,226,255,.6)}
.jv-phinfo{position:fixed;left:50%;transform:translateX(-50%);top:76px;max-width:min(560px,92vw);text-align:center;font:600 14px Rajdhani,system-ui;color:#e6fbff;text-shadow:0 1px 6px #000;pointer-events:none}
.jv-bar{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:6px;padding:6px;border-radius:14px;background:rgba(2,12,20,.72);border:1px solid rgba(45,226,255,.3);backdrop-filter:blur(10px);pointer-events:auto;max-width:96vw;overflow-x:auto;scrollbar-width:none}
.jv-bar button{flex:0 0 auto;min-width:40px;height:40px;border-radius:10px;border:1px solid rgba(45,226,255,.25);background:rgba(45,226,255,.06);color:#7ff3ff;font:700 10px Orbitron,system-ui;letter-spacing:.08em;cursor:pointer;padding:0 10px;display:flex;align-items:center;justify-content:center;gap:5px}
.jv-bar button.on{background:#2de2ff;color:#02060c}
.jv-bar svg{width:16px;height:16px;fill:currentColor}
.jv-info{position:fixed;right:10px;top:110px;width:min(270px,70vw);padding:10px 12px;border-radius:12px;background:rgba(2,12,20,.8);border:1px solid rgba(255,176,46,.5);backdrop-filter:blur(10px);display:none;pointer-events:auto;box-shadow:0 0 24px rgba(255,176,46,.18)}
.jv-info.on{display:block;animation:jvIn .35s cubic-bezier(.2,.9,.2,1)}
@keyframes jvIn{from{opacity:0;transform:translateX(16px)}}
.jv-info b{display:block;font:700 12px Orbitron,system-ui;letter-spacing:.1em;color:#ffd38a;margin-bottom:4px}
.jv-info p{margin:0;font-size:14px;line-height:1.35;color:#e6fbff}
.jv-info .x{position:absolute;right:8px;top:6px;background:none;border:0;color:#ffd38a;font-size:16px;cursor:pointer}
.jv-params{position:fixed;left:10px;top:110px;width:min(230px,60vw);padding:8px 10px;border-radius:12px;background:rgba(2,12,20,.72);border:1px solid rgba(45,226,255,.28);backdrop-filter:blur(8px);pointer-events:auto;display:none}
.jv-params.on{display:block}
.jv-params label{display:block;font:600 10px Orbitron,system-ui;letter-spacing:.08em;color:#7ff3ff;margin:6px 0 2px}
.jv-params label span{float:right;color:#fff}
.jv-params input{width:100%;accent-color:#2de2ff}
.jv-lbl{position:fixed;transform:translate(-50%,-140%);font:700 11px Orbitron,system-ui;letter-spacing:.06em;color:#fff;padding:4px 8px;border-radius:5px;background:rgba(2,10,18,.82);border:1px solid rgba(45,226,255,.6);white-space:nowrap;pointer-events:none;transition:opacity .2s}
.jv-lbl.hl{border-color:#ffb02e;color:#ffd38a;box-shadow:0 0 16px rgba(255,176,46,.55);z-index:3}
.jv-lbl::after{content:"";position:absolute;left:50%;top:100%;width:1px;height:14px;background:currentColor;opacity:.6}
.jv-dial{position:fixed;left:10px;bottom:62px;width:74px;height:74px;pointer-events:none;display:none}
.jv-dial.on{display:block}
`;
const ICON = {
  play: '<path d="M7 4v16l13-8z"/>', pause: '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>', step: '<path d="M5 4v16l10-8zM16 4h3v16h-3z"/>',
};

/* ===================================================================== */
export function createStage(opts = {}) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  const host = document.createElement('div'); host.id = 'jv'; document.body.append(host);
  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || /Android/i.test(navigator.userAgent) && (navigator.deviceMemory || 4) <= 4;
  const gfx = opts.quality || (lowEnd ? 'mittel' : 'hoch');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, gfx === 'hoch' ? 2 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = opts.exposure ?? 0.92;
  renderer.shadowMap.enabled = gfx !== 'niedrig'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = opts.envIntensity ?? 0.55;
  const camera = new THREE.PerspectiveCamera(opts.fov || 40, 1, 0.01, 2000);
  camera.position.set(3, 2, 4);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.screenSpacePanning = true;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

  // lighting rig: key (shadows), rim (holo cyan), fill
  const hemi = new THREE.HemisphereLight(0xcfefff, 0x0a1620, 0.35); scene.add(hemi);
  const fillHolder = {};
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(4, 7, 5); key.castShadow = true;
  key.shadow.mapSize.set(lowEnd ? 1024 : 2048, lowEnd ? 1024 : 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; scene.add(key);
  const rim = new THREE.DirectionalLight(0x2de2ff, 1.6); rim.position.set(-5, 3, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffe2c0, 0.5); fill.position.set(-3, -1, 4); scene.add(fill);

  const root = new THREE.Group(); scene.add(root);
  // ground: shadow catcher + holo grid
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.35 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.PolarGridHelper(1, 24, 8, 96, 0x2de2ff, 0x2de2ff); grid.material.transparent = true; grid.material.opacity = 0.16; grid.material.depthWrite = false; scene.add(grid);
  if (opts.ground === false) { ground.visible = false; grid.visible = false; }
  queueMicrotask(() => { if (opts.umgebung) api.setEnvironment(opts.umgebung); });

  // post-processing (bloom only for emissive/bright things)
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.82); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  bloom.enabled = gfx !== 'niedrig' && opts.bloom !== false;

  /* ---------- registry ---------- */
  const parts = new Map();   // id -> {obj, label, info, base: {pos, quat}, explode: Vector3|null, mats: []}
  const tickers = [];
  const commands = {};
  const params = {};
  const warnings = [];
  let selected = null, highlighted = [], xray = false, explodeAmt = 0, explodeTarget = 0, labelsAll = false;

  function part(id, objOrGeo, mat, o = {}) {
    let obj = objOrGeo;
    if (objOrGeo?.isBufferGeometry) obj = new THREE.Mesh(objOrGeo, typeof mat === 'string' ? material(mat) : mat || material());
    obj.name = id;
    obj.traverse((m) => { if (m.isMesh) { m.castShadow = o.shadow !== false; m.receiveShadow = true; } });
    if (o.pos) obj.position.set(...o.pos);
    if (o.rot) obj.rotation.set(o.rot[0] * DEG, (o.rot[1] || 0) * DEG, (o.rot[2] || 0) * DEG);
    if (o.scale) typeof o.scale === 'number' ? obj.scale.setScalar(o.scale) : obj.scale.set(...o.scale);
    const parentObj = (o.parent ? (typeof o.parent === 'string' ? parts.get(o.parent)?.obj : o.parent) : root) || root;
    let wrap = null;
    if (o.explode) { wrap = new THREE.Group(); wrap.name = id + '_explode'; parentObj.add(wrap); wrap.add(obj); } else parentObj.add(obj);
    const mats = []; obj.traverse((m) => { if (m.isMesh) { const ms = Array.isArray(m.material) ? m.material : [m.material]; ms.forEach((x) => { x.userData.base ??= { opacity: x.opacity, transparent: x.transparent, emissive: x.emissive?.clone(), ei: x.emissiveIntensity, depthWrite: x.depthWrite }; mats.push(x); }); } });
    const rec = { id, obj, wrap, label: o.label || id, info: o.info || '', explode: o.explode ? new THREE.Vector3(...o.explode) : null, mats, selectable: o.selectable !== false, group: o.group };
    obj.userData.jvPart = id;
    parts.set(id, rec);
    return obj;
  }
  /** a registered empty group (to build assemblies) */
  function assembly(id, o = {}) { return part(id, new THREE.Group(), null, o); }
  const get = (id) => parts.get(id)?.obj;

  /* ---------- timeline with phases ---------- */
  const tl = { t: 0, duration: 4, speed: 1, playing: true, loop: true, phases: [], stepTarget: null, onPhase: null };
  function timeline({ duration = 4, phases = [], loop = true, speed = 1, autoplay = true } = {}) {
    Object.assign(tl, { duration, phases, loop, speed, playing: autoplay });
    buildPhaseUI(); return tl;
  }
  const phaseAt = (t) => tl.phases.findIndex((p) => t >= p.from && t < p.to);
  let lastPhase = -1;

  /* ---------- UI ---------- */
  const top = document.createElement('div'); top.className = 'jv-top';
  const titleB = document.createElement('div'); titleB.className = 'jv-badge'; titleB.textContent = opts.title || 'JARVIS · 3D';
  const kindB = document.createElement('div'); kindB.className = 'jv-badge' + (opts.simplified ? ' warn' : ''); kindB.textContent = opts.source || (opts.simplified ? 'VEREINFACHT' : 'PROZEDURAL');
  top.append(titleB, kindB); document.body.append(top);
  const phasesEl = document.createElement('div'); phasesEl.className = 'jv-phases'; document.body.append(phasesEl);
  const phInfo = document.createElement('div'); phInfo.className = 'jv-phinfo'; document.body.append(phInfo);
  const info = document.createElement('div'); info.className = 'jv-info'; info.innerHTML = '<button class="x">✕</button><b></b><p></p>'; document.body.append(info);
  info.querySelector('.x').onclick = () => { select(null); };
  const paramsEl = document.createElement('div'); paramsEl.className = 'jv-params'; document.body.append(paramsEl);
  const bar = document.createElement('div'); bar.className = 'jv-bar'; document.body.append(bar);
  const lblLayer = document.createElement('div'); document.body.append(lblLayer);
  function btn(label, fn, title) { const b = document.createElement('button'); b.innerHTML = label; b.title = title || ''; b.onclick = fn; bar.append(b); return b; }
  const bPlay = btn(`<svg viewBox="0 0 24 24">${ICON.pause}</svg>`, () => (tl.playing ? cmd.pause() : cmd.play()), 'Pause/Weiter');
  const bStep = btn(`<svg viewBox="0 0 24 24">${ICON.step}</svg>`, () => cmd.step(), 'Nächster Schritt');
  const bSpeed = btn('1×', () => cmd.speed({ wert: tl.speed >= 2 ? 0.25 : tl.speed * 2 }), 'Tempo');
  const bExp = btn('ZERLEGEN', () => cmd.explode({ an: explodeTarget === 0 }), 'Explosionsansicht');
  const bX = btn('RÖNTGEN', () => cmd.xray({ an: !xray }), 'Transparent');
  const bL = btn('LABELS', () => { labelsAll = !labelsAll; bL.classList.toggle('on', labelsAll); syncLabels(); }, 'Beschriftungen');
  btn('RESET', () => cmd.reset(), 'Ansicht zurücksetzen');
  function syncButtons() {
    bPlay.innerHTML = `<svg viewBox="0 0 24 24">${tl.playing ? ICON.pause : ICON.play}</svg>`;
    bSpeed.textContent = (tl.speed < 1 ? tl.speed : Math.round(tl.speed)) + '×';
    bExp.classList.toggle('on', explodeTarget > 0); bX.classList.toggle('on', xray);
    bPlay.style.display = bStep.style.display = bSpeed.style.display = hasMotion() ? '' : 'none';
  }
  const hasMotion = () => tickers.length > 0;
  function buildPhaseUI() {
    phasesEl.innerHTML = '';
    tl.phases.forEach((p, i) => { const e = document.createElement('div'); e.className = 'jv-ph'; e.textContent = `${i + 1} · ${p.name}`; e.onclick = () => cmd.phase({ nr: i + 1 }); phasesEl.append(e); });
  }
  function param(name, { min = 0, max = 1, value = 0.5, step = 0.01, label = name, unit = '', onChange } = {}) {
    paramsEl.classList.add('on');
    const l = document.createElement('label'); l.innerHTML = `${label}<span>${value}${unit}</span>`;
    const i = document.createElement('input'); i.type = 'range'; Object.assign(i, { min, max, step, value });
    i.oninput = () => { params[name].value = +i.value; l.querySelector('span').textContent = i.value + unit; onChange?.(+i.value); };
    paramsEl.append(l, i);
    params[name] = { value, set: (v) => { i.value = v; i.oninput(); }, min, max, label, unit };
    return params[name];
  }

  /* ---------- labels ---------- */
  const labelEls = new Map(); const v3 = new THREE.Vector3(); const box3 = new THREE.Box3();
  function syncLabels() {
    const want = new Set(labelsAll ? [...parts.keys()].filter((k) => parts.get(k).selectable) : []);
    highlighted.forEach((k) => want.add(k)); if (selected) want.add(selected);
    for (const [k, el] of labelEls) if (!want.has(k)) { el.remove(); labelEls.delete(k); }
    for (const k of want) if (!labelEls.has(k) && parts.has(k)) { const el = document.createElement('div'); el.className = 'jv-lbl'; el.textContent = parts.get(k).label; lblLayer.append(el); labelEls.set(k, el); }
    for (const [k, el] of labelEls) el.classList.toggle('hl', highlighted.includes(k) || selected === k);
  }
  function placeLabels() {
    const w = innerWidth, h = innerHeight;
    for (const [k, el] of labelEls) {
      const p = parts.get(k); if (!p) continue;
      box3.setFromObject(p.obj); if (box3.isEmpty()) continue; box3.getCenter(v3); v3.y = box3.max.y;
      v3.project(camera);
      el.style.left = ((v3.x + 1) / 2) * w + 'px'; el.style.top = ((1 - v3.y) / 2) * h + 'px'; el.style.opacity = v3.z > 1 ? 0 : 1;
    }
  }

  /* ---------- appearance states ---------- */
  function applyLook() {
    for (const [id, p] of parts) {
      const isHL = highlighted.includes(id) || selected === id;
      const ghost = (highlighted.length || selected) && !isHL && !isAncestorHL(id);
      for (const m of p.mats) {
        const b = m.userData.base;
        const xr = xray && !isHL;
        m.transparent = b.transparent || ghost || xr;
        m.opacity = ghost ? Math.min(b.opacity, 0.14) : xr ? Math.min(b.opacity, 0.28) : b.opacity;
        m.depthWrite = !(ghost || xr) && b.depthWrite !== false;
        if (m.emissive) { if (isHL) { m.emissive.set('#ffb02e'); m.emissiveIntensity = 0.55; } else { m.emissive.copy(b.emissive); m.emissiveIntensity = b.ei; } }
        m.needsUpdate = true;
      }
    }
  }
  function isAncestorHL(id) {
    let o = parts.get(id)?.obj?.parent;
    while (o) { const pid = o.userData?.jvPart; if (pid && (highlighted.includes(pid) || selected === pid)) return true; o = o.parent; }
    // children of highlighted assemblies stay visible too
    return false;
  }
  function resolveIds(z) {
    const list = [].concat(z ?? []).map((x) => String(x).toLowerCase());
    const out = [];
    for (const q of list) {
      const hit = [...parts.values()].filter((p) => p.id.toLowerCase() === q) ;
      const fuzzy = hit.length ? hit : [...parts.values()].filter((p) => p.id.toLowerCase().includes(q) || p.label.toLowerCase().includes(q) || (p.group || '').toLowerCase() === q);
      fuzzy.forEach((p) => out.includes(p.id) || out.push(p.id));
    }
    return out;
  }
  function select(id, { focus: doFocus = true } = {}) {
    selected = id && parts.has(id) ? id : null;
    if (selected) {
      const p = parts.get(selected);
      info.querySelector('b').textContent = p.label; info.querySelector('p').textContent = p.info || ''; info.classList.toggle('on', true);
      if (doFocus) focus([selected]);
    } else info.classList.remove('on');
    applyLook(); syncLabels();
  }

  /* ---------- camera ---------- */
  const tw = [];
  function tweenCam(pos, target, ms = 1100) {
    const p0 = camera.position.clone(), t0 = controls.target.clone(), s = performance.now();
    tw.length = 0;
    return new Promise((res) => tw.push({ f(now) { const k = Math.min(1, (now - s) / ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; camera.position.lerpVectors(p0, pos, e); controls.target.lerpVectors(t0, target, e); return k >= 1 ? (res(), true) : false; } }));
  }
  function boundsOf(ids) {
    const b = new THREE.Box3();
    if (!ids?.length) b.setFromObject(root); else ids.forEach((id) => { const o = get(id); if (o) b.union(new THREE.Box3().setFromObject(o)); });
    return b;
  }
  function fitDistance(sphereR) {
    const vfov = camera.fov * DEG, hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    return (sphereR / Math.sin(Math.min(vfov, hfov) / 2)) * 1.08;
  }
  let viewDir = new THREE.Vector3(1, 0.6, 1.25).normalize();
  function frame(ms = 1200) {
    const b = boundsOf(); if (b.isEmpty()) return;
    const c = b.getCenter(new THREE.Vector3()), r = b.getBoundingSphere(new THREE.Sphere()).radius;
    const d = fitDistance(r);
    camera.near = Math.max(0.001, d / 200); camera.far = d * 60; camera.updateProjectionMatrix();
    controls.minDistance = r * 0.3; controls.maxDistance = d * 4;
    ground.position.y = b.min.y - 0.002; grid.position.y = b.min.y; grid.scale.setScalar(r * 1.6);
    key.position.copy(c).add(new THREE.Vector3(r * 2, r * 3.5, r * 2.5)); key.target.position.copy(c); scene.add(key.target);
    const cam = key.shadow.camera; cam.left = cam.bottom = -r * 1.6; cam.right = cam.top = r * 1.6; cam.near = 0.01; cam.far = r * 10; cam.updateProjectionMatrix();
    return tweenCam(c.clone().add(viewDir.clone().multiplyScalar(d)), c, ms);
  }
  function focus(ids, ms = 1000) {
    const b = boundsOf(ids); if (b.isEmpty()) return;
    const c = b.getCenter(new THREE.Vector3()), r = Math.max(b.getBoundingSphere(new THREE.Sphere()).radius, boundsOf().getBoundingSphere(new THREE.Sphere()).radius * 0.45);
    const dir = camera.position.clone().sub(controls.target).normalize();
    return tweenCam(c.clone().add(dir.multiplyScalar(fitDistance(r) * 1.3)), c, ms);
  }
  const VIEWS = { vorne: [0, 0.15, 1], front: [0, 0.15, 1], seite: [1, 0.15, 0], side: [1, 0.15, 0], oben: [0.001, 1, 0.001], top: [0.001, 1, 0.001], iso: [1, 0.6, 1.25], hinten: [0, 0.15, -1] };

  /* ---------- picking ---------- */
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(root.children, true).filter((h) => h.object.visible && (h.object.material?.opacity ?? 1) > 0.2);
    const solid = hits.filter((h) => (h.object.material?.opacity ?? 1) >= 0.6); const order = solid.length ? solid.concat(hits) : hits; // prefer solid parts behind glass
    for (const h of order) { let o = h.object; while (o && !(o.userData.jvPart && parts.get(o.userData.jvPart)?.selectable)) o = o.parent; if (o) { const id = o.userData.jvPart; select(selected === id ? null : id); send({ typ: 'bauteil_gewählt', teil: id, label: parts.get(id).label }); return; } }
    select(null);
  });

  /* ---------- commands (also callable by JARVIS via postMessage) ---------- */
  const cmd = {
    highlight(a = {}) { const z = a.ziel ?? a.teil ?? a.teile; highlighted = resolveIds(z); if (!highlighted.length && z && !(Array.isArray(z) && !z.length) && z !== '') throw new Error('Bauteil nicht gefunden. Vorhanden: ' + [...parts.keys()].join(', ')); applyLook(); syncLabels(); if (highlighted.length && a.kamera !== false) focus(highlighted); if (highlighted.length === 1) { const p = parts.get(highlighted[0]); info.querySelector('b').textContent = p.label; info.querySelector('p').textContent = p.info || ''; info.classList.toggle('on', !!p.info); } else info.classList.remove('on'); return highlighted.length ? 'hervorgehoben: ' + highlighted.join(', ') : 'Hervorhebung aufgehoben'; },
    focus(a = {}) { const ids = resolveIds(a.ziel); focus(ids); return 'fokussiert'; },
    select(a = {}) { select(resolveIds(a.ziel)[0] || null); return 'ok'; },
    explode(a = {}) { explodeTarget = a.an === false ? 0 : clamp(a.stärke ?? a.staerke ?? 1, 0, 2); syncButtons(); setTimeout(() => frame(900), 50); return explodeTarget ? 'zerlegt' : 'zusammengesetzt'; },
    xray(a = {}) { xray = a.an !== false; applyLook(); syncButtons(); return xray ? 'Röntgen an' : 'Röntgen aus'; },
    transparent(a = {}) { for (const id of resolveIds(a.ziel)) for (const m of parts.get(id).mats) { m.userData.base.opacity = a.an === false ? 1 : 0.25; m.userData.base.transparent = a.an !== false; m.userData.base.depthWrite = a.an === false; } applyLook(); return 'ok'; },
    show(a = {}) { for (const id of resolveIds(a.ziel)) parts.get(id).obj.visible = a.an !== false; return 'ok'; },
    play() { tl.playing = true; tl.stepTarget = null; syncButtons(); return 'läuft'; },
    pause() { tl.playing = false; syncButtons(); return 'pausiert'; },
    step() { if (tl.phases.length) { const i = phaseAt(tl.t); const next = tl.phases[(i + 1) % tl.phases.length]; tl.stepTarget = next.to - 1e-6; if ((i + 1) % tl.phases.length === 0) tl.t = 0; tl.playing = true; } else { tl.t += tl.duration / 8; } syncButtons(); return 'nächster Schritt'; },
    phase(a = {}) { const i = clamp((a.nr ?? 1) - 1, 0, tl.phases.length - 1); const p = tl.phases[i]; if (!p) throw new Error('keine Phasen'); tl.t = p.from + 1e-4; tl.stepTarget = a.abspielen === false ? null : p.to - 1e-6; tl.playing = a.abspielen !== false; syncButtons(); return 'Phase ' + (i + 1) + ': ' + p.name; },
    speed(a = {}) { tl.speed = clamp(+a.wert || 1, 0.05, 8); syncButtons(); return 'Tempo ' + tl.speed; },
    set(a = {}) { const p = params[a.name ?? a.parameter]; if (!p) throw new Error('Parameter unbekannt. Vorhanden: ' + Object.keys(params).join(', ')); p.set(clamp(+a.wert, p.min, p.max)); return p.label + ' = ' + p.value; },
    view(a = {}) { const v = VIEWS[a.richtung || a.ansicht || 'iso']; if (!v) throw new Error('Ansichten: ' + Object.keys(VIEWS).join(', ')); viewDir = new THREE.Vector3(...v).normalize(); frame(900); return 'Ansicht ' + (a.richtung || a.ansicht); },
    zoom(a = {}) { const f = +a.faktor || 1.5; const d = camera.position.clone().sub(controls.target); tweenCam(controls.target.clone().add(d.multiplyScalar(1 / f)), controls.target.clone(), 700); return 'ok'; },
    // 5.2: immediate camera moves for hand gestures (no tween; called many times per second)
    orbit(a = {}) { const off = camera.position.clone().sub(controls.target); const sp = new THREE.Spherical().setFromVector3(off); sp.theta -= +a.dx || 0; sp.phi = clamp(sp.phi - (+a.dy || 0), 0.15, Math.PI - 0.15); off.setFromSpherical(sp); camera.position.copy(controls.target).add(off); controls.autoRotate = false; return 'ok'; },
    dolly(a = {}) { const f = clamp(+a.faktor || 1, 0.5, 2); const off = camera.position.clone().sub(controls.target); const d = clamp(off.length() / f, 0.05, 500); camera.position.copy(controls.target).add(off.setLength(d)); return 'ok'; },
    rotate(a = {}) { controls.autoRotate = a.an !== false; controls.autoRotateSpeed = a.tempo || 1.5; return 'ok'; },
    labels(a = {}) { labelsAll = a.an !== false; bL.classList.toggle('on', labelsAll); syncLabels(); return 'ok'; },
    reset() { highlighted = []; selected = null; xray = false; explodeTarget = 0; info.classList.remove('on'); viewDir = new THREE.Vector3(1, 0.6, 1.25).normalize(); applyLook(); syncLabels(); syncButtons(); frame(900); return 'zurückgesetzt'; },
    state() { return JSON.stringify(stateSummary()); },
    fps() { return String(Math.round(fps)); },
  };
  // German aliases
  Object.assign(cmd, { hervorheben: cmd.highlight, fokus: cmd.focus, zerlegen: cmd.explode, explosion: cmd.explode, röntgen: cmd.xray, abspielen: cmd.play, pausieren: cmd.pause, schritt: cmd.step, takt: cmd.phase, tempo: cmd.speed, parameter: cmd.set, ansicht: cmd.view, drehen: cmd.rotate });

  /* ---------- bridge to JARVIS ---------- */
  function send(d) { parent.postMessage({ jarvisEvent: d }, '*'); }
  addEventListener('message', async (e) => {
    const m = e.data || {}; if (!m.jarvisAction) return;
    const reply = (ok, result) => parent.postMessage({ jarvisReply: m.rid, ok, result: typeof result === 'string' ? result : JSON.stringify(result) }, '*');
    try {
      if (m.jarvisAction === 'patch') { const fn = new (Object.getPrototypeOf(async function () {}).constructor)('jv', m.args.code); window.THREE = THREE; await fn(api); stats(); frame(800); return reply(true, 'Szene geändert · ' + JSON.stringify(stateSummary())); }
      if (m.jarvisAction === 'snapshot') return reply(true, await snapshot(m.args?.size || 640));
      const f = commands[m.jarvisAction] || cmd[m.jarvisAction];
      if (!f) throw new Error('Unbekannter Befehl. Verfügbar: ' + [...Object.keys(commands), ...Object.keys(cmd)].join(', '));
      reply(true, (await f(m.args || {})) ?? 'ok');
    } catch (err) { reply(false, String(err.message || err)); }
  });

  /* ---------- quality / validation ---------- */
  function stats() {
    let tris = 0, meshes = 0; const matsSet = new Set();
    root.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => matsSet.add(m.uuid)); } });
    return { anzahl_teile: parts.size, meshes, dreiecke: Math.round(tris), materialien: matsSet.size };
  }
  function stateSummary() {
    return { teile: [...parts.values()].filter((p) => p.selectable).map((p) => p.id), befehle: [...new Set([...Object.keys(commands), 'highlight', 'focus', 'explode', 'xray', 'transparent', 'play', 'pause', 'step', 'phase', 'speed', 'set', 'view', 'zoom', 'orbit', 'dolly', 'reset', 'patch'])], phasen: tl.phases.map((p) => p.name), parameter: Object.keys(params), animiert: hasMotion(), hervorgehoben: highlighted };
  }
  async function snapshot(size = 640) {
    composer.render(); // render then read immediately (same task)
    const src = renderer.domElement; const c = document.createElement('canvas');
    const s = size / Math.max(src.width, src.height); c.width = Math.round(src.width * s); c.height = Math.round(src.height * s);
    const g = c.getContext('2d'); g.fillStyle = '#04101a'; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8);
  }
  /** what the viewer actually SEES: coverage, tiny/occluded parts, exposure */
  function visibility() {
    const out = { warnungen: [] }; const W0 = innerWidth, H0 = innerHeight; camera.updateMatrixWorld();
    const pts = (b) => [0, 1].flatMap((i) => [0, 1].flatMap((j) => [0, 1].map((k) => new THREE.Vector3(i ? b.max.x : b.min.x, j ? b.max.y : b.min.y, k ? b.max.z : b.min.z).project(camera))));
    const area = (b) => { if (b.isEmpty()) return 0; const p = pts(b); const xs = p.map((v) => (v.x + 1) / 2 * W0), ys = p.map((v) => (1 - v.y) / 2 * H0);
      const w = Math.min(W0, Math.max(...xs)) - Math.max(0, Math.min(...xs)), h = Math.min(H0, Math.max(...ys)) - Math.max(0, Math.min(...ys)); return Math.max(0, w) * Math.max(0, h); };
    const cover = area(new THREE.Box3().setFromObject(root)) / (W0 * H0); out.bildfüllung = Math.round(cover * 100) + ' %';
    if (cover < 0.12) out.warnungen.push(`Modell füllt nur ${Math.round(cover * 100)} % der Ansicht – zu klein/zu weit weg.`);
    const tiny = [], hidden = []; const rc = new THREE.Raycaster();
    for (const p of parts.values()) { if (!p.selectable || !p.obj.visible) continue; const b = new THREE.Box3().setFromObject(p.obj); const a = area(b);
      if (a < 64) tiny.push(p.label);
      const c = b.getCenter(new THREE.Vector3()); rc.set(camera.position, c.clone().sub(camera.position).normalize());
      const hit = rc.intersectObjects(root.children, true).find((h) => (h.object.material?.opacity ?? 1) > 0.6 && h.object.visible);
      if (hit) { let o = hit.object; while (o && !o.userData.jvPart) o = o.parent; if (o && o.userData.jvPart !== p.id && hit.distance < camera.position.distanceTo(c) - 0.05) { let q = p.obj; let inside = false; while (q) { if (q === o) inside = true; q = q.parent; } if (!inside) hidden.push(p.label); } } }
    if (tiny.length) out.warnungen.push(`Kaum sichtbar (< 8 px): ${tiny.slice(0, 8).join(', ')}`);
    if (hidden.length > Math.max(2, parts.size * 0.4)) out.warnungen.push(`Viele Bauteile verdeckt (${hidden.length}): ${hidden.slice(0, 6).join(', ')} – Schnittansicht, Transparenz oder andere Blickrichtung nutzen.`);
    out.verdeckt = hidden.length; out.winzig = tiny.length;
    return out;
  }
  function exposure() {
    try { composer.render(); const src = renderer.domElement, c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#04101a'; g.fillRect(0, 0, 64, 64); g.drawImage(src, 0, 0, 64, 64);
      const d = g.getImageData(0, 0, 64, 64).data; let L = 0, hi = 0; for (let i = 0; i < d.length; i += 4) { const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255; L += l; if (l > 0.96) hi++; }
      return { helligkeit: +(L / 4096).toFixed(2), überbelichtet: +(hi / 4096).toFixed(2) }; } catch { return null; }
  }
  function quality() {
    const s = stats(); const w = [...warnings];
    const vis = visibility(); w.push(...vis.warnungen); const ex = exposure();
    if (ex && ex.helligkeit < 0.06) w.push(`Bild sehr dunkel (Helligkeit ${ex.helligkeit}) – Licht verstärken oder hellere Materialien.`);
    if (ex && ex.überbelichtet > 0.25) w.push('Grosse Flächen überbelichtet – Glow/Emissive reduzieren.');
    Object.assign(s, { bildfüllung: vis.bildfüllung, verdeckt: vis.verdeckt, winzig: vis.winzig, helligkeit: ex?.helligkeit });
    if (s.anzahl_teile < 5) w.push(`Nur ${s.anzahl_teile} registrierte Bauteile – für eine fachliche Erklärung zu wenig.`);
    if (s.dreiecke < 2500) w.push(`Nur ${s.dreiecke} Dreiecke – die Geometrie ist sehr grob.`);
    if (s.materialien < 3) w.push('Kaum unterschiedliche Materialien – Bauteile sind schwer unterscheidbar.');
    const unlabeled = [...parts.values()].filter((p) => p.selectable && !p.info).length;
    if (unlabeled > parts.size * 0.5) w.push(`${unlabeled} Bauteile ohne info-Text – Auswahl erklärt nichts.`);
    return { ...s, warnungen: w };
  }

  /* ---------- loop + adaptive quality ---------- */
  let W = 0, H = 0, frames = 0, fpsT = performance.now(), fps = 60, lowStreak = 0;
  function resize() { W = innerWidth; H = innerHeight; renderer.setSize(W, H, false); composer.setSize(W, H); bloom.resolution.set(W / 2, H / 2); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  const clock = new THREE.Clock(); let elapsed = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (tl.playing) {
      const prev = tl.t;
      tl.t += (dt * tl.speed);
      if (tl.stepTarget != null && tl.t >= tl.stepTarget) { tl.t = tl.stepTarget; tl.playing = false; tl.stepTarget = null; syncButtons(); }
      if (tl.t >= tl.duration) tl.t = tl.loop ? tl.t % tl.duration : tl.duration;
      elapsed += dt * tl.speed;
      if (prev > tl.t) lastPhase = -1;
    }
    const ph = phaseAt(tl.t);
    if (ph !== lastPhase) { lastPhase = ph; [...phasesEl.children].forEach((e, i) => e.classList.toggle('on', i === ph)); phInfo.textContent = tl.phases[ph]?.info || ''; if (ph >= 0) { tl.onPhase?.(ph, tl.phases[ph]); send({ typ: 'phase', nr: ph + 1, name: tl.phases[ph].name }); } }
    const state = { t: tl.t, u: tl.t / tl.duration, phase: ph, playing: tl.playing, elapsed, params: Object.fromEntries(Object.entries(params).map(([k, p]) => [k, p.value])) };
    for (const f of tickers) { try { f(dt * (tl.playing ? tl.speed : 0), state); } catch (err) { if (!warnings.includes(String(err))) { warnings.push(String(err)); parent.postMessage({ jarvisError: 'tick: ' + err }, '*'); } } }
    // explode
    explodeAmt += (explodeTarget - explodeAmt) * 0.1;
    for (const p of parts.values()) if (p.wrap) p.wrap.position.copy(p.explode).multiplyScalar(explodeAmt);
    for (const t of [...tw]) if (t.f(now)) tw.splice(tw.indexOf(t), 1);
    controls.update();
    if (highlighted.length || selected) { const k = 0.4 + Math.sin(now / 220) * 0.25; for (const id of [...highlighted, selected].filter(Boolean)) for (const m of parts.get(id)?.mats || []) if (m.emissive) m.emissiveIntensity = k; }
    placeLabels();
    bloom.enabled ? composer.render() : renderer.render(scene, camera);
    // adaptive quality: drop pixel ratio / bloom / shadows if slow
    frames++; if (now - fpsT > 1000) { fps = frames * 1000 / (now - fpsT); frames = 0; fpsT = now;
      if (fps < 32) { if (++lowStreak >= 2) { lowStreak = 0; const pr = renderer.getPixelRatio(); if (pr > 1) { renderer.setPixelRatio(Math.max(1, pr - 0.5)); resize(); } else if (bloom.enabled) bloom.enabled = false; else renderer.shadowMap.enabled = false; } } else lowStreak = 0; }
  }

  const api = {
    THREE, scene, camera, renderer, controls, root, key, rim,
    material, mat: material, geo, kin, part, assembly, get, parts, timeline, tl, param, params,
    onTick: (f) => { tickers.push(f); syncButtons(); },
    command: (name, f) => { commands[name] = f; },
    send, frame, focus, select, warn: (w) => warnings.push(w),
    setView: (d) => { viewDir = new THREE.Vector3(...d).normalize(); },
    setTitle: (t) => (titleB.textContent = t), setSource: (s, simplified) => { kindB.textContent = s; kindB.classList.toggle('warn', !!simplified); },
    /** load a glTF/GLB model; children become selectable parts (by mesh name) */
    async loadModel(url, { scale = null, partsFromMeshes = true, info = {}, labels = {} } = {}) {
      const gltf = await new GLTFLoader().loadAsync(url);
      const m = gltf.scene;
      if (scale) m.scale.setScalar(scale); else { const b = new THREE.Box3().setFromObject(m); const s = 2 / (b.getSize(new THREE.Vector3()).length() || 1); m.scale.setScalar(s); }
      part('modell', m, null, { label: 'Modell', selectable: false });
      if (partsFromMeshes) { let n = 0; m.traverse((o) => { if (o.isMesh && n < 200) { n++; const id = o.name || 'teil' + n; if (!parts.has(id)) { const mats = (Array.isArray(o.material) ? o.material : [o.material]); mats.forEach((x) => (x.userData.base ??= { opacity: x.opacity, transparent: x.transparent, emissive: x.emissive?.clone(), ei: x.emissiveIntensity, depthWrite: x.depthWrite })); o.userData.jvPart = id; parts.set(id, { id, obj: o, wrap: null, label: labels[id] || id, info: info[id] || '', explode: null, mats, selectable: true }); o.castShadow = o.receiveShadow = true; } } }); }
      if (gltf.animations?.length) { const mixer = new THREE.AnimationMixer(m); gltf.animations.forEach((c) => mixer.clipAction(c).play()); api.onTick((dt) => mixer.update(dt)); }
      return m;
    },
    /** molecule with CPK colours/radii: atoms [{el:'C', pos:[x,y,z], id?}], bonds [[i,j,order]] */
    molecule({ atoms = [], bonds = [], scale = 1, id = 'molekül', label = 'Molekül' } = {}) {
      const CPK = { H: ['#f2f2f2', 0.31], C: ['#3a3a3a', 0.6], N: ['#3050f8', 0.56], O: ['#ff0d0d', 0.55], F: ['#90e050', 0.5], P: ['#ff8000', 0.75], S: ['#ffff30', 0.75], Cl: ['#1ff01f', 0.7], Na: ['#ab5cf2', 0.9], K: ['#8f40d4', 1.0], Ca: ['#3dff00', 0.9], Fe: ['#e06633', 0.85], Mg: ['#8aff00', 0.8] };
      const g = assembly(id, { label, selectable: false });
      const P = atoms.map((a) => new THREE.Vector3(...a.pos).multiplyScalar(scale));
      atoms.forEach((a, i) => { const [c, r] = CPK[a.el] || ['#ff69b4', 0.6]; part(a.id || `${a.el}${i + 1}`, geo.sphere(r * 0.5 * scale, 32), material('plastic', { color: c, roughness: 0.25, clearcoat: 1 }), { parent: g, pos: P[i].toArray(), label: a.label || a.el, info: a.info || `${a.el}-Atom`, group: a.el }); });
      bonds.forEach(([i, j, o = 1]) => { const A = P[i], B = P[j]; if (!A || !B) return; const d = B.clone().sub(A), L = d.length(); const side = new THREE.Vector3(0, 0, 1).cross(d).normalize().multiplyScalar(0.07 * scale);
        for (let k = 0; k < o; k++) { const off = side.clone().multiplyScalar(k - (o - 1) / 2); const m = new THREE.Mesh(geo.cylinder(0.05 * scale, 0.05 * scale, L, 12), material('plastic', { color: '#b8c4cc' })); m.position.copy(A.clone().add(B).multiplyScalar(0.5).add(off)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); g.add(m); } });
      return g;
    },
    /** procedural canvas texture for planets/surfaces: base colour, bands, craters, clouds */
    planetTexture({ base = '#c9a26b', bands = [], craters = 0, clouds = 0, size = 512, seed = 1 } = {}) {
      const c = document.createElement('canvas'); c.width = size; c.height = size / 2; const x = c.getContext('2d');
      x.fillStyle = base; x.fillRect(0, 0, c.width, c.height);
      let s0 = seed; const rnd = () => ((s0 = (s0 * 16807) % 2147483647) / 2147483647);
      bands.forEach((b, i) => { x.fillStyle = b; const y = (i + rnd() * 0.5) / bands.length * c.height; x.globalAlpha = 0.55; x.fillRect(0, y, c.width, c.height / bands.length * (0.4 + rnd())); });
      x.globalAlpha = 1;
      for (let i = 0; i < craters; i++) { const r = 2 + rnd() * size / 40; x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.arc(rnd() * c.width, rnd() * c.height, r, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.arc(rnd() * c.width - r * 0.2, rnd() * c.height - r * 0.2, r * 0.7, 0, 7); x.fill(); }
      for (let i = 0; i < clouds; i++) { x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(rnd() * c.width, rnd() * c.height, 10 + rnd() * 50, 4 + rnd() * 10, 0, 0, 7); x.fill(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    },
    /** 'labor' (default), 'weltraum' (stars, no floor, sun light), 'neutral' (no grid) */
    setEnvironment(kind = 'labor') {
      ground.visible = grid.visible = kind === 'labor';
      if (kind === 'weltraum') {
        const N = 2500, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(80 + Math.random() * 120); pos.set(v.toArray(), i * 3); }
        const st = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: 0xcfefff, size: 0.35, sizeAttenuation: true, transparent: true, opacity: 0.85 }));
        scene.add(st); scene.environmentIntensity = 0.15; hemi.intensity = 0.05; key.intensity = 0.2; rim.intensity = 0.15; fill.intensity = 0;
      }
    },
    /** animated node–edge graph (program structure, data flow, processes, networks) */
    flowGraph({ nodes = [], edges = [], layout = 'layered', flow = true } = {}) {
      const g = assembly('graph', { selectable: false });
      const pos = {}; const layers = {};
      if (layout === 'layered') {
        const indeg = Object.fromEntries(nodes.map((n) => [n.id, 0])); edges.forEach((e) => indeg[e.to] !== undefined && indeg[e.to]++);
        const lvl = {}; const q = nodes.filter((n) => !indeg[n.id]).map((n) => n.id); q.forEach((id) => (lvl[id] = 0));
        for (let i = 0; i < q.length; i++) { const id = q[i]; edges.filter((e) => e.from === id).forEach((e) => { if (lvl[e.to] === undefined || lvl[e.to] < lvl[id] + 1) { lvl[e.to] = lvl[id] + 1; if (lvl[e.to] < nodes.length) q.push(e.to); } }); }
        nodes.forEach((n) => { const L = lvl[n.id] ?? 0; (layers[L] ||= []).push(n.id); });
        Object.entries(layers).forEach(([L, ids]) => ids.forEach((id, i) => (pos[id] = new THREE.Vector3((i - (ids.length - 1) / 2) * 1.6, -L * 1.3, (i % 2) * 0.4))));
      } else nodes.forEach((n, i) => { const a = (i / nodes.length) * Math.PI * 2; pos[n.id] = new THREE.Vector3(Math.cos(a) * 2.5, Math.sin(i * 1.7) * 0.6, Math.sin(a) * 2.5); });
      const colors = ['#2de2ff', '#ffb02e', '#3dffa8', '#ff6bd5', '#a78bfa'];
      const groups = [...new Set(nodes.map((n) => n.group || ''))];
      nodes.forEach((n) => {
        const col = n.color || colors[groups.indexOf(n.group || '') % colors.length];
        const mesh = new THREE.Mesh(geo.box(1.25, 0.5, 0.18, 0.06), material('plastic', { color: '#0b2233', emissive: col, emissiveIntensity: 0.35, metalness: 0.2 }));
        part(n.id, mesh, null, { parent: g, label: n.label || n.id, info: n.info || '', pos: pos[n.id].toArray() });
      });
      const packets = [];
      edges.forEach((e, i) => {
        const a = pos[e.from], b = pos[e.to]; if (!a || !b) return;
        const mid = a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, 0, 0.6));
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.018, 8), material('holo', { opacity: 0.5 })));
        if (flow) for (let k = 0; k < 2; k++) { const p = new THREE.Mesh(geo.sphere(0.05, 12), material('glow')); g.add(p); packets.push({ p, curve, o: k / 2 + i * 0.13 }); }
      });
      api.onTick((dt, s) => packets.forEach((q) => q.p.position.copy(q.curve.getPoint((s.elapsed * 0.35 + q.o) % 1))));
      return g;
    },
    /** simple particle system: emit(i) -> {pos:[x,y,z], vel:[...], life} ; update returns false to respawn */
    particles({ count = 300, size = 0.04, color = '#7ff3ff', additive = true, emit, update } = {}) {
      const posArr = new Float32Array(count * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      const m = new THREE.PointsMaterial({ size, color, transparent: true, opacity: 0.9, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true });
      const pts = new THREE.Points(g, m); root.add(pts);
      const st = Array.from({ length: count }, (_, i) => ({ ...emit(i, true), age: Math.random() }));
      api.onTick((dt, s) => { st.forEach((p, i) => { p.age += dt; const alive = update ? update(p, dt, s) : true; if (!alive || p.age > (p.life || 2)) Object.assign(p, emit(i, false), { age: 0 }); if (p.vel) { p.pos[0] += p.vel[0] * dt; p.pos[1] += p.vel[1] * dt; p.pos[2] += p.vel[2] * dt; } posArr.set(p.pos, i * 3); }); g.attributes.position.needsUpdate = true; });
      return pts;
    },
    stats, quality, snapshot, stateSummary,
    /** call when the scene is built: frames camera, validates, reports to JARVIS */
    async ready() {
      syncButtons(); await frame(10);
      await new Promise((r) => setTimeout(r, 400));
      const q = quality();
      parent.postMessage({ jarvisReady: { ...q, ...stateSummary(), quelle: kindB.textContent, fps: Math.round(fps) } }, '*');
      return q;
    },
    fail(err) { parent.postMessage({ jarvisError: String(err?.stack || err) }, '*'); const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:auto 10px 70px;color:#ff9aa4;font:600 13px Rajdhani'; d.textContent = '⚠ ' + err; document.body.append(d); },
    get fps() { return fps; },
  };
  requestAnimationFrame(loop);
  return api;
}
