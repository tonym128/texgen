# TexGen Project Roadmap

This list tracks the planned enhancements for the **TexGen** library, documentation, and ecosystem.

## ✅ Phase 1: Developer Experience & Usability (Completed)
- [x] **Uniform Metadata Parser**: Move `@slider` parsing into the core library. Add `tg.getMetadata(shaderCode)` to return ranges and defaults.
- [x] **Structured Error API**: Update `tg.init()` to return detailed error objects (message, line number) for better UI feedback.
- [x] **Cookbook Documentation**: Add a `COOKBOOK.md` with snippets for common procedural patterns (Hex grids, Liquid, Rust, etc.).
- [x] **AI Integration Guide**: Add documentation on how to best prompt LLMs to generate TexGen-compatible GLSL.

## ✅ Phase 2: Technical Power & Performance (Completed)
- [x] **High-Performance Baking**: Add support for returning `ImageBitmap` or `Uint8Array` (raw pixels) from `bake()` to bypass Base64 overhead.
- [x] **Multi-Pass Composition**: Allow `TexGen` instances to use other instances as `sampler2D` inputs for layered effects.
- [x] **WebGL2 Support**: Implement an optional WebGL2 path for volumetric noise and faster integer math.
- [x] **OffscreenCanvas Optimization**: Formalize support for running TexGen entirely within Web Workers.

## ✅ Phase 3: Ecosystem & Portability (Completed)
- [x] **TexGen CLI**: A Node.js tool for command-line compression and batch-baking textures to disk.
- [x] **Modern Build Pipeline**: Use Rollup/Esbuild to generate `texgen.esm.js` and a minified `texgen.min.js` (Implemented native ESM support & Vite config).
- [x] **Framework Wrappers**: Create lightweight components for **React**, **Vue**, and **Svelte**.
- [x] **Headless testing**: Expand the test suite to run in a pure Node.js environment using `headless-gl`.

## ✅ Completed
- [x] Initial Library Core
- [x] Shader Compression System ($ tokens)
- [x] Texture Generator IDE
- [x] 2D Platformer Example
- [x] 3D Maze Example
- [x] Marble Roller Example
- [x] Endless Flight Sim Example (Baked Terrain + Real-time Sky)
- [x] Card Roguelike Example (Procedural UI)
- [x] Solitaire Example (Responsive 2D)
- [x] TypeScript Support (.d.ts definitions)
- [x] TypeScript Gallery technical showcase
- [x] Basic API Documentation
