import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export function createHUD(canvas, anchorEl) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x02060c, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x02060c, 0.06);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const color = new THREE.Color(0x2de2ff);
  const target = new THREE.Color(0x2de2ff);
  const uni = { uTime: { value: 0 }, uColor: { value: color }, uLevel: { value: 0 } };

  const root = new THREE.Group();          // positioned over the #core element
  scene.add(root);
  const reactor = new THREE.Group();
  root.add(reactor);

  /* ---------- energy core (fresnel shader) ---------- */
  const coreMat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime; uniform float uLevel;
      varying vec3 vN; varying vec3 vV; varying float vD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
      void main(){
        vec3 p = position;
        float d = sin(p.x*6.0+uTime*2.1)*sin(p.y*7.0-uTime*1.7)*sin(p.z*5.0+uTime*1.3);
        p += normal * d * (0.04 + uLevel*0.16);
        vD = d;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uLevel; uniform float uTime;
      varying vec3 vN; varying vec3 vV; varying float vD;
      void main(){
        float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.2);
        vec3 c = mix(uColor, vec3(1.0), 0.25 + vD*0.4);
        float a = f*1.1 + 0.05 + uLevel*0.25;
        gl_FragColor = vec4(c * a, a);
      }`
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 24), coreMat);
  reactor.add(core);
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 32), new THREE.MeshBasicMaterial({ color: 0xbff8ff }));
  reactor.add(heart);

  /* ---------- geodesic shells ---------- */
  const tinted = [];   // 5.2: materials copy colours on creation → keep them following the live colour
  const tint = (m) => (tinted.push(m), m);
  const lineMat = (o) => tint(new THREE.LineBasicMaterial({ color, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false }));
  const shell1 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.0, 1)), lineMat(0.35));
  const shell2 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.32, 0)), lineMat(0.28));
  reactor.add(shell1, shell2);
  const vertsGeo = new THREE.IcosahedronGeometry(1.0, 1);
  const nodes = new THREE.Points(vertsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  shell1.add(nodes);

  /* ---------- orbital rings ---------- */
  const basic = (o) => tint(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  const rings = [];
  function segRing(r, w, n, gap, o, tiltX, tiltY, speed) {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const len = (Math.PI * 2) / n - gap;
      const m = new THREE.Mesh(new THREE.RingGeometry(r, r + w, 64, 1, (i * Math.PI * 2) / n, len), basic(o));
      g.add(m);
    }
    g.rotation.set(tiltX, tiltY, 0);
    g.userData.speed = speed;
    root.add(g); rings.push(g); return g;
  }
  segRing(1.62, 0.035, 3, 0.45, 0.9, 1.25, 0.2, 0.35);
  segRing(1.78, 0.012, 1, 0.0, 0.45, -1.1, 0.5, -0.2);
  segRing(1.95, 0.05, 24, 0.07, 0.4, Math.PI / 2, 0, 0.5);
  segRing(2.2, 0.02, 2, 1.6, 0.85, 0.4, -0.9, -0.8);

  // tick ring (instanced)
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.09, 0.012), basic(0.5), 180);
  const dm = new THREE.Object3D();
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2, long = i % 15 === 0;
    dm.position.set(Math.cos(a) * 2.45, Math.sin(a) * 2.45, 0);
    dm.rotation.z = a + Math.PI / 2; dm.scale.set(1, long ? 2.2 : 1, 1); dm.updateMatrix();
    ticks.setMatrixAt(i, dm.matrix);
  }
  const tickGroup = new THREE.Group(); tickGroup.add(ticks); tickGroup.rotation.x = Math.PI / 2 - 0.55;
  root.add(tickGroup);

  /* ---------- audio waveform ring ---------- */
  const WN = 256;
  const wavePos = new Float32Array(WN * 3);
  const waveGeo = new THREE.BufferGeometry(); waveGeo.setAttribute('position', new THREE.BufferAttribute(wavePos, 3));
  const wave = new THREE.LineLoop(waveGeo, lineMat(0.95));
  reactor.add(wave);

  /* ---------- particle nebula ---------- */
  const PN = 2600;
  const pPos = new Float32Array(PN * 3), pSeed = new Float32Array(PN);
  for (let i = 0; i < PN; i++) {
    const r = 2.6 + Math.pow(Math.random(), 1.5) * 9;
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pPos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.75, r * Math.cos(ph)], i * 3);
    pSeed[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('seed', new THREE.BufferAttribute(pSeed, 1));
  const pMat = new THREE.ShaderMaterial({
    uniforms: { ...uni, uPR: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float seed; uniform float uTime; uniform float uLevel; uniform float uPR; varying float vA;
      void main(){
        vec3 p = position;
        float r = length(p);
        p *= 1.0 + sin(uTime*0.8 + seed*30.0)*0.015 + uLevel*0.06*(1.0/(r*0.3));
        vec4 mv = modelViewMatrix*vec4(p,1.0);
        gl_PointSize = (1.2 + seed*2.6) * uPR * (9.0 / -mv.z);
        vA = 0.25 + 0.75*abs(sin(uTime*(0.4+seed) + seed*20.0));
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vA;
      void main(){ float d = length(gl_PointCoord-0.5); if(d>0.5) discard; float a = smoothstep(0.5,0.0,d)*vA; gl_FragColor = vec4(mix(uColor,vec3(1.0),0.2)*a*0.8, a); }`
  });
  const nebula = new THREE.Points(pGeo, pMat);
  scene.add(nebula);

  /* ---------- holo floor grid ---------- */
  const grid = new THREE.PolarGridHelper(7, 24, 10, 96, 0xffffff, 0xffffff); tint(grid.material);   // white vertex colours × live tint
  grid.material.transparent = true; grid.material.opacity = 0.16; grid.material.blending = THREE.AdditiveBlending; grid.material.depthWrite = false;
  grid.position.y = -2.9;
  // floor grid removed (edge-on glare)

  /* ---------- post processing ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.45, 0.12);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- layout: keep reactor over the anchor element ---------- */
  let W = 0, H = 0;
  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    composer.setPixelRatio(dpr); composer.setSize(W, H);
    bloom.resolution.set(W / 2, H / 2);
    pMat.uniforms.uPR.value = dpr;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    const r = anchorEl.getBoundingClientRect();
    const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const cy = r.top + r.height / 2;
    root.position.y = (0.5 - cy / H) * visH;
    root.position.x = ((r.left + r.width / 2) / W - 0.5) * visH * (W / H);
    const s = Math.min((r.height / H) * visH, (r.width / H) * visH * 0.95) / 5.6;
    root.scale.setScalar(s);
  }
  new ResizeObserver(layout).observe(canvas);
  new ResizeObserver(layout).observe(anchorEl);
  new MutationObserver(() => { let n = 0; const f = () => { layout(); if (++n < 40) requestAnimationFrame(f); }; f(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  layout();

  /* ---------- parallax (touch + gyro) ---------- */
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { par.tx = (e.clientX / innerWidth - 0.5) * 1.2; par.ty = (e.clientY / innerHeight - 0.5) * 1.0; }, { passive: true });
  addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    par.tx = THREE.MathUtils.clamp(e.gamma / 30, -1, 1) * 1.1;
    par.ty = THREE.MathUtils.clamp((e.beta - 45) / 40, -1, 1) * 0.9;
  }, { passive: true });

  /* ---------- state ---------- */
  const modes = {
    idle: { c: 0x2de2ff, spin: 1, lvl: 0.08 }, wake: { c: 0x1fb5ff, spin: 0.7, lvl: 0.05 },
    listen: { c: 0x3dffa8, spin: 1.6, lvl: 0.4 }, think: { c: 0xffb02e, spin: 4.5, lvl: 0.35 },
    speak: { c: 0x7ff3ff, spin: 1.8, lvl: 0.6 }, error: { c: 0xff3b4e, spin: 0.4, lvl: 0.1 },
    music: { c: 0xc06bff, spin: 1.3, lvl: 0.5 }, build: { c: 0xff6bd5, spin: 3, lvl: 0.45 },
  };
  let mode = modes.idle, spin = 1, level = 0, extLevel = 0, running = true, last = performance.now(), t = 0, burst = 0;

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    color.lerp(target, 0.06); for (const m of tinted) m.color.copy(color);
    spin += (mode.spin - spin) * 0.05;
    let tl = mode.lvl;
    if (mode === modes.speak || mode === modes.music) tl = mode.lvl * (0.55 + 0.45 * Math.abs(Math.sin(t * 9) * Math.sin(t * 3.7 + 1)) + Math.random() * 0.15);
    if (mode === modes.listen) tl = 0.25 + Math.random() * 0.35;
    tl = Math.max(tl, extLevel);
    level += (tl - level) * 0.18;
    burst *= 0.93;
    uni.uTime.value = t; uni.uLevel.value = level + burst;

    reactor.rotation.y += dt * 0.25 * spin;
    shell1.rotation.x += dt * 0.15 * spin; shell1.rotation.z -= dt * 0.1 * spin;
    shell2.rotation.y -= dt * 0.22 * spin; shell2.rotation.x += dt * 0.06;
    rings.forEach((g, i) => { g.rotateZ(dt * g.userData.speed * spin); });
    tickGroup.rotation.z += dt * 0.05 * spin;
    nebula.rotation.y += dt * 0.012 * (1 + spin * 0.3);
    heart.scale.setScalar(1 + level * 0.6 + burst + Math.sin(t * 3) * 0.04);
    core.scale.setScalar(1 + burst * 0.4);

    for (let i = 0; i < WN; i++) {
      const a = (i / WN) * Math.PI * 2;
      const n = Math.sin(a * 6 + t * 4.5) * 0.5 + Math.sin(a * 13 - t * 7) * 0.35 + Math.sin(a * 3 + t * 2) * 0.15;
      const r = 1.12 + n * (0.03 + level * 0.28);
      wavePos[i * 3] = Math.cos(a) * r; wavePos[i * 3 + 1] = Math.sin(a) * r; wavePos[i * 3 + 2] = 0;
    }
    waveGeo.attributes.position.needsUpdate = true;
    wave.lookAt(camera.position);

    par.x += (par.tx - par.x) * 0.05; par.y += (par.ty - par.y) * 0.05;
    camera.position.x = par.x * 1.4; camera.position.y = -par.y * 1.1;
    camera.lookAt(0, 0, 0);
    bloom.strength = 0.6 + level * 0.5 + burst * 0.6;
    composer.render(dt);
  }
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    running = document.visibilityState === 'visible';
    if (running) { last = performance.now(); requestAnimationFrame(frame); }
  });

  // 5.2: colour themes (holo = cyan, warm = amber/orange like the reference videos)
  const PALETTES = { holo: { idle: 0x2de2ff, wake: 0x1fb5ff, speak: 0x7ff3ff, think: 0xffb02e }, warm: { idle: 0xff8a3d, wake: 0xff6a1f, speak: 0xffc27a, think: 0xffe08a } };
  let curName = 'idle';
  return {
    setMode(name) { curName = name; mode = modes[name] || modes.idle; target.set(mode.c); },
    setPalette(name) { const P = PALETTES[name] || PALETTES.holo; for (const k of Object.keys(P)) modes[k].c = P[k]; mode = modes[curName] || modes.idle; target.set(mode.c); heart.material.color.set(name === 'warm' ? 0xffe2c4 : 0xbff8ff); const bg = name === 'warm' ? 0x070403 : 0x02060c; renderer.setClearColor(bg, 1); scene.fog.color.set(bg); return name; },
    setLevel(v) { extLevel = v; },
    pulse(v = 0.6) { burst = Math.max(burst, v); },
  };
}
