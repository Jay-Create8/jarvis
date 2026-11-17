/* JARVIS Modellbibliothek · Viertakt-Ottomotor (Einzylinder, DOHC, 4 Ventile → hier 2 dargestellt)
   Prozedural erzeugt, kinematisch korrekt:
   - Kurbeltrieb: exakte Kurbel-Schleifen-Gleichung (Kolbenweg, Pleuelwinkel)
   - Nockenwellen drehen mit halber Kurbelwellendrehzahl (Zahnriemen 2:1)
   - Steuerzeiten: Einlass öffnet 10° v. OT, schliesst 40° n. UT; Auslass öffnet 40° v. UT, schliesst 10° n. OT
   - Zündung kurz vor OT des Verdichtungstakts
   Vereinfachungen (gekennzeichnet): ein Zylinder, je 1 Ein-/Auslassventil, keine Schmierung/Kühlung/Einspritzung im Detail. */
export const meta = {
  id: 'viertaktmotor',
  titel: 'Viertakt-Ottomotor',
  quelle: 'BIBLIOTHEK · PROZEDURAL · EINZYLINDER-DOHC (VEREINFACHT)',
  stichworte: ['viertakt', 'motor', 'verbrennungsmotor', 'ottomotor', 'benzinmotor', 'kolben', 'kurbelwelle', 'nockenwelle', 'ventil', 'zylinder', 'auto motor', 'four-stroke', 'engine'],
};

export default async function build(jv, THREE) {
  const { geo, kin, mat, part, assembly } = jv;
  const DEG = Math.PI / 180;
  jv.setTitle('VIERTAKT-OTTOMOTOR');
  jv.setSource(meta.quelle, true);
  jv.setView([0.38, 0.32, 1]); // front cut-away view: crank, rod, piston, valves and ports lie in the XY plane

  // ---- dimensions (1 unit ≈ 4 cm) ----
  const R = 0.45;          // crank radius  → stroke 0.9
  const L = 1.45;          // con-rod length (centre to centre)
  const BORE = 0.6;        // cylinder inner radius
  const PIN_TO_TOP = 0.3;  // piston pin → crown
  const DECK = R + L + PIN_TO_TOP + 0.07; // cylinder head deck (small clearance at TDC)
  const VALVE_TILT = 14 * DEG;
  const VX = 0.27;         // valve seat offset from cylinder axis
  const STEM = 0.95;       // valve stem length
  const LIFT = 0.13;       // max valve lift
  const IN = { open: 710, close: 220 }, EX = { open: 500, close: 10 };

  // ---------------- static structure ----------------
  const block = part('motorblock', geo.box(1.75, DECK + 0.55, 1.5, 0.08), mat('castIron', { opacity: 0.16, transparent: true, depthWrite: false }), {
    pos: [0, (DECK - 0.55) / 2, 0], label: 'Motorblock', info: 'Gehäuse aus Grauguss oder Aluminium. Trägt Zylinder, Kurbelwellenlager und Kühlkanäle.', explode: [0, 0, -1.2],
  });
  block.castShadow = false;
  part('zylinder', geo.tube(BORE + 0.06, BORE, DECK - 0.75, 72), mat('aluminum', { opacity: 0.32, transparent: true, depthWrite: false, side: THREE.DoubleSide }), {
    pos: [0, 0.75 + (DECK - 0.75) / 2, 0], label: 'Zylinder (Laufbuchse)', info: 'Geschliffene Laufbahn, in der der Kolben auf und ab gleitet. Bohrung und Hub bestimmen den Hubraum.', explode: [0, 0, -0.6],
  });
  part('ölwanne', geo.box(1.6, 0.45, 1.35, 0.1), mat('darkSteel', { opacity: 0.4, transparent: true }), { pos: [0, -0.95, 0], label: 'Ölwanne', info: 'Sammelt das Motoröl, das Lager und Kolben schmiert.', explode: [0, -0.8, 0] });

  // cylinder head (with chamber), cam cover
  const head = assembly('zylinderkopf', { pos: [0, DECK, 0], label: 'Zylinderkopf', info: 'Schliesst den Zylinder oben ab. Enthält Brennraum, Ein- und Auslasskanäle, Ventile, Nockenwellen und Zündkerze.', explode: [0, 1.4, 0] });
  const headShell = new THREE.Mesh(geo.box(1.75, 0.75, 1.5, 0.06), mat('aluminum', { opacity: 0.2, transparent: true, depthWrite: false }));
  headShell.position.y = 0.375; head.add(headShell);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(BORE, 48, 16, 0, Math.PI * 2, 0, 0.55), mat('aluminum', { opacity: 0.35, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  dome.scale.set(1, 0.32, 1); dome.position.y = 0.0; head.add(dome);

  // intake / exhaust ports (pipes from valve seats sideways)
  const intakePath = [[-VX, DECK + 0.03, 0], [-VX - 0.18, DECK + 0.28, 0], [-0.75, DECK + 0.48, 0], [-1.25, DECK + 0.58, 0], [-1.75, DECK + 0.6, 0]];
  const exhaustPath = [[VX, DECK + 0.03, 0], [VX + 0.18, DECK + 0.28, 0], [0.75, DECK + 0.46, 0], [1.25, DECK + 0.5, 0], [1.75, DECK + 0.45, 0]];
  part('einlasskanal', geo.pipe(intakePath, 0.13), mat('aluminum', { color: '#5fb6ff', opacity: 0.5, transparent: true, depthWrite: false, side: THREE.DoubleSide }), {
    label: 'Einlasskanal', info: 'Führt das Kraftstoff-Luft-Gemisch zum Einlassventil.', explode: [-0.7, 1.4, 0],
  });
  part('auslasskanal', geo.pipe(exhaustPath, 0.13), mat('copper', { color: '#8a5a3c', opacity: 0.35, transparent: true, depthWrite: false, side: THREE.DoubleSide }), {
    label: 'Auslasskanal', info: 'Leitet die heissen Abgase zum Auspuff.', explode: [0.7, 1.4, 0],
  });

  // ---------------- crankshaft assembly (rotates about Z) ----------------
  const crank = assembly('kurbelwelle', { label: 'Kurbelwelle', info: 'Wandelt die Auf-und-ab-Bewegung des Kolbens über das Pleuel in eine Drehbewegung um. Gegengewichte gleichen die Massen aus.', explode: [0, -0.9, 0] });
  const journal = new THREE.Mesh(geo.cylinder(0.12, 0.12, 2.3, 40), mat('steel')); journal.rotation.x = Math.PI / 2; crank.add(journal);
  const webOutline = [];
  for (let i = 0; i <= 40; i++) { const a = Math.PI + (i / 40) * Math.PI; webOutline.push([Math.cos(a) * 0.62, Math.sin(a) * 0.62 * 0.95]); } // counterweight half-disc (below axis)
  webOutline.push([0.2, R + 0.12], [-0.2, R + 0.12]); // arm up to the crank pin
  for (const z of [-0.3, 0.3]) {
    const web = new THREE.Mesh(geo.extrude(webOutline, 0.16, { bevel: 0.015 }), mat('steel', { color: '#9aa4ab' }));
    web.position.z = z; crank.add(web);
  }
  const crankPin = new THREE.Mesh(geo.cylinder(0.11, 0.11, 0.6, 40), mat('chrome')); crankPin.rotation.x = Math.PI / 2; crankPin.position.y = R; crank.add(crankPin);
  // flywheel with ring gear (rear)
  const fly = part('schwungrad', geo.gear({ teeth: 72, radius: 0.95, width: 0.12, bore: 0.12 }), mat('darkSteel'), { parent: crank, pos: [0, 0, -1.4], label: 'Schwungrad', info: 'Speichert Drehenergie und hält den Motor zwischen den Arbeitstakten in Bewegung. Der Zahnkranz greift beim Starten in den Anlasser.', explode: [0, 0, -1.0] });
  // crank sprocket (front)
  part('kurbelrad', geo.gear({ teeth: 20, radius: 0.24, width: 0.1, bore: 0.05 }), mat('steel'), { parent: crank, pos: [0, 0, -1.1], label: 'Kurbelwellenrad (20 Zähne)', info: 'Treibt über den Zahnriemen die Nockenwellen an.', explode: [0, 0, -0.5] });

  // ---------------- connecting rod ----------------
  const rod = assembly('pleuel', { label: 'Pleuelstange', info: 'Verbindet Kolbenbolzen und Kurbelzapfen. Überträgt die Kraft des Kolbens auf die Kurbelwelle.', explode: [0.9, 0, 0.6] });
  const bigEnd = new THREE.Mesh(geo.tube(0.2, 0.115, 0.18, 48), mat('steel')); bigEnd.rotation.x = Math.PI / 2; rod.add(bigEnd);
  const smallEnd = new THREE.Mesh(geo.tube(0.12, 0.065, 0.16, 40), mat('steel')); smallEnd.rotation.x = Math.PI / 2; smallEnd.position.y = L; rod.add(smallEnd);
  const beam = new THREE.Mesh(geo.extrude([[-0.09, 0.15], [0.09, 0.15], [0.05, L - 0.1], [-0.05, L - 0.1]], 0.12, { bevel: 0.015 }), mat('steel')); rod.add(beam);

  // ---------------- piston ----------------
  const piston = assembly('kolben', { label: 'Kolben', info: 'Wird vom Gasdruck nach unten gedrückt. Dichtet mit den Kolbenringen den Brennraum ab.', explode: [0, 1.1, 0.9] });
  const pistonBody = new THREE.Mesh(geo.lathe([[0, PIN_TO_TOP], [BORE - 0.012, PIN_TO_TOP], [BORE - 0.006, PIN_TO_TOP - 0.03], [BORE - 0.006, -0.32], [BORE - 0.05, -0.34], [BORE - 0.07, -0.1], [0.0, -0.1]], 72), mat('aluminum', { color: '#d4dade' }));
  piston.add(pistonBody);
  for (let i = 0; i < 3; i++) {
    const ring = part('kolbenring' + (i + 1), geo.torus(BORE - 0.006, 0.011, 96), mat('darkSteel'), { parent: piston, pos: [0, PIN_TO_TOP - 0.07 - i * 0.065, 0], rot: [90, 0, 0], label: i < 2 ? `Kompressionsring ${i + 1}` : 'Ölabstreifring', info: i < 2 ? 'Dichtet den Brennraum gegen das Kurbelgehäuse ab.' : 'Streift überschüssiges Öl von der Zylinderwand.', group: 'kolbenringe' });
  }
  part('kolbenbolzen', geo.cylinder(0.065, 0.065, BORE * 1.6, 32), mat('chrome'), { parent: piston, rot: [90, 0, 0], label: 'Kolbenbolzen', info: 'Gelenk zwischen Kolben und Pleuel.' });

  // ---------------- valvetrain ----------------
  function valve(id, side, label, info, matName) {
    const g = assembly(id, { label, info, explode: [side * 0.5, 1.9, 0] });
    const seat = new THREE.Vector3(side * VX, DECK + 0.02, 0);
    g.position.copy(seat); g.rotation.z = -side * VALVE_TILT; // tilt outward at the top
    const v = new THREE.Mesh(geo.lathe([[0, 0], [0.15, 0], [0.155, 0.012], [0.12, 0.03], [0.035, 0.12], [0.025, 0.2], [0.025, STEM], [0, STEM]], 48), mat(matName));
    g.add(v);
    const spring = new THREE.Mesh(geo.spring({ radius: 0.07, wire: 0.012, turns: 7, length: 0.36 }), mat('steel', { color: '#7ab8d8' }));
    spring.position.y = STEM - 0.5; g.add(spring);
    const tappet = new THREE.Mesh(geo.cylinder(0.085, 0.085, 0.1, 40), mat('chrome')); tappet.position.y = STEM + 0.05; g.add(tappet);
    return { g, v, spring, tappet, seat, axis: new THREE.Vector3(Math.sin(side * VALVE_TILT), Math.cos(VALVE_TILT), 0) };
  }
  const vIn = valve('einlassventil', -1, 'Einlassventil', 'Öffnet im Ansaugtakt und lässt Frischgemisch in den Zylinder. Wird von der Einlass-Nockenwelle betätigt.', 'steel');
  const vEx = valve('auslassventil', 1, 'Auslassventil', 'Öffnet im Ausstosstakt, damit der Kolben die Abgase hinausschieben kann. Hitzebeständiger Stahl.', 'darkSteel');

  // camshafts above the tappets (rotate about Z at half crank speed)
  const BASE = 0.1, NOSE = BASE + LIFT;
  // lobe radius matches the lift law exactly: 230° crank opening = 115° cam → half-width 57.5°
  const HALF = 57.5 * DEG;
  const lobe = []; for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2 - Math.PI; const k = Math.abs(a) < HALF ? Math.cos((a / HALF) * Math.PI / 2) ** 1.6 : 0; const r = BASE + (NOSE - BASE) * k; lobe.push([Math.cos(a) * r, Math.sin(a) * r]); }
  function camshaft(id, vd, label, info) {
    const center = vd.seat.clone().add(vd.axis.clone().multiplyScalar(STEM + 0.1 + BASE));
    const g = assembly(id, { pos: center.toArray(), label, info, explode: [Math.sign(vd.seat.x) * 0.4, 2.4, 0] });
    const shaft = new THREE.Mesh(geo.cylinder(0.05, 0.05, 2.3, 24), mat('steel')); shaft.rotation.x = Math.PI / 2; g.add(shaft);
    const l = new THREE.Mesh(geo.extrude(lobe, 0.12, { bevel: 0.01 }), mat('chrome', { color: '#dfe6ea' })); g.add(l);
    part(id + '_rad', geo.gear({ teeth: 40, radius: 0.48, width: 0.1, bore: 0.05 }), mat('steel', { color: '#aab3ba' }), { parent: g, pos: [0, 0, -1.1], label: label.replace('welle', 'wellenrad') + ' (40 Zähne)', info: 'Doppelt so viele Zähne wie das Kurbelwellenrad: Die Nockenwelle dreht nur halb so schnell – eine Umdrehung pro Arbeitsspiel (720° Kurbelwinkel).' });
    return { g, center };
  }
  const camIn = camshaft('nockenwelle_einlass', vIn, 'Einlass-Nockenwelle', 'Ihr Nocken drückt das Einlassventil im richtigen Moment auf. Dreht mit halber Kurbelwellendrehzahl.');
  const camEx = camshaft('nockenwelle_auslass', vEx, 'Auslass-Nockenwelle', 'Öffnet das Auslassventil zum Ausstossen der Abgase. Dreht mit halber Kurbelwellendrehzahl.');

  // timing belt (static path around the three sprockets) + moving teeth markers
  const beltPts = [];
  const arc = (c, r, a0, a1, n = 10) => { for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * (i / n)) * DEG; beltPts.push([c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, -1.1]); } };
  arc({ x: 0, y: 0 }, 0.27, 200, 340);
  arc(camEx.center, 0.51, -40, 90);
  arc(camIn.center, 0.51, 90, 220);
  const beltCurve = new THREE.CatmullRomCurve3(beltPts.map((p) => new THREE.Vector3(...p)), true);
  part('zahnriemen', new THREE.TubeGeometry(beltCurve, 240, 0.025, 8, true), mat('rubber'), { label: 'Zahnriemen', info: 'Koppelt Kurbelwelle und Nockenwellen mechanisch im Verhältnis 2:1 – so bleiben Ventile und Kolben immer synchron.', explode: [0, 0, -0.9] });
  const beltDots = []; for (let i = 0; i < 18; i++) { const d = new THREE.Mesh(geo.sphere(0.03, 10), mat('glow')); jv.root.add(d); beltDots.push(d); }

  // spark plug
  const plug = assembly('zündkerze', { pos: [0, DECK + 0.02, 0], label: 'Zündkerze', info: 'Erzeugt kurz vor dem oberen Totpunkt einen Funken und entzündet das verdichtete Gemisch.', explode: [0, 2.8, 0] });
  plug.add(new THREE.Mesh(geo.lathe([[0.012, -0.04], [0.045, -0.02], [0.05, 0.25], [0.07, 0.27], [0.07, 0.42], [0.05, 0.44], [0.04, 0.95], [0.02, 1.0], [0, 1.0]], 32), mat('ceramic')));
  const thread = new THREE.Mesh(geo.cylinder(0.055, 0.055, 0.22, 24), mat('steel')); thread.position.y = 0.12; plug.add(thread);
  const spark = new THREE.Mesh(geo.sphere(0.06, 16), mat('glow', { emissive: '#bfe9ff', emissiveIntensity: 0 })); spark.position.y = -0.03; plug.add(spark);
  spark.material.transparent = true;

  // ---------------- gas visualisation ----------------
  const flame = new THREE.PointLight('#ff7a1a', 0, 3, 2); flame.position.set(0, DECK - 0.15, 0); jv.root.add(flame);
  const charge = new THREE.Mesh(geo.cylinder(BORE - 0.02, BORE - 0.02, 1, 48, false), new THREE.MeshStandardMaterial({ color: '#4fb3ff', emissive: '#4fb3ff', emissiveIntensity: 0.25, transparent: true, opacity: 0.18, depthWrite: false }));
  jv.root.add(charge);
  const gasCol = { 0: new THREE.Color('#4fb3ff'), 1: new THREE.Color('#7f8cff'), 2: new THREE.Color('#ff7a1a'), 3: new THREE.Color('#a39486') };
  let lifts = { in: 0, ex: 0 }, pistonTop = DECK - 0.2, phaseNow = 0, burn = 0;
  const inCurve = new THREE.CatmullRomCurve3(intakePath.slice().reverse().map((p) => new THREE.Vector3(...p)));
  const exCurve = new THREE.CatmullRomCurve3(exhaustPath.map((p) => new THREE.Vector3(...p)));
  const portFlow = (curve, which, color) => jv.particles({
    count: 70, size: 0.05, color,
    emit: () => ({ s: Math.random(), pos: [0, -99, 0], life: 99, j: [(Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12] }),
    update: (p, dt) => { const l = lifts[which]; if (l < 0.02) { p.pos = [0, -99, 0]; return true; } p.s = (p.s + dt * 0.9 * (0.4 + l)) % 1; const q = curve.getPoint(p.s); p.pos = [q.x + p.j[0], q.y + p.j[1], q.z + p.j[2]]; return true; },
  });
  portFlow(inCurve, 'in', '#6fc6ff');
  portFlow(exCurve, 'ex', '#c9b8a6');
  const gas = jv.particles({
    count: 220, size: 0.045, color: '#7fc8ff',
    emit: () => ({ r: Math.sqrt(Math.random()) * (BORE - 0.06), a: Math.random() * Math.PI * 2, v: Math.random(), pos: [0, 0, 0], life: 99, w: (Math.random() - 0.5) * 2 }),
    update: (p, dt) => { p.a += p.w * dt * (phaseNow === 0 ? 2.5 : 0.8); const y = pistonTop + p.v * (DECK - pistonTop); p.pos = [Math.cos(p.a) * p.r, y, Math.sin(p.a) * p.r]; return true; },
  });

  // ---------------- timeline: 720° crank = one working cycle ----------------
  jv.timeline({
    duration: 8, loop: true,
    phases: [
      { name: 'ANSAUGEN', from: 0, to: 2, info: 'Takt 1 · Kolben geht nach unten, Einlassventil offen: Frisches Kraftstoff-Luft-Gemisch strömt ein.' },
      { name: 'VERDICHTEN', from: 2, to: 4, info: 'Takt 2 · Beide Ventile zu, Kolben geht hoch: Das Gemisch wird stark verdichtet (≈ 1:10) und erwärmt sich.' },
      { name: 'ARBEITEN', from: 4, to: 6, info: 'Takt 3 · Zündfunke kurz vor OT: Das Gemisch verbrennt, der Druck treibt den Kolben nach unten – nur dieser Takt leistet Arbeit.' },
      { name: 'AUSSTOSSEN', from: 6, to: 8, info: 'Takt 4 · Auslassventil offen, Kolben geht hoch und schiebt die Abgase hinaus.' },
    ],
  });
  // belt-driven: camshafts turn in the SAME direction as the crank, at half speed.
  // Phase so the lobe nose points along the valve axis (towards the tappet) at peak lift.
  const peak = (v) => (v.open + ((v.close - v.open + 720) % 720) / 2) % 720;
  const nose = (vd) => Math.atan2(-vd.axis.y, -vd.axis.x);
  const camOffIn = nose(vIn) + (peak(IN) / 2) * DEG;
  const camOffEx = nose(vEx) + (peak(EX) / 2) * DEG;
  const pos = new THREE.Vector3();
  jv.onTick((dt, s) => {
    const deg = (s.t / 8) * 720, th = deg * DEG;
    phaseNow = Math.max(0, s.phase);
    // crank + rod + piston (exact crank-slider)
    crank.rotation.z = -th;
    const k = kin.crankSlider(th, R, L);
    const pinX = R * Math.sin(th), pinY = R * Math.cos(th);
    rod.position.set(pinX, pinY, 0);
    rod.rotation.z = Math.atan2(pinX, k.y - pinY);
    piston.position.set(0, k.y, 0);
    pistonTop = k.y + PIN_TO_TOP;
    // valves from cam profile; camshafts at half speed, phased to the same profile
    lifts.in = kin.camLift(deg, IN.open, IN.close); lifts.ex = kin.camLift(deg, EX.open, EX.close);
    for (const [vd, l] of [[vIn, lifts.in], [vEx, lifts.ex]]) { const d = l * LIFT; vd.v.position.y = -d; vd.tappet.position.y = STEM + 0.05 - d; vd.spring.scale.y = (0.36 - d) / 0.36; }
    camIn.g.rotation.z = -th / 2 + camOffIn; camEx.g.rotation.z = -th / 2 + camOffEx;
    // belt markers move with belt speed
    beltDots.forEach((d, i) => d.position.copy(beltCurve.getPointAt(((i / beltDots.length) + (th * 0.27) / (beltCurve.getLength())) % 1)));
    // gas: column between piston crown and head
    charge.position.y = (pistonTop + DECK) / 2; charge.scale.y = Math.max(0.01, DECK - pistonTop);
    const target = gasCol[phaseNow];
    charge.material.color.lerp(target, 0.15); charge.material.emissive.lerp(target, 0.15); gas.material.color.lerp(target, 0.15);
    const dens = phaseNow === 1 ? 0.18 + 0.25 * ((deg - 180) / 180) : phaseNow === 0 ? 0.16 : phaseNow === 3 ? 0.12 : 0.2;
    // ignition at ~355°, flame fades over power stroke
    const sinceIgn = deg - 352;
    burn = sinceIgn >= 0 && sinceIgn < 180 ? Math.exp(-sinceIgn / 45) : 0;
    spark.material.emissiveIntensity = sinceIgn >= 0 && sinceIgn < 14 ? 6 : 0; spark.material.opacity = spark.material.emissiveIntensity ? 1 : 0;
    flame.intensity = burn * 40;
    charge.material.opacity = dens + burn * 0.5; charge.material.emissiveIntensity = 0.25 + burn * 3;
    gas.material.size = 0.045 + burn * 0.03;
  });

  // explanation-friendly commands for JARVIS
  jv.command('kurbelwinkel', ({ grad = 0 }) => { jv.tl.t = (((grad % 720) + 720) % 720) / 720 * 8; jv.tl.playing = false; return 'Kurbelwinkel ' + grad + '°'; });
  jv.command('steuerzeiten', () => 'Einlass öffnet 10° v. OT, schliesst 40° n. UT · Auslass öffnet 40° v. UT, schliesst 10° n. OT · Zündung ≈ 8° v. OT · Nockenwelle : Kurbelwelle = 1 : 2');

  jv.select(null);
}
