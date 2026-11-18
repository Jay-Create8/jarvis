// node tools/build-parts.mjs – writes p/<hash>.<n>.bin (gzip -9, 16 KB parts) + precache.json for the resumable loader
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync, constants } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PART = 16384, VER = '5.9.5';
const GROUPS = {
  req: ['index.html', 'app.html', 'loader.js', 'js/gemini.js', 'manifest.json', 'icon.svg'],          // needed to start
  def: ['js/hud3d.js', 'js/chunk-OF6KIFO7.js', 'js/windows.js', 'vendor/leaflet.css', 'icon-192.png'],  // loaded right after the start
  opt: ['anthropic-sdk.mjs', 'js/hands.js', 'js/jv.js', 'js/three.js', 'icon-512.png', 'vendor/voice-local/voice-local.js'],                // only when used
};
const TYPES = {html:'text/html; charset=utf-8', js:'text/javascript; charset=utf-8', mjs:'text/javascript; charset=utf-8', css:'text/css; charset=utf-8', json:'application/json', svg:'image/svg+xml', png:'image/png'};
mkdirSync(join(ROOT, 'p'), {recursive:true});
const files = [], keep = new Set();
for (const [g, list] of Object.entries(GROUPS)) for (const u of list){
  const raw = readFileSync(join(ROOT, u));
  const h = createHash('sha256').update(raw).digest('hex').slice(0, 16);
  const z = gzipSync(raw, {level:9, memLevel:9, strategy:constants.Z_DEFAULT_STRATEGY});
  const p = Math.ceil(z.length / PART);
  for (let i = 0; i < p; i++){ const name = `${h}.${i}.bin`; keep.add(name); const out = join(ROOT, 'p', name); if (!existsSync(out)) writeFileSync(out, z.subarray(i * PART, (i + 1) * PART)); }
  files.push({u, g, h, n:raw.length, z:z.length, p, t:TYPES[u.split('.').pop()] || 'application/octet-stream'});
}
let removed = 0; for (const f of readdirSync(join(ROOT, 'p'))) if (!keep.has(f)){ unlinkSync(join(ROOT, 'p', f)); removed++; }
const v = createHash('sha256').update(files.map(f => f.u + f.h).join('|')).digest('hex').slice(0, 10);
writeFileSync(join(ROOT, 'precache.json'), JSON.stringify({v, ver:VER, part:PART, files}));
const sum = g => files.filter(f => f.g === g).reduce((s, f) => s + f.z, 0);
console.log(`precache.json v=${v} · ${files.length} Dateien · ${keep.size} Teile (${removed} alte entfernt)`);
for (const g of Object.keys(GROUPS)) console.log(`  ${g}: ${(sum(g) / 1024).toFixed(1)} KB komprimiert`);
