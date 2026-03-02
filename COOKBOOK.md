# TexGen Cookbook & AI Guide

This document provides ready-to-use procedural patterns and a guide on how to leverage AI (like ChatGPT or Gemini) to generate complex shaders for the TexGen library.

## 1. Procedural Patterns

These snippets leverage TexGen's built-in utilities (`vUv`, `u_time`, `fbm`, `noise`, `voronoi`).

### The Hex Grid
Generates a mathematically perfect hexagonal grid, useful for sci-fi panels, shields, or strategy game maps.

```glsl
uniform float u_scale; // @slider 1.0, 50.0, 20.0
void main() {
    vec2 p = vUv * u_scale;
    vec2 r = vec2(1.0, 1.73);
    vec2 h = r * 0.5;
    vec2 a = mod(p, r) - h;
    vec2 b = mod(p - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    float hex = max(abs(gv.x), dot(abs(gv), normalize(r)));
    float border = smoothstep(0.45, 0.5, hex);
    
    vec3 col = mix(vec3(0.1, 0.2, 0.3), vec3(0.0, 0.8, 1.0), border);
    gl_FragColor = vec4(col, 1.0);
}
```

### Animated Liquid / Lava
Uses moving FBM noise to create a thick, shifting fluid surface.

```glsl
uniform float u_speed; // @slider 0.1, 2.0, 0.5
void main() {
    vec2 st = vUv * 4.0;
    float t = u_time * u_speed;
    
    // Domain warping (layering noise into noise)
    vec2 q = vec2(fbm(st + vec2(0.0, t), 4.0), fbm(st + vec2(5.2, 1.3), 4.0));
    vec2 r = vec2(fbm(st + 4.0 * q + vec2(1.7, 9.2), 4.0), fbm(st + 4.0 * q + vec2(8.3, 2.8), 4.0));
    float n = fbm(st + 4.0 * r, 4.0);
    
    vec3 color = mix(vec3(0.2, 0.0, 0.0), vec3(1.0, 0.5, 0.0), n);
    color = mix(color, vec3(1.0, 0.9, 0.0), smoothstep(0.8, 1.0, n));
    
    gl_FragColor = vec4(color, 1.0);
}
```

### Rusted Metal (PBR Ready)
Combines high-frequency noise for rust and low-frequency noise for base metal variation.

```glsl
void main() {
    float rustNoise = fbm(vUv * 20.0, 5.0);
    float metalNoise = fbm(vUv * 3.0, 3.0);
    
    float isRust = smoothstep(0.4, 0.6, rustNoise * metalNoise * 2.0);
    
    vec3 rustColor = mix(vec3(0.4, 0.15, 0.05), vec3(0.7, 0.3, 0.1), rustNoise);
    vec3 metalColor = mix(vec3(0.6, 0.65, 0.7), vec3(0.4, 0.45, 0.5), metalNoise);
    
    vec3 albedo = mix(metalColor, rustColor, isRust);
    float roughness = mix(0.3, 0.9, isRust);
    float metallic = mix(0.8, 0.0, isRust);
    
    // If using PBR Lighting setup
    if (u_bakeMode == 1) gl_FragColor = vec4(albedo, 1.0);
    else if (u_bakeMode == 3) gl_FragColor = vec4(vec3(roughness), 1.0);
    else if (u_bakeMode == 4) gl_FragColor = vec4(vec3(metallic), 1.0);
    else gl_FragColor = vec4(albedo * (0.5 + 0.5 * (1.0 - roughness)), 1.0); // Simple preview
}
```

---

## 2. AI Integration Guide

Modern LLMs (like GPT-4, Claude, or Gemini) are excellent at writing GLSL shaders. To get the best results for TexGen, use this exact prompt structure:

### The "System Prompt" for LLMs
Copy and paste this context to your AI before asking it to write a texture:

> **System Context for TexGen Shader Generation:**
> I am using a WebGL texture generation library called TexGen. 
> Please write a fragment shader body for me.
> 
> **Available Environment:**
> - `vUv` (vec2): Normalized pixel coordinates (0.0 to 1.0).
> - `u_time` (float): Time in seconds for animation.
> - `u_resolution` (vec2): Canvas resolution.
> - `u_seed` (float): Random seed.
> 
> **Built-in Functions (DO NOT redefine these):**
> - `float random(vec2 st)`
> - `float noise(vec2 st, float scale)`
> - `float fbm(vec2 st, float octaves)`
> - `float voronoi(vec2 x)`
> - `float sdCircle(vec2 p, float r)`
> - `float sdBox(vec2 p, vec2 b)`
> 
> **Interactive Sliders:**
> You can define custom float uniforms with a slider annotation in this exact format:
> `uniform float u_name; // @slider min, max, default`
> 
> **Requirements:**
> 1. Do NOT write vertex shaders.
> 2. Do NOT redefine the built-in functions listed above.
> 3. Provide only the custom uniforms and the `void main() { ... }` block.
> 4. Output the final color to `gl_FragColor`.

### Example AI Request
**User:** "Using the context provided, generate an animated 'Toxic Sludge' texture. Add sliders for bubble speed and sludge scale."

**AI Output:**
```glsl
uniform float u_scale; // @slider 2.0, 20.0, 8.0
uniform float u_speed; // @slider 0.1, 5.0, 1.0

void main() {
    vec2 st = vUv * u_scale;
    float time = u_time * u_speed;
    
    // Base sludge movement
    float n = fbm(st + vec2(sin(time*0.5), cos(time*0.3)), 4.0);
    
    // Voronoi bubbles moving upward
    float v = voronoi(st * 1.5 + vec2(0.0, -time * 2.0));
    float bubbles = smoothstep(0.4, 0.3, v);
    
    vec3 darkGreen = vec3(0.0, 0.2, 0.0);
    vec3 toxicGreen = vec3(0.2, 1.0, 0.0);
    vec3 highlight = vec3(0.8, 1.0, 0.5);
    
    vec3 color = mix(darkGreen, toxicGreen, n);
    color = mix(color, highlight, bubbles * n); // Highlight bubbles
    
    gl_FragColor = vec4(color, 1.0);
}
```
You can paste this exact output into the TexGen Editor, and the sliders will automatically appear and work perfectly!
