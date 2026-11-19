// node tools/build-claude-ext.mjs <mcpb-cli> – baut JARVIS-fuer-Claude.mcpb (Erweiterung für die Claude-App, ein Doppelklick)
import { mkdirSync, rmSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), OUT = join(ROOT, 'build-claude-ext'), CLI = process.argv[2];
const ver = (readFileSync(join(ROOT, 'desktop-agent', 'mcp.mjs'), 'utf8').match(/const VERSION = '([^']+)'/) || [])[1];
rmSync(OUT, { recursive: true, force: true }); mkdirSync(join(OUT, 'server'), { recursive: true });
for (const f of ['mcp.mjs', 'dateien.mjs', 'computer.mjs']) copyFileSync(join(ROOT, 'desktop-agent', f), join(OUT, 'server', f));
copyFileSync(join(ROOT, 'icon-512.png'), join(OUT, 'icon.png'));
// tool list for the install dialog = the server's own list
const src = readFileSync(join(ROOT, 'desktop-agent', 'mcp.mjs'), 'utf8');
const tools = [...src.matchAll(/^\s*\['([a-z_]+)', '[^']+', '([^']+)'/gm)].map((m) => ({ name: m[1], description: m[2].replace(/ Pfad: .*$/, '').slice(0, 200) }));
const manifest = {
  manifest_version: '0.2', name: 'jarvis-computer', display_name: 'JARVIS – dein Computer', version: ver,
  description: 'Gibt Claude die Hände von JARVIS: Dateien aufräumen und finden, Programme öffnen, Lautstärke, Musik, Bildschirm, Systemzustand – lokal, ohne API-Key.',
  long_description: 'JARVIS lebt in deinem Computer: Claude kann deine Downloads, den Desktop und die Dokumente aufräumen (umkehrbar), Dateien suchen und lesen (Word, PowerPoint, Text), doppelte Dateien finden, Programme öffnen und schliessen, die Lautstärke und Musik steuern, auf Wunsch den Bildschirm ansehen und meldet volle Festplatten. Nie in System- oder Programmordnern. Löschen, Programme starten und Herunterfahren bestätigst du immer selbst in einem Fenster.',
  author: { name: 'JARVIS-Projekt' }, icon: 'icon.png',
  server: { type: 'node', entry_point: 'server/mcp.mjs', mcp_config: { command: 'node', args: ['${__dirname}/server/mcp.mjs'] } },
  tools, keywords: ['jarvis', 'dateien', 'computer', 'deutsch'], license: 'MIT',
  compatibility: { platforms: ['win32', 'darwin'], runtimes: { node: '>=18.15.0' } },
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
if (CLI) {
  console.log(execFileSync(process.execPath, [CLI, 'validate', join(OUT, 'manifest.json')], { encoding: 'utf8' }).trim());
  console.log(execFileSync(process.execPath, [CLI, 'pack', OUT, join(ROOT, 'JARVIS-fuer-Claude.mcpb')], { encoding: 'utf8' }).trim().split('\n').slice(-6).join('\n'));
}
console.log(`${tools.length} Werkzeuge · Version ${ver}`);
