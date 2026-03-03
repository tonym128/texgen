# TexGen Project Roadmap

This list tracks the planned enhancements for the **TexGen** library, documentation, and ecosystem.

## ✅ Phase 1: Developer Experience & Usability (Completed)
- [x] **Uniform Metadata Parser**: Move `@slider` parsing into the core library. Add `tg.getMetadata(shaderCode)` to return ranges and defaults.
- [x] **Structured Error API**: Update `tg.init()` to return detailed error objects (message, line number) for better UI feedback.
- [x] **Cookbook Documentation**: Add a `COOKBOOK.md` with snippets for common procedural patterns (Hex grids, Liquid, Rust, etc.).
- [x] **AI Integration Guide**: Add documentation on how to best prompt LLMs to generate TexGen-compatible GLSL.
- [x] **Shader HMR Utility**: Created a helper for live-swapping shaders without re-instantiation.
- [x] **Metadata JSON Schema**: Formalized `@slider` and `@color` into a validatable schema.

## ✅ Phase 2: Technical Power & Performance (Completed)
- [x] **High-Performance Baking**: Add support for returning `ImageBitmap` or `Uint8Array` (raw pixels) from `bake()` to bypass Base64 overhead.
- [x] **Multi-Pass Composition**: Allow `TexGen` instances to use other instances as `sampler2D` inputs for layered effects.
- [x] **WebGL2 Support**: Implement an optional WebGL2 path for volumetric noise and faster integer math.
- [x] **OffscreenCanvas Optimization**: Formalize support for running TexGen entirely within Web Workers.
- [x] **Sobel Normal Extraction**: Added a high-quality normal map generator to the core UTILS.

## ✅ Phase 3: Ecosystem & Portability (Completed)
- [x] **TexGen CLI**: A Node.js tool for command-line compression and batch-baking textures to disk.
- [x] **Modern Build Pipeline**: Replaced manual Makefile `cp/cat` steps with `esbuild` for root distribution.
- [x] **NPM Optimization**: Cleaned up `package.json` files and distribution fields for registry readiness.
- [x] **Framework Wrappers**: Create lightweight components for **React**, **Vue**, and **Svelte**.
- [x] **Headless testing**: Expand the test suite to run in a pure Node.js environment using `headless-gl`.

## ✅ Phase 4: Mobile & Adaptive Polish (Completed)
- [x] **Mobile Controls**: Added touch-friendly on-screen controls to Marble Roller, 3D Maze, and Platformer.
- [x] **Mobile Controls Utility**: Refactored example touch controls into a shared `wrappers/mobile-controls.js`.
- [x] **Adaptive Display**: Updated all 3D and physics-based examples to handle dynamic window resizing and high-DPI (Retina) screens.
- [x] **Dynamic Level Generation**: Updated level logic in Marble Roller and Platformer to scale based on available screen area.
- [x] **Robust Error Handling**: Fixed critical shader decompression issues in Flight Sim and restored feature parity in Platformer.

## 🚀 Phase 5: Advanced Features (Planned)
- [x] **Custom Token Maps**: Allow users to define their own compression tokens for project-specific GLSL patterns.
- [x] **Asynchronous Baking**: Implement a `bakeAsync()` method that automatically utilizes Web Workers if available.
- [ ] **WebGL2 UBO Support**: Add Uniform Buffer Object support for shared state across instances.
- [ ] **Sprite Sheet Generator**: Add CLI support for packing multiple procedural textures into a single optimized sprite sheet.
- [ ] **GLSL Minifier**: Integrate a specialized GLSL minifier into the CLI to further reduce shader payload size before tokenization.
- [ ] **Unity/Unreal Bridge**: Create scripts to export TexGen baked textures or compression logic directly into major game engines.

## 🎨 Future Content Ideas
- [x] **Texture Streaming Demo**: Show dynamic chunk-based generation.
- [x] **Multi-Pass Post-Processing**: Example of chaining TexGen instances.
- [x] **Interactive Playground**: Unified doc + IDE experience.
- [ ] **Procedural Sprite Editor**: A specialized UI for generating small 16x16 or 32x32 characters and items.
- [ ] **Physics Engine Example**: A demo showcasing `texgen.js` combined with a 2D physics engine like Matter.js or P2.js.
- [ ] **Audio-Reactive Textures**: A visualizer demo using Web Audio API to drive shader uniforms.
- [ ] **Multiplayer Maze**: An extension of the 3D Maze demo with simple WebRTC-based multiplayer.

## 📝 Progress Log (2026-03-03)
- Implemented `bakeAsync()` for non-blocking texture generation.
- Added `SOBEL` macro to core GLSL utilities for high-quality normals.
- Added custom token map support to `compress()` and `decompress()`.
- Added `updateShader()` for better HMR integration.
- Added `getMetadataSchema()` for tool-side validation.
- Created `wrappers/mobile-controls.js` to standardize touch inputs.
- Modernized build system using `esbuild` and `scripts/build.mjs`.
- Optimized `package.json` for NPM distribution.
- Added **Multi-Pass Post-Processing** example showcasing instance chaining.
- Added **Texture Streaming Demo** with infinite world chunk generation using `bakeAsync`.
- Created **Interactive API Playground** for live documentation and experimentation.

## ✅ Completed
- [x] Initial Library Core
- [x] Shader Compression System ($ tokens)
- [x] Texture Generator IDE
- [x] 2D Platformer Example (Ultimate Version)
- [x] 3D Maze Example (Adaptive + Mobile)
- [x] Marble Roller Example (Adaptive + Mobile)
- [x] Endless Flight Sim Example (Fixed + Optimized)
- [x] Card Roguelike Example (Procedural UI)
- [x] Solitaire Example (Responsive 2D)
- [x] TypeScript Support (.d.ts definitions)
- [x] TypeScript Gallery technical showcase
- [x] Basic API Documentation
