# TexGen TypeScript Gallery

A modern development environment demonstration using **Vite**, **TypeScript**, and `texgen.js`.

## Features Demonstrated

1. **Static Bake**: Showcases the `tg.bake()` method to generate a one-time PNG asset.
2. **Animated GPU**: Real-time 60FPS rendering directly to a visible `<canvas>` using `tg.render()`.
3. **Compressed Payload**: Uses `TexGen.decompress()` to expand a tiny Base64 string into a high-detail animated lava shader.
4. **Procedural Sprite Sheet**: Demonstrates how to use grid-based GLSL logic to bake an atlas of variations into a single texture.
5. **PBR Normal Map**: Shows how to use the built-in `calculateNormal()` function and `u_bakeMode` to extract surface orientation data.

## Setup

```bash
cd example/typescript_gallery
npm install
npm run dev
```

## Type Safety

This project uses the `texgen.d.ts` file located in the root directory. It provides full IntelliSense for the `TexGen` class and its options.
