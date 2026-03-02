# AI Agent Guide for TexGen

This guide is designed for AI agents (LLMs like GPT-4, Claude, Gemini) to understand how to correctly generate shaders and integrate with the `texgen.js` library.

## 1. Environment Context

TexGen fragment shaders run in a specialized WebGL environment that injects utilities and uniforms.

### Mandatory Environment
- **`vUv` (vec2)**: Normalized pixel coordinates [0.0, 1.0].
- **`u_time` (float)**: Elapsed time in seconds.
- **`u_resolution` (vec2)**: Canvas dimensions.
- **`u_seed` (float)**: Randomization seed.
- **`u_bakeMode` (int)**: 0=Full, 1=Albedo, 2=Normal, 3=Roughness, 4=Metallic, 5=AO.

### Built-in Functions (DO NOT Redefine)
- `random(vec2)`
- `noise(vec2, scale)`
- `fbm(vec2, octaves)`
- `voronoi(vec2)`
- `sdCircle(vec2, radius)`
- `sdBox(vec2, halfSize)`
- `calculateNormal(height, strength)`

## 2. Generating Compatible Shaders

When asked to generate a texture, provide **only** the fragment shader logic.

### Standard Template
```glsl
// Custom uniforms with @slider metadata
uniform float u_scale; // @slider 1.0, 10.0, 5.0

void main() {
    // 1. Logic
    float n = fbm(vUv * u_scale, u_scale);
    // 2. Output
    gl_FragColor = vec4(vec3(n), 1.0);
}
```

## 3. Compression Logic

TexGen uses a token-based compression system to save space.
- `void main()` -> `$m`
- `gl_FragColor` -> `$f`
- `vec2/3/4` -> `$2/$3/$4`
- `float` -> `$l`
- `uniform` -> `$u`
- `varying` -> `$v`
- `u_time` -> `$t`
- `vUv` -> `$U`
- `fbm` -> `$b`
- `noise` -> `$n`
- `random` -> `$r`
- `smoothstep` -> `$s`
- `mix` -> `$x`
- `fract` -> `$c`
- `floor` -> `$o`
- `distance` -> `$d`
- `length` -> `$g`

**Agent Strategy:** If you need to generate a compressed payload, write the full GLSL first, then apply these replacements and Base64 encode the result.

## 4. PBR Support

To generate high-quality materials, use the `PBRData` struct and `applyPBRLighting`.

```glsl
void main() {
    float h = fbm(vUv * 5.0, 5.0);
    PBRData pbr;
    pbr.albedo = vec3(0.5);
    pbr.roughness = 0.5;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(h, 1.0);
    
    gl_FragColor = vec4(applyPBRLighting(pbr, vec3(1.0), vec3(0.0, 0.0, 1.0), vec3(1.0)), 1.0);
}
```

## 5. Deployment Context

- If running on **Vite**, import `.ts` or `.mjs` directly.
- If running on **GitHub Pages**, use the `.js` (UMD) or `.mjs` (ESM) fallback.
- ES Modules require a local server and will fail via `file://`.
