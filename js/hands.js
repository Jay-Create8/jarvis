// JARVIS 5.2 – Handsteuerung per Kamera (MediaPipe Hand Landmarker, lokal mitgeliefert).
// Kamerabilder werden nur auf dem Gerät ausgewertet und nirgends hingeschickt.
// analyze(): Landmarken → Handzustand · createGestures(): Zustand → Aktionen (rein, ohne DOM → testbar)

const V = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

// One hand (21 normalised landmarks) → pose
export function analyzeHand(L) {
  const size = V(L[0], L[9]) || 1e-6;                        // wrist → middle-finger base
  const ext = (tip, pip) => V(L[tip], L[0]) > V(L[pip], L[0]) * 1.12;
  const fingers = [ext(8, 6), ext(12, 10), ext(16, 14), ext(20, 18)];
  const n = fingers.filter(Boolean).length;
  const pinch = V(L[4], L[8]) / size < 0.33;
  return {
    x: 1 - L[8].x, y: L[8].y,                                // index tip, mirrored like a selfie
    px: 1 - (L[4].x + L[8].x) / 2, py: (L[4].y + L[8].y) / 2,  // pinch point
    pinch, open: n === 4 && !pinch, fist: n === 0 && !pinch, point: fingers[0] && n === 1 && !pinch, finger: n,
  };
}
export function analyze(result) {
  return { hands: (result?.landmarks || []).map(analyzeHand) };
}

// Pose stream → gestures. actions: {cursor(x,y,state), orbit(dx,dy), dolly(f), explode(on), reset()}
export function createGestures(actions, opt = {}) {
  const HOLD = opt.holdMs ?? 700, GAIN = opt.gain ?? 5;
  let drag = null, twoD = null, holdKind = null, holdT = 0, fired = false, lastOrbit = 0;
  return function feed(a, t = performance.now()) {
    const H = a.hands;
    if (!H.length) { drag = twoD = null; holdKind = null; actions.cursor?.(null); return 'keine Hand'; }
    const h = H[0];
    actions.cursor?.(h.x, h.y, h.pinch ? 'greifen' : h.open ? 'offen' : h.fist ? 'faust' : h.point ? 'zeigen' : '');
    // two pinching hands → zoom by distance change
    if (H.length >= 2 && H[0].pinch && H[1].pinch) {
      const d = Math.hypot(H[0].px - H[1].px, H[0].py - H[1].py);
      if (twoD) { const f = d / twoD; if (Math.abs(f - 1) > 0.01) actions.dolly?.(f); }
      twoD = d; drag = null; return 'zoom';
    }
    twoD = null;
    // one pinching hand → rotate (like grabbing the model)
    if (h.pinch) {
      if (drag && t - lastOrbit > 33) { const dx = (h.px - drag.x) * GAIN, dy = (h.py - drag.y) * GAIN; if (Math.abs(dx) + Math.abs(dy) > 0.002) actions.orbit?.(dx, dy); drag = { x: h.px, y: h.py }; lastOrbit = t; }
      else if (!drag) drag = { x: h.px, y: h.py };
      holdKind = null; return 'drehen';
    }
    drag = null;
    // held open palm → take apart, held fist → put back together
    const kind = h.open ? 'offen' : h.fist ? 'faust' : null;
    if (kind !== holdKind) { holdKind = kind; holdT = t; fired = false; }
    if (kind && !fired && t - holdT >= HOLD) { fired = true; if (kind === 'offen') actions.explode?.(true); else actions.explode?.(false); return kind === 'offen' ? 'zerlegen' : 'zusammensetzen'; }
    return kind || (h.point ? 'zeigen' : 'hand');
  };
}

// Camera + landmarker. Returns {video, stop}. onPose gets analyze() output for every new frame.
export async function startCamera(onPose, { base = new URL('../vendor/mediapipe/', import.meta.url).href } = {}) {
  const { FilesetResolver, HandLandmarker } = await import(base + 'vision_bundle.mjs');
  const files = await FilesetResolver.forVisionTasks(base + 'wasm');
  const make = (delegate) => HandLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: base + 'hand_landmarker.task', delegate }, runningMode: 'VIDEO', numHands: 2 });
  let lm; try { lm = await make('GPU'); } catch { lm = await make('CPU'); }
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
  const video = Object.assign(document.createElement('video'), { srcObject: stream, muted: true, playsInline: true });
  await video.play();
  let run = true, last = -1, raf = 0;
  const loop = () => {
    if (!run) return;
    if (video.readyState >= 2 && video.currentTime !== last) { last = video.currentTime; try { onPose(analyze(lm.detectForVideo(video, performance.now()))); } catch (e) { console.warn('Hand-Erkennung', e.message); } }
    raf = requestAnimationFrame(loop);
  };
  loop();
  return { video, stop() { run = false; cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); try { lm.close(); } catch {} } };
}
