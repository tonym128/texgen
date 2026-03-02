# TexGen Library

A lightweight JavaScript library for generating and rendering procedural textures compatible with the TexGen editor.

## Features

- **Static Baking**: Generate PNG/DataURL textures at any resolution.
- **Real-time Rendering**: Animate textures using WebGL.
- **Compressed Shaders**: Support for the compressed shader format used by the TexGen editor.
- **Built-in Utilities**: Includes Noise, FBM, Voronoi, PBR lighting, and more.

## Installation

Simply include `texgen.js` in your project:

```html
<script src="texgen.js"></script>
```

Or via ES Modules/CommonJS:

```javascript
const TexGen = require('./texgen.js');
// or
import TexGen from './texgen.js';
```

## Usage

### 1. Baking a Static Texture

Use this to generate a texture once at startup and use it as a static image.

```javascript
const tg = new TexGen({ width: 1024, height: 1024 });

const shaderCode = `
void main() {
    float n = fbm(vUv * 4.0, 4.0);
    gl_FragColor = vec4(vec3(n), 1.0);
}
`;

const dataUrl = tg.bake(shaderCode);
const img = new Image();
img.src = dataUrl;
document.body.appendChild(img);
```

### 2. Real-time Animated Texture

Use this for dynamic effects like water, fire, or plasma.

```javascript
const canvas = document.getElementById('myCanvas');
const tg = new TexGen({ canvas: canvas, width: 512, height: 512 });

const shaderCode = `
void main() {
    float n = fbm(vUv * 4.0 + u_time * 0.5, 4.0);
    gl_FragColor = vec4(0.0, 0.5, 1.0, 1.0) * n;
}
`;

tg.init(shaderCode);

function animate() {
    requestAnimationFrame(animate);
    tg.render(performance.now() / 1000);
}
animate();
```

### 3. Using Compressed Shaders

If you have a compressed shader string from the TexGen editor (found in the URL hash or via "Copy Compressed"):

```javascript
const compressed = "$m { $l scale = 4.0; ... }"; // Example compressed string
const rawCode = TexGen.decompress(compressed);
tg.bake(rawCode);
```

### 4. Custom Uniforms

You can pass custom uniforms to your shaders:

```javascript
const shaderCode = `
uniform float u_myValue;
uniform vec3 u_myColor;
void main() {
    gl_FragColor = vec4(u_myColor * u_myValue, 1.0);
}
`;

tg.render(time, {
    u_myValue: 0.5,
    u_myColor: [1.0, 0.0, 0.0]
});
```

### 5. PBR Map Baking

You can bake specific PBR maps by passing `u_bakeMode` in the uniforms:

- `0`: Full Lighting (Default)
- `1`: Albedo
- `2`: Normal
- `3`: Roughness
- `4`: Metallic
- `5`: Ambient Occlusion

```javascript
const albedoMap = tg.bake(pbrShader, { uniforms: { u_bakeMode: 1 } });
const normalMap = tg.bake(pbrShader, { uniforms: { u_bakeMode: 2 } });
```

## Built-in GLSL Utilities

When you write a shader for TexGen, it automatically injects a powerful suite of procedural functions into the GLSL environment.

### Variables & Uniforms
- `vUv` (vec2): The normalized pixel coordinates (0.0 to 1.0).
- `u_time` (float): The current elapsed time in seconds (for animation).
- `u_resolution` (vec2): The width and height of the canvas.
- `u_seed` (float): The random seed generated or passed during instantiation.

### Math & Noise Functions
- `float random(vec2 st)`: Returns a pseudo-random float between 0.0 and 1.0 based on the seed.
- `float noise(vec2 st, float scale)`: Generates seamless value noise.
- `float fbm(vec2 st, float octaves)`: Fractional Brownian Motion for natural, cloudy textures.
- `float voronoi(vec2 x)`: Cellular noise (Worley) perfect for water, crystals, or organic tissue.

### Shapes & Geometry (SDFs)
- `float sdCircle(vec2 p, float r)`: Signed distance field for a circle.
- `float sdBox(vec2 p, vec2 b)`: Signed distance field for a box.

### Physically Based Rendering (PBR)
To use PBR lighting, define a `PBRData` struct and pass it to the lighting function:
```glsl
PBRData pbr;
pbr.albedo = vec3(0.8, 0.2, 0.2); // Base Color
pbr.roughness = 0.5;
pbr.metallic = 0.1;
pbr.ambientOcclusion = 1.0;
pbr.normal = calculateNormal(heightMapValue, 1.0);

gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.0)), 1.0);
```

## API Reference

### `new TexGen(options)`
- `options.canvas`: (Optional) Existing canvas element.
- `options.width`: Output width (default: 512).
- `options.height`: Output height (default: 512).
- `options.seed`: Random seed (default: random).

### `tg.init(shaderCode)`
Compiles the shader and prepares the WebGL program.

### `tg.render(time, uniforms)`
Renders a single frame.
- `time`: Current time in seconds.
- `uniforms`: Object containing custom uniform values.

### `tg.bake(shaderCode, options)`
Short-hand for `init` + `render` + `toDataURL`.
- `options.width/height/seed`: Override instance defaults.
- `options.time`: Time offset for the bake.
- `options.uniforms`: Custom uniforms.

### `TexGen.decompress(base64)`
Static method to decompress shader strings from the TexGen editor.
