# Gemini Project Mandates: TexGen

This document contains foundational mandates for Gemini CLI agents working on the **TexGen** repository.

## 1. Engineering Standards

- **Adaptive by Default**: When creating or modifying examples, always implement `window.devicePixelRatio` support and a responsive `resize` listener. 3D examples must update camera aspect ratios and renderer sizes.
- **Mobile First**: All interactive elements (movement, jumping, turning) must have touch-screen button fallbacks. Use `@media (pointer: coarse)` to toggle visibility of mobile controls.
- **High Precision**: Shaders must use `#ifdef GL_FRAGMENT_PRECISION_HIGH` to default to `highp float`. This is critical for procedural heightmaps which collapse to "blue oceans" on mobile if `mediump` is used.
- **ESM & UMD Parity**: The `texgen.js` (UMD) and `texgen.mjs` (ESM) files must be kept in sync using the root `Makefile` and `build.js`.

## 2. Shader Compression Mandates

- **Meticulous Updates**: Examples like `flight_sim/game.js` use Base64 compressed payloads. If you modify the human-readable shader source in `compress_shaders.js`, you **MUST** run the compression script and update the corresponding Base64 string in the main game file.
- **ASCII Safety**: Never use non-ASCII characters inside shader strings or compressed payloads.

## 3. Deployment & Fallbacks

- **Vite vs Static**: The `typescript_gallery` example uses a dynamic loader. Always ensure `main.ts` is the primary target for development, and `main.js` (compiled via `tsc` in the Makefile) is the fallback for static deployments.
- **Protocol Awareness**: Always check `window.location.protocol`. If it is `file:`, display a clear warning to the user that ES Modules require a server.

## 4. Sub-Agent Communication

- When delegating to `codebase_investigator`, specify if the task involves **Heightmap Precision** or **Mobile Input**, as these are the most common failure points in procedural demos.
