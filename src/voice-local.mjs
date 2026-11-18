// 5.9.2 – JARVIS' own voice, running ON the device (Piper TTS, German voices by Thorsten Müller & others, MIT/CC licences).
// No account, no key, no limit, no costs. One-time download (~63 MB voice + ~29 MB engine), then everything comes from the device.
// Unlike the library's predict(), the model session stays in memory → the next sentence starts in well under a second.
import * as ort from 'onnxruntime-web';
import { createPiperPhonemize } from './piper-phonemize.mjs';   // from @diffusionstudio/vits-web 1.0.3 (MIT)

const HF = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/';
const PHON = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';
ort.env.wasm.wasmPaths = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/';
ort.env.wasm.numThreads = (globalThis.crossOriginIsolated && navigator.hardwareConcurrency) ? Math.min(4, navigator.hardwareConcurrency) : 1;
export const VOICES = {
  'de_DE-thorsten-medium': { pfad: 'de/de_DE/thorsten/medium/', name: 'Thorsten – männlich, natürlich (empfohlen)', mb: 63 },
  'de_DE-thorsten-high': { pfad: 'de/de_DE/thorsten/high/', name: 'Thorsten HD – beste Qualität, grösser und langsamer', mb: 114 },
  'de_DE-karlsson-low': { pfad: 'de/de_DE/karlsson/low/', name: 'Karlsson – männlich, klein und schnell', mb: 63 },
  'de_DE-kerstin-low': { pfad: 'de/de_DE/kerstin/low/', name: 'Kerstin – weiblich', mb: 63 },
  'de_DE-ramona-low': { pfad: 'de/de_DE/ramona/low/', name: 'Ramona – weiblich', mb: 63 },
};
const CACHE = 'jarvis-voice';
async function cachedBlob(url, onBytes){
  const c = await caches.open(CACHE); const hit = await c.match(url); if (hit) return hit.blob();
  const r = await fetch(url); if (!r.ok) throw new Error('Download fehlgeschlagen (HTTP ' + r.status + ')');
  const total = +r.headers.get('content-length') || 0, rd = r.body.getReader(), parts = []; let n = 0;
  for (;;){ const { value, done } = await rd.read(); if (done) break; parts.push(value); n += value.length; onBytes?.(n, total); }
  const b = new Blob(parts); await c.put(url, new Response(b)); return b;
}
export async function ready(voice){ const v = VOICES[voice]; if (!v) return false; const c = await caches.open(CACHE); return !!(await c.match(HF + v.pfad + voice + '.onnx')); }
let session = null, sessionVoice = '', conf = null, loading = null;
export function load(voice = 'de_DE-thorsten-medium', onProgress){
  if (session && sessionVoice === voice) return Promise.resolve();
  if (loading?.voice === voice) return loading.p;
  const p = (async () => {
    const v = VOICES[voice]; if (!v) throw new Error('Unbekannte Stimme ' + voice);
    conf = JSON.parse(await (await cachedBlob(HF + v.pfad + voice + '.onnx.json')).text());
    const model = await cachedBlob(HF + v.pfad + voice + '.onnx', (n, t) => onProgress?.({ geladen: n, gesamt: t || v.mb * 1e6 }));
    session = await ort.InferenceSession.create(await model.arrayBuffer());
    sessionVoice = voice;
  })().finally(() => { loading = null; });
  loading = { voice, p }; return p;
}
// the phonemizer stays loaded (noInitialRun) – starting it costs ~0.7 s, a sentence then only ~20 ms
let phon = null, phonResolve = null, phonReject = null;
function phonModule(){
  return phon ??= createPiperPhonemize({ noInitialRun: true,
    print: (l) => { try { phonResolve?.(JSON.parse(l).phoneme_ids); } catch (e) { phonReject?.(e); } },
    printErr: (l) => phonReject?.(new Error(l)),
    locateFile: (f) => f.endsWith('.wasm') ? PHON + '.wasm' : f.endsWith('.data') ? PHON + '.data' : f,
  }).catch((e) => { phon = null; throw e; });
}
async function phonemes(text, espeakVoice){
  const m = await phonModule();
  return new Promise((res, rej) => { phonResolve = res; phonReject = rej; m.callMain(['-l', espeakVoice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']); });
}
function wav(samples, rate){
  const b = new ArrayBuffer(44 + samples.length * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  return new Blob([b], { type: 'audio/wav' });
}
// tempo: 1 = normal, >1 faster. Calls run one after another (one phonemizer, one model session).
let queue = Promise.resolve();
export function synth(text, opts = {}){ const p = queue.then(() => synthNow(text, opts)); queue = p.catch(() => {}); return p; }
export function warmup(voice){ return load(voice).then(() => phonModule()).then(() => true); }
async function synthNow(text, { voice = 'de_DE-thorsten-medium', tempo = 1 } = {}){
  await load(voice);
  const ids = await phonemes(text.trim(), conf.espeak.voice), inf = conf.inference || {};
  const feeds = { input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]), input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([inf.noise_scale ?? 0.667, (inf.length_scale ?? 1) / Math.max(0.5, Math.min(2, tempo)), inf.noise_w ?? 0.8]), [3]) };
  if (Object.keys(conf.speaker_id_map || {}).length) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
  const { output } = await session.run(feeds);
  return wav(output.data, conf.audio.sample_rate);
}
