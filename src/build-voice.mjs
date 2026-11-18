// Build the on-device voice (vendor/voice-local/). Needs a folder with: npm i onnxruntime-web@1.18.0 esbuild@0.24.0
// NODE_DIR=/pfad/zu/node_modules node src/build-voice.mjs
import { createRequire } from 'node:module';
const NODE_DIR = process.env.NODE_DIR || new URL('../node_modules', import.meta.url).pathname;
const { build } = createRequire(NODE_DIR.replace(/\/?$/, '/'))('esbuild');
await build({ entryPoints: [new URL('./voice-local.mjs', import.meta.url).pathname], bundle: true, splitting: true, format: 'esm', platform: 'browser', minify: true,
  external: ['fs', 'path'], nodePaths: [NODE_DIR], outdir: new URL('../vendor/voice-local', import.meta.url).pathname, entryNames: 'voice-local', chunkNames: '[name]-[hash]', legalComments: 'inline' });
console.log('vendor/voice-local gebaut');
