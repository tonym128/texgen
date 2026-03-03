# TexGen Implementation Plan (GEMINI_DO)

This document tracks the execution of recommended architectural, ecosystem, and documentation improvements for TexGen.

## 🟢 1. Core Architecture
- [x] **Async Web Worker Baking**: Implement `tg.bakeAsync()` using `OffscreenCanvas`.
- [x] **Sobel Normal Extraction**: Add a high-quality normal map generator to the core UTILS.
- [ ] **WebGL2 UBO Support**: Add Uniform Buffer Object support for shared state across instances.

## 🟡 2. Compression & Developer Experience
- [x] **Custom Token Maps**: Allow user-defined token dictionaries for compression.
- [x] **Shader HMR Utility**: Create a helper for live-swapping shaders without re-instantiation.
- [x] **Metadata JSON Schema**: Formalize `@slider` and `@color` into a validatable schema.

## 🔵 3. Build & Ecosystem
- [x] **Mobile Controls Utility**: Refactor example touch controls into a shared `wrappers/mobile-controls.js`.
- [x] **Modernize Build**: Replace manual Makefile `cp/cat` steps with `esbuild` for root distribution.
- [x] **NPM Optimization**: Clean up `package.json` files and distribution fields.

## 🔴 4. Examples & Content
- [x] **Texture Streaming Demo**: Show dynamic chunk-based generation.
- [x] **Multi-Pass Post-Processing**: Example of chaining TexGen instances.
- [x] **Interactive Playground**: Unified doc + IDE experience.

---

## Progress Log

### [2026-03-03]
- Created implementation roadmap.
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
