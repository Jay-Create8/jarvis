import * as esbuild from 'esbuild';
const externalThree = { name: 'ext-three', setup(b) { b.onResolve({ filter: /^three$/ }, () => ({ path: './three.js', external: true })); } };
await esbuild.build({ entryPoints: ['jv.mjs'], bundle: true, format: 'esm', minify: true, outfile: '/home/user/jarvis/js/jv.js', plugins: [externalThree] });
await esbuild.build({ entryPoints: ['three-entry.mjs'], bundle: true, format: 'esm', minify: true, outfile: '/home/user/jarvis/js/three.js' });
console.log('built');
