# TexGen Library

A lightweight (14KB) JavaScript library for generating and rendering procedural textures compatible with the TexGen editor.

## Features

- **Static Baking**: Generate PNG (DataURL), `ImageBitmap`, or raw `Uint8Array` pixels.
- **Real-time Rendering**: Animate textures using WebGL or WebGL2.
- **Worker Support**: Full support for `OffscreenCanvas` for background baking.
- **Compressed Shaders**: Support for the compressed shader format used by the TexGen editor ($ tokens).
- **Built-in Utilities**: Includes Noise, FBM, Voronoi, PBR lighting, and more.
- **Mobile Optimized**: Defaults to `highp` precision for high-quality heightmaps on mobile GPUs.

## Installation

Simply include `texgen.js` in your project:

```html
<script src="texgen.js"></script>
```

Or via ES Modules/CommonJS:

```javascript
import TexGen from './texgen.mjs';
// or
const TexGen = require('./texgen.js');
```

## Usage

### 1. Baking a Static Texture

Use this to generate a texture once at startup.

```javascript
const tg = new TexGen({ width: 1024, height: 1024 });

const shaderCode = `
void main() {
    float n = fbm(vUv * 4.0, 4.0);
    gl_FragColor = vec4(vec3(n), 1.0);
}
`;

// Default is DataURL
const dataUrl = tg.bake(shaderCode);

// Return raw pixels (Uint8Array)
const pixels = tg.bake(shaderCode, { format: 'pixels' });

// Return ImageBitmap (Highest performance for Three.js/Canvas)
const bitmap = await tg.bake(shaderCode, { format: 'bitmap' });
```

### 2. Real-time Animated Texture

```javascript
const canvas = document.getElementById('myCanvas');
const tg = new TexGen({ canvas: canvas });

tg.init(shaderCode);

function animate(t) {
    tg.render(t / 1000);
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

### 3. WebGL2 & Volumetric Noise

Pass `webgl2: true` to enable GLSL 3.0 features.

```javascript
const tg = new TexGen({ webgl2: true });
tg.init(`#version 300 es
    void main() {
        // Use WebGL2 specific logic here
        fragColor = vec4(1.0, 0.5, 0.0, 1.0);
    }
`);
```

## Built-in GLSL Utilities

- `vUv` (vec2): Normalized pixel coordinates.
- `u_time` (float): Elapsed time.
- `random(vec2)` / `noise(vec2, scale)` / `fbm(vec2, octaves)` / `voronoi(vec2)`.
- `calculateNormal(height, strength)`: Extracts normals from height.
- `applyPBRLighting(PBRData, ...)`: Standard PBR shader implementation.

## API Reference

### `new TexGen(options)`
- `canvas`: (Optional) Existing canvas.
- `width/height`: Defaults to 512.
- `webgl2`: Boolean (Default: false).
- `preserveDrawingBuffer`: Required for some screenshots/exports.

### `tg.bake(shaderCode, options)`
- `format`: `'dataURL'` (default), `'pixels'`, or `'bitmap'`.
- `uniforms`: Object map of custom uniform values.
- `seed`: Random seed override.

### `TexGen.decompress(base64)` / `TexGen.compress(shaderCode)`
Utilities for the compressed token format.
