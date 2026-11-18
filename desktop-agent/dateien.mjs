/* =====================================================================
   JARVIS PC-AGENT – Dateien am PC (5.9.4)
   Der Browser darf Web-Apps Downloads, Desktop und Dokumente nicht freigeben und sieht keine Unterordner.
   Der Agent läuft als normales Programm des Nutzers und darf deshalb alles im Benutzerordner (und auf
   weiteren Laufwerken wie D:\ oder USB-Sticks) – aber nie in System- oder Programmordnern.
   Sicherheit:
   - Verschieben, Umbenennen, Sortieren sind umkehrbar (Rückgängig-Protokoll) → ohne Rückfrage.
   - Löschen landet im Ordner „JARVIS-Papierkorb“ (umkehrbar) und braucht trotzdem IMMER eine Bestätigung.
   - Programme/Skripte öffnen (.exe, .bat …) braucht IMMER eine Bestätigung.
   ===================================================================== */
import fs from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HOME = os.homedir();
const WIN = process.platform === 'win32';
const UNDO_FILE = fileURLToPath(new URL('./rueckgaengig.json', import.meta.url));
const TRASH = path.join(HOME, 'JARVIS-Papierkorb');

export const CAT_RULES = {
  Bilder: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'svg', 'tif', 'tiff', 'raw', 'cr2', 'nef', 'arw'], Videos: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'wmv'],
  Audio: ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'opus'], Dokumente: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'pages', 'epub'], Tabellen: ['xls', 'xlsx', 'csv', 'ods', 'numbers'],
  Präsentationen: ['ppt', 'pptx', 'key', 'odp'], Archive: ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'dmg', 'iso'], Programme: ['exe', 'msi', 'pkg', 'apk', 'deb', 'rpm', 'appimage'],
  Code: ['js', 'ts', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'html', 'css', 'json', 'xml', 'yml', 'yaml', 'sh', 'ipynb'], Schriften: ['ttf', 'otf', 'woff', 'woff2'],
};
const ext = (n) => (n.includes('.') ? n.split('.').pop() : '').toLowerCase();
export function categorize(name, rules = CAT_RULES) {
  const e = ext(name);
  if (/^(screenshot|bildschirmfoto|screen shot|capture)/i.test(name) && CAT_RULES.Bilder.includes(e)) return 'Screenshots';
  for (const [cat, exts] of Object.entries(rules)) if (exts.map((x) => String(x).replace(/^\./, '').toLowerCase()).includes(e)) return cat;
  return 'Sonstiges';
}
// never touched while sorting: shortcuts, system files, unfinished downloads
const KEEP = /^(desktop\.ini|thumbs\.db|\.ds_store)$|\.(lnk|url|crdownload|part|partial|tmp|download)$/i;
const SKIP_DIRS = /^(node_modules|\.git|appdata|library|\$recycle\.bin|system volume information|jarvis-papierkorb|windows|program files.*|programdata)$/i;
const EXEC = /\.(exe|msi|bat|cmd|com|ps1|vbs|vbe|js|jse|wsf|wsh|scr|pif|lnk|reg|hta|cpl|jar|sh|command|app|pkg|appimage|deb|rpm)$/i;

/* ---------- where am I allowed to work? ---------- */
const inside = (p, root) => { const r = path.relative(root, p); return r === '' || (!!r && !r.startsWith('..') && !path.isAbsolute(r)); };
function blocked(p) {
  const rel = path.relative(HOME, p);
  if (inside(p, HOME)) {
    const parts = rel.split(path.sep).filter(Boolean);
    if (parts.some((s) => s.startsWith('.') && s !== '.')) return 'versteckter Systemordner';
    if (/^(appdata|library)$/i.test(parts[0] || '')) return 'Programmdaten (AppData/Library)';
    return '';
  }
  if (WIN) {
    const root = path.parse(p).root.toLowerCase();             // other drives (D:\, USB) are fine, the system drive outside HOME is not
    const sys = path.parse(process.env.SystemRoot || 'C:\\Windows').root.toLowerCase();
    if (root !== sys && /^[a-z]:\\$/.test(root)) return /\\(windows|program files[^\\]*|programdata|\$recycle\.bin|system volume information)(\\|$)/i.test(p) ? 'Systemordner' : '';
    return 'ausserhalb deines Benutzerordners';
  }
  if (process.platform === 'darwin' && inside(p, '/Volumes')) return '';
  if (inside(p, '/media') || inside(p, '/mnt') || inside(p, '/run/media')) return '';
  return 'ausserhalb deines Benutzerordners';
}

/** known folders – Windows often moves Desktop/Dokumente/Bilder into OneDrive */
export function knownFolders() {
  const one = (() => { try { return readdirSync(HOME).filter((n) => /^onedrive/i.test(n)).map((n) => path.join(HOME, n)); } catch { return []; } })();
  const pick = (names) => { for (const base of [...one, HOME]) for (const n of names) { const p = path.join(base, n); if (existsSync(p)) return p; } return null; };
  const out = {
    Downloads: pick(['Downloads']), Desktop: pick(['Desktop', 'Schreibtisch']), Dokumente: pick(['Dokumente', 'Documents']),
    Bilder: pick(['Bilder', 'Pictures']), Musik: pick(['Musik', 'Music']), Videos: pick(['Videos', 'Movies', 'Filme']), Benutzerordner: HOME,
  };
  one.forEach((p) => { out[path.basename(p)] = p; });
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
}

export function resolvePath(p) {
  if (!p || typeof p !== 'string') throw new Error('Pfad fehlt');
  let s = p.trim().replace(/^["']|["']$/g, '');
  const known = knownFolders();
  const head = s.split(/[\\/]/)[0];
  const alias = Object.keys(known).find((k) => k.toLowerCase() === head.toLowerCase() || (head.toLowerCase() === 'documents' && k === 'Dokumente') || (head.toLowerCase() === 'pictures' && k === 'Bilder') || (/^(schreibtisch)$/i.test(head) && k === 'Desktop'));
  if (alias) s = path.join(known[alias], s.slice(head.length));
  else if (s === '~' || s.startsWith('~/') || s.startsWith('~\\')) s = path.join(HOME, s.slice(1));
  else if (!path.isAbsolute(s)) s = path.join(HOME, s);
  const full = path.resolve(s);
  const why = blocked(full);
  if (why) throw new Error(`Darf ich nicht: ${full} (${why}). Erlaubt: alles in deinem Benutzerordner (Downloads, Desktop, Dokumente …) und weitere Laufwerke/USB-Sticks.`);
  return full;
}
const pretty = (p) => (inside(p, HOME) ? path.join('~', path.relative(HOME, p)) : p);

/* ---------- reading ---------- */
async function walk(dir, { deep, max = 100000, budgetMs = 20000, onFile, onDir }) {
  const t0 = Date.now(); let n = 0, cut = false;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop(); let list;
    try { list = await fs.readdir(d, { withFileTypes: true }); } catch { continue; }
    for (const e of list) {
      if (++n > max || Date.now() - t0 > budgetMs) { cut = true; return { n, cut }; }
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (onDir) await onDir(p, e.name, d === dir); if (deep && !SKIP_DIRS.test(e.name) && !e.name.startsWith('.')) stack.push(p); }
      else if (e.isFile()) await onFile?.(p, e.name, d === dir);
    }
  }
  return { n, cut };
}
const stat = async (p) => { try { return await fs.stat(p); } catch { return null; } };

export async function liste({ pfad = 'Downloads', tief = false, namen = false } = {}) {
  const dir = resolvePath(pfad); const st = await stat(dir);
  if (!st?.isDirectory()) throw new Error('Ordner nicht gefunden: ' + pretty(dir));
  const files = [], dirs = []; const byCat = {}, byYear = {}; let bytes = 0;
  const r = await walk(dir, { deep: tief, max: 200000, budgetMs: 25000,
    onDir: (p, name, top) => { if (top) dirs.push(name); },
    onFile: async (p, name, top) => { const s = await stat(p); if (!s) return; bytes += s.size; const c = categorize(name); byCat[c] = (byCat[c] || 0) + 1; const y = new Date(s.mtimeMs).getFullYear(); byYear[y] = (byYear[y] || 0) + 1; files.push({ name, p, top, size: s.size, m: s.mtimeMs }); } });
  const top = files.filter((f) => f.top);
  const res = {
    ordner: pretty(dir), dateien: files.length, davon_direkt_im_ordner: top.length, unterordner: dirs.length, gb: +(bytes / 1e9).toFixed(2),
    nach_kategorie: byCat, nach_jahr: byYear,
    grösste: [...files].sort((a, b) => b.size - a.size).slice(0, 8).map((f) => ({ datei: tief ? pretty(f.p) : f.name, mb: +(f.size / 1e6).toFixed(1) })),
    unterordner_namen: dirs.slice(0, 40), unvollständig: r.cut || undefined,
  };
  if (top.length <= 150) res.liste = top.sort((a, b) => b.m - a.m).map((f) => ({ name: f.name, kb: Math.round(f.size / 1024), datum: new Date(f.m).toISOString().slice(0, 10) }));
  else res.beispiele = top.slice(0, 40).map((f) => f.name);
  if (namen) res._namen = top.slice(0, 2000).map((f) => ({ name: f.name, size: f.size }));   // only for the live window, removed by the app before the AI sees it
  return res;
}

export async function suchen({ muster, pfad = '~', max = 40 } = {}) {
  if (!muster) throw new Error('Suchbegriff fehlt');
  const dir = resolvePath(pfad);
  const words = String(muster).toLowerCase().replace(/\*/g, ' ').split(/\s+/).filter(Boolean);
  const hits = [];
  const test = (name) => { const l = name.toLowerCase(); return words.every((w) => l.includes(w)); };
  const r = await walk(dir, { deep: true, max: 400000, budgetMs: 25000,
    onDir: (p, name) => { if (hits.length < max && test(name)) hits.push({ pfad: pretty(p), ordner: true }); },
    onFile: async (p, name) => { if (hits.length < max && test(name)) { const s = await stat(p); hits.push({ pfad: pretty(p), kb: s ? Math.round(s.size / 1024) : undefined, datum: s ? new Date(s.mtimeMs).toISOString().slice(0, 10) : undefined }); } } });
  return { treffer: hits, durchsucht: r.n, unvollständig: r.cut ? 'Zeitlimit – genauer suchen oder Ordner angeben' : undefined };
}

/* ---------- changing (all reversible, verified, logged) ---------- */
async function uniqueTarget(dest) {
  if (!(await stat(dest))) return dest;
  const { dir, name, ext: e } = path.parse(dest);
  for (let i = 2; i < 10000; i++) { const c = path.join(dir, `${name} (${i})${e}`); if (!(await stat(c))) return c; }
  throw new Error('kein freier Name');
}
async function moveVerified(src, destDir, newName) {
  const s = await stat(src); if (!s) throw new Error('nicht gefunden');
  await fs.mkdir(destDir, { recursive: true });
  const dest = await uniqueTarget(path.join(destDir, newName || path.basename(src)));
  try { await fs.rename(src, dest); }
  catch (e) { if (e.code !== 'EXDEV') throw e; await fs.cp(src, dest, { recursive: true, errorOnExist: true, preserveTimestamps: true }); await fs.rm(src, { recursive: true }); }
  const d = await stat(dest);
  if (!d || (s.isFile() && d.size !== s.size)) throw new Error('Prüfung nach dem Verschieben fehlgeschlagen');
  if (await stat(src)) throw new Error('Original existiert noch');
  return dest;
}
async function readUndo() { try { return JSON.parse(await fs.readFile(UNDO_FILE, 'utf8')); } catch { return []; } }
async function pushUndo(op) { if (!op.moves.length) return; const u = await readUndo(); u.push({ zeit: new Date().toISOString(), ...op }); await fs.writeFile(UNDO_FILE, JSON.stringify(u.slice(-10))); }

export async function sortieren({ pfad = 'Downloads', nach = 'typ', regeln, vorschau = false } = {}) {
  const dir = resolvePath(pfad); const st = await stat(dir);
  if (!st?.isDirectory()) throw new Error('Ordner nicht gefunden: ' + pretty(dir));
  const rules = regeln && Object.keys(regeln).length ? regeln : CAT_RULES;
  const items = (await fs.readdir(dir, { withFileTypes: true })).filter((e) => e.isFile() && !e.name.startsWith('.') && !KEEP.test(e.name));
  const plan = {};
  for (const e of items) {
    const s = await stat(path.join(dir, e.name)); if (!s) continue; const d = new Date(s.mtimeMs);
    const cat = nach === 'jahr' ? String(d.getFullYear()) : nach === 'monat' ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : categorize(e.name, rules);
    (plan[cat] ||= []).push(e.name);
  }
  const counts = Object.fromEntries(Object.entries(plan).map(([k, v]) => [k, v.length]));
  if (vorschau) return { ordner: pretty(dir), vorschau: true, dateien: items.length, plan: counts, beispiele: Object.fromEntries(Object.entries(plan).map(([k, v]) => [k, v.slice(0, 4)])), unterordner_bleiben: 'Unterordner und Verknüpfungen bleiben, wo sie sind.' };
  const t0 = Date.now(); const moves = [], fehler = [], log = [];
  for (const [cat, names] of Object.entries(plan)) for (const name of names) {
    try { const dest = await moveVerified(path.join(dir, name), path.join(dir, cat)); moves.push([path.join(dir, name), dest]); log.push([name, cat]); }
    catch (e) { fehler.push(`${name}: ${e.message}`); }
  }
  await pushUndo({ art: 'sortieren', ordner: dir, moves });
  const per = {}; log.forEach(([, c]) => { per[c] = (per[c] || 0) + 1; });
  return { ordner: pretty(dir), verschoben_und_geprüft: moves.length, je_ordner: per, sekunden: +((Date.now() - t0) / 1000).toFixed(1), fehler: fehler.slice(0, 20), fehler_anzahl: fehler.length, rückgängig_möglich: moves.length > 0, _log: log };
}

export async function verschieben({ quellen, ziel } = {}) {
  const list = (Array.isArray(quellen) ? quellen : [quellen]).filter(Boolean); if (!list.length || !ziel) throw new Error('quellen und ziel nötig');
  const to = resolvePath(ziel); const moves = [], fehler = [];
  for (const q of list) { try { const src = resolvePath(q); if (inside(to, src)) throw new Error('Ordner kann nicht in sich selbst'); moves.push([src, await moveVerified(src, to)]); } catch (e) { fehler.push(`${q}: ${e.message}`); } }
  await pushUndo({ art: 'verschieben', moves });
  return { verschoben_und_geprüft: moves.map(([, d]) => pretty(d)), fehler, rückgängig_möglich: moves.length > 0 };
}
export async function umbenennen({ pfad, neuer_name } = {}) {
  if (!neuer_name || /[\\/:*?"<>|]/.test(neuer_name)) throw new Error('Ungültiger neuer Name (keine \\ / : * ? " < > |)');
  const src = resolvePath(pfad); const dest = await moveVerified(src, path.dirname(src), neuer_name);
  await pushUndo({ art: 'umbenennen', moves: [[src, dest]] });
  return { umbenannt: pretty(dest), rückgängig_möglich: true };
}
export async function ordner_erstellen({ pfad } = {}) { const p = resolvePath(pfad); await fs.mkdir(p, { recursive: true }); return { erstellt: pretty(p) }; }

export async function löschen({ pfade } = {}) {        // reaches here only after the human confirmed (see agent.mjs)
  const list = (Array.isArray(pfade) ? pfade : [pfade]).filter(Boolean); const day = path.join(TRASH, new Date().toISOString().slice(0, 10));
  const moves = [], fehler = [];
  for (const q of list) { try { const src = resolvePath(q); moves.push([src, await moveVerified(src, day)]); } catch (e) { fehler.push(`${q}: ${e.message}`); } }
  await pushUndo({ art: 'löschen', moves });
  return { in_den_jarvis_papierkorb: moves.map(([s]) => pretty(s)), papierkorb: pretty(day), fehler, hinweis: 'Nichts ist endgültig weg – rückgängig möglich oder selbst aus dem JARVIS-Papierkorb holen.' };
}
export async function rückgängig() {
  const u = await readUndo(); const op = u.pop(); if (!op) throw new Error('Nichts rückgängig zu machen');
  let ok = 0; const fehler = [];
  for (const [src, dest] of [...op.moves].reverse()) { try { await moveVerified(dest, path.dirname(src), path.basename(src)); ok++; } catch (e) { fehler.push(`${pretty(dest)}: ${e.message}`); } }
  if (op.art === 'sortieren' && op.ordner) for (const d of new Set(op.moves.map(([, x]) => path.dirname(x)))) { try { if (!(await fs.readdir(d)).length) await fs.rmdir(d); } catch {} }
  await fs.writeFile(UNDO_FILE, JSON.stringify(u));
  return { rückgängig: op.art, zurück_und_geprüft: ok, fehler };
}

export const needsConfirm = (aktion, args) => aktion === 'löschen' || (aktion === 'öffnen' && args?.pfad && EXEC.test(String(args.pfad)));
export async function öffnen({ pfad, url } = {}) {
  let target;
  if (url) { if (!/^https?:\/\//i.test(url)) throw new Error('Nur http(s)-Links'); target = url; }
  else { target = resolvePath(pfad); if (!(await stat(target))) throw new Error('nicht gefunden: ' + pretty(target)); }
  const [cmd, args] = WIN ? ['explorer.exe', [target]] : process.platform === 'darwin' ? ['open', [target]] : ['xdg-open', [target]];
  if (process.env.JARVIS_TEST_OEFFNEN) return { geöffnet: url || pretty(target), test: true };
  const ch = spawn(cmd, args, { detached: true, stdio: 'ignore' }); ch.on('error', () => {}); ch.unref();
  return { geöffnet: url || pretty(target) };
}

/* ---------- reading content: text files + Word/PowerPoint (tiny zip reader, no extra package) ---------- */
function zipEntries(buf) {
  let eocd = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('keine gültige Office-Datei');
  const n = buf.readUInt16LE(eocd + 10); let off = buf.readUInt32LE(eocd + 16); const out = {};
  for (let k = 0; k < n; k++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10), csize = buf.readUInt32LE(off + 20), nlen = buf.readUInt16LE(off + 28), xlen = buf.readUInt16LE(off + 30), clen = buf.readUInt16LE(off + 32), loc = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nlen);
    out[name] = () => { const ln = buf.readUInt16LE(loc + 26), lx = buf.readUInt16LE(loc + 28); const data = buf.subarray(loc + 30 + ln + lx, loc + 30 + ln + lx + csize); return (method === 8 ? inflateRawSync(data) : data).toString('utf8'); };
    off += 46 + nlen + xlen + clen;
  }
  return out;
}
const xmlText = (x) => x.replace(/<\/w:p>|<\/a:p>/g, '\n').replace(/<w:tab\/>/g, '\t').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
const TEXT = /\.(txt|md|csv|tsv|json|log|ini|cfg|xml|html?|css|js|mjs|ts|py|java|c|cpp|h|cs|go|rs|sh|bat|ps1|yml|yaml|srt|vtt|tex|rtf)$/i;
export async function lesen({ pfad, max = 15000 } = {}) {
  const p = resolvePath(pfad); const s = await stat(p); if (!s?.isFile()) throw new Error('Datei nicht gefunden: ' + pretty(p));
  if (s.size > 30e6) throw new Error('Datei zu gross zum Lesen (über 30 MB)');
  let text;
  if (/\.docx$/i.test(p)) { const z = zipEntries(await fs.readFile(p)); text = xmlText(z['word/document.xml']?.() || ''); }
  else if (/\.pptx$/i.test(p)) { const z = zipEntries(await fs.readFile(p)); text = Object.keys(z).filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]).map((k, i) => `--- Folie ${i + 1} ---\n` + xmlText(z[k]())).join('\n'); }
  else if (TEXT.test(p)) text = (await fs.readFile(p, 'utf8'));
  else throw new Error('Diesen Dateityp kann ich noch nicht lesen (geht: Text, Word .docx, PowerPoint .pptx). PDFs: mit „öffnen“ anzeigen.');
  return { datei: pretty(p), zeichen: text.length, text: text.slice(0, max), gekürzt: text.length > max || undefined };
}

export async function ordner() { return { bekannte_ordner: Object.fromEntries(Object.entries(knownFolders()).map(([k, v]) => [k, pretty(v)])), hinweis: 'Pfade dürfen so angegeben werden: "Downloads", "Desktop/Schule", "~/Dokumente/…" oder absolut (auch D:\\…).' }; }

export const FILE_ACTIONS = { ordner, liste, suchen, sortieren, verschieben, umbenennen, ordner_erstellen, löschen, rückgängig, öffnen, lesen };
