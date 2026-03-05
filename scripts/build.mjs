import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.resolve(root, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(dist)) {
    fs.mkdirSync(dist, { recursive: true });
}

const corePath = path.resolve(root, 'src/texgen.core.js');
const core = fs.readFileSync(corePath, 'utf8').trim();

console.log('🚀 Starting TexGen Modern Build...');

// 1. Generate Base Files (ESM & UMD)
const esmContent = `${core}

export default TexGen;`;
const umdWrapper = (code) => `${code}

(function (root, factory) {
    if (typeof define === 'function' && define.amd) { define([], factory); }
    else if (typeof module === 'object' && module.exports) { module.exports = factory(); }
    else { root.TexGen = factory(); }
}(typeof self !== 'undefined' ? self : this, function () { return TexGen; }));`;

fs.writeFileSync(path.resolve(dist, 'texgen.mjs'), esmContent);
fs.writeFileSync(path.resolve(dist, 'texgen.js'), umdWrapper(core));

// Copy d.ts to dist
fs.copyFileSync(path.resolve(root, 'texgen.d.ts'), path.resolve(dist, 'texgen.d.ts'));

// 2. Generate Minified Versions
await esbuild.build({
    entryPoints: [path.resolve(dist, 'texgen.js')],
    bundle: true,
    minify: true,
    outfile: path.resolve(dist, 'texgen.min.js'),
});

await esbuild.build({
    entryPoints: [path.resolve(dist, 'texgen.mjs')],
    bundle: true,
    minify: true,
    format: 'esm',
    outfile: path.resolve(dist, 'texgen.min.mjs'),
});

console.log('✅ Distribution files generated in dist/');

// 3. Sync to Examples
const examples = [
    'platformer', 'marble_roller', 'maze3d', 'texture_generator', 
    'flight_sim', 'card_roguelike', 'solitaire', 'multipass_post', 
    'texture_streaming', 'playground', 'carded'
];

examples.forEach(ex => {
    const dest = path.resolve(root, `example/${ex}/texgen.js`);
    fs.copyFileSync(path.resolve(dist, 'texgen.js'), dest);
});

// Sync Words addon to examples that use it locally
const wordsExamples = ['carded'];
wordsExamples.forEach(ex => {
    const dest = path.resolve(root, `example/${ex}/texgen.words.js`);
    fs.copyFileSync(path.resolve(root, 'src/texgen.words.js'), dest);
});

// Special case for TS gallery (ESM)
fs.copyFileSync(path.resolve(dist, 'texgen.mjs'), path.resolve(root, 'example/typescript_gallery/texgen.mjs'));
fs.copyFileSync(path.resolve(dist, 'texgen.d.ts'), path.resolve(root, 'example/typescript_gallery/texgen.d.ts'));

console.log(`📦 Synced library to ${examples.length + 1} examples.`);
